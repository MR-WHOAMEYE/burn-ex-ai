/**
 * Socket.IO client service.
 * Manages the persistent WebSocket connection to the Express gateway,
 * handles NTP clock sync, and provides typed event emitters/listeners.
 */
import { io, Socket } from 'socket.io-client';
import type {
  SyncPongPayload,
  DeviceStatus,
  WorkoutMetrics,
  LandmarkPoint,
} from './types';

// Extend to include our custom payload types
interface SyncPongPayload {
  clientTime: number;
  serverReceiveTime: number;
  serverSendTime: number;
}

const SOCKET_URL = import.meta.env.VITE_SOCKET_SERVER_URL || 'http://localhost:8080';

class SocketService {
  private socket: Socket | null = null;
  private clockOffset = 0;
  private syncSamples: number[] = [];

  /**
   * Connect to the Socket.IO server with Firebase token authentication.
   */
  connect(token: string): Socket {
    if (this.socket?.connected) return this.socket;

    this.socket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'], // Skip polling fallback for real-time performance
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    this.socket.on('connect', () => {
      console.log('🔌 Socket connected:', this.socket?.id);
      this.performClockSync();
    });

    this.socket.on('disconnect', (reason) => {
      console.log('🔌 Socket disconnected:', reason);
    });

    return this.socket;
  }

  /**
   * NTP-style clock synchronization.
   * Performs multiple round-trips to estimate the clock offset between
   * this client's local clock and the server clock.
   */
  private performClockSync(rounds = 5): void {
    if (!this.socket) return;

    let completed = 0;
    this.syncSamples = [];

    const doSync = () => {
      const t1 = Date.now();
      this.socket!.emit('sync-ping', { clientTime: t1 });

      this.socket!.once('sync-pong', (data: SyncPongPayload) => {
        const t4 = Date.now();
        const t2 = data.serverReceiveTime;
        const t3 = data.serverSendTime;

        // NTP offset formula: θ = ((T2 - T1) + (T3 - T4)) / 2
        const offset = ((t2 - t1) + (t3 - t4)) / 2;
        this.syncSamples.push(offset);

        completed++;
        if (completed < rounds) {
          setTimeout(doSync, 100); // Small delay between sync attempts
        } else {
          // Use median offset to resist outliers
          this.syncSamples.sort((a, b) => a - b);
          this.clockOffset = this.syncSamples[Math.floor(this.syncSamples.length / 2)];
          console.log(`⏱️  Clock sync complete. Offset: ${this.clockOffset.toFixed(1)}ms`);
        }
      });
    };

    doSync();
  }

  /**
   * Returns the current timestamp corrected for server clock alignment.
   */
  getCorrectedTimestamp(): number {
    return Date.now() + this.clockOffset;
  }

  /**
   * Register this device as a laptop for the given session.
   */
  registerLaptop(sessionId: string): void {
    this.socket?.emit('register-laptop', { sessionId });
  }

  /**
   * Register this device as a phone for the given session.
   */
  registerPhone(sessionId: string): void {
    this.socket?.emit('register-phone', { sessionId });
  }

  /**
   * Stream pose landmark data from the laptop.
   */
  sendLandmarks(sessionId: string, landmarks: LandmarkPoint[]): void {
    this.socket?.emit('laptop-stream', {
      sessionId,
      clientTime: this.getCorrectedTimestamp(),
      landmarks,
    });
  }

  /**
   * Stream IMU sensor data from the phone.
   */
  sendIMU(
    sessionId: string,
    accel: [number, number, number],
    gyro: [number, number, number],
    orientation: [number, number, number]
  ): void {
    this.socket?.emit('phone-stream', {
      sessionId,
      clientTime: this.getCorrectedTimestamp(),
      accel,
      gyro,
      orientation,
    });
  }

  /**
   * Listen for device status changes.
   */
  onDeviceStatus(callback: (data: DeviceStatus) => void): void {
    this.socket?.on('device-status', callback);
  }

  /**
   * Listen for pairing completion.
   */
  onPairingComplete(callback: (data: { sessionId: string }) => void): void {
    this.socket?.on('pairing-complete', callback);
  }

  /**
   * Listen for real-time workout metrics from the AI service.
   */
  onWorkoutMetrics(callback: (data: WorkoutMetrics) => void): void {
    this.socket?.on('workout-metrics', callback);
  }

  /**
   * Disconnect the socket connection.
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
    this.clockOffset = 0;
    this.syncSamples = [];
  }

  get isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  get currentOffset(): number {
    return this.clockOffset;
  }
}

// Singleton — one socket connection per browser tab
export const socketService = new SocketService();
