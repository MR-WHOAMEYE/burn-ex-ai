/**
 * Burn-Ex AI — Suggestion Engine
 *
 * Provides personalized exercise recommendations based on:
 *  - User's daily calorie target vs. calories already burned
 *  - Workout history (variety bonus, muscle group rotation)
 *  - Sedentary time from static pose detector
 *
 * Scoring formula (from spec §7.5):
 *   score = (calorieGap/estimatedBurn)×0.4 + varietyBonus×0.3 + muscleRotation×0.3
 */

import { Request, Response } from 'express';

// MET values and metadata per exercise
const EXERCISE_CATALOG: Array<{
  key: string;
  displayName: string;
  met: number;
  muscleGroup: string;
  recommendedDurationMinutes: number;
}> = [
  { key: 'squats',         displayName: 'Squats',          met: 5.0,  muscleGroup: 'legs',         recommendedDurationMinutes: 10 },
  { key: 'push_ups',       displayName: 'Push-Ups',        met: 8.0,  muscleGroup: 'chest',        recommendedDurationMinutes: 10 },
  { key: 'jumping_jacks',  displayName: 'Jumping Jacks',   met: 8.0,  muscleGroup: 'full_body',    recommendedDurationMinutes: 10 },
  { key: 'jump_rope',      displayName: 'Jump Rope',       met: 9.0,  muscleGroup: 'full_body',    recommendedDurationMinutes: 10 },
  { key: 'pull_ups',       displayName: 'Pull-Ups',        met: 8.0,  muscleGroup: 'back',         recommendedDurationMinutes: 8  },
  { key: 'sit_ups',        displayName: 'Sit-Ups',         met: 4.0,  muscleGroup: 'core',         recommendedDurationMinutes: 10 },
  { key: 'clean_and_jerk', displayName: 'Clean & Jerk',   met: 10.0, muscleGroup: 'full_body',    recommendedDurationMinutes: 8  },
  { key: 'bench_press',    displayName: 'Bench Press',     met: 6.0,  muscleGroup: 'chest',        recommendedDurationMinutes: 10 },
  { key: 'burpees',        displayName: 'Burpees',         met: 9.0,  muscleGroup: 'full_body',    recommendedDurationMinutes: 8  },
  { key: 'walking',        displayName: 'Brisk Walking',   met: 3.5,  muscleGroup: 'legs',         recommendedDurationMinutes: 15 },
  { key: 'plank',          displayName: 'Plank Hold',      met: 4.0,  muscleGroup: 'core',         recommendedDurationMinutes: 5  },
  { key: 'lunges',         displayName: 'Lunges',          met: 4.5,  muscleGroup: 'legs',         recommendedDurationMinutes: 10 },
];

function estimateCalories(met: number, weightKg: number, durationMin: number): number {
  return Math.round((met * 3.5 * weightKg) / 200 * durationMin);
}

