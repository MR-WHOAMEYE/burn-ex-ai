/**
 * Workout controller — handles saving completed exercise sessions.
 * 
 * Includes an In-Memory Database Fallback for local testing when MongoDB is offline.
 */
import type { Request, Response } from 'express';
import mongoose from 'mongoose';
import { WorkoutSessionModel } from '../models/WorkoutSession.js';
import { UserModel } from '../models/User.js';

// Local cache to persist logged sessions in-memory when database is offline
const inMemoryWorkouts: any[] = [];

/**
 * POST /api/workouts
 * Saves a completed workout session with exercise details, rep counts, and calorie burns.
 */
export async function logWorkout(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUser = req.firebaseUser!;
    const {
      sessionId,
      exercises,
      totalCaloriesBurned,
      totalDurationSeconds,
      startTime,
      endTime,
    } = req.body;

    let workout;

    if (mongoose.connection.readyState === 1) {
      // Find corresponding MongoDB User ID from Firebase UID
      const user = await UserModel.findOne({ firebaseId: firebaseUser.uid });
      const dbUserId = user ? user._id : new mongoose.Types.ObjectId();

      workout = await WorkoutSessionModel.create({
        userId: dbUserId,
        sessionId: sessionId || `session-${Date.now()}`,
        exercises,
        totalCaloriesBurned,
        totalDurationSeconds,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
      });
      console.log('✅ Saved workout session to MongoDB:', workout._id);
    } else {
      console.warn('⚠️ Mongoose offline: Saving workout session in local memory store');
      workout = {
        _id: new mongoose.Types.ObjectId().toString(),
        userId: new mongoose.Types.ObjectId().toString(),
        sessionId: sessionId || `session-${Date.now()}`,
        exercises,
        totalCaloriesBurned,
        totalDurationSeconds,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : new Date(),
      };
      inMemoryWorkouts.push(workout);
    }

    res.status(201).json({
      success: true,
      message: 'Workout session saved successfully',
      data: workout,
    });
  } catch (error: any) {
    console.error('❌ Failed to log workout session:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to save session' });
  }
}

/**
 * GET /api/workouts/history
 * Fetch previous workout sessions.
 */
export async function getWorkoutHistory(req: Request, res: Response): Promise<void> {
  try {
    const firebaseUser = req.firebaseUser!;
    let workouts: any[] = [];

    if (mongoose.connection.readyState === 1) {
      const user = await UserModel.findOne({ firebaseId: firebaseUser.uid });
      if (user) {
        workouts = await WorkoutSessionModel.find({ userId: user._id }).sort({ startTime: -1 });
      }
    } else {
      workouts = [...inMemoryWorkouts];
    }

    res.json({ success: true, data: workouts });
  } catch (error: any) {
    console.error('❌ Failed to fetch workout history:', error);
    res.status(500).json({ success: false, error: error?.message || 'Failed to fetch history' });
  }
}
