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
import { VestibularMLModel } from '../ml/VestibularMLModel';
import { VestibularFeatureExtractor } from '../algorithms/VestibularFeatureExtractor';

// Types
import { 
  SensorDataPacket, 
  PosturalFeatures, 
  RespiratoryMetrics,
  FallRiskAssessment,
  ExerciseQualityScore,
  ModelPrediction
} from '../types/SensorData';

interface RealTimeMonitoringTabProps {
  bluetoothManager: EnhancedMockBluetoothManager;
  mlModel: VestibularMLModel | null;
  isMLModelReady: boolean;
  isConnected: boolean;
  latestPacket: SensorDataPacket | null;
}

interface MonitoringState {
  isMonitoring: boolean;
  sensorBuffer: SensorDataPacket[];
  lastPrediction: ModelPrediction | null;
  currentFeatures: PosturalFeatures | null;
  currentRespiratoryMetrics: RespiratoryMetrics | null;
  monitoringStartTime: number | null;
  totalSamples: number;
  predictionHistory: ModelPrediction[];
}

const RealTimeMonitoringTab: React.FC<RealTimeMonitoringTabProps> = ({
  bluetoothManager,
  mlModel,
  isMLModelReady,
  isConnected,
  latestPacket
}) => {
  // Monitoring state
  const [monitoringState, setMonitoringState] = useState<MonitoringState>({
    isMonitoring: false,
    sensorBuffer: [],
    lastPrediction: null,
    currentFeatures: null,
    currentRespiratoryMetrics: null,
    monitoringStartTime: null,
    totalSamples: 0,
    predictionHistory: []
  });

  // Services
  const featureExtractor = useRef(new VestibularFeatureExtractor());
  const predictionInterval = useRef<NodeJS.Timeout | null>(null);

  // Buffer management constants
  const BUFFER_SIZE = 250; // 5 seconds at 50Hz
  const PREDICTION_INTERVAL_MS = 2000; // Predict every 2 seconds

  // Add sensor data to buffer
  useEffect(() => {
    if (monitoringState.isMonitoring && latestPacket) {
      setMonitoringState(prev => ({
        ...prev,
        sensorBuffer: [...prev.sensorBuffer.slice(-BUFFER_SIZE + 1), latestPacket],
        totalSamples: prev.totalSamples + 1
      }));
    }
  }, [latestPacket, monitoringState.isMonitoring]);

  // Run ML predictions periodically
  useEffect(() => {
    if (monitoringState.isMonitoring && isMLModelReady && mlModel) {
      predictionInterval.current = setInterval(() => {
        runMLPrediction();
      }, PREDICTION_INTERVAL_MS);
    } else {
      if (predictionInterval.current) {
        clearInterval(predictionInterval.current);
      }
    }

    return () => {
      if (predictionInterval.current) {
        clearInterval(predictionInterval.current);
      }
    };
  }, [monitoringState.isMonitoring, isMLModelReady, mlModel]);

  const runMLPrediction = async () => {
    if (!mlModel || monitoringState.sensorBuffer.length < 50) return;

    try {
      // Convert sensor data to IMU format
      const imuData = monitoringState.sensorBuffer.map(packet => ({
        timestamp: packet.timestamp,
        roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
        pitch: Math.atan2(-packet.accelerometer.x, 
          Math.sqrt(packet.accelerometer.y ** 2 + packet.accelerometer.z ** 2)
        ) * (180 / Math.PI),
        yaw: 0,
        accel: packet.accelerometer,
        gyro: packet.gyroscope
      }));

      // Extract features
      const posturalFeatures = featureExtractor.current.extractPosturalFeatures(imuData);
      const respiratoryMetrics = featureExtractor.current.extractRespiratoryMetrics(
        monitoringState.sensorBuffer.map(p => p.elastometer_value)
      );

      // Run ML prediction
      const prediction = await mlModel.predict(posturalFeatures, respiratoryMetrics);

      // Update state
      setMonitoringState(prev => ({
        ...prev,
        lastPrediction: prediction,
        currentFeatures: posturalFeatures,
        currentRespiratoryMetrics: respiratoryMetrics,
        predictionHistory: [...prev.predictionHistory.slice(-19), prediction] // Keep last 20
      }));

      // Handle high-risk alerts
      if (prediction.fallRisk.risk_score > 0.7) {
        Alert.alert(
          'High Fall Risk Detected',
          `Risk Score: ${(prediction.fallRisk.risk_score * 100).toFixed(0)}%\n\nRecommendations:\n${prediction.fallRisk.recommendations.slice(0, 2).join('\n')}`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('ML prediction error:', error);
    }
  };

  const startMonitoring = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your Bequalize Belt first.');
      return;
    }

    if (!isMLModelReady) {
      Alert.alert('ML Model Not Ready', 'Please wait for the ML model to initialize.');
      return;
    }

    setMonitoringState(prev => ({
      ...prev,
      isMonitoring: true,
      monitoringStartTime: Date.now(),
      sensorBuffer: [],
      totalSamples: 0,
      predictionHistory: []
    }));
  };

  const stopMonitoring = () => {
    setMonitoringState(prev => ({
      ...prev,
      isMonitoring: false
    }));
  };

  const getRiskColor = (riskScore: number): string => {
    if (riskScore < 0.3) return '#28a745'; // Green - Low risk
    if (riskScore < 0.6) return '#ffc107'; // Yellow - Medium risk
    return '#dc3545'; // Red - High risk
  };

  const getQualityColor = (qualityScore: number): string => {
    if (qualityScore >= 80) return '#28a745'; // Green - Excellent
    if (qualityScore >= 60) return '#ffc107'; // Yellow - Good
    return '#dc3545'; // Red - Needs improvement
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
      <Text style={styles.statusText}>
        ML Model: {isMLModelReady ? '🧠 Ready' : '⏳ Loading...'}
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
          <Text style={styles.monitoringStats}>
            🧠 Predictions: {monitoringState.predictionHistory.length}
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
          style={[
            styles.startButton,
            (!isConnected || !isMLModelReady) && styles.disabledButton
          ]}
          onPress={startMonitoring}
          disabled={!isConnected || !isMLModelReady}
        >
          <Text style={styles.startButtonText}>▶️ Start Real-time Monitoring</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderCurrentPrediction = () => {
    if (!monitoringState.lastPrediction) return null;

    const prediction = monitoringState.lastPrediction;

    return (
      <View style={styles.predictionCard}>
        <Text style={styles.cardTitle}>🧠 Current Assessment</Text>
        
        {/* Fall Risk */}
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Fall Risk</Text>
          <View style={[
            styles.riskBadge,
            { backgroundColor: getRiskColor(prediction.fallRisk.risk_score) }
          ]}>
            <Text style={styles.riskText}>
              {(prediction.fallRisk.risk_score * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Exercise Quality */}
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>Exercise Quality</Text>
          <View style={[
            styles.qualityBadge,
            { backgroundColor: getQualityColor(prediction.exerciseQuality.overall_score) }
          ]}>
            <Text style={styles.qualityText}>
              {prediction.exerciseQuality.overall_score.toFixed(0)}/100
            </Text>
          </View>
        </View>

        {/* Symptoms */}
        <View style={styles.symptomsContainer}>
          <Text style={styles.symptomsTitle}>Symptom Indicators</Text>
          <View style={styles.symptomsList}>
            <Text style={styles.symptomItem}>
              Vertigo: {(prediction.symptomPrediction.vertigo * 100).toFixed(0)}%
            </Text>
            <Text style={styles.symptomItem}>
              Imbalance: {(prediction.symptomPrediction.imbalance * 100).toFixed(0)}%
            </Text>
            <Text style={styles.symptomItem}>
              Nausea: {(prediction.symptomPrediction.nausea * 100).toFixed(0)}%
            </Text>
          </View>
        </View>

        {/* Confidence */}
        <View style={styles.confidenceContainer}>
          <Text style={styles.confidenceLabel}>
            Prediction Confidence: {(prediction.confidence * 100).toFixed(0)}%
          </Text>
        </View>

        {/* Processing Time */}
        <Text style={styles.processingTime}>
          Processing: {prediction.processingTime.toFixed(1)}ms
        </Text>
      </View>
    );
  };

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
          Live sensor data analysis with ML predictions
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

      {renderCurrentPrediction()}
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
  predictionCard: {
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
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricLabel: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  riskText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  qualityBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  qualityText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  symptomsContainer: {
    marginTop: 16,
  },
  symptomsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  symptomsList: {
    gap: 4,
  },
  symptomItem: {
    fontSize: 14,
    color: '#6c757d',
  },
  confidenceContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  confidenceLabel: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  processingTime: {
    fontSize: 12,
    color: '#adb5bd',
    textAlign: 'center',
    marginTop: 8,
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