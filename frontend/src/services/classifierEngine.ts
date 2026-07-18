/**
 * Burn-Ex AI — Real-time Browser Inference Engine
 *
 * 1. Loads MoveNet Lightning for 30fps pose estimation.
 * 2. Loads custom B-LSTM LayersModel for exercise classification.
 * 3. Normalizes landmarks inside dynamic bounding boxes.
 * 4. Buffers a rolling window of 40 frames [1, 40, 39].
 * 5. Runs LSTM inference to predict softmax class probabilities.
 * 6. Applies a biomechanics override layer:
 *    — If the person is horizontal (spine ≥45° from vertical) AND elbow
 *      flexion is detected over the rolling window, the result is overridden
 *      to 'push_ups' regardless of what the LSTM predicted. This corrects the
 *      known misclassification caused by the LSTM being trained on front-facing
 *      standing-pose videos, while push-ups are performed horizontally.
 */
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as poseDetection from '@tensorflow-models/pose-detection';

// Exercise class names in exact model output order
export const EXERCISE_CLASSES = [
  'bench_press',
  'clean_and_jerk',
  'jumping_jacks',
  'jump_rope',
  'pull_ups',
  'push_ups',
  'sit_ups',
  'squats',
];

// Target order of the 13 joints mapping to MoveNet outputs
const JOINT_MAP_INDICES = [0, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

// MoveNet keypoint indices used by the biomechanics layer
const KP = {
  NOSE: 0,
  L_SHOULDER: 5,
  R_SHOULDER: 6,
  L_ELBOW: 7,
  R_ELBOW: 8,
  L_WRIST: 9,
  R_WRIST: 10,
  L_HIP: 11,
  R_HIP: 12,
  L_KNEE: 13,
  R_KNEE: 14,
  L_ANKLE: 15,
  R_ANKLE: 16,
} as const;

export interface ClassificationResult {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
  /** True when the biomechanics override fired (LSTM prediction was replaced). */
  biomechanicsOverride: boolean;
  /** True when the CV is highly confident the prediction is wrong and needs Gemini AI to classify. */
  needsAiFallback?: boolean;
}

// ── Biomechanics helpers ──────────────────────────────────────────────────────

/** Angle at joint B formed by A–B–C in degrees. */
function jointAngle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): number {
  const bax = ax - bx, bay = ay - by;
  const bcx = cx - bx, bcy = cy - by;
  const dot = bax * bcx + bay * bcy;
  const magBA = Math.sqrt(bax * bax + bay * bay);
  const magBC = Math.sqrt(bcx * bcx + bcy * bcy);
  const cos = Math.max(-1, Math.min(1, dot / (magBA * magBC + 1e-8)));
  return (Math.acos(cos) * 180) / Math.PI;
}

/**
 * Computes per-frame biomechanical signals from MoveNet keypoints.
 * Returns null if the required joints are not visible.
 */
function computeBiomechanics(kps: poseDetection.Keypoint[]): {
  spineHorizontalDeg: number | null; // >45 → person is leaning/horizontal
  elbowAngle: number | null;         // mean of left+right elbow angles
} {
  const get = (idx: number) => kps[idx];
  const vis = (idx: number) => (get(idx)?.score ?? 0) >= 0.35;

  // ── Spine angle (shoulder mid → hip mid vs. vertical) ─────────────
  let spineHorizontalDeg: number | null = null;
  if (vis(KP.L_SHOULDER) && vis(KP.R_SHOULDER) && vis(KP.L_HIP) && vis(KP.R_HIP)) {
    const smx = (get(KP.L_SHOULDER).x + get(KP.R_SHOULDER).x) / 2;
    const smy = (get(KP.L_SHOULDER).y + get(KP.R_SHOULDER).y) / 2;
    const hmx = (get(KP.L_HIP).x + get(KP.R_HIP).x) / 2;
    const hmy = (get(KP.L_HIP).y + get(KP.R_HIP).y) / 2;
    const dx = Math.abs(hmx - smx);
    const dy = Math.abs(hmy - smy);
    // Angle from vertical: 0° = standing, 90° = fully horizontal
    spineHorizontalDeg = (Math.atan2(dx, dy) * 180) / Math.PI;
  }

  // ── Mean elbow angle ───────────────────────────────────────────────
  const elbowAngles: number[] = [];
  if (vis(KP.L_SHOULDER) && vis(KP.L_ELBOW) && vis(KP.L_WRIST)) {
    elbowAngles.push(jointAngle(
      get(KP.L_SHOULDER).x, get(KP.L_SHOULDER).y,
      get(KP.L_ELBOW).x, get(KP.L_ELBOW).y,
      get(KP.L_WRIST).x, get(KP.L_WRIST).y,
    ));
  }
  if (vis(KP.R_SHOULDER) && vis(KP.R_ELBOW) && vis(KP.R_WRIST)) {
    elbowAngles.push(jointAngle(
      get(KP.R_SHOULDER).x, get(KP.R_SHOULDER).y,
      get(KP.R_ELBOW).x, get(KP.R_ELBOW).y,
      get(KP.R_WRIST).x, get(KP.R_WRIST).y,
    ));
  }
  const elbowAngle = elbowAngles.length > 0
    ? elbowAngles.reduce((a, b) => a + b, 0) / elbowAngles.length
    : null;

  return { spineHorizontalDeg, elbowAngle };
}

