/**
 * Burn-Ex AI — Static Pose Detector
 *
 * Detects standing / sitting / lying down from MoveNet 17 keypoints using
 * pure geometry (no ML inference). Runs on every frame alongside the
 * classifierEngine with negligible overhead.
 *
 * Features:
 *  - 3-frame debounce window to prevent flickering
 *  - Tracks time-in-state (duration in seconds)
 *  - Confidence scoring per state
 */

import type { Keypoint } from './classifierEngine';
import type { StaticPoseState, StaticPoseResult } from '../types';

// MoveNet keypoint indices
const KP = {
  L_SHOULDER: 5,
  R_SHOULDER: 6,
  L_HIP:      11,
  R_HIP:      12,
  L_KNEE:     13,
  R_KNEE:     14,
  L_ANKLE:    15,
  R_ANKLE:    16,
} as const;

const MIN_SCORE = 0.35;
const DEBOUNCE_FRAMES = 3;

function visible(kp: Keypoint | undefined): kp is Keypoint {
  return !!kp && (kp.score ?? 0) >= MIN_SCORE;
}

function mid(a: Keypoint | undefined, b: Keypoint | undefined) {
  const va = visible(a);
  const vb = visible(b);
  if (va && vb) return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
  if (va) return { x: a.x, y: a.y };
  if (vb) return { x: b.x, y: b.y };
  return null;
}

/**
 * Compute the angle at joint B formed by A–B–C (in degrees).
 */
function angle(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number
): number {
  const bax = ax - bx, bay = ay - by;
  const bcx = cx - bx, bcy = cy - by;
  const dot = bax * bcx + bay * bcy;
  const mag = Math.sqrt((bax ** 2 + bay ** 2) * (bcx ** 2 + bcy ** 2)) + 1e-8;
  return (Math.acos(Math.max(-1, Math.min(1, dot / mag))) * 180) / Math.PI;
}

function dist(a: {x: number, y: number}, b: {x: number, y: number}) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

class StaticPoseDetector {
  private debounceBuffer: StaticPoseState[] = [];
  private confirmedState: StaticPoseState = 'unknown';
  private stateStartTime: number = Date.now();

  /**
   * Analyse keypoints and return the current static pose with confidence
   * and time spent in that state.
   */
  detect(keypoints: Keypoint[]): StaticPoseResult {
    const get = (idx: number) => keypoints[idx];

    const lShoulder = get(KP.L_SHOULDER);
    const rShoulder = get(KP.R_SHOULDER);
    const lHip      = get(KP.L_HIP);
    const rHip      = get(KP.R_HIP);
    const lKnee     = get(KP.L_KNEE);
    const rKnee     = get(KP.R_KNEE);
    const lAnkle    = get(KP.L_ANKLE);
    const rAnkle    = get(KP.R_ANKLE);

    const hipMid      = mid(lHip, rHip);
    const kneeMid     = mid(lKnee, rKnee);
    const ankleMid    = mid(lAnkle, rAnkle);
    const shoulderMid = mid(lShoulder, rShoulder);

    // If we don't have at least one shoulder, hip, and knee, we can't reliably detect posture
    if (!shoulderMid || !hipMid || !kneeMid) {
      return this._output('unknown', 0);
    }

    // ── 1. Spine angle from vertical ───────────────────────────────
    const dx = Math.abs(hipMid.x - shoulderMid.x);
    const dy = Math.abs(hipMid.y - shoulderMid.y);
    const spineAngle = (Math.atan2(dx, dy) * 180) / Math.PI;

    // ── 2. Hip-knee angle (hip flexion) ────────────────────────────
    let legAngle = 180; // default fully extended
    if (ankleMid) {
      legAngle = angle(
        hipMid.x, hipMid.y,
        kneeMid.x, kneeMid.y,
        ankleMid.x, ankleMid.y
      );
    }

    // ── 3. Hip-knee flexion angle (hip crease) ─────────────────────
    const hipFlexionAngle = angle(
      shoulderMid.x, shoulderMid.y,
      hipMid.x, hipMid.y,
      kneeMid.x, kneeMid.y
    );

    // ── 4. Perspective Foreshortening (Laptop sitting detection) ───
    // When sitting facing a camera, the thighs point towards the lens (Z-axis).
    // In 2D, the thigh length appears significantly shorter than the torso.
    const torsoLength = dist(shoulderMid, hipMid);
    const thighLength = dist(hipMid, kneeMid);
    const foreshorteningRatio = thighLength / (torsoLength || 1);

    // ── Classification ─────────────────────────────────────────────
    let state: StaticPoseState = 'unknown';
    let confidence = 0;

    // LYING: spine is mostly horizontal
    if (spineAngle > 50) {
      state = 'lying';
      confidence = Math.min(1, (spineAngle - 50) / 40);
    }
    // SITTING: hips flexed OR severe thigh foreshortening (legs pointing at camera)
    else if (hipFlexionAngle < 135 || foreshorteningRatio < 0.7) {
      state = 'sitting';
      const flexScore = Math.max(0, (135 - hipFlexionAngle) / 45);
      const shortenScore = Math.max(0, (0.7 - foreshorteningRatio) / 0.3);
      const baseScore = Math.max(flexScore, shortenScore);
      
      // Boost confidence if leg is also visibly bent
      const legBonus = ankleMid && legAngle < 130 ? 0.2 : 0;
      confidence = Math.min(1, baseScore + 0.4 + legBonus);
    }
    // STANDING: hips extended, spine upright, normal proportions
    else if (hipFlexionAngle > 150 && spineAngle < 30 && foreshorteningRatio > 0.8) {
      state = 'standing';
      confidence = Math.min(1, (hipFlexionAngle - 150) / 30 + (30 - spineAngle) / 50);
    }
    // UNKNOWN: ambiguous
    else {
      if (foreshorteningRatio < 0.75 || hipFlexionAngle < 145) {
        state = 'sitting';
        confidence = 0.4;
      } else {
        state = 'standing';
        confidence = 0.4;
      }
    }

    return this._output(state, Math.min(1, confidence));
  }

  private _output(state: StaticPoseState, confidence: number): StaticPoseResult {
    // Debounce: only accept state after DEBOUNCE_FRAMES consecutive identical frames
    this.debounceBuffer.push(state);
    if (this.debounceBuffer.length > DEBOUNCE_FRAMES) {
      this.debounceBuffer.shift();
    }

    const allSame = this.debounceBuffer.every(s => s === state);
    if (allSame && state !== this.confirmedState) {
      this.confirmedState = state;
      this.stateStartTime = Date.now();
    }

    const durationSeconds = (Date.now() - this.stateStartTime) / 1000;

    return {
      state: this.confirmedState,
      confidence,
      durationSeconds,
    };
  }

  reset() {
    this.debounceBuffer = [];
    this.confirmedState = 'unknown';
    this.stateStartTime = Date.now();
  }
}

export const staticPoseDetector = new StaticPoseDetector();
