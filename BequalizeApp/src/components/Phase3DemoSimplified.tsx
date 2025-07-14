/**
 * Simplified Phase 3 Demo Component - Mock ML Implementation
 * Demonstrates the Phase 3 UI and workflow without TensorFlow.js dependencies
 * Perfect for Expo compatibility and quick testing
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
import { Dimensions } from 'react-native';

// Import types
import {
  VestibularCondition,
  FallRiskAssessment,
  ExerciseQualityScore
} from '../types/SensorData';

const screenWidth = Dimensions.get('window').width;

// Mock ML prediction interfaces
interface MockModelPrediction {
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

interface MockTrainingState {
  isTraining: boolean;
  currentEpoch: number;
  totalEpochs: number;
  trainingHistory: Array<{
    epoch: number;
    accuracy: number;
    validationAccuracy: number;
    loss: number;
  }>;
  isModelLoaded: boolean;
  modelSize: number;
}

interface DemoState {
  isRunning: boolean;
  currentPrediction: MockModelPrediction | null;
  trainingState: MockTrainingState;
  selectedCondition: VestibularCondition;
  autoPredict: boolean;
  showAdvancedMetrics: boolean;
}

const Phase3DemoSimplified: React.FC = () => {
  // Demo state
  const [demoState, setDemoState] = useState<DemoState>({
    isRunning: false,
    currentPrediction: null,
    trainingState: {
      isTraining: false,
      currentEpoch: 0,
      totalEpochs: 50,
      trainingHistory: [],
      isModelLoaded: true,
      modelSize: 4.2
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
   * Mock ML model training simulation
   */
  const startTraining = useCallback(async () => {
    try {
      console.log('Starting mock ML model training simulation');
      
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

      // Simulate training epochs
      for (let epoch = 1; epoch <= 50; epoch++) {
        await new Promise(resolve => setTimeout(resolve, 200)); // Simulate training time
        
        // Mock training metrics that improve over time
        const baseAccuracy = 0.5 + (epoch / 50) * 0.4; // 50% to 90%
        const noise = (Math.random() - 0.5) * 0.1;
        const accuracy = Math.min(0.95, Math.max(0.5, baseAccuracy + noise));
        const validationAccuracy = accuracy - 0.05 + (Math.random() - 0.5) * 0.1;
        const loss = 2.0 * Math.exp(-epoch / 20) + Math.random() * 0.1;

        setDemoState(prev => ({
          ...prev,
          trainingState: {
            ...prev.trainingState,
            currentEpoch: epoch,
            trainingHistory: [...prev.trainingState.trainingHistory, {
              epoch,
              accuracy,
              validationAccuracy: Math.max(0.4, validationAccuracy),
              loss
            }]
          }
        }));
      }

      setDemoState(prev => ({
        ...prev,
        trainingState: {
          ...prev.trainingState,
          isTraining: false
        }
      }));
      
      Alert.alert('Success', 'Mock training completed!\nFinal accuracy: 89.2%');
      
    } catch (error) {
      console.error('Mock training failed:', error);
      setDemoState(prev => ({
        ...prev,
        trainingState: {
          ...prev.trainingState,
          isTraining: false
        }
      }));
      Alert.alert('Error', 'Training simulation failed');
    }
  }, []);

  /**
   * Mock prediction based on selected condition
   */
  const makePrediction = useCallback(async () => {
    try {
      const startTime = Date.now();
      
      // Mock realistic predictions based on condition
      const prediction = generateMockPrediction(demoState.selectedCondition);
      const processingTime = Date.now() - startTime + Math.random() * 50; // Add some realistic latency

      setDemoState(prev => ({
        ...prev,
        currentPrediction: {
          ...prediction,
          processingTime
        }
      }));

    } catch (error) {
      console.error('Mock prediction failed:', error);
      Alert.alert('Error', 'Prediction failed: ' + (error as Error).message);
    }
  }, [demoState.selectedCondition]);

  /**
   * Generate realistic mock predictions based on vestibular condition
   */
  const generateMockPrediction = (condition: VestibularCondition): MockModelPrediction => {
    const conditionProfiles = {
      normal: { fallRisk: 0.1, vertigo: 0.05, imbalance: 0.1, nausea: 0.02, exerciseQuality: 85 },
      bppv: { fallRisk: 0.4, vertigo: 0.8, imbalance: 0.6, nausea: 0.3, exerciseQuality: 65 },
      vestibular_neuritis: { fallRisk: 0.7, vertigo: 0.9, imbalance: 0.8, nausea: 0.6, exerciseQuality: 45 },
      menieres: { fallRisk: 0.5, vertigo: 0.7, imbalance: 0.7, nausea: 0.8, exerciseQuality: 55 },
      bilateral_loss: { fallRisk: 0.9, vertigo: 0.3, imbalance: 0.9, nausea: 0.2, exerciseQuality: 25 },
      unilateral_loss: { fallRisk: 0.6, vertigo: 0.4, imbalance: 0.7, nausea: 0.3, exerciseQuality: 50 },
      migraine: { fallRisk: 0.3, vertigo: 0.6, imbalance: 0.4, nausea: 0.7, exerciseQuality: 70 }
    };

    const profile = conditionProfiles[condition];
    const noise = () => (Math.random() - 0.5) * 0.2; // Add some realistic variation

    return {
      fallRisk: {
        risk_score: Math.max(0, Math.min(1, profile.fallRisk + noise())),
        confidence: 0.85 + Math.random() * 0.1,
        risk_factors: generateRiskFactors(condition),
        recommendations: generateRecommendations(condition)
      },
      exerciseQuality: {
        overall_score: Math.max(20, Math.min(100, profile.exerciseQuality + noise() * 20)),
        form_analysis: {
          posture_quality: Math.max(20, Math.min(100, profile.exerciseQuality + noise() * 15)),
          breathing_quality: Math.max(30, Math.min(100, 75 + noise() * 20)),
          stability_score: Math.max(10, Math.min(100, profile.exerciseQuality + noise() * 25))
        },
        improvement_areas: generateImprovementAreas(condition),
        next_progression: generateNextProgression(condition)
      },
      symptomPrediction: {
        vertigo: Math.max(0, Math.min(1, profile.vertigo + noise())),
        imbalance: Math.max(0, Math.min(1, profile.imbalance + noise())),
        nausea: Math.max(0, Math.min(1, profile.nausea + noise())),
        confidence: 0.8 + Math.random() * 0.15
      },
      confidence: 0.82 + Math.random() * 0.15,
      processingTime: 45 + Math.random() * 30
    };
  };

  const generateRiskFactors = (condition: VestibularCondition): string[] => {
    const factors = {
      normal: ['Age-related balance changes'],
      bppv: ['Positional sensitivity', 'Head movement triggers'],
      vestibular_neuritis: ['Severe balance impairment', 'Recent onset'],
      menieres: ['Episodic symptoms', 'Hearing fluctuation'],
      bilateral_loss: ['Complete vestibular loss', 'Visual dependence'],
      unilateral_loss: ['Asymmetric balance', 'Compensation incomplete'],
      migraine: ['Stress sensitivity', 'Motion sensitivity']
    };
    return factors[condition] || [];
  };

  const generateRecommendations = (condition: VestibularCondition): string[] => {
    const recommendations = {
      normal: ['Continue regular exercise', 'Monitor for changes'],
      bppv: ['Avoid rapid head movements', 'Consider canalith repositioning'],
      vestibular_neuritis: ['Vestibular rehabilitation', 'Balance training'],
      menieres: ['Dietary modifications', 'Stress management'],
      bilateral_loss: ['Visual compensation training', 'Assistive devices'],
      unilateral_loss: ['Gaze stabilization exercises', 'Balance training'],
      migraine: ['Trigger avoidance', 'Stress reduction']
    };
    return recommendations[condition] || [];
  };

  const generateImprovementAreas = (condition: VestibularCondition): string[] => {
    return ['Postural stability', 'Breathing coordination', 'Movement control'];
  };

  const generateNextProgression = (condition: VestibularCondition): string => {
    return condition === 'normal' ? 'Advanced balance challenges' : 'Gradual stability improvement';
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.title}>🧠 Phase 3: ML Demo (Simplified)</Text>
      <Text style={styles.subtitle}>Machine Learning for Vestibular Health</Text>

      {/* Model Status */}
      <View style={styles.statusCard}>
        <Text style={styles.statusTitle}>Model Status</Text>
        <Text style={styles.statusText}>
          ✅ Model Loaded | Size: {demoState.trainingState.modelSize}MB | Ready for Inference
        </Text>
      </View>

      {/* Training Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🎯 Model Training</Text>
        {demoState.trainingState.isTraining ? (
          <View style={styles.trainingProgress}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.progressText}>
              Training... Epoch {demoState.trainingState.currentEpoch}/{demoState.trainingState.totalEpochs}
            </Text>
            {demoState.trainingState.trainingHistory.length > 0 && (
              <Text style={styles.metricsText}>
                Latest Accuracy: {(demoState.trainingState.trainingHistory[demoState.trainingState.trainingHistory.length - 1]?.accuracy * 100).toFixed(1)}%
              </Text>
            )}
          </View>
        ) : (
          <TouchableOpacity style={styles.button} onPress={startTraining}>
            <Text style={styles.buttonText}>Start Training Simulation</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Prediction Section */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>🔮 Real-time Predictions</Text>
        
        {/* Condition Selection */}
        <Text style={styles.sectionTitle}>Select Vestibular Condition:</Text>
        <View style={styles.conditionGrid}>
          {vestibularConditions.map((condition) => (
            <TouchableOpacity
              key={condition}
              style={[
                styles.conditionButton,
                demoState.selectedCondition === condition && styles.selectedCondition
              ]}
              onPress={() => setDemoState(prev => ({ ...prev, selectedCondition: condition }))}
            >
              <Text style={[
                styles.conditionText,
                demoState.selectedCondition === condition && styles.selectedConditionText
              ]}>
                {condition.replace('_', ' ').toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity style={styles.button} onPress={makePrediction}>
            <Text style={styles.buttonText}>Make Prediction</Text>
          </TouchableOpacity>
          
          <View style={styles.autoControl}>
            <Text style={styles.controlLabel}>Auto-Predict:</Text>
            <Switch
              value={demoState.autoPredict}
              onValueChange={(value) => setDemoState(prev => ({ ...prev, autoPredict: value }))}
            />
          </View>
        </View>
      </View>

      {/* Prediction Results */}
      {demoState.currentPrediction && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>📊 Prediction Results</Text>
          
          {/* Fall Risk */}
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Fall Risk Assessment</Text>
            <Text style={styles.riskScore}>
              Risk Score: {(demoState.currentPrediction.fallRisk.risk_score * 100).toFixed(1)}%
            </Text>
            <Text style={styles.confidence}>
              Confidence: {(demoState.currentPrediction.fallRisk.confidence * 100).toFixed(1)}%
            </Text>
          </View>

          {/* Symptoms */}
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Symptom Prediction</Text>
            <Text style={styles.symptom}>
              Vertigo: {(demoState.currentPrediction.symptomPrediction.vertigo * 100).toFixed(1)}%
            </Text>
            <Text style={styles.symptom}>
              Imbalance: {(demoState.currentPrediction.symptomPrediction.imbalance * 100).toFixed(1)}%
            </Text>
            <Text style={styles.symptom}>
              Nausea: {(demoState.currentPrediction.symptomPrediction.nausea * 100).toFixed(1)}%
            </Text>
          </View>

          {/* Exercise Quality */}
          <View style={styles.resultSection}>
            <Text style={styles.resultTitle}>Exercise Quality</Text>
            <Text style={styles.qualityScore}>
              Overall Score: {demoState.currentPrediction.exerciseQuality.overall_score.toFixed(0)}/100
            </Text>
          </View>

          {/* Performance */}
          <View style={styles.resultSection}>
            <Text style={styles.performanceText}>
              ⚡ Processing Time: {demoState.currentPrediction.processingTime.toFixed(0)}ms
            </Text>
          </View>
        </View>
      )}

      {/* Info */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>ℹ️ Demo Information</Text>
        <Text style={styles.infoText}>
          This is a simplified version of the Phase 3 ML demo that mocks the machine learning functionality.
          It demonstrates the UI, workflow, and expected results without requiring TensorFlow.js dependencies.
        </Text>
        <Text style={styles.infoText}>
          • Real-time prediction simulation
        </Text>
        <Text style={styles.infoText}>
          • Training progress visualization
        </Text>
        <Text style={styles.infoText}>
          • Multi-task ML predictions
        </Text>
        <Text style={styles.infoText}>
          • Mobile-optimized performance
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  statusCard: {
    backgroundColor: '#e8f5e8',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  statusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2e7d32',
    marginBottom: 5,
  },
  statusText: {
    fontSize: 14,
    color: '#388e3c',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  trainingProgress: {
    alignItems: 'center',
    padding: 20,
  },
  progressText: {
    fontSize: 16,
    color: '#333',
    marginTop: 10,
    textAlign: 'center',
  },
  metricsText: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginVertical: 10,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  conditionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  conditionButton: {
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    width: '48%',
    alignItems: 'center',
  },
  selectedCondition: {
    backgroundColor: '#9C27B0',
  },
  conditionText: {
    fontSize: 12,
    color: '#333',
    textAlign: 'center',
  },
  selectedConditionText: {
    color: '#fff',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  autoControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlLabel: {
    fontSize: 14,
    color: '#333',
    marginRight: 10,
  },
  resultSection: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  riskScore: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#f44336',
  },
  confidence: {
    fontSize: 14,
    color: '#666',
  },
  symptom: {
    fontSize: 14,
    color: '#333',
    marginVertical: 2,
  },
  qualityScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  performanceText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 10,
    padding: 15,
    marginBottom: 20,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#1565c0',
    marginBottom: 5,
    lineHeight: 20,
  },
});

export default Phase3DemoSimplified; 