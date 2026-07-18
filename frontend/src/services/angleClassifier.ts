/**
 * Burn-Ex AI — Fast Angle-Based Exercise Classifier
 *
 * Classifies exercises on EVERY frame using joint angles computed from
 * MoveNet keypoints. No buffer warmup needed — instant results.
 *
 * Pre-computed angle profiles from 31K-row exercise_angles.csv dataset.
 * Uses weighted Euclidean distance to nearest centroid with std normalization.
 *
 * Exercises: Jumping Jacks, Squats, Push Ups, Pull Ups, Russian Twists
 */

import type { Keypoint } from '@tensorflow-models/pose-detection';

// MoveNet 17-keypoint indices
const KP = {
  L_SHOULDER: 5,  R_SHOULDER: 6,
  L_ELBOW: 7,     R_ELBOW: 8,
  L_WRIST: 9,     R_WRIST: 10,
  L_HIP: 11,      R_HIP: 12,
  L_KNEE: 13,     R_KNEE: 14,
  L_ANKLE: 15,    R_ANKLE: 16,
} as const;

const MIN_SCORE = 0.3;

interface AngleProfile {
  label: string;
  /** Internal key matching classifierEngine naming */
  key: string;
  angles: { mean: number; std: number }[];
}

// Pre-computed from exercise_angles.csv (31,034 rows)
// Order: [Shoulder, Elbow, Hip, Knee, Ankle]
const PROFILES: AngleProfile[] = [
  {
    label: 'Standing', key: 'standing',
    // Standing: arms down (~20° shoulder), elbows relaxed (~160°), hips/knees/ankles straight (~170-180°)
    angles: [
      { mean: 20, std: 10 },
      { mean: 160, std: 15 },
      { mean: 175, std: 5 },
      { mean: 175, std: 5 },
      { mean: 170, std: 8 },
    ],
  },
  {
    label: 'Sitting', key: 'sitting',
    // Sitting: arms down (~15° shoulder), elbows relaxed (~90-120°), hips bent (~90°), knees bent (~90°)
    angles: [
      { mean: 15, std: 12 },
      { mean: 110, std: 30 },
      { mean: 95, std: 15 },
      { mean: 95, std: 15 },
      { mean: 160, std: 20 },
    ],
  },
  {
    label: 'Jumping Jacks', key: 'jumping_jacks',
    angles: [
      { mean: 81.82, std: 63.85 },
      { mean: 158.98, std: 21.93 },
      { mean: 171.0, std: 12.19 },
      { mean: 174.67, std: 8.1 },
      { mean: 172.01, std: 9.04 },
    ],
  },
  {
    label: 'Squats', key: 'squats',
    angles: [
      { mean: 39.71, std: 44.71 },
      { mean: 68.93, std: 58.83 },
      { mean: 128.6, std: 53.69 },
      { mean: 129.82, std: 54.91 },
      { mean: 165.73, std: 29.39 },
    ],
  },
  {
    label: 'Push Ups', key: 'push_ups',
    angles: [
      { mean: 57.88, std: 47.17 },
      { mean: 125.64, std: 48.32 },
      { mean: 145.89, std: 51.3 },
      { mean: 139.32, std: 46.98 },
      { mean: 86.87, std: 47.71 },
    ],
  },
  {
    label: 'Pull Ups', key: 'pull_ups',
    angles: [
      { mean: 120.07, std: 59.32 },
      { mean: 122.0, std: 60.16 },
      { mean: 149.7, std: 58.42 },
      { mean: 167.74, std: 28.69 },
      { mean: 149.68, std: 58.16 },
    ],
  },
  {
    label: 'Russian Twists', key: 'sit_ups',
    angles: [
      { mean: 17.05, std: 13.17 },
      { mean: 76.17, std: 44.23 },
      { mean: 70.69, std: 47.21 },
      { mean: 93.18, std: 42.49 },
      { mean: 142.35, std: 23.98 },
    ],
  },
];

function vis(kp: Keypoint | undefined): kp is Keypoint {
  return !!kp && (kp.score ?? 0) >= MIN_SCORE;
}

