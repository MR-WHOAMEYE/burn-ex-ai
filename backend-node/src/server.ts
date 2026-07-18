/**
 * Burn-Ex AI — Express.js Gateway Server
 * 
 * This is the central hub that:
 *   1. Serves REST API endpoints for profile, session, and nutrition management
 *   2. Runs Socket.IO for real-time device pairing and sensor streaming
 *   3. Authenticates all requests via Firebase ID Token verification
 *   4. Uses Redis adapter for cross-instance Socket.IO broadcast at scale
 */
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { ENV } from './config/env.js';
import { connectMongoDB } from './config/database.js';
import { connectRedis, redisClient } from './config/redis.js';
import { initFirebase } from './config/firebase.js';
import { setupSocketHandlers } from './services/socketService.js';
import { verifyFirebaseToken } from './middleware/auth.js';
import { createSession } from './controllers/sessionController.js';
import { upsertProfile, getProfile, logWeight } from './controllers/profileController.js';
import { logWorkout, getWorkoutHistory } from './controllers/workoutController.js';
import { setupGeminiLiveProxy } from './services/geminiLiveService.js';
import { spotifyController } from './controllers/spotifyController.js';
import { suggestionController } from './services/suggestionEngine.js';

async function bootstrap(): Promise<void> {
  // ─── Initialize External Services ─────────────────────────
  initFirebase();
  await connectMongoDB();
  await connectRedis();

  // ─── Express App ──────────────────────────────────────────
  const app = express();
  const httpServer = createServer(app);

  // Security & parsing middleware
  app.use(helmet());

  // CORS: in development accept any localhost port (Vite picks a random port
  // when the default is busy). In production, enforce FRONTEND_ORIGIN exactly.
  const corsOrigin =
    ENV.NODE_ENV === 'production'
      ? ENV.FRONTEND_ORIGIN
      : (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
          // Allow requests with no origin (e.g. curl, Postman) or any localhost
          if (!origin || /^http:\/\/localhost(:\d+)?$/.test(origin)) {
            callback(null, true);
          } else {
            callback(new Error(`CORS: origin ${origin} not allowed`));
          }
        };

  app.use(cors({ origin: corsOrigin, credentials: true }));
  app.use(express.json({ limit: '10mb' }));
  app.use(morgan('dev'));

  // ─── Health Check (unauthenticated) ───────────────────────
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'burn-ex-gateway', timestamp: new Date().toISOString() });
  });

  // ─── Authenticated REST Routes ────────────────────────────
  app.post('/api/sessions/create', verifyFirebaseToken, createSession);
  app.post('/api/profile', verifyFirebaseToken, upsertProfile);
  app.get('/api/profile', verifyFirebaseToken, getProfile);
  app.post('/api/profile/weight', verifyFirebaseToken, logWeight);
  app.post('/api/workouts', verifyFirebaseToken, logWorkout);
  app.get('/api/workouts/history', verifyFirebaseToken, getWorkoutHistory);

  // ─── Spotify API Routes ───────────────────────────────────
  app.get('/api/spotify/login', spotifyController.login);
  app.get('/api/spotify/callback', spotifyController.callback as any);
  app.get('/api/spotify/status', spotifyController.status);
  app.get('/api/spotify/logout', spotifyController.logout);
  app.get('/api/spotify/token', spotifyController.token as any);
  app.get('/api/spotify/player', spotifyController.player as any);
  app.post('/api/spotify/player/pause', spotifyController.pause as any);
  app.post('/api/spotify/player/play', spotifyController.play as any);
  app.post('/api/spotify/player/next', spotifyController.next as any);

  // ─── Suggestion Engine Routes ─────────────────────────────
  app.get('/api/suggestions/daily', suggestionController.daily);
  app.get('/api/suggestions/exercise-tip', suggestionController.exerciseTip);
  app.post('/api/suggestions/check-sedentary', suggestionController.checkSedentary);

  // ─── Socket.IO Server ─────────────────────────────────────
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: ENV.FRONTEND_ORIGIN,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    // Ping interval tuned for real-time sensor streaming
    pingInterval: 10000,
    pingTimeout: 5000,
  });

  // Attach Redis adapter for cross-instance broadcast (production scaling)
  if (redisClient.isReady) {
    try {
      const { createAdapter } = await import('@socket.io/redis-adapter');
      const pubClient = redisClient.duplicate();
      const subClient = redisClient.duplicate();
      await Promise.all([pubClient.connect(), subClient.connect()]);
      io.adapter(createAdapter(pubClient, subClient));
      console.log('✅ Socket.IO Redis adapter attached');
    } catch (error) {
      console.warn('⚠️  Redis adapter setup failed — running single-instance mode:', error);
    }
  }

  setupSocketHandlers(io);

  // ─── Gemini Live Proxy ────────────────────────────────────
  setupGeminiLiveProxy(httpServer);

  // ─── Start Server ─────────────────────────────────────────
  httpServer.listen(ENV.PORT, () => {
    console.log(`\n🚀 Burn-Ex Gateway running on port ${ENV.PORT}`);
    console.log(`   Environment: ${ENV.NODE_ENV}`);
    console.log(`   Frontend origin: ${ENV.FRONTEND_ORIGIN}\n`);
  });
}

bootstrap().catch((error) => {
  console.error('Fatal bootstrap error:', error);
  process.exit(1);
});