// ── ClassifierEngine ──────────────────────────────────────────────────────────

class ClassifierEngine {
  private poseDetector: poseDetection.PoseDetector | null = null;
  private lstmModel: tf.LayersModel | null = null;
  private frameBuffer: number[][] = [];   // Rolling 40-frame feature window
  private initPromise: Promise<void> | null = null;

  // Biomechanics rolling buffers (same 40-frame window)
  private spineBuffer: (number | null)[] = [];
  private elbowBuffer: (number | null)[] = [];

  /**
   * Initializes both the TF.js WebGL/WASM backend, MoveNet, and custom LSTM.
   * Utilizes a single-flight promise pattern to avoid parallel initialization race conditions.
   */
  async initialize(): Promise<void> {
    if (this.poseDetector && this.lstmModel) return;

    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          console.log('🤖 Initializing TensorFlow.js engine...');
          // Force WebGL backend to prevent WebGPU WGSL parsing crashes
          await tf.setBackend('webgl');
          await tf.ready();

          const poseDetectorPromise = (async () => {
            try {
              return await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                {
                  modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                  modelUrl: '/models/movenet-lightning/model.json',
                }
              );
            } catch (localErr) {
              console.warn('[Perf] Local MoveNet failed, falling back to CDN:', localErr);
              return await poseDetection.createDetector(
                poseDetection.SupportedModels.MoveNet,
                { modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING }
              );
            }
          })();

          // Load custom Bi-LSTM LayersModel with cache-busting query parameter.
          // strict:false allows best-effort weight loading — tolerates Keras 3/TF.js
          // naming differences (lstm_cell/ prefix vs flat kernel paths).
          const lstmPromise = tf.loadLayersModel('/models/burnex/model.json', {
            strict: false,
          });

