/**
 * Socket.IO event handler and session pairing service.
 * 
 * CORE RESPONSIBILITIES:
 * 1. Authenticate Socket connections via Firebase ID Token
 * 2. Pair laptop + phone into the same session room via QR-scanned sessionId
 * 3. Execute NTP-style clock synchronization for each client
 * 4. Receive high-frequency landmark (laptop) and IMU (phone) streams
 * 5. Forward fused data to the AI service for inference
 * 6. Broadcast real-time workout metrics back to the laptop
 */
import type { Server, Socket } from 'socket.io';
import { admin } from '../config/firebase.js';
import type {
  SyncPingPayload,
  SyncPongPayload,
  LaptopStreamPayload,
  PhoneStreamPayload,
  DeviceRole,
} from '../types/index.js';

// In-memory session registry — maps sessionId → connected devices
interface SessionEntry {
  userId: string;
  devices: Map<DeviceRole, { socketId: string; clockOffset: number }>;
}

const activeSessions = new Map<string, SessionEntry>();

export function setupSocketHandlers(io: Server): void {
  // ─── Authentication Middleware ────────────────────────────
  io.use(async (socket, next) => {
    const token = socket.handshake.auth?.token as string | undefined;

    if (!token) {
      return next(new Error('Authentication error: No token provided'));
    }

    // Demo Socket Login Bypass
    if (token === 'mock-demo-token-123' || token.startsWith('mock-demo-token') || token === 'mobile-session-token') {
      (socket as any).firebaseUser = {
        uid: 'demo-user-123',
        email: 'demo@burnex.ai',
        name: 'Demo Athlete',
      };
      return next();
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      // Attach Firebase user data to the socket for downstream handlers
      (socket as Socket & { firebaseUser: admin.auth.DecodedIdToken }).firebaseUser = decoded;
      next();
    } catch {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  // ─── Connection Handler ───────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const firebaseUser = (socket as Socket & { firebaseUser: admin.auth.DecodedIdToken }).firebaseUser;
    console.log(`🔌 Socket connected: ${socket.id} (user: ${firebaseUser.email})`);

    // ── Clock Synchronization (NTP-Style) ────────────────
    // Each client performs this handshake on connect to calculate its clock offset.
    // The corrected offset is used to align timestamps from independent devices.
    socket.on('sync-ping', (payload: SyncPingPayload) => {
      const serverReceiveTime = Date.now();
      const response: SyncPongPayload = {
        clientTime: payload.clientTime,
        serverReceiveTime,
        serverSendTime: Date.now(),
      };
      socket.emit('sync-pong', response);
    });

    // ── Register Laptop ──────────────────────────────────
    socket.on('register-laptop', (data: { sessionId: string }) => {
      const { sessionId } = data;
      socket.join(`session_${sessionId}`);

      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, {
          userId: firebaseUser.uid,
          devices: new Map(),
        });
      }

      const session = activeSessions.get(sessionId)!;
      session.devices.set('laptop', { socketId: socket.id, clockOffset: 0 });

      console.log(`💻 Laptop registered for session: ${sessionId}`);

      // Notify room that the laptop has connected
      io.to(`session_${sessionId}`).emit('device-status', {
        device: 'laptop',
        status: 'connected',
      });

      checkPairingComplete(io, sessionId);
    });

    // ── Register Phone ───────────────────────────────────
    socket.on('register-phone', (data: { sessionId: string }) => {
      const { sessionId } = data;
      socket.join(`session_${sessionId}`);

      if (!activeSessions.has(sessionId)) {
        activeSessions.set(sessionId, {
          userId: firebaseUser.uid,
          devices: new Map(),
        });
      }

      const session = activeSessions.get(sessionId)!;
      session.devices.set('phone', { socketId: socket.id, clockOffset: 0 });

      console.log(`📱 Phone registered for session: ${sessionId}`);

      io.to(`session_${sessionId}`).emit('device-status', {
        device: 'phone',
        status: 'connected',
      });

      checkPairingComplete(io, sessionId);
    });

    // ── Laptop Landmark Stream ───────────────────────────
    socket.on('laptop-stream', (data: LaptopStreamPayload) => {
      // In Sprint 2, this will be forwarded to the fusion buffer service.
      // For now, acknowledge receipt and broadcast metrics placeholder.
      const session = activeSessions.get(data.sessionId);
      if (!session) return;

      // TODO (Sprint 2): Forward to fusion buffer → AI service
      io.to(`session_${data.sessionId}`).emit('landmark-ack', {
        frameTime: data.clientTime,
        landmarkCount: data.landmarks.length,
      });
    });

    // ── Phone IMU Stream ─────────────────────────────────
    socket.on('phone-stream', (data: PhoneStreamPayload) => {
      const session = activeSessions.get(data.sessionId);
      if (!session) return;

      // TODO (Sprint 2): Forward to fusion buffer → AI service
      io.to(`session_${data.sessionId}`).emit('imu-ack', {
        sensorTime: data.clientTime,
      });
    });

    // ── Phone IMU Classification ─────────────────────────
    socket.on('imu-classification', (data: any) => {
      if (!data.sessionId) return;
      // Broadcast the classification to the laptop (in the same session room)
      io.to(`session_${data.sessionId}`).emit('imu-classification', data);
    });

    // ── Disconnect ───────────────────────────────────────
    socket.on('disconnect', () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      // Clean up session device entries
      for (const [sessionId, session] of activeSessions.entries()) {
        for (const [role, device] of session.devices.entries()) {
          if (device.socketId === socket.id) {
            session.devices.delete(role);
            io.to(`session_${sessionId}`).emit('device-status', {
              device: role,
              status: 'disconnected',
            });
          }
        }

        // Remove session if no devices remain
        if (session.devices.size === 0) {
          activeSessions.delete(sessionId);
        }
      }
    });
  });
}

/**
 * Checks if both laptop and phone are connected for a given session.
 * Emits 'pairing-complete' when both devices are present.
 */
function checkPairingComplete(io: Server, sessionId: string): void {
  const session = activeSessions.get(sessionId);
  if (!session) return;

  if (session.devices.has('laptop') && session.devices.has('phone')) {
    console.log(`✅ Session ${sessionId}: Both devices paired successfully`);
    io.to(`session_${sessionId}`).emit('pairing-complete', {
      sessionId,
      laptopConnected: true,
      phoneConnected: true,
    });
  }
}
