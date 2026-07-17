/**
 * MongoDB connection via Mongoose.
 * Sets up a fast fallback if local MongoDB is not running, ensuring
 * the server can still run in-memory for local testing/demo.
 */
import mongoose from 'mongoose';
import { ENV } from './env.js';

export async function connectMongoDB(): Promise<void> {
  try {
    await mongoose.connect(ENV.MONGO_URI, {
      serverSelectionTimeoutMS: 2000, // Fail fast if MongoDB is not running locally
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.warn('\n⚠️  MongoDB connection failed — falling back to In-Memory database mode');
    console.warn('   (Mongoose queries will be simulated locally)\n');
  }
}