/** Angle at joint B formed by segments A-B and B-C, in degrees. */
function angle3(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number {
  const bax = ax - bx, bay = ay - by;
  const bcx = cx - bx, bcy = cy - by;
  const dot = bax * bcx + bay * bcy;
  const mag = Math.sqrt((bax * bax + bay * bay) * (bcx * bcx + bcy * bcy)) + 1e-8;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

/** Average angle from left and right sides, or whichever side is visible. */
function avgAngle(
  kps: Keypoint[],
  aL: number, bL: number, cL: number,
  aR: number, bR: number, cR: number,
): number | null {
  const vals: number[] = [];
  if (vis(kps[aL]) && vis(kps[bL]) && vis(kps[cL])) {
    vals.push(angle3(kps[aL].x, kps[aL].y, kps[bL].x, kps[bL].y, kps[cL].x, kps[cL].y));
  }
  if (vis(kps[aR]) && vis(kps[bR]) && vis(kps[cR])) {
    vals.push(angle3(kps[aR].x, kps[aR].y, kps[bR].x, kps[bR].y, kps[cR].x, kps[cR].y));
  }
  return vals.length > 0 ? vals.reduce((a, b) => a + b) / vals.length : null;
}

export interface AngleClassResult {
  label: string;
  key: string;
  confidence: number;
  /** All scores for debugging */
  scores: Record<string, number>;
}

const DEBOUNCE_FRAMES = 3;

class AngleClassifier {
  private buffer: string[] = [];
  private confirmedKey = '';

  /**
   * Classify a single frame's keypoints. Returns null if not enough joints visible.
   */
  classify(kps: Keypoint[]): AngleClassResult | null {
    // Compute 4 joint angles (matching CSV columns — skip ankle, MoveNet has no foot keypoint)
    const shoulderAngle = avgAngle(kps,
      KP.L_ELBOW, KP.L_SHOULDER, KP.L_HIP,
      KP.R_ELBOW, KP.R_SHOULDER, KP.R_HIP);
    const elbowAngle = avgAngle(kps,
      KP.L_SHOULDER, KP.L_ELBOW, KP.L_WRIST,
      KP.R_SHOULDER, KP.R_ELBOW, KP.R_WRIST);
    const hipAngle = avgAngle(kps,
      KP.L_SHOULDER, KP.L_HIP, KP.L_KNEE,
      KP.R_SHOULDER, KP.R_HIP, KP.R_KNEE);
    const kneeAngle = avgAngle(kps,
      KP.L_HIP, KP.L_KNEE, KP.L_ANKLE,
      KP.R_HIP, KP.R_KNEE, KP.R_ANKLE);

    // Use only the 4 reliable angles (indices 0-3), skip ankle (index 4)
    const measured = [shoulderAngle, elbowAngle, hipAngle, kneeAngle];
    const validCount = measured.filter(v => v !== null).length;
    if (validCount < 3) return null;

    // Compute normalized distance to each profile centroid (first 4 angles only)
    const distances: { key: string; label: string; dist: number }[] = [];
    for (const profile of PROFILES) {
      let sumSq = 0;
      let used = 0;
      for (let i = 0; i < 4; i++) {
        if (measured[i] === null) continue;
        const std = Math.max(profile.angles[i].std, 5);
        const diff = (measured[i]! - profile.angles[i].mean) / std;
        sumSq += diff * diff;
        used++;
      }
      distances.push({ key: profile.key, label: profile.label, dist: Math.sqrt(sumSq / used) });
    }

    distances.sort((a, b) => a.dist - b.dist);

    const best = distances[0];
    const confidence = Math.exp(-best.dist * 0.5);

    const scores: Record<string, number> = {};
    for (const d of distances) {
      scores[d.key] = Math.round(Math.exp(-d.dist * 0.5) * 100);
    }

    // 3-frame debounce — but always allow transitions
    this.buffer.push(best.key);
    if (this.buffer.length > DEBOUNCE_FRAMES) this.buffer.shift();

    // Check if the last DEBOUNCE_FRAMES are all the same
    if (this.buffer.length >= DEBOUNCE_FRAMES) {
      const recent = this.buffer.slice(-DEBOUNCE_FRAMES);
      if (recent.every(k => k === recent[0])) {
        this.confirmedKey = recent[0];
      }
    } else {
      // Not enough frames yet — use raw best
      this.confirmedKey = best.key;
    }

    const confirmedProfile = PROFILES.find(p => p.key === this.confirmedKey);

    return {
      label: confirmedProfile?.label ?? best.label,
      key: this.confirmedKey,
      confidence,
      scores,
    };
  }

  reset() {
    this.buffer = [];
    this.confirmedKey = '';
  }
}

export const angleClassifier = new AngleClassifier();
