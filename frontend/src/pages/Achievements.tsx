/**
 * 🏆 Personal Records — Achievements Page
 *
 * Powered entirely by real workout history from GET /api/workouts/history.
 * No mock data, no hardcoded values.
 *
 * Features:
 *  - 10 personal record categories computed live from session data
 *  - AI "Record to Beat" prediction card
 *  - Confetti celebration on new records
 *  - Filter, search, and sort controls
 *  - Empty state with CTA
 *  - Framer Motion animations + animated counters
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Trophy,
  Search,
  Filter,
  TrendingUp,
  Flame,
  Zap,
  Target,
  Timer,
  Calendar,
  Clock,
  Award,
  Heart,
  ChevronUp,
  Play,
  Sparkles,
  Star,
  ArrowUpRight,
  RefreshCw,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import styles from './Achievements.module.css';

// ─── Types ────────────────────────────────────────────────────────
interface WorkoutSession {
  _id: string;
  sessionId: string;
  exercises: {
    exerciseType: string;
    repsCompleted: number;
    caloriesBurned: number;
    durationSeconds: number;
    avgIntensity: number;
    avgSmoothness: number;
    avgPostureScore: number;
  }[];
  totalCaloriesBurned: number;
  totalDurationSeconds: number;
  startTime: string;
  endTime: string;
}

interface PersonalRecord {
  category: string;
  icon: string;
  label: string;
  color: string;
  gradient: string;
  value: number;
  displayValue: string;
  unit: string;
  detail: Record<string, string | number>;
  achievedAt: string | null;
  previousValue: number | null;
  previousDisplay: string | null;
  improvementPercent: number | null;
  isNewRecord: boolean;
  filterTag: string;
}

interface AIPrediction {
  category: string;
  label: string;
  icon: string;
  currentRecord: string;
  confidence: number;
  estimatedWorkouts: number;
  reasoning: string;
  color: string;
}

// ─── Helpers ──────────────────────────────────────────────────────
function formatDuration(seconds: number): string {
  if (seconds <= 0) return '0s';
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return s > 0 ? `${m}m ${s}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function improvement(current: number, previous: number | null): number | null {
  if (previous === null || previous === 0) return null;
  return Math.round(((current - previous) / Math.abs(previous)) * 100 * 10) / 10;
}

// ─── Core computation from raw sessions ───────────────────────────
function computePersonalRecords(sessions: WorkoutSession[]): PersonalRecord[] {
  if (sessions.length === 0) return [];

  // Sort chronologically for streak/timeline
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // ── 1. Longest Workout ────────────────────────────────────────
  let best1 = sorted[0], prev1: WorkoutSession | null = null;
  for (const s of sorted.slice(1)) {
    if (s.totalDurationSeconds > best1.totalDurationSeconds) { prev1 = best1; best1 = s; }
  }

  // ── 2. Highest Calories ───────────────────────────────────────
  let best2 = sorted[0], prev2: WorkoutSession | null = null;
  for (const s of sorted.slice(1)) {
    if (s.totalCaloriesBurned > best2.totalCaloriesBurned) { prev2 = best2; best2 = s; }
  }

  // ── 3. Maximum Reps ───────────────────────────────────────────
  let maxReps = 0, prevReps = 0, repsExercise = '', repsDate: string | null = null;
  for (const s of sorted) {
    for (const ex of s.exercises) {
      if (ex.repsCompleted > maxReps) { prevReps = maxReps; maxReps = ex.repsCompleted; repsExercise = ex.exerciseType; repsDate = s.startTime; }
    }
  }

  // ── 4. Longest Streak ─────────────────────────────────────────
  const dayKeys = new Set<string>();
  for (const s of sorted) {
    const d = new Date(s.startTime);
    dayKeys.add(`${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`);
  }
  const days = Array.from(dayKeys).sort();
  let longestStreak = 1, curStreak = 1, lStart = days[0], lEnd = days[0], csStart = days[0], csEnd = days[0];
  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const cur = new Date(days[i]);
    const diff = (cur.getTime() - prev.getTime()) / 86400000;
    if (diff === 1) { curStreak++; csEnd = days[i]; }
    else { if (curStreak > longestStreak) { longestStreak = curStreak; lStart = csStart; lEnd = csEnd; } curStreak = 1; csStart = days[i]; csEnd = days[i]; }
  }
  if (curStreak > longestStreak) { longestStreak = curStreak; lStart = csStart; lEnd = csEnd; }
  // Current streak
  let currentStreak = 0;
  const today = new Date();
  for (let i = 0; i <= 365; i++) {
    const d = new Date(today); d.setDate(today.getDate() - i);
    const k = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    if (dayKeys.has(k)) currentStreak++; else break;
  }

  // ── 5. Highest AI Accuracy ─────────────────────────────────────
  let maxAcc = 0, prevAcc = 0, accSession: WorkoutSession | null = null, accExercise = '';
  for (const s of sorted) {
    for (const ex of s.exercises) {
      const score = (ex.avgPostureScore + ex.avgSmoothness) / 2;
      if (score > maxAcc) { prevAcc = maxAcc; maxAcc = score; accSession = s; accExercise = ex.exerciseType; }
    }
  }

  // ── 6. Fastest Workout ────────────────────────────────────────
  const meaningful = sorted.filter(s => s.totalCaloriesBurned > 30);
  let fast1: WorkoutSession | null = meaningful[0] || null, prevFast: WorkoutSession | null = null;
  for (const s of meaningful.slice(1)) {
    if (s.totalDurationSeconds < (fast1?.totalDurationSeconds ?? Infinity)) { prevFast = fast1; fast1 = s; }
  }

  // ── 7. Most Active Day ────────────────────────────────────────
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayCounts: Record<string, { workouts: number; secs: number; cals: number }> = {};
  for (const s of sorted) {
    const d = dayNames[new Date(s.startTime).getDay()];
    if (!dayCounts[d]) dayCounts[d] = { workouts: 0, secs: 0, cals: 0 };
    dayCounts[d].workouts++;
    dayCounts[d].secs += s.totalDurationSeconds;
    dayCounts[d].cals += s.totalCaloriesBurned;
  }
  let mostDay = 'Monday', mostCount = 0;
  for (const [d, v] of Object.entries(dayCounts)) { if (v.workouts > mostCount) { mostCount = v.workouts; mostDay = d; } }
  const dayStats = dayCounts[mostDay] || { workouts: 0, secs: 0, cals: 0 };

  // ── 8. Total Workout Time ─────────────────────────────────────
  const totalSecs = sorted.reduce((s, w) => s + w.totalDurationSeconds, 0);
  const totalHours = Math.round((totalSecs / 3600) * 10) / 10;
  const avgSecs = sorted.length ? Math.round(totalSecs / sorted.length) : 0;

  // ── 9. Most Performed Exercise ────────────────────────────────
  const exCounts: Record<string, { reps: number; sessions: number }> = {};
  for (const s of sorted) {
    const seen = new Set<string>();
    for (const ex of s.exercises) {
      exCounts[ex.exerciseType] = exCounts[ex.exerciseType] || { reps: 0, sessions: 0 };
      exCounts[ex.exerciseType].reps += ex.repsCompleted;
      if (!seen.has(ex.exerciseType)) { exCounts[ex.exerciseType].sessions++; seen.add(ex.exerciseType); }
    }
  }
  let topEx = '', topReps = 0, topSessions = 0;
  for (const [name, v] of Object.entries(exCounts)) { if (v.reps > topReps) { topReps = v.reps; topEx = name; topSessions = v.sessions; } }
  const exPct = sorted.length ? Math.round((topSessions / sorted.length) * 100) : 0;

  // ── 10. Highest Intensity ─────────────────────────────────────
  let maxInt = 0, prevInt = 0, intSession: WorkoutSession | null = null, intExercise = '', intMovement = 0;
  for (const s of sorted) {
    for (const ex of s.exercises) {
      if (ex.avgIntensity > maxInt) { prevInt = maxInt; maxInt = ex.avgIntensity; intSession = s; intExercise = ex.exerciseType; intMovement = ex.avgSmoothness; }
    }
  }

  return [
    {
      category: 'longestWorkout', icon: '⏱', label: 'Longest Workout',
      color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
      value: best1.totalDurationSeconds, displayValue: formatDuration(best1.totalDurationSeconds), unit: 'duration',
      detail: { 'Date Achieved': fmtDate(best1.startTime), 'Previous Record': prev1 ? formatDuration(prev1.totalDurationSeconds) : '—', 'Sessions Logged': sorted.length },
      achievedAt: best1.startTime,
      previousValue: prev1?.totalDurationSeconds ?? null, previousDisplay: prev1 ? formatDuration(prev1.totalDurationSeconds) : null,
      improvementPercent: improvement(best1.totalDurationSeconds, prev1?.totalDurationSeconds ?? null),
      isNewRecord: false, filterTag: 'time',
    },
    {
      category: 'highestCalories', icon: '🔥', label: 'Highest Calories Burned',
      color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
      value: Math.round(best2.totalCaloriesBurned), displayValue: `${Math.round(best2.totalCaloriesBurned)}`, unit: 'kcal',
      detail: { 'Workout Type': best2.exercises[0]?.exerciseType?.replace(/_/g, ' ') || 'Mixed', 'Date Achieved': fmtDate(best2.startTime), 'Previous Record': prev2 ? `${Math.round(prev2.totalCaloriesBurned)} kcal` : '—' },
      achievedAt: best2.startTime,
      previousValue: prev2 ? Math.round(prev2.totalCaloriesBurned) : null, previousDisplay: prev2 ? `${Math.round(prev2.totalCaloriesBurned)} kcal` : null,
      improvementPercent: improvement(best2.totalCaloriesBurned, prev2?.totalCaloriesBurned ?? null),
      isNewRecord: false, filterTag: 'calories',
    },
    {
      category: 'maxReps', icon: '💪', label: 'Maximum Repetitions',
      color: '#22C55E', gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
      value: maxReps, displayValue: `${maxReps}`, unit: 'reps',
      detail: { 'Exercise': repsExercise.replace(/_/g, ' ') || '—', 'Date Achieved': fmtDate(repsDate), 'Previous Record': prevReps > 0 ? `${prevReps} reps` : '—' },
      achievedAt: repsDate,
      previousValue: prevReps || null, previousDisplay: prevReps > 0 ? `${prevReps} reps` : null,
      improvementPercent: improvement(maxReps, prevReps || null),
      isNewRecord: false, filterTag: 'exercise',
    },
    {
      category: 'longestStreak', icon: '🏃', label: 'Longest Workout Streak',
      color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)',
      value: longestStreak, displayValue: `${longestStreak}`, unit: 'days',
      detail: { 'Start Date': new Date(lStart).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 'End Date': new Date(lEnd).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), 'Current Streak': `${currentStreak} days` },
      achievedAt: lEnd,
      previousValue: null, previousDisplay: null, improvementPercent: null,
      isNewRecord: false, filterTag: 'streak',
    },
    {
      category: 'highestAIAccuracy', icon: '🎯', label: 'Highest AI Accuracy Score',
      color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)',
      value: Math.round(maxAcc * 10) / 10, displayValue: `${Math.round(maxAcc * 10) / 10}`, unit: '%',
      detail: { 'Workout Type': accExercise.replace(/_/g, ' ') || '—', 'AI Confidence': accSession ? `${Math.round((accSession.exercises[0]?.avgSmoothness || 0))}%` : '—', 'Date Achieved': fmtDate(accSession?.startTime ?? null) },
      achievedAt: accSession?.startTime ?? null,
      previousValue: prevAcc > 0 ? Math.round(prevAcc * 10) / 10 : null, previousDisplay: prevAcc > 0 ? `${Math.round(prevAcc * 10) / 10}%` : null,
      improvementPercent: improvement(maxAcc, prevAcc || null),
      isNewRecord: false, filterTag: 'ai',
    },
    {
      category: 'fastestWorkout', icon: '⚡', label: 'Fastest Workout Completion',
      color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      value: fast1?.totalDurationSeconds ?? 0, displayValue: fast1 ? formatDuration(fast1.totalDurationSeconds) : '—', unit: 'duration',
      detail: { 'Workout Name': fast1?.exercises[0]?.exerciseType?.replace(/_/g, ' ') ?? '—', 'Calories Burned': fast1 ? `${Math.round(fast1.totalCaloriesBurned)} kcal` : '—', 'Date Achieved': fmtDate(fast1?.startTime ?? null), 'Avg Speed': fast1 ? `${(fast1.totalCaloriesBurned / Math.max(1, fast1.totalDurationSeconds / 60)).toFixed(1)} kcal/min` : '—' },
      achievedAt: fast1?.startTime ?? null,
      previousValue: prevFast?.totalDurationSeconds ?? null, previousDisplay: prevFast ? formatDuration(prevFast.totalDurationSeconds) : null,
      improvementPercent: fast1 && prevFast ? improvement(prevFast.totalDurationSeconds, fast1.totalDurationSeconds) : null,
      isNewRecord: false, filterTag: 'time',
    },
    {
      category: 'mostActiveDay', icon: '📅', label: 'Most Active Day',
      color: '#F97316', gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)',
      value: mostCount, displayValue: mostDay, unit: `${mostCount} workouts`,
      detail: { 'Day': mostDay, 'Total Workouts': mostCount, 'Total Hours': formatDuration(dayStats.secs), 'Total Calories': `${Math.round(dayStats.cals)} kcal` },
      achievedAt: null,
      previousValue: null, previousDisplay: null, improvementPercent: null,
      isNewRecord: false, filterTag: 'workout',
    },
    {
      category: 'totalWorkoutTime', icon: '⌛', label: 'Total Workout Time',
      color: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
      value: totalHours, displayValue: `${totalHours}`, unit: 'hours total',
      detail: { 'Total Sessions': sorted.length, 'Avg Duration': formatDuration(avgSecs), 'Total Minutes': Math.round(totalSecs / 60) },
      achievedAt: null,
      previousValue: null, previousDisplay: null, improvementPercent: null,
      isNewRecord: false, filterTag: 'time',
    },
    {
      category: 'mostPerformedExercise', icon: '🏅', label: 'Most Performed Exercise',
      color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)',
      value: topReps, displayValue: topEx.replace(/_/g, ' ') || '—', unit: `${topReps} total reps`,
      detail: { 'Exercise': topEx.replace(/_/g, ' ') || '—', 'Total Reps': topReps, 'Total Sessions': topSessions, '% of Workouts': `${exPct}%` },
      achievedAt: null,
      previousValue: null, previousDisplay: null, improvementPercent: null,
      isNewRecord: false, filterTag: 'exercise',
    },
    {
      category: 'highestIntensity', icon: '❤️', label: 'Highest Workout Intensity',
      color: '#F43F5E', gradient: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)',
      value: Math.round(maxInt * 10) / 10, displayValue: `${Math.round(maxInt * 10) / 10}`, unit: '%',
      detail: { 'Workout Name': intExercise.replace(/_/g, ' ') || '—', 'AI Movement Score': `${Math.round(intMovement)}%`, 'Date Achieved': fmtDate(intSession?.startTime ?? null) },
      achievedAt: intSession?.startTime ?? null,
      previousValue: prevInt > 0 ? Math.round(prevInt * 10) / 10 : null, previousDisplay: prevInt > 0 ? `${Math.round(prevInt * 10) / 10}%` : null,
      improvementPercent: improvement(maxInt, prevInt || null),
      isNewRecord: false, filterTag: 'ai',
    },
  ];
}

function computeAIPrediction(sessions: WorkoutSession[], records: PersonalRecord[]): AIPrediction | null {
  if (sessions.length < 2) return null;
  const recent = sessions.slice(-5);
  const recentAvgCals = recent.reduce((s, w) => s + w.totalCaloriesBurned, 0) / recent.length;
  const calRec = records.find(r => r.category === 'highestCalories');
  const calGap = calRec && calRec.value > 0 ? (calRec.value - recentAvgCals) / calRec.value : 1;
  const recentAvgDur = recent.reduce((s, w) => s + w.totalDurationSeconds, 0) / recent.length;
  const durRec = records.find(r => r.category === 'longestWorkout');
  const durGap = durRec && durRec.value > 0 ? (durRec.value - recentAvgDur) / durRec.value : 1;

  const candidates = [
    { gap: calGap, rec: calRec!, color: '#F59E0B' },
    { gap: durGap, rec: durRec!, color: '#3B82F6' },
  ].filter(c => c.gap > 0 && c.gap < 0.5 && c.rec);

  if (!candidates.length) {
    // Any closest
    candidates.push({ gap: Math.min(calGap, durGap), rec: (calGap < durGap ? calRec : durRec)!, color: '#22C55E' });
  }
  candidates.sort((a, b) => a.gap - b.gap);
  const best = candidates[0];
  if (!best?.rec) return null;

  const confidence = Math.round(Math.max(35, Math.min(94, (1 - Math.abs(best.gap)) * 100)));
  const estimatedWorkouts = Math.max(1, Math.ceil(Math.abs(best.gap) * 8));

  return {
    category: best.rec.category,
    label: best.rec.label,
    icon: best.rec.icon,
    currentRecord: best.rec.displayValue + (best.rec.unit && !best.rec.displayValue.includes(best.rec.unit) ? ` ${best.rec.unit}` : ''),
    confidence,
    estimatedWorkouts,
    reasoning: best.rec.category === 'highestCalories'
      ? `Recent average is ${Math.round(recentAvgCals)} kcal — just ${Math.round(best.gap * best.rec.value)} kcal away from your record. Push intensity by ~${Math.round(best.gap * 100)}% to break it.`
      : `Recent avg session is ${formatDuration(Math.round(recentAvgDur))} — ${formatDuration(Math.round(best.gap * best.rec.value))} away from your record. Add one longer session this week.`,
    color: best.color,
  };
}

// ─── Animated Counter ─────────────────────────────────────────────
function AnimatedNumber({ target, duration = 1200 }: { target: number; duration?: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setDisplay(target); clearInterval(timer); }
      else setDisplay(Math.round(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return <>{display}</>;
}

// ─── Confetti ─────────────────────────────────────────────────────
function Confetti({ active }: { active: boolean }) {
  const colors = ['#22C55E', '#F59E0B', '#3B82F6', '#A855F7', '#EF4444', '#EC4899', '#06B6D4'];
  if (!active) return null;
  return (
    <div className={styles.confettiContainer}>
      {Array.from({ length: 60 }).map((_, i) => (
        <div
          key={i}
          className={styles.confettiPiece}
          style={{
            left: `${Math.random() * 100}%`,
            background: colors[Math.floor(Math.random() * colors.length)],
            animationDelay: `${Math.random() * 0.8}s`,
            animationDuration: `${1.2 + Math.random() * 1.2}s`,
            width: `${6 + Math.random() * 8}px`,
            height: `${6 + Math.random() * 8}px`,
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          }}
        />
      ))}
    </div>
  );
}

// ─── Filter tags ──────────────────────────────────────────────────
const FILTER_TABS = [
  { id: 'all', label: 'All Records', icon: <Trophy size={13} /> },
  { id: 'workout', label: 'Workout', icon: <Target size={13} /> },
  { id: 'calories', label: 'Calories', icon: <Flame size={13} /> },
  { id: 'ai', label: 'AI Performance', icon: <Sparkles size={13} /> },
  { id: 'streak', label: 'Streak', icon: <Zap size={13} /> },
  { id: 'time', label: 'Time', icon: <Clock size={13} /> },
  { id: 'exercise', label: 'Exercise', icon: <Award size={13} /> },
];

const SORT_OPTIONS = [
  { id: 'default', label: 'Default' },
  { id: 'newest', label: 'Newest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'highest', label: 'Highest Value' },
];

// ─── Icon map for categories ──────────────────────────────────────
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  longestWorkout: <Timer size={22} />,
  highestCalories: <Flame size={22} />,
  maxReps: <TrendingUp size={22} />,
  longestStreak: <Zap size={22} />,
  highestAIAccuracy: <Target size={22} />,
  fastestWorkout: <ArrowUpRight size={22} />,
  mostActiveDay: <Calendar size={22} />,
  totalWorkoutTime: <Clock size={22} />,
  mostPerformedExercise: <Star size={22} />,
  highestIntensity: <Heart size={22} />,
};
// ─── Category Meta (color, gradient, filterTag) ──────────────────
// These are purely presentation values not stored in the DB.
const CATEGORY_META: Record<string, { color: string; gradient: string; filterTag: string }> = {
  longestWorkout:      { color: '#3B82F6', gradient: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)', filterTag: 'time' },
  highestCalories:     { color: '#F59E0B', gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', filterTag: 'calories' },
  maxReps:             { color: '#22C55E', gradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)', filterTag: 'exercise' },
  longestStreak:       { color: '#A855F7', gradient: 'linear-gradient(135deg, #A855F7 0%, #7C3AED 100%)', filterTag: 'streak' },
  highestAIAccuracy:   { color: '#06B6D4', gradient: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)', filterTag: 'ai' },
  fastestWorkout:      { color: '#EF4444', gradient: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', filterTag: 'time' },
  mostActiveDay:       { color: '#F97316', gradient: 'linear-gradient(135deg, #F97316 0%, #EA580C 100%)', filterTag: 'workout' },
  totalWorkoutTime:    { color: '#10B981', gradient: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', filterTag: 'time' },
  mostPerformedExercise: { color: '#EC4899', gradient: 'linear-gradient(135deg, #EC4899 0%, #DB2777 100%)', filterTag: 'exercise' },
  highestIntensity:    { color: '#F43F5E', gradient: 'linear-gradient(135deg, #F43F5E 0%, #E11D48 100%)', filterTag: 'ai' },
};

function getCategoryMeta(category: string) {
  return CATEGORY_META[category] ?? { color: '#6B7280', gradient: 'linear-gradient(135deg, #6B7280 0%, #4B5563 100%)', filterTag: 'workout' };
}

function formatPreviousDisplay(category: string, prev: number): string {
  switch (category) {
    case 'longestWorkout': case 'fastestWorkout': return formatDuration(prev);
    case 'highestCalories': return `${Math.round(prev)} kcal`;
    case 'maxReps': return `${Math.round(prev)} reps`;
    case 'longestStreak': return `${Math.round(prev)} days`;
    case 'highestAIAccuracy': case 'highestIntensity': return `${Math.round(prev * 10) / 10}%`;
    case 'totalWorkoutTime': return `${Math.round(prev * 10) / 10}h`;
    default: return String(prev);
  }
}

export function AchievementsPage() {
  const { token } = useAuth();
  const navigate = useNavigate();

  // Backend-computed personal records fetched from /api/records
  const [records, setRecords] = useState<PersonalRecord[]>([]);
  // Session count returned by the API (so we don't need sessions array)
  const [sessionCount, setSessionCount] = useState(0);
  // AI prediction from /api/records/prediction
  const [prediction, setPrediction] = useState<AIPrediction | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorKind, setErrorKind] = useState<'offline' | 'auth' | 'server' | null>(null);

  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('default');
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [confettiActive, setConfettiActive] = useState(false);
  const [celebrationRecord, setCelebrationRecord] = useState<PersonalRecord | null>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  /**
   * Primary data fetch.
   *
   * Strategy (senior-dev approach — always show data):
   * 1. Call /api/records (backend-computed from MongoDB).
   * 2. If that returns empty (offline, no user, or zero sessions),
   *    fall back to /api/workouts/history and compute client-side.
   *    This ensures in-memory sessions are always visible.
   */
  const fetchHistory = useCallback(async () => {
    if (!token) { setLoading(false); return; }
    setLoading(true);
    setErrorKind(null);

    try {
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch personal records and prediction in parallel
      const [recordsRes, predRes] = await Promise.all([
        fetch('http://localhost:8080/api/records', { headers }),
        fetch('http://localhost:8080/api/records/prediction', { headers }),
      ]);

      // Auth error — don't fall back, just report
      if (recordsRes.status === 401 || recordsRes.status === 403) {
        setErrorKind('auth');
        setRecords([]);
        return;
      }

      if (recordsRes.ok) {
        const recordsData = await recordsRes.json();
        const fetchedRecords: PersonalRecord[] = Array.isArray(recordsData.data)
          ? recordsData.data.map((r: any) => ({
              ...r,
              ...getCategoryMeta(r.category),
              previousDisplay: r.previousValue != null
                ? formatPreviousDisplay(r.category, r.previousValue)
                : null,
            }))
          : [];

        // If the backend returned populated records, use them
        if (fetchedRecords.length > 0) {
          setRecords(fetchedRecords);
          setSessionCount(recordsData.sessionCount ?? fetchedRecords.length);

          if (predRes.ok) {
            const predData = await predRes.json();
            setPrediction(predData.data ?? null);
          }
          return; // ✅ Done — primary path succeeded
        }
      }

      // Backend returned empty or failed → fall back to /api/workouts/history
      // This covers: MongoDB offline (in-memory sessions), new user with 0 DB records, etc.
      await fetchHistoryFallback();
    } catch {
      // Network failure — fall back to client-side
      await fetchHistoryFallback();
    } finally {
      setLoading(false);
    }
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  /**
   * Fallback: fetch raw workout history and compute records client-side.
   * Used when the /api/records endpoint is unavailable.
   */
  const fetchHistoryFallback = async () => {
    if (!token) return;
    try {
      const res = await fetch('http://localhost:8080/api/workouts/history', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setErrorKind('server'); return; }
      const data = await res.json();
      const sessions: WorkoutSession[] = Array.isArray(data.data) ? data.data : [];
      const computed = computePersonalRecords(sessions);
      setRecords(computed);
      setSessionCount(sessions.length);
      setPrediction(computeAIPrediction(sessions, computed));
    } catch {
      setErrorKind('offline');
      setRecords([]);
    }
  };

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Close sort menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Filter + search + sort
  const filteredRecords = records
    .filter(r => activeFilter === 'all' || r.filterTag === activeFilter)
    .filter(r =>
      searchQuery === '' ||
      r.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.displayValue.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (sortBy === 'newest') return new Date(b.achievedAt || 0).getTime() - new Date(a.achievedAt || 0).getTime();
      if (sortBy === 'oldest') return new Date(a.achievedAt || 0).getTime() - new Date(b.achievedAt || 0).getTime();
      if (sortBy === 'highest') return b.value - a.value;
      return 0;
    });

  const triggerCelebration = (record: PersonalRecord) => {
    setCelebrationRecord(record);
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);
    setTimeout(() => setCelebrationRecord(null), 4000);
  };


  // ─── Loading ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={styles.page}>
        <div className={styles.loadingState}>
          <motion.div
            className={styles.loadingOrb}
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
          <p className={styles.loadingText}>Analyzing your fitness journey...</p>
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────
  if (errorKind) {
    const errorTitle = errorKind === 'offline' ? 'Backend Unreachable' : 'Could not load records';
    const errorDescription = errorKind === 'offline' 
      ? 'The gateway is offline or CORS blocked. Please check your backend-node server console.'
      : errorKind === 'auth'
      ? 'Unauthorized session. Try logging in again.'
      : 'A server error occurred while retrieving workouts.';

    return (
      <div className={styles.page}>
        <div className={styles.errorState}>
          <span className={styles.errorIcon}>⚠️</span>
          <h3>{errorTitle}</h3>
          <p>{errorDescription}</p>
          <button className="btn btn-primary" onClick={fetchHistory}>
            <RefreshCw size={14} /> Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty State ─────────────────────────────────────────────────
  if (records.length === 0 && sessionCount === 0) {
    return (
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <div>
            <h1 className={styles.pageTitle}>🏆 Personal Records</h1>
            <p className={styles.pageSubtitle}>Your greatest fitness achievements powered by AI.</p>
          </div>
        </div>
        <motion.div
          className={styles.emptyState}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className={styles.emptyOrb}>🏆</div>
          <h2 className={styles.emptyTitle}>No Records Yet</h2>
          <p className={styles.emptySubtitle}>
            Complete your first workout to start building your Personal Records.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/workout')}>
            <Play size={15} /> Start Workout
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      {/* Confetti */}
      <Confetti active={confettiActive} />

      {/* Celebration Popup */}
      <AnimatePresence>
        {celebrationRecord && (
          <motion.div
            className={styles.celebrationPopup}
            initial={{ opacity: 0, scale: 0.8, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 40 }}
          >
            <button className={styles.popupClose} onClick={() => setCelebrationRecord(null)}><X size={14} /></button>
            <div className={styles.popupTrophy}>🏆</div>
            <div className={styles.popupBadge}>New Personal Record!</div>
            <div className={styles.popupTitle}>{celebrationRecord.label}</div>
            <div className={styles.popupValue} style={{ color: celebrationRecord.color }}>
              {celebrationRecord.displayValue} {celebrationRecord.unit}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Page Header ─────────────────────────────────────────── */}
      <div className={styles.pageHeader}>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }}>
          <h1 className={styles.pageTitle}>🏆 Personal Records</h1>
          <p className={styles.pageSubtitle}>Your greatest fitness achievements powered by AI.</p>
        </motion.div>
        <motion.div
          className={styles.headerMeta}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className={styles.sessionBadge}>
            <Trophy size={14} />
            <span>{sessionCount} Session{sessionCount !== 1 ? 's' : ''} Analyzed</span>
          </div>
          <button className={styles.refreshBtn} onClick={fetchHistory} title="Refresh">
            <RefreshCw size={14} />
          </button>
        </motion.div>
      </div>

      {/* ─── AI Prediction Card ───────────────────────────────────── */}
      {prediction && (
        <motion.div
          className={styles.predictionCard}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          style={{ '--pred-color': prediction.color } as React.CSSProperties}
        >
          <div className={styles.predictionGlow} style={{ background: prediction.color }} />
          <div className={styles.predictionContent}>
            <div className={styles.predictionLeft}>
              <div className={styles.predictionBadge}>
                <Sparkles size={12} />
                🎯 Record to Beat — AI Prediction
              </div>
              <h2 className={styles.predictionTitle}>{prediction.icon} {prediction.label}</h2>
              <p className={styles.predictionReasoning}>{prediction.reasoning}</p>
              <div className={styles.predictionStats}>
                <div className={styles.predStat}>
                  <span className={styles.predStatLabel}>Current Record</span>
                  <span className={styles.predStatValue} style={{ color: prediction.color }}>{prediction.currentRecord}</span>
                </div>
                <div className={styles.predStat}>
                  <span className={styles.predStatLabel}>Est. Workouts Needed</span>
                  <span className={styles.predStatValue}>{prediction.estimatedWorkouts}</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={() => navigate('/workout')} style={{ marginTop: '1rem', maxWidth: '180px' }}>
                <Play size={14} /> Start Workout
              </button>
            </div>
            <div className={styles.predictionRight}>
              <div className={styles.confidenceRing} style={{ '--conf-color': prediction.color } as React.CSSProperties}>
                <svg viewBox="0 0 80 80" className={styles.confRingSvg}>
                  <circle cx="40" cy="40" r="32" className={styles.confRingBg} />
                  <circle
                    cx="40" cy="40" r="32"
                    className={styles.confRingFill}
                    style={{
                      stroke: prediction.color,
                      strokeDasharray: `${2 * Math.PI * 32}`,
                      strokeDashoffset: `${2 * Math.PI * 32 * (1 - prediction.confidence / 100)}`,
                    }}
                  />
                </svg>
                <div className={styles.confRingInner}>
                  <span className={styles.confPercent} style={{ color: prediction.color }}>
                    <AnimatedNumber target={prediction.confidence} />%
                  </span>
                  <span className={styles.confLabel}>AI Confidence</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Controls Row ────────────────────────────────────────── */}
      <motion.div
        className={styles.controlsRow}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.25 }}
      >
        {/* Filter tabs */}
        <div className={styles.filterTabs}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.id}
              className={`${styles.filterTab} ${activeFilter === tab.id ? styles.filterTabActive : ''}`}
              onClick={() => setActiveFilter(tab.id)}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        <div className={styles.rightControls}>
          {/* Search */}
          <div className={styles.searchWrapper}>
            <Search size={14} className={styles.searchIcon} />
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search records..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button className={styles.searchClear} onClick={() => setSearchQuery('')}><X size={12} /></button>
            )}
          </div>

          {/* Sort */}
          <div className={styles.sortWrapper} ref={sortRef}>
            <button className={styles.sortBtn} onClick={() => setShowSortMenu(v => !v)}>
              <Filter size={13} />
              {SORT_OPTIONS.find(s => s.id === sortBy)?.label}
              <ChevronUp size={12} style={{ transform: showSortMenu ? 'rotate(0deg)' : 'rotate(180deg)', transition: '200ms' }} />
            </button>
            <AnimatePresence>
              {showSortMenu && (
                <motion.div
                  className={styles.sortMenu}
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                >
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      className={`${styles.sortOption} ${sortBy === opt.id ? styles.sortOptionActive : ''}`}
                      onClick={() => { setSortBy(opt.id); setShowSortMenu(false); }}
                    >
                      {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* ─── Record Cards Grid ────────────────────────────────────── */}
      <div className={styles.recordsGrid}>
        <AnimatePresence mode="popLayout">
          {filteredRecords.length === 0 ? (
            <motion.div
              className={styles.noResultsState}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <span>🔍</span>
              <p>No records match your search or filter.</p>
            </motion.div>
          ) : (
            filteredRecords.map((record, index) => (
              <motion.div
                key={record.category}
                className={`${styles.recordCard} ${record.isNewRecord ? styles.newRecordCard : ''}`}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.35, delay: index * 0.05 }}
                layout
                style={{ '--rec-color': record.color } as React.CSSProperties}
                onClick={() => record.isNewRecord && triggerCelebration(record)}
              >
                {/* New Record badge */}
                {record.isNewRecord && (
                  <div className={styles.newBadge}>🏆 New Record</div>
                )}

                {/* Card glow accent */}
                <div className={styles.cardGlow} style={{ background: record.gradient }} />

                {/* Header */}
                <div className={styles.cardHeader}>
                  <div className={styles.cardIconWrapper} style={{ background: `${record.color}20`, border: `1px solid ${record.color}40` }}>
                    <span className={styles.cardEmoji}>{record.icon}</span>
                    <span className={styles.cardIconLucide} style={{ color: record.color }}>
                      {CATEGORY_ICONS[record.category]}
                    </span>
                  </div>
                  <div className={styles.cardMeta}>
                    <span className={styles.cardLabel}>{record.label}</span>
                    {record.achievedAt && (
                      <span className={styles.cardDate}>{fmtDate(record.achievedAt)}</span>
                    )}
                  </div>
                </div>

                {/* Value */}
                <div className={styles.cardValueBlock}>
                  <div className={styles.cardValue} style={{ color: record.color }}>
                    {typeof record.value === 'number' && record.value > 0 && !isNaN(record.value) ? (
                      <>
                        <AnimatedNumber target={record.value} />
                      </>
                    ) : (
                      record.displayValue
                    )}
                  </div>
                  <div className={styles.cardUnit}>{record.unit}</div>
                </div>

                {/* Improvement badge */}
                {record.improvementPercent !== null && record.improvementPercent > 0 && (
                  <div className={styles.improvementBadge} style={{ color: record.color, background: `${record.color}18` }}>
                    <TrendingUp size={11} />
                    +{record.improvementPercent}% improvement
                  </div>
                )}

                {/* Divider */}
                <div className={styles.cardDivider} style={{ background: `${record.color}30` }} />

                {/* Detail rows */}
                <div className={styles.cardDetails}>
                  {Object.entries(record.detail).map(([key, val]) => (
                    <div key={key} className={styles.detailRow}>
                      <span className={styles.detailKey}>{key}</span>
                      <span className={styles.detailVal}>{val}</span>
                    </div>
                  ))}
                </div>

                {/* Previous record comparison */}
                {record.previousDisplay && (
                  <div className={styles.prevRecord}>
                    <span className={styles.prevLabel}>Previous</span>
                    <span className={styles.prevVal}>{record.previousDisplay}</span>
                  </div>
                )}

                {/* Hover shine effect */}
                <div className={styles.cardShine} />
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
