/**
 * Workout Engine Page
 * 
 * The core real-time browser workout interface:
 *  - Webcam feed with canvas rendering for MoveNet keypoint skeletons.
 *  - Live metrics (predicted exercise, rep counting heuristics, calories, posture alerts).
 *  - Interactive video start/stop and session pairing status.
 * 
 * ARCHITECTURE: Pose estimation and LSTM classification run CLIENT-SIDE.
 * Only numeric tracking metrics are sent to the backend.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  CameraOff,
  Smartphone,
  SmartphoneCharging,
  Play,
  Square,
  Zap,
  Timer,
  Flame,
  Activity,
  Shield,
  AlertTriangle,
  Wifi,
  WifiOff,
  Pause,
} from 'lucide-react';
import { classifierEngine } from '../services/classifierEngine';
import { useAuth } from '../context/AuthContext';
import styles from './Workout.module.css';
import type { WorkoutMetrics, PostureGrade } from '../types';

// Posture grade color mapping
const POSTURE_COLORS: Record<PostureGrade, string> = {
  EXCELLENT: 'var(--color-success)',
  GOOD: 'var(--color-accent)',
  FAIR: 'var(--color-warning)',
  POOR: 'var(--color-destructive)',
};

/**
 * Computes the angle (in degrees) formed by points A-B-C at joint B.
 * Sourced for real-time knee/elbow extension heuristics.
 */
function computeAngle(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number }
): number {
  const ba = { x: a.x - b.x, y: a.y - b.y };
  const bc = { x: c.x - b.x, y: c.y - b.y };

  const dot = ba.x * bc.x + ba.y * bc.y;
  const distA = Math.sqrt(ba.x * ba.x + ba.y * ba.y);
  const distC = Math.sqrt(bc.x * bc.x + bc.y * bc.y);

  const cosAngle = dot / (distA * distC + 1e-8);
  const angleRad = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
  return (angleRad * 180) / Math.PI;
}

/**
 * Renders MoveNet skeleton connections and keypoints overlay on a canvas.
 */
function drawSkeleton(ctx: CanvasRenderingContext2D, keypoints: any[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // Keypoint connection definitions
  const connections = [
    [5, 6], [11, 12], // shoulders, hips
    [5, 7], [7, 9],   // left arm
    [6, 8], [8, 10],  // right arm
    [5, 11], [6, 12], // torso boundaries
    [11, 13], [13, 15], // left leg
    [12, 14], [14, 16], // right leg
  ];

  ctx.strokeStyle = '#22C55E'; // Emerald green
  ctx.lineWidth = 4;
  ctx.lineCap = 'round';

  for (const [i1, i2] of connections) {
    const kp1 = keypoints[i1];
    const kp2 = keypoints[i2];

    if (kp1 && kp2 && kp1.score >= 0.3 && kp2.score >= 0.3) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  }

  // Draw joints
  for (const kp of keypoints) {
    if (kp.score >= 0.3) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 6, 0, 2 * Math.PI);
      ctx.fillStyle = '#F8FAFC';
      ctx.strokeStyle = '#22C55E';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
  }
}

