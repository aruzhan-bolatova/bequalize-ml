/**
 * Phase 3 Demo Component - Machine Learning Model Development
 * Demonstrates ML model training, prediction, and optimization
 * Based on Phase 3 requirements from the implementation plan
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Switch
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

// Import Phase 3 ML components
import { VestibularMLModel } from '../ml/VestibularMLModel';
import { MLDataPreparator, TrainingDataset, ClinicalAssessment } from '../ml/DataPreparation';
import { ModelTrainer, TrainingProgress, TrainingConfig } from '../ml/ModelTrainer';

// Import Phase 2 components for feature extraction
import { VestibularFeatureExtractor } from '../algorithms/VestibularFeatureExtractor';
import { EnhancedMockBluetoothManager } from '../services/EnhancedMockBluetoothManager';

// Import types
import {
  SensorDataPacket,
  PosturalFeatures,
  RespiratoryMetrics,
  ExerciseSession,
  VestibularCondition,
  ExerciseType,
  FallRiskAssessment,
  ExerciseQualityScore
} from '../types/SensorData';

const screenWidth = Dimensions.get('window').width;

interface ModelPrediction {
  fallRisk: FallRiskAssessment;
  exerciseQuality: ExerciseQualityScore;
  symptomPrediction: {
    vertigo: number;
    imbalance: number;
    nausea: number;
    confidence: number;
  };
  confidence: number;
  processingTime: number;
}

interface TrainingState {
  isTraining: boolean;
  currentEpoch: number;
  totalEpochs: number;
  trainingHistory: TrainingProgress[];
  isModelLoaded: boolean;
  modelSize: number;
}

interface DemoState {
  isRunning: boolean;
  currentPrediction: ModelPrediction | null;
  trainingState: TrainingState;
  selectedCondition: VestibularCondition;
  autoPredict: boolean;
  showAdvancedMetrics: boolean;
}

const Phase3Demo: React.FC = () => {
  // Core ML components
  const [mlModel] = useState(() => new VestibularMLModel());
  const [dataPreparator] = useState(() => new MLDataPreparator());
  const [modelTrainer] = useState(() => new ModelTrainer(mlModel, dataPreparator));
  const [featureExtractor] = useState(() => new VestibularFeatureExtractor());
  const [mockManager] = useState(() => new EnhancedMockBluetoothManager());

  // Demo state
  const [demoState, setDemoState] = useState<DemoState>({
    isRunning: false,
    currentPrediction: null,
    trainingState: {
      isTraining: false,
      currentEpoch: 0,
      totalEpochs: 0,
      trainingHistory: [],
      isModelLoaded: false,
      modelSize: 0
    },
    selectedCondition: 'normal',
    autoPredict: false,
    showAdvancedMetrics: false
  });

  // Available vestibular conditions for testing
  const vestibularConditions: VestibularCondition[] = [
    'normal',
    'bppv',
    'vestibular_neuritis',
    'menieres',
    'bilateral_loss',
    'unilateral_loss',
    'migraine'
  ];

  // Initialize ML model
  useEffect(() => {
    const initializeModel = async () => {
      try {
        console.log('Initializing ML model for Phase 3 demo');
        await mlModel.loadModel('demo_model');
        
        setDemoState(prev => ({
          ...prev,
          trainingState: {
            ...prev.trainingState,
            isModelLoaded: true,
            modelSize: 0 // Model size not available in current metrics
          }
        }));
        
        console.log('ML model initialized successfully');
      } catch (error) {
        console.error('Failed to initialize ML model:', error);
        Alert.alert('Error', 'Failed to initialize ML model');
      }
    };

    initializeModel();
  }, [mlModel]);

  // Auto-prediction loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (demoState.autoPredict && demoState.trainingState.isModelLoaded) {
      interval = setInterval(() => {
        makePrediction();
      }, 2000); // Predict every 2 seconds
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [demoState.autoPredict, demoState.trainingState.isModelLoaded]);

  /**
   * Simulate model training
   */
  const startTraining = useCallback(async () => {
    try {
      console.log('Starting ML model training simulation');
      
      setDemoState(prev => ({
        ...prev,
        trainingState: {
          ...prev.trainingState,
          isTraining: true,
          currentEpoch: 0,
          totalEpochs: 50,
          trainingHistory: []
        }
      }));

      // Generate synthetic training data
      const trainingData = await generateSyntheticTrainingData();
      
      // Configure training
      const trainingConfig: Partial<TrainingConfig> = {
        epochs: 50,
        batchSize: 16,
        learningRate: 0.001,
        validationSplit: 0.2,
        logTrainingMetrics: true
      };

      // Start training
      const result = await modelTrainer.trainModel(trainingData, trainingConfig);
      
      if (result.success) {
        setDemoState(prev => ({
          ...prev,
          trainingState: {
            ...prev.trainingState,
            isTraining: false,
            trainingHistory: result.trainingHistory,
            modelSize: result.modelSize
          }
        }));
        
        Alert.alert('Success', `Training completed!\nFinal accuracy: ${(result.finalMetrics.accuracy * 100).toFixed(1)}%`);
      } else {
        throw new Error(result.error || 'Training failed');
      }
      
    } catch (error) {
      console.error('Training failed:', error);
      Alert.alert('Error', 'Training failed: ' + (error as Error).message);
      
      setDemoState(prev => ({
        ...prev,
        trainingState: {
          ...prev.trainingState,
          isTraining: false
        }
      }));
    }
  }, [modelTrainer]);

  /**
   * Make a single prediction
   */
  const makePrediction = useCallback(async () => {
    if (!demoState.trainingState.isModelLoaded) {
      Alert.alert('Error', 'Model not loaded yet');
      return;
    }

    try {
      // Generate mock sensor data for current condition
      mockManager.setCurrentCondition(demoState.selectedCondition);
      const sensorData = Array.from({ length: 100 }, () => 
        mockManager.generateSensorDataPacket()
      );

      // Convert sensor data to IMU data for feature extraction
      const imuData = sensorData.map(packet => ({
        timestamp: packet.timestamp,
        roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
        pitch: Math.atan2(-packet.accelerometer.x, 
          Math.sqrt(packet.accelerometer.y * packet.accelerometer.y + packet.accelerometer.z * packet.accelerometer.z)
        ) * (180 / Math.PI),
        yaw: 0, // Not calculable from accelerometer alone
        accel: packet.accelerometer,
        gyro: packet.gyroscope
      }));

      // Extract features
      const posturalFeatures = featureExtractor.extractPosturalFeatures(imuData);
      const respiratoryMetrics = featureExtractor.extractRespiratoryMetrics(sensorData);

      // Make prediction
      const prediction = await mlModel.predict(
        posturalFeatures,
        respiratoryMetrics,
        50, // User age
        getConditionSeverity(demoState.selectedCondition)
      );

      setDemoState(prev => ({
        ...prev,
        currentPrediction: prediction
      }));

    } catch (error) {
      console.error('Prediction failed:', error);
      Alert.alert('Error', 'Prediction failed: ' + (error as Error).message);
    }
  }, [demoState.selectedCondition, demoState.trainingState.isModelLoaded, mlModel, featureExtractor, mockManager]);

  /**
   * Generate synthetic training data for demo
   */
  const generateSyntheticTrainingData = async (): Promise<TrainingDataset> => {
    console.log('Generating synthetic training data');
    
    // Create mock exercise sessions
    const sessions: ExerciseSession[] = [];
    const clinicalAssessments: ClinicalAssessment[] = [];
    
    for (let i = 0; i < 200; i++) {
      const condition = vestibularConditions[Math.floor(Math.random() * vestibularConditions.length)];
      const sessionId = `session_${i}`;
      
      // Generate session
      const session: ExerciseSession = {
        sessionId,
        userId: `user_${Math.floor(i / 10)}`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
        exerciseType: ['Romberg Test (Eyes Open)', 'Romberg Test (Eyes Closed)', 'Single Leg Stand'][Math.floor(Math.random() * 3)] as ExerciseType,
        durationSeconds: 60 + Math.random() * 120,
        condition,
        summaryData: {
          posture: {
            avgPitch: (Math.random() - 0.5) * 10,
            stdDevPitch: Math.random() * 2,
            avgRoll: (Math.random() - 0.5) * 10,
            stdDevRoll: Math.random() * 2,
            swayAreaCm2: Math.random() * 5
          },
          respiration: {
            avgBPM: 12 + Math.random() * 8,
            avgAmplitude: 200 + Math.random() * 200,
            avgIERatio: 0.4 + Math.random() * 0.4,
            maxAmplitude: 300 + Math.random() * 300
          },
          temperature: {
            avgCelsius: 36.5 + Math.random() * 1,
            maxCelsius: 37 + Math.random() * 1
          }
        }
      };
      
      // Generate clinical assessment
      const fallRiskScore = getConditionSeverity(condition) / 5 + Math.random() * 0.2;
      const assessment: ClinicalAssessment = {
        sessionId,
        fallRiskScore: Math.min(1, fallRiskScore),
        symptoms: {
          vertigo: condition === 'bppv' || condition === 'menieres' || Math.random() > 0.7,
          imbalance: condition !== 'normal' || Math.random() > 0.8,
          nausea: condition === 'menieres' || condition === 'migraine' || Math.random() > 0.9
        },
        exercisePerformance: Math.max(20, 100 - getConditionSeverity(condition) * 15 + Math.random() * 20),
        clinicianNotes: `Assessment for ${condition} condition`,
        assessmentDate: session.timestamp
      };
      
      sessions.push(session);
      clinicalAssessments.push(assessment);
    }
    
    // Prepare training data
    const trainingData = dataPreparator.prepareTrainingData(sessions, clinicalAssessments);
    console.log(`Generated ${sessions.length} training samples`);
    
    return trainingData;
  };

  /**
   * Get condition severity for simulation
   */
  const getConditionSeverity = (condition: VestibularCondition): number => {
    const severityMap: Record<VestibularCondition, number> = {
      'normal': 1,
      'bppv': 3,
      'vestibular_neuritis': 4,
      'menieres': 3,
      'bilateral_loss': 5,
      'unilateral_loss': 3,
      'migraine': 2
    };
    return severityMap[condition];
  };

  /**
   * Render training progress chart
   */
  const renderTrainingChart = () => {
    if (demoState.trainingState.trainingHistory.length === 0) {
      return (
        <View style={styles.chartPlaceholder}>
          <Text style={styles.placeholderText}>No training data yet</Text>
        </View>
      );
    }

    const chartData = {
      labels: demoState.trainingState.trainingHistory
        .filter((_, index) => index % 5 === 0) // Show every 5th epoch
        .map(progress => progress.epoch.toString()),
      datasets: [
        {
          data: demoState.trainingState.trainingHistory
            .filter((_, index) => index % 5 === 0)
            .map(progress => progress.accuracy * 100),
          color: (opacity = 1) => `rgba(34, 202, 236, ${opacity})`,
          strokeWidth: 2
        },
        {
          data: demoState.trainingState.trainingHistory
            .filter((_, index) => index % 5 === 0)
            .map(progress => progress.validationAccuracy * 100),
          color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
          strokeWidth: 2
        }
      ],
      legend: ['Training Accuracy', 'Validation Accuracy']
    };

    return (
      <LineChart
        data={chartData}
        width={screenWidth - 40}
        height={200}
        chartConfig={{
          backgroundColor: '#1e2923',
          backgroundGradientFrom: '#08130D',
          backgroundGradientTo: '#1e2923',
          decimalPlaces: 1,
          color: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(26, 255, 146, ${opacity})`,
          style: { borderRadius: 16 },
          propsForDots: { r: '4', strokeWidth: '1', stroke: '#ffa726' }
        }}
        bezier
        style={styles.chart}
      />
    );
  };

  /**
   * Render prediction results
   */
  const renderPredictionResults = () => {
    if (!demoState.currentPrediction) {
      return (
        <View style={styles.predictionPlaceholder}>
          <Text style={styles.placeholderText}>No prediction yet</Text>
        </View>
      );
    }

    const { fallRisk, exerciseQuality, symptomPrediction, confidence, processingTime } = demoState.currentPrediction;

    return (
      <View style={styles.predictionResults}>
        {/* Fall Risk Assessment */}
        <View style={styles.predictionCard}>
          <Text style={styles.predictionTitle}>Fall Risk Assessment</Text>
          <Text style={styles.riskScore}>
            Risk Score: {(fallRisk.risk_score * 100).toFixed(1)}%
          </Text>
          <Text style={styles.confidence}>
            Confidence: {(fallRisk.confidence * 100).toFixed(1)}%
          </Text>
          {fallRisk.risk_factors.length > 0 && (
            <View style={styles.riskFactors}>
              <Text style={styles.subTitle}>Risk Factors:</Text>
              {fallRisk.risk_factors.map((factor, index) => (
                <Text key={index} style={styles.riskFactor}>• {factor}</Text>
              ))}
            </View>
          )}
        </View>

        {/* Exercise Quality */}
        <View style={styles.predictionCard}>
          <Text style={styles.predictionTitle}>Exercise Quality</Text>
          <Text style={styles.qualityScore}>
            Overall Score: {exerciseQuality.overall_score.toFixed(1)}/100
          </Text>
          <View style={styles.qualityBreakdown}>
            <Text style={styles.qualityMetric}>
              Posture: {(exerciseQuality.form_analysis.posture_quality * 100).toFixed(1)}%
            </Text>
            <Text style={styles.qualityMetric}>
              Breathing: {(exerciseQuality.form_analysis.breathing_quality * 100).toFixed(1)}%
            </Text>
            <Text style={styles.qualityMetric}>
              Stability: {(exerciseQuality.form_analysis.stability_score * 100).toFixed(1)}%
            </Text>
          </View>
        </View>

        {/* Symptom Prediction */}
        <View style={styles.predictionCard}>
          <Text style={styles.predictionTitle}>Symptom Prediction</Text>
          <View style={styles.symptomScores}>
            <Text style={styles.symptomScore}>
              Vertigo: {(symptomPrediction.vertigo * 100).toFixed(1)}%
            </Text>
            <Text style={styles.symptomScore}>
              Imbalance: {(symptomPrediction.imbalance * 100).toFixed(1)}%
            </Text>
            <Text style={styles.symptomScore}>
              Nausea: {(symptomPrediction.nausea * 100).toFixed(1)}%
            </Text>
          </View>
          <Text style={styles.confidence}>
            Confidence: {(symptomPrediction.confidence * 100).toFixed(1)}%
          </Text>
        </View>

        {/* Performance Metrics */}
        {demoState.showAdvancedMetrics && (
          <View style={styles.predictionCard}>
            <Text style={styles.predictionTitle}>Performance Metrics</Text>
            <Text style={styles.performanceMetric}>
              Processing Time: {processingTime}ms
            </Text>
            <Text style={styles.performanceMetric}>
              Overall Confidence: {(confidence * 100).toFixed(1)}%
            </Text>
            <Text style={styles.performanceMetric}>
              Model Size: {demoState.trainingState.modelSize.toFixed(1)}MB
            </Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Phase 3: ML Model Development</Text>
      <Text style={styles.subtitle}>Multi-task Vestibular Assessment</Text>

      {/* Model Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Model Status</Text>
        <Text style={styles.statusText}>
          Loaded: {demoState.trainingState.isModelLoaded ? '✅' : '❌'}
        </Text>
        <Text style={styles.statusText}>
          Size: {demoState.trainingState.modelSize.toFixed(1)}MB
        </Text>
        <Text style={styles.statusText}>
          Training: {demoState.trainingState.isTraining ? '🔄' : '⏸️'}
        </Text>
      </View>

      {/* Training Controls */}
      <View style={styles.controlsCard}>
        <Text style={styles.controlsTitle}>Training Controls</Text>
        
        <TouchableOpacity
          style={[styles.button, demoState.trainingState.isTraining && styles.buttonDisabled]}
          onPress={startTraining}
          disabled={demoState.trainingState.isTraining}
        >
          {demoState.trainingState.isTraining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Start Training</Text>
          )}
        </TouchableOpacity>

        {demoState.trainingState.isTraining && (
          <Text style={styles.trainingProgress}>
            Epoch {demoState.trainingState.currentEpoch}/{demoState.trainingState.totalEpochs}
          </Text>
        )}
      </View>

      {/* Training Progress Chart */}
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>Training Progress</Text>
        {renderTrainingChart()}
      </View>

      {/* Prediction Controls */}
      <View style={styles.controlsCard}>
        <Text style={styles.controlsTitle}>Prediction Controls</Text>
        
        <View style={styles.conditionSelector}>
          <Text style={styles.selectorLabel}>Vestibular Condition:</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.conditionScroll}>
            {vestibularConditions.map(condition => (
              <TouchableOpacity
                key={condition}
                style={[
                  styles.conditionButton,
                  demoState.selectedCondition === condition && styles.conditionButtonActive
                ]}
                onPress={() => setDemoState(prev => ({ ...prev, selectedCondition: condition }))}
              >
                <Text style={[
                  styles.conditionButtonText,
                  demoState.selectedCondition === condition && styles.conditionButtonTextActive
                ]}>
                  {condition.replace('_', ' ')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Auto Predict:</Text>
          <Switch
            value={demoState.autoPredict}
            onValueChange={(value) => setDemoState(prev => ({ ...prev, autoPredict: value }))}
          />
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Advanced Metrics:</Text>
          <Switch
            value={demoState.showAdvancedMetrics}
            onValueChange={(value) => setDemoState(prev => ({ ...prev, showAdvancedMetrics: value }))}
          />
        </View>

        <TouchableOpacity
          style={[styles.button, styles.predictButton]}
          onPress={makePrediction}
          disabled={!demoState.trainingState.isModelLoaded}
        >
          <Text style={styles.buttonText}>Make Prediction</Text>
        </TouchableOpacity>
      </View>

      {/* Prediction Results */}
      <View style={styles.resultsCard}>
        <Text style={styles.resultsTitle}>Prediction Results</Text>
        {renderPredictionResults()}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#666',
  },
  statusCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  statusText: {
    fontSize: 14,
    marginBottom: 5,
    color: '#666',
  },
  controlsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  controlsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  predictButton: {
    backgroundColor: '#34C759',
  },
  trainingProgress: {
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
    marginTop: 10,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  chart: {
    borderRadius: 10,
  },
  chartPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  placeholderText: {
    fontSize: 16,
    color: '#999',
  },
  conditionSelector: {
    marginBottom: 15,
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  conditionScroll: {
    flexDirection: 'row',
  },
  conditionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginRight: 10,
  },
  conditionButtonActive: {
    backgroundColor: '#007AFF',
  },
  conditionButtonText: {
    fontSize: 14,
    color: '#333',
    textTransform: 'capitalize',
  },
  conditionButtonTextActive: {
    color: '#fff',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  switchLabel: {
    fontSize: 16,
    color: '#333',
  },
  resultsCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  predictionPlaceholder: {
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    borderRadius: 10,
  },
  predictionResults: {
    gap: 15,
  },
  predictionCard: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
  },
  predictionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  riskScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 5,
  },
  qualityScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#34C759',
    marginBottom: 8,
  },
  confidence: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  subTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#333',
  },
  riskFactors: {
    marginTop: 5,
  },
  riskFactor: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  qualityBreakdown: {
    gap: 3,
  },
  qualityMetric: {
    fontSize: 14,
    color: '#666',
  },
  symptomScores: {
    gap: 3,
    marginBottom: 8,
  },
  symptomScore: {
    fontSize: 14,
    color: '#666',
  },
  performanceMetric: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
});

export default Phase3Demo; 