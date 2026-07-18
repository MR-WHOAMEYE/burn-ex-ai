/**
 * Burn-Ex AI — Local Coach Service
 *
 * Provides instant (0ms latency) coaching tips without needing Gemini.
 * Used as the primary feedback layer; Gemini supplements with richer responses.
 *
 * Features:
 *  - Exercise-specific form tips
 *  - Rep milestone motivational messages
 *  - Sedentary alerts based on static pose timer
 *  - Calorie burn rate tips
 */

import type { LocalCoachMessage, StaticPoseState } from '../types';

// ── Form Tips per Exercise ─────────────────────────────────────────────────────
const FORM_TIPS: Record<string, string[]> = {
  squats: [
    'Keep your chest up and core tight throughout the movement.',
    'Drive your knees outward — don\'t let them cave inward.',
    'Descend until thighs are parallel to the floor for full activation.',
    'Keep heels flat on the ground, distribute weight evenly.',
    'Brace your core on the way down for a 30% extra calorie burn.',
  ],
  push_ups: [
    'Keep your body in a straight line from head to heels.',
    'Lower your chest all the way to near the floor for full ROM.',
    'Flare elbows at 45° — not fully tucked or fully wide.',
    'Slow down your descent for 30% more muscle time-under-tension.',
    'Engage your core — prevents lower back sag and activates more muscle fibers.',
  ],
  bench_press: [
    'Retract your shoulder blades before unracking the bar.',
    'Keep your feet flat on the floor for a stable base.',
    'Bar path should arc slightly — not straight up and down.',
    'Control the eccentric (lowering) phase for more muscle recruitment.',
  ],
  jumping_jacks: [
    'Land softly with a slight knee bend to reduce joint impact.',
    'Maintain a steady rhythm — consistency maximises calorie burn.',
    'Keep your core engaged throughout to protect your lower back.',
    'Arms fully overhead at the top for full shoulder activation.',
  ],
  jump_rope: [
    'Stay on the balls of your feet — don\'t let heels touch the ground.',
    'Keep jumps small (2–3 cm) to conserve energy for longer sessions.',
    'Elbows in, wrists do the rotation — not the full arm.',
    'Gaze forward, not down — helps with rhythm and breathing.',
  ],
  pull_ups: [
    'Start each rep from a dead hang for full lat activation.',
    'Drive your elbows down to your hips, not just bending your arms.',
    'Control the descent — avoid dropping down to a dead hang quickly.',
    'Squeeze at the top for an extra 0.5-second hold for maximum benefit.',
  ],
  sit_ups: [
    'Cross arms over your chest, not behind your neck.',
    'Exhale on the way up, inhale on the way down.',
    'Engage your lower abs by tilting your pelvis slightly.',
    'Keep the movement controlled — avoid using momentum.',
  ],
  clean_and_jerk: [
    'Start with the bar over mid-foot, shoulder-width grip.',
    'Keep the bar close to your body throughout the pull.',
    'Explosive hip extension drives the bar — not your arms.',
    'Receive the bar in a solid front squat position.',
  ],
};

// ── Rep Milestone Messages ─────────────────────────────────────────────────────
const MILESTONE_MESSAGES: Record<number, string> = {
  5:  '5 reps! Great warm-up. Keep going! 🔥',
  10: '10 reps! You\'re in the zone! 💪',
  15: '15 reps! Halfway to a killer set! ⚡',
  20: '20 reps! Elite territory! You\'re unstoppable! 🏆',
  25: '25 reps! Absolute beast mode activated! 🦾',
  30: '30 reps! Legendary. Catch your breath and keep going! 🌟',
  50: '50 reps! You are a machine. Seriously. 🤖',
};

// ── Sedentary Alert Messages ───────────────────────────────────────────────────
const SEDENTARY_ALERTS = [
  'You\'ve been sitting for {min} minutes. Time to move! Try 10 jumping jacks. 🚶',
  '{min} minutes of sitting detected. Stand up and do a 2-minute walk! 🏃',
  'Sedentary alert: {min} min. Quick 5-min walk = ~25 calories burned! 🔥',
  'Your body needs movement! {min} min sitting. Try 15 squats right now! 🦵',
];

class LocalCoach {
  private lastTipIndex: Record<string, number> = {};
  private lastMilestoneRep = 0;
  private alertIndex = 0;

  /**
   * Get a cycling form tip for the current exercise.
   * Returns null if no exercise is detected yet.
   */
  getFormTip(exercise: string): LocalCoachMessage | null {
    const key = exercise.toLowerCase().replace(/ /g, '_');
    const tips = FORM_TIPS[key];
    if (!tips || tips.length === 0) return null;

    const lastIdx = this.lastTipIndex[key] ?? -1;
    const nextIdx = (lastIdx + 1) % tips.length;
    this.lastTipIndex[key] = nextIdx;

    return {
      type: 'form_tip',
      text: tips[nextIdx],
      exercise: key,
    };
  }

  /**
   * Check if the rep count has hit a milestone.
   * Returns a motivational message if it has, otherwise null.
   */
  checkMilestone(reps: number): LocalCoachMessage | null {
    const milestones = Object.keys(MILESTONE_MESSAGES).map(Number).sort((a, b) => a - b);
    for (const milestone of milestones) {
      if (reps >= milestone && this.lastMilestoneRep < milestone) {
        this.lastMilestoneRep = milestone;
        return {
          type: 'milestone',
          text: MILESTONE_MESSAGES[milestone],
        };
      }
    }
    return null;
  }

  /**
   * Generate a sedentary alert based on how long the user has been sitting.
   * Returns null if sitting duration is below the threshold.
   * @param sittingMinutes - how long the user has been sitting
   * @param threshold - minutes before alerting (default 30)
   */
  getSedentaryAlert(sittingMinutes: number, threshold = 30): LocalCoachMessage | null {
    if (sittingMinutes < threshold) return null;

    const template = SEDENTARY_ALERTS[this.alertIndex % SEDENTARY_ALERTS.length];
    this.alertIndex++;
    const text = template.replace('{min}', Math.round(sittingMinutes).toString());

    return {
      type: 'sedentary_alert',
      text,
    };
  }

  /**
   * Get a calorie-focused burn boost tip for the sidebar.
   */
  getBurnBoostTip(exercise: string, caloriesPerMin: number): LocalCoachMessage {
    const rate = caloriesPerMin.toFixed(1);
    const tips = [
      `You're burning ${rate} kcal/min. Increase pace to boost burn! 🔥`,
      `${rate} kcal/min rate. Add 10% more intensity for bigger results.`,
      `Current burn: ${rate} kcal/min. 5 more reps = extra ${(caloriesPerMin * 0.3).toFixed(0)} kcal!`,
    ];
    const idx = Math.floor(Math.random() * tips.length);
    return {
      type: 'form_tip',
      text: tips[idx],
      exercise,
    };
  }

  /**
   * Get the emoji + label for a static pose state.
   */
  getPoseBadge(state: StaticPoseState): { emoji: string; label: string } {
    switch (state) {
      case 'standing': return { emoji: '🧍', label: 'Standing' };
      case 'sitting':  return { emoji: '🪑', label: 'Sitting' };
      case 'lying':    return { emoji: '🛌', label: 'Lying' };
      default:         return { emoji: '❓', label: 'Detecting...' };
    }
  }

  reset() {
    this.lastTipIndex = {};
    this.lastMilestoneRep = 0;
  }
}

export const localCoach = new LocalCoach();
