/**
 * Environment configuration loader.
 * All secrets and runtime settings are pulled from process.env —
 * never hardcoded inline.
 */
import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '8080', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',

  // MongoDB
  MONGO_URI: process.env.MONGO_URI || 'mongodb://localhost:27017/burn-ex',

  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',

  // Firebase Admin
  FIREBASE_CREDENTIALS_PATH: process.env.FIREBASE_CREDENTIALS_PATH || './firebase-adminsdk-key.json',

  // AI Microservice
  AI_SERVICE_URL: process.env.AI_SERVICE_URL || 'http://localhost:8000',

  // OpenWA WhatsApp API
  OPENWA_API_KEY: process.env.OPENWA_API_KEY || '',
  OPENWA_BASE_URL: process.env.OPENWA_BASE_URL || 'http://localhost:2785',
  OPENWA_SESSION_ID: process.env.OPENWA_SESSION_ID || '',

  // CORS
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',

  // Gemini Live
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'models/gemini-2.0-flash-exp',

  // Spotify API
  SPOTIFY_CLIENT_ID: process.env.SPOTIFY_CLIENT_ID || '',
  SPOTIFY_CLIENT_SECRET: process.env.SPOTIFY_CLIENT_SECRET || '',
  SPOTIFY_REDIRECT_URI: process.env.SPOTIFY_REDIRECT_URI || 'http://127.0.0.1:8080/api/spotify/callback',
} as const;
