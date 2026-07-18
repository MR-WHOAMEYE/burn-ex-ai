/**
 * Premium AI Workout Studio Page — Burn-Ex AI
 * 
 * Inspired by Apple Fitness, WHOOP, Nike Training Club, Tesla UI, and Vercel.
 * Designed with glassmorphic cards, live skeletal tracking, interactive charts,
 * voice commands, Spotify music controls, muscle heatmap indices, and telemetry.
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { staticPoseDetector } from '../services/staticPoseDetector';
import { localCoach } from '../services/localCoach';
import type { StaticPoseResult } from '../types';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  CartesianGrid,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Camera,
  CameraOff,
  Smartphone,
  SmartphoneCharging,
  Activity,
  Flame,
  Zap,
  Play,
  Square,
  Mic,
  MicOff,
  Timer,
  Shield,
  AlertTriangle,
  Wifi,
  WifiOff,
  Pause,
  Music,
  SkipForward,
  Volume2,
  Heart,
  Battery,
  Compass,
  Signal,
  Lightbulb,
  Maximize2,
  Plus,
  RefreshCw,
  Bot,
  Droplets,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { classifierEngine } from '../services/classifierEngine';
import { GeminiLiveClient } from '../services/geminiLive';
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

/** Helper: color a joint angle label by range. */
function angleColor(angle: number, good: [number, number]): string {
  if (angle >= good[0] && angle <= good[1]) return '#4ade80'; // green — in range
  return '#facc15'; // yellow — out of range
}

/**
 * Renders MoveNet skeleton + live angle HUD on a canvas.
 * Angles drawn: left knee, right knee, left elbow, right elbow.
 */
