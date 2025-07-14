/**
 * Test/Retest Demo Component for Bequalize Belt
 * Comprehensive demo integrating confidence ellipse analysis and breathing feedback
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  Alert,
  Modal,
  Switch
} from 'react-native';
import { TestRetestManager, TestSession, SessionComparison, LongitudinalProgress } from '../services/TestRetestManager';
import { BreathingFeedbackManager, BreathingFeedback, BreathingPattern } from '../services/BreathingFeedbackManager';
import { EnhancedMockBluetoothManager } from '../services/EnhancedMockBluetoothManager';
import TestRetestVisualization from './TestRetestVisualization';
import BreathingFeedbackDisplay from './BreathingFeedbackDisplay';
import { SensorDataPacket, ExerciseType } from '../types/SensorData';

interface TestRetestDemoState {
  // Session management
  isActive: boolean;
  currentTestType: 'pre' | 'post' | null;
  exerciseType: ExerciseType;
  condition: string;
  
  // Test sessions
  preSessionId: string | null;
  postSessionId: string | null;
  currentSessionData: SensorDataPacket[];
  sessionStartTime: number | null;
  
  // Analysis results
  currentComparison: SessionComparison | undefined;
  longitudinalProgress: LongitudinalProgress | undefined;
  
  // Breathing feedback
  breathingEnabled: boolean;
  currentBreathingPattern: BreathingPattern | undefined;
  currentBreathingFeedback: BreathingFeedback | undefined;
  
  // UI state
  showVisualization: boolean;
  currentView: 'setup' | 'test' | 'results' | 'history';
}

const TestRetestDemo: React.FC = () => {
  const [state, setState] = useState<TestRetestDemoState>({
    isActive: false,
    currentTestType: null,
    exerciseType: 'Romberg Test (Eyes Open)',
    condition: 'normal',
    preSessionId: null,
    postSessionId: null,
    currentSessionData: [],
    sessionStartTime: null,
    currentComparison: undefined,
    longitudinalProgress: undefined,
    breathingEnabled: true,
    currentBreathingPattern: undefined,
    currentBreathingFeedback: undefined,
    showVisualization: false,
    currentView: 'setup'
  });

  // Service instances
  const testRetestManager = useRef(new TestRetestManager());
  const breathingManager = useRef(new BreathingFeedbackManager());
  const mockManager = useRef(new EnhancedMockBluetoothManager());
  const dataCollectionInterval = useRef<NodeJS.Timeout | null>(null);
  const breathingInterval = useRef<NodeJS.Timeout | null>(null);

  // Exercise options
  const exerciseOptions: ExerciseType[] = [
    'Romberg Test (Eyes Open)',
    'Romberg Test (Eyes Closed)',
    'Single Leg Stand'
  ];

  const conditionOptions = [
    { value: 'normal', label: 'Healthy Control' },
    { value: 'bppv', label: 'BPPV' },
    { value: 'unilateral_loss', label: 'Unilateral Loss' },
    { value: 'bilateral_loss', label: 'Bilateral Loss' },
    { value: 'migraine', label: 'Vestibular Migraine' },
    { value: 'menieres', label: 'Menière\'s Disease' }
  ];

  /**
   * Start a test session (pre or post exercise)
   */
  const startTestSession = useCallback(async (testType: 'pre' | 'post') => {
    try {
      // Start test session
      const sessionId = await testRetestManager.current.startTestSession(
        'demo_user',
        state.exerciseType,
        state.condition,
        testType
      );

             // Configure mock data for condition
       mockManager.current.setCurrentCondition(state.condition as any);

      // Start breathing session if enabled
      let breathingPattern = null;
      if (state.breathingEnabled) {
        breathingPattern = breathingManager.current.startBreathingSession(
          state.exerciseType,
          testType === 'pre' ? 'Normal Standing Balance' : 'Focused Balance'
        );
      }

      setState(prev => ({
        ...prev,
        isActive: true,
        currentTestType: testType,
        currentSessionData: [],
        sessionStartTime: Date.now(),
        currentBreathingPattern: breathingPattern || undefined,
        currentView: 'test'
      }));

      // Start data collection
      startDataCollection();

      console.log(`📊 Started ${testType}-exercise test session: ${sessionId}`);
      
    } catch (error) {
      Alert.alert('Error', `Failed to start test session: ${error}`);
    }
  }, [state.exerciseType, state.condition, state.breathingEnabled]);

  /**
   * Stop current test session
   */
  const stopTestSession = useCallback(async () => {
    if (!state.isActive || !state.currentTestType || !state.sessionStartTime) {
      return;
    }

    try {
      // Stop data collection
      if (dataCollectionInterval.current) {
        clearInterval(dataCollectionInterval.current);
        dataCollectionInterval.current = null;
      }

      if (breathingInterval.current) {
        clearInterval(breathingInterval.current);
        breathingInterval.current = null;
      }

      // Stop breathing session
      if (state.breathingEnabled) {
        breathingManager.current.stopBreathingSession();
      }

      // Calculate session duration
      const duration = Math.floor((Date.now() - state.sessionStartTime) / 1000);

      // Complete test session
      const session = await testRetestManager.current.completeTestSession(
        `${Date.now()}_${state.currentTestType}_${state.exerciseType}`,
        'demo_user',
        state.exerciseType,
        state.condition,
        state.currentTestType,
        state.currentSessionData,
        duration
      );

      // Update session IDs
      const newState = {
        ...state,
        isActive: false,
        currentTestType: null,
        sessionStartTime: null,
        currentBreathingPattern: undefined,
        currentBreathingFeedback: undefined
      };

      if (state.currentTestType === 'pre') {
        newState.preSessionId = session.sessionId;
      } else {
        newState.postSessionId = session.sessionId;
      }

      setState(newState);

      // If we have both sessions, perform comparison
      if (state.currentTestType === 'post' && state.preSessionId) {
        await performSessionComparison(state.preSessionId, session.sessionId);
      }

      console.log(`✅ Completed ${state.currentTestType}-exercise test session`);
      
    } catch (error) {
      Alert.alert('Error', `Failed to complete test session: ${error}`);
    }
  }, [state]);

  /**
   * Start data collection from sensors
   */
  const startDataCollection = useCallback(() => {
    dataCollectionInterval.current = setInterval(() => {
      const packet = mockManager.current.generateSensorDataPacket();
      
      setState(prev => ({
        ...prev,
        currentSessionData: [...prev.currentSessionData, packet].slice(-500) // Keep last 500 samples
      }));
    }, 20); // 50Hz sampling rate

    // Start breathing feedback processing if enabled
    if (state.breathingEnabled) {
      breathingInterval.current = setInterval(() => {
        if (state.currentSessionData.length >= 50) {
          // Process recent elastometer data for breathing feedback
          const recentData = state.currentSessionData.slice(-50);
          const elastometerData = recentData.map(p => p.elastometer_value);
          
          // Create respiratory metrics (simplified for demo)
          const peaks = findPeaks(elastometerData);
          const breathingRate = peaks.length > 1 ? (peaks.length - 1) * 60 / 10 : 15; // Estimate rate
          
          const respiratoryMetrics = {
            breathingRate,
            breathingAmplitude: 100,
            ieRatio: 0.6,
            breathingRegularity: 0.8,
            filteredSignal: elastometerData,
            peaks: peaks,
            valleys: []
          };

          const feedback = breathingManager.current.processBreathingData(respiratoryMetrics);
          
          if (feedback) {
            setState(prev => ({
              ...prev,
              currentBreathingFeedback: feedback
            }));
          }
        }
      }, 500); // Update breathing feedback every 500ms
    }
  }, [state.breathingEnabled, state.currentSessionData]);

  /**
   * Perform session comparison after completing post-exercise test
   */
  const performSessionComparison = useCallback(async (preSessionId: string, postSessionId: string) => {
    try {
      const comparison = await testRetestManager.current.comparePrePostSessions(preSessionId, postSessionId);
      
      setState(prev => ({
        ...prev,
        currentComparison: comparison,
        currentView: 'results'
      }));

      console.log(`📈 Session comparison completed: ${comparison.improvementCategory}`);
      
    } catch (error) {
      Alert.alert('Error', `Failed to compare sessions: ${error}`);
    }
  }, []);

  /**
   * Load longitudinal progress data
   */
  const loadLongitudinalProgress = useCallback(async () => {
    try {
      const progress = await testRetestManager.current.getLongitudinalProgress('demo_user');
      
      setState(prev => ({
        ...prev,
        longitudinalProgress: progress,
        currentView: 'history'
      }));
      
    } catch (error) {
      console.log('No historical data available');
    }
  }, []);

  /**
   * Simple peak finding for breathing rate estimation
   */
  const findPeaks = (data: number[]): number[] => {
    const peaks: number[] = [];
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > 2100) {
        peaks.push(i);
      }
    }
    return peaks;
  };

  /**
   * Render setup view
   */
  const renderSetupView = () => (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Configuration</Text>
        
        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Exercise Type:</Text>
          {exerciseOptions.map(exercise => (
            <TouchableOpacity
              key={exercise}
              style={[
                styles.optionButton,
                state.exerciseType === exercise && styles.selectedOption
              ]}
              onPress={() => setState(prev => ({ ...prev, exerciseType: exercise }))}
            >
              <Text style={[
                styles.optionText,
                state.exerciseType === exercise && styles.selectedOptionText
              ]}>
                {exercise}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.optionGroup}>
          <Text style={styles.optionLabel}>Condition:</Text>
          {conditionOptions.map(condition => (
            <TouchableOpacity
              key={condition.value}
              style={[
                styles.optionButton,
                state.condition === condition.value && styles.selectedOption
              ]}
              onPress={() => setState(prev => ({ ...prev, condition: condition.value }))}
            >
              <Text style={[
                styles.optionText,
                state.condition === condition.value && styles.selectedOptionText
              ]}>
                {condition.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Real-time Breathing Feedback:</Text>
          <Switch
            value={state.breathingEnabled}
            onValueChange={(value) => setState(prev => ({ ...prev, breathingEnabled: value }))}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Test Protocol</Text>
        <Text style={styles.protocolText}>
          1. Complete pre-exercise balance assessment (30-60 seconds)
          2. Perform balance exercise or intervention
          3. Complete post-exercise balance assessment (30-60 seconds)
          4. Review confidence ellipse area changes and insights
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => startTestSession('pre')}
        >
          <Text style={styles.buttonText}>Start Pre-Exercise Test</Text>
        </TouchableOpacity>

        {state.preSessionId && (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => startTestSession('post')}
          >
            <Text style={styles.buttonText}>Start Post-Exercise Test</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={loadLongitudinalProgress}
        >
          <Text style={styles.secondaryButtonText}>View History</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  /**
   * Render active test view
   */
  const renderTestView = () => (
    <View style={styles.container}>
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>
          {state.currentTestType?.toUpperCase()}-EXERCISE TEST
        </Text>
        <Text style={styles.testSubtitle}>{state.exerciseType}</Text>
        
        <TouchableOpacity
          style={styles.stopButton}
          onPress={stopTestSession}
        >
          <Text style={styles.stopButtonText}>Complete Test</Text>
        </TouchableOpacity>
      </View>

      {state.breathingEnabled && (
        <BreathingFeedbackDisplay
          currentFeedback={state.currentBreathingFeedback}
          currentPattern={state.currentBreathingPattern}
          sessionState={breathingManager.current.getCurrentSessionState() || undefined}
          isActive={state.isActive}
        />
      )}

      <View style={styles.testMetrics}>
        <Text style={styles.metricsTitle}>Session Metrics</Text>
        <Text style={styles.metricsText}>
          Duration: {state.sessionStartTime ? 
            Math.floor((Date.now() - state.sessionStartTime) / 1000) : 0}s
        </Text>
        <Text style={styles.metricsText}>
          Samples Collected: {state.currentSessionData.length}
        </Text>
      </View>
    </View>
  );

  /**
   * Render results view
   */
  const renderResultsView = () => (
    <View style={styles.container}>
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsTitle}>Test Results</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setState(prev => ({ ...prev, currentView: 'setup' }))}
        >
          <Text style={styles.backButtonText}>Back to Setup</Text>
        </TouchableOpacity>
      </View>

      <TestRetestVisualization
        comparison={state.currentComparison}
        longitudinalProgress={state.longitudinalProgress}
        showDetailedAnalysis={true}
        showSwayVisualization={true}
      />
    </View>
  );

  /**
   * Render history view
   */
  const renderHistoryView = () => (
    <View style={styles.container}>
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>Progress History</Text>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => setState(prev => ({ ...prev, currentView: 'setup' }))}
        >
          <Text style={styles.backButtonText}>Back to Setup</Text>
        </TouchableOpacity>
      </View>

      <TestRetestVisualization
        longitudinalProgress={state.longitudinalProgress}
        showDetailedAnalysis={false}
        showSwayVisualization={false}
      />
    </View>
  );

  /**
   * Main render method
   */
  return (
    <View style={styles.mainContainer}>
      {state.currentView === 'setup' && renderSetupView()}
      {state.currentView === 'test' && renderTestView()}
      {state.currentView === 'results' && renderResultsView()}
      {state.currentView === 'history' && renderHistoryView()}
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  optionGroup: {
    marginBottom: 16,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#495057',
    marginBottom: 8,
  },
  optionButton: {
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedOption: {
    backgroundColor: '#e7f1ff',
    borderColor: '#0d6efd',
  },
  optionText: {
    fontSize: 14,
    color: '#495057',
  },
  selectedOptionText: {
    color: '#0d6efd',
    fontWeight: '500',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  switchLabel: {
    fontSize: 16,
    color: '#495057',
  },
  protocolText: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 22,
  },
  actionButtons: {
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0d6efd',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#0d6efd',
  },
  secondaryButtonText: {
    color: '#0d6efd',
    fontSize: 16,
    fontWeight: '500',
  },
  testHeader: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  testTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 8,
  },
  testSubtitle: {
    fontSize: 16,
    color: '#6c757d',
    marginBottom: 16,
  },
  stopButton: {
    backgroundColor: '#dc3545',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  testMetrics: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  metricsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  metricsText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  historyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#212529',
  },
  backButton: {
    backgroundColor: '#6c757d',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  backButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default TestRetestDemo; 