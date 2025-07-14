import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';

// Components
import PosturalSwayVisualization from './PosturalSwayVisualization';
import TestRetestVisualization from './TestRetestVisualization';

// Services
import { EnhancedMockBluetoothManager } from '../services/EnhancedMockBluetoothManager';
import { LocalStorageService } from '../services/LocalStorageService';
import { TestRetestManager } from '../services/TestRetestManager';

// Types
import { SensorDataPacket, ExerciseType } from '../types/SensorData';
import { TestSession, SessionComparison, LongitudinalProgress } from '../services/TestRetestManager';

type TestPhase = 'setup' | 'pre-test' | 'exercise-selection' | 'exercise' | 'post-test' | 'results';

interface BalanceTestingTabProps {
  bluetoothManager: EnhancedMockBluetoothManager;
  storageService: LocalStorageService;
  isConnected: boolean;
  latestPacket: SensorDataPacket | null;
}

const BalanceTestingTab: React.FC<BalanceTestingTabProps> = ({
  bluetoothManager,
  storageService,
  isConnected,
  latestPacket
}) => {
  // Test flow state
  const [currentPhase, setCurrentPhase] = useState<TestPhase>('setup');
  const [timeRemaining, setTimeRemaining] = useState(30);
  const [isTimerActive, setIsTimerActive] = useState(false);
  
  // Test data
  const [exerciseType, setExerciseType] = useState<ExerciseType>('Romberg Test (Eyes Open)');
  const [preTestSession, setPreTestSession] = useState<TestSession | null>(null);
  const [postTestSession, setPostTestSession] = useState<TestSession | null>(null);
  const [sessionComparison, setSessionComparison] = useState<SessionComparison | null>(null);
  const [longitudinalProgress, setLongitudinalProgress] = useState<LongitudinalProgress | null>(null);
  
  // Current session data
  const [currentSessionData, setCurrentSessionData] = useState<SensorDataPacket[]>([]);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  
  // Services
  const testRetestManager = useRef(new TestRetestManager());
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Exercise options
  const exerciseOptions: ExerciseType[] = [
    'Romberg Test (Eyes Open)',
    'Romberg Test (Eyes Closed)',
    'Single Leg Stand',
    'Weight Shifting Exercises',
    'Limits of Stability Test'
  ];

  // Timer effect
  useEffect(() => {
    if (isTimerActive && timeRemaining > 0) {
      timerRef.current = setTimeout(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
    } else if (timeRemaining === 0 && isTimerActive) {
      handleTimerComplete();
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [isTimerActive, timeRemaining]);

  // Collect sensor data during tests
  useEffect(() => {
    if ((currentPhase === 'pre-test' || currentPhase === 'post-test') && latestPacket) {
      setCurrentSessionData(prev => [...prev, latestPacket]);
    }
  }, [latestPacket, currentPhase]);

  const startTimer = (duration: number) => {
    setTimeRemaining(duration);
    setIsTimerActive(true);
    setCurrentSessionData([]);
    setSessionStartTime(Date.now());
  };

  const stopTimer = () => {
    setIsTimerActive(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  };

  const handleTimerComplete = async () => {
    stopTimer();
    
    try {
      if (currentPhase === 'pre-test') {
        // Save pre-test session
        const sessionId = await testRetestManager.current.startTestSession(
          'user_001',
          exerciseType,
          'standing',
          'pre'
        );
        
        const session = await testRetestManager.current.completeTestSession(
          sessionId,
          'user_001',
          exerciseType,
          'standing',
          'pre',
          currentSessionData,
          30
        );
        
        setPreTestSession(session);
        
        Alert.alert('Pre-Test Complete!', 'Now select and perform your exercise.', [
          { text: 'Continue', onPress: () => setCurrentPhase('exercise-selection') }
        ]);
        
      } else if (currentPhase === 'post-test') {
        // Save post-test session
        const sessionId = await testRetestManager.current.startTestSession(
          'user_001',
          exerciseType,
          'standing',
          'post'
        );
        
        const session = await testRetestManager.current.completeTestSession(
          sessionId,
          'user_001',
          exerciseType,
          'standing',
          'post',
          currentSessionData,
          30
        );
        
        setPostTestSession(session);
        
        // Generate comparison
        if (preTestSession && session) {
          const comparison = await testRetestManager.current.comparePrePostSessions(
            preTestSession.sessionId,
            session.sessionId
          );
          setSessionComparison(comparison);
          
          const progress = await testRetestManager.current.getLongitudinalProgress('user_001');
          setLongitudinalProgress(progress);
        }
        
        Alert.alert('Post-Test Complete!', 'View your balance improvement results.', [
          { text: 'View Results', onPress: () => setCurrentPhase('results') }
        ]);
      }
    } catch (error) {
      console.error('Error completing test phase:', error);
      Alert.alert('Error', 'Failed to save test data. Please try again.');
    }
  };

  const startPreTest = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your Bequalize Belt first.');
      return;
    }
    setCurrentPhase('pre-test');
    startTimer(30);
  };

  const startPostTest = () => {
    setCurrentPhase('post-test');
    startTimer(30);
  };

  const resetTest = () => {
    stopTimer();
    setCurrentPhase('setup');
    setPreTestSession(null);
    setPostTestSession(null);
    setSessionComparison(null);
    setLongitudinalProgress(null);
    setCurrentSessionData([]);
    setSessionStartTime(null);
  };

  const renderSetupPhase = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Balance Testing Protocol</Text>
        <Text style={styles.subtitle}>
          Complete a 30-second pre-test, perform exercises, then a 30-second post-test
        </Text>
      </View>

      <View style={styles.protocolCard}>
        <Text style={styles.cardTitle}>📋 Test Protocol</Text>
        <Text style={styles.protocolStep}>1. Pre-Exercise Test (30 seconds)</Text>
        <Text style={styles.protocolStep}>2. Exercise Activity (your choice)</Text>
        <Text style={styles.protocolStep}>3. Post-Exercise Test (30 seconds)</Text>
        <Text style={styles.protocolStep}>4. View Balance Improvement Results</Text>
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Ready to Begin?</Text>
        <Text style={styles.connectionStatus}>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
        
        <TouchableOpacity
          style={[styles.primaryButton, !isConnected && styles.disabledButton]}
          onPress={startPreTest}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>🏁 Start Pre-Exercise Test</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderTestPhase = () => (
    <View style={styles.testContainer}>
      <View style={styles.testHeader}>
        <Text style={styles.testTitle}>
          {currentPhase === 'pre-test' ? '📊 PRE-EXERCISE TEST' : '📊 POST-EXERCISE TEST'}
        </Text>
        <Text style={styles.testSubtitle}>Stand as still as possible</Text>
      </View>

      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{timeRemaining}</Text>
        <Text style={styles.timerLabel}>seconds remaining</Text>
        
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${((30 - timeRemaining) / 30) * 100}%` }
            ]} 
          />
        </View>
      </View>

      <View style={styles.instructionsCard}>
        <Text style={styles.instructionTitle}>Instructions:</Text>
        <Text style={styles.instruction}>• Stand with feet together</Text>
        <Text style={styles.instruction}>• Look straight ahead</Text>
        <Text style={styles.instruction}>• Keep arms at your sides</Text>
        <Text style={styles.instruction}>• Try not to move</Text>
      </View>

      <View style={styles.metricsCard}>
        <Text style={styles.metricsTitle}>Live Metrics</Text>
        <Text style={styles.metricsText}>
          Samples Collected: {currentSessionData.length}
        </Text>
        <Text style={styles.metricsText}>
          Sample Rate: {currentSessionData.length > 0 ? '50 Hz' : 'No Data'}
        </Text>
      </View>

      <TouchableOpacity
        style={styles.emergencyButton}
        onPress={() => {
          stopTimer();
          Alert.alert('Test Stopped', 'Test has been cancelled.', [
            { text: 'Back to Setup', onPress: () => setCurrentPhase('setup') }
          ]);
        }}
      >
        <Text style={styles.emergencyButtonText}>⏹️ Stop Test</Text>
      </TouchableOpacity>
    </View>
  );

  const renderExerciseSelection = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Your Exercise</Text>
        <Text style={styles.subtitle}>
          Choose an exercise to perform between tests
        </Text>
      </View>

      <View style={styles.exerciseGrid}>
        {exerciseOptions.map((exercise) => (
          <TouchableOpacity
            key={exercise}
            style={[
              styles.exerciseOption,
              exerciseType === exercise && styles.selectedExercise
            ]}
            onPress={() => setExerciseType(exercise)}
          >
            <Text style={[
              styles.exerciseText,
              exerciseType === exercise && styles.selectedExerciseText
            ]}>
              {exercise}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.cardTitle}>Selected: {exerciseType}</Text>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => setCurrentPhase('exercise')}
        >
          <Text style={styles.buttonText}>Continue to Exercise</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderExercisePhase = () => (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Perform Your Exercise</Text>
        <Text style={styles.subtitle}>{exerciseType}</Text>
      </View>

      <View style={styles.exerciseInstructions}>
        <Text style={styles.cardTitle}>Exercise Instructions</Text>
        <Text style={styles.instruction}>
          Perform your selected exercise for as long as comfortable.
        </Text>
        <Text style={styles.instruction}>
          When ready, proceed to the post-exercise test.
        </Text>
      </View>

      <View style={styles.actionCard}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={startPostTest}
        >
          <Text style={styles.buttonText}>🏁 Start Post-Exercise Test</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResults = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Balance Test Results</Text>
        <Text style={styles.subtitle}>Your postural sway analysis</Text>
      </View>

      {sessionComparison && (
        <TestRetestVisualization
          comparison={sessionComparison}
          longitudinalProgress={longitudinalProgress || undefined}
          showDetailedAnalysis={true}
          showSwayVisualization={true}
        />
      )}

      <View style={styles.actionCard}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={resetTest}
        >
          <Text style={styles.buttonText}>🔄 Start New Test</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  // Main render
  switch (currentPhase) {
    case 'setup':
      return renderSetupPhase();
    case 'pre-test':
    case 'post-test':
      return renderTestPhase();
    case 'exercise-selection':
      return renderExerciseSelection();
    case 'exercise':
      return renderExercisePhase();
    case 'results':
      return renderResults();
    default:
      return renderSetupPhase();
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  testContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 20,
    justifyContent: 'center',
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
  protocolCard: {
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
  protocolStep: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
    paddingLeft: 8,
  },
  actionCard: {
    backgroundColor: '#fff',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  connectionStatus: {
    fontSize: 16,
    marginBottom: 16,
    color: '#495057',
  },
  primaryButton: {
    backgroundColor: '#0d6efd',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 200,
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  testHeader: {
    alignItems: 'center',
    marginBottom: 30,
  },
  testTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  testSubtitle: {
    fontSize: 18,
    color: '#6c757d',
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 72,
    fontWeight: 'bold',
    color: '#0d6efd',
    marginBottom: 8,
  },
  timerLabel: {
    fontSize: 18,
    color: '#6c757d',
    marginBottom: 20,
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0d6efd',
  },
  instructionsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  instruction: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 8,
  },
  metricsCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  metricsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  metricsText: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 4,
  },
  emergencyButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  exerciseGrid: {
    padding: 20,
  },
  exerciseOption: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  selectedExercise: {
    borderColor: '#0d6efd',
    backgroundColor: '#f8f9ff',
  },
  exerciseText: {
    fontSize: 16,
    color: '#495057',
  },
  selectedExerciseText: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  exerciseInstructions: {
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
});

export default BalanceTestingTab; 