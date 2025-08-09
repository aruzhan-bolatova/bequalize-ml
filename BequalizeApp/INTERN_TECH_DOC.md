# Bequalize Belt App – Technical Documentation (Intern Report)

Hi! This is a detailed write‑up of the Bequalize Belt React Native app as I implemented/refactored it. I explain what the app does, how it’s structured, the workflows, and the algorithms/formulas I used. I also added setup instructions and notes on how to extend the system.

---

## 1) Goals
- Build a mobile app (React Native + Expo) that simulates the Bequalize Belt sensor stream at 50 Hz and demonstrates key clinical user flows.
- Implement balance testing with pre/post assessment, store sessions locally, and visualize change.
- Provide structured breathing exercises with real-time feedback, debugging tools, and difficulty controls.
- Offer a real-time monitoring view to display computed features for posture and breathing (we removed ML inference from runtime for now to simplify).

---

## 2) What has been achieved
- A robust mock sensor generator (`EnhancedMockBluetoothManager`) that simulates realistic accelerometer, gyroscope, elastometer (breathing), temperature, battery, and button states at 50 Hz.
- Balance testing workflow (pre → exercise selection → exercise → post → results) with storage, comparison, and visualization.
- Phase-accurate breathing exercises with live feedback, user effort/difficulty, and a developer debug panel.
- Real-time monitoring view that computes and displays postural and respiratory features (no ML at runtime anymore).
- Cleaned up demo/test artifacts; simplified app structure and README.

---

## 3) App Structure & Responsibilities

```
BequalizeApp/
├── App.tsx                          # App shell: tab navigation, connection state
├── index.js                         # Expo entry
├── src/
│  ├── components/
│  │  ├── BalanceTestingTab.tsx      # Balance protocol UI & flow
│  │  ├── BreathingExerciseTab.tsx   # Breathing sessions, feedback, difficulty, debug
│  │  ├── BreathingFeedbackDisplay.tsx# Feedback UI for breathing guidance
│  │  ├── PosturalSwayVisualization.tsx # SVG visualization for sway + confidence ellipse
│  │  ├── RealTimeMonitoringTab.tsx  # Live features (postural + respiratory)
│  │  └── TestRetestVisualization.tsx# Pre/Post charts, longitudinal insights, sway compare
│  ├── services/
│  │  ├── EnhancedMockBluetoothManager.ts # 50 Hz mock sensor generator (breathing+balance)
│  │  ├── TestRetestManager.ts       # Session save/compare/insights, ellipse metrics
│  │  ├── LocalStorageService.ts     # AsyncStorage wrapper
│  │  └── RealTimeProcessor.ts       # (Support) feature extraction helpers
│  ├── algorithms/
│  │  ├── VestibularFeatureExtractor.ts   # Postural features + ellipse computation
│  │  └── SignalProcessor.ts         # Respiratory signal processing (rate, regularity, I:E)
│  ├── ml/
│  │  ├── DataPreparation.ts, ModelTrainer.ts, VestibularMLModel.ts # not used at runtime
│  └── types/
│     └── SensorData.ts              # Central TypeScript types
└── package.json, tsconfig.json, etc.
```

### App shell (`App.tsx`)
- Connects to the mock device via `EnhancedMockBluetoothManager`.
- Maintains `isConnected` and `latestPacket` state.
- Provides 3 tabs: Balance Testing, Breathing, Real-time Monitoring.
- ML initialization and use were removed; the app now shows features only in monitoring.

---

## 4) Workflows

### 4.1 Balance Testing
- Component: `src/components/BalanceTestingTab.tsx`
- Phases: setup → pre-test (30s) → exercise-selection → exercise → post-test (30s) → results
- During pre/post windows the tab collects `SensorDataPacket`s at 50 Hz from `EnhancedMockBluetoothManager`.
- On timer complete:
  1) `TestRetestManager.startTestSession()` then `completeTestSession()`
     - Convert raw accelerometer → IMU (roll, pitch)
     - Extract postural features via `VestibularFeatureExtractor`
     - Compute sway path and 95% confidence ellipse parameters
     - Store session in `LocalStorageService`
  2) If we just completed a post-test, compare with the saved pre-test:
     - Compute absolute and percentage change in ellipse area
     - Categorize improvement/deterioration and generate clinical interpretation + recommendations
  3) Render results using `TestRetestVisualization.tsx`
     - Pre/post ellipse areas and trends
     - Sway visualizations (pre vs post) via `PosturalSwayVisualization.tsx`
     - Longitudinal charts and insights

### 4.2 Breathing Exercises
- Component: `src/components/BreathingExerciseTab.tsx`
- Exercises: diaphragmatic, box breathing, coherence, relaxation
- Starts a `BreathingFeedbackManager` session and synchronizes elastometer generation with `EnhancedMockBluetoothManager`:
  - `startBreathingExercise(type, targetRate)` to initialize exercise-specific cadence
  - `setBreathingPhase('inhale'|'hold'|'exhale'|'rest')` as the UI phases progress
  - `simulateBreathingDifficulty('easy'|'medium'|'hard')` to adjust regularity/effort
  - `setBreathingEffort()` dynamically based on feedback success
- Real-time feedback loop:
  - Build respiratory metrics from elastometer values (rate, amplitude, I:E ratio, regularity)
  - `BreathingFeedbackManager.processBreathingData()` returns deviations and messages
  - `BreathingFeedbackDisplay.tsx` renders: current phase, feedback, rate deviation bar, session stats
  - Optional debug panel shows breathing status, sensor values, and feedback metrics

