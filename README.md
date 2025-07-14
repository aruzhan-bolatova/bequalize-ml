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
├── demo.html                       # Web demo for immediate testing
├── test-setup.js                   # Validation test script
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── README.md                       # This file
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v16 or later)
- Web browser (for immediate demo)
- React Native CLI (for mobile development - optional)

### Quick Start (Web Demo)

**The fastest way to see the project working:**

1. **Navigate to project directory:**
   ```bash
   cd BequalizeApp
   ```

2. **Install dependencies:**
   ```bash
   npm install --legacy-peer-deps
   ```

3. **Run validation tests:**
   ```bash
   node test-setup.js
   ```

4. **Open web demo for phase 1 demo:**
   ```bash
   open demo.html
   ```
   Or manually open `demo.html` in your browser to see the live simulation!

### React Native Development Setup (Advanced)

For full React Native mobile development, you'll need to set up the complete environment:

**Run on device/simulator:**
   ```bash
   # For iOS (requires Xcode and iOS Simulator) 
   # For Android (requires Android Studio and Emulator)
   npx expo start --clear
   ```

### Available Scripts

- **`npm run type-check`** - Check TypeScript compilation
- **`node test-setup.js`** - Run project validation tests
- **`open demo.html`** - Open web demo in browser
- **`npx expo start --clear --ios`** - Run on iOS 
- **`npx expo start --clear --android`** - Run on Android 

## 🌐 Web Demo Features

**The web demo (`demo.html`) provides immediate access to:**

- ✅ **Real-time sensor data** at 50Hz
- ✅ **Vestibular condition simulation** (Healthy, BPPV, UVH, BVL)
- ✅ **Interactive exercise controls** (Connect, Start/Stop Exercise, Calibrate)
- ✅ **Live breathing visualization** with animated progress bars
- ✅ **Realistic sensor patterns** matching clinical conditions
- ✅ **Session tracking** with data point counting

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

### Web Demo Testing:
1. **Open `demo.html`** in your browser
2. **Click "Connect Device"** → See realistic sensor data flowing at 50Hz
3. **Click "Start Exercise"** → Watch data collection with real-time counters
4. **Try different conditions** → "BPPV", "UVH", "BVL" buttons show different sway patterns
5. **Observe breathing patterns** → Green bar shows elastometer-based breathing cycles

### Development Testing:
1. **Run validation:** `node test-setup.js`
2. **Type checking:** `npm run type-check`
3. **Code structure:** All TypeScript files compile without errors

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

## ⚠️ Current Status

- ✅ **Web Demo**: Fully functional - immediate testing available
- ✅ **TypeScript Code**: Complete and validated
- ✅ **Mock Data System**: Realistic clinical patterns
- ⚠️ **React Native**: Basic setup complete, requires full RN environment for mobile testing
- 🔄 **Next Phase**: Ready for signal processing and ML implementation

---

**Note**: This is a development version using mock data. The web demo provides immediate access to all core functionality. For full React Native mobile development, additional setup is required. The next phase will integrate with actual Bequalize Belt hardware and implement advanced ML algorithms for clinical assessment. 