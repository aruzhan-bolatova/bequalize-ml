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
  
  // NEW: Enhanced debugging and monitoring state
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [breathingStatus, setBreathingStatus] = useState<any>(null);
  const [simulatedDifficulty, setSimulatedDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  
  // Services
  const breathingManager = useRef(new BreathingFeedbackManager());
  const sessionTimer = useRef<NodeJS.Timeout | null>(null);
  const phaseInterval = useRef<NodeJS.Timeout | null>(null);
  const statusUpdateInterval = useRef<NodeJS.Timeout | null>(null);

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

  // Enhanced breathing data processing with improved respiratory metrics
  useEffect(() => {
    if (isConnected && latestPacket && currentSession?.isActive) {
      // Enhanced respiratory metrics calculation for breathing exercises
      const recentElastometerValues = [latestPacket.elastometer_value]; // In real app, would use buffer
      const breathingRate = calculateBreathingRateFromElastometer(recentElastometerValues);
      const amplitude = Math.abs(latestPacket.elastometer_value - 2048);
      
      const respiratoryMetrics = {
        breathingRate: breathingRate,
        breathingAmplitude: amplitude,
        ieRatio: calculateIERatio(currentSession.currentPhase),
        breathingRegularity: calculateBreathingRegularity(amplitude),
        filteredSignal: [latestPacket.elastometer_value],
        peaks: [amplitude > 100 ? latestPacket.elastometer_value : 0],
        valleys: [amplitude < 50 ? latestPacket.elastometer_value : 0]
      };
      
      const feedback = breathingManager.current.processBreathingData(respiratoryMetrics);
      setCurrentFeedback(feedback);
      
      // Update breathing effort based on performance
      if (feedback) {
        const effortScore = feedback.isOnTarget ? 1.0 : Math.max(0.3, 1.0 - Math.abs(feedback.deviation.rateDeviation) / 10);
        bluetoothManager.setBreathingEffort(effortScore);
      }
    }
  }, [latestPacket, isConnected, currentSession?.isActive, currentSession?.currentPhase]);

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

  // NEW: Breathing exercise status monitoring
  useEffect(() => {
    if (currentSession?.isActive) {
      // Update breathing status every 500ms during active sessions
      statusUpdateInterval.current = setInterval(() => {
        const status = bluetoothManager.getBreathingExerciseStatus();
        setBreathingStatus(status);
      }, 500);
    } else {
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
        statusUpdateInterval.current = null;
      }
      setBreathingStatus(null);
    }

    return () => {
      if (statusUpdateInterval.current) {
        clearInterval(statusUpdateInterval.current);
      }
    };
  }, [currentSession?.isActive]);

  // Enhanced breathing cycle management with mock data integration
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
      
      // Update the mock data generator with current breathing phase
      bluetoothManager.setBreathingPhase(phase.name);
      
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
            // Update breathing cycle in mock data generator
            bluetoothManager.updateBreathingCycle();
            
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
      diaphragmatic: 'Guided Diaphragmatic Breathing',
      box_breathing: 'Controlled Deep Breathing',
      coherence: 'Single Leg Stand',
      relaxation: 'Weight Shifting Exercises'
    };

    // Calculate target breathing rate based on exercise timing
    const cycleTime = exercise.inhaleTime + exercise.holdTime + exercise.exhaleTime + exercise.restTime;
    const targetRate = Math.round(60 / cycleTime); // Convert to breaths per minute

    // Start the enhanced breathing exercise simulation with target rate
    bluetoothManager.startBreathingExercise(selectedExercise, targetRate);
    
    // Apply difficulty simulation
    bluetoothManager.simulateBreathingDifficulty(simulatedDifficulty);

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
    
    console.log(`🎯 Started ${exercise.name} session:`, {
      targetRate: targetRate,
      difficulty: simulatedDifficulty,
      targetCycles: exercise.cycles,
      exerciseType: selectedExercise
    });
  };

  const stopBreathingSession = () => {
    setCurrentSession(prev => prev ? { ...prev, isActive: false } : null);
    breathingManager.current.stopBreathingSession();
    
    // Stop the enhanced breathing exercise simulation
    bluetoothManager.stopBreathingExercise();
    
    if (phaseInterval.current) {
      clearInterval(phaseInterval.current);
    }
  };

  const completeSession = () => {
    const sessionStats = breathingManager.current.getSessionStatistics();
    const finalStatus = bluetoothManager.getBreathingExerciseStatus();
    
    Alert.alert(
      'Session Complete!',
      `Great job! You completed ${currentSession?.cycles} breathing cycles in ${Math.floor(totalSessionTime / 60)} minutes.`,
      [{ 
        text: 'OK', 
        onPress: () => {
          setCurrentSession(null);
          // Stop the enhanced breathing exercise simulation
          bluetoothManager.stopBreathingExercise();
        }
      }]
    );
    
    breathingManager.current.stopBreathingSession();
    
    console.log(`✅ Completed ${breathingExercises[selectedExercise].name} session:`, {
      cycles: currentSession?.cycles,
      duration: totalSessionTime,
      sessionStats: sessionStats,
      finalStatus: finalStatus
    });
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
        
        {/* NEW: Difficulty Selection */}
        <View style={styles.difficultySelector}>
          <Text style={styles.selectorLabel}>Simulation Difficulty:</Text>
          <View style={styles.difficultyButtons}>
            {(['easy', 'medium', 'hard'] as const).map((difficulty) => (
              <TouchableOpacity
                key={difficulty}
                style={[
                  styles.difficultyButton,
                  simulatedDifficulty === difficulty && styles.selectedDifficultyButton
                ]}
                onPress={() => setSimulatedDifficulty(difficulty)}
              >
                <Text style={[
                  styles.difficultyButtonText,
                  simulatedDifficulty === difficulty && styles.selectedDifficultyText
                ]}>
                  {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* NEW: Debug Toggle */}
        <TouchableOpacity
          style={styles.debugToggle}
          onPress={() => setShowDebugInfo(!showDebugInfo)}
        >
          <Text style={styles.debugToggleText}>
            {showDebugInfo ? '🔍 Hide' : '🔍 Show'} Debug Info
          </Text>
        </TouchableOpacity>
        
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
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.sessionContentContainer}
      showsVerticalScrollIndicator={true}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTitle}>
          {breathingExercises[selectedExercise].name}
        </Text>
        <Text style={styles.sessionProgress}>
          Cycle {currentSession?.cycles || 0} of {currentSession?.targetCycles || 0}
        </Text>
        <Text style={styles.difficultyIndicator}>
          Difficulty: {simulatedDifficulty.charAt(0).toUpperCase() + simulatedDifficulty.slice(1)}
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
        <View style={styles.feedbackContainer}>
          <BreathingFeedbackDisplay
            currentFeedback={currentFeedback}
            currentPattern={currentPattern || undefined}
            sessionState={breathingManager.current.getCurrentSessionState() || undefined}
            isActive={currentSession?.isActive || false}
          />
        </View>
      )}

      {/* NEW: Enhanced Debug Information */}
      {showDebugInfo && (breathingStatus || latestPacket) && (
        <View style={styles.debugContainer}>
          <Text style={styles.debugTitle}>🔍 Debug Information</Text>
          
          {breathingStatus && (
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Breathing Exercise Status:</Text>
              <Text style={styles.debugText}>• Exercise Type: {breathingStatus.exerciseType}</Text>
              <Text style={styles.debugText}>• Current Phase: {breathingStatus.currentPhase}</Text>
              <Text style={styles.debugText}>• Target Rate: {breathingStatus.targetRate} bpm</Text>
              <Text style={styles.debugText}>• User Effort: {(breathingStatus.userEffort * 100).toFixed(0)}%</Text>
              <Text style={styles.debugText}>• Regularity: {(breathingStatus.regularity * 100).toFixed(0)}%</Text>
              <Text style={styles.debugText}>• Phase Elapsed: {breathingStatus.phaseElapsed.toFixed(1)}s</Text>
              <Text style={styles.debugText}>• Cycle Elapsed: {breathingStatus.cycleElapsed.toFixed(1)}s</Text>
            </View>
          )}

          {latestPacket && (
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Sensor Data:</Text>
              <Text style={styles.debugText}>• Elastometer: {latestPacket.elastometer_value}</Text>
              <Text style={styles.debugText}>• Amplitude: {Math.abs(latestPacket.elastometer_value - 2048)}</Text>
              <Text style={styles.debugText}>• Battery: {latestPacket.battery_percent}%</Text>
              <Text style={styles.debugText}>• Temperature: {latestPacket.temperature_celsius}°C</Text>
            </View>
          )}

          {currentFeedback && (
            <View style={styles.debugSection}>
              <Text style={styles.debugSectionTitle}>Feedback Metrics:</Text>
              <Text style={styles.debugText}>• On Target: {currentFeedback.isOnTarget ? '✅' : '❌'}</Text>
              <Text style={styles.debugText}>• Rate Deviation: {currentFeedback.deviation.rateDeviation.toFixed(1)} bpm</Text>
              <Text style={styles.debugText}>• Deviation Type: {currentFeedback.deviation.deviationType}</Text>
              <Text style={styles.debugText}>• Severity: {currentFeedback.deviation.severity}</Text>
              <Text style={styles.debugText}>• Feedback Type: {currentFeedback.feedbackType}</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.debugCloseButton}
            onPress={() => setShowDebugInfo(false)}
          >
            <Text style={styles.debugCloseText}>Hide Debug Info</Text>
          </TouchableOpacity>
        </View>
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
    </ScrollView>
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

  // Helper functions for enhanced respiratory analysis
  const calculateBreathingRateFromElastometer = (values: number[]): number => {
    if (values.length < 10) return 15; // Default fallback
    
    // Simple rate estimation based on elastometer variation
    const variation = Math.abs(values[values.length - 1] - 2048);
    if (variation > 200) return 8;  // Deep breathing
    if (variation > 100) return 12; // Normal breathing
    return 15; // Light breathing
  };

  const calculateIERatio = (phase: 'inhale' | 'hold' | 'exhale' | 'rest'): number => {
    const exercise = breathingExercises[selectedExercise];
    const totalCycle = exercise.inhaleTime + exercise.holdTime + exercise.exhaleTime + exercise.restTime;
    return exercise.inhaleTime / (exercise.exhaleTime || 1);
  };

  const calculateBreathingRegularity = (amplitude: number): number => {
    // Simple regularity estimation based on amplitude consistency
    if (amplitude > 150) return 0.9; // Good depth consistency
    if (amplitude > 100) return 0.8; // Moderate consistency
    return 0.6; // Low consistency
  };

  return currentSession?.isActive ? renderActiveSession() : renderExerciseSelection();
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  sessionContentContainer: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40, // Extra bottom padding for safe scrolling
  },
  feedbackContainer: {
    marginBottom: 20,
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
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 8,
    textAlign: 'center',
  },
  sessionProgress: {
    fontSize: 16,
    color: '#6c757d',
  },
  difficultyIndicator: {
    fontSize: 16,
    color: '#495057',
    marginTop: 10,
  },
  breathingGuideContainer: {
    alignItems: 'center',
    marginBottom: 30,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  breathingGuide: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#0d6efd',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  breathingGuideText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  phaseTimer: {
    fontSize: 42,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  stopButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  // NEW: Difficulty Selection Styles
  difficultySelector: {
    marginBottom: 20,
    alignItems: 'center',
  },
  selectorLabel: {
    fontSize: 16,
    color: '#495057',
    marginBottom: 10,
  },
  difficultyButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  difficultyButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  selectedDifficultyButton: {
    backgroundColor: '#0d6efd',
    borderColor: '#0d6efd',
  },
  difficultyButtonText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  selectedDifficultyText: {
    color: '#fff',
  },
  // NEW: Debug Toggle Styles
  debugToggle: {
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    marginBottom: 20,
  },
  debugToggleText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  // NEW: Debug Information Styles
  debugContainer: {
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
  debugTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 15,
    textAlign: 'center',
  },
  debugSection: {
    marginBottom: 15,
  },
  debugSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 8,
  },
  debugText: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  debugCloseButton: {
    backgroundColor: '#e9ecef',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ced4da',
    marginTop: 15,
  },
  debugCloseText: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default BreathingExerciseTab; 