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

function mid(a: Keypoint, b: Keypoint) {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function visible(kp: Keypoint | undefined): kp is Keypoint {
  return !!kp && (kp.score ?? 0) >= MIN_SCORE;
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

    // We need at least hip + knee + one shoulder/ankle for any classification
    const haveHips    = visible(lHip) && visible(rHip);
    const haveKnees   = visible(lKnee) && visible(rKnee);
    const haveShoulders = visible(lShoulder) && visible(rShoulder);

    if (!haveHips || !haveKnees) {
      return this._output('unknown', 0);
    }

    const hipMid      = mid(lHip, rHip);
    const kneeMid     = mid(lKnee, rKnee);
    const ankleMid    = visible(lAnkle) && visible(rAnkle)
                          ? mid(lAnkle, rAnkle)
                          : null;
    const shoulderMid = haveShoulders ? mid(lShoulder, rShoulder) : null;

    // ── 1. Spine angle from vertical ───────────────────────────────
    let spineAngle = 0; // degrees from vertical; 0 = upright, 90 = horizontal
    if (shoulderMid) {
      const dx = Math.abs(hipMid.x - shoulderMid.x);
      const dy = Math.abs(hipMid.y - shoulderMid.y);
      spineAngle = (Math.atan2(dx, dy) * 180) / Math.PI;
    }

    // ── 2. Hip-knee angle (hip flexion) ────────────────────────────
    // Use ankle as the third point for the hip-knee-ankle angle (leg extension)
    let legAngle = 180; // default fully extended
    if (ankleMid) {
      legAngle = angle(
        hipMid.x, hipMid.y,
        kneeMid.x, kneeMid.y,
        ankleMid.x, ankleMid.y
      );
    }

    // ── 3. Hip-knee flexion angle (hip crease) ─────────────────────
    let hipFlexionAngle = 180;
    if (shoulderMid) {
      hipFlexionAngle = angle(
        shoulderMid.x, shoulderMid.y,
        hipMid.x, hipMid.y,
        kneeMid.x, kneeMid.y
      );
    }

    // ── 4. Body height ratio (hip Y vs shoulder Y) ─────────────────
    const bodyHeight = shoulderMid ? Math.abs(hipMid.y - shoulderMid.y) : 0;

    // ── Classification ─────────────────────────────────────────────
    let state: StaticPoseState = 'unknown';
    let confidence = 0;

    // LYING: spine is mostly horizontal
    if (spineAngle > 50) {
      state = 'lying';
      confidence = Math.min(1, (spineAngle - 50) / 40);
    }
    // SITTING: knees bent, hips flexed
    else if (hipFlexionAngle < 120 && legAngle < 130) {
      state = 'sitting';
      const flexScore = Math.max(0, (120 - hipFlexionAngle) / 60);
      confidence = Math.min(1, flexScore + 0.3);
    }
    // STANDING: legs extended, spine upright
    else if (legAngle > 150 && spineAngle < 25) {
      state = 'standing';
      confidence = Math.min(1, (legAngle - 150) / 30 + (25 - spineAngle) / 50);
    }
    // UNKNOWN: ambiguous
    else {
      // Best guess based on which threshold is closest
      if (legAngle > 130) {
        state = 'standing';
        confidence = 0.4;
      } else {
        state = 'sitting';
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
