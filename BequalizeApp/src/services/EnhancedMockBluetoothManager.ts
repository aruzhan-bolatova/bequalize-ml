/**
 * Enhanced Mock Bluetooth Manager for Bequalize Belt
 * Simulates realistic vestibular conditions and sensor patterns
 * Based on the documentation requirements and latest clinical research
 */

import { SensorDataPacket, VestibularCondition, ExerciseType } from '../types/SensorData';

export class EnhancedMockBluetoothManager {
  private isConnected: boolean = false;
  private dataListeners: ((data: SensorDataPacket) => void)[] = [];
  private connectionListeners: ((connected: boolean) => void)[] = [];
  private intervalId: number | null = null;
  
  // Simulation parameters
  private readonly SAMPLE_RATE_HZ = 50; // 50Hz as mentioned in documentation
  private readonly SAMPLE_INTERVAL_MS = 1000 / this.SAMPLE_RATE_HZ;
  
  // Current simulation state
  private simulationState = {
    startTime: Date.now(),
    currentCondition: 'normal' as VestibularCondition,
    currentExercise: 'Romberg Test (Eyes Open)' as ExerciseType,
    batteryLevel: 85,
    temperature: 36.8,
    isCalibrating: false,
    exerciseDuration: 0,
    // Enhanced state for improved simulation
    exerciseIntensity: 0,
    isEpisodicPhase: false,
    timeSinceOnset: 15, // days since vestibular neuritis onset
    menieresEpisodeCounter: 0,
    lastMenieresEpisode: 0,
    
    exerciseState: 'baseline' as 'baseline' | 'pre-test' | 'exercising' | 'post-test' | 'recovery',
    exerciseStartTime: 0,
    cumulativeExerciseTime: 0,
    fatigueLevel: 0, // 0-1 scale
    improvementFactor: 1.0, // Factor to simulate exercise benefits
    sessionVariabilityFactor: Math.random(), // Unique per session
    currentSessionId: '',
    dataCollectionState: 'idle' as 'idle' | 'collecting-pre' | 'collecting-post',
    
    // NEW: Breathing exercise specific state
    breathingExerciseActive: false,
    breathingExerciseType: 'diaphragmatic' as 'diaphragmatic' | 'box_breathing' | 'coherence' | 'relaxation',
    breathingPhase: 'rest' as 'inhale' | 'hold' | 'exhale' | 'rest',
    breathingCycleStartTime: 0,
    breathingPhaseStartTime: 0,
    targetBreathingRate: 12, // bpm
    breathingAmplitude: 1.0, // multiplier for breathing depth
    breathingRegularity: 0.9, // 0-1 scale for how regular breathing is
    userBreathingEffort: 1.0, // 0-1 scale for how well user follows pattern
  };

  // Enhanced vestibular condition parameters with clinical validation
  private vestibularParams = {
    'normal': {
      swayAmplitude: 0.5,
      swayFrequency: 0.8,
      respiratoryRate: 15,
      stabilityIndex: 0.95,
      vrmsRange: [0.3, 0.8], // cm/s based on clinical studies
      frequencyBand: [0.1, 2.0] // Hz
    },
    'bppv': {             //Benign Paroxysmal Positional Vertigo
      swayAmplitude: 2.5,
      swayFrequency: 1.5,
      respiratoryRate: 18,
      stabilityIndex: 0.7,
      rotationalComponent: true,
      vrmsRange: [1.2, 3.0],
      frequencyBand: [0.5, 2.0],
      episodicPattern: true
    },
    'unilateral_loss': {  // Unilateral loss of vestibular function
      swayAmplitude: 3.0,
      swayFrequency: 0.6,
      respiratoryRate: 16,
      stabilityIndex: 0.6,
      asymmetricPattern: true,
      vrmsRange: [1.5, 4.0],
      frequencyBand: [0.2, 1.5],
      medioLateralBias: true
    },
    'bilateral_loss': {  // Bilateral loss of vestibular function
      swayAmplitude: 4.0,
      swayFrequency: 0.4,
      respiratoryRate: 20,
      stabilityIndex: 0.4,
      highFrequencyTremor: true,
      vrmsRange: [2.5, 5.0],
      frequencyBand: [4.0, 8.0],
      visualDependence: true
    },
    'migraine': {   // Migraine with vestibular symptoms
      swayAmplitude: 2.8,
      swayFrequency: 1.2,
      respiratoryRate: 19,
      stabilityIndex: 0.65,
      episodicWorseningPattern: true,
      vrmsRange: [1.8, 3.5],
      frequencyBand: [0.3, 2.5]
    },
    'menieres': {  // Menière's disease
      swayAmplitude: 3.2,
      swayFrequency: 1.0,
      respiratoryRate: 17,
      stabilityIndex: 0.55,
      lowFrequencyInstability: true,
      vrmsRange: [2.0, 4.5],
      frequencyBand: [0.1, 0.3], // Low frequency dominance
      fluctuatingEpisodes: true,
      severityLevels: {
        mild: 1.2,
        moderate: 2.5,
        severe: 4.0
      }
    },
    'vestibular_neuritis': {  // Vestibular neuritis  
      swayAmplitude: 3.5,
      swayFrequency: 0.7,
      respiratoryRate: 21,
      stabilityIndex: 0.5,
      acutePhasePattern: true,
      vrmsRange: [2.2, 4.8],
      frequencyBand: [0.2, 1.8],
      recoveryPhases: {
        acute: { severity: 1.0, duration: 14 }, // first 2 weeks
        subacute: { severity: 0.7, duration: 90 }, // 2-12 weeks  
        chronic: { severity: 0.4, duration: Infinity } // 3+ months
      }
    }
  };

