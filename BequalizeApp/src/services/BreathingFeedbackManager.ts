/**
 * Breathing Feedback Manager for Bequalize Belt
 * Provides real-time breathing pattern monitoring and feedback
 * Based on research: normal adult breathing rate 12-18 bpm, >20-25 bpm abnormal
 */

import { RespiratoryMetrics, ExerciseType } from '../types/SensorData';

export interface BreathingPhase {
  phase: 'inhale' | 'hold' | 'exhale' | 'rest';
  duration: number; // in seconds
  targetRate?: number; // breaths per minute for this phase
}

export interface BreathingPattern {
  name: string;
  exerciseType: ExerciseType;
  phases: BreathingPhase[];
  totalCycleDuration: number; // total cycle time in seconds
  targetRate: number; // overall target breathing rate (bpm)
  description: string;
}

export interface BreathingFeedback {
  isOnTarget: boolean;
  currentPhase: BreathingPhase;
  expectedPhase: BreathingPhase;
  deviation: BreathingDeviation;
  feedbackMessage: string;
  feedbackType: 'positive' | 'warning' | 'alert';
  timestamp: number;
}

export interface BreathingDeviation {
  rateDeviation: number; // difference from target rate (bpm)
  phaseDeviation: number; // time difference from expected phase (seconds)
  deviationType: 'too_fast' | 'too_slow' | 'irregular' | 'correct';
  severity: 'mild' | 'moderate' | 'severe';
}

export interface BreathingSessionState {
  currentPattern: BreathingPattern;
  sessionStartTime: number;
  currentCycleStartTime: number;
  currentPhaseIndex: number;
  totalCycles: number;
  feedbackHistory: BreathingFeedback[];
  isActive: boolean;
}

export class BreathingFeedbackManager {
  private sessionState: BreathingSessionState | null = null;
  private readonly FEEDBACK_THRESHOLD_MILD = 2; // bpm deviation
  private readonly FEEDBACK_THRESHOLD_MODERATE = 5; // bpm deviation
  private readonly FEEDBACK_THRESHOLD_SEVERE = 8; // bpm deviation
  private readonly PHASE_TIMING_TOLERANCE = 1.0; // seconds tolerance for phase timing

  // Predefined breathing patterns based on clinical guidelines
  private readonly breathingPatterns: BreathingPattern[] = [
    {
      name: 'Normal Standing Balance',
      exerciseType: 'Romberg Test (Eyes Open)',
      phases: [
        { phase: 'inhale', duration: 2.0 },
        { phase: 'exhale', duration: 3.0 }
      ],
      totalCycleDuration: 5.0,
      targetRate: 12, // 12 bpm - calm, stable breathing
      description: 'Calm, natural breathing for balance assessment'
    },
    {
      name: 'Focused Balance',
      exerciseType: 'Romberg Test (Eyes Closed)',
      phases: [
        { phase: 'inhale', duration: 2.5 },
        { phase: 'exhale', duration: 3.5 }
      ],
      totalCycleDuration: 6.0,
      targetRate: 10, // 10 bpm - slower for concentration
      description: 'Slower, deeper breathing for eyes-closed balance'
    },
    {
      name: 'Dynamic Balance',
      exerciseType: 'Single Leg Stand',
      phases: [
        { phase: 'inhale', duration: 2.0 },
        { phase: 'hold', duration: 1.0 },
        { phase: 'exhale', duration: 3.0 }
      ],
      totalCycleDuration: 6.0,
      targetRate: 10, // 10 bpm - controlled breathing for stability
      description: 'Controlled breathing with brief hold for dynamic balance'
    },
    {
      name: 'Anxiety Management',
      exerciseType: 'Romberg Test (Eyes Open)',
      phases: [
        { phase: 'inhale', duration: 4.0 },
        { phase: 'hold', duration: 2.0 },
        { phase: 'exhale', duration: 6.0 }
      ],
      totalCycleDuration: 12.0,
      targetRate: 5, // 5 bpm - very slow for anxiety/stress reduction
      description: '4-2-6 breathing pattern for anxiety and stress management'
    },
    {
      name: 'Recovery Breathing',
      exerciseType: 'Romberg Test (Eyes Closed)',
      phases: [
        { phase: 'inhale', duration: 3.0 },
        { phase: 'hold', duration: 1.0 },
        { phase: 'exhale', duration: 4.0 },
        { phase: 'rest', duration: 1.0 }
      ],
      totalCycleDuration: 9.0,
      targetRate: 7, // 7 bpm - recovery and restoration
      description: 'Extended breathing pattern for post-exercise recovery'
    }
  ];

