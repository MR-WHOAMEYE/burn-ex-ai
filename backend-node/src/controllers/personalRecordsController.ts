/**
 * Personal Records Controller — Burn-Ex AI
 *
 * Derives all 10 personal record categories purely from the real
 * WorkoutSession collection in MongoDB (or in-memory fallback).
 *
 * Endpoints:
 *   GET  /api/records              — All 10 computed PRs
 *   GET  /api/records/prediction   — AI "Record to Beat" prediction
 *   GET  /api/records/timeline     — Chronological PR events
 *   PUT  /api/records/:category    — Force-update a record (used post-workout)
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WorkoutSessionModel, type IWorkoutSession } from '../models/WorkoutSession.js';
import { UserModel } from '../models/User.js';

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────
interface PersonalRecord {
  category: string;
  icon: string;
  label: string;
  value: number;
  unit: string;
  displayValue: string;
  detail: Record<string, string | number>;
  achievedAt: string | null;
  previousValue: number | null;
  improvementPercent: number | null;
  isNewRecord: boolean;
}

interface RecordPrediction {
  category: string;
  label: string;
  icon: string;
  currentRecord: number;
  unit: string;
  displayValue: string;
  confidence: number;
  estimatedWorkouts: number;
  reasoning: string;
}

// ─────────────────────────────────────────────────────────────────
// Helper: fetch all sessions for the authenticated user
// ─────────────────────────────────────────────────────────────────
async function fetchSessions(firebaseUid: string): Promise<IWorkoutSession[]> {
  if (mongoose.connection.readyState !== 1) return [];
  const user = await UserModel.findOne({ firebaseId: firebaseUid });
  if (!user) return [];
  return WorkoutSessionModel.find({ userId: user._id }).sort({ startTime: 1 }).lean();
}

// ─────────────────────────────────────────────────────────────────
// Helper: format seconds → "Xh Ym" or "Ym Zs"
// ─────────────────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

// ─────────────────────────────────────────────────────────────────
// Helper: improvement percentage (null if no previous)
// ─────────────────────────────────────────────────────────────────
function improvement(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100 * 10) / 10;
}

// ─────────────────────────────────────────────────────────────────
// Core: compute all 10 personal records from sessions
// ─────────────────────────────────────────────────────────────────
function computeRecords(sessions: IWorkoutSession[]): PersonalRecord[] {
  if (sessions.length === 0) return [];

  // ── 1. Longest Workout (duration) ────────────────────────────
  let longestSession = sessions[0];
  let prevLongest: IWorkoutSession | null = null;
  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].totalDurationSeconds > longestSession.totalDurationSeconds) {
      prevLongest = longestSession;
      longestSession = sessions[i];
    }
  }

  // ── 2. Highest Calories Burned ────────────────────────────────
  let highestCalSession = sessions[0];
  let prevHighCal: IWorkoutSession | null = null;
  for (let i = 1; i < sessions.length; i++) {
    if (sessions[i].totalCaloriesBurned > highestCalSession.totalCaloriesBurned) {
      prevHighCal = highestCalSession;
      highestCalSession = sessions[i];
    }
  }

  // ── 3. Max Reps in single exercise segment ────────────────────
  let maxReps = 0;
  let maxRepsExercise = '';
  let maxRepsDate: Date | null = null;
  let prevMaxReps = 0;
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.repsCompleted > maxReps) {
        prevMaxReps = maxReps;
        maxReps = ex.repsCompleted;
        maxRepsExercise = ex.exerciseType;
        maxRepsDate = session.startTime instanceof Date ? session.startTime : new Date(session.startTime);
      }
    }
  }

  // ── 4. Longest Workout Streak ─────────────────────────────────
  const daySet = new Set<string>();
  for (const s of sessions) {
    const d = new Date(s.startTime);
    daySet.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  const sortedDays = Array.from(daySet).sort();
  let longestStreak = 0;
  let currentStreak = 1;
  let streakStart = sortedDays[0];
  let streakEnd = sortedDays[0];
  let longestStart = sortedDays[0];
  let longestEnd = sortedDays[0];
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diff = (curr.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) {
      currentStreak++;
      streakEnd = sortedDays[i];
    } else {
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
        longestStart = streakStart;
        longestEnd = streakEnd;
      }
      currentStreak = 1;
      streakStart = sortedDays[i];
      streakEnd = sortedDays[i];
    }
  }
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak;
    longestStart = streakStart;
    longestEnd = streakEnd;
  }
  // Current streak (from today backwards)
  let currentStreakCount = 0;
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  if (daySet.has(todayKey)) {
    currentStreakCount = 1;
    for (let i = 1; i <= 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (daySet.has(key)) currentStreakCount++;
      else break;
    }
  }

  // ── 5. Highest AI Accuracy Score (avgPostureScore as proxy) ───
  let highestAccuracy = 0;
  let highestAccuracySession: IWorkoutSession | null = null;
  let highestAccuracyExercise = '';
  let prevHighAccuracy = 0;
  for (const session of sessions) {
    for (const ex of session.exercises) {
      const score = (ex.avgPostureScore + ex.avgSmoothness) / 2;
      if (score > highestAccuracy) {
        prevHighAccuracy = highestAccuracy;
        highestAccuracy = score;
        highestAccuracySession = session;
        highestAccuracyExercise = ex.exerciseType;
      }
    }
  }

  // ── 6. Fastest Workout Completion (lowest duration with > X cals) ─
  const meaningfulSessions = sessions.filter(s => s.totalCaloriesBurned > 50);
  let fastestSession: IWorkoutSession | null = meaningfulSessions[0] || null;
  let prevFastest: IWorkoutSession | null = null;
  for (let i = 1; i < meaningfulSessions.length; i++) {
    if (meaningfulSessions[i].totalDurationSeconds < (fastestSession?.totalDurationSeconds ?? Infinity)) {
      prevFastest = fastestSession;
      fastestSession = meaningfulSessions[i];
    }
  }

  // ── 7. Most Active Day (day-of-week with most workouts) ────────
  const dayCounts: Record<string, { workouts: number; totalSecs: number; totalCals: number }> = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  for (const s of sessions) {
    const d = new Date(s.startTime);
    const dayName = dayNames[d.getDay()];
    if (!dayCounts[dayName]) dayCounts[dayName] = { workouts: 0, totalSecs: 0, totalCals: 0 };
    dayCounts[dayName].workouts++;
    dayCounts[dayName].totalSecs += s.totalDurationSeconds;
    dayCounts[dayName].totalCals += s.totalCaloriesBurned;
  }
  let mostActiveDay = 'Monday';
  let mostActiveCount = 0;
  for (const [day, stats] of Object.entries(dayCounts)) {
    if (stats.workouts > mostActiveCount) {
      mostActiveCount = stats.workouts;
      mostActiveDay = day;
    }
  }
  const activeDayStats = dayCounts[mostActiveDay] || { workouts: 0, totalSecs: 0, totalCals: 0 };

  // ── 8. Total Workout Time ─────────────────────────────────────
  const totalSeconds = sessions.reduce((s, w) => s + w.totalDurationSeconds, 0);
  const totalHours = Math.round((totalSeconds / 3600) * 10) / 10;
  const avgSessionSecs = sessions.length > 0 ? Math.round(totalSeconds / sessions.length) : 0;

  // ── 9. Most Performed Exercise ────────────────────────────────
  const exerciseCounts: Record<string, { reps: number; sessions: number }> = {};
  for (const session of sessions) {
    const seen = new Set<string>();
    for (const ex of session.exercises) {
      exerciseCounts[ex.exerciseType] = exerciseCounts[ex.exerciseType] || { reps: 0, sessions: 0 };
      exerciseCounts[ex.exerciseType].reps += ex.repsCompleted;
      if (!seen.has(ex.exerciseType)) {
        exerciseCounts[ex.exerciseType].sessions++;
        seen.add(ex.exerciseType);
      }
    }
  }
  let mostPerformedExercise = '';
  let mostPerformedReps = 0;
  let mostPerformedSessions = 0;
  for (const [name, stats] of Object.entries(exerciseCounts)) {
    if (stats.reps > mostPerformedReps) {
      mostPerformedReps = stats.reps;
      mostPerformedExercise = name;
      mostPerformedSessions = stats.sessions;
    }
  }
  const totalSessionCount = sessions.length;
  const exercisePct = totalSessionCount > 0 ? Math.round((mostPerformedSessions / totalSessionCount) * 100) : 0;

  // ── 10. Highest Workout Intensity ─────────────────────────────
  let highestIntensity = 0;
  let highestIntensitySession: IWorkoutSession | null = null;
  let highestIntensityExercise = '';
  let prevHighIntensity = 0;
  let highestMovementScore = 0;
  for (const session of sessions) {
    for (const ex of session.exercises) {
      if (ex.avgIntensity > highestIntensity) {
        prevHighIntensity = highestIntensity;
        highestIntensity = ex.avgIntensity;
        highestIntensitySession = session;
        highestIntensityExercise = ex.exerciseType;
        highestMovementScore = ex.avgSmoothness;
      }
    }
  }

  const fmt = (d: Date | string | null | undefined) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  // Build 10 record objects
  return [
    // 1
    {
      category: 'longestWorkout',
      icon: '⏱',
      label: 'Longest Workout',
      value: longestSession.totalDurationSeconds,
      unit: 'seconds',
      displayValue: formatDuration(longestSession.totalDurationSeconds),
      detail: {
        dateAchieved: fmt(longestSession.startTime) ?? '—',
        previousRecord: prevLongest ? formatDuration(prevLongest.totalDurationSeconds) : '—',
      },
      achievedAt: longestSession.startTime ? new Date(longestSession.startTime).toISOString() : null,
      previousValue: prevLongest?.totalDurationSeconds ?? null,
      improvementPercent: improvement(longestSession.totalDurationSeconds, prevLongest?.totalDurationSeconds ?? null),
      isNewRecord: false,
    },
    // 2
    {
      category: 'highestCalories',
      icon: '🔥',
      label: 'Highest Calories Burned',
      value: Math.round(highestCalSession.totalCaloriesBurned),
      unit: 'kcal',
      displayValue: `${Math.round(highestCalSession.totalCaloriesBurned)} kcal`,
      detail: {
        workoutType: highestCalSession.exercises[0]?.exerciseType ?? 'Mixed',
        dateAchieved: fmt(highestCalSession.startTime) ?? '—',
        previousRecord: prevHighCal ? `${Math.round(prevHighCal.totalCaloriesBurned)} kcal` : '—',
      },
      achievedAt: highestCalSession.startTime ? new Date(highestCalSession.startTime).toISOString() : null,
      previousValue: prevHighCal ? Math.round(prevHighCal.totalCaloriesBurned) : null,
      improvementPercent: improvement(highestCalSession.totalCaloriesBurned, prevHighCal?.totalCaloriesBurned ?? null),
      isNewRecord: false,
    },
    // 3
    {
      category: 'maxReps',
      icon: '💪',
      label: 'Maximum Repetitions',
      value: maxReps,
      unit: 'reps',
      displayValue: `${maxReps} reps`,
      detail: {
        exercise: maxRepsExercise || '—',
        dateAchieved: fmt(maxRepsDate) ?? '—',
        previousRecord: prevMaxReps > 0 ? `${prevMaxReps} reps` : '—',
      },
      achievedAt: maxRepsDate ? maxRepsDate.toISOString() : null,
      previousValue: prevMaxReps || null,
      improvementPercent: improvement(maxReps, prevMaxReps || null),
      isNewRecord: false,
    },
    // 4
    {
      category: 'longestStreak',
      icon: '🏃',
      label: 'Longest Workout Streak',
      value: longestStreak,
      unit: 'days',
      displayValue: `${longestStreak} days`,
      detail: {
        startDate: longestStart ? new Date(longestStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
        endDate: longestEnd ? new Date(longestEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—',
        currentStreak: `${currentStreakCount} days`,
      },
      achievedAt: longestEnd ? new Date(longestEnd).toISOString() : null,
      previousValue: null,
      improvementPercent: null,
      isNewRecord: false,
    },
    // 5
    {
      category: 'highestAIAccuracy',
      icon: '🎯',
      label: 'Highest AI Accuracy Score',
      value: Math.round(highestAccuracy * 10) / 10,
      unit: '%',
      displayValue: `${Math.round(highestAccuracy * 10) / 10}%`,
      detail: {
        workoutType: highestAccuracyExercise || '—',
        confidence: highestAccuracySession ? `${Math.round((highestAccuracySession.exercises[0]?.avgSmoothness || 0))}%` : '—',
        dateAchieved: fmt(highestAccuracySession?.startTime) ?? '—',
      },
      achievedAt: highestAccuracySession?.startTime ? new Date(highestAccuracySession.startTime).toISOString() : null,
      previousValue: prevHighAccuracy > 0 ? Math.round(prevHighAccuracy * 10) / 10 : null,
      improvementPercent: improvement(highestAccuracy, prevHighAccuracy || null),
      isNewRecord: false,
    },
    // 6
    {
      category: 'fastestWorkout',
      icon: '⚡',
      label: 'Fastest Workout Completion',
      value: fastestSession?.totalDurationSeconds ?? 0,
      unit: 'seconds',
      displayValue: fastestSession ? formatDuration(fastestSession.totalDurationSeconds) : '—',
      detail: {
        workoutName: fastestSession?.exercises[0]?.exerciseType ?? '—',
        caloriesBurned: fastestSession ? `${Math.round(fastestSession.totalCaloriesBurned)} kcal` : '—',
        dateAchieved: fmt(fastestSession?.startTime) ?? '—',
        avgSpeed: fastestSession ? `${(fastestSession.totalCaloriesBurned / (fastestSession.totalDurationSeconds / 60)).toFixed(1)} kcal/min` : '—',
      },
      achievedAt: fastestSession?.startTime ? new Date(fastestSession.startTime).toISOString() : null,
      previousValue: prevFastest?.totalDurationSeconds ?? null,
      improvementPercent: fastestSession && prevFastest
        ? improvement(prevFastest.totalDurationSeconds, fastestSession.totalDurationSeconds)
        : null,
      isNewRecord: false,
    },
    // 7
    {
      category: 'mostActiveDay',
      icon: '📅',
      label: 'Most Active Day',
      value: mostActiveCount,
      unit: 'workouts',
      displayValue: mostActiveDay,
      detail: {
        dayName: mostActiveDay,
        totalWorkouts: mostActiveCount,
        totalHours: formatDuration(activeDayStats.totalSecs),
        totalCalories: `${Math.round(activeDayStats.totalCals)} kcal`,
      },
      achievedAt: null,
      previousValue: null,
      improvementPercent: null,
      isNewRecord: false,
    },
    // 8
    {
      category: 'totalWorkoutTime',
      icon: '⌛',
      label: 'Total Workout Time',
      value: totalHours,
      unit: 'hours',
      displayValue: `${totalHours}h`,
      detail: {
        totalSessions: sessions.length,
        avgDuration: formatDuration(avgSessionSecs),
        totalSeconds,
      },
      achievedAt: null,
      previousValue: null,
      improvementPercent: null,
      isNewRecord: false,
    },
    // 9
    {
      category: 'mostPerformedExercise',
      icon: '🏅',
      label: 'Most Performed Exercise',
      value: mostPerformedReps,
      unit: 'total reps',
      displayValue: mostPerformedExercise || '—',
      detail: {
        exerciseName: mostPerformedExercise || '—',
        totalReps: mostPerformedReps,
        totalSessions: mostPerformedSessions,
        percentOfWorkouts: `${exercisePct}%`,
      },
      achievedAt: null,
      previousValue: null,
      improvementPercent: null,
      isNewRecord: false,
    },
    // 10
    {
      category: 'highestIntensity',
      icon: '❤️',
      label: 'Highest Workout Intensity',
      value: Math.round(highestIntensity * 10) / 10,
      unit: '%',
      displayValue: `${Math.round(highestIntensity * 10) / 10}%`,
      detail: {
        workoutName: highestIntensityExercise || '—',
        movementScore: `${Math.round(highestMovementScore)}%`,
        dateAchieved: fmt(highestIntensitySession?.startTime) ?? '—',
      },
      achievedAt: highestIntensitySession?.startTime ? new Date(highestIntensitySession.startTime).toISOString() : null,
      previousValue: prevHighIntensity > 0 ? Math.round(prevHighIntensity * 10) / 10 : null,
      improvementPercent: improvement(highestIntensity, prevHighIntensity || null),
      isNewRecord: false,
    },
  ];
}

// ─────────────────────────────────────────────────────────────────
// AI Prediction: which record is closest to being broken?
// ─────────────────────────────────────────────────────────────────
function computePrediction(sessions: IWorkoutSession[], records: PersonalRecord[]): RecordPrediction | null {
  if (sessions.length < 2) return null;

  // Take last 5 sessions to gauge recent trend
  const recent = sessions.slice(-5);

  // Predict which calorie PR is most approachable
  const recentAvgCals = recent.reduce((s, w) => s + w.totalCaloriesBurned, 0) / recent.length;
  const calRecord = records.find(r => r.category === 'highestCalories');
  const calGap = calRecord ? (calRecord.value - recentAvgCals) / calRecord.value : 1;

  const recentAvgDuration = recent.reduce((s, w) => s + w.totalDurationSeconds, 0) / recent.length;
  const durRecord = records.find(r => r.category === 'longestWorkout');
  const durGap = durRecord ? (durRecord.value - recentAvgDuration) / durRecord.value : 1;

  // Pick the record with the smallest positive gap
  const candidates = [
    { gap: calGap, record: calRecord!, estimatedWorkouts: Math.max(1, Math.ceil(calGap * 10)) },
    { gap: durGap, record: durRecord!, estimatedWorkouts: Math.max(1, Math.ceil(durGap * 10)) },
  ].filter(c => c.gap > 0 && c.record);

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.gap - b.gap);
  const best = candidates[0];
  const confidence = Math.round(Math.max(30, Math.min(95, (1 - best.gap) * 100)));

  return {
    category: best.record.category,
    label: best.record.label,
    icon: best.record.icon,
    currentRecord: best.record.value,
    unit: best.record.unit,
    displayValue: best.record.displayValue,
    confidence,
    estimatedWorkouts: best.estimatedWorkouts,
    reasoning: best.record.category === 'highestCalories'
      ? `Your recent average of ${Math.round(recentAvgCals)} kcal is trending toward your record of ${best.record.displayValue}. Increase intensity by ~${Math.round(calGap * 100)}% to break it.`
      : `Your recent average session duration is ${formatDuration(Math.round(recentAvgDuration))}, closing in on your record of ${best.record.displayValue}.`,
  };
}

// ─────────────────────────────────────────────────────────────────
// Route Handlers
// ─────────────────────────────────────────────────────────────────

/**
 * GET /api/records
 * Returns all 10 computed personal records.
 */
