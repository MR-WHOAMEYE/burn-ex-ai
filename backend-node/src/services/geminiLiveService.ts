import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';
import { ENV } from '../config/env.js';

export function setupGeminiLiveProxy(server: Server) {
  // Create a WebSocket server attached to the HTTP server
  // We use noServer: true because socket.io is already attached,
  // we will handle the upgrade manually.
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    // Only handle /api/gemini-live upgrades
    if (request.url === '/api/gemini-live') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (clientWs) => {
    console.log('🔗 Client connected to Gemini Live proxy');

    if (!ENV.GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY is not set in backend-node/.env');
      clientWs.close(1011, 'Gemini API key missing on server');
      return;
    }

    // Connect to Google's Gemini Multimodal Live API
    const GEMINI_WS_URL = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${ENV.GEMINI_API_KEY}`;
    
    const geminiWs = new WebSocket(GEMINI_WS_URL);

    geminiWs.on('open', () => {
      console.log('✅ Connected to Gemini Live API');
      // Send the initial setup message to Gemini
      const setupMessage = {
        setup: {
          model: ENV.GEMINI_MODEL,
          generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: 'Puck', // Aoede, Charon, Fenrir, Kore, Puck
                }
              }
            }
          },
          systemInstruction: {
            parts: [{
              text: "You are Burn-Ex AI, an energetic, encouraging, and expert virtual fitness coach. You watch the user's video feed and listen to their audio. Provide short, punchy, real-time coaching cues (e.g. 'Keep your back straight!', 'Push hard!', 'Great job!'). Do not give long speeches. Focus on the exercise they are currently doing."
            }]
          }
        }
      };
      geminiWs.send(JSON.stringify(setupMessage));
    });

    // Proxy messages from Client -> Gemini
    clientWs.on('message', (data) => {
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.send(data);
      }
    });

    // Proxy messages from Gemini -> Client
    geminiWs.on('message', (data) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(data);
      }
    });

    // Handle close events
    clientWs.on('close', (code, reason) => {
      console.log(`🔌 Client disconnected from Gemini proxy (Code: ${code}, Reason: ${reason})`);
      if (geminiWs.readyState === WebSocket.OPEN) {
        geminiWs.close();
      }
    });

    geminiWs.on('close', (code, reason) => {
      console.log(`🔌 Gemini Live API disconnected (Code: ${code}, Reason: ${reason})`);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.close(code, reason);
      }
    });

    // Handle errors
    clientWs.on('error', (err) => console.error('Client WS Error:', err));
    geminiWs.on('error', (err) => console.error('Gemini WS Error:', err));
  });

  console.log('✅ Gemini Live proxy endpoint registered at ws://localhost:8080/api/gemini-live');
}
