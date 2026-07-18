# CV/Pose Detection, Gemini Integration & Calorie Suggestions — Spec

> **Date:** 2026-07-18  
> **Project:** Burn-Ex AI  
> **Status:** Pre-implementation spec (no code changes yet)

---

## 1. Executive Summary

This spec documents the findings from a comprehensive codebase audit and user interview covering four areas:

1. **🐛 Bug Audit & Performance Improvements** for the computer vision (CV) / pose detection pipeline
2. **🧍 Static Pose Detection** — detecting standing, sitting, lying down
3. **⚡ Gemini Response Improvements** — faster, hybrid local+AI coaching
4. **🔥 Calorie-Burning Suggestions** — form tips, exercise recommendations, workout routines

---

## 2. Current Architecture Overview

### 2.1 CV/Pose Pipeline (Frontend — `classifierEngine.ts`)

```
Webcam (1280×720, 30fps)
    │
    ▼
MoveNet Lightning (pose-detection@2.1.3)
    │  Produces 17 keypoints (SINGLEPOSE_LIGHTNING)
    ▼
B-LSTM LayersModel (custom, 40-frame window ~1.3s)
    │  Predicts: bench_press, clean_and_jerk, jumping_jacks,
    │  jump_rope, pull_ups, push_ups, sit_ups, squats
    ▼
Biomechanics Override Layer
    │  Corrects push_ups misclassification using spine angle + elbow range
    ▼
Rep Counting (local heuristics)
    │  Squat: knee angle <115° (down), >150° (up)
    │  Push-up: elbow angle <100° (down), >150° (up)
    ▼
Calorie Estimation (MET formula)
    Calories/sec = (MET × 3.5 × weight_kg) / 200 / 60
```

### 2.2 Gemini Integration

```
Frontend (geminiLive.ts)          Backend (geminiLiveService.ts)
    │                                      │
    │── WebSocket ──────────────────►      │
    │ ws://localhost:8080/api/gemini-live  │── WebSocket ──► Google Gemini API
    │                                      │   (BidiGenerateContent)
    │◄── WebSocket ──────────────────      │
    │                                      │
    │  Audio: 16kHz PCM microphone input   │
    │  Video: JPEG frames at 1 fps         │
    │  Audio out: 24kHz PCM (voice "Puck") │
```

- **Model:** `models/gemini-2.0-flash-exp`
- **System prompt:** Energetic virtual fitness coach — short, punchy cues
- **Audio voice:** "Puck"

### 2.3 Backend AI Microservice (Python FastAPI)

```
POST /api/calories/estimate
  Input:  exercise_type, weight_kg, duration_minutes, movement_intensity
  Output: base_met, adjusted_met, calories_burned
  Formula: Calories/min = (MET × 3.5 × weight_kg) / 200

POST /api/food/detect (YOLO stub)
POST /api/fusion/analyze (Sensor fusion + LSTM — currently returns mock data)
```

### 2.4 Mobile Sensor Integration (`MobileSensor.tsx`)

- Phone sends accelerometer, gyroscope, orientation via Socket.IO
- Pairing via QR code → session registration
- NTP-style clock sync for time-alignment

---

## 3. Bug Audit Findings

### 3.1 Critical / High Priority Bugs

