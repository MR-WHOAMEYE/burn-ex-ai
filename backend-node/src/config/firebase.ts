/**
 * Firebase Admin SDK initialization.
 * Used exclusively for verifying Firebase ID tokens on incoming requests.
 * There is NO separate JWT system — "JWT" in this project = Firebase ID Token.
 */
import admin from 'firebase-admin';
import { ENV } from './env.js';
import { readFileSync, existsSync } from 'fs';

export function initFirebase(): void {
  if (admin.apps.length > 0) return; // Already initialized

  try {
    if (existsSync(ENV.FIREBASE_CREDENTIALS_PATH)) {
      const serviceAccount = JSON.parse(
        readFileSync(ENV.FIREBASE_CREDENTIALS_PATH, 'utf-8')
      );
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase Admin initialized from service account file');
    } else {
      // In production, use GOOGLE_APPLICATION_CREDENTIALS env var
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
      });
      console.log('✅ Firebase Admin initialized from application default credentials');
    }
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error);
    process.exit(1);
  }
}

export { admin };
