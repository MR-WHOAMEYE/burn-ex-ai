/**
 * Mobile Sensor PWA Page (/mobile)
 *
 * Opened by scanning QR code from the Workout page.
 * 1. Connects to laptop via Socket.IO session
 * 2. Streams phone accelerometer + gyroscope data
 * 3. Runs mmfit TF.js model ON-DEVICE for exercise classification
 * 4. Sends classification results + raw IMU to the laptop in real-time
 *
 * iOS Safari requires an EXPLICIT user tap for DeviceMotion permission.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Wifi, WifiOff, Activity, Check, AlertTriangle, Zap, Dumbbell } from 'lucide-react';
import { socketService } from '../services/socketService';
import { imuClassifier, IMU_CLASS_LABELS } from '../services/imuClassifier';
import type { IMUClassificationResult } from '../services/imuClassifier';
import styles from './MobileSensor.module.css';

type SensorStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'streaming';

export function MobileSensorPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';

  const [sensorStatus, setSensorStatus] = useState<SensorStatus>('idle');
  const [socketConnected, setSocketConnected] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [sensorData, setSensorData] = useState({
    accel: [0, 0, 0] as [number, number, number],
    gyro: [0, 0, 0] as [number, number, number],
  });
  const [classification, setClassification] = useState<IMUClassificationResult | null>(null);
  const [bufferFill, setBufferFill] = useState(0);
  const [packetCount, setPacketCount] = useState(0);
  const streamingRef = useRef(false);
  const classifyLockRef = useRef(false);

  // Load mmfit model lazily — triggered after sensor permission is granted
  const loadModel = useCallback(() => {
    imuClassifier.initialize().then(() => {
      setModelLoaded(true);
    }).catch(() => {});
  }, []);

  // Request sensor permissions (requires user tap on iOS)
  const requestSensorPermission = useCallback(async () => {
    setSensorStatus('requesting');
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPerm = await (DeviceMotionEvent as any).requestPermission();
        const orientPerm = await (DeviceOrientationEvent as any).requestPermission();
        if (motionPerm === 'granted' && orientPerm === 'granted') {
          setSensorStatus('granted');
          loadModel();
          startSensorStreaming();
        } else {
          setSensorStatus('denied');
        }
      } else {
        setSensorStatus('granted');
        loadModel();
        startSensorStreaming();
      }
    } catch {
      setSensorStatus('denied');
    }
  }, []);

  // Start streaming + on-device classification
  const startSensorStreaming = useCallback(() => {
    setSensorStatus('streaming');
    streamingRef.current = true;

    // Wake Lock
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').catch(() => {});
    }

    const motionHandler = (event: DeviceMotionEvent) => {
      if (!streamingRef.current) return;

      const accel: [number, number, number] = [
        event.accelerationIncludingGravity?.x ?? 0,
        event.accelerationIncludingGravity?.y ?? 0,
        event.accelerationIncludingGravity?.z ?? 0,
      ];
      const gyro: [number, number, number] = [
        event.rotationRate?.alpha ?? 0,
        event.rotationRate?.beta ?? 0,
        event.rotationRate?.gamma ?? 0,
      ];

      setSensorData({ accel, gyro });

      // Stream raw IMU to laptop
      if (sessionId) {
        socketService.sendIMU(sessionId, accel, gyro, [0, 0, 0]);
        setPacketCount(prev => prev + 1);
      }

      // Run on-device mmfit classification (non-blocking)
      if (!classifyLockRef.current) {
        classifyLockRef.current = true;
        imuClassifier.pushFrame(accel, gyro).then((result) => {
          setBufferFill(imuClassifier.bufferFill);
          if (result && result.confidence > 0.5) {
            setClassification(result);
            // Send classification to laptop via Socket.IO
            if (sessionId) {
              socketService.emit('imu-classification', {
                sessionId,
                label: result.label,
                displayLabel: result.displayLabel,
                confidence: result.confidence,
                probabilities: result.probabilities,
              });
            }
          }
          classifyLockRef.current = false;
        }).catch(() => {
          classifyLockRef.current = false;
        });
      }
    };

    window.addEventListener('devicemotion', motionHandler, { passive: true });

    return () => {
      streamingRef.current = false;
      window.removeEventListener('devicemotion', motionHandler);
    };
  }, [sessionId]);

  // Socket connection
  useEffect(() => {
    if (!sessionId) return;
    try {
      socketService.connect('mobile-session-token');
      socketService.registerPhone(sessionId);
      setSocketConnected(true);
    } catch {
      setSocketConnected(false);
    }
    return () => {
      streamingRef.current = false;
      socketService.disconnect();
    };
  }, [sessionId]);

  const confPercent = classification ? Math.round(classification.confidence * 100) : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Smartphone size={24} className={styles.headerIcon} />
        <h1 className={styles.title}>Burn-Ex Sensor</h1>
      </div>

      {/* Status badges */}
      <div className={styles.statusRow}>
        <div className={styles.statusItem}>
          {socketConnected ? <Wifi size={14} className={styles.statusOk} /> : <WifiOff size={14} className={styles.statusError} />}
          <span>{socketConnected ? 'Connected' : 'Offline'}</span>
        </div>
        <div className={styles.statusItem}>
          <Zap size={14} className={modelLoaded ? styles.statusOk : styles.statusError} />
          <span>{modelLoaded ? 'AI Ready' : 'Loading AI...'}</span>
        </div>
        {sessionId && (
          <div className={styles.sessionBadge}>
            {sessionId.slice(0, 8)}...
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {/* Permission gate */}
        {sensorStatus === 'idle' && (
          <motion.div
            key="permission"
            className={styles.permissionCard}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
          >
            <AlertTriangle size={32} className={styles.warningIcon} />
            <h2 className={styles.permTitle}>Sensor Access Required</h2>
            <p className={styles.permDesc}>
              Burn-Ex uses your phone's accelerometer & gyroscope to classify exercises in real-time using on-device AI.
            </p>
            <p className={styles.permHint}>
              Place your phone in your <strong>right front pocket</strong> during workouts. Keep the screen on.
            </p>
            <button className={`btn btn-primary ${styles.enableBtn}`} onClick={requestSensorPermission}>
              Enable Sensors & Start
            </button>
          </motion.div>
        )}

        {sensorStatus === 'denied' && (
          <motion.div key="denied" className={styles.permissionCard} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <AlertTriangle size={32} className={styles.errorIcon} />
            <h2 className={styles.permTitle}>Permission Denied</h2>
            <p className={styles.permDesc}>
              Enable motion sensors in browser settings and reload.
            </p>
          </motion.div>
        )}

        {/* Streaming + Classification */}
        {(sensorStatus === 'granted' || sensorStatus === 'streaming') && (
          <motion.div
            key="streaming"
            className={styles.streamingCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {/* Exercise Detection Hero */}
            <div className={styles.classificationHero}>
              <Dumbbell size={28} className={styles.exerciseIcon} />
              <div className={styles.exerciseLabel}>
                {classification ? classification.displayLabel : (bufferFill < 1 ? 'CALIBRATING...' : 'DETECTING...')}
              </div>
              {classification && (
                <div className={styles.confidenceBar}>
                  <div className={styles.confidenceFill} style={{ width: `${confPercent}%` }} />
                  <span className={styles.confidenceText}>{confPercent}%</span>
                </div>
              )}
              {!classification && bufferFill < 1 && (
                <div className={styles.confidenceBar}>
                  <div className={styles.confidenceFill} style={{ width: `${Math.round(bufferFill * 100)}%`, background: 'var(--color-muted)' }} />
                  <span className={styles.confidenceText}>{Math.round(bufferFill * 100)}%</span>
                </div>
              )}
            </div>

            {/* Probabilities */}
            {classification && (
              <div className={styles.probsGrid}>
                {Object.entries(classification.probabilities).map(([key, prob]) => (
                  <div key={key} className={styles.probItem}>
                    <span className={styles.probLabel}>{IMU_CLASS_LABELS[key] || key}</span>
                    <div className={styles.probBar}>
                      <div
                        className={styles.probFill}
                        style={{
                          width: `${Math.round(prob * 100)}%`,
                          background: key === classification.label ? 'var(--color-accent)' : 'var(--color-border)',
                        }}
                      />
                    </div>
                    <span className={styles.probVal}>{Math.round(prob * 100)}%</span>
                  </div>
                ))}
              </div>
            )}

            {/* Raw Sensor */}
            <div className={styles.streamHeader}>
              <Check size={16} className={styles.statusOk} />
              <span className={styles.streamTitle}>Live Sensors</span>
              <span className="badge badge-success">STREAMING</span>
            </div>

            <div className={styles.sensorGrid}>
              <div className={styles.sensorItem}>
                <Activity size={14} />
                <span className={styles.sensorLabel}>Accel</span>
                <span className={styles.sensorValue}>{sensorData.accel.map(v => v.toFixed(1)).join(', ')}</span>
              </div>
              <div className={styles.sensorItem}>
                <Activity size={14} />
                <span className={styles.sensorLabel}>Gyro</span>
                <span className={styles.sensorValue}>{sensorData.gyro.map(v => v.toFixed(1)).join(', ')}</span>
              </div>
            </div>

            <div className={styles.packetCounter}>
              Packets: <strong>{packetCount.toLocaleString()}</strong>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Instructions */}
      <div className={styles.instructions}>
        <h3>How it works</h3>
        <ul>
          <li>AI model runs <strong>on your phone</strong> — no cloud needed</li>
          <li>Place phone in your <strong>right front pocket</strong></li>
          <li>Detects: Jumping Jacks, Push Ups, Sit Ups, Squats</li>
          <li>Keep this tab open during workout</li>
        </ul>
      </div>
    </div>
  );
}
