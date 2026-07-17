/**
 * Shared TypeScript interfaces for the Burn-Ex AI frontend.
 * Mirrors the backend type definitions for strict end-to-end typing.
 */

export type BiologicalSex = 'male' | 'female' | 'prefer-not-to-say';
export type ActivityLevel = 'sedentary' | 'lightly active' | 'moderately active' | 'very active';
export type PostureGrade = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
export type DeviceRole = 'laptop' | 'phone';
export type Theme = 'dark' | 'light';

// ─── User & Profile ──────────────────────────────────────────
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
}

export interface Metabolics {
  bmr: number;
  tdee: number;
  dailyCalorieTarget: number;
}

// ─── Session ─────────────────────────────────────────────────
export interface SessionData {
  sessionId: string;
  mobileUrl: string;
  qrCode: string;
}

export interface DeviceStatus {
  device: DeviceRole;
  status: 'connected' | 'disconnected';
}

export interface PairingState {
  sessionId: string | null;
  laptopConnected: boolean;
  phoneConnected: boolean;
  isCalibrated: boolean;
}

// ─── Pose Landmarks ──────────────────────────────────────────
export interface LandmarkPoint {
  x: number;
  y: number;
  z: number;
  visibility: number;
}

// ─── Live Workout Metrics ────────────────────────────────────
export interface WorkoutMetrics {
  reps: number;
  calories: number;
  exerciseType: string;
  posture: PostureGrade;
  intensity: number;
  smoothness: number;
  alert: string | null;
  durationSeconds: number;
}

// ─── Nutrition ───────────────────────────────────────────────
export interface DetectedFood {
  name: string;
  confidence: number;
  proteinsGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  calories: number;
}

// ─── API Response Wrapper ────────────────────────────────────
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