export async function getPersonalRecords(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await fetchSessions(req.firebaseUser!.uid);
    const records = computeRecords(sessions as unknown as IWorkoutSession[]);
    res.json({ success: true, data: records, sessionCount: sessions.length });
  } catch (error: any) {
    console.error('❌ getPersonalRecords error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to compute records' });
  }
}

/**
 * GET /api/records/prediction
 * Returns the AI-predicted next record to break.
 */
export async function getRecordPrediction(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await fetchSessions(req.firebaseUser!.uid);
    const records = computeRecords(sessions as unknown as IWorkoutSession[]);
    const prediction = computePrediction(sessions as unknown as IWorkoutSession[], records);
    res.json({ success: true, data: prediction });
  } catch (error: any) {
    console.error('❌ getRecordPrediction error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to compute prediction' });
  }
}

/**
 * GET /api/records/timeline
 * Returns each session with a flag if any record was set in that session.
 */
export async function getRecordTimeline(req: Request, res: Response): Promise<void> {
  try {
    const sessions = await fetchSessions(req.firebaseUser!.uid);
    // Build running maximum for calories and duration
    let maxCals = 0;
    let maxDur = 0;
    const timeline = (sessions as unknown as IWorkoutSession[]).map(session => {
      const newCalsRecord = session.totalCaloriesBurned > maxCals;
      const newDurRecord = session.totalDurationSeconds > maxDur;
      if (newCalsRecord) maxCals = session.totalCaloriesBurned;
      if (newDurRecord) maxDur = session.totalDurationSeconds;
      return {
        sessionId: session.sessionId,
        date: session.startTime,
        calories: Math.round(session.totalCaloriesBurned),
        duration: session.totalDurationSeconds,
        newRecord: newCalsRecord || newDurRecord,
        recordTypes: [
          ...(newCalsRecord ? ['highestCalories'] : []),
          ...(newDurRecord ? ['longestWorkout'] : []),
        ],
      };
    });
    res.json({ success: true, data: timeline });
  } catch (error: any) {
    console.error('❌ getRecordTimeline error:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to compute timeline' });
  }
}

/**
 * PUT /api/records/:category
 * Marks a record as "just achieved" — used immediately after a workout completes.
 * Currently a lightweight acknowledgement since PRs are always computed from raw data.
 */
export async function acknowledgeNewRecord(req: Request, res: Response): Promise<void> {
  const { category } = req.params;
  res.json({ success: true, message: `Record category '${category}' acknowledged.` });
}
