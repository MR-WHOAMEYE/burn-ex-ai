/**
 * Burn-Ex AI — WhatsApp API Controller
 *
 * REST endpoints for sending WhatsApp messages via OpenWA.
 */
import type { Request, Response } from 'express';
import { whatsappService } from '../services/whatsappService.js';

const DEMO_PHONE = '916382347574';

export const whatsappController = {
  /** POST /api/whatsapp/workout-summary */
  async workoutSummary(req: Request, res: Response) {
    const { phone, exercise, reps, calories, durationMinutes } = req.body;
    const result = await whatsappService.sendWorkoutSummary(
      phone || DEMO_PHONE,
      {
        exercise: exercise || 'SQUATS',
        reps: reps || 0,
        calories: Math.round(calories || 0),
        durationMinutes: Math.round(durationMinutes || 0),
      }
    );
    res.json(result);
  },

  /** POST /api/whatsapp/nudge */
  async nudge(req: Request, res: Response) {
    const { phone, message } = req.body;
    const result = await whatsappService.sendMotivationNudge(
      phone || DEMO_PHONE,
      message || "You've been sitting for a while. Time to move!",
    );
    res.json(result);
  },

  /** POST /api/whatsapp/daily-summary */
  async dailySummary(req: Request, res: Response) {
    const { phone, totalCalories, totalWorkouts, totalMinutes } = req.body;
    const result = await whatsappService.sendDailySummary(
      phone || DEMO_PHONE,
      {
        totalCalories: Math.round(totalCalories || 0),
        totalWorkouts: totalWorkouts || 0,
        totalMinutes: Math.round(totalMinutes || 0),
      }
    );
    res.json(result);
  },
};