| # | Bug | File | Line(s) | Description | Suggested Fix |
|---|-----|------|---------|-------------|---------------|
| 1 | **Stale closure in rep counting** | `Workout.tsx` | `localReps` in `useEffect` | `localReps` is a plain `let` variable inside `useEffect`, not a `useRef`. When the effect closure captures `localReps`, the rep counter resets on every render. Incrementing `localReps++` works but `setMetrics((prev) => ({ ...prev, reps: localReps }))` reads the stale `let` variable if the rep state update is batched. | Replace `let localReps = 0` with `const localRepsRef = useRef(0)` and always read `localRepsRef.current`. |
| 2 | **`metrics.exerciseType` stale in rep-counting closure** | `Workout.tsx` | ~L430-445 | The rep-counting logic reads `metrics.exerciseType` directly — but this is captured in a closure from the `useEffect` dependency `[isCameraActive, addLog]`. Since `metrics` isn't in the dependency array, the closure always sees the initial `metrics` state (exerciseType: 'Calibrating...'), so rep counting for push-ups/squats may never activate correctly. | Add `isWorkoutActive` to the dependency array OR use a `useRef` to track current exercise type. |
| 3 | **No `isWorkoutActiveRef` dependency in camera effect** | `Workout.tsx` | `useEffect([isCameraActive, addLog])` | The camera tracking `useEffect` only depends on `[isCameraActive, addLog]`, but it uses `isWorkoutActiveRef.current` (a ref) — which is correct for the ref pattern. However, the rep-counting and setMetrics calls inside the closure will have stale state values (see bug #1 & #2). | Combine fixes from #1 and #2 to use refs throughout. |
| 4 | **Multiple voice coaches possible** | `Workout.tsx` | `toggleVoiceCoach` | Clicking "Enable Coach" multiple times before the first connection completes creates multiple `GeminiLiveClient` instances. The old one leaks. The `isVoiceCoachActive` state toggle only happens after `await client.connect()`, leaving a race window. | Set `isVoiceCoachActive` immediately (optimistic), and destroy any existing `geminiClientRef.current` before creating a new one. |
| 5 | **Timer interval leak** | `Workout.tsx` | `useEffect` for `setInterval` + `startWorkout` | The timer `setInterval` is set inside `startWorkout` (a callback) without cleanup in the callback. There's a separate `useEffect` for the elapsed time interval tied to `[isWorkoutActive]` — but `startWorkout` also sets `timerRef.current`. This dual timer setup can cause the interval to fire twice (once from each source). | Consolidate to a single timer source. Remove the `timerRef` from `startWorkout` and rely solely on the `useEffect` with `[isWorkoutActive]`. |
| 6 | **Chart data uses random placeholder** | `Workout.tsx` | `setChartData` in `startWorkout` | Chart data for calories uses `Math.random() * 0.5` instead of real calorie data from the MET formula. This means the chart shows fake data. | Replace with actual incremental calorie data from `metrics.calories` (track via ref). |
| 7 | **Calorie estimation doesn't use backend AI service** | `Workout.tsx` | MET calculation inline | The MET formula is hardcoded on the frontend (`Workout.tsx` lines ~445-460). The backend `calorie_engine.py` has a proper API endpoint that supports movement_intensity scaling, but it's not called. | After workout, optionally re-calculate via backend for accuracy. Or use the backend API live during the workout. |

### 3.2 Medium Priority Bugs

| # | Bug | File | Line(s) | Description | Suggested Fix |
|---|-----|------|---------|-------------|---------------|
| 8 | **WebSocket URL hardcoded** | `geminiLive.ts` | Line 17 | `new WebSocket('ws://localhost:8080/api/gemini-live')` — won't work in production or on different ports. | Use `import.meta.env.VITE_GEMINI_WS_URL` or derive from `window.location`. |
| 9 | **AudioWorklet blob URL never revoked** | `geminiLive.ts` | `URL.createObjectURL(blob)` | The blob URL for the AudioWorklet module is created but never revoked, causing a memory leak. | Store the blob URL and call `URL.revokeObjectURL()` on disconnect. |
| 10 | **`isWorkoutActive` not passed correctly to stopWorkout** | `Workout.tsx` | `stopWorkout` | `stopWorkout` reads `elapsedSeconds` and `metrics` from closure at the time it's created in the render. Since `stopWorkout` is wrapped in `useCallback([elapsedSeconds, metrics, token])`, it should be fine — but `elapsedSeconds` updates every second, causing `stopWorkout` to be recreated on every second. | Use refs for `elapsedSeconds` and `metrics` inside `stopWorkout`, or split the save logic into a separate effect. |
| 11 | **No connection timeout for Gemini** | `geminiLive.ts` | `connect()` | If the WebSocket to Gemini never opens (API key invalid, network blocked), the user gets no feedback — the promise just hangs. | Add a timeout (e.g., 10s) with a user-facing error message. |
| 12 | **`frameBuffer` never trimmed if processFrame stops** | `classifierEngine.ts` | `frameBuffer` | The rolling buffer trims on each `processFrame` call, but if the loop stops, the buffer retains 40 stale frames. When the loop restarts, `clearBuffer()` must be called explicitly — there's no auto-reset. | Add a `frameBuffer.length` sanity check or auto-clear when `isWorkoutActive` transitions. |

### 3.3 Low Priority / Cosmetic

| # | Bug | File | Description |
|---|------|------|-------------|
| 13 | `biomechanicsOverride` field in `ClassificationResult` not used in UI | `Workout.tsx` | The field is logged but never visually indicated in the UI. |
| 14 | Debug logs accumulate indefinitely | `Workout.tsx` | `debugLog` array is sliced to 15 items, but each item is a string that's never freed from memory. Only a concern for multi-hour sessions. |
| 15 | `Pause Studio` and `End Session` both call `stopWorkout` | `Workout.tsx` | The "Pause" button calls `stopWorkout` (which saves to backend and resets). Should probably just pause the timer and tracking loop. |

---

## 4. Static Pose Detection Spec

### 4.1 Overview

Add real-time detection of 3 static body states using existing MoveNet keypoints:
- **Standing** — hip-to-ankle line is vertical, minimal knee bend
- **Sitting** — hip-to-knee angle < 120°, hip height above knee but significantly below standing
- **Lying Down** — spine angle > 60° from vertical (already partially computed)

### 4.2 Local Detection (Primary, Fast)

**Where:** New service `frontend/src/services/staticPoseDetector.ts`

**Algorithm (from MoveNet 17 keypoints):**

```
1. Compute hip midpoint (L_HIP[11] + R_HIP[12]) / 2
2. Compute knee midpoint (L_KNEE[13] + R_KNEE[14]) / 2
3. Compute ankle midpoint (L_ANKLE[15] + R_ANKLE[16]) / 2
4. Compute shoulder midpoint (L_SHOULDER[5] + R_SHOULDER[6]) / 2

Heuristic rules:
- Lying Down: spine angle > 50° from vertical (reuse spineHorizontalDeg from classifierEngine)
- Sitting: 
    - hip-to-knee angle < 110° (flexed knees)
    - hip midpoint is below shoulder midpoint by at least 20% of body height
    - NOT lying down
- Standing:
    - hip-to-knee angle > 150° (extended legs)
    - spine angle < 20° from vertical
- Unknown: if confidence < 0.5 for all states
```

**Confidence scoring:**
- Each state gets a confidence score 0–1 based on how well the keypoints match
- Output: `{ state: 'standing' | 'sitting' | 'lying' | 'unknown', confidence: number }`

**Performance:** Runs on every frame alongside existing `processFrame()` — negligible overhead since it's just angle math (no ML inference).

### 4.3 Periodic Gemini Check (Background)

**Where:** `GeminiLiveClient` — new periodic prompt

**Frequency:** Every 10–15 seconds during a workout/coach session.

**Prompt content:**
```
[Background pose check]
User is currently: {staticPose}
Exercising: {currentExercise}
Calories burned: {calories}
Heart rate estimate: N/A
Check their form briefly. If they've been in the same static pose (e.g., sitting) 
for more than 2 consecutive checks, suggest a movement break. Keep response under 2 seconds.
```

**Gemini message format:** Reuse existing `realtimeInput` structure but send text-only as a `realtimeInput` with a `text` field (no need to send video for this check if nothing changed).

### 4.4 UI Integration

| Component | Location | What to Show |
|-----------|----------|--------------|
| Workout page | Coach sidebar | Static pose badge (e.g., "🧍 Standing" / "🪑 Sitting" / "🛌 Lying") |
| Workout page | Video frame overlay | Small static pose label in corner |
| Dashboard | Metrics card | "Time Spent Standing: 15min / Sitting: 42min" |

### 4.5 Cache / Cooldown

- Static pose changes are debounced (3-frame stable window to avoid flickering)
- Gemini background checks skip if static pose hasn't changed since last check

---

## 5. CV Performance Improvements Spec

### 5.1 Profiling First (Per Interview)

**Action:** Before any optimization, add performance instrumentation.

**Where:** `classifierEngine.ts` and `Workout.tsx`

**What to measure:**
```
- MoveNet inference time per frame (ms)
- LSTM inference time per 40-frame window (ms)
- Frame-to-frame latency (time between requestAnimationFrame calls)
- Video decode + canvas draw time
- Total loop time (from estimatePoses → UI update)
```

**Tool:** Use `performance.now()` markers with `console.debug` (tagged with a flag so it can be disabled).

**Implementation sketch:**
```typescript
// In classifierEngine.ts
async estimatePoses(video: HTMLVideoElement): Promise<Pose[]> {
  const t0 = performance.now();
  // ... existing code ...
  const elapsed = performance.now() - t0;
  if (elapsed > 33) { // < 30fps
    console.debug(`[Perf] estimatePoses took ${elapsed.toFixed(1)}ms`);
  }
  return result;
}
```

### 5.2 Identified Optimization Opportunities

| # | Optimization | Expected Gain | Effort | Risk |
|---|-------------|---------------|--------|------|
| 1 | **Video resolution downscale**: 1280×720 → 640×480 | 2–4× faster MoveNet inference | Low | Lower tracking accuracy far from camera |
| 2 | **Skip every Nth frame**: Process frames at 15fps instead of 30fps | ~2× CPU reduction | Low | Half temporal resolution — fine for exercise class. |
| 3 | **Throttle LSTM inference**: Run LSTM every 6 frames (~5Hz) instead of every 3 frames (~10Hz) | ~2× fewer LSTM runs | Low | Slightly slower exercise detection changes |
| 4 | **WebGL backend check**: Ensure `tf.setBackend('webgl')` is called explicitly before inference | Variable | Low | Prevents accidental CPU fallback |
| 5 | **Canvas sizing optimization**: Don't resize canvas on every frame — `useRef` to track last size | Minor CPU | Low | Prevents layout thrashing |

### 5.3 Recommended First Steps (after profiling)

1. **Add performance markers** (Section 5.1) — run a 60-second test, collect data
2. **Apply low-risk/low-effort wins** (items #4, #5 above)
3. **If inference still too slow:** Apply #1 (640×480) and #2 (15fps)
4. **If still needed:** Apply #3 (5Hz LSTM)

---

## 6. Gemini Integration Improvements Spec

### 6.1 Hybrid Coach Architecture

```
LOCAL (instant, no network)          GEMINI (background, richer)
    │                                      │
    ├── Static pose detection              ├── Periodic form analysis (every 10-15s)
    ├── Exercise classification             ├── Voice coaching cues
    ├── Rep counting                        ├── Motivational feedback
    ├── Form heuristics (basic)             ├── "Sitting too long" alerts
    └── Calorie estimation                  └── Advanced form corrections
```

### 6.2 Gemini Latency Reduction

| # | Issue | Current | Suggested Fix |
|---|-------|---------|---------------|
| 1 | Video sent at 1 fps even when nothing changes | 1 fps always | Send at 1 fps for first 5s, then drop to 1 frame per 5s if no change detected |
| 2 | Audio encoding overhead | AudioWorklet PCM convert | Pre-encode audio at 16kHz in the browser (already done — fine) |
| 3 | No response timeout | Hangs indefinitely | Add 5s timeout; fall back to local coaching message |
| 4 | System prompt too verbose | Long paragraph | Shorter: "You are a terse fitness coach. 1-2 sentence responses. Prioritize speed." |
| 5 | No response caching | Every message gets fresh response | Cache "Keep your back straight!" type generic tips locally |

### 6.3 Local Coaching Fallbacks

Create a `localCoach.ts` service with instant responses:
- Form tips lookup table (exercise → tip)
- Motivational phrases (based on rep count milestones)
- "Sitting too long" alerts (based on static pose timer)

**Workflow:**
1. Local coach fires immediately (0ms latency) for basic feedback
2. If Gemini is connected, also send Gemini response on top (may arrive 2-5s later)
3. If Gemini fails or is slow, local coach covers the gap

### 6.4 "Sitting Too Long" Alerts

**Where:** `localCoach.ts` + `GeminiLiveClient` + notification API

**Threshold:** 30 minutes of continuous sitting (configurable).

**Trigger path:**
```
staticPoseDetector detects 'sitting' for 30+ continuous minutes
    ├── Browser Notification API → system tray alert
    ├── In-app overlay → "Time to move! 🚶 Suggested: 5 min walking"
    └── Gemini voice → coach says "Stand up and walk around for a minute!"
```

---

## 7. Calorie-Burning Suggestions Spec

### 7.1 Data Sources

| Source | What it provides | Where it lives |
|--------|-----------------|----------------|
| User Profile | weightKg, age, activityLevel, biologicalSex, BMR, TDEE, dailyCalorieTarget | `profileController.ts` → MongoDB `User` model |
| Workout History | past exercises, durations, calories burned, intensities | `WorkoutSession` model |
| Real-time Metrics | current exercise, reps, intensity, calories, elapsed time | `WorkoutMetrics` from classifier |
| Static Pose | standing/sitting/lying state + duration | `staticPoseDetector.ts` (new) |

### 7.2 Suggestion Types

#### Type A: Exercise Form Tips (Real-time, Workout Page)
- Based on detected exercise → show form tips stored in local lookup
- "Try slowing down your descent for 30% more calorie burn"
- "Engage your core — this activates 15% more muscle fibers"

#### Type B: Exercise Recommendations (Dashboard, Pre-workout)
- Based on user's historical data + daily calorie target
- "You're 300 kcal short of your daily target. A 10-min HIIT session would cover that."
- "You haven't done push-ups in 3 days. Add 3 sets to today's routine."

#### Type C: Workout Structure Ideas (Dashboard, Pre-workout)
- "Today's suggested split: 5min warmup → 15min HIIT → 10min strength → 5min cooldown"
- Based on user's BMR/TDEE and past session patterns

#### Type D: Sedentary Alerts (Dashboard + Notification + Gemini)
- Based on static pose detector showing prolonged sitting
- "You've been sitting for 45 minutes. Stand up and do 10 jumping jacks!"

### 7.3 UI Locations

**Dashboard (`Dashboard.tsx`):**
- New card: "🔥 Today's Burn Recommendations"
- Shows top 3 suggested exercises with estimated calorie burn
- Shows daily progress toward calorie target with suggested remaining exercises

**Workout Page (`Workout.tsx`):**
- New section in coach sidebar: "💡 Burn Boost Tips"
- Shows real-time form tips for current exercise
- Shows calorie burn rate and comparison to optimal

**Notification:**
- Browser Notification API for sedentary alerts
- Configurable interval (e.g., every 30 min of sitting)

### 7.4 Backend: Suggestion Engine

**New file:** `backend-node/src/services/suggestionEngine.ts`

**Endpoints:**

```
GET /api/suggestions/daily
  Query: userId, targetCalories, date
  Response: { suggestions: Suggestion[], totalCaloriesBurned }
  
GET /api/suggestions/exercise-tip?exercise={type}
  Response: { exercise, tips: string[], optimalFormCues: string[] }
  
POST /api/suggestions/check-sedentary
  Body: { userId, sedentaryMinutes, currentPose }
  Response: { alert: boolean, suggestion: string, exerciseRecommendation: string }
```

### 7.5 Suggestion Scoring Algorithm

```
For each available exercise:
    estimatedBurn = MET(exercise) × 3.5 × weight_kg / 200 × recommendedDuration
    
    score = 
        (calorieRemaining / estimatedBurn) × 0.4 +    // How well it fills the gap
        (userHasDoneExerciseRecently ? 0 : 0.3) +      // Variety bonus
        (exerciseWorksUnderutilizedMuscles ? 0.3 : 0)   // Muscle group rotation

Return top 3 exercises by score
```

---

## 8. Implementation Phases

### Phase 1: Bug Fixes + Profiling (Day 1-2)
- [ ] Fix stale closures in rep counting (#1, #2)
- [ ] Fix voice coach double-connect (#4)
- [ ] Consolidate timer (#5)
- [ ] Add real chart data (#6)
- [ ] Make WebSocket URL configurable (#8)
- [ ] Add Gemini connection timeout (#11)
- [ ] Add performance profiling markers

### Phase 2: Static Pose Detection (Day 2-3)
- [ ] Create `staticPoseDetector.ts` service
- [ ] Integrate into `Workout.tsx` tracking loop
- [ ] Add UI badges and labels
- [ ] Wire up periodic Gemini background check
- [ ] Implement debounce/cooldown logic

### Phase 3: Local Coach + Gemini Hybrid (Day 3-4)
- [ ] Create `localCoach.ts` with instant tip lookup
- [ ] Add form tip data (exercise → tip mapping)
- [ ] Implement Gemini latency fallback
- [ ] Add Gemini prompt optimization (shorter system prompt, cooldowns)
- [ ] Add response timeout handling

### Phase 4: Calorie Suggestions + Alerts (Day 4-5)
- [ ] Create `suggestionEngine.ts` backend service
- [ ] Add Dashboard suggestion card
- [ ] Add Workout burn boost tips
- [ ] Implement "sitting too long" detection+alert pipeline
- [ ] Add browser notification integration
- [ ] Add Gemini voice alerts for sedentary time

### Phase 5: Optimization + Polish (Day 5-6)
- [ ] Apply performance optimizations based on profiling data
- [ ] Fine-tune LSTM inference frequency
- [ ] Test end-to-end latency improvements
- [ ] Edge case testing (no camera, no Gemini key, mobile-only sessions)

---

## 9. Edge Cases & Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Gemini API key not configured | High (hackathon) | Critical | Proper error messages, graceful fallback to local coach only |
| No camera / camera permission denied | Medium | High | Show meaningful UI state, allow manual exercise logging |
| Low light / poor pose detection | Medium | Medium | Show "low visibility" warning, fall back to IMU-only mode |
| Static pose flickers between states | High | Low | 3-frame debounce window |
| User switches browser tabs mid-workout | Medium | Medium | Continue background detection, show reconnection UI |
| Multiple users in camera frame | Low | Medium | Currently SINGLEPOSE_LIGHTNING — ignore extra people, log warning |
| Browser tab memory pressure (long sessions) | Medium | Low | Periodic cleanup of debug logs, frame buffer management |
| Gemini audio response not playing (autoplay policy) | Medium | Medium | Handle AudioContext resume on user gesture |

---

## 10. Files to be Created / Modified

### New Files

| File | Description |
|------|-------------|
| `frontend/src/services/staticPoseDetector.ts` | Real-time standing/sitting/lying detector from MoveNet keypoints |
| `frontend/src/services/localCoach.ts` | Instant local coaching tips, form cues, motivational phrases |
| `frontend/src/services/suggestionEngine.ts` (or backend) | Calorie/exercise suggestion logic |
| `backend-node/src/services/suggestionEngine.ts` | Backend API for daily suggestions and sedentary checks |

### Modified Files

| File | Changes |
|------|---------|
| `frontend/src/services/classifierEngine.ts` | Add performance profiling markers, optional frame skipping |
| `frontend/src/services/geminiLive.ts` | Add connection timeout, periodic background check, configurable URL, blob URL cleanup |
| `frontend/src/pages/Workout.tsx` | Fix stale closures, consolidate timer, add static pose UI, add burn boost tips, fix chart data |
| `frontend/src/pages/Dashboard.tsx` | Add "Today's Burn Recommendations" card, sedentary alerts |
| `frontend/src/types/index.ts` | Add `StaticPose` type, `Suggestion` type, `LocalCoachMessage` type |
| `backend-node/src/services/geminiLiveService.ts` | Add shorter/faster system prompt option, connection timeout |
| `backend-node/src/controllers/workoutController.ts` | (Optional) Add endpoint for suggestion-based queries |

---

## 11. Acceptance Criteria

1. **Static Pose Detection**: App displays correct standing/sitting/lying state with ≥90% accuracy in good lighting
2. **Gemini Speed**: Audio coaching response received within 5s of video frame sent
3. **Hybrid Coach**: Local instant tips appear within 100ms; Gemini tips supplement within 5s
4. **Calorie Suggestions**: Dashboard shows 3 personalized exercise recommendations based on profile + history
5. **Sedentary Alerts**: After 30 min of detected sitting, user receives a notification + in-app overlay + Gemini voice alert
6. **Bug Fixes**: Steps 1–5 work without console errors, memory leaks, or timer conflicts
7. **Performance**: Pose detection runs at ≥20fps on a mid-range laptop (baseline: current measured FPS)

---

## 12. Appendix: Profiling Measurement Plan

Before any optimization, run this profiling procedure:

1. Open `localhost:5173/workout`
2. Start camera + start workout loop
3. Let it run for 60 seconds performing squats/push-ups
4. Export `performance.now()` measurements from console
5. Log every 100th frame's timing breakdown

**Key metrics to collect:**
- Average MoveNet inference time (ms)
- Average LSTM inference time (ms)
- Average total frame loop time (ms)
- Min/max FPS
- Memory usage (Chrome DevTools Performance tab)
- Frame drops count

---

*End of spec. No code changes have been made.*
