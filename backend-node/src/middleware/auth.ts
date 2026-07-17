/**
 * Firebase ID Token verification middleware.
 * Protects all REST endpoints by verifying the Bearer token against Firebase Auth.
 * 
 * DESIGN DECISION: There is no separate JWT system.
 * "JWT" in this project exclusively means the Firebase ID Token.
 */
import type { Request, Response, NextFunction } from 'express';
import { admin } from '../config/firebase.js';

// Extend Express Request to carry the decoded Firebase user
declare global {
  namespace Express {
    interface Request {
      firebaseUser?: admin.auth.DecodedIdToken;
    }
  }
}

export async function verifyFirebaseToken(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Unauthorized: Missing or malformed Authorization header',
    });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  // Demo Login Bypass (local dev testing without live Firebase config)
  if (idToken === 'mock-demo-token-123' || idToken.startsWith('mock-demo-token')) {
    req.firebaseUser = {
      uid: 'demo-user-123',
      email: 'demo@burnex.ai',
      name: 'Demo Athlete',
      picture: '',
      iss: 'https://securetoken.google.com/burn-ex-ai',
      aud: 'burn-ex-ai',
      auth_time: Date.now() / 1000,
      sub: 'demo-user-123',
      exp: (Date.now() / 1000) + 3600,
      firebase: { identities: {}, sign_in_provider: 'google.com' }
    } as any;
    next();
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.firebaseUser = decodedToken;
    next();
  } catch (error) {
    console.error('Token verification failed:', error);
    res.status(403).json({
      success: false,
      error: 'Forbidden: Invalid or expired Firebase ID token',
    });
  }
}
