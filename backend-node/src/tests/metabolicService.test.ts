import { describe, test, expect } from 'vitest';
import { calculateBMR, calculateTDEE } from '../services/metabolicService.js';

describe('Metabolic Service Calculations', () => {
  // BMR Mifflin-St Jeor test inputs
  // Men: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(years) + 5
  // Men BMR: 10 * 70 + 6.25 * 175 - 5 * 25 + 5 = 700 + 1093.75 - 125 + 5 = 1673.75
  test('should calculate BMR correctly for males', () => {
    const bmr = calculateBMR(70, 175, 25, 'male');
    expect(bmr).toBe(1673.75);
  });

  // Women: BMR = 10 * weight(kg) + 6.25 * height(cm) - 5 * age(years) - 161
  // Women BMR: 10 * 60 + 6.25 * 165 - 5 * 30 - 161 = 600 + 1031.25 - 150 - 161 = 1320.25
  test('should calculate BMR correctly for females', () => {
    const bmr = calculateBMR(60, 165, 30, 'female');
    expect(bmr).toBe(1320.25);
  });

  // TDEE: Sedentary = BMR * 1.2
  // 1674 * 1.2 = 2008.8 -> rounded to 2009
  test('should calculate TDEE correctly for sedentary activity level', () => {
    const tdee = calculateTDEE(1673.75, 'sedentary');
    expect(tdee).toBe(2009);
  });

  // TDEE: Moderately active = BMR * 1.55
  // 1673.75 * 1.55 = 2594.3125 -> rounded to 2594
  test('should calculate TDEE correctly for moderately active activity level', () => {
    const tdee = calculateTDEE(1673.75, 'moderately active');
    expect(tdee).toBe(2594);
  });
});