export const suggestionController = {
  /**
   * GET /api/suggestions/daily
   * Returns top 3 personalized exercise recommendations.
   * Query: weightKg, targetCalories, burnedCalories, recentExercises (comma-separated)
   */
  daily: (req: Request, res: Response) => {
    const weightKg       = parseFloat(req.query.weightKg as string)       || 70;
    const targetCalories = parseFloat(req.query.targetCalories as string)  || 2000;
    const burnedCalories = parseFloat(req.query.burnedCalories as string)  || 0;
    const recentRaw      = (req.query.recentExercises as string)           || '';
    const recentExercises = recentRaw ? recentRaw.split(',').map(s => s.trim()) : [];

    const calorieGap = Math.max(0, targetCalories - burnedCalories);

    // Build score for each exercise
    const scored = EXERCISE_CATALOG.map((ex) => {
      const estimated = estimateCalories(ex.met, weightKg, ex.recommendedDurationMinutes);
      const gapFit    = calorieGap > 0 ? Math.min(1, estimated / calorieGap) : 0.5;
      const variety   = recentExercises.includes(ex.key) ? 0 : 1;

      // Simple muscle group rotation bonus
      const recentMuscleGroups = EXERCISE_CATALOG
        .filter(e => recentExercises.includes(e.key))
        .map(e => e.muscleGroup);
      const muscleBonus = recentMuscleGroups.includes(ex.muscleGroup) ? 0 : 1;

      const score = gapFit * 0.4 + variety * 0.3 + muscleBonus * 0.3;

      let reason: string;
      if (calorieGap > 0 && estimated >= calorieGap * 0.4) {
        reason = `Burns ~${estimated} kcal — covers ${Math.round((estimated / calorieGap) * 100)}% of your remaining target.`;
      } else if (variety === 1) {
        reason = `Add variety! You haven't done ${ex.displayName} recently.`;
      } else {
        reason = `Great for muscle group rotation and overall fitness.`;
      }

      return {
        exercise: ex.key,
        displayName: ex.displayName,
        estimatedCalories: estimated,
        recommendedDurationMinutes: ex.recommendedDurationMinutes,
        reason,
        met: ex.met,
        score,
      };
    });

    // Sort by score descending, pick top 3
    const top3 = scored
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(({ score: _score, ...rest }) => rest); // remove score from response

    res.json({
      suggestions: top3,
      totalCaloriesBurned: Math.round(burnedCalories),
      remainingCalories: Math.round(calorieGap),
      dailyTarget: Math.round(targetCalories),
    });
  },

  /**
   * GET /api/suggestions/exercise-tip?exercise=squats
   * Returns form tips and optimal cues for a specific exercise.
   */
  exerciseTip: (req: Request, res: Response) => {
    const exercise = (req.query.exercise as string || '').toLowerCase().replace(/ /g, '_');

    const TIPS: Record<string, { tips: string[]; optimalFormCues: string[] }> = {
      squats: {
        tips: [
          'Keep heels flat, knees tracking over toes.',
          'Descend to parallel (thighs parallel to floor) for full activation.',
          'Brace your core before each rep.',
        ],
        optimalFormCues: ['Chest up', 'Knees out', 'Hip crease below knee at bottom'],
      },
      push_ups: {
        tips: [
          'Body in straight line head to heels.',
          'Lower chest to within 2cm of the floor.',
          'Control the eccentric phase — count 2 seconds down.',
        ],
        optimalFormCues: ['Core tight', '45° elbow angle', 'Full lockout at top'],
      },
      jumping_jacks: {
        tips: [
          'Land softly on the balls of your feet.',
          'Keep a steady rhythm for maximum calorie burn.',
        ],
        optimalFormCues: ['Arms fully overhead', 'Soft landings', 'Core engaged'],
      },
    };

    const data = TIPS[exercise] || {
      tips: ['Focus on full range of motion for each rep.', 'Keep consistent tempo throughout.'],
      optimalFormCues: ['Core tight', 'Controlled breathing', 'Full ROM'],
    };

    res.json({ exercise, ...data });
  },

  /**
   * POST /api/suggestions/check-sedentary
   * Body: { sedentaryMinutes, currentPose, weightKg }
   * Returns an alert flag and suggested exercise if sedentary threshold is met.
   */
  checkSedentary: (req: Request, res: Response) => {
    const { sedentaryMinutes = 0, currentPose = 'unknown', weightKg = 70 } = req.body || {};
    const THRESHOLD_MINUTES = 30;

    if (sedentaryMinutes < THRESHOLD_MINUTES) {
      return res.json({ alert: false, suggestion: null, exerciseRecommendation: null });
    }

    const minutesOver = Math.round(sedentaryMinutes - THRESHOLD_MINUTES);
    const recommendation = 'walking'; // Best low-impact suggestion for sedentary users
    const ex = EXERCISE_CATALOG.find(e => e.key === recommendation)!;
    const calories = estimateCalories(ex.met, weightKg, 5);

    res.json({
      alert: true,
      suggestion: `You've been ${currentPose} for ${Math.round(sedentaryMinutes)} minutes (${minutesOver} min over limit). Time to move!`,
      exerciseRecommendation: {
        exercise: ex.key,
        displayName: ex.displayName,
        durationMinutes: 5,
        estimatedCalories: calories,
        message: `A 5-min brisk walk will burn ~${calories} kcal and reset your focus! 🚶`,
      },
    });
  },
};