export function WorkoutPage() {
  const { token } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [debugLog, setDebugLog] = useState<string[]>([]);
  const addLog = useCallback((msg: string) => {
    setDebugLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${msg}`,
      ...prev.slice(0, 14),
    ]);
  }, []);

  const [metrics, setMetrics] = useState<WorkoutMetrics>({
    reps: 0,
    calories: 0,
    exerciseType: 'Calibrating...',
    posture: 'GOOD',
    intensity: 0,
    smoothness: 0,
    alert: null,
    durationSeconds: 0,
  });

  const isWorkoutActiveRef = useRef(isWorkoutActive);
  useEffect(() => {
    isWorkoutActiveRef.current = isWorkoutActive;
  }, [isWorkoutActive]);

  // ── Camera Control ─────────────────────────────────────────
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          frameRate: { ideal: 30 },
        },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      console.error('Camera access denied:', err);
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // ── Camera Frame Tracking Loop ─────────────────────────────
  useEffect(() => {
    if (!isCameraActive) {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Load estimation models
    addLog('Initializing TensorFlow.js models...');
    classifierEngine.initialize().then(() => {
      addLog('🤖 MoveNet & LSTM classifiers ready');
    }).catch((err) => {
      addLog(`❌ Model initialization failed: ${err?.message || err}`);
    });

    let frameCount = 0;
    let squatState: 'up' | 'down' = 'up';
    let pushupState: 'up' | 'down' = 'up';
    let localReps = 0;

    const runFrame = async () => {
      if (video.paused || video.ended || video.readyState < 2) {
        requestRef.current = requestAnimationFrame(runFrame);
        return;
      }

      try {
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        if (classifierEngine.isLoaded) {
          const poses = await classifierEngine.estimatePoses(video);
          
          frameCount++;
          if (frameCount % 30 === 0) {
            addLog(`Active tracking — poses detected: ${poses.length}`);
          }

          if (poses.length > 0) {
            const keypoints = poses[0].keypoints;

            // Draw overlay skeleton lines
            drawSkeleton(ctx, keypoints);

            // Periodically evaluate rolling window of landmarks (10Hz)
            if (frameCount % 3 === 0) {
              const result = await classifierEngine.processFrame(keypoints);
              if (result && isWorkoutActiveRef.current) {
                setMetrics((prev) => {
                  const MET_LOOKUP: Record<string, number> = {
                    'squats': 5.0,
                    'push_ups': 8.0,
                    'jumping_jacks': 8.0,
                    'sit_ups': 4.0,
                    'pull_ups': 8.0,
                    'jump_rope': 9.0,
                    'clean_and_jerk': 10.0,
                    'bench_press': 6.0,
                  };

                  const met = MET_LOOKUP[result.label] || 4.0;
                  const weightKg = 70; // Mock default weight
                  const calPerSec = (met * 3.5 * weightKg) / 200 / 60;
                  const secondsDiff = 0.1 * 3; // 0.3s difference
                  const newCalories = prev.calories + calPerSec * secondsDiff;

                  return {
                    ...prev,
                    exerciseType: result.label.toUpperCase().replace(/_/g, ' '),
                    calories: newCalories,
                    intensity: Math.round(result.confidence * 100),
                    smoothness: 86,
                  };
                });
              }
            }

            // Real-time local rep counting heuristics when workout is active
            if (isWorkoutActiveRef.current) {
              // Heuristic 1: Squats (Hip 11, Knee 13, Ankle 15)
              const leftHip = keypoints[11];
              const leftKnee = keypoints[13];
              const leftAnkle = keypoints[15];

              if (
                leftHip && leftKnee && leftAnkle &&
                leftHip.score >= 0.4 && leftKnee.score >= 0.4 && leftAnkle.score >= 0.4
              ) {
                const kneeAngle = computeAngle(leftHip, leftKnee, leftAnkle);
                if (kneeAngle < 115 && squatState === 'up') {
                  squatState = 'down';
                } else if (kneeAngle > 150 && squatState === 'down') {
                  squatState = 'up';
                  localReps++;
                  setMetrics((prev) => ({ ...prev, reps: localReps }));
                }
              }

              // Heuristic 2: Push-ups (Shoulder 5, Elbow 7, Wrist 9)
              const leftShoulder = keypoints[5];
              const leftElbow = keypoints[7];
              const leftWrist = keypoints[9];

              if (
                leftShoulder && leftElbow && leftWrist &&
                leftShoulder.score >= 0.4 && leftElbow.score >= 0.4 && leftWrist.score >= 0.4
              ) {
                const elbowAngle = computeAngle(leftShoulder, leftElbow, leftWrist);
                if (elbowAngle < 100 && pushupState === 'up') {
                  pushupState = 'down';
                } else if (elbowAngle > 150 && pushupState === 'down') {
                  pushupState = 'up';
                  localReps++;
                  setMetrics((prev) => ({ ...prev, reps: localReps }));
                }
              }
            }

          }
        }
      } catch (err) {
        console.error('Frame estimation failure:', err);
      }

      requestRef.current = requestAnimationFrame(runFrame);
    };

    requestRef.current = requestAnimationFrame(runFrame);

    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
      }
    };
  }, [isCameraActive]);

  // ── Workout Timer ──────────────────────────────────────────
  const startWorkout = useCallback(() => {
    classifierEngine.clearBuffer();
    setIsWorkoutActive(true);
    setElapsedSeconds(0);
    setMetrics((prev) => ({
      ...prev,
      reps: 0,
      calories: 0,
      exerciseType: 'Calibrating...',
      intensity: 0,
      smoothness: 0,
      alert: null,
    }));

    timerRef.current = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);

    if (!isCameraActive) startCamera();
  }, [isCameraActive, startCamera]);

  const stopWorkout = useCallback(async () => {
    setIsWorkoutActive(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Save workout details to the backend
    if (token) {
      try {
        const payload = {
          sessionId: `session-${Date.now()}`,
          totalCaloriesBurned: metrics.calories,
          totalDurationSeconds: elapsedSeconds,
          startTime: new Date(Date.now() - elapsedSeconds * 1000).toISOString(),
          endTime: new Date().toISOString(),
          exercises: [
            {
              exerciseType: metrics.exerciseType || 'UNKNOWN',
              repsCompleted: metrics.reps,
              caloriesBurned: metrics.calories,
              durationSeconds: elapsedSeconds,
              avgIntensity: metrics.intensity || 70,
              avgSmoothness: metrics.smoothness || 85,
              avgPostureScore: 95,
            },
          ],
        };

        console.log('📤 Logging workout session to database...');
        const res = await fetch('http://localhost:8080/api/workouts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        const result = await res.json();
        if (result.success) {
          console.log('✅ Session saved successfully to backend:', result.data);
        } else {
          console.error('❌ Failed to save session:', result.error);
        }
      } catch (err) {
        console.error('❌ Error logging session:', err);
      }
    }
  }, [elapsedSeconds, metrics, token]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      stopCamera();
    };
  }, [stopCamera]);

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={styles.workoutPage}>
      {/* Page Header */}
      <div className={styles.header}>
        <h1>Workout Engine</h1>
        <div className={styles.headerActions}>
          <div className={styles.connectionBadges}>
            <span className={`badge ${isCameraActive ? 'badge-success' : 'badge-error'}`}>
              {isCameraActive ? <Camera size={12} /> : <CameraOff size={12} />}
              Camera
            </span>
            <span className={`badge ${phoneConnected ? 'badge-success' : 'badge-warning'}`}>
              {phoneConnected ? <SmartphoneCharging size={12} /> : <Smartphone size={12} />}
              Phone {phoneConnected ? 'Paired' : 'Not Connected'}
            </span>
          </div>

          {!isWorkoutActive ? (
            <button className="btn btn-primary" onClick={startWorkout}>
              <Play size={16} />
              Start Workout
            </button>
          ) : (
            <button 
              className="btn btn-outline" 
              onClick={stopWorkout} 
              style={{ borderColor: 'var(--color-destructive)', color: 'var(--color-destructive)' }}
            >
              <Square size={16} />
              End Workout
            </button>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className={styles.workoutGrid}>
        {/* Webcam panel with skeletons */}
        <div className={styles.cameraPanel}>
          <div className={styles.cameraContainer}>
            <video
              ref={videoRef}
              className={styles.videoFeed}
              style={{ display: isCameraActive ? 'block' : 'none' }}
              autoPlay
              playsInline
              muted
            />
            <canvas
              ref={canvasRef}
              className={styles.skeletonCanvas}
              style={{ display: isCameraActive ? 'block' : 'none' }}
              width={1280}
              height={720}
            />
            {isCameraActive && (
              <>
                <div className={styles.calibrationBadge}>
                  <span className={`badge ${phoneConnected ? 'badge-success' : 'badge-info'}`}>
                    {phoneConnected ? (
                      <><Wifi size={10} /> FUSED</>
                    ) : (
                      <><WifiOff size={10} /> POSE ONLY</>
                    )}
                  </span>
                </div>

                {/* Diagnostic Console Box */}
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    left: '12px',
                    background: 'rgba(15, 23, 42, 0.85)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '6px',
                    padding: '8px 12px',
                    width: '320px',
                    maxHeight: '120px',
                    overflowY: 'auto',
                    fontFamily: 'monospace',
                    fontSize: '11px',
                    color: 'var(--color-foreground)',
                    zIndex: 20,
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                    textAlign: 'left',
                  }}
                >
                  <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: '4px', marginBottom: '6px', fontWeight: 'bold', color: 'var(--color-accent)' }}>
                    🤖 DIAGNOSTIC CONSOLE
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    {debugLog.length === 0 ? (
                      <div style={{ color: 'var(--color-muted)' }}>Waiting for system logs...</div>
                    ) : (
                      debugLog.map((log, idx) => (
                        <div key={idx} style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                          {log}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
            {!isCameraActive && (
              <div className={styles.cameraPlaceholder}>
                <Camera size={48} className={styles.placeholderIcon} />
                <p>Camera will activate when workout starts</p>
                <button className="btn btn-outline" onClick={startCamera}>
                  Preview Camera
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Live Metrics column */}
        <div className={styles.metricsPanel}>
          <motion.div
            className={`card ${styles.exerciseCard}`}
            key={metrics.exerciseType}
            initial={{ scale: 0.95, opacity: 0.8 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300 }}
          >
            <span className={styles.exerciseLabel}>Current Exercise</span>
            <h2 className={styles.exerciseName}>{metrics.exerciseType}</h2>
          </motion.div>

          <div className={styles.metricsRow}>
            <div className={`card ${styles.metricCard}`}>
              <Activity size={18} className={styles.metricIcon} />
              <motion.span
                className="metric-value"
                key={metrics.reps}
                initial={{ scale: 1.3 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400 }}
              >
                {metrics.reps}
              </motion.span>
              <span className="metric-label">Reps</span>
            </div>

            <div className={`card ${styles.metricCard}`}>
              <Timer size={18} className={styles.metricIcon} />
              <span className="metric-value">{formatTime(elapsedSeconds)}</span>
              <span className="metric-label">Duration</span>
            </div>
          </div>

          <div className={`card ${styles.metricCard}`}>
            <Flame size={18} style={{ color: 'var(--color-warning)' }} />
            <motion.span
              className="metric-value"
              style={{ color: 'var(--color-warning)' }}
              key={Math.floor(metrics.calories)}
              initial={{ y: -5 }}
              animate={{ y: 0 }}
            >
              {metrics.calories.toFixed(1)}
            </motion.span>
            <span className="metric-label">Calories Burned (kcal)</span>
          </div>

          <div className={`card ${styles.metricCard}`}>
            <Shield size={18} style={{ color: POSTURE_COLORS[metrics.posture] }} />
            <span
              className="metric-value"
              style={{ color: POSTURE_COLORS[metrics.posture] }}
            >
              {metrics.posture}
            </span>
            <span className="metric-label">Posture</span>
          </div>

          <div className={styles.metricsRow}>
            <div className={`card ${styles.gaugeCard}`}>
              <Zap size={14} style={{ color: 'var(--color-info)' }} />
              <span className={styles.gaugeLabel}>Intensity</span>
              <div className={styles.gaugeBar}>
                <motion.div
                  className={styles.gaugeFill}
                  style={{ background: 'var(--color-info)' }}
                  animate={{ width: `${metrics.intensity}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className={styles.gaugeValue}>{metrics.intensity}%</span>
            </div>

            <div className={`card ${styles.gaugeCard}`}>
              <Activity size={14} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.gaugeLabel}>Smoothness</span>
              <div className={styles.gaugeBar}>
                <motion.div
                  className={styles.gaugeFill}
                  style={{ background: 'var(--color-accent)' }}
                  animate={{ width: `${metrics.smoothness}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span className={styles.gaugeValue}>{metrics.smoothness}%</span>
            </div>
          </div>

          <AnimatePresence>
            {metrics.alert && (
              <motion.div
                className={styles.alertBanner}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <AlertTriangle size={16} />
                <span>{metrics.alert}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
