/**
 * Core type definitions for Burn-Ex AI Backend
 * All shared interfaces used across controllers, services, and socket handlers.
 */

// ─── User & Profile ──────────────────────────────────────────

export type BiologicalSex = 'male' | 'female' | 'prefer-not-to-say';
export type ActivityLevel = 'sedentary' | 'lightly active' | 'moderately active' | 'very active';

export interface UserProfile {
  firebaseId: string;
  email: string;
  displayName: string;
  biologicalSex: BiologicalSex;
  heightCm: number;
  weightKg: number;
  age: number;
  activityLevel: ActivityLevel;
  bodyFatPercent?: number;
  createdAt: Date;
}

export interface WeightEntry {
  userId: string;
  weightKg: number;
  recordedAt: Date;
}

// ─── Workout & Session ──────────────────────────────────────

export interface WorkoutSession {
  userId: string;
  sessionId: string;
  exercises: ExerciseSegment[];
  totalCaloriesBurned: number;
  totalDurationSeconds: number;
  startTime: Date;
  endTime: Date;
}

export interface ExerciseSegment {
  exerciseType: string;
  repsCompleted: number;
  caloriesBurned: number;
  durationSeconds: number;
  avgIntensity: number;
  avgSmoothness: number;
  avgPostureScore: number;
}

// ─── Socket Payloads ────────────────────────────────────────

export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

export interface LaptopStreamPayload {
  sessionId: string;
  clientTime: number;
  landmarks: LandmarkPoint[];
}

export interface PhoneStreamPayload {
  sessionId: string;
  clientTime: number;
  accel: [number, number, number];
  gyro: [number, number, number];
  orientation: [number, number, number];
}

export interface SyncPingPayload {
  clientTime: number;
}

export interface SyncPongPayload {
  clientTime: number;
  serverReceiveTime: number;
  serverSendTime: number;
}

export interface WorkoutMetricsPayload {
  reps: number;
  calories: number;
  exerciseType: string;
  posture: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  intensity: number;
  smoothness: number;
  alert: string | null;
}

// ─── Session Pairing ────────────────────────────────────────

export type DeviceRole = 'laptop' | 'phone';

export interface SessionDevice {
  socketId: string;
  role: DeviceRole;
  clockOffset: number;
  connectedAt: Date;
}

export interface ActiveSession {
  sessionId: string;
  userId: string;
  devices: Map<DeviceRole, SessionDevice>;
  isCalibrated: boolean;
  createdAt: Date;
}

// ─── Meal / Nutrition ───────────────────────────────────────

export interface MealLog {
  userId: string;
  imageUrl: string;
  detectedFoods: string[];
  macronutrients: Macronutrients;
  caloriesEstimate: number;
  loggedAt: Date;
}

export interface Macronutrients {
  proteinsGrams: number;
  carbsGrams: number;
  fatsGrams: number;
}

// ─── MET Lookup ─────────────────────────────────────────────

export interface METEntry {
  exerciseType: string;
  baseMET: number;
}

// ─── API Responses ──────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