function drawSkeletonWithHUD(ctx: CanvasRenderingContext2D, keypoints: any[]) {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const connections = [
    [5, 6], [11, 12],
    [5, 7], [7, 9],
    [6, 8], [8, 10],
    [5, 11], [6, 12],
    [11, 13], [13, 15],
    [12, 14], [14, 16],
  ];

  ctx.strokeStyle = 'rgba(211, 218, 217, 0.8)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';

  for (const [i1, i2] of connections) {
    const kp1 = keypoints[i1];
    const kp2 = keypoints[i2];
    if (kp1 && kp2 && kp1.score >= 0.1 && kp2.score >= 0.1) {
      ctx.beginPath();
      ctx.moveTo(kp1.x, kp1.y);
      ctx.lineTo(kp2.x, kp2.y);
      ctx.stroke();
    }
  }

  // Draw joints
  for (const kp of keypoints) {
    if (kp.score >= 0.1) {
      ctx.beginPath();
      ctx.arc(kp.x, kp.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#D3DAD9';
      ctx.lineWidth = 2;
      ctx.fill();
      ctx.stroke();
    }
  }

  // ── Live Joint Angle HUD ─────────────────────────────────────────────
  // Each tuple: [apex, proximal, distal, label, goodRange]
  const angleJoints: [number, number, number, string, [number, number]][] = [
    [13, 11, 15, 'L Knee', [90, 170]], // left knee
    [14, 12, 16, 'R Knee', [90, 170]], // right knee
    [7,  5,  9, 'L Elbow', [80, 160]], // left elbow
    [8,  6, 10, 'R Elbow', [80, 160]], // right elbow
  ];

  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';

  for (const [apex, prox, dist, , goodRange] of angleJoints) {
    const a = keypoints[prox];
    const b = keypoints[apex];
    const c = keypoints[dist];
    if (!a || !b || !c) continue;
    if (a.score < 0.35 || b.score < 0.35 || c.score < 0.35) continue;

    const ba = { x: a.x - b.x, y: a.y - b.y };
    const bc = { x: c.x - b.x, y: c.y - b.y };
    const dot = ba.x * bc.x + ba.y * bc.y;
    const mag = Math.sqrt(ba.x**2 + ba.y**2) * Math.sqrt(bc.x**2 + bc.y**2);
    const deg = Math.round((Math.acos(Math.max(-1, Math.min(1, dot / (mag + 1e-8)))) * 180) / Math.PI);

    const color = angleColor(deg, goodRange);
    const label = `${deg}°`;

    // pill background
    const pw = 44, ph = 20, px = b.x - pw / 2, py = b.y - 28;
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    ctx.beginPath();
    (ctx as any).roundRect?.(px, py, pw, ph, 6) || ctx.rect(px, py, pw, ph);
    ctx.fill();

    ctx.fillStyle = color;
    ctx.fillText(label, b.x, py + 14);
  }
}

export function WorkoutPage() {
  const { token } = useAuth();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | null>(null);

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Gemini Live Coach state
  const [isVoiceCoachActive, setIsVoiceCoachActive] = useState(false);
  const geminiClientRef = useRef<GeminiLiveClient | null>(null);

  // User's real body weight for accurate calorie calculation.
  // Fetched from the profile API on mount; falls back to 70kg if unavailable.
  const [weightKg, setWeightKg] = useState(70);
  useEffect(() => {
    if (!token) return;
    fetch('http://localhost:8080/api/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.weightKg && typeof data.weightKg === 'number') {
          setWeightKg(data.weightKg);
        }
      })
      .catch(() => { /* silently keep default 70kg */ });
  }, [token]);

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

  // Additional mock states for Workout Studio widgets
  const [currentTimelinePhase, setCurrentTimelinePhase] = useState<'Warmup' | 'Workout' | 'Peak' | 'Cooldown'>('Workout');
  const [hydrationCount, setHydrationCount] = useState(2);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [spotifyPlaying, setSpotifyPlaying] = useState(false);
  const [spotifySong, setSpotifySong] = useState('Not playing');
  const [coachingAlert, setCoachingAlert] = useState<string>('Keep knees slightly outward');
  const [ghostModeActive, setGhostModeActive] = useState(false);

  // Radar mock performance metric data
  const radarData = [
    { subject: 'Accuracy', A: 94, B: 85, fullMark: 100 },
    { subject: 'Balance', A: 88, B: 80, fullMark: 100 },
    { subject: 'Control', A: 91, B: 75, fullMark: 100 },
    { subject: 'ROM', A: 96, B: 90, fullMark: 100 },
    { subject: 'Speed', A: 82, B: 70, fullMark: 100 },
    { subject: 'Stability', A: 89, B: 82, fullMark: 100 },
  ];

  // Chart data tracking calories / speed over session
  const [chartData, setChartData] = useState<Array<{ sec: number; calories: number; intensity: number }>>([
    { sec: 0, calories: 0, intensity: 0 }
  ]);

  const isWorkoutActiveRef = useRef(isWorkoutActive);
  useEffect(() => {
    isWorkoutActiveRef.current = isWorkoutActive;
  }, [isWorkoutActive]);

  // Bug #1/#2 fix: track reps and exercise type via refs to avoid stale closure issues
  const localRepsRef = useRef(0);
  const currentExerciseRef = useRef('calibrating');
  const metricsRef = useRef({ calories: 0 });

  // ── Rep Cadence Tracking ───────────────────────────────────────
  // Tracks timestamps of recent reps to compute reps-per-minute.
  const [cadenceRPM, setCadenceRPM] = useState(0);
  const repTimestampsRef = useRef<number[]>([]); // rolling 60s window

  // ── Range of Motion Depth Tracking ──────────────────────────
  // currentRomAngle: live joint angle for the active exercise
  // peakRomAngle: deepest angle achieved this session (smallest = deepest squat)
  const [currentRomAngle, setCurrentRomAngle] = useState(180);
  const [peakRomAngle, setPeakRomAngle] = useState(180);
  const peakRomRef = useRef(180);


  // Static pose state
  const [staticPose, setStaticPose] = useState<StaticPoseResult>({
    state: 'unknown', confidence: 0, durationSeconds: 0
  });
  const staticPoseRef = useRef<StaticPoseResult>({ state: 'unknown', confidence: 0, durationSeconds: 0 });
  const lastSedentaryAlertRef = useRef(0);

  // Local coach / burn boost tip state
  const [burnBoostTip, setBurnBoostTip] = useState<string>('');
  const lastTipExerciseRef = useRef('');
  const geminiContextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playerRef = useRef<SpotifyPlayer | null>(null);

  useEffect(() => {
    // Spotify Web Playback SDK Initialization
    const initializeSpotify = async () => {
      try {
        const statusRes = await fetch('http://127.0.0.1:8080/api/spotify/status');
        const statusData = await statusRes.json();
        setSpotifyConnected(statusData.connected);

        if (statusData.connected) {
          // Define global callback for SDK
          window.onSpotifyWebPlaybackSDKReady = () => {
            const player = new window.Spotify.Player({
              name: 'Burn-Ex AI Player',
              getOAuthToken: async (cb) => {
                try {
                  const tokenRes = await fetch('http://127.0.0.1:8080/api/spotify/token');
                  const tokenData = await tokenRes.json();
                  if (tokenData.token) {
                    cb(tokenData.token);
                  } else {
                    console.error('No token received from backend');
                  }
                } catch (e) {
                  console.error('Failed to get token', e);
                }
              },
              volume: 0.5
            });

            playerRef.current = player;

            // Error handling
            player.addListener('initialization_error', ({ message }: any) => { console.error(message); });
            player.addListener('authentication_error', ({ message }: any) => { console.error(message); });
            player.addListener('account_error', ({ message }: any) => { console.error(message); });
            player.addListener('playback_error', ({ message }: any) => { console.error(message); });

            // Playback status updates
            player.addListener('player_state_changed', (state: SpotifyState | null) => {
              if (!state) {
                setSpotifySong('Not playing');
                setSpotifyPlaying(false);
                return;
              }
              const track = state.track_window.current_track;
              if (track) {
                setSpotifySong(`${track.name} - ${track.artists.map((a: any) => a.name).join(', ')}`);
                setSpotifyPlaying(!state.paused);
              }
            });

            // Ready
            player.addListener('ready', ({ device_id }: any) => {
              console.log('Spotify Web Player Ready with Device ID', device_id);
              
              // Automatically transfer playback to this device
              fetch('http://127.0.0.1:8080/api/spotify/token').then(res => res.json()).then(data => {
                if (data.token) {
                  fetch('https://api.spotify.com/v1/me/player', {
                    method: 'PUT',
                    headers: {
                      'Authorization': `Bearer ${data.token}`,
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      device_ids: [device_id],
                      play: false,
                    }),
                  }).catch(e => console.error('Failed to transfer playback', e));
                }
              });
            });

            // Connect to the player!
            player.connect();
          };

          // Dynamically load the Spotify Web Playback SDK script
          // only after the callback is defined.
          if (!document.getElementById('spotify-player-script')) {
            const script = document.createElement('script');
            script.id = 'spotify-player-script';
            script.src = 'https://sdk.scdn.co/spotify-player.js';
            script.async = true;
            document.body.appendChild(script);
          } else if (window.Spotify) {
            window.onSpotifyWebPlaybackSDKReady();
          }
        }
      } catch (e) {
        console.error('Spotify init error', e);
      }
    };

    initializeSpotify();

    return () => {
      if (playerRef.current) {
        playerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    const isLoopActive = isWorkoutActive;
    if (!isLoopActive) return;

    const int = setInterval(() => {
      setElapsedSeconds(s => s + 1);
    }, 1000);

    return () => {
      clearInterval(int);
    };
  }, [isWorkoutActive]);

  // Webcam Start/Stop
  const startCamera = useCallback(async () => {
    try {
      addLog('Accessing webcam media stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, frameRate: 30 },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          addLog('Webcam feed initiated successfully');
        };
      }
    } catch (err) {
      console.error('Camera access denied:', err);
      addLog('❌ Camera access denied');
    }
  }, [addLog]);

  const stopCamera = useCallback(() => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
      addLog('Camera feed deactivated');
    }
  }, [addLog]);

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

    // Load models lazily (only now, when camera is active — not on page mount)
    setIsModelLoading(true);
    addLog('Initializing TensorFlow.js models...');
    classifierEngine.initialize().then(() => {
      addLog('🤖 MoveNet & LSTM classifiers ready');
      setIsModelLoading(false);
    }).catch((err) => {
      addLog(`❌ Model initialization failed: ${err?.message || err}`);
      setIsModelLoading(false);
    });

    let frameCount = 0;
    let squatState: 'up' | 'down' = 'up';
    let pushupState: 'up' | 'down' = 'up';
    // Bug #1 fix: use the shared ref instead of a local let variable
    localRepsRef.current = 0;

    let lastLstmTime = 0;
    let lastKeypoints: any[] = [];
    // Lock prevents a slow inference from overlapping with the next interval tick
    let isProcessing = false;

    // ── CORE ARCHITECTURE FIX ─────────────────────────────────────────────────
    // requestAnimationFrame fires every 16ms. Each call awaits GPU work (50-150ms).
    // The awaits return as microtasks — they pile up faster than the main thread
    // can drain them → "Page Unresponsive".
    //
    // setInterval(fn, 100) fires at most 10 times/second. Between ticks the
    // browser has ~90ms of free time to paint, handle input, and run GC.
    // This makes crashes structurally impossible.
    // ─────────────────────────────────────────────────────────────────────────
    const runFrame = async () => {
      if (isProcessing) return; // previous tick still running — skip cleanly
      if (video.paused || video.ended || video.readyState < 2) return;

      isProcessing = true;
      try {
        // Sync canvas size to raw video resolution
        const width = video.videoWidth || 1280;
        const height = video.videoHeight || 720;
        if (canvas.width !== width || canvas.height !== height) {
          canvas.width = width;
          canvas.height = height;
        }

        const now = Date.now();

        if (classifierEngine.isLoaded) {
          // Run pose estimation every tick (100ms = 10fps max)
          const poses = await classifierEngine.estimatePoses(video);

          frameCount++;
          if (frameCount % 10 === 0) {
            addLog(`Active tracking — poses detected: ${poses.length}`);
          }

          if (poses.length > 0) {
            lastKeypoints = poses[0].keypoints;
          }

          if (lastKeypoints.length > 0) {
            const keypoints = lastKeypoints;

            // Draw skeleton + angle HUD
            drawSkeletonWithHUD(ctx, keypoints);

            // LSTM classification at max 3fps (every 300ms)
            if (now - lastLstmTime >= 300) {
              lastLstmTime = now;
              const result = await classifierEngine.processFrame(keypoints);
              if (result && isWorkoutActiveRef.current) {
                if (result.biomechanicsOverride && frameCount % 10 === 0) {
                  addLog(`[Bio] push_ups override active`);
                }

                const MET_LOOKUP: Record<string, number> = {
                  'squats': 5.0, 'push_ups': 8.0, 'jumping_jacks': 8.0,
                  'sit_ups': 4.0, 'pull_ups': 8.0, 'jump_rope': 9.0,
                  'clean_and_jerk': 10.0, 'bench_press': 6.0,
                };
                const met = MET_LOOKUP[result.label] || 4.0;
                const calPerSec = (met * 3.5 * weightKg) / 200 / 60;
                metricsRef.current.calories += calPerSec * 0.3;

                const newExerciseType = result.label.toUpperCase().replace(/_/g, ' ');
                const newIntensity = Math.round(result.confidence * 100);

                setMetrics((prev) => {
                  if (prev.exerciseType === newExerciseType && Math.abs(prev.intensity - newIntensity) < 5) return prev;
                  currentExerciseRef.current = result.label;
                  if (lastTipExerciseRef.current !== result.label) {
                    lastTipExerciseRef.current = result.label;
                    const tip = localCoach.getFormTip(result.label);
                    if (tip) setBurnBoostTip(tip.text);
                  }
                  return { ...prev, exerciseType: newExerciseType, calories: metricsRef.current.calories, intensity: newIntensity, smoothness: 86 };
                });

                const pose = staticPoseDetector.detect(keypoints);
                const prevPose = staticPoseRef.current;
                if (pose.state !== prevPose.state || Math.round(pose.durationSeconds / 60) !== Math.round(prevPose.durationSeconds / 60)) {
                  setStaticPose(pose);
                }
                staticPoseRef.current = pose;

                if (pose.state === 'sitting' && pose.durationSeconds > 1800) {
                  const nowAlert = Date.now();
                  if (nowAlert - lastSedentaryAlertRef.current > 300000) {
                    lastSedentaryAlertRef.current = nowAlert;
                    const alert = localCoach.getSedentaryAlert(pose.durationSeconds / 60);
                    if (alert) {
                      setCoachingAlert(alert.text);
                      if (Notification.permission === 'granted') {
                        new Notification('Burn-Ex AI: Time to Move! 🚶', { body: alert.text });
                      }
                    }
                  }
                }
              }
            }

            // Rep counting
            if (isWorkoutActiveRef.current) {
              const currentExercise = currentExerciseRef.current;
              const leftHip = keypoints[11], leftKnee = keypoints[13], leftAnkle = keypoints[15];

              if (currentExercise === 'squats' && leftHip && leftKnee && leftAnkle &&
                leftHip.score >= 0.4 && leftKnee.score >= 0.4 && leftAnkle.score >= 0.4) {
                const kneeAngle = computeAngle(leftHip, leftKnee, leftAnkle);
                setCurrentRomAngle(Math.round(kneeAngle));
                if (kneeAngle < peakRomRef.current) { peakRomRef.current = kneeAngle; setPeakRomAngle(Math.round(kneeAngle)); }
                if (kneeAngle < 115 && squatState === 'up') {
                  squatState = 'down'; setCoachingAlert('Great squat depth. Drive upward!');
                } else if (kneeAngle > 150 && squatState === 'down') {
                  squatState = 'up'; localRepsRef.current++;
                  setMetrics((prev) => ({ ...prev, reps: localRepsRef.current }));
                  const t = Date.now();
                  repTimestampsRef.current = [...repTimestampsRef.current.filter(ts => t - ts <= 60000), t];
                  setCadenceRPM(repTimestampsRef.current.length);
                  const milestone = localCoach.checkMilestone(localRepsRef.current);
                  if (milestone) setCoachingAlert(milestone.text); else setCoachingAlert('Straighten your back at the top');
                }
              }

              const leftShoulder = keypoints[5], leftElbow = keypoints[7], leftWrist = keypoints[9];
              if ((currentExercise === 'push_ups' || currentExercise === 'bench_press') &&
                leftShoulder && leftElbow && leftWrist &&
                leftShoulder.score >= 0.4 && leftElbow.score >= 0.4 && leftWrist.score >= 0.4) {
                const elbowAngle = computeAngle(leftShoulder, leftElbow, leftWrist);
                setCurrentRomAngle(Math.round(elbowAngle));
                if (elbowAngle < peakRomRef.current) { peakRomRef.current = elbowAngle; setPeakRomAngle(Math.round(elbowAngle)); }
                if (elbowAngle < 100 && pushupState === 'up') {
                  pushupState = 'down'; setCoachingAlert('Keep body straight and tight');
                } else if (elbowAngle > 150 && pushupState === 'down') {
                  pushupState = 'up'; localRepsRef.current++;
                  setMetrics((prev) => ({ ...prev, reps: localRepsRef.current }));
                  const t = Date.now();
                  repTimestampsRef.current = [...repTimestampsRef.current.filter(ts => t - ts <= 60000), t];
                  setCadenceRPM(repTimestampsRef.current.length);
                  const milestone = localCoach.checkMilestone(localRepsRef.current);
                  if (milestone) setCoachingAlert(milestone.text); else setCoachingAlert('Nice pushup form. Maintain cadence.');
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Frame estimation failure:', err);
      } finally {
        isProcessing = false;
      }
    };

    // Use setInterval instead of requestAnimationFrame — this is the key architectural fix.
    // 100ms interval = max 10fps inference. Browser has 90ms+ free between each call.
    const intervalId = window.setInterval(runFrame, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isCameraActive, addLog]);


  // Model initialization happens lazily when the camera starts (inside the
  // isCameraActive useEffect below) — NOT on page mount. Calling initialize()
  // here would compile WebGL shaders synchronously on the main thread,
  // freezing the browser and causing "Page Unresponsive" before any UI appears.

  // ── Camera Access ──────────────────────────────────────────
  const startWorkout = useCallback(() => {
    classifierEngine.clearBuffer();
    staticPoseDetector.reset();
    localCoach.reset();
    localRepsRef.current = 0;
    currentExerciseRef.current = 'calibrating';
    metricsRef.current = { calories: 0 };
    lastTipExerciseRef.current = '';
    setIsWorkoutActive(true);
    setElapsedSeconds(0);
    setBurnBoostTip('');
    setChartData([{ sec: 0, calories: 0, intensity: 0 }]);
    setMetrics((prev) => ({
      ...prev,
      reps: 0,
      calories: 0,
      exerciseType: 'Calibrating...',
      intensity: 0,
      smoothness: 0,
      alert: null,
    }));
    // Bug #5 fix: timer is handled ONLY by the useEffect below — no setInterval here
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

  // Bug #6 fix: useEffect timer — real chart data using metricsRef (no fake random)
  // Also syncs calories to metrics state so UI updates smoothly 1x per second instead of 10x
  useEffect(() => {
    if (!isWorkoutActive) return;
    const int = setInterval(() => {
      const currentCalories = Math.round(metricsRef.current.calories * 10) / 10;
      
      setElapsedSeconds(s => {
        const nextSec = s + 1;
        setChartData(cData => [
          ...cData,
          {
            sec: nextSec,
            calories: currentCalories,
            intensity: Math.round(metrics.intensity || 0),
          }
        ]);
        return nextSec;
      });

      // Sync calories to metrics state
      setMetrics(prev => ({
        ...prev,
        calories: currentCalories
      }));
    }, 1000);
    return () => clearInterval(int);
  }, [isWorkoutActive, metrics.intensity]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (geminiContextTimerRef.current) clearInterval(geminiContextTimerRef.current);
      stopCamera();
      if (geminiClientRef.current) {
        geminiClientRef.current.disconnect();
      }
    };
  }, [stopCamera]);

  // Bug #4 fix: prevent double voice coach connect
  const toggleVoiceCoach = async () => {
    if (isVoiceCoachActive) {
      setIsVoiceCoachActive(false); // optimistic
      if (geminiContextTimerRef.current) {
        clearInterval(geminiContextTimerRef.current);
        geminiContextTimerRef.current = null;
      }
      if (geminiClientRef.current) {
        geminiClientRef.current.disconnect();
        geminiClientRef.current = null;
      }
    } else {
      if (!videoRef.current) return;
      setIsVoiceCoachActive(true); // optimistic
      // Destroy any existing client first
      if (geminiClientRef.current) {
        geminiClientRef.current.disconnect();
        geminiClientRef.current = null;
      }
      try {
        const client = new GeminiLiveClient(videoRef.current, addLog);
        geminiClientRef.current = client;
        await client.connect();
        // Periodic background Gemini context update every 15s
        geminiContextTimerRef.current = setInterval(() => {
          const pose = staticPoseRef.current;
          const ex = currentExerciseRef.current;
          const cal = Math.round(metricsRef.current.calories);
          geminiClientRef.current?.sendContextUpdate(
            `[Background check] User pose: ${pose.state} (${Math.round(pose.durationSeconds)}s). ` +
            `Exercise: ${ex}. Calories burned: ${cal}. Briefly check form or encourage. Max 1 sentence.`
          );
        }, 15000);
      } catch (err) {
        setIsVoiceCoachActive(false);
        addLog(`❌ Voice coach failed to connect: ${(err as Error).message}`);
      }
    }
  };

  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className={styles.workoutPage}>
      
      {/* ─── 1. WORKOUT HEADER COMMAND BAR ─── */}
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <h1 className={styles.studioTitle}>AI WORKOUT STUDIO</h1>
          <div className={styles.studioStatusRow}>
            <span className={styles.statusDotActive} />
            <span className={styles.statusLabel}>Mode: Biomechanical Calibration</span>
          </div>
        </div>

        <div className={styles.headerActions}>
          <div className={styles.connectionBadges}>
            <span className={`badge ${isCameraActive ? 'badge-success' : 'badge-error'}`}>
              {isCameraActive ? <Camera size={12} /> : <CameraOff size={12} />}
              Camera: {isCameraActive ? 'LIVE' : 'OFFLINE'}
            </span>
            <span className={`badge ${phoneConnected ? 'badge-success' : 'badge-warning'}`}>
              {phoneConnected ? <SmartphoneCharging size={12} /> : <Smartphone size={12} />}
              IMU Link: {phoneConnected ? 'FUSED' : 'POSE ONLY'}
            </span>
          </div>

          {!isWorkoutActive ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                className={`btn ${isVoiceCoachActive ? 'btn-primary' : 'btn-outline'}`} 
                onClick={toggleVoiceCoach}
              >
                {isVoiceCoachActive ? <Mic size={16} /> : <MicOff size={16} />}
                {isVoiceCoachActive ? 'Coach Active' : 'Enable Coach'}
              </button>
              <button className="btn btn-primary" onClick={startWorkout}>
                <Play size={16} fill="currentColor" />
                Start Studio Loop
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-outline" onClick={stopWorkout}>
                <Pause size={16} />
                Pause Studio
              </button>
              <button 
                className="btn btn-outline" 
                onClick={stopWorkout} 
                style={{ borderColor: 'var(--color-destructive)', color: 'var(--color-destructive)' }}
              >
                <Square size={16} fill="currentColor" />
                End Session
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ─── MAIN WORKOUT GRID SPLIT ─── */}
      <div className={styles.workoutGrid}>
        
        {/* ─── 2. WORKOUT STUDIO CAMERA FEED (65% width container) ─── */}
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
            />

            {/* Model loading: small non-blocking corner badge instead of full overlay */}
            {isModelLoading && isCameraActive && (
              <div style={{
                position: 'absolute', bottom: '14px', left: '50%', transform: 'translateX(-50%)',
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(10, 10, 20, 0.85)', backdropFilter: 'blur(8px)',
                border: '1px solid rgba(250, 177, 98, 0.3)', borderRadius: '20px',
                padding: '6px 14px', zIndex: 30,
              }}>
                <div className={styles.miniSpinner} />
                <span style={{ fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.08em', color: 'var(--color-accent)', fontFamily: 'var(--font-display)' }}>
                  LOADING AI MODELS...
                </span>
              </div>
            )}

            {/* AI Corners Overlay & Status */}
            {isCameraActive && (
              <>
                <div className={styles.calibrationBadge}>
                  <span className={styles.pulsingBadge}>AUTO-CALIBRATION RUNNING</span>
                </div>
                
                {/* Floating telemetry HUD inside video frame */}
                <div className={styles.videoTelemetryHUD}>
                  <div className={styles.telemetryTag}>FPS: 30</div>
                  <div className={styles.telemetryTag}>Visibility: Optimal</div>
                  <div className={styles.telemetryTag}>Angle: 12° Tilt</div>
                  {/* Static pose corner label */}
                  {isCameraActive && (
                    <div className={styles.telemetryTag} style={{ background: 'rgba(250, 177, 98, 0.15)', color: 'var(--color-accent)' }}>
                      {localCoach.getPoseBadge(staticPose.state).emoji} {localCoach.getPoseBadge(staticPose.state).label}
                    </div>
                  )}
                </div>

                {/* Diagnostic Console Box */}
                <div className={styles.diagnosticConsole}>
                  <div className={styles.consoleHeader}>
                    🤖 STUDIO STATUS LOGS
                  </div>
                  <div className={styles.consoleBody}>
                    {debugLog.length === 0 ? (
                      <div style={{ color: 'var(--color-muted)' }}>Waiting for system logs...</div>
                    ) : (
                      debugLog.map((log, idx) => (
                        <div key={idx} className={styles.consoleLogLine}>
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
                <p className={styles.placeholderHeading}>Studio Camera Off</p>
                <p className={styles.placeholderText}>Webcam feed will initialize when studio loop commences.</p>
                <button className="btn btn-outline" onClick={startCamera}>
                  Start Camera Feed
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ─── 3. AI COACH PANEL (35% width container) ─── */}
        <div className={styles.coachSidebar}>
          {/* Main AI Metrics Card */}
          <div className={`card ${styles.coachCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>BIOMECHANICAL ESTIMATION</span>
              <span className={styles.modelLabel}>MoveNet Lightning</span>
            </div>

            <div className={styles.coachWidgetContent}>
              <div className={styles.exerciseNameBlock}>
                <span className={styles.metaLabel}>DETECTED EXERCISE</span>
                <h2>{metrics.exerciseType}</h2>
              </div>

              <div className={styles.activeStatGrid}>
                <div className={styles.sidebarStatCard}>
                  <span className={styles.metaLabel}>REP COUNT</span>
                  <span className={styles.sidebarStatVal} style={{ color: 'var(--color-accent)' }}>
                    {metrics.reps}
                  </span>
                </div>

                <div className={styles.sidebarStatCard}>
                  <span className={styles.metaLabel}>METABOLIC BURN</span>
                  <span className={styles.sidebarStatVal}>
                    {Math.round(metrics.calories)} <span className={styles.statUnit}>kcal</span>
                  </span>
                </div>

                <div className={styles.sidebarStatCard}>
                  <span className={styles.metaLabel}>ACTIVE TIME</span>
                  <span className={styles.sidebarStatVal}>
                    {formatTime(elapsedSeconds)}
                  </span>
                </div>

                {/* Rep Cadence */}
                <div className={styles.sidebarStatCard}>
                  <span className={styles.metaLabel}>CADENCE</span>
                  <span className={styles.sidebarStatVal} style={{ color: cadenceRPM > 20 ? '#4ade80' : cadenceRPM > 10 ? 'var(--color-accent)' : 'var(--color-muted)' }}>
                    {cadenceRPM} <span className={styles.statUnit}>rpm</span>
                  </span>
                </div>
              </div>

              {/* Range of Motion Depth Meter */}
              {currentRomAngle < 179 && (
                <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.07)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <span className={styles.metaLabel}>RANGE OF MOTION</span>
                    <span style={{ fontSize: '0.7rem', fontFamily: 'monospace', color: 'var(--color-muted)' }}>
                      Best: <span style={{ color: '#4ade80' }}>{peakRomAngle}°</span>
                    </span>
                  </div>
                  {/* The bar: 180° = straight, 60° = very deep. We invert so full bar = deepest. */}
                  {(() => {
                    const MIN_ANGLE = 60;  // maximum depth target
                    const MAX_ANGLE = 180; // standing straight
                    const depth = Math.round(((MAX_ANGLE - currentRomAngle) / (MAX_ANGLE - MIN_ANGLE)) * 100);
                    const peakDepth = Math.round(((MAX_ANGLE - peakRomAngle) / (MAX_ANGLE - MIN_ANGLE)) * 100);
                    const barColor = depth > 60 ? '#4ade80' : depth > 30 ? 'var(--color-accent)' : '#f87171';
                    return (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                          <span style={{ fontSize: '1.4rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: barColor, letterSpacing: '-0.02em' }}>
                            {currentRomAngle}°
                          </span>
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-muted)', alignSelf: 'flex-end', paddingBottom: '2px' }}>
                            depth {Math.min(100, depth)}%
                          </span>
                        </div>
                        {/* Background track */}
                        <div style={{ position: 'relative', height: '10px', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', overflow: 'hidden' }}>
                          {/* Peak marker */}
                          <div style={{ position: 'absolute', left: `${Math.min(100, peakDepth)}%`, top: 0, bottom: 0, width: '2px', background: '#4ade80', opacity: 0.6 }} />
                          {/* Live fill */}
                          <div style={{ height: '100%', width: `${Math.min(100, depth)}%`, background: `linear-gradient(90deg, #f87171 0%, ${barColor} 100%)`, borderRadius: '5px', transition: 'width 0.1s ease, background 0.3s ease' }} />
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '3px', fontSize: '0.6rem', color: 'var(--color-muted)' }}>
                          <span>SHALLOW</span><span>DEEP</span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}

              <div className={styles.accuracyBlock}>
                <div className={styles.accuracyHeader}>
                  <span className={styles.metaLabel}>POSE ESTIMATION CONFIDENCE</span>
                  <span className={styles.accuracyNum} style={{ color: 'var(--color-accent)' }}>
                    {metrics.intensity}%
                  </span>
                </div>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${metrics.intensity}%`, backgroundColor: 'var(--color-accent)' }} />

                </div>
              </div>

              {/* Real-time coaching message banner */}
              <div className={styles.coachingAlertBanner}>
                <div className={styles.alertHeader}>
                  <Bot size={16} style={{ color: 'var(--color-accent)' }} />
                  <span className={styles.alertHeading}>AI COACH LIVE INSIGHT</span>
                  {/* Static pose badge */}
                  <span style={{ marginLeft: 'auto', fontSize: '0.75rem', background: 'rgba(250,177,98,0.1)', color: 'var(--color-accent)', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {localCoach.getPoseBadge(staticPose.state).emoji} {localCoach.getPoseBadge(staticPose.state).label}
                    {staticPose.state === 'sitting' && staticPose.durationSeconds > 60 && (
                      <span style={{ color: 'var(--color-warning)', marginLeft: '4px' }}>
                        {Math.round(staticPose.durationSeconds / 60)}m
                      </span>
                    )}
                  </span>
                </div>
                <p className={styles.alertText}>
                  "{coachingAlert}"
                </p>
              </div>

              {/* 💡 Burn Boost Tip */}
              {burnBoostTip && (
                <div style={{ marginTop: '0.75rem', padding: '10px 14px', background: 'rgba(250, 177, 98, 0.07)', borderRadius: '8px', border: '1px solid rgba(250, 177, 98, 0.15)' }}>
                  <div style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', color: 'var(--color-accent)', marginBottom: '4px' }}>
                    💡 BURN BOOST TIP
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--color-text)', lineHeight: 1.4, margin: 0 }}>
                    {burnBoostTip}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ─── 4. STUDIO ANALYTICS AND INTENSITY CHARTS ─── */}
      <div className={styles.analyticsRow}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Studio Session Analysis</h2>
          <p className={styles.sectionSubtitle}>Biomechanical trends logged during the current session</p>
        </div>

        <div className={styles.analyticsGrid}>
          {/* Intensity and speed Area Chart */}
          <div className={`card ${styles.analyticsCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Inference Intensity Timeline</span>
              <span className={styles.badgeSuccess}>LIVE RECORD</span>
            </div>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 15 }}>
                  <defs>
                    <linearGradient id="intensityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-accent)" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="var(--color-accent)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(250, 177, 98, 0.1)" />
                  <XAxis 
                    dataKey="sec" 
                    stroke="var(--color-muted)" 
                    fontSize={11} 
                    tickLine={false} 
                    label={{ value: 'Seconds Elapsed', position: 'insideBottom', offset: -5, fill: 'var(--color-muted)', fontSize: 9, fontWeight: 600 }} 
                  />
                  <YAxis stroke="var(--color-muted)" fontSize={11} tickLine={false} />
                  <Area
                    type="monotone"
                    dataKey="intensity"
                    stroke="var(--color-accent)"
                    strokeWidth={2}
                    fill="url(#intensityGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Performance Radar metrics */}
          <div className={`card ${styles.analyticsCard}`}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Biomechanical Radar Summary</span>
              <span className={styles.badgeSuccess}>Level 4</span>
            </div>
            <div className={styles.chartWrapper} style={{ display: 'flex', justifyContent: 'center' }}>
              <ResponsiveContainer width="100%" height={200}>
                <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis dataKey="subject" stroke="var(--color-muted)" fontSize={10} />
                  <PolarRadiusAxis stroke="var(--color-border)" fontSize={10} />
                  <Radar name="Athlete" dataKey="A" stroke="var(--color-accent)" fill="var(--color-accent)" fillOpacity={0.2} />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* ─── 5. UTILITY WIDGETS SECTION ─── */}
      <div className={styles.utilitiesRow}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Studio Command Utilities</h2>
          <p className={styles.sectionSubtitle}>Spotify Sync, Mobile sensor settings, and muscular alignment heatmaps</p>
        </div>

        <div className={styles.utilitiesGrid}>
          {/* Muscle Heatmap */}
          <div className={`card ${styles.utilityCard}`}>
            <div className={styles.utilityCardHeader}>
              <Bot size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>Muscular Alignment Heatmap</span>
            </div>
            <div className={styles.heatmapBody}>
              <div className={styles.muscleList}>
                <div className={styles.muscleItem}>
                  <span>Quadriceps (Squats)</span>
                  <span className={styles.muscleBadge} style={{ backgroundColor: metrics.exerciseType.includes('SQUAT') ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)', color: metrics.exerciseType.includes('SQUAT') ? 'var(--color-background)' : 'var(--color-muted)' }}>
                    {metrics.exerciseType.includes('SQUAT') ? 'ACTIVE' : 'IDLE'}
                  </span>
                </div>
                <div className={styles.muscleItem}>
                  <span>Triceps (Push-ups)</span>
                  <span className={styles.muscleBadge} style={{ backgroundColor: metrics.exerciseType.includes('PUSH') ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)', color: metrics.exerciseType.includes('PUSH') ? 'var(--color-background)' : 'var(--color-muted)' }}>
                    {metrics.exerciseType.includes('PUSH') ? 'ACTIVE' : 'IDLE'}
                  </span>
                </div>
                <div className={styles.muscleItem}>
                  <span>Core Abdominals</span>
                  <span className={styles.muscleBadge} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)' }}>IDLE</span>
                </div>
                <div className={styles.muscleItem}>
                  <span>Hamstrings</span>
                  <span className={styles.muscleBadge} style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--color-muted)' }}>IDLE</span>
                </div>
              </div>
            </div>
          </div>

          {/* Connected Phone Sensor info */}
          <div className={`card ${styles.utilityCard}`}>
            <div className={styles.utilityCardHeader}>
              <Smartphone size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>IMU Telemetry Settings</span>
            </div>
            <div className={styles.sensorBody}>
              <div className={styles.sensorTelemetryRow}>
                <div className={styles.sensorItem}>
                  <span className={styles.sensorLabel}>Battery</span>
                  <span className={styles.sensorVal} style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><Battery size={12} /> 84%</span>
                </div>
                <div className={styles.sensorItem}>
                  <span className={styles.sensorLabel}>Latency</span>
                  <span className={styles.sensorVal}>8ms</span>
                </div>
                <div className={styles.sensorItem}>
                  <span className={styles.sensorLabel}>Rate</span>
                  <span className={styles.sensorVal}>52 Hz</span>
                </div>
              </div>

              {/* Acceleration wave simulation */}
              <div className={styles.miniWaveform}>
                <svg viewBox="0 0 200 30" style={{ width: '100%', height: '30px' }}>
                  <path d="M0 15 Q 15 5, 30 15 T 60 15 T 90 15 T 120 15 T 150 15 T 180 15 T 200 15" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" />
                </svg>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11px', color: 'var(--color-muted)' }}>
                <span>Signal Quality: Good</span>
                <button className={styles.syncBtn} onClick={() => setPhoneConnected(!phoneConnected)}>
                  {phoneConnected ? 'Disconnect IMU' : 'Simulate IMU'}
                </button>
              </div>
            </div>
          </div>

          {/* Active Phase timeline */}
          <div className={`card ${styles.utilityCard}`}>
            <div className={styles.utilityCardHeader}>
              <Timer size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>Session Phases Timeline</span>
            </div>
            <div className={styles.timelineBody}>
              <div className={styles.timelinePhases}>
                {['Warmup', 'Workout', 'Peak', 'Cooldown'].map((phase) => (
                  <div 
                    key={phase} 
                    className={styles.phaseStep}
                    onClick={() => setCurrentTimelinePhase(phase as any)}
                    style={{ 
                      opacity: currentTimelinePhase === phase ? 1 : 0.4,
                      borderLeft: currentTimelinePhase === phase ? '2.5px solid var(--color-accent)' : '2.5px solid var(--color-border)',
                      paddingLeft: '8px',
                      cursor: 'pointer'
                    }}
                  >
                    <span style={{ fontSize: '11px', fontWeight: currentTimelinePhase === phase ? 700 : 500 }}>
                      {phase.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hydration Reminder */}
          <div className={`card ${styles.utilityCard}`}>
            <div className={styles.utilityCardHeader}>
              <Droplets size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>Hydration logs</span>
            </div>
            <div className={styles.hydrationBody}>
              <div className={styles.hydrationMeta}>
                <span>Daily Water: {hydrationCount} / 8 glasses</span>
                <button className={styles.hydrationAddBtn} onClick={() => setHydrationCount(prev => Math.min(prev + 1, 8))}>
                  <Plus size={12} /> Log Glass
                </button>
              </div>
              <div className={styles.waterTrackerGrid}>
                {Array.from({ length: 8 }).map((_, i) => (
                  <div 
                    key={i} 
                    className={`${styles.waterGlassDot} ${i < hydrationCount ? styles.glassFilled : ''}`} 
                    onClick={() => setHydrationCount(i + 1)}
                    style={{ cursor: 'pointer' }}
                    title={`Set water logged to ${i + 1} glasses`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Spotify Music Controller */}
          <div className={`card ${styles.utilityCard}`}>
            <div className={styles.utilityCardHeader}>
              <Music size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>Spotify Music Sync</span>
            </div>
            <div className={styles.musicBody}>
              {!spotifyConnected ? (
                <div style={{ textAlign: 'center', marginTop: '10px' }}>
                  <button 
                    className={styles.musicBtn} 
                    style={{ background: '#1DB954', color: '#fff', border: 'none', padding: '8px 16px' }}
                    onClick={() => window.location.href = 'http://127.0.0.1:8080/api/spotify/login'}
                  >
                    Connect to Spotify
                  </button>
                </div>
              ) : (
                <>
                  <div className={styles.musicSongName} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '12px', fontWeight: 'bold' }}>
                    {spotifySong}
                  </div>
                  <div className={styles.musicControlsRow}>
                    <button 
                      className={styles.musicBtn} 
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.togglePlay();
                        }
                      }}
                    >
                      {spotifyPlaying ? 'PAUSE' : 'PLAY'}
                    </button>
                    <button 
                      className={styles.musicBtn} 
                      onClick={() => {
                        if (playerRef.current) {
                          playerRef.current.nextTrack();
                        }
                      }}
                    >
                      <SkipForward size={14} /> SKIP
                    </button>
                  </div>
                  <button 
                    className={styles.disconnectSpotifyBtn} 
                    onClick={async () => {
                      if (playerRef.current) {
                        playerRef.current.disconnect();
                        playerRef.current = null;
                      }
                      await fetch('http://127.0.0.1:8080/api/spotify/logout');
                      setSpotifyConnected(false);
                      setSpotifySong('Not playing');
                      setSpotifyPlaying(false);
                      // Remove script so it can be re-injected
                      const script = document.getElementById('spotify-player-script');
                      if (script) script.remove();
                    }}
                    style={{ marginTop: '0.75rem', width: '100%', background: 'rgba(255, 60, 60, 0.1)', color: '#ff5555', padding: '8px', borderRadius: '4px', border: '1px solid rgba(255, 60, 60, 0.2)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <LogOut size={12} /> DISCONNECT
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Voice Assistant commands list */}
          <div className={`card ${styles.utilityCard}`}>
            <div className={styles.utilityCardHeader}>
              <Mic size={16} style={{ color: 'var(--color-accent)' }} />
              <span className={styles.cardTitle}>Voice Commands Helper</span>
            </div>
            <div className={styles.voiceBody}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-muted)', marginBottom: '8px' }}>
                <span>"Start Studio", "End Session"</span>
                <button className={styles.voiceToggleBtn} onClick={() => setVoiceEnabled(!voiceEnabled)}>
                  {voiceEnabled ? 'VOICE ON' : 'VOICE MUTED'}
                </button>
              </div>
              <p style={{ fontSize: '10px', fontStyle: 'italic', margin: 0 }}>
                Press key shortcuts or speak clearly to trigger local heuristics loops.
              </p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