### 4.3 Real-time Monitoring (Features‑only)
- Component: `src/components/RealTimeMonitoringTab.tsx`
- Maintains a sliding buffer of recent `SensorDataPacket`s
- Computes:
  - Postural features via `VestibularFeatureExtractor`
  - Respiratory metrics via `SignalProcessor.processRespiratorySignal`
- Displays current feature values and buffer status.
- Note: ML inference was removed to simplify; ML files remain in `src/ml/` but are not loaded.

---

## 5) Underlying Algorithms & Formulas

### 5.1 Orientation (from accelerometer)
- Roll (deg): `roll = atan2(accel.y, accel.z) * 180/π`
- Pitch (deg): `pitch = atan2(-accel.x, sqrt(accel.y^2 + accel.z^2)) * 180/π`

### 5.2 Approximate Center‑of‑Pressure (CoP) Displacement
Assuming the device is torso‑mounted with height `DEVICE_HEIGHT_CM`:
- `copX = roll_deg * (DEVICE_HEIGHT_CM * π / 180) / 100`
- `copY = pitch_deg * (DEVICE_HEIGHT_CM * π / 180) / 100`

### 5.3 Sway Path & Velocity
- Sway path length: `∑ sqrt(Δx^2 + Δy^2)`
- Mean sway velocity: (mean step distance) / `dt`

### 5.4 95% Confidence Ellipse Area
From the CoP covariance:
- Covariance matrix terms: `covXX, covYY, covXY`
- Eigenvalues: `λ1, λ2 = (trace ± sqrt(trace^2 − 4·det)) / 2`
- Ellipse area (cm²): `area = π · sqrt(λ1 · λ2 · χ²_0.95)` with `χ²_0.95 = 5.991`
- Rotation: `θ = atan2(2·covXY, covXX − covYY) / 2`

### 5.5 Clinical Thresholds & Categorization
- Normal ellipse area: 10–20 cm²; Pathological: >50 cm²
- Percentage change: `(postArea − preArea) / preArea · 100`
- Categories:
  - significant_improvement ≤ −25%
  - improvement ≤ −10%
  - stable otherwise
  - deterioration ≥ 10%
  - significant_deterioration ≥ 25%

### 5.6 Breathing Signal (Mock)
- Normal breathing: duty‑asymmetric inspiration/expiration
- Breathing exercises:
  - Phase‑specific envelopes with easing curves + micro‑variation per phase
  - Exercise‑specific modifiers (deep abdominal vs. controlled vs. coherent vs. relaxation)
  - User effort and regularity shape the amplitude and smoothness
- Breathing quality (0–1): combines rate proximity to ideal (12–20 BPM), regularity, and I:E ratio (~0.5–0.6)

---

## 6) Mock Data Generator Highlights (`EnhancedMockBluetoothManager`)
- 50 Hz packet generation (accelerometer/gyroscope/elastometer/temperature/battery/buttons)
- Vestibular condition simulation affects sway amplitude/frequency and added patterns
- Breathing exercise simulator:
  - `startBreathingExercise(type, targetRate)` to define cadence
  - `setBreathingPhase(...)` to align with UI phase
  - `simulateBreathingDifficulty(...)` and `setBreathingEffort(...)` to vary performance realism
  - Phase‑aware elastometer waveform with exercise‑specific modifiers and noise

---

## 7) Storage & Persistence (`LocalStorageService`)
- Sessions key: `bequalize_test_sessions`
- Comparisons key: `bequalize_session_comparisons`
- CRUD helpers for sessions/comparisons
- Used by `TestRetestManager` for saving sessions and generating longitudinal insights

---

## 8) Setup & Run (Expo)

### Prerequisites
- Node.js 18+
- Xcode (iOS) or Android Studio (Android) for simulators

### Install & Start
```bash
cd BequalizeApp
npm install
npx expo start --clear
# press i for iOS simulator, a for Android emulator, or scan QR in Expo Go
```

---

## 9) Notes, Limitations, and Next Steps
- ML inference was removed from runtime to reduce complexity; monitoring now shows features only. ML scaffolding remains in `src/ml/` for future work.
- Demo/test artifacts and web demo were removed to keep the app focused and lighter.
- The mock generator is intentionally parameterized for easy extension (e.g., new conditions, new breathing exercises).
- Next logical steps:
  - Re‑enable ML inference pipeline (e.g., TFLite/ONNX) if required, using the features already computed.
  - Add export/sharing for sessions and comparisons.
  - Add typed interfaces for breathing debug/status to further strengthen type safety.

---

## 10) File Pointers (quick reference)
- App shell: `App.tsx`
- Balance testing: `src/components/BalanceTestingTab.tsx`
- Test/Retest management: `src/services/TestRetestManager.ts`
- Sway visualization: `src/components/PosturalSwayVisualization.tsx`
- Results visualization: `src/components/TestRetestVisualization.tsx`
- Breathing tab: `src/components/BreathingExerciseTab.tsx`
- Breathing feedback: `src/services/BreathingFeedbackManager.ts`, `src/components/BreathingFeedbackDisplay.tsx`
- Real-time monitoring (features): `src/components/RealTimeMonitoringTab.tsx`
- Mock device: `src/services/EnhancedMockBluetoothManager.ts`
- Algorithms: `src/algorithms/VestibularFeatureExtractor.ts`, `src/algorithms/SignalProcessor.ts`

If you have any questions or want me to add diagrams/screenshots, I’m happy to extend this document. 🙌 