          const [poseDetector, lstmModel] = await Promise.all([poseDetectorPromise, lstmPromise]);
          this.poseDetector = poseDetector;
          this.lstmModel = lstmModel;
          console.log('✅ MoveNet and Custom B-LSTM LayersModel loaded');
        } catch (error) {
          console.error('❌ Failed to initialize TF.js models:', error);
          this.initPromise = null; // Clear so subsequent calls can retry
          throw error;
        }
      })();
    }

    return this.initPromise;
  }

  /**
   * Processes a frame's keypoints:
   *   1. Extracts 39 normalized features for the LSTM.
   *   2. Captures biomechanical signals (spine angle, elbow angle).
   *   3. Runs LSTM inference once the 40-frame window is full.
   *   4. Applies push-up biomechanics override when the body is detected
   *      as horizontal with active elbow flexion/extension.
   */
  async processFrame(
    keypoints: poseDetection.Keypoint[]
  ): Promise<ClassificationResult | null> {
    await this.initialize();

    if (!this.lstmModel) {
      return null;
    }

    // ── 1. Bounding box for feature normalization ─────────────────
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let visiblePoints = 0;

    for (const kp of keypoints) {
      if (kp.score && kp.score >= 0.3) {
        if (kp.x < minX) minX = kp.x;
        if (kp.x > maxX) maxX = kp.x;
        if (kp.y < minY) minY = kp.y;
        if (kp.y > maxY) maxY = kp.y;
        visiblePoints++;
      }
    }

    const bbox_x1 = visiblePoints > 0 ? minX : 0;
    const bbox_x2 = visiblePoints > 0 ? maxX : 1;
    const bbox_y1 = visiblePoints > 0 ? minY : 0;
    const bbox_y2 = visiblePoints > 0 ? maxY : 1;
    const width = Math.max(bbox_x2 - bbox_x1, 1e-3);
    const height = Math.max(bbox_y2 - bbox_y1, 1e-3);

    // ── 2. Extract 39 normalized features ────────────────────────
    const frameFeatures: number[] = [];
    for (const jointIndex of JOINT_MAP_INDICES) {
      const kp = keypoints[jointIndex];
      if (kp && kp.score && kp.score >= 0.3) {
        frameFeatures.push(
          (kp.x - bbox_x1) / width,
          (kp.y - bbox_y1) / height,
          1.0
        );
      } else {
        frameFeatures.push(0.0, 0.0, 0.0);
      }
    }

    // ── 3. Capture biomechanical signals ──────────────────────────
    const bio = computeBiomechanics(keypoints);
    this.spineBuffer.push(bio.spineHorizontalDeg);
    this.elbowBuffer.push(bio.elbowAngle);

    // ── 4. Push to rolling LSTM feature buffer ────────────────────
    this.frameBuffer.push(frameFeatures);
    if (this.frameBuffer.length > 40) {
      this.frameBuffer.shift();
      this.spineBuffer.shift();
      this.elbowBuffer.shift();
    }

    // ── 5. Run LSTM inference once window is full ─────────────────
    if (this.frameBuffer.length === 40) {
      const inputTensor = tf.tensor3d([this.frameBuffer]);
      const prediction = this.lstmModel!.predict(inputTensor) as tf.Tensor;

      // Use async data() instead of blocking dataSync() to prevent "Page Unresponsive"
      const probabilities = await prediction.data() as Float32Array;

      // Manually dispose since we can't use tf.tidy with async/await
      inputTensor.dispose();
      prediction.dispose();

      let maxIndex = 0;
      let maxVal = -1;
      const probsMap: Record<string, number> = {};

      for (let i = 0; i < EXERCISE_CLASSES.length; i++) {
        const score = probabilities[i];
        probsMap[EXERCISE_CLASSES[i]] = score;
        if (score > maxVal) { maxVal = score; maxIndex = i; }
      }

      const lstmResult = {
        label: EXERCISE_CLASSES[maxIndex],
        confidence: maxVal,
        probabilities: probsMap,
      };

      // ── 6. Biomechanics override ─────────────────────────────────
      // Count frames in the window where the spine is horizontal (>45°)
      const validSpineFrames = this.spineBuffer.filter(v => v !== null) as number[];
      const horizontalFrames = validSpineFrames.filter(v => v > 45).length;
      const horizontalRatio = validSpineFrames.length > 0
        ? horizontalFrames / validSpineFrames.length
        : 0;

      // Measure elbow angle range (flexion/extension oscillation)
      const validElbow = this.elbowBuffer.filter(v => v !== null) as number[];
      const elbowRange = validElbow.length > 5
        ? Math.max(...validElbow) - Math.min(...validElbow)
        : 0;

      // Override: body is horizontal >40% of window AND elbows are actively
      // flexing/extending (range >20°) → must be push-ups
      const isPushUpOverride = horizontalRatio > 0.40 && elbowRange > 20;

      if (isPushUpOverride) {
        console.debug(
          `[BioOverride] push_ups detected — horizontal: ${(horizontalRatio * 100).toFixed(0)}%, ` +
          `elbow range: ${elbowRange.toFixed(1)}°, LSTM said: ${lstmResult.label}`
        );
        return {
          label: 'push_ups',
          confidence: Math.min(0.95, horizontalRatio),  // ratio as proxy confidence
          probabilities: {
            ...lstmResult.probabilities,
            push_ups: Math.min(0.95, horizontalRatio),
          },
          biomechanicsOverride: true,
        };
      }

      // Override: body is vertical (<20% horizontal) but LSTM predicted bench_press
      // This is a common error when doing seated pull-ups or shoulder presses.
      const isVertical = horizontalRatio < 0.20;
      if (isVertical && lstmResult.label === 'bench_press') {
        console.debug('[BioOverride] Rejected bench_press because body is vertical. Triggering Gemini AI fallback.');
        return {
          label: 'unknown_vertical',
          confidence: 0,
          probabilities: lstmResult.probabilities,
          biomechanicsOverride: true,
          needsAiFallback: true // Trigger the REAL Gemini AI
        };
      }

      return { ...lstmResult, biomechanicsOverride: false };
    }

    return null;
  }

  /**
   * Estimates raw body pose keypoints from a video frame.
   * Phase 5: Adds performance.now() markers — warns if inference > 33ms (< 30fps).
   */
  async estimatePoses(
    video: HTMLVideoElement | HTMLCanvasElement
  ): Promise<poseDetection.Pose[]> {
    await this.initialize();
    if (!this.poseDetector) return [];
    const t0 = performance.now();
    const result = await this.poseDetector.estimatePoses(video);
    const elapsed = performance.now() - t0;
    if (elapsed > 33) {
      console.debug(`[Perf] estimatePoses took ${elapsed.toFixed(1)}ms (below 30fps threshold)`);
    }
    return result;
  }

  /**
   * Resets the 40-frame buffer and all biomechanics buffers.
   * Called at workout start to avoid stale window carryover.
   */
  clearBuffer(): void {
    this.frameBuffer = [];
    this.spineBuffer = [];
    this.elbowBuffer = [];
  }

  get isLoaded(): boolean {
    return this.poseDetector !== null && this.lstmModel !== null;
  }
}

export const classifierEngine = new ClassifierEngine();
export type { Keypoint } from '@tensorflow-models/pose-detection';
