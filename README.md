# 🔥 Burn-Ex AI

**AI Vision-Based Fitness, Nutrition & Wellness Ecosystem**

Burn-Ex transforms any laptop and smartphone into an AI personal fitness coach using a hybrid edge-server architecture.

## Architecture

| Layer | Technology | Responsibility |
|---|---|---|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind | Dashboard, webcam pose overlay, mobile sensor page |
| **Backend Gateway** | Express.js + Socket.IO + Redis | REST APIs, device pairing, real-time streaming relay |
| **AI Service** | FastAPI + Python | Sensor fusion, LSTM exercise recognition, YOLO food detection |
| **Database** | MongoDB Atlas + Redis | User profiles, workout history, IMU time-series, caching |
| **Auth** | Firebase Auth | Google Login, Email Login, ID token verification |

## Key Design Decisions

- **Client-side pose extraction:** MediaPipe BlazePose runs in the browser via WASM. Raw video never leaves the device.
- **Phone as IMU hub:** Smartphone streams accelerometer/gyroscope data at 50Hz via Socket.IO.
- **NTP-style clock sync:** Time-aligns independent laptop and phone streams server-side.
- **Hybrid intelligence:** Models are centrally upgradeable on the server without redeploying clients.

## Quick Start

```bash
# 1. Frontend
cd frontend && npm install && npm run dev

# 2. Backend Gateway
cd backend-node && npm install && npm run dev

# 3. AI Service
cd backend-ai && pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Project Structure

```
burn-ex-ai/
├── frontend/           # React 19 SPA (Vite + TypeScript + Tailwind)
├── backend-node/       # Express.js Gateway (Socket.IO + Redis + Firebase Auth)
└── backend-ai/         # FastAPI AI Service (Sensor Fusion + YOLO)
```

## License

Proprietary — All rights reserved.
