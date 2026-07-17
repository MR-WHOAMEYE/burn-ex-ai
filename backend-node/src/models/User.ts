/**
 * Mongoose schema for User profiles.
 * Stores Firebase-linked identity and biometric parameters needed for calorie calculations.
 */
import { Schema, model, type Document } from 'mongoose';
import type { BiologicalSex, ActivityLevel } from '../types/index.js';

export interface IUser extends Document {
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

const UserSchema = new Schema<IUser>({
  firebaseId: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true },
  displayName: { type: String, required: true },
  biologicalSex: {
    type: String,
    enum: ['male', 'female', 'prefer-not-to-say'],
    required: true,
  },
  heightCm: { type: Number, required: true, min: 50, max: 300 },
  weightKg: { type: Number, required: true, min: 20, max: 400 },
  age: { type: Number, required: true, min: 5, max: 120 },
  activityLevel: {
    type: String,
    enum: ['sedentary', 'lightly active', 'moderately active', 'very active'],
    required: true,
  },
  bodyFatPercent: { type: Number, min: 1, max: 70 },
  createdAt: { type: Date, default: Date.now },
});

export const UserModel = model<IUser>('User', UserSchema);