  constructor() {
    console.log('Enhanced Mock Bluetooth Manager initialized with clinical validation');
    // Initialize Menière's episode timing
    this.initializeMenieresEpisodes();
  }

  // Initialize realistic Menière's episode patterns
  private initializeMenieresEpisodes(): void {
    // Simulate random episode timing (average 1-4 episodes per year)
    this.simulationState.lastMenieresEpisode = Date.now() - (Math.random() * 90 * 24 * 60 * 60 * 1000); // 0-90 days ago
  }

  // Enhanced Menière's Disease simulation
  private getMenieresCurrentSeverity(): number {
    const params = this.vestibularParams['menieres'];
    if (!params || !params.severityLevels) {
      console.warn('Menieres parameters not found, using default');
      return 1.0;
    }
    const timeSinceLastEpisode = Date.now() - this.simulationState.lastMenieresEpisode;
    const daysSinceEpisode = timeSinceLastEpisode / (24 * 60 * 60 * 1000);
    
    // Check if we're in an active episode (episodes last 20min - 12h, simulate 2h average)
    const isInEpisode = daysSinceEpisode < 0.083; // 2 hours
    
    if (isInEpisode) {
      this.simulationState.isEpisodicPhase = true;
      return params.severityLevels.severe;
    }
    
    // Inter-episodic period with gradual improvement
    this.simulationState.isEpisodicPhase = false;
    if (daysSinceEpisode < 1) {
      return params.severityLevels.moderate; // Day after episode
    } else if (daysSinceEpisode < 7) {
      return params.severityLevels.mild; // Week after episode
    } else {
      // Trigger new episode occasionally (15% chance per session)
      if (Math.random() < 0.15 && daysSinceEpisode > 30) {
        this.simulationState.lastMenieresEpisode = Date.now();
        this.simulationState.menieresEpisodeCounter++;
        return params.severityLevels.severe;
      }
      return params.severityLevels.mild;
    }
  }

  // Enhanced Vestibular Neuritis phase detection
  private getVestibularNeuritisPhase(): { phase: string; severity: number } {
    const params = this.vestibularParams['vestibular_neuritis'];
    if (!params || !params.recoveryPhases) {
      console.warn('Vestibular neuritis parameters not found, using default');
      return { phase: 'normal', severity: 1.0 };
    }
    const daysSinceOnset = this.simulationState.timeSinceOnset;
    
    if (daysSinceOnset <= 14) {
      return { 
        phase: 'acute', 
        severity: params.recoveryPhases.acute.severity 
      };
    } else if (daysSinceOnset <= 90) {
      // Gradual improvement in subacute phase
      const progressRatio = (daysSinceOnset - 14) / (90 - 14);
      const severityReduction = progressRatio * 0.3; // 30% improvement over subacute phase
      return { 
        phase: 'subacute', 
        severity: params.recoveryPhases.subacute.severity - severityReduction 
      };
    } else {
      return { 
        phase: 'chronic', 
        severity: params.recoveryPhases.chronic.severity 
      };
    }
  }

  // Enhanced temperature simulation with exercise correlation
  private generateEnhancedTemperatureData(elapsedSeconds: number): number {
    const baseTemp = 36.8;
    
    // Exercise-induced temperature changes
    const exerciseTemp = this.simulationState.exerciseIntensity * 0.5;
    
    // Vestibular condition effects on autonomic regulation
    const conditionTempEffect = this.getConditionTemperatureEffect();
    
    // Circadian rhythm (slight daily variation)
    const circadianEffect = 0.3 * Math.sin(2 * Math.PI * elapsedSeconds / 3600);
    
    // Environmental and sensor noise
    const noise = (Math.random() - 0.5) * 0.1;
    
    // Combine all factors
    const finalTemp = baseTemp + exerciseTemp + conditionTempEffect + circadianEffect + noise;
    
    return parseFloat(Math.max(35.5, Math.min(39.0, finalTemp)).toFixed(1));
  }

  private getConditionTemperatureEffect(): number {
    switch (this.simulationState.currentCondition) {
      case 'migraine':
        return 0.2; // Slight elevation during episodes
      case 'menieres':
        return this.simulationState.isEpisodicPhase ? 0.3 : 0.1;
      case 'vestibular_neuritis':
        const phase = this.getVestibularNeuritisPhase();
        return phase.phase === 'acute' ? 0.4 : 0.1; // Elevated in acute phase
      default:
        return 0;
    }
  }

