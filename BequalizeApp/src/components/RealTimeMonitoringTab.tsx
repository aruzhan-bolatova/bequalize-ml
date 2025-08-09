import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Alert,
  TouchableOpacity,
} from 'react-native';

// Components
import SensorDataDisplay from './SensorDataDisplay';

// Services
import { EnhancedMockBluetoothManager } from '../services/EnhancedMockBluetoothManager';
import { VestibularFeatureExtractor } from '../algorithms/VestibularFeatureExtractor';
import { SignalProcessor } from '../algorithms/SignalProcessor';

// Types
import { 
  SensorDataPacket, 
  PosturalFeatures, 
  RespiratoryMetrics,
} from '../types/SensorData';

interface RealTimeMonitoringTabProps {
  bluetoothManager: EnhancedMockBluetoothManager;
  isConnected: boolean;
  latestPacket: SensorDataPacket | null;
}

interface MonitoringState {
  isMonitoring: boolean;
  sensorBuffer: SensorDataPacket[];
  currentFeatures: PosturalFeatures | null;
  currentRespiratoryMetrics: RespiratoryMetrics | null;
  monitoringStartTime: number | null;
  totalSamples: number;
}

const RealTimeMonitoringTab: React.FC<RealTimeMonitoringTabProps> = ({
  bluetoothManager,
  isConnected,
  latestPacket
}) => {
  // Monitoring state
  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
    isMonitoring: false,
    sensorBuffer: [],
    currentFeatures: null,
    currentRespiratoryMetrics: null,
    monitoringStartTime: null,
    totalSamples: 0,
  });

  // Services
  const featureExtractor = useRef(new VestibularFeatureExtractor());
  const signalProcessor = useRef(new SignalProcessor());

  // Buffer management constants
  const BUFFER_SIZE = 250; // 5 seconds at 50Hz

  // Add sensor data to buffer and compute features
  useEffect(() => {
    if (monitoringState.isMonitoring && latestPacket) {
      const nextBuffer = [...monitoringState.sensorBuffer.slice(-BUFFER_SIZE + 1), latestPacket];

      // Convert to IMU and compute features
      const imuData = nextBuffer.map(packet => ({
        timestamp: packet.timestamp,
        roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
        pitch: Math.atan2(-packet.accelerometer.x, 
          Math.sqrt(packet.accelerometer.y ** 2 + packet.accelerometer.z ** 2)
        ) * (180 / Math.PI),
        yaw: 0,
        accel: packet.accelerometer,
        gyro: packet.gyroscope
      }));

      const posturalFeatures = featureExtractor.current.extractPosturalFeatures(imuData);
      const elastometerValues = nextBuffer.map(p => p.elastometer_value);
      const respiratoryMetrics = signalProcessor.current.processRespiratorySignal(elastometerValues);

      setMonitoringState(prev => ({
        ...prev,
        sensorBuffer: nextBuffer,
        totalSamples: prev.totalSamples + 1,
        currentFeatures: posturalFeatures,
        currentRespiratoryMetrics: respiratoryMetrics,
      }));
    }
  }, [latestPacket, monitoringState.isMonitoring]);

  const startMonitoring = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your Bequalize Belt first.');
      return;
    }

    setMonitoringState(prev => ({
      ...prev,
      isMonitoring: true,
      monitoringStartTime: Date.now(),
      sensorBuffer: [],
      totalSamples: 0,
    }));
  };

  const stopMonitoring = () => {
    setMonitoringState(prev => ({
      ...prev,
      isMonitoring: false
    }));
  };

  const formatDuration = (startTime: number): string => {
    const duration = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderMonitoringControls = () => (
    <View style={styles.controlsCard}>
      <Text style={styles.cardTitle}>Real-time Monitoring</Text>
      <Text style={styles.statusText}>
        Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </Text>

      {monitoringState.isMonitoring ? (
        <View style={styles.activeMonitoring}>
          <Text style={styles.monitoringTitle}>📊 Active Monitoring</Text>
          <Text style={styles.monitoringStats}>
            ⏱️ Duration: {monitoringState.monitoringStartTime ? 
              formatDuration(monitoringState.monitoringStartTime) : '0:00'}
          </Text>
          <Text style={styles.monitoringStats}>
            📊 Samples: {monitoringState.totalSamples}
          </Text>
          
          <TouchableOpacity
            style={styles.stopButton}
            onPress={stopMonitoring}
          >
            <Text style={styles.stopButtonText}>⏹️ Stop Monitoring</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.startButton, !isConnected && styles.disabledButton]}
          onPress={startMonitoring}
          disabled={!isConnected}
        >
          <Text style={styles.startButtonText}>▶️ Start Real-time Monitoring</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFeatures = () => {
    if (!monitoringState.currentFeatures || !monitoringState.currentRespiratoryMetrics) return null;

    const postural = monitoringState.currentFeatures;
    const respiratory = monitoringState.currentRespiratoryMetrics;

    return (
      <View style={styles.featuresCard}>
        <Text style={styles.cardTitle}>📊 Current Features</Text>
        
        <View style={styles.featureSection}>
          <Text style={styles.sectionTitle}>Postural Features</Text>
          <Text style={styles.featureText}>Sway Area: {postural.swayArea.toFixed(2)} cm²</Text>
          <Text style={styles.featureText}>Path Length: {postural.swayPathLength.toFixed(1)} cm</Text>
          <Text style={styles.featureText}>Stability: {(postural.stabilityIndex * 100).toFixed(0)}%</Text>
          <Text style={styles.featureText}>Sway Velocity: {postural.swayVelocity.toFixed(2)} cm/s</Text>
        </View>

        <View style={styles.featureSection}>
          <Text style={styles.sectionTitle}>Respiratory Features</Text>
          <Text style={styles.featureText}>Rate: {respiratory.breathingRate.toFixed(1)} BPM</Text>
          <Text style={styles.featureText}>Amplitude: {respiratory.breathingAmplitude.toFixed(1)}</Text>
          <Text style={styles.featureText}>Regularity: {(respiratory.breathingRegularity * 100).toFixed(0)}%</Text>
          <Text style={styles.featureText}>I/E Ratio: {respiratory.ieRatio.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Real-time Monitoring</Text>
        <Text style={styles.subtitle}>
          Live sensor data analysis (features only)
        </Text>
      </View>

      {renderMonitoringControls()}

      {/* Current Sensor Data */}
      {latestPacket && (
        <View style={styles.sensorCard}>
          <Text style={styles.cardTitle}>📡 Live Sensor Data</Text>
          <SensorDataDisplay packet={latestPacket} />
        </View>
      )}

      {renderFeatures()}

      {/* Buffer Status */}
      {monitoringState.isMonitoring && (
        <View style={styles.bufferCard}>
          <Text style={styles.cardTitle}>📊 Data Buffer</Text>
          <Text style={styles.bufferText}>
            Buffer: {monitoringState.sensorBuffer.length}/{BUFFER_SIZE} samples
          </Text>
          <Text style={styles.bufferText}>
            Fill: {((monitoringState.sensorBuffer.length / BUFFER_SIZE) * 100).toFixed(0)}%
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    backgroundColor: '#fff',
    marginBottom: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 22,
  },
  controlsCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
  },
  activeMonitoring: {
    alignItems: 'center',
    marginTop: 16,
  },
  monitoringTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#28a745',
    marginBottom: 12,
  },
  monitoringStats: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 4,
  },
  startButton: {
    backgroundColor: '#28a745',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sensorCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  featureText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  bufferCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bufferText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
});

export default RealTimeMonitoringTab; 