# Bequalize Belt – Vestibular Health Monitoring (React Native)

A React Native (Expo) application that simulates and visualizes vestibular health signals collected by the Bequalize Belt. The app provides balance testing (pre/post), breathing exercise guidance with feedback, and a real-time monitoring view showing computed features.

## 🎯 Goal
Deliver a mobile app that:
- Simulates Bequalize Belt sensor streams at 50 Hz (accelerometer, gyroscope, elastometer, temperature, battery, button state)
- Guides users through clinically-inspired balance testing with pre/post comparisons
- Provides structured breathing exercises with real-time feedback
- Displays live features and insights in a real-time monitoring view

## ✅ What’s been achieved
- Robust mock sensor engine with condition- and exercise-specific behavior
- Balance testing workflow (pre-test → exercise → post-test → comparison/results)
- Confidence ellipse computation and postural sway visualization
- Breathing exercises with phase-based mock elastometer signal, difficulty control, and live feedback
- Real-time monitoring view (features-only after ML removal)
- Local storage of test sessions and comparisons
- Clean, typed codebase with modular services and algorithms

## 🗂️ App Structure
```
BequalizeApp/
├── App.tsx                          # App shell: tab navigation, connection state
├── index.js                         # Expo entry
├── src/
│  ├── components/
│  │  ├── BalanceTestingTab.tsx      # Balance test protocol UI and flow
│  │  ├── BreathingExerciseTab.tsx   # Breathing sessions, feedback display & debug
│  │  ├── BreathingFeedbackDisplay.tsx# Feedback UI for breathing sessions
│  │  ├── PosturalSwayVisualization.tsx # SVG-based sway + ellipse visualization
│  │  ├── RealTimeMonitoringTab.tsx  # Live features (postural + respiratory)
│  │  └── TestRetestVisualization.tsx# Pre/Post charts, insights, longitudinal view
│  ├── services/
│  │  ├── EnhancedMockBluetoothManager.ts # 50 Hz mock sensor generator (breathing+balance)
│  │  ├── TestRetestManager.ts       # Session storage, comparison, longitudinal analytics
│  │  ├── LocalStorageService.ts     # AsyncStorage wrapper
│  │  └── RealTimeProcessor.ts       # (Support) Real-time feature extraction helpers
│  ├── algorithms/
│  │  ├── VestibularFeatureExtractor.ts   # Postural features + ellipse area
│  │  └── SignalProcessor.ts         # Respiratory signal processing utilities
│  ├── ml/
│  │  ├── DataPreparation.ts         # (Not used at runtime) data prep helpers
│  │  ├── ModelTrainer.ts            # (Not used at runtime) training helpers
│  │  └── VestibularMLModel.ts       # (Removed from app flow)
│  └── types/
│     └── SensorData.ts              # Centralized TypeScript types
└── package.json, tsconfig.json, app.json, metro.config.js
```

Note: ML model initialization and prediction were removed from the app flow. The Real-time Monitoring tab now displays features only.

## 🧭 Workflows

### 1) Balance Testing
- Setup → Pre-test (30s) → Exercise selection → Exercise → Post-test (30s) → Results
- Pre/Post test windows collect `SensorDataPacket`s at 50 Hz
- `TestRetestManager.completeTestSession` computes features and stores sessions
- `TestRetestManager.comparePrePostSessions` computes change and clinical interpretation
- `TestRetestVisualization` displays pre/post charts, sway visualizations, and longitudinal insights

### 2) Breathing Exercises
- Choose exercise (diaphragmatic, box, coherence, relaxation)
- Starts breathing session via `BreathingFeedbackManager`
- Mock elastometer signal is phase-accurate and exercise-specific using `EnhancedMockBluetoothManager`
- Real-time feedback shows phase, deviation, severity, and recommendations (`BreathingFeedbackDisplay`)
- Difficulty control changes regularity/effort; debug panel shows live status & sensor values

### 3) Real-time Monitoring (features only)
- Start monitoring to fill a sliding buffer of sensor data
- On each new packet, compute:
  - IMU orientation → CoP displacement → postural features (`VestibularFeatureExtractor`)
  - Respiratory metrics from elastometer signal (`SignalProcessor`)
- Display current feature values; show buffer fill status

## 🔢 Algorithms and Key Formulas

- Orientation from accelerometer:
  - Roll (deg): `atan2(accel.y, accel.z) * 180/π`
  - Pitch (deg): `atan2(-accel.x, sqrt(accel.y^2 + accel.z^2)) * 180/π`
- Approximate center-of-pressure displacement (assuming torso-mounted device):
  - `copX = roll_deg * (DEVICE_HEIGHT_CM * π / 180) / 100`
  - `copY = pitch_deg * (DEVICE_HEIGHT_CM * π / 180) / 100`
- Sway path length: `∑ sqrt(Δx^2 + Δy^2)`
- Sway velocity: mean step distance / dt
- 95% confidence ellipse area:
  - Covariance of CoP → eigenvalues `λ1, λ2`
  - `area = π * sqrt(λ1 * λ2 * χ²_0.95)` with `χ²_0.95 = 5.991`
  - Rotation: `θ = atan2(2*covXY, covXX - covYY) / 2`
- Clinical thresholds:
  - Normal sway area: 10–20 cm²; Pathological: >50 cm²
- Improvement categorization (post vs pre):
  - Percentage change = `(post - pre)/pre * 100`
  - Thresholds: significant_improvement ≤ -25%, improvement ≤ -10%, deterioration ≥ 10%, significant_deterioration ≥ 25%
- Breathing mock generation:
  - Phase-eased envelopes (inhale/hold/exhale/rest)
  - Exercise-specific modifiers (deep/controlled/coherent/relaxation)
  - User effort and regularity modulate amplitude and smoothness

## ⚙️ Setup & Run

### Prerequisites
- Node.js 18+
- Yarn or npm
- Xcode (iOS) or Android Studio (Android) if running on simulator/device

### Install
```bash
cd BequalizeApp
npm install
```

### Start (Expo)
```bash
npx expo start --clear
# press i for iOS simulator, a for Android, or scan QR in Expo Go
```

### Project Scripts
- `npx expo start --clear` – start the app fresh
- `npm run type-check` – run the TypeScript compiler (if configured)

## 🔍 Notes
- Sensor streams are simulated by `EnhancedMockBluetoothManager` at 50 Hz.
- ML integration has been removed from the runtime path; the monitoring tab focuses on feature computation and display.
- Test/demo artifacts and legacy web demo were removed to simplify the app.

If you want a PDF or slide-ready summary of goals, workflows, and formulas, I can generate that too. 