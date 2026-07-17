/**
 * Profile controller — handles user profile CRUD and BMR/TDEE calculations.
 * 
 * Includes an In-Memory Database Fallback for local testing when MongoDB is offline.
 * 
 * CALORIE FORMULA (Mifflin-St Jeor):
 *   Men:   BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age + 5
 *   Women: BMR = 10 × weight(kg) + 6.25 × height(cm) − 5 × age − 161
 *   TDEE = BMR × activity_factor
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { UserModel } from '../models/User.js';
import { WeightHistoryModel } from '../models/WeightHistory.js';
import { calculateBMR, calculateTDEE } from '../services/metabolicService.js';

// Local cache to persist profile data in-memory when database is offline
const inMemoryUserProfiles = new Map<string, any>();

/**
 * POST /api/profile
 * Create or update the user's profile after Firebase authentication.
 */
export async function upsertProfile(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUser = req.firebaseUser!;
    const { 
      heightCm, 
      weightKg, 
      age, 
      biologicalSex, 
      activityLevel, 
      bodyFatPercent,
      displayName,
      phoneNumber,
      emergencyContact,
      medicalInfo,
      fitnessGoal,
      profilePhoto
    } = req.body;

    let user;

    if (mongoose.connection.readyState === 1) {
      user = await UserModel.findOneAndUpdate(
        { firebaseId: firebaseUser.uid },
        {
          firebaseId: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: displayName || firebaseUser.name || firebaseUser.email,
          heightCm,
          weightKg,
          age,
          biologicalSex,
          activityLevel,
          bodyFatPercent,
          phoneNumber,
          emergencyContact,
          medicalInfo,
          fitnessGoal,
          profilePhoto,
        },
        { upsert: true, new: true, runValidators: true }
      );

      // Log weight entry to versioned history
      await WeightHistoryModel.create({
        userId: user._id,
        weightKg,
      });
    } else {
      console.warn('⚠️  Mongoose offline: Saving profile in local memory store');
      user = {
        _id: new mongoose.Types.ObjectId().toString(),
        firebaseId: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: displayName || firebaseUser.name || firebaseUser.email,
        heightCm,
        weightKg,
        age,
        biologicalSex,
        activityLevel,
        bodyFatPercent,
        phoneNumber,
        emergencyContact,
        medicalInfo,
        fitnessGoal,
        profilePhoto,
        createdAt: new Date(),
      };
      inMemoryUserProfiles.set(firebaseUser.uid, user);
    }

    // Calculate metabolic baseline
    const bmr = calculateBMR(weightKg, heightCm, age, biologicalSex);
    const tdee = calculateTDEE(bmr, activityLevel);

    res.status(200).json({
      success: true,
      data: {
        profile: user,
        metabolics: {
          bmr: Math.round(bmr),
          tdee,
          dailyCalorieTarget: tdee,
        },
      },
    });
  } catch (error) {
    console.error('Profile upsert failed:', error);
    res.status(500).json({ success: false, error: 'Failed to save profile' });
  }
}

/**
 * GET /api/profile
 * Fetch the current user's profile and calculated TDEE.
 */
export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUser = req.firebaseUser!;
    let user;

    if (mongoose.connection.readyState === 1) {
      user = await UserModel.findOne({ firebaseId: firebaseUser.uid });
    } else {
      user = inMemoryUserProfiles.get(firebaseUser.uid);
    }

    if (!user) {
      // Return a default demo user profile if offline so the UI doesn't crash on initial load
      user = {
        firebaseId: firebaseUser.uid,
        email: firebaseUser.email,
        displayName: firebaseUser.name || 'Demo Athlete',
        heightCm: 178,
        weightKg: 74,
        age: 28,
        biologicalSex: 'male',
        activityLevel: 'moderately active',
        createdAt: new Date(),
      };
      inMemoryUserProfiles.set(firebaseUser.uid, user);
    }

    const bmr = calculateBMR(user.weightKg, user.heightCm, user.age, user.biologicalSex);
    const tdee = calculateTDEE(bmr, user.activityLevel);

    res.status(200).json({
      success: true,
      data: {
        profile: user,
        metabolics: { bmr: Math.round(bmr), tdee, dailyCalorieTarget: tdee },
      },
    });
  } catch (error) {
    console.error('Profile fetch failed:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
}

/**
 * POST /api/profile/weight
 * Log a new weight entry to the versioned history.
 */
export async function logWeight(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUser = req.firebaseUser!;
    const { weightKg } = req.body;

    let user;

    if (mongoose.connection.readyState === 1) {
      user = await UserModel.findOneAndUpdate(
        { firebaseId: firebaseUser.uid },
        { weightKg },
        { new: true }
      );

      if (!user) {
        res.status(404).json({ success: false, error: 'User not found' });
        return;
      }

      await WeightHistoryModel.create({ userId: user._id, weightKg });
    } else {
      user = inMemoryUserProfiles.get(firebaseUser.uid);
      if (!user) {
        res.status(404).json({ success: false, error: 'User not found in memory' });
        return;
      }
      user.weightKg = weightKg;
      inMemoryUserProfiles.set(firebaseUser.uid, user);
    }

    res.status(201).json({
      success: true,
      data: { currentWeight: weightKg },
      message: 'Weight entry logged',
    });
  } catch (error) {
    console.error('Weight log failed:', error);
    res.status(500).json({ success: false, error: 'Failed to log weight' });
  }
}