  /**
   * Start a breathing session with a specific pattern
   */
  public startBreathingSession(exerciseType: ExerciseType, patternName?: string): BreathingPattern {
    // Find appropriate pattern for exercise type
    const availablePatterns = this.breathingPatterns.filter(p => p.exerciseType === exerciseType);
    let selectedPattern: BreathingPattern;

    if (patternName) {
      selectedPattern = availablePatterns.find(p => p.name === patternName) || availablePatterns[0];
    } else {
      selectedPattern = availablePatterns[0] || this.breathingPatterns[0];
    }

    this.sessionState = {
      currentPattern: selectedPattern,
      sessionStartTime: Date.now(),
      currentCycleStartTime: Date.now(),
      currentPhaseIndex: 0,
      totalCycles: 0,
      feedbackHistory: [],
      isActive: true
    };

    console.log(`🫁 Started breathing session: ${selectedPattern.name} (${selectedPattern.targetRate} bpm)`);
    return selectedPattern;
  }

  /**
   * Stop the current breathing session
   */
  public stopBreathingSession(): void {
    if (this.sessionState) {
      this.sessionState.isActive = false;
      console.log(`🛑 Stopped breathing session after ${this.sessionState.totalCycles} cycles`);
    }
  }

  /**
   * Process real-time respiratory data and provide feedback
   */
  public processBreathingData(respiratoryMetrics: RespiratoryMetrics): BreathingFeedback | null {
    if (!this.sessionState || !this.sessionState.isActive) {
      return null;
    }

    const currentTime = Date.now();
    const cycleElapsed = (currentTime - this.sessionState.currentCycleStartTime) / 1000;
    const pattern = this.sessionState.currentPattern;

    // Determine current expected phase
    const expectedPhase = this.getCurrentExpectedPhase(cycleElapsed, pattern);
    
    // Analyze current breathing state
    const currentPhase = this.detectCurrentBreathingPhase(respiratoryMetrics);
    
    // Calculate deviations
    const deviation = this.calculateBreathingDeviation(respiratoryMetrics, expectedPhase, pattern);
    
    // Determine if breathing is on target
    const isOnTarget = this.isBreathingOnTarget(deviation);
    
    // Generate feedback message
    const feedbackMessage = this.generateFeedbackMessage(deviation, expectedPhase, currentPhase);
    
    // Determine feedback type
    const feedbackType = this.determineFeedbackType(deviation);

    const feedback: BreathingFeedback = {
      isOnTarget,
      currentPhase,
      expectedPhase,
      deviation,
      feedbackMessage,
      feedbackType,
      timestamp: currentTime
    };

    // Store feedback in history
    this.sessionState.feedbackHistory.push(feedback);
    
    // Keep only recent feedback (last 20 entries)
    if (this.sessionState.feedbackHistory.length > 20) {
      this.sessionState.feedbackHistory = this.sessionState.feedbackHistory.slice(-20);
    }

    // Update cycle tracking
    this.updateCycleTracking(cycleElapsed, pattern);

    return feedback;
  }

  /**
   * Get current expected breathing phase based on cycle timing
   */
  private getCurrentExpectedPhase(cycleElapsed: number, pattern: BreathingPattern): BreathingPhase {
    let accumulatedTime = 0;
    
    for (const phase of pattern.phases) {
      accumulatedTime += phase.duration;
      if (cycleElapsed <= accumulatedTime) {
        return phase;
      }
    }
    
    // If we've exceeded the cycle duration, we're in a new cycle
    return pattern.phases[0]; // Start of new cycle
  }

  /**
   * Detect current breathing phase from respiratory metrics
   */
  private detectCurrentBreathingPhase(metrics: RespiratoryMetrics): BreathingPhase {
    // Simple phase detection based on recent peak/valley analysis
    const recentData = metrics.filteredSignal.slice(-25); // Last 0.5 seconds at 50Hz
    
    if (recentData.length < 10) {
      return { phase: 'rest', duration: 0 };
    }

    // Calculate trend (rising = inhale, falling = exhale, stable = hold)
    const startValue = recentData[0];
    const endValue = recentData[recentData.length - 1];
    const change = endValue - startValue;
    const changeRate = Math.abs(change) / recentData.length;

    if (changeRate < 0.5) {
      // Minimal change - likely holding breath
      return { phase: 'hold', duration: 0 };
    } else if (change > 0) {
      // Rising signal - likely inhaling
      return { phase: 'inhale', duration: 0 };
    } else {
      // Falling signal - likely exhaling
      return { phase: 'exhale', duration: 0 };
    }
  }

