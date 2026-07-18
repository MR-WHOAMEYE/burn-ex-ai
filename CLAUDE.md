# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev        # Vite dev server on :5173
npm run build      # tsc -b && vite build
npm run lint       # oxlint (not ESLint)
npm run preview    # Preview production build
```

### Backend Gateway (Node/Express)
```bash
cd backend-node
npm install
npm run dev        # Express + Socket.IO on :8080
npm test           # Jest tests in src/tests/
```

### AI Service (Python/FastAPI)
```bash
cd backend-ai
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
pytest             # Run tests in backend-ai/tests/
```

## Architecture

Three independent services — all must run simultaneously for full functionality:

**Frontend** (`frontend/`) — React 19 SPA, runs ML inference in-browser via TF.js:
- `src/context/AuthContext.tsx` — Firebase Auth provider; exposes `useAuth()` hook with `user`, `token`, `loginWithGoogle`, `loginAsDemo`, `logout`
- `src/services/classifierEngine.ts` — Core ML pipeline: MoveNet Lightning (pose) + custom Bi-LSTM (exercise classification). Maintains a 40-frame rolling window `[1, 40, 39]`. Includes a biomechanics override layer that corrects LSTM misclassification (e.g., forces `push_ups` when spine is horizontal + elbow flexion detected).
- `src/services/staticPoseDetector.ts` — Geometry-only (no ML) standing/sitting/lying detector with 3-frame debounce.
- `src/services/geminiLive.ts` — WebSocket client to backend Gemini proxy; streams audio at 16kHz and video at 1fps; receives back PCM audio at 24kHz.
- `src/services/socketService.ts` — Socket.IO client singleton; handles NTP-style clock sync on connect; sends pose landmarks and IMU data to the gateway.
- `src/App.tsx` — All pages are lazy-loaded. `/mobile` and `/login` and `/setup` routes render without the sidebar/topbar shell.

**Backend Gateway** (`backend-node/`) — Express + Socket.IO hub; all config in `src/config/env.ts`:
- Authenticates every REST request via Firebase ID Token (`src/middleware/auth.ts`)
- Socket.IO authentication middleware also verifies Firebase tokens; demo token `mock-demo-token-123` bypasses auth for development
- `src/services/socketService.ts` — Manages in-memory session registry, pairs laptop + phone into the same `session_{id}` room, performs NTP clock sync handshake
- `src/services/geminiLiveService.ts` — WebSocket proxy to Google Gemini Live API
- Uses MongoDB for persistence and Redis for Socket.IO scaling adapter (optional; falls back to single-instance if Redis is unavailable)

**AI Service** (`backend-ai/`) — FastAPI; not yet fully implemented (Sprint 3+ features):
- `/api/fusion` — Sensor fusion (pose landmarks + IMU)
- `/api/food` — YOLO food detection
- `/api/calories` — MET-based calorie estimation

## Key Implementation Details

**`@mediapipe/pose` is stubbed out** — `vite.config.ts` aliases `@mediapipe/pose` to `src/stubs/mediapipe-pose.js`. The actual pose detection uses `@tensorflow-models/pose-detection` with MoveNet Lightning.

**ML Models** are served from `frontend/public/models/`:
- `burnex/model.json` — Custom Bi-LSTM for exercise classification (8 classes: `bench_press`, `clean_and_jerk`, `jumping_jacks`, `jump_rope`, `pull_ups`, `push_ups`, `sit_ups`, `squats`)
- MoveNet Lightning is loaded from local cache first, then falls back to CDN

**Demo mode** — `loginAsDemo()` sets token `mock-demo-token-123` in localStorage. The gateway Socket.IO middleware and REST auth bypass Firebase verification for this token.

**Backend-node uses ESM** — `tsconfig.json` sets `"module": "NodeNext"`. All internal imports must use `.js` extensions (e.g., `import { ENV } from './config/env.js'`).

## Environment Variables

**`backend-node/.env`:**
```
PORT=8080
MONGO_URI=mongodb://localhost:27017/burn-ex
REDIS_URL=redis://localhost:6379
FIREBASE_CREDENTIALS_PATH=./firebase-adminsdk-key.json
AI_SERVICE_URL=http://localhost:8000
FRONTEND_ORIGIN=http://localhost:5173
GEMINI_API_KEY=
GEMINI_MODEL=models/gemini-2.0-flash-exp
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
SPOTIFY_REDIRECT_URI=http://127.0.0.1:8080/api/spotify/callback
```

**`frontend/.env`:**
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_SOCKET_SERVER_URL=http://localhost:8080
VITE_GEMINI_WS_URL=ws://localhost:8080/api/gemini-live
```

## Design System

The design system is documented in `design-system/burn-ex-ai/MASTER.md`. Page-specific overrides live in `design-system/pages/[page-name].md` and take precedence over the master file.

**Core tokens:**
- Background: `#020617`, Primary: `#0F172A`, Secondary: `#1E293B`, Accent/CTA: `#22C55E`
- Fonts: `Barlow Condensed` (headings) + `Barlow` (body) from Google Fonts
- Icons: Lucide React only — never use emojis as icons

**Anti-patterns to avoid:**
- No emojis as icons (use SVG/Lucide)
- All clickable elements must have `cursor-pointer`
- All state changes must use transitions (150–300ms)
- No layout-shifting hover effects (avoid scale transforms that shift siblings)
- Maintain 4.5:1 minimum contrast ratio
