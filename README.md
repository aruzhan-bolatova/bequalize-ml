# Bequalize Belt - Vestibular Health Monitoring App

A React Native TypeScript application for monitoring vestibular health using the Bequalize Belt sensor device.

## 🏗️ Project Structure

```
BequalizeApp/
├── src/
│   ├── types/
│   │   └── SensorData.ts           # TypeScript type definitions
│   ├── services/
│   │   ├── EnhancedMockBluetoothManager.ts  # Mock sensor data generator
│   │   └── LocalStorageService.ts           # Data persistence service
│   └── components/
│       └── SensorDataDisplay.tsx            # Real-time sensor display
├── App.tsx                         # Main application component
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or later)
- React Native development environment
- iOS Simulator or Android Emulator

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **For iOS (macOS only):**
   ```bash
   cd ios && pod install && cd ..
   ```

3. **Start the Metro bundler:**
   ```bash
   npm start
   ```

4. **Run the app:**
   ```bash
   # For iOS
   npm run ios
   
   # For Android
   npm run android
   ```

## 📱 Features Implemented (Phase 1)

### ✅ Core Infrastructure
- **TypeScript Configuration**: Full TypeScript support with strict typing
- **Project Structure**: Organized folder structure following best practices
- **Sensor Data Types**: Complete type definitions based on documentation

### ✅ Mock Data System
- **Enhanced Mock Bluetooth Manager**: Realistic sensor data simulation
- **Vestibular Condition Simulation**: Different pathological patterns
  - Healthy Control
  - BPPV (Benign Paroxysmal Positional Vertigo)
  - Unilateral Vestibular Hypofunction
  - Bilateral Vestibular Loss
  - Vestibular Migraine
  - Meniere's Disease
  - Vestibular Neuritis

### ✅ Data Visualization
- **Real-time Sensor Display**: Live sensor data visualization
- **Device Status Monitoring**: Battery, connection, temperature
- **Multi-axis Data Display**: 3D accelerometer and gyroscope data
- **Respiratory Monitoring**: Elastometer breathing pattern display

### ✅ Data Persistence
- **Local Storage Service**: AsyncStorage-based session storage
- **Exercise Session Tracking**: Historical exercise data
- **Progress Analytics**: Basic trend analysis
- **Export/Import Functionality**: Data backup and restore

### ✅ User Interface
- **Connection Management**: Connect/disconnect to mock device
- **Exercise Controls**: Start/stop exercise sessions with calibration
- **Simulation Controls**: Switch between different vestibular conditions
- **Session History**: View past exercise sessions

## 🔧 Key Components

### SensorDataPacket
Follows the exact JSON format specified in the documentation:
```typescript
interface SensorDataPacket {
  timestamp: number;
  battery_percent: number;
  buttons_state: number;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
  elastometer_value: number;
  temperature_celsius: number;
}
```

### Mock Data Generator
- **50Hz sampling rate** as specified
- **Realistic sensor patterns** for different vestibular conditions
- **Calibration phase simulation** including belt stretch detection
- **Environmental factors** (temperature drift, battery drain)

## 🎯 Next Steps (Phase 2)

The foundation is now complete. The next phase will implement:

1. **Signal Processing Pipeline**
   - Complementary and Kalman filtering
   - IMU sensor fusion
   - Respiratory signal processing

2. **Feature Engineering**
   - Postural sway analysis
   - Breathing pattern recognition
   - Clinical assessment metrics

3. **Machine Learning Integration**
   - TensorFlow Lite model implementation
   - On-device inference
   - Clinical prediction algorithms

## 🔍 Testing the Application

1. **Connect to Mock Device**: Tap "Connect Device" to start data simulation
2. **Start Exercise**: Choose an exercise and tap "Start Exercise"
3. **Observe Real-time Data**: Watch sensor values update at 50Hz
4. **Switch Conditions**: Use simulation controls to test different vestibular patterns
5. **Save Sessions**: Exercise data is automatically saved locally
6. **View History**: Scroll down to see past exercise sessions

## 📊 Mock Data Features

- **Realistic Patterns**: Each vestibular condition has unique sway and breathing patterns
- **Noise Simulation**: Realistic sensor noise and artifacts
- **Battery Simulation**: Gradual battery drain during use
- **Temperature Variation**: Body temperature fluctuations
- **Button Press Simulation**: Random button state changes

## 🛠️ Development Notes

- **TypeScript Strict Mode**: All code written with strict typing
- **Documentation Compliance**: Follows original documentation specifications
- **Modular Architecture**: Clean separation of concerns
- **Error Handling**: Comprehensive error handling and user feedback
- **Performance Optimized**: Efficient data handling for real-time processing

## 📝 Configuration

The app uses the following key configurations:
- **Sample Rate**: 50Hz (20ms intervals)
- **Buffer Size**: 500 data points (10 seconds)
- **Data Format**: JSON as specified in documentation
- **Storage**: Local AsyncStorage for privacy

---

**Note**: This is a development version using mock data. The next phase will integrate with actual Bequalize Belt hardware and implement advanced ML algorithms for clinical assessment. 