  /**
   * Calculate deviation from target breathing pattern
   */
  private calculateBreathingDeviation(
    metrics: RespiratoryMetrics, 
    expectedPhase: BreathingPhase, 
    pattern: BreathingPattern
  ): BreathingDeviation {
    // Rate deviation
    const rateDeviation = metrics.breathingRate - pattern.targetRate;
    
    // Phase timing deviation (simplified for this implementation)
    const phaseDeviation = 0; // Would need more complex phase tracking
    
    // Determine deviation type
    let deviationType: 'too_fast' | 'too_slow' | 'irregular' | 'correct';
    if (Math.abs(rateDeviation) <= this.FEEDBACK_THRESHOLD_MILD) {
      deviationType = 'correct';
    } else if (rateDeviation > 0) {
      deviationType = 'too_fast';
    } else if (metrics.breathingRegularity < 0.7) {
      deviationType = 'irregular';
    } else {
      deviationType = 'too_slow';
    }
    
    // Determine severity
    let severity: 'mild' | 'moderate' | 'severe';
    const absDeviation = Math.abs(rateDeviation);
    if (absDeviation <= this.FEEDBACK_THRESHOLD_MILD) {
      severity = 'mild';
    } else if (absDeviation <= this.FEEDBACK_THRESHOLD_MODERATE) {
      severity = 'moderate';
    } else {
      severity = 'severe';
    }

    return {
      rateDeviation,
      phaseDeviation,
      deviationType,
      severity
    };
  }

  /**
   * Determine if breathing is on target
   */
  private isBreathingOnTarget(deviation: BreathingDeviation): boolean {
    return deviation.deviationType === 'correct' && deviation.severity === 'mild';
  }

  /**
   * Generate appropriate feedback message
   */
  private generateFeedbackMessage(
    deviation: BreathingDeviation, 
    expectedPhase: BreathingPhase, 
    currentPhase: BreathingPhase
  ): string {
    if (deviation.deviationType === 'correct') {
      return `✅ Great breathing! Continue ${expectedPhase.phase}ing steadily.`;
    }

    switch (deviation.deviationType) {
      case 'too_fast':
        if (deviation.severity === 'severe') {
          return `🚨 Breathing too fast! Slow down to reduce anxiety. Current phase: ${expectedPhase.phase}`;
        } else {
          return `⚠️ Slow your breathing pace. Focus on the ${expectedPhase.phase} phase.`;
        }
        
      case 'too_slow':
        return `📈 Increase your breathing rate slightly. You're in the ${expectedPhase.phase} phase.`;
        
      case 'irregular':
        return `🎯 Try to breathe more regularly. Focus on smooth ${expectedPhase.phase}ing.`;
        
      default:
        return `💨 Focus on your breathing pattern. Current phase: ${expectedPhase.phase}`;
    }
  }

  /**
   * Determine feedback type for UI styling
   */
  private determineFeedbackType(deviation: BreathingDeviation): 'positive' | 'warning' | 'alert' {
    if (deviation.deviationType === 'correct') {
      return 'positive';
    } else if (deviation.severity === 'severe') {
      return 'alert';
    } else {
      return 'warning';
    }
  }

  /**
   * Update cycle tracking
   */
  private updateCycleTracking(cycleElapsed: number, pattern: BreathingPattern): void {
    if (!this.sessionState) return;

    // Check if we've completed a full cycle
    if (cycleElapsed >= pattern.totalCycleDuration) {
      this.sessionState.totalCycles++;
      this.sessionState.currentCycleStartTime = Date.now();
      this.sessionState.currentPhaseIndex = 0;
      
      console.log(`🔄 Completed breathing cycle ${this.sessionState.totalCycles}`);
    }
  }

  /**
   * Get available breathing patterns for an exercise type
   */
  public getAvailablePatterns(exerciseType: ExerciseType): BreathingPattern[] {
    return this.breathingPatterns.filter(p => p.exerciseType === exerciseType);
  }

  /**
   * Get current session state
   */
  public getCurrentSessionState(): BreathingSessionState | null {
    return this.sessionState;
  }

  /**
   * Get session statistics
   */
  public getSessionStatistics(): any {
    if (!this.sessionState) {
      return null;
    }

    const totalFeedback = this.sessionState.feedbackHistory.length;
    const positiveFeedback = this.sessionState.feedbackHistory.filter(f => f.feedbackType === 'positive').length;
    const warningFeedback = this.sessionState.feedbackHistory.filter(f => f.feedbackType === 'warning').length;
    const alertFeedback = this.sessionState.feedbackHistory.filter(f => f.feedbackType === 'alert').length;

    const sessionDuration = (Date.now() - this.sessionState.sessionStartTime) / 1000; // in seconds
    const averageDeviations = this.sessionState.feedbackHistory.map(f => Math.abs(f.deviation.rateDeviation));
    const avgRateDeviation = averageDeviations.length > 0 ? 
      averageDeviations.reduce((sum, dev) => sum + dev, 0) / averageDeviations.length : 0;

    return {
      sessionDuration,
      totalCycles: this.sessionState.totalCycles,
      totalFeedback,
      positiveFeedback,
      warningFeedback,
      alertFeedback,
      onTargetPercentage: totalFeedback > 0 ? (positiveFeedback / totalFeedback) * 100 : 0,
      averageRateDeviation: avgRateDeviation,
      patternName: this.sessionState.currentPattern.name
    };
  }
} 