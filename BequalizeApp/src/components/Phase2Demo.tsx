/**
 * Phase 2 Demo Component - Signal Processing & Feature Engineering
 * Demonstrates advanced signal processing capabilities including:
 * - Real-time processing with sliding window
 * - Complementary and Kalman filtering
 * - Vestibular feature extraction
 * - Respiratory signal processing
 * - Postural analysis and alerts
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';

// Import our Phase 2 components
import { SignalProcessor } from '../algorithms/SignalProcessor';
import { VestibularFeatureExtractor } from '../algorithms/VestibularFeatureExtractor';
import { RealTimeProcessor } from '../services/RealTimeProcessor';
import { EnhancedMockBluetoothManager } from '../services/EnhancedMockBluetoothManager';
import {
  SensorDataPacket,
  RealTimeInsights,
  PosturalFeatures,
  RespiratoryMetrics,
  ProcessingMetrics,
  ExerciseType,
  VestibularCondition
} from '../types/SensorData';

const screenWidth = Dimensions.get('window').width;

interface Phase2DemoState {
  isProcessing: boolean;
  currentInsights: RealTimeInsights | null;
  processingMetrics: ProcessingMetrics | null;
  recentPosturalFeatures: PosturalFeatures | null;
  recentRespiratoryMetrics: RespiratoryMetrics | null;
  selectedExercise: ExerciseType;
  selectedCondition: VestibularCondition;
  dataBuffer: SensorDataPacket[];
  chartData: {
    stability: number[];
    breathing: number[];
    sway: number[];
    timestamps: string[];
  };
}

const Phase2Demo: React.FC = () => {
  // State management
  const [state, setState] = useState<Phase2DemoState>({
    isProcessing: false,
    currentInsights: null,
    processingMetrics: null,
    recentPosturalFeatures: null,
    recentRespiratoryMetrics: null,
    selectedExercise: 'Romberg Test (Eyes Open)',
    selectedCondition: 'normal',
    dataBuffer: [],
    chartData: {
      stability: [],
      breathing: [],
      sway: [],
      timestamps: []
    }
  });

  // Processing components
  const signalProcessor = useRef(new SignalProcessor()).current;
  const featureExtractor = useRef(new VestibularFeatureExtractor()).current;
  const realTimeProcessor = useRef(new RealTimeProcessor()).current;
  const mockManager = useRef(new EnhancedMockBluetoothManager()).current;

  // Processing interval
  const processingInterval = useRef<NodeJS.Timeout | null>(null);

  // Exercise types for selection
  const exerciseTypes: ExerciseType[] = [
    'Romberg Test (Eyes Open)',
    'Romberg Test (Eyes Closed)',
    'Single Leg Stand',
    'Guided Diaphragmatic Breathing',
    'Controlled Deep Breathing'
  ];

  // Vestibular conditions for testing
  const vestibularConditions: VestibularCondition[] = [
    'normal',
    'bppv',
    'unilateral_loss',
    'bilateral_loss',
    'migraine',
    'menieres',
    'vestibular_neuritis'
  ];

  /**
   * Start Phase 2 processing demonstration
   */
  const startProcessing = useCallback(async () => {
    try {
      // Initialize mock data generation
      mockManager.setCurrentCondition(state.selectedCondition);
      
      // Start real-time processor
      realTimeProcessor.startExercise(state.selectedExercise);
      
      setState(prev => ({ ...prev, isProcessing: true }));
      
      // Start processing loop
      processingInterval.current = setInterval(async () => {
        // Generate mock sensor data
        const sensorPacket = mockManager.generateSensorDataPacket();
        
        // Process through real-time processor
        const insights = await realTimeProcessor.processIncomingData(sensorPacket);
        
        // Get processing metrics
        const metrics = realTimeProcessor.getProcessingMetrics();
        
        // Update buffer and extract features
        const newBuffer = [...state.dataBuffer, sensorPacket].slice(-100); // Keep last 100 samples
        
        let posturalFeatures: PosturalFeatures | null = null;
        let respiratoryMetrics: RespiratoryMetrics | null = null;
        
        if (newBuffer.length >= 50) {
          // Extract postural features
          const recentIMU = newBuffer.slice(-50).map(packet => ({
            timestamp: packet.timestamp,
            roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
            pitch: Math.atan2(-packet.accelerometer.x, 
              Math.sqrt(packet.accelerometer.y * packet.accelerometer.y + packet.accelerometer.z * packet.accelerometer.z)
            ) * (180 / Math.PI),
            yaw: 0,
            accel: packet.accelerometer,
            gyro: packet.gyroscope
          }));
          
          posturalFeatures = featureExtractor.extractPosturalFeatures(recentIMU);
          
          // Process respiratory signal
          const elastometerData = newBuffer.slice(-50).map(p => p.elastometer_value);
          respiratoryMetrics = signalProcessor.processRespiratorySignal(elastometerData);
        }
        
        // Update chart data
        const newChartData = {
          stability: [...state.chartData.stability, insights.currentStability].slice(-20),
          breathing: [...state.chartData.breathing, insights.breathingQuality].slice(-20),
          sway: [...state.chartData.sway, posturalFeatures?.swayArea || 0].slice(-20),
          timestamps: [...state.chartData.timestamps, new Date().toLocaleTimeString().slice(-8)].slice(-20)
        };
        
        setState(prev => ({
          ...prev,
          currentInsights: insights,
          processingMetrics: metrics,
          recentPosturalFeatures: posturalFeatures,
          recentRespiratoryMetrics: respiratoryMetrics,
          dataBuffer: newBuffer,
          chartData: newChartData
        }));
        
      }, 100); // 10Hz processing rate for demo
      
    } catch (error) {
      Alert.alert('Error', `Failed to start processing: ${error}`);
    }
  }, [state.selectedCondition, state.selectedExercise]);

  /**
   * Stop processing demonstration
   */
  const stopProcessing = useCallback(() => {
    if (processingInterval.current) {
      clearInterval(processingInterval.current);
      processingInterval.current = null;
    }
    
    realTimeProcessor.stopExercise();
    signalProcessor.reset();
    
    setState(prev => ({
      ...prev,
      isProcessing: false,
      currentInsights: null,
      processingMetrics: null
    }));
  }, []);

  /**
   * Reset demonstration
   */
  const resetDemo = useCallback(() => {
    stopProcessing();
    realTimeProcessor.reset();
    signalProcessor.reset();
    
    setState(prev => ({
      ...prev,
      dataBuffer: [],
      chartData: {
        stability: [],
        breathing: [],
        sway: [],
        timestamps: []
      },
      recentPosturalFeatures: null,
      recentRespiratoryMetrics: null
    }));
  }, [stopProcessing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopProcessing();
    };
  }, [stopProcessing]);

  // Chart configuration
  const chartConfig = {
    backgroundColor: '#ffffff',
    backgroundGradientFrom: '#ffffff',
    backgroundGradientTo: '#ffffff',
    decimalPlaces: 2,
    color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForDots: {
      r: '3',
      strokeWidth: '1',
      stroke: '#007AFF',
    },
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Phase 2: Signal Processing Demo</Text>
      
      {/* Controls Section */}
      <View style={styles.controlsSection}>
        <Text style={styles.sectionTitle}>Controls</Text>
        
        {/* Exercise Selection */}
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionLabel}>Exercise Type:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {exerciseTypes.map((exercise) => (
              <TouchableOpacity
                key={exercise}
                style={[
                  styles.selectionButton,
                  state.selectedExercise === exercise && styles.selectedButton
                ]}
                onPress={() => setState(prev => ({ ...prev, selectedExercise: exercise }))}
                disabled={state.isProcessing}
              >
                <Text style={[
                  styles.selectionButtonText,
                  state.selectedExercise === exercise && styles.selectedButtonText
                ]}>
                  {exercise}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Condition Selection */}
        <View style={styles.selectionContainer}>
          <Text style={styles.selectionLabel}>Vestibular Condition:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
            {vestibularConditions.map((condition) => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.selectionButton,
                  state.selectedCondition === condition && styles.selectedButton
                ]}
                onPress={() => setState(prev => ({ ...prev, selectedCondition: condition }))}
                disabled={state.isProcessing}
              >
                <Text style={[
                  styles.selectionButtonText,
                  state.selectedCondition === condition && styles.selectedButtonText
                ]}>
                  {condition}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
        
        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.actionButton, state.isProcessing && styles.disabledButton]}
            onPress={startProcessing}
            disabled={state.isProcessing}
          >
            <Text style={styles.actionButtonText}>Start Processing</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.stopButton, !state.isProcessing && styles.disabledButton]}
            onPress={stopProcessing}
            disabled={!state.isProcessing}
          >
            <Text style={styles.actionButtonText}>Stop Processing</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={resetDemo}
          >
            <Text style={styles.actionButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Real-time Insights */}
      {state.currentInsights && (
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Real-time Insights</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Stability Score</Text>
              <Text style={styles.metricValue}>
                {state.currentInsights.currentStability.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Breathing Quality</Text>
              <Text style={styles.metricValue}>
                {state.currentInsights.breathingQuality.toFixed(2)}
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Exercise Progress</Text>
              <Text style={styles.metricValue}>
                {state.currentInsights.exerciseProgress.completionPercentage.toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Confidence</Text>
              <Text style={styles.metricValue}>
                {state.currentInsights.confidence.toFixed(2)}
              </Text>
            </View>
          </View>
          
          {/* Alerts */}
          {state.currentInsights.postureAlert && (
            <View style={[styles.alertContainer, 
              state.currentInsights.postureAlert.severity === 'high' ? styles.highAlert :
              state.currentInsights.postureAlert.severity === 'medium' ? styles.mediumAlert :
              styles.lowAlert
            ]}>
              <Text style={styles.alertTitle}>
                ⚠️ {state.currentInsights.postureAlert.type.toUpperCase()}
              </Text>
              <Text style={styles.alertMessage}>
                {state.currentInsights.postureAlert.message}
              </Text>
            </View>
          )}
          
          {/* Recommendations */}
          <View style={styles.recommendationsContainer}>
            <Text style={styles.recommendationsTitle}>Recommendations:</Text>
            {state.currentInsights.recommendations.map((rec, index) => (
              <Text key={index} style={styles.recommendationText}>
                • {rec}
              </Text>
            ))}
          </View>
        </View>
      )}

      {/* Charts */}
      {state.chartData.stability.length > 1 && (
        <View style={styles.chartsSection}>
          <Text style={styles.sectionTitle}>Real-time Analytics</Text>
          
          {/* Stability Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Stability Score Over Time</Text>
            <LineChart
              data={{
                labels: state.chartData.timestamps,
                datasets: [{
                  data: state.chartData.stability,
                  color: (opacity = 1) => `rgba(0, 122, 255, ${opacity})`,
                  strokeWidth: 2
                }]
              }}
              width={screenWidth - 40}
              height={200}
              chartConfig={chartConfig}
              bezier
              style={styles.chart}
            />
          </View>
          
          {/* Breathing Quality Chart */}
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>Breathing Quality Over Time</Text>
            <LineChart
              data={{
                labels: state.chartData.timestamps,
                datasets: [{
                  data: state.chartData.breathing,
                  color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
                  strokeWidth: 2
                }]
              }}
              width={screenWidth - 40}
              height={200}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(52, 199, 89, ${opacity})`,
              }}
              bezier
              style={styles.chart}
            />
          </View>
        </View>
      )}

      {/* Processing Metrics */}
      {state.processingMetrics && (
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Processing Performance</Text>
          
          <View style={styles.metricsGrid}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Buffer Utilization</Text>
              <Text style={styles.metricValue}>
                {(state.processingMetrics.bufferUtilization * 100).toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Processing Latency</Text>
              <Text style={styles.metricValue}>
                {state.processingMetrics.processingLatency.toFixed(1)}ms
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Data Quality</Text>
              <Text style={styles.metricValue}>
                {(state.processingMetrics.dataQuality * 100).toFixed(0)}%
              </Text>
            </View>
            
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>Sampling Rate</Text>
              <Text style={styles.metricValue}>
                {state.processingMetrics.samplingRate}Hz
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Feature Details */}
      {(state.recentPosturalFeatures || state.recentRespiratoryMetrics) && (
        <View style={styles.featuresSection}>
          <Text style={styles.sectionTitle}>Extracted Features</Text>
          
          {state.recentPosturalFeatures && (
            <View style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>Postural Features</Text>
              <Text style={styles.featureText}>
                Sway Area: {state.recentPosturalFeatures.swayArea.toFixed(2)} cm²
              </Text>
              <Text style={styles.featureText}>
                Sway Velocity: {state.recentPosturalFeatures.swayVelocity.toFixed(2)} cm/s
              </Text>
              <Text style={styles.featureText}>
                Path Length: {state.recentPosturalFeatures.swayPathLength.toFixed(2)} cm
              </Text>
              <Text style={styles.featureText}>
                AP Sway: {state.recentPosturalFeatures.anteriorPosteriorSway.toFixed(2)}
              </Text>
              <Text style={styles.featureText}>
                ML Sway: {state.recentPosturalFeatures.medioLateralSway.toFixed(2)}
              </Text>
            </View>
          )}
          
          {state.recentRespiratoryMetrics && (
            <View style={styles.featureGroup}>
              <Text style={styles.featureGroupTitle}>Respiratory Features</Text>
              <Text style={styles.featureText}>
                Breathing Rate: {state.recentRespiratoryMetrics.breathingRate.toFixed(1)} BPM
              </Text>
              <Text style={styles.featureText}>
                Amplitude: {state.recentRespiratoryMetrics.breathingAmplitude.toFixed(1)}
              </Text>
              <Text style={styles.featureText}>
                I:E Ratio: {state.recentRespiratoryMetrics.ieRatio.toFixed(2)}
              </Text>
              <Text style={styles.featureText}>
                Regularity: {state.recentRespiratoryMetrics.breathingRegularity.toFixed(2)}
              </Text>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  controlsSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  selectionContainer: {
    marginBottom: 15,
  },
  selectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#666',
  },
  horizontalScroll: {
    flexDirection: 'row',
  },
  selectionButton: {
    backgroundColor: '#e9ecef',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  selectedButton: {
    backgroundColor: '#007AFF',
  },
  selectionButtonText: {
    fontSize: 12,
    color: '#333',
  },
  selectedButtonText: {
    color: '#fff',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
  },
  actionButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 5,
  },
  stopButton: {
    backgroundColor: '#FF3B30',
  },
  resetButton: {
    backgroundColor: '#FF9500',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  actionButtonText: {
    color: '#fff',
    textAlign: 'center',
    fontWeight: '600',
  },
  insightsSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  metricCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    marginBottom: 10,
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  alertContainer: {
    padding: 12,
    borderRadius: 8,
    marginVertical: 10,
  },
  highAlert: {
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  mediumAlert: {
    backgroundColor: '#fff3e0',
    borderColor: '#ff9800',
    borderWidth: 1,
  },
  lowAlert: {
    backgroundColor: '#e8f5e8',
    borderColor: '#4caf50',
    borderWidth: 1,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertMessage: {
    fontSize: 12,
    color: '#666',
  },
  recommendationsContainer: {
    marginTop: 10,
  },
  recommendationsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  recommendationText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  chartsSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartContainer: {
    marginBottom: 20,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  chart: {
    borderRadius: 8,
  },
  metricsSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featuresSection: {
    backgroundColor: '#fff',
    margin: 10,
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  featureGroup: {
    marginBottom: 15,
  },
  featureGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  featureText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
});

export default Phase2Demo; 