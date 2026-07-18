/**
 * Burn-Ex AI — IMU-based Exercise Classifier (mmfit model)
 *
 * Runs on-device in the phone browser using TF.js.
 * Input:  100 timesteps x 6 channels (accel_xyz + gyro_xyz)
 * Output: 4 classes — jumping_jacks, push_ups, sit_ups, squats
 *
 * Normalization mean/std are baked in from training data.
 */
import * as tf from '@tensorflow/tfjs';

const IMU_CLASSES = ['jumping_jacks', 'push_ups', 'sit_ups', 'squats'];
const WINDOW_SIZE = 100; // 100 frames (~2s at 50Hz)
const NUM_CHANNELS = 6;  // accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z

// Pre-computed from burnex_mmfit_norm_mean.npy / burnex_mmfit_norm_std.npy
const NORM_MEAN = [1.3630540370941162, -1.9066284894943237, -0.6171654462814331, 0.04885021969676018, -0.033471763134002686, -0.02410985343158245];
const NORM_STD  = [5.803637981414795, 6.86436653137207, 6.624145030975342, 1.1074495315551758, 1.1600370407104492, 0.7932848930358887];

export const IMU_CLASS_LABELS: Record<string, string> = {
  jumping_jacks: 'JUMPING JACKS',
  push_ups: 'PUSH UPS',
  sit_ups: 'SIT UPS',
  squats: 'SQUATS',
};

export interface IMUClassificationResult {
  label: string;
  displayLabel: string;
  confidence: number;
  probabilities: Record<string, number>;
}

class IMUClassifier {
  private model: tf.LayersModel | null = null;
  private buffer: number[][] = []; // rolling window of [6] vectors
  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.model) return;
    if (!this.initPromise) {
      this.initPromise = (async () => {
        try {
          await tf.setBackend('webgl');
          await tf.ready();
          this.model = await tf.loadLayersModel('/models/mmfit/model.json', { strict: false });
          console.log('[IMU] mmfit model loaded');
        } catch (err) {
          console.error('[IMU] Failed to load model:', err);
          this.initPromise = null;
          throw err;
        }
      })();
    }
    return this.initPromise;
  }

  /**
   * Push a single IMU frame [accel_x, accel_y, accel_z, gyro_x, gyro_y, gyro_z]
   * and run inference when the 100-frame window is full.
   */
  async pushFrame(accel: [number, number, number], gyro: [number, number, number]): Promise<IMUClassificationResult | null> {
    await this.initialize();
    if (!this.model) return null;

    // Normalize
    const raw = [...accel, ...gyro];
    const normalized = raw.map((v, i) => (v - NORM_MEAN[i]) / (NORM_STD[i] + 1e-8));

    this.buffer.push(normalized);
    if (this.buffer.length > WINDOW_SIZE) {
      this.buffer.shift();
    }

    // Only classify when buffer is full
    if (this.buffer.length < WINDOW_SIZE) return null;

    const inputTensor = tf.tensor3d([this.buffer]); // [1, 100, 6]
    const prediction = this.model.predict(inputTensor) as tf.Tensor;
    const probs = await prediction.data() as Float32Array;
    inputTensor.dispose();
    prediction.dispose();

    let maxIdx = 0;
    let maxVal = -1;
    const probsMap: Record<string, number> = {};

    for (let i = 0; i < IMU_CLASSES.length; i++) {
      probsMap[IMU_CLASSES[i]] = probs[i];
      if (probs[i] > maxVal) {
        maxVal = probs[i];
        maxIdx = i;
      }
    }

    const label = IMU_CLASSES[maxIdx];
    return {
      label,
      displayLabel: IMU_CLASS_LABELS[label] || label,
      confidence: maxVal,
      probabilities: probsMap,
    };
  }

  clearBuffer(): void {
    this.buffer = [];
  }

  get isLoaded(): boolean {
    return this.model !== null;
  }

  get bufferFill(): number {
    return this.buffer.length / WINDOW_SIZE;
  }
}

export const imuClassifier = new IMUClassifier();
