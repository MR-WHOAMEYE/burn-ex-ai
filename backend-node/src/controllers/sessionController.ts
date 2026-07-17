/**
 * Session controller — handles QR code generation for device pairing.
 * The QR encodes a session ID that both laptop and phone use to join the same Socket.IO room.
 */
import type { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import { ENV } from '../config/env.js';

/**
 * POST /api/sessions/create
 * Generates a new session ID and returns a QR code (as data URL) that the phone scans.
 */
export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = uuidv4().slice(0, 8); // Short, scannable ID
    const mobileUrl = `${ENV.FRONTEND_ORIGIN}/mobile?session=${sessionId}`;

    const qrDataUrl = await QRCode.toDataURL(mobileUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#F8FAFC',   // Foreground matches our design system
        light: '#0F172A',  // Background matches dark theme
      },
    });

    res.status(201).json({
      success: true,
      data: {
        sessionId,
        mobileUrl,
        qrCode: qrDataUrl,
      },
    });
  } catch (error) {
    console.error('Session creation failed:', error);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
}
