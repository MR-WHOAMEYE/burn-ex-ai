/**
 * Shared In-Memory Session Store
 *
 * A process-level singleton that both workoutController and
 * personalRecordsController use when MongoDB is offline.
 *
 * Because Node.js module caching ensures each import returns the same
 * reference, any session pushed here by logWorkout() is immediately
 * visible when getPersonalRecords() reads from it.
 */

export interface InMemorySession {
  _id: string;
  userId: string;
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
  startTime: Date;
  endTime: Date;
}

// The single shared array — all controllers import this reference.
export const inMemorySessions: InMemorySession[] = [];
