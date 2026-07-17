/**
 * Metabolic Calculation Service
 * 
 * Implements the Mifflin-St Jeor equation for Basal Metabolic Rate (BMR)
 * and Total Daily Energy Expenditure (TDEE).
 */
import type { BiologicalSex, ActivityLevel } from '../types/index.js';

// Activity factor multipliers
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  'sedentary': 1.2,
  'lightly active': 1.375,
  'moderately active': 1.55,
  'very active': 1.725,
};

/**
 * Calculates BMR using Mifflin-St Jeor equation.
 * Men:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) + 5
 * Women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age(years) − 161
 */
export function calculateBMR(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  biologicalSex: BiologicalSex
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  
  if (biologicalSex === 'male') {
    return base + 5;
  }
  
  if (biologicalSex === 'female') {
    return base - 161;
  }
  
  // Default fallback for 'prefer-not-to-say' averages male and female offsets
  return base - 78; 
}

/**
 * Calculates TDEE by applying activity multiplier to BMR.
 */
export function calculateTDEE(bmr: number, activityLevel: ActivityLevel): number {
  const multiplier = ACTIVITY_FACTORS[activityLevel] || 1.2;
  return Math.round(bmr * multiplier);
}
