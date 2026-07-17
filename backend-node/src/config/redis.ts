/**
 * Redis client for caching, rate-limiting, and Socket.IO cross-instance broadcast.
 * Configured with a reconnectStrategy of false in development to prevent infinite log floods.
 */
import { createClient } from 'redis';
import { ENV } from './env.js';

// Setup Redis Client. Disable infinite automatic reconnect loops if connection is refused in local dev.
export const redisClient = createClient({
  url: ENV.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      if (ENV.NODE_ENV === 'development' && retries >= 1) {
        // Return false to stop retrying after the first failed attempt
        return false;
      }
      // Standard exponential backoff for production (max 3000ms delay)
      return Math.min(retries * 50, 3000);
    }
  }
});

let errorLogged = false;

export async function connectRedis(): Promise<void> {
  redisClient.on('error', (err) => {
    if (!errorLogged) {
      console.warn('⚠️  Redis client connection error:', err.message || err);
      console.warn('   (Gateway will run without Redis adapter and caching)\n');
      errorLogged = true;
    }
  });

  try {
    await redisClient.connect();
    console.log('✅ Redis connected successfully');
  } catch (error) {
    // Handled by client on('error') listener
  }
}
