/**
 * Burn-Ex AI — OpenWA WhatsApp Messaging Service
 *
 * Sends workout summaries, motivational nudges, and alerts via WhatsApp
 * using the OpenWA Gateway API.
 */
import { ENV } from '../config/env.js';

interface SendMessageResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Format phone number to WhatsApp chatId format.
 * "+91 6382347574" → "916382347574@c.us"
 */
function toChatId(phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '');
  return `${digits}@c.us`;
}

/**
 * Auto-discover the first ready session if OPENWA_SESSION_ID is not set.
 */
let cachedSessionId: string | null = null;

async function getSessionId(): Promise<string | null> {
  if (ENV.OPENWA_SESSION_ID) return ENV.OPENWA_SESSION_ID;
  if (cachedSessionId) return cachedSessionId;

  try {
    const res = await fetch(`${ENV.OPENWA_BASE_URL}/api/sessions`, {
      headers: { 'x-api-key': ENV.OPENWA_API_KEY },
    });
    const sessions = await res.json() as Array<{ id: string; status: string }>;
    const ready = sessions.find(s => s.status === 'ready');
    if (ready) cachedSessionId = ready.id;
    return cachedSessionId;
  } catch {
    return null;
  }
}

async function sendText(phone: string, message: string): Promise<SendMessageResult> {
  if (!ENV.OPENWA_API_KEY) {
    return { success: false, error: 'OPENWA_API_KEY not configured' };
  }

  const sessionId = await getSessionId();
  if (!sessionId) {
    return { success: false, error: 'No ready OpenWA session found' };
  }

  try {
    const res = await fetch(
      `${ENV.OPENWA_BASE_URL}/api/sessions/${sessionId}/messages/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ENV.OPENWA_API_KEY,
        },
        body: JSON.stringify({
          chatId: toChatId(phone),
          text: message,
        }),
      }
    );

    if (!res.ok) {
      const body = await res.text();
      return { success: false, error: `OpenWA ${res.status}: ${body}` };
    }

    const data = await res.json() as Record<string, any>;
    return { success: true, messageId: data.messageId };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a workout summary after a session ends.
 */
export async function sendWorkoutSummary(
  phone: string,
  summary: {
    exercise: string;
    reps: number;
    calories: number;
    durationMinutes: number;
  }
): Promise<SendMessageResult> {
  const msg =
    `*Burn-Ex AI - Workout Complete!*\n\n` +
    `Exercise: ${summary.exercise}\n` +
    `Reps: ${summary.reps}\n` +
    `Calories Burned: ${summary.calories} kcal\n` +
    `Duration: ${summary.durationMinutes} min\n\n` +
    `Keep pushing! Your consistency is building results.`;

  return sendText(phone, msg);
}

/**
 * Send a motivational nudge / sedentary alert.
 */
export async function sendMotivationNudge(
  phone: string,
  message: string
): Promise<SendMessageResult> {
  return sendText(phone, `*Burn-Ex AI*\n\n${message}`);
}

/**
 * Send a daily progress summary.
 */
export async function sendDailySummary(
  phone: string,
  summary: {
    totalCalories: number;
    totalWorkouts: number;
    totalMinutes: number;
  }
): Promise<SendMessageResult> {
  const msg =
    `*Burn-Ex AI - Daily Summary*\n\n` +
    `Total Workouts: ${summary.totalWorkouts}\n` +
    `Calories Burned: ${summary.totalCalories} kcal\n` +
    `Active Minutes: ${summary.totalMinutes} min\n\n` +
    `Great effort today! See you tomorrow.`;

  return sendText(phone, msg);
}

export const whatsappService = {
  sendText,
  sendWorkoutSummary,
  sendMotivationNudge,
  sendDailySummary,
};
