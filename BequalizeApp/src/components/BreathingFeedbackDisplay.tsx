/**
 * Breathing Feedback Display Component for Bequalize Belt
 * Provides real-time visual feedback for breathing patterns and deviations
 */

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { BreathingFeedback, BreathingPattern, BreathingSessionState } from '../services/BreathingFeedbackManager';

interface BreathingFeedbackDisplayProps {
  currentFeedback?: BreathingFeedback;
  currentPattern?: BreathingPattern;
  sessionState?: BreathingSessionState;
  isActive?: boolean;
}

const BreathingFeedbackDisplay: React.FC<BreathingFeedbackDisplayProps> = ({
  currentFeedback,
  currentPattern,
  sessionState,
  isActive = false
}) => {
  const [breathingAnimation] = useState(new Animated.Value(1));
  const [pulseAnimation] = useState(new Animated.Value(1));

  useEffect(() => {
    if (!isActive || !currentPattern) return;

    // Create breathing animation based on current pattern
    const cycleTime = currentPattern.totalCycleDuration * 1000; // Convert to milliseconds
    
    const breathingCycle = Animated.loop(
      Animated.sequence([
        // Inhale phase
        Animated.timing(breathingAnimation, {
          toValue: 1.3,
          duration: cycleTime * 0.4, // 40% of cycle for inhale
          useNativeDriver: true,
        }),
        // Hold phase (if exists)
        currentPattern.phases.some(p => p.phase === 'hold') ?
          Animated.timing(breathingAnimation, {
            toValue: 1.3,
            duration: cycleTime * 0.2, // 20% for hold
            useNativeDriver: true,
          }) : Animated.timing(breathingAnimation, {
            toValue: 1.3,
            duration: 0,
            useNativeDriver: true,
          }),
        // Exhale phase
        Animated.timing(breathingAnimation, {
          toValue: 1,
          duration: cycleTime * 0.4, // 40% for exhale
          useNativeDriver: true,
        }),
      ])
    );

    breathingCycle.start();

    return () => {
      breathingCycle.stop();
    };
  }, [isActive, currentPattern, breathingAnimation]);

  useEffect(() => {
    if (!currentFeedback) return;

    // Pulse animation for feedback
    const pulseSequence = Animated.sequence([
      Animated.timing(pulseAnimation, {
        toValue: 1.1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(pulseAnimation, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]);

    pulseSequence.start();
  }, [currentFeedback?.timestamp, pulseAnimation]);

  const getFeedbackColor = (type: string) => {
    switch (type) {
      case 'positive': return '#28a745';
      case 'warning': return '#ffc107';
      case 'alert': return '#dc3545';
      default: return '#6c757d';
    }
  };

  const getFeedbackBackgroundColor = (type: string) => {
    switch (type) {
      case 'positive': return '#d4edda';
      case 'warning': return '#fff3cd';
      case 'alert': return '#f8d7da';
      default: return '#e9ecef';
    }
  };

  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'inhale': return '#007bff';
      case 'hold': return '#ffc107';
      case 'exhale': return '#28a745';
      case 'rest': return '#6c757d';
      default: return '#6c757d';
    }
  };

  const renderBreathingCircle = () => {
    if (!isActive) {
      return (
        <View style={styles.breathingCircleContainer}>
          <View style={[styles.breathingCircle, styles.inactiveCircle]}>
            <Text style={styles.inactiveText}>Start Breathing</Text>
          </View>
        </View>
      );
    }

    const currentPhase = currentFeedback?.expectedPhase?.phase || 'rest';
    const circleColor = getPhaseColor(currentPhase);

    return (
      <View style={styles.breathingCircleContainer}>
        <Animated.View
          style={[
            styles.breathingCircle,
            {
              backgroundColor: circleColor,
              transform: [{ scale: breathingAnimation }]
            }
          ]}
        >
          <Text style={styles.phaseText}>{currentPhase.toUpperCase()}</Text>
          {currentPattern && (
            <Text style={styles.rateText}>{currentPattern.targetRate} bpm</Text>
          )}
        </Animated.View>
      </View>
    );
  };

  const renderFeedbackMessage = () => {
    if (!currentFeedback) {
      return (
        <View style={styles.feedbackContainer}>
          <Text style={styles.placeholderText}>Breathing feedback will appear here</Text>
        </View>
      );
    }

    const backgroundColor = getFeedbackBackgroundColor(currentFeedback.feedbackType);
    const textColor = getFeedbackColor(currentFeedback.feedbackType);

    return (
      <Animated.View
        style={[
          styles.feedbackContainer,
          { backgroundColor, transform: [{ scale: pulseAnimation }] }
        ]}
      >
        <Text style={[styles.feedbackText, { color: textColor }]}>
          {currentFeedback.feedbackMessage}
        </Text>
      </Animated.View>
    );
  };

  const renderPatternInfo = () => {
    if (!currentPattern) return null;

    return (
      <View style={styles.patternContainer}>
        <Text style={styles.patternTitle}>{currentPattern.name}</Text>
        <Text style={styles.patternDescription}>{currentPattern.description}</Text>
        
        <View style={styles.phaseIndicators}>
          {currentPattern.phases.map((phase, index) => {
            const isCurrentPhase = currentFeedback?.expectedPhase?.phase === phase.phase;
            return (
              <View
                key={index}
                style={[
                  styles.phaseIndicator,
                  {
                    backgroundColor: getPhaseColor(phase.phase),
                    opacity: isCurrentPhase ? 1 : 0.3
                  }
                ]}
              >
                <Text style={styles.phaseIndicatorText}>{phase.phase}</Text>
                <Text style={styles.phaseDuration}>{phase.duration}s</Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  const renderSessionStats = () => {
    if (!sessionState) return null;

    const sessionDuration = (Date.now() - sessionState.sessionStartTime) / 1000;
    const minutes = Math.floor(sessionDuration / 60);
    const seconds = Math.floor(sessionDuration % 60);

    return (
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{sessionState.totalCycles}</Text>
          <Text style={styles.statLabel}>Cycles</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{minutes}:{seconds.toString().padStart(2, '0')}</Text>
          <Text style={styles.statLabel}>Duration</Text>
        </View>
        
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {sessionState.feedbackHistory.filter(f => f.feedbackType === 'positive').length}
          </Text>
          <Text style={styles.statLabel}>On Target</Text>
        </View>
      </View>
    );
  };

  const renderDeviationIndicator = () => {
    if (!currentFeedback || !currentPattern) return null;

    const deviation = currentFeedback.deviation.rateDeviation;
    const maxDeviation = 10; // bpm
    const deviationPercentage = Math.max(-100, Math.min(100, (deviation / maxDeviation) * 100));
    
    return (
      <View style={styles.deviationContainer}>
        <Text style={styles.deviationTitle}>Rate Deviation</Text>
        <View style={styles.deviationBar}>
          <View style={styles.deviationBackground}>
            <View
              style={[
                styles.deviationFill,
                {
                  left: deviationPercentage >= 0 ? '50%' : `${50 + deviationPercentage}%`,
                  width: `${Math.abs(deviationPercentage)}%`,
                  backgroundColor: Math.abs(deviation) > 5 ? '#dc3545' : 
                                   Math.abs(deviation) > 2 ? '#ffc107' : '#28a745'
                }
              ]}
            />
          </View>
          <View style={styles.deviationCenter} />
        </View>
        <View style={styles.deviationLabels}>
          <Text style={styles.deviationLabel}>Too Slow</Text>
          <Text style={styles.deviationLabel}>Target</Text>
          <Text style={styles.deviationLabel}>Too Fast</Text>
        </View>
        <Text style={styles.deviationValue}>
          {deviation > 0 ? '+' : ''}{deviation.toFixed(1)} bpm
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {renderBreathingCircle()}
      {renderFeedbackMessage()}
      {renderPatternInfo()}
      {renderDeviationIndicator()}
      {renderSessionStats()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 16,
  },
  breathingCircleContainer: {
    alignItems: 'center',
    marginVertical: 32,
  },
  breathingCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  inactiveCircle: {
    backgroundColor: '#e9ecef',
  },
  phaseText: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
  },
  rateText: {
    fontSize: 14,
    color: 'white',
    marginTop: 4,
    textAlign: 'center',
  },
  inactiveText: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
  },
  feedbackContainer: {
    backgroundColor: '#e9ecef',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    minHeight: 60,
    justifyContent: 'center',
  },
  feedbackText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  patternContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  patternTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 8,
  },
  patternDescription: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 16,
    lineHeight: 20,
  },
  phaseIndicators: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  phaseIndicator: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 60,
  },
  phaseIndicatorText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginBottom: 2,
  },
  phaseDuration: {
    fontSize: 10,
    color: 'white',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
  },
  deviationContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deviationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
    textAlign: 'center',
  },
  deviationBar: {
    height: 8,
    position: 'relative',
    marginBottom: 8,
  },
  deviationBackground: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    position: 'relative',
  },
  deviationFill: {
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    top: 0,
  },
  deviationCenter: {
    position: 'absolute',
    left: '50%',
    top: -2,
    width: 2,
    height: 12,
    backgroundColor: '#212529',
    marginLeft: -1,
  },
  deviationLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  deviationLabel: {
    fontSize: 10,
    color: '#6c757d',
  },
  deviationValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212529',
    textAlign: 'center',
  },
});

export default BreathingFeedbackDisplay; 