/**
 * Meal log model.
 * Stores results from the on-demand YOLO food recognition pipeline.
 * This is NOT part of the real-time workout loop — it's triggered by explicit photo upload.
 */
import { Schema, model, type Document } from 'mongoose';

export interface IMealLog extends Document {
  userId: Schema.Types.ObjectId;
  imageUrl: string;
  detectedFoods: string[];
  proteinsGrams: number;
  carbsGrams: number;
  fatsGrams: number;
  caloriesEstimate: number;
  loggedAt: Date;
}

const MealLogSchema = new Schema<IMealLog>({
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  imageUrl: { type: String, required: true },
  detectedFoods: [{ type: String }],
  proteinsGrams: { type: Number, required: true, min: 0 },
  carbsGrams: { type: Number, required: true, min: 0 },
  fatsGrams: { type: Number, required: true, min: 0 },
  caloriesEstimate: { type: Number, required: true, min: 0 },
  loggedAt: { type: Date, default: Date.now },
});

MealLogSchema.index({ userId: 1, loggedAt: -1 });

export const MealLogModel = model<IMealLog>('MealLog', MealLogSchema);
