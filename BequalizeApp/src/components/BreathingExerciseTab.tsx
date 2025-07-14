import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';

// Components
import BreathingFeedbackDisplay from './BreathingFeedbackDisplay';

// Services
import { EnhancedMockBluetoothManager } from '../services/EnhancedMockBluetoothManager';
import { BreathingFeedbackManager } from '../services/BreathingFeedbackManager';

// Types
import { SensorDataPacket, ExerciseType } from '../types/SensorData';
import { BreathingPattern, BreathingFeedback } from '../services/BreathingFeedbackManager';

interface BreathingExerciseTabProps {
  bluetoothManager: EnhancedMockBluetoothManager;
  isConnected: boolean;
  latestPacket: SensorDataPacket | null;
}

type BreathingExerciseType = 'diaphragmatic' | 'box_breathing' | 'coherence' | 'relaxation';

interface BreathingSession {
  type: BreathingExerciseType;
  duration: number;
  isActive: boolean;
  startTime: number | null;
  currentPhase: 'inhale' | 'hold' | 'exhale' | 'rest';
  cycles: number;
  targetCycles: number;
}

const BreathingExerciseTab: React.FC<BreathingExerciseTabProps> = ({
  bluetoothManager,
  isConnected,
  latestPacket
}) => {
  // Breathing session state
  const [currentSession, setCurrentSession] = useState<BreathingSession | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<BreathingExerciseType>('diaphragmatic');
  const [currentPattern, setCurrentPattern] = useState<BreathingPattern | null>(null);
  const [currentFeedback, setCurrentFeedback] = useState<BreathingFeedback | null>(null);
  
  // UI state
  const [breathingGuideScale] = useState(new Animated.Value(1));
  const [phaseTimer, setPhaseTimer] = useState(0);
  const [totalSessionTime, setTotalSessionTime] = useState(0);
  
  // Services
  const breathingManager = useRef(new BreathingFeedbackManager());
  const sessionTimer = useRef<NodeJS.Timeout | null>(null);
  const phaseInterval = useRef<NodeJS.Timeout | null>(null);

  // Breathing exercise definitions
  const breathingExercises = {
    diaphragmatic: {
      name: 'Diaphragmatic Breathing',
      description: 'Deep belly breathing to improve core stability and reduce anxiety',
      inhaleTime: 4,
      holdTime: 2,
      exhaleTime: 6,
      restTime: 2,
      cycles: 10,
      icon: '🫁'
    },
    box_breathing: {
      name: 'Box Breathing',
      description: 'Equal timing for focus and balance improvement',
      inhaleTime: 4,
      holdTime: 4,
      exhaleTime: 4,
      restTime: 4,
      cycles: 8,
      icon: '⏹️'
    },
    coherence: {
      name: 'Heart Rate Coherence',
      description: 'Synchronized breathing for optimal heart rate variability',
      inhaleTime: 5,
      holdTime: 0,
      exhaleTime: 5,
      restTime: 0,
      cycles: 12,
      icon: '💓'
    },
    relaxation: {
      name: 'Relaxation Breathing',
      description: 'Slow, calming breaths for stress relief',
      inhaleTime: 4,
      holdTime: 2,
      exhaleTime: 8,
      restTime: 2,
      cycles: 8,
      icon: '😌'
    }
  };

  // Initialize breathing manager
  useEffect(() => {
    if (isConnected && latestPacket && currentSession?.isActive) {
      // Create respiratory metrics from elastometer data
      const respiratoryMetrics = {
        breathingRate: 15, // placeholder - would be calculated from signal processing
        breathingAmplitude: latestPacket.elastometer_value,
        ieRatio: 0.5,
        breathingRegularity: 0.8,
        filteredSignal: [latestPacket.elastometer_value],
        peaks: [0],
        valleys: [0]
      };
      
      const feedback = breathingManager.current.processBreathingData(respiratoryMetrics);
      setCurrentFeedback(feedback);
    }
  }, [latestPacket, isConnected, currentSession?.isActive]);

  // Session timer
  useEffect(() => {
    if (currentSession?.isActive) {
      sessionTimer.current = setInterval(() => {
        setTotalSessionTime(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
      }
    }

    return () => {
      if (sessionTimer.current) {
        clearInterval(sessionTimer.current);
      }
    };
  }, [currentSession?.isActive]);

  // Breathing animation and phase management
  useEffect(() => {
    if (currentSession?.isActive && currentPattern) {
      runBreathingCycle();
    }

    return () => {
      if (phaseInterval.current) {
        clearInterval(phaseInterval.current);
      }
    };
  }, [currentSession?.isActive, currentPattern]);

  const runBreathingCycle = () => {
    if (!currentSession || !currentPattern) return;

    const exercise = breathingExercises[selectedExercise];
    let phaseIndex = 0;
    const phases: Array<{ name: 'inhale' | 'hold' | 'exhale' | 'rest', duration: number, scale: number }> = [
      { name: 'inhale', duration: exercise.inhaleTime, scale: 1.5 },
      { name: 'hold', duration: exercise.holdTime, scale: 1.5 },
      { name: 'exhale', duration: exercise.exhaleTime, scale: 0.8 },
      { name: 'rest', duration: exercise.restTime, scale: 1.0 }
    ];

    const runPhase = () => {
      if (!currentSession?.isActive) return;

      const phase = phases[phaseIndex];
      setCurrentSession(prev => prev ? { ...prev, currentPhase: phase.name } : null);
      
      // Animate breathing guide
      Animated.timing(breathingGuideScale, {
        toValue: phase.scale,
        duration: phase.duration * 1000,
        useNativeDriver: true,
      }).start();

      // Phase countdown
      let timeLeft = phase.duration;
      setPhaseTimer(timeLeft);
      
      const countdown = setInterval(() => {
        timeLeft--;
        setPhaseTimer(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(countdown);
          phaseIndex = (phaseIndex + 1) % phases.length;
          
          // Complete cycle after rest phase
          if (phaseIndex === 0) {
            setCurrentSession(prev => {
              if (prev) {
                const newCycles = prev.cycles + 1;
                if (newCycles >= prev.targetCycles) {
                  completeSession();
                  return { ...prev, cycles: newCycles, isActive: false };
                }
                return { ...prev, cycles: newCycles };
              }
              return prev;
            });
          }
          
          if (currentSession?.isActive) {
            setTimeout(runPhase, 100);
          }
        }
      }, 1000);
    };

    runPhase();
  };

  const startBreathingSession = () => {
    if (!isConnected) {
      Alert.alert('Not Connected', 'Please connect to your Bequalize Belt first.');
      return;
    }

    const exercise = breathingExercises[selectedExercise];
    
    // Map to actual exercise types
    const exerciseTypeMap: Record<BreathingExerciseType, ExerciseType> = {
      diaphragmatic: 'Romberg Test (Eyes Open)',
      box_breathing: 'Romberg Test (Eyes Closed)',
      coherence: 'Single Leg Stand',
      relaxation: 'Weight Shifting Exercises'
    };

    const pattern = breathingManager.current.startBreathingSession(
      exerciseTypeMap[selectedExercise]
    );

    setCurrentPattern(pattern);
    setCurrentSession({
      type: selectedExercise,
      duration: 0,
      isActive: true,
      startTime: Date.now(),
      currentPhase: 'inhale',
      cycles: 0,
      targetCycles: exercise.cycles
    });

    setTotalSessionTime(0);
  };

  const stopBreathingSession = () => {
    setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
    breathingManager.current.stopBreathingSession();
    
    if (phaseInterval.current) {
      clearInterval(phaseInterval.current);
    }
  };

  const completeSession = () => {
    Alert.alert(
      'Session Complete!',
      `Great job! You completed ${currentSession?.cycles} breathing cycles in ${Math.floor(totalSessionTime / 60)} minutes.`,
      [{ text: 'OK', onPress: () => setCurrentSession(null) }]
    );
    
    breathingManager.current.stopBreathingSession();
  };

  const renderExerciseSelection = () => (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Breathing Exercises</Text>
        <Text style={styles.subtitle}>
          Guided breathing exercises for balance and relaxation
        </Text>
      </View>

      <View style={styles.exerciseGrid}>
        {(Object.keys(breathingExercises) as BreathingExerciseType[]).map((key) => {
          const exercise = breathingExercises[key];
          return (
            <TouchableOpacity
              key={key}
              style={[
                styles.exerciseCard,
                selectedExercise === key && styles.selectedCard
              ]}
              onPress={() => setSelectedExercise(key)}
            >
              <Text style={styles.exerciseIcon}>{exercise.icon}</Text>
              <Text style={[
                styles.exerciseName,
                selectedExercise === key && styles.selectedText
              ]}>
                {exercise.name}
              </Text>
              <Text style={styles.exerciseDescription}>
                {exercise.description}
              </Text>
              <View style={styles.exerciseDetails}>
                <Text style={styles.detailText}>
                  🔄 {exercise.cycles} cycles
                </Text>
                <Text style={styles.detailText}>
                  ⏱️ ~{Math.ceil((exercise.inhaleTime + exercise.holdTime + exercise.exhaleTime + exercise.restTime) * exercise.cycles / 60)} min
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.actionCard}>
        <Text style={styles.connectionStatus}>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>
        
        <TouchableOpacity
          style={[styles.primaryButton, !isConnected && styles.disabledButton]}
          onPress={startBreathingSession}
          disabled={!isConnected}
        >
          <Text style={styles.buttonText}>
            {breathingExercises[selectedExercise].icon} Start {breathingExercises[selectedExercise].name}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderActiveSession = () => (
    <View style={styles.sessionContainer}>
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>
          {breathingExercises[selectedExercise].name}
        </Text>
        <Text style={styles.sessionProgress}>
          Cycle {currentSession?.cycles || 0} of {currentSession?.targetCycles || 0}
        </Text>
      </View>

      <View style={styles.breathingGuideContainer}>
        <Animated.View 
          style={[
            styles.breathingGuide,
            { transform: [{ scale: breathingGuideScale }] }
          ]}
        >
          <Text style={styles.breathingGuideText}>
            {currentSession?.currentPhase?.toUpperCase()}
          </Text>
        </Animated.View>
        
        <Text style={styles.phaseTimer}>{phaseTimer}</Text>
        <Text style={styles.phaseLabel}>seconds</Text>
      </View>

      <View style={styles.instructionCard}>
        <Text style={styles.instructionText}>
          {getPhaseInstruction(currentSession?.currentPhase || 'inhale')}
        </Text>
      </View>

             {currentFeedback && (
         <BreathingFeedbackDisplay
           currentFeedback={currentFeedback}
           currentPattern={currentPattern || undefined}
           sessionState={breathingManager.current.getCurrentSessionState() || undefined}
           isActive={currentSession?.isActive || false}
         />
       )}

      <View style={styles.sessionStats}>
        <Text style={styles.statText}>
          ⏱️ {Math.floor(totalSessionTime / 60)}:{(totalSessionTime % 60).toString().padStart(2, '0')}
        </Text>
        <Text style={styles.statText}>
          🫁 {currentSession?.cycles} cycles completed
        </Text>
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={stopBreathingSession}
      >
        <Text style={styles.stopButtonText}>⏹️ Stop Session</Text>
      </TouchableOpacity>
    </View>
  );

  const getPhaseInstruction = (phase: string): string => {
    switch (phase) {
      case 'inhale':
        return 'Breathe in slowly through your nose';
      case 'hold':
        return 'Hold your breath gently';
      case 'exhale':
        return 'Breathe out slowly through pursed lips';
      case 'rest':
        return 'Relax and prepare for the next breath';
      default:
        return 'Follow the breathing guide';
    }
  };

  return currentSession?.isActive ? renderActiveSession() : renderExerciseSelection();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  sessionContainer: {
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
  exerciseGrid: {
    padding: 20,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedCard: {
    borderColor: '#0d6efd',
    backgroundColor: '#f8f9ff',
  },
  exerciseIcon: {
    fontSize: 32,
    textAlign: 'center',
    marginBottom: 8,
  },
  exerciseName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
    marginBottom: 8,
  },
  selectedText: {
    color: '#0d6efd',
  },
  exerciseDescription: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  exerciseDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailText: {
    fontSize: 12,
    color: '#495057',
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
    minWidth: 250,
  },
  disabledButton: {
    backgroundColor: '#adb5bd',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sessionHeader: {
    alignItems: 'center',
    marginBottom: 40,
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
  },
  sessionProgress: {
    fontSize: 16,
    color: '#6c757d',
  },
  breathingGuideContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  breathingGuide: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  breathingGuideText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  phaseTimer: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  phaseLabel: {
    fontSize: 16,
    color: '#6c757d',
  },
  instructionCard: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    alignItems: 'center',
  },
  instructionText: {
    fontSize: 18,
    color: '#212529',
    textAlign: 'center',
    lineHeight: 24,
  },
  sessionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  statText: {
    fontSize: 16,
    color: '#495057',
    fontWeight: '500',
  },
  stopButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default BreathingExerciseTab; 