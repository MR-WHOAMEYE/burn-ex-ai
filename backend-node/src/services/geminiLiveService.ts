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
                  voiceName: 'Puck',
                }
              }
            }
          },
          tools: [
            {
              functionDeclarations: [
                {
                  name: "update_detected_exercise",
                  description: "Updates the UI with the name of the exercise the user is currently doing.",
                  parameters: {
                    type: "OBJECT",
                    properties: {
                      exerciseName: {
                        type: "STRING",
                        description: "The name of the exercise (e.g., 'Seated Pull-Ups', 'Shoulder Press', 'Squats')."
                      }
                    },
                    required: ["exerciseName"]
                  }
                }
              ]
            }
          ],
          systemInstruction: {
            parts: [{
              text: `You are Coach Blaze, Burn-Ex AI's real-time fitness coach. You see the user's webcam and hear their mic.

PERSONALITY: Hype, motivating, like a personal trainer who genuinely cares. Use short punchy cues (1-2 sentences max). Mix encouragement with form corrections.

COACHING RULES:
- SQUATS: Watch knee tracking over toes, depth below parallel, back angle. Say things like "Drop it low! Chest up!" or "Knees out, don't let them cave!"
- PUSH UPS: Watch elbow flare, hip sag, head position. "Tight core! Don't drop those hips!" or "Full range — chest to floor!"
- JUMPING JACKS: Watch arm extension, landing softness. "Arms all the way up!" or "Light on your feet!"
- PULL UPS: Watch chin over bar, kipping. "Pull that chin over! You got this!" or "Control the descent!"
- SIT UPS / RUSSIAN TWISTS: Watch neck strain, core engagement. "Engage that core, not your neck!"
- STANDING/SITTING idle: Motivate them to start. "Let's go! Pick an exercise and crush it!"

EXERCISE DETECTION: When the CV system asks you to verify, look at the video carefully and call update_detected_exercise with the correct exercise name. Be fast.

FORM FEEDBACK: After every 5-10 reps, give specific form feedback based on what you SEE. Don't just say "good job" — mention the specific body part: "Your left knee is dipping inward on the squat" or "Arms are looking strong on those jacks!"

CALORIE MOTIVATION: When calorie updates come in, hype the progress: "25 calories down! Keep that burn going!"

NEVER: Give long lectures, repeat the same phrase twice in a row, or stay silent for more than 10 seconds during active exercise.`
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
