/**
 * Versioned weight history.
 * Users update weight over time; historical workouts retain the weight that
 * was accurate at the time of that workout for correct calorie calculations.
 */
import { Schema, model, type Document } from 'mongoose';

export interface IWeightHistory extends Document {
  userId: Schema.Types.ObjectId;
  weightKg: number;
  recordedAt: Date;
}

const WeightHistorySchema = new Schema<IWeightHistory>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  weightKg: { type: Number, required: true, min: 20, max: 400 },
  recordedAt: { type: Date, default: Date.now },
});

// Compound index for fast historical lookups
WeightHistorySchema.index({ userId: 1, recordedAt: -1 });

export const WeightHistoryModel = model<IWeightHistory>('WeightHistory', WeightHistorySchema);
