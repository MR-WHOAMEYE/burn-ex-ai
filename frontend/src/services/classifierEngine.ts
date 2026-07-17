/**
 * Burn-Ex AI — Real-time Browser Inference Engine
 * 
 * 1. Loads MoveNet Lightning for 30fps pose estimation.
 * 2. Loads custom B-LSTM LayersModel for exercise classification.
 * 3. Normalizes landmarks inside dynamic bounding boxes.
 * 4. Buffers a rolling window of 40 frames [1, 40, 39].
 * 5. Runs inference to predict softmax class probabilities.
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

export interface ClassificationResult {
  label: string;
  confidence: number;
  probabilities: Record<string, number>;
}

class ClassifierEngine {
  private poseDetector: poseDetection.PoseDetector | null = null;
  private lstmModel: tf.LayersModel | null = null;
  private frameBuffer: number[][] = []; // Rolling window buffer of last 40 frames
  private initPromise: Promise<void> | null = null;

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
          await tf.ready();
          
          // Load MoveNet SinglePose Lightning
          this.poseDetector = await poseDetection.createDetector(
            poseDetection.SupportedModels.MoveNet,
            {
              modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
            }
          );
          console.log('✅ MoveNet pose detector loaded');

          // Load custom Bi-LSTM LayersModel with cache-busting query parameter
          this.lstmModel = await tf.loadLayersModel('/models/burnex/model.json?v=3');
          console.log('✅ Custom B-LSTM LayersModel loaded');
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
   * Processes a frame's keypoints, extracts normalized coordinates, buffers them,
   * and runs classification if the buffer is full.
   */
  async processFrame(
    keypoints: poseDetection.Keypoint[]
  ): Promise<ClassificationResult | null> {
    await this.initialize();

    if (!this.lstmModel) {
      return null;
    }

    // 2. Compute Person Bounding Box for normalization
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
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

    // 3. Extract and Normalize the 13 required joints (39 features total)
    const frameFeatures: number[] = [];

    for (const jointIndex of JOINT_MAP_INDICES) {
      const kp = keypoints[jointIndex];

      if (kp && kp.score && kp.score >= 0.3) {
        const x_norm = (kp.x - bbox_x1) / width;
        const y_norm = (kp.y - bbox_y1) / height;
        const visibility = 1.0;
        frameFeatures.push(x_norm, y_norm, visibility);
      } else {
        frameFeatures.push(0.0, 0.0, 0.0);
      }
    }

    // 4. Push to Rolling Buffer
    this.frameBuffer.push(frameFeatures);
    if (this.frameBuffer.length > 40) {
      this.frameBuffer.shift();
    }

    // 5. Run LSTM Inference once the window is full
    if (this.frameBuffer.length === 40) {
      return tf.tidy(() => {
        const inputTensor = tf.tensor3d([this.frameBuffer]);
        const prediction = this.lstmModel!.predict(inputTensor) as tf.Tensor;
        const probabilities = prediction.dataSync() as Float32Array;

        let maxIndex = 0;
        let maxVal = -1;
        const probsMap: Record<string, number> = {};

        for (let i = 0; i < EXERCISE_CLASSES.length; i++) {
          const score = probabilities[i];
          probsMap[EXERCISE_CLASSES[i]] = score;
          if (score > maxVal) {
            maxVal = score;
            maxIndex = i;
          }
        }

        return {
          label: EXERCISE_CLASSES[maxIndex],
          confidence: maxVal,
          probabilities: probsMap,
        };
      });
    }

    return null;
  }

  /**
   * Estimates raw body pose keypoints from a video frame.
   */
  async estimatePoses(
    video: HTMLVideoElement | HTMLCanvasElement
  ): Promise<poseDetection.Pose[]> {
    await this.initialize();
    if (!this.poseDetector) return [];
    return this.poseDetector.estimatePoses(video);
  }

  /**
   * Resets the 40-frame buffer history.
   */
  clearBuffer(): void {
    this.frameBuffer = [];
  }

  get isLoaded(): boolean {
    return this.poseDetector !== null && this.lstmModel !== null;
  }
}

export const classifierEngine = new ClassifierEngine();
export type { Keypoint } from '@tensorflow-models/pose-detection';
