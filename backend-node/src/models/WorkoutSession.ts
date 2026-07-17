/**
 * Workout session model.
 * Stores aggregated results after a live workout is completed.
 * Raw sensor data lives in the IMU time-series collection and is TTL-pruned.
 */
import { Schema, model, type Document } from 'mongoose';

export interface IExerciseSegment {
  exerciseType: string;
  repsCompleted: number;
  caloriesBurned: number;
  durationSeconds: number;
  avgIntensity: number;
  avgSmoothness: number;
  avgPostureScore: number;
}

export interface IWorkoutSession extends Document {
  userId: Schema.Types.ObjectId;
  sessionId: string;
  exercises: IExerciseSegment[];
  totalCaloriesBurned: number;
  totalDurationSeconds: number;
  startTime: Date;
  endTime: Date;
}

const ExerciseSegmentSchema = new Schema<IExerciseSegment>({
  exerciseType: { type: String, required: true },
  repsCompleted: { type: Number, required: true, min: 0 },
  caloriesBurned: { type: Number, required: true, min: 0 },
  durationSeconds: { type: Number, required: true, min: 0 },
  avgIntensity: { type: Number, required: true, min: 0, max: 100 },
  avgSmoothness: { type: Number, required: true, min: 0, max: 100 },
  avgPostureScore: { type: Number, required: true, min: 0, max: 100 },
}, { _id: false });

const WorkoutSessionSchema = new Schema<IWorkoutSession>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sessionId: { type: String, required: true, unique: true, index: true },
  exercises: [ExerciseSegmentSchema],
  totalCaloriesBurned: { type: Number, required: true, min: 0 },
  totalDurationSeconds: { type: Number, required: true, min: 0 },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
});

WorkoutSessionSchema.index({ userId: 1, startTime: -1 });

export const WorkoutSessionModel = model<IWorkoutSession>('WorkoutSession', WorkoutSessionSchema);