  // Enhanced exercise intensity calculation
  private updateExerciseIntensity(elapsedSeconds: number): void {
    const baseIntensity = Math.min(1.0, elapsedSeconds / 300); // Ramp up over 5 minutes
    const vestibularChallengeMultiplier = this.getVestibularChallengeLevel();
    
    this.simulationState.exerciseIntensity = baseIntensity * vestibularChallengeMultiplier;
  }

  private getVestibularChallengeLevel(): number {
    const params = this.vestibularParams[this.simulationState.currentCondition];
    if (!params || !params.stabilityIndex) {
      console.warn(`Invalid condition: ${this.simulationState.currentCondition}, using normal`);
      return Math.max(0.1, 1.0 - this.vestibularParams['normal'].stabilityIndex);
    }
    return Math.max(0.1, 1.0 - params.stabilityIndex); // Higher challenge = higher intensity
  }

  // Public API methods
  public async connect(): Promise<boolean> {
    console.log('Mock: Attempting to connect to Bequalize Belt...');
    
    // Simulate connection delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    this.isConnected = true;
    this.startDataGeneration();
    this.notifyConnectionListeners(true);
    
    console.log('Mock: Connected to Bequalize Belt');
    return true;
  }

  public async disconnect(): Promise<void> {
    console.log('Mock: Disconnecting from Bequalize Belt...');
    
    this.isConnected = false;
    this.stopDataGeneration();
    this.notifyConnectionListeners(false);
    
    console.log('Mock: Disconnected from Bequalize Belt');
  }

  public getIsConnected(): boolean {
    return this.isConnected;
  }

  public addDataListener(listener: (data: SensorDataPacket) => void): void {
    this.dataListeners.push(listener);
  }

  public removeDataListener(listener: (data: SensorDataPacket) => void): void {
    const index = this.dataListeners.indexOf(listener);
    if (index > -1) {
      this.dataListeners.splice(index, 1);
    }
  }

  public addConnectionListener(listener: (connected: boolean) => void): void {
    this.connectionListeners.push(listener);
  }

