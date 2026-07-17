/**
 * Mobile Sensor Page (/mobile)
 * 
 * This page is opened by scanning the QR code on the phone.
 * 
 * CRITICAL: iOS Safari requires an EXPLICIT user tap to grant DeviceMotion/
 * DeviceOrientation permission. The sensor stream CANNOT auto-start on QR scan.
 * This page implements the required permission-gate UI as a first-class step.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Smartphone, Wifi, WifiOff, Battery, Activity, Check, AlertTriangle } from 'lucide-react';
import { socketService } from '../services/socketService';
import styles from './MobileSensor.module.css';

type SensorStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'streaming';

export function MobileSensorPage() {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session') || '';

  const [sensorStatus, setSensorStatus] = useState<SensorStatus>('idle');
  const [socketConnected, setSocketConnected] = useState(false);
  const [sensorData, setSensorData] = useState({
    accel: [0, 0, 0] as [number, number, number],
    gyro: [0, 0, 0] as [number, number, number],
    orientation: [0, 0, 0] as [number, number, number],
  });
  const [packetCount, setPacketCount] = useState(0);
  const streamingRef = useRef(false);

  // ── Request Sensor Permissions ─────────────────────────────
  const requestSensorPermission = useCallback(async () => {
    setSensorStatus('requesting');

    try {
      // iOS 13+ requires this explicit permission request triggered by a user gesture
      if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
        const motionPerm = await (DeviceMotionEvent as any).requestPermission();
        const orientPerm = await (DeviceOrientationEvent as any).requestPermission();

        if (motionPerm === 'granted' && orientPerm === 'granted') {
          setSensorStatus('granted');
          startSensorStreaming();
        } else {
          setSensorStatus('denied');
        }
      } else {
        // Android / non-iOS browsers — permissions granted by default
        setSensorStatus('granted');
        startSensorStreaming();
      }
    } catch (error) {
      console.error('Sensor permission error:', error);
      setSensorStatus('denied');
    }
  }, []);

  // ── Start Sensor Data Streaming ────────────────────────────
  const startSensorStreaming = useCallback(() => {
    setSensorStatus('streaming');
    streamingRef.current = true;

    // Request Wake Lock to prevent screen from sleeping
    requestWakeLock();

    // DeviceMotion listener (accelerometer + gyroscope)
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

      setSensorData(prev => ({ ...prev, accel, gyro }));

      // Stream to backend via Socket.IO
      if (sessionId) {
        socketService.sendIMU(sessionId, accel, gyro, sensorData.orientation);
        setPacketCount(prev => prev + 1);
      }
    };

    // DeviceOrientation listener
    const orientHandler = (event: DeviceOrientationEvent) => {
      if (!streamingRef.current) return;

      const orientation: [number, number, number] = [
        event.alpha ?? 0,
        event.beta ?? 0,
        event.gamma ?? 0,
      ];

      setSensorData(prev => ({ ...prev, orientation }));
    };

    window.addEventListener('devicemotion', motionHandler, { passive: true });
    window.addEventListener('deviceorientation', orientHandler, { passive: true });

    return () => {
      streamingRef.current = false;
      window.removeEventListener('devicemotion', motionHandler);
      window.removeEventListener('deviceorientation', orientHandler);
    };
  }, [sessionId]);

  // ── Wake Lock (prevent screen sleep during workout) ────────
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        await navigator.wakeLock.request('screen');
        console.log('🔒 Wake Lock active — screen will stay on');
      }
    } catch (err) {
      console.warn('Wake Lock not available:', err);
    }
  };

  // ── Socket Connection ──────────────────────────────────────
  useEffect(() => {
    if (!sessionId) return;

    // For mobile, we use a demo token during pairing
    // In production, the QR URL would include an auth token
    const mockToken = 'mobile-session-token';

    try {
      socketService.connect(mockToken);
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

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <Smartphone size={24} className={styles.headerIcon} />
        <h1 className={styles.title}>Burn-Ex Sensor</h1>
      </div>

      {/* Session Info */}
      <div className={styles.sessionBadge}>
        Session: <strong>{sessionId || 'No session'}</strong>
      </div>

      {/* Connection Status */}
      <div className={styles.statusRow}>
        <div className={styles.statusItem}>
          {socketConnected ? (
            <Wifi size={16} className={styles.statusOk} />
          ) : (
            <WifiOff size={16} className={styles.statusError} />
          )}
          <span>Socket: {socketConnected ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>

      {/* Permission Gate */}
      <AnimatePresence mode="wait">
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
              To track your movement quality, Burn-Ex needs access to your
              phone's accelerometer and gyroscope.
            </p>
            <p className={styles.permHint}>
              Place your phone in your <strong>right front pocket</strong> during workouts.
              Keep the screen on and this tab open.
            </p>
            <button
              className={`btn btn-primary ${styles.enableBtn}`}
              onClick={requestSensorPermission}
            >
              Enable Sensors
            </button>
          </motion.div>
        )}

        {sensorStatus === 'denied' && (
          <motion.div
            key="denied"
            className={styles.permissionCard}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertTriangle size={32} className={styles.errorIcon} />
            <h2 className={styles.permTitle}>Permission Denied</h2>
            <p className={styles.permDesc}>
              Sensor access was denied. Please enable motion sensors in your
              browser settings and reload this page.
            </p>
          </motion.div>
        )}

        {(sensorStatus === 'granted' || sensorStatus === 'streaming') && (
          <motion.div
            key="streaming"
            className={styles.streamingCard}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className={styles.streamHeader}>
              <Check size={20} className={styles.statusOk} />
              <span className={styles.streamTitle}>Sensors Active</span>
              <span className={`badge badge-success`}>STREAMING</span>
            </div>

            {/* Live Sensor Readouts */}
            <div className={styles.sensorGrid}>
              <div className={styles.sensorItem}>
                <Activity size={14} />
                <span className={styles.sensorLabel}>Accel</span>
                <span className={styles.sensorValue}>
                  {sensorData.accel.map(v => v.toFixed(1)).join(', ')}
                </span>
              </div>
              <div className={styles.sensorItem}>
                <Activity size={14} />
                <span className={styles.sensorLabel}>Gyro</span>
                <span className={styles.sensorValue}>
                  {sensorData.gyro.map(v => v.toFixed(1)).join(', ')}
                </span>
              </div>
              <div className={styles.sensorItem}>
                <Activity size={14} />
                <span className={styles.sensorLabel}>Orient</span>
                <span className={styles.sensorValue}>
                  {sensorData.orientation.map(v => v.toFixed(0)).join('°, ')}°
                </span>
              </div>
            </div>

            <div className={styles.packetCounter}>
              Packets sent: <strong>{packetCount.toLocaleString()}</strong>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Placement Instructions */}
      <div className={styles.instructions}>
        <h3>Placement Guide</h3>
        <ul>
          <li>Place phone in your <strong>right front pocket</strong></li>
          <li>Keep screen turned on during workout</li>
          <li>Do not close or switch away from this browser tab</li>
        </ul>
      </div>
    </div>
  );
}
