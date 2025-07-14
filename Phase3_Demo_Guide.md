# Phase 3 ML Demo - Testing Guide

## 🚀 Getting Started

The Bequalize Belt app is now running with the Phase 3 ML demo integrated! Here's how to explore the machine learning capabilities:

### 1. Launch the App
- Metro server is running in the background
- Open your iOS Simulator or Android Emulator
- Or scan the QR code with Expo Go on your mobile device

### 2. Navigate to Phase 3 Demo
- On the main app screen, you'll see a purple button: **"🧠 View Phase 3 ML Demo"**
- Tap this button to enter the machine learning demonstration

## 🧠 Phase 3 ML Demo Features

### Training Simulation
1. **Start Training**: Tap "Start Training" to begin ML model training simulation
   - Watch real-time progress with accuracy and loss charts
   - Training runs for 50 epochs with early stopping
   - Generates 200+ synthetic training samples automatically
   - Shows training/validation accuracy curves

2. **Training Metrics**: Observe the following during training:
   - Current epoch progress
   - Training accuracy (blue line)
   - Validation accuracy (red line)
   - Model size and performance metrics

### Real-Time Predictions
1. **Condition Selection**: Use the dropdown to select different vestibular conditions:
   - Normal (healthy baseline)
   - BPPV (Benign Paroxysmal Positional Vertigo)
   - Vestibular Neuritis
   - Meniere's Disease
   - Bilateral Vestibular Loss
   - Unilateral Vestibular Loss
   - Vestibular Migraine

2. **Manual Prediction**: Tap "Make Prediction" to run inference on the selected condition

3. **Auto-Prediction Mode**: Toggle the switch to enable continuous predictions every 2 seconds

### Prediction Results Display
The demo shows comprehensive ML predictions:

#### Fall Risk Assessment
- **Risk Score**: 0-100% probability of fall risk
- **Confidence Level**: Model confidence in the prediction
- **Risk Factors**: Contributing factors identified by the model
- **Recommendations**: AI-generated safety recommendations

#### Symptom Prediction
- **Vertigo**: Probability of vertigo symptoms (0-100%)
- **Imbalance**: Probability of balance issues (0-100%) 
- **Nausea**: Probability of nausea symptoms (0-100%)
- **Confidence**: Overall symptom prediction confidence

#### Exercise Quality Assessment
- **Overall Score**: Exercise performance score (0-100)
- **Form Analysis**: Breakdown of posture, breathing, and stability
- **Improvement Areas**: Specific areas for enhancement
- **Next Progression**: Recommended next exercise level

### Advanced Features
1. **Advanced Metrics Toggle**: Enable to see detailed technical metrics
2. **Processing Time**: Real-time inference latency (target: <100ms)
3. **Model Information**: Model size, architecture details

## 🔬 What's Happening Behind the Scenes

### Data Flow
1. **Sensor Simulation**: EnhancedMockBluetoothManager generates realistic sensor data
2. **Feature Extraction**: VestibularFeatureExtractor processes raw sensor data into ML features
3. **ML Inference**: VestibularMLModel performs multi-task predictions
4. **Real-Time Display**: Results update in real-time with confidence intervals

### Machine Learning Architecture
- **Input**: 32-dimensional feature vector
  - 16 postural features (sway metrics, stability)
  - 8 respiratory features (breathing patterns)
  - 4 temporal features (exercise duration)
  - 4 demographic features (age, severity)

- **Model**: Multi-task neural network
  - Shared layers: Dense(128) → Dropout → Dense(64)
  - Three specialized heads for different predictions
  - Optimized for mobile deployment (<5MB)

- **Output**: Three simultaneous predictions
  - Fall risk classification
  - Symptom multi-label prediction
  - Exercise quality regression

## 📊 Expected Results

### Training Performance
- **Training Accuracy**: Should reach 85-95% after 20-30 epochs
- **Validation Accuracy**: Should stabilize around 80-90%
- **Training Time**: ~30-60 seconds for full training simulation

### Prediction Accuracy
Different conditions will show characteristic patterns:
- **Normal**: Low fall risk, minimal symptoms, high exercise quality
- **BPPV**: Moderate fall risk, high vertigo probability
- **Bilateral Loss**: High fall risk, poor stability scores
- **Meniere's**: Variable symptoms with episodic patterns

### Performance Metrics
- **Inference Time**: <100ms per prediction
- **Model Size**: <5MB for mobile deployment
- **Memory Usage**: Optimized with automatic tensor disposal

## 🎯 Testing Scenarios

### Scenario 1: Training Validation
1. Start training and observe convergence
2. Check that validation accuracy doesn't overfit
3. Verify early stopping triggers if enabled

### Scenario 2: Condition Comparison
1. Test predictions on "normal" condition
2. Switch to "bilateral_loss" condition
3. Compare fall risk scores (should be much higher)

### Scenario 3: Real-Time Performance
1. Enable auto-prediction mode
2. Switch between different conditions
3. Observe how predictions adapt in real-time

### Scenario 4: Feature Sensitivity
1. Try different vestibular conditions
2. Note how different symptoms are predicted
3. Observe confidence levels for each condition

## 🐛 Troubleshooting

### Common Issues
- **Slow Performance**: Check device performance, try on simulator
- **Training Fails**: Restart the demo, ensure sufficient memory
- **No Predictions**: Verify model is loaded (check "Model Loaded" indicator)

### Performance Tips
- Use iOS Simulator for best performance
- Close other apps to free memory
- Enable "Advanced Metrics" to monitor performance

## 🎉 Success Indicators

You'll know the demo is working correctly when you see:
- ✅ Training charts showing converging accuracy curves
- ✅ Real-time predictions updating smoothly
- ✅ Different conditions producing different risk scores
- ✅ Processing times consistently under 100ms
- ✅ Confidence scores between 70-95%

## 🔄 Return to Main App

Use the "← Back to Main" button to return to the traditional sensor monitoring interface, where you can:
- Connect to mock Bluetooth device
- Record exercise sessions
- View real-time sensor data
- Test different vestibular condition simulations

---

**Phase 3 ML Demo represents a complete machine learning pipeline for vestibular health assessment, showcasing real-time inference, multi-task learning, and mobile optimization - all running live in your React Native app!** 🚀 