  public removeConnectionListener(listener: (connected: boolean) => void): void {
    const index = this.connectionListeners.indexOf(listener);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  // Enhanced simulation control methods
  public setVestibularCondition(condition: VestibularCondition): void {
    this.simulationState.currentCondition = condition;
    
    // Reset condition-specific parameters
    if (condition === 'vestibular_neuritis') {
      // Randomize onset time for realistic simulation
      this.simulationState.timeSinceOnset = Math.random() * 180; // 0-6 months
    }
    
    console.log(`Mock: Simulating ${condition} condition`);
  }

  public setExerciseType(exercise: ExerciseType): void {
    this.simulationState.currentExercise = exercise;
    this.simulationState.exerciseDuration = 0;
    console.log(`Mock: Starting ${exercise} simulation`);
  }

  public startCalibration(): void {
    this.simulationState.isCalibrating = true;
    console.log('Mock: Starting calibration phase');
  }

  public endCalibration(): void {
    this.simulationState.isCalibrating = false;
    console.log('Mock: Calibration phase completed');
  }

  // Advanced simulation methods
  public setVestibularNeuritisOnset(daysAgo: number): void {
    this.simulationState.timeSinceOnset = daysAgo;
    console.log(`Mock: Set vestibular neuritis onset to ${daysAgo} days ago`);
  }

  public triggerMenieresEpisode(): void {
    this.simulationState.lastMenieresEpisode = Date.now();
    this.simulationState.menieresEpisodeCounter++;
    console.log('Mock: Triggered Menière\'s disease episode');
  }

  /**
   * NEW: Set exercise state for realistic pre/post differences
   */
  public setExerciseState(state: 'baseline' | 'pre-test' | 'exercising' | 'post-test' | 'recovery'): void {
    console.log(`Mock: Setting exercise state to ${state}`);
    this.simulationState.exerciseState = state;
    
    if (state === 'exercising') {
      this.simulationState.exerciseStartTime = Date.now();
    } else if (state === 'post-test') {
      // Calculate exercise effects
      const exerciseDuration = (Date.now() - this.simulationState.exerciseStartTime) / 1000;
      this.simulationState.cumulativeExerciseTime += exerciseDuration;
      
      // Simulate fatigue (increases sway) and potential improvement (decreases sway)
      this.simulationState.fatigueLevel = Math.min(1.0, exerciseDuration / 300); // 0-1 over 5 minutes
      this.simulationState.improvementFactor = Math.max(0.7, 1.0 - (exerciseDuration / 600)); // Potential improvement
    }
  }

  /**
   * NEW: Set data collection state for session-specific modifications
   */
  public setDataCollectionState(state: 'idle' | 'collecting-pre' | 'collecting-post', sessionId?: string): void {
    this.simulationState.dataCollectionState = state;
    if (sessionId && sessionId !== this.simulationState.currentSessionId) {
      this.simulationState.currentSessionId = sessionId;
      this.simulationState.sessionVariabilityFactor = Math.random(); // New variability per session
    }
  }

  /**
   * NEW: Breathing Exercise Control Methods
   */
  public startBreathingExercise(
    exerciseType: 'diaphragmatic' | 'box_breathing' | 'coherence' | 'relaxation',
    targetRate?: number
  ): void {
    this.simulationState.breathingExerciseActive = true;
    this.simulationState.breathingExerciseType = exerciseType;
    this.simulationState.breathingCycleStartTime = Date.now();
    this.simulationState.breathingPhaseStartTime = Date.now();
    this.simulationState.breathingPhase = 'inhale';
    
    // Set exercise-specific parameters
    const exerciseParams = this.getBreathingExerciseParams(exerciseType);
    this.simulationState.targetBreathingRate = targetRate || exerciseParams.targetRate;
    this.simulationState.breathingAmplitude = exerciseParams.amplitude;
    this.simulationState.breathingRegularity = exerciseParams.regularity;
    this.simulationState.userBreathingEffort = 0.7; // Start with moderate effort
    
    console.log(`🫁 Started breathing exercise: ${exerciseType} at ${this.simulationState.targetBreathingRate} bpm`);
    console.log(`📊 Exercise parameters:`, {
      amplitude: exerciseParams.amplitude,
      regularity: exerciseParams.regularity,
      phases: exerciseParams.phases
    });
  }

  public stopBreathingExercise(): void {
    this.simulationState.breathingExerciseActive = false;
    this.simulationState.breathingPhase = 'rest';
    console.log('🛑 Stopped breathing exercise');
  }

  public setBreathingPhase(phase: 'inhale' | 'hold' | 'exhale' | 'rest'): void {
    if (this.simulationState.breathingExerciseActive) {
      const previousPhase = this.simulationState.breathingPhase;
      this.simulationState.breathingPhase = phase;
      this.simulationState.breathingPhaseStartTime = Date.now();
      console.log(`🔄 Breathing phase: ${previousPhase} → ${phase}`);
    }
  }

  public setBreathingEffort(effort: number): void {
    const previousEffort = this.simulationState.userBreathingEffort;
    this.simulationState.userBreathingEffort = Math.max(0, Math.min(1, effort));
    console.log(`💪 Breathing effort: ${(previousEffort * 100).toFixed(0)}% → ${(effort * 100).toFixed(0)}%`);
  }

  public updateBreathingCycle(): void {
    if (this.simulationState.breathingExerciseActive) {
      this.simulationState.breathingCycleStartTime = Date.now();
      console.log('🔄 New breathing cycle started');
    }
  }

  /**
   * NEW: Debug and monitoring methods
   */
  public getBreathingExerciseStatus(): any {
    return {
      active: this.simulationState.breathingExerciseActive,
      exerciseType: this.simulationState.breathingExerciseType,
      currentPhase: this.simulationState.breathingPhase,
      targetRate: this.simulationState.targetBreathingRate,
      amplitude: this.simulationState.breathingAmplitude,
      regularity: this.simulationState.breathingRegularity,
      userEffort: this.simulationState.userBreathingEffort,
      phaseElapsed: (Date.now() - this.simulationState.breathingPhaseStartTime) / 1000,
      cycleElapsed: (Date.now() - this.simulationState.breathingCycleStartTime) / 1000
    };
  }

  public simulateBreathingDifficulty(difficulty: 'easy' | 'medium' | 'hard'): void {
    switch (difficulty) {
      case 'easy':
        this.simulationState.breathingRegularity = 0.95;
        this.simulationState.userBreathingEffort = 0.9;
        break;
      case 'medium':
        this.simulationState.breathingRegularity = 0.8;
        this.simulationState.userBreathingEffort = 0.7;
        break;
      case 'hard':
        this.simulationState.breathingRegularity = 0.6;
        this.simulationState.userBreathingEffort = 0.5;
        break;
    }
    console.log(`🎯 Simulating ${difficulty} breathing difficulty`);
  }

  private getBreathingExerciseParams(exerciseType: 'diaphragmatic' | 'box_breathing' | 'coherence' | 'relaxation') {
    const exerciseParameters = {
      diaphragmatic: {
        targetRate: 8,        // 8 bpm - slow, deep breathing
        amplitude: 1.4,       // 40% more expansion
        regularity: 0.85,     // Slightly irregular as user learns
        phases: {
          inhale: { duration: 4, amplitude: 1.4 },
          hold: { duration: 2, amplitude: 1.4 },
          exhale: { duration: 6, amplitude: 0.3 },
          rest: { duration: 2, amplitude: 0.1 }
        }
      },
      box_breathing: {
        targetRate: 7.5,      // 7.5 bpm - very controlled
        amplitude: 1.2,       // Moderate expansion
        regularity: 0.95,     // Very regular pattern
        phases: {
          inhale: { duration: 4, amplitude: 1.2 },
          hold: { duration: 4, amplitude: 1.2 },
          exhale: { duration: 4, amplitude: 0.2 },
          rest: { duration: 4, amplitude: 0.1 }
        }
      },
      coherence: {
        targetRate: 6,        // 6 bpm - heart rate coherence
        amplitude: 1.1,       // Gentle expansion
        regularity: 0.92,     // Smooth, rhythmic
        phases: {
          inhale: { duration: 5, amplitude: 1.1 },
          hold: { duration: 0, amplitude: 1.1 },
          exhale: { duration: 5, amplitude: 0.2 },
          rest: { duration: 0, amplitude: 0.1 }
        }
      },
      relaxation: {
        targetRate: 5,        // 5 bpm - very slow for relaxation
        amplitude: 1.3,       // Deep, relaxing breaths
        regularity: 0.88,     // Naturally variable 
        phases: {
          inhale: { duration: 4, amplitude: 1.3 },
          hold: { duration: 2, amplitude: 1.3 },
          exhale: { duration: 8, amplitude: 0.3 },
          rest: { duration: 2, amplitude: 0.1 }
        }
      }
    };

    return exerciseParameters[exerciseType];
  }

  // Private methods for data generation
  private startDataGeneration(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      if (this.isConnected) {
        const packet = this.generateRealisticSensorPacket();
        this.notifyDataListeners(packet);
        this.updateSimulationState();
      }
    }, this.SAMPLE_INTERVAL_MS) as any;
  }

  private stopDataGeneration(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateRealisticSensorPacket(): SensorDataPacket {
    const currentTime = Date.now();
    const elapsedSeconds = (currentTime - this.simulationState.startTime) / 1000;
    
    // Get enhanced parameters based on condition
    const params = this.getEnhancedParams();

    // Generate accelerometer data (including gravity and sway)
    const accelerometer = this.generateAccelerometerData(elapsedSeconds, params);
    
    // Generate gyroscope data (angular velocity)
    const gyroscope = this.generateGyroscopeData(elapsedSeconds, params);
    
    // Generate elastometer data (respiratory signal)
    const elastometer_value = this.generateElastometerData(elapsedSeconds, params);
    
    // Generate enhanced temperature with exercise correlation
    const temperature_celsius = this.generateEnhancedTemperatureData(elapsedSeconds);
    
    // Generate button state (mostly idle, occasional presses)
    const buttons_state = this.generateButtonState(elapsedSeconds);

    return {
      timestamp: currentTime,
      battery_percent: this.simulationState.batteryLevel,
      buttons_state,
      accelerometer,
      gyroscope,
      elastometer_value,
      temperature_celsius
    };
  }

  private getEnhancedParams(): any {
    const baseParams = this.vestibularParams[this.simulationState.currentCondition];
    if (!baseParams) {
      console.warn(`Invalid condition: ${this.simulationState.currentCondition}, using normal`);
      return { ...this.vestibularParams['normal'] };
    }
    let params: any = { ...baseParams };
    
    // Apply condition-specific enhancements
    switch (this.simulationState.currentCondition) {
      case 'menieres':
        const severity = this.getMenieresCurrentSeverity();
        params.swayAmplitude *= severity;
        params.lowFrequencyBias = true;
        break;
        
      case 'vestibular_neuritis':
        const neuritisPhase = this.getVestibularNeuritisPhase();
        params.swayAmplitude *= neuritisPhase.severity;
        params.recoveryFactor = neuritisPhase.severity;
        params.currentPhase = neuritisPhase.phase;
        break;
    }
    
    // NEW: Apply exercise state modifications
    params = this.applyExerciseStateModifications(params);
    
    return params;
  }

  /**
   * NEW: Apply exercise state modifications to simulation parameters
   */
  private applyExerciseStateModifications(params: any): any {
    const modifiedParams = { ...params };
    const { exerciseState, fatigueLevel, improvementFactor, sessionVariabilityFactor, dataCollectionState } = this.simulationState;
    
    // Base variability factor for each session
    const baseVariability = 0.8 + (sessionVariabilityFactor * 0.4); // 0.8 to 1.2
    
    // Apply exercise-specific modifications
    switch (exerciseState) {
      case 'pre-test':
        // Pre-test: baseline with slight anticipation/anxiety increase
        modifiedParams.swayAmplitude *= baseVariability * 1.1;
        modifiedParams.swayFrequency *= 1.05;
        modifiedParams.stabilityIndex *= 0.95;
        break;
        
      case 'exercising':
        // During exercise: increased variability and challenge
        modifiedParams.swayAmplitude *= baseVariability * 1.3;
        modifiedParams.swayFrequency *= 1.2;
        modifiedParams.stabilityIndex *= 0.8;
        break;
        
      case 'post-test':
        // Post-test: fatigue vs improvement effects
        const fatigueEffect = 1.0 + (fatigueLevel * 0.4); // 1.0 to 1.4
        const improvementEffect = improvementFactor; // 0.7 to 1.0
        
        // Fatigue typically increases sway, improvement decreases it
        const netEffect = fatigueEffect * improvementEffect;
        modifiedParams.swayAmplitude *= baseVariability * netEffect;
        modifiedParams.swayFrequency *= 0.9 + (fatigueLevel * 0.2); // Slower when fatigued
        modifiedParams.stabilityIndex *= improvementEffect * (1 - fatigueLevel * 0.2);
        break;
        
      case 'recovery':
        // Recovery: gradual return to baseline
        modifiedParams.swayAmplitude *= baseVariability * 0.9;
        modifiedParams.swayFrequency *= 0.95;
        modifiedParams.stabilityIndex *= 1.05;
        break;
        
      default:
        // Baseline: normal parameters with session variability
        modifiedParams.swayAmplitude *= baseVariability;
        break;
    }
    
    // Add additional variability based on data collection state
    if (dataCollectionState === 'collecting-pre') {
      // Pre-test data: slightly more consistent (less variability)
      modifiedParams.swayAmplitude *= 0.9;
      modifiedParams.noiseLevel = (modifiedParams.noiseLevel || 1.0) * 0.8;
    } else if (dataCollectionState === 'collecting-post') {
      // Post-test data: more variability due to fatigue/changes
      modifiedParams.swayAmplitude *= 1.1;
      modifiedParams.noiseLevel = (modifiedParams.noiseLevel || 1.0) * 1.2;
    }
    
    return modifiedParams;
  }

  private generateAccelerometerData(elapsedSeconds: number, params: any): { x: number; y: number; z: number } {
    // Base gravity component (device assumed to be on torso)
    const baseGravity = { x: 0, y: 0, z: 980 }; // mg units
    
    // Add session-specific phase offset for variability
    const phaseOffset = this.simulationState.sessionVariabilityFactor * 2 * Math.PI;
    
    // Add postural sway based on condition
    const swayX = params.swayAmplitude * 100 * Math.sin(2 * Math.PI * params.swayFrequency * elapsedSeconds + phaseOffset);
    const swayY = params.swayAmplitude * 80 * Math.cos(2 * Math.PI * params.swayFrequency * elapsedSeconds * 0.7 + phaseOffset * 0.5);
    
    // Add condition-specific patterns
    let conditionModifierX = 0;
    let conditionModifierY = 0;
    
    if (params.asymmetricPattern || params.medioLateralBias) {
      conditionModifierX = params.swayAmplitude * 50 * Math.sin(2 * Math.PI * 0.3 * elapsedSeconds + phaseOffset);
    }
    
    if (params.rotationalComponent) {
      conditionModifierX += params.swayAmplitude * 30 * Math.sin(2 * Math.PI * 2.0 * elapsedSeconds + phaseOffset);
      conditionModifierY += params.swayAmplitude * 30 * Math.cos(2 * Math.PI * 2.0 * elapsedSeconds + phaseOffset);
    }
    
    if (params.highFrequencyTremor) {
      conditionModifierX += 20 * Math.sin(2 * Math.PI * 8 * elapsedSeconds + phaseOffset);
      conditionModifierY += 20 * Math.cos(2 * Math.PI * 8 * elapsedSeconds + phaseOffset);
    }

    // Add low frequency bias for Menière's disease
    if (params.lowFrequencyBias) {
      conditionModifierX += params.swayAmplitude * 40 * Math.sin(2 * Math.PI * 0.2 * elapsedSeconds + phaseOffset);
      conditionModifierY += params.swayAmplitude * 40 * Math.cos(2 * Math.PI * 0.15 * elapsedSeconds + phaseOffset);
    }

    // Add realistic noise with exercise state modulation
    const noiseLevel = (params.noiseLevel || 1.0);
    const noiseX = (Math.random() - 0.5) * 10 * noiseLevel;
    const noiseY = (Math.random() - 0.5) * 10 * noiseLevel;
    const noiseZ = (Math.random() - 0.5) * 5 * noiseLevel;

    return {
      x: Math.round(baseGravity.x + swayX + conditionModifierX + noiseX),
      y: Math.round(baseGravity.y + swayY + conditionModifierY + noiseY),
      z: Math.round(baseGravity.z + noiseZ)
    };
  }

  private generateGyroscopeData(elapsedSeconds: number, params: any): { x: number; y: number; z: number } {
    // Angular velocity in degrees/second * 100 (scaled values)
    const phaseOffset = this.simulationState.sessionVariabilityFactor * 2 * Math.PI;
    
    const baseSwayVelocity = {
      x: params.swayAmplitude * 50 * Math.cos(2 * Math.PI * params.swayFrequency * elapsedSeconds + phaseOffset),
      y: params.swayAmplitude * 40 * Math.sin(2 * Math.PI * params.swayFrequency * elapsedSeconds * 0.8 + phaseOffset),
      z: 0
    };

    // Add condition-specific patterns
    if (params.rotationalComponent) {
      baseSwayVelocity.z = params.swayAmplitude * 60 * Math.sin(2 * Math.PI * 1.5 * elapsedSeconds + phaseOffset);
    }

    // Add noise with exercise state modulation
    const noiseLevel = (params.noiseLevel || 1.0);
    const noise = {
      x: (Math.random() - 0.5) * 20 * noiseLevel,
      y: (Math.random() - 0.5) * 20 * noiseLevel,
      z: (Math.random() - 0.5) * 15 * noiseLevel
    };

    return {
      x: parseFloat((baseSwayVelocity.x + noise.x).toFixed(1)),
      y: parseFloat((baseSwayVelocity.y + noise.y).toFixed(1)),
      z: parseFloat((baseSwayVelocity.z + noise.z).toFixed(1))
    };
  }

  private generateElastometerData(elapsedSeconds: number, params: any): number {
    // If breathing exercise is active, use specialized generation
    if (this.simulationState.breathingExerciseActive) {
      return this.generateBreathingExerciseElastometerData(elapsedSeconds);
    }
    
    // Base respiratory signal for normal conditions
    const breathingPeriod = 60 / params.respiratoryRate; // seconds per breath
    const breathingPhase = (elapsedSeconds % breathingPeriod) / breathingPeriod;
    
    // Generate realistic breathing waveform (not perfect sine wave)
    let respiratorySignal = 2048; // baseline (12-bit ADC center)
    
    if (breathingPhase < 0.4) {
      // Inspiration phase (shorter, steeper)
      respiratorySignal += 400 * Math.sin(Math.PI * breathingPhase / 0.4);
    } else {
      // Expiration phase (longer, more gradual)
      respiratorySignal += 300 * Math.sin(Math.PI * (1 - (breathingPhase - 0.4) / 0.6));
    }

    // Add breathing irregularities based on condition
    if (this.simulationState.currentCondition !== 'normal') {
      const irregularity = 50 * Math.sin(2 * Math.PI * 0.1 * elapsedSeconds);
      respiratorySignal += irregularity;
    }

    // Add exercise-related changes in breathing
    if (this.simulationState.exerciseState === 'exercising') {
      respiratorySignal += 80 * Math.sin(2 * Math.PI * 0.05 * elapsedSeconds); // Heavier breathing
    }

    // Add realistic noise
    const noise = (Math.random() - 0.5) * 20;
    respiratorySignal += noise;
    
    // Check for meaningful data (as mentioned in documentation)
    const meaningfulDataCheck = this.simulationState.isCalibrating ? 
      Math.abs(respiratorySignal - 2048) > 50 : true;
    
    if (!meaningfulDataCheck && this.simulationState.isCalibrating) {
      // Simulate user needs to stretch belt more
      respiratorySignal = 2048 + (Math.random() - 0.5) * 30;
    }

    return Math.round(Math.max(1800, Math.min(2300, respiratorySignal)));
  }

  private generateBreathingExerciseElastometerData(elapsedSeconds: number): number {
    const exerciseParams = this.getBreathingExerciseParams(this.simulationState.breathingExerciseType);
    const phaseInfo = exerciseParams.phases[this.simulationState.breathingPhase];
    
    // Base respiratory signal
    let respiratorySignal = 2048; // 12-bit ADC center
    
    // Time within current phase
    const phaseElapsed = (Date.now() - this.simulationState.breathingPhaseStartTime) / 1000;
    const phaseProgress = Math.min(1, phaseElapsed / (phaseInfo?.duration || 1));
    
    // Generate phase-specific waveform
    switch (this.simulationState.breathingPhase) {
      case 'inhale':
        // Smooth increase to maximum expansion
        const inhaleProgress = Math.sin((phaseProgress * Math.PI) / 2); // Ease-out curve
        respiratorySignal += (phaseInfo?.amplitude || 1) * 350 * inhaleProgress * this.simulationState.userBreathingEffort;
        break;
        
      case 'hold':
        // Maintain expansion with slight variation
        const holdVariation = 10 * Math.sin(2 * Math.PI * 3 * phaseElapsed); // 3Hz micro-variations
        respiratorySignal += (phaseInfo?.amplitude || 1) * 350 * this.simulationState.userBreathingEffort + holdVariation;
        break;
        
      case 'exhale':
        // Smooth decrease from maximum to baseline
        const exhaleProgress = Math.cos((phaseProgress * Math.PI) / 2); // Ease-in curve
        respiratorySignal += (phaseInfo?.amplitude || 1) * 350 * exhaleProgress * this.simulationState.userBreathingEffort;
        break;
        
      case 'rest':
        // Near baseline with minimal variation
        const restVariation = 5 * Math.sin(2 * Math.PI * 2 * phaseElapsed);
        respiratorySignal += restVariation;
        break;
    }
    
    // Add exercise-specific characteristics
    const exerciseModifier = this.getExerciseSpecificModifier(elapsedSeconds);
    respiratorySignal += exerciseModifier;
    
    // Add user effort and regularity variations
    const effortVariation = (1 - this.simulationState.userBreathingEffort) * 50 * (Math.random() - 0.5);
    const regularityVariation = (1 - this.simulationState.breathingRegularity) * 30 * Math.sin(2 * Math.PI * 0.1 * elapsedSeconds);
    
    respiratorySignal += effortVariation + regularityVariation;
    
    // Add realistic sensor noise
    const noise = (Math.random() - 0.5) * 15;
    respiratorySignal += noise;
    
    return Math.round(Math.max(1800, Math.min(2300, respiratorySignal)));
  }
  
  private getExerciseSpecificModifier(elapsedSeconds: number): number {
    switch (this.simulationState.breathingExerciseType) {
      case 'diaphragmatic':
        // Deeper, more abdominal breathing pattern
        return 20 * Math.sin(2 * Math.PI * 0.05 * elapsedSeconds); // Low frequency deep component
        
      case 'box_breathing':
        // Very controlled, minimal variation
        return 5 * Math.sin(2 * Math.PI * 0.02 * elapsedSeconds); // Very low variation
        
      case 'coherence':
        // Smooth, sine-wave like pattern for heart rate coherence
        return 15 * Math.sin(2 * Math.PI * 0.1 * elapsedSeconds); // Coherent pattern
        
      case 'relaxation':
        // Slow, deep, calming breaths
        return 25 * Math.sin(2 * Math.PI * 0.03 * elapsedSeconds); // Very slow, deep pattern
        
      default:
        return 0;
    }
  }

  private generateButtonState(elapsedSeconds: number): number {
    // Mostly no button presses, occasional random presses
    const randomPress = Math.random();
    
    if (randomPress < 0.995) {
      return 0; // No press
    } else if (randomPress < 0.998) {
      return 1; // Button 1
    } else if (randomPress < 0.999) {
      return 2; // Button 2
    } else {
      return 3; // Both buttons
    }
  }

  private updateSimulationState(): void {
    const elapsedSeconds = (Date.now() - this.simulationState.startTime) / 1000;
    
    // Update exercise intensity
    this.updateExerciseIntensity(elapsedSeconds);
    
    // Slowly drain battery
    if (Math.random() < 0.001) { // Very rarely
      this.simulationState.batteryLevel = Math.max(0, this.simulationState.batteryLevel - 1);
    }
    
    // Update exercise duration
    this.simulationState.exerciseDuration += this.SAMPLE_INTERVAL_MS / 1000;
  }

  private notifyDataListeners(packet: SensorDataPacket): void {
    this.dataListeners.forEach(listener => {
      try {
        listener(packet);
      } catch (error) {
        console.error('Error in data listener:', error);
      }
    });
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(connected);
      } catch (error) {
        console.error('Error in connection listener:', error);
      }
    });
  }

  // Enhanced utility methods for clinical scenarios
  public simulateVestibularEpisode(duration: number = 30): void {
    console.log(`Mock: Simulating vestibular episode for ${duration} seconds`);
    const originalCondition = this.simulationState.currentCondition;
    
    // Temporarily worsen the condition
    this.setVestibularCondition('migraine');
    
    setTimeout(() => {
      this.setVestibularCondition(originalCondition);
      console.log('Mock: Vestibular episode simulation ended');
    }, duration * 1000);
  }

  public simulateLowBattery(): void {
    this.simulationState.batteryLevel = 15;
    console.log('Mock: Simulating low battery condition');
  }

  public simulateDeviceError(): void {
    console.log('Mock: Simulating device connection error');
    this.disconnect();
  }

  // New clinical validation methods
  public getVRMSEstimate(): { ap: number; ml: number } {
    const params = this.getEnhancedParams();
    const baseVRMS = params.vrmsRange ? params.vrmsRange[0] : 0.5;
    const variability = params.vrmsRange ? (params.vrmsRange[1] - params.vrmsRange[0]) : 0.3;
    
    return {
      ap: baseVRMS + Math.random() * variability,
      ml: baseVRMS * 0.8 + Math.random() * variability * 0.8
    };
  }

  public getSimulationMetrics(): object {
    return {
      condition: this.simulationState.currentCondition,
      isEpisodicPhase: this.simulationState.isEpisodicPhase,
      exerciseIntensity: this.simulationState.exerciseIntensity,
      timeSinceOnset: this.simulationState.timeSinceOnset,
      vrmsEstimate: this.getVRMSEstimate(),
      sampleRate: this.SAMPLE_RATE_HZ
    };
  }

  /**
   * Set current vestibular condition for simulation
   */
  public setCurrentCondition(condition: VestibularCondition): void {
    this.setVestibularCondition(condition);
  }

  /**
   * Generate a single sensor data packet
   */
  public generateSensorDataPacket(): SensorDataPacket {
    return this.generateRealisticSensorPacket();
  }
}

// Export singleton instance for global use
export const mockBluetoothManager = new EnhancedMockBluetoothManager(); 