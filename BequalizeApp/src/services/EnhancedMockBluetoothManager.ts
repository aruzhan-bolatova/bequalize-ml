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
    lastMenieresEpisode: 0
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
    
    return params;
  }

  private generateAccelerometerData(elapsedSeconds: number, params: any): { x: number; y: number; z: number } {
    // Base gravity component (device assumed to be on torso)
    const baseGravity = { x: 0, y: 0, z: 980 }; // mg units
    
    // Add postural sway based on condition
    const swayX = params.swayAmplitude * 100 * Math.sin(2 * Math.PI * params.swayFrequency * elapsedSeconds);
    const swayY = params.swayAmplitude * 80 * Math.cos(2 * Math.PI * params.swayFrequency * elapsedSeconds * 0.7);
    
    // Add condition-specific patterns
    let conditionModifierX = 0;
    let conditionModifierY = 0;
    
    if (params.asymmetricPattern || params.medioLateralBias) {
      conditionModifierX = params.swayAmplitude * 50 * Math.sin(2 * Math.PI * 0.3 * elapsedSeconds);
    }
    
    if (params.rotationalComponent) {
      conditionModifierX += params.swayAmplitude * 30 * Math.sin(2 * Math.PI * 2.0 * elapsedSeconds);
      conditionModifierY += params.swayAmplitude * 30 * Math.cos(2 * Math.PI * 2.0 * elapsedSeconds);
    }
    
    if (params.highFrequencyTremor) {
      conditionModifierX += 20 * Math.sin(2 * Math.PI * 8 * elapsedSeconds);
      conditionModifierY += 20 * Math.cos(2 * Math.PI * 8 * elapsedSeconds);
    }

    // Add low frequency bias for Menière's disease
    if (params.lowFrequencyBias) {
      conditionModifierX += params.swayAmplitude * 40 * Math.sin(2 * Math.PI * 0.2 * elapsedSeconds);
      conditionModifierY += params.swayAmplitude * 40 * Math.cos(2 * Math.PI * 0.15 * elapsedSeconds);
    }

    // Add realistic noise
    const noiseX = (Math.random() - 0.5) * 10;
    const noiseY = (Math.random() - 0.5) * 10;
    const noiseZ = (Math.random() - 0.5) * 5;

    return {
      x: Math.round(baseGravity.x + swayX + conditionModifierX + noiseX),
      y: Math.round(baseGravity.y + swayY + conditionModifierY + noiseY),
      z: Math.round(baseGravity.z + noiseZ)
    };
  }

  private generateGyroscopeData(elapsedSeconds: number, params: any): { x: number; y: number; z: number } {
    // Angular velocity in degrees/second * 100 (scaled values)
    const baseSwayVelocity = {
      x: params.swayAmplitude * 50 * Math.cos(2 * Math.PI * params.swayFrequency * elapsedSeconds),
      y: params.swayAmplitude * 40 * Math.sin(2 * Math.PI * params.swayFrequency * elapsedSeconds * 0.8),
      z: 0
    };

    // Add condition-specific patterns
    if (params.rotationalComponent) {
      baseSwayVelocity.z = params.swayAmplitude * 60 * Math.sin(2 * Math.PI * 1.5 * elapsedSeconds);
    }

    // Add noise
    const noise = {
      x: (Math.random() - 0.5) * 20,
      y: (Math.random() - 0.5) * 20,
      z: (Math.random() - 0.5) * 15
    };

    return {
      x: parseFloat((baseSwayVelocity.x + noise.x).toFixed(1)),
      y: parseFloat((baseSwayVelocity.y + noise.y).toFixed(1)),
      z: parseFloat((baseSwayVelocity.z + noise.z).toFixed(1))
    };
  }

  private generateElastometerData(elapsedSeconds: number, params: any): number {
    // Base respiratory signal
    const breathingPeriod = 60 / params.respiratoryRate; // seconds per breath
    const breathingPhase = (elapsedSeconds % breathingPeriod) / breathingPeriod;
    
    // Generate realistic breathing waveform (not perfect sine wave)
    let respiratorySignal = 2048; // baseline
    
    if (breathingPhase < 0.4) {
      // Inspiration phase (shorter)
      respiratorySignal += 300 * Math.sin(Math.PI * breathingPhase / 0.4);
    } else {
      // Expiration phase (longer, more gradual)
      respiratorySignal += 300 * Math.sin(Math.PI * (1 - (breathingPhase - 0.4) / 0.6));
    }

    // Add breathing irregularities based on condition
    if (this.simulationState.currentCondition !== 'normal') {
      const irregularity = 50 * Math.sin(2 * Math.PI * 0.1 * elapsedSeconds);
      respiratorySignal += irregularity;
    }

    // Add exercise-induced breathing changes
    const exerciseEffect = this.simulationState.exerciseIntensity * 100;
    respiratorySignal += exerciseEffect;

    // Add noise
    const noise = (Math.random() - 0.5) * 20;
    
    // Check for meaningful data (as mentioned in documentation)
    const meaningfulDataCheck = this.simulationState.isCalibrating ? 
      Math.abs(respiratorySignal - 2048) > 50 : true;
    
    if (!meaningfulDataCheck && this.simulationState.isCalibrating) {
      // Simulate user needs to stretch belt more
      respiratorySignal = 2048 + (Math.random() - 0.5) * 30;
    }

    return Math.round(Math.max(1500, Math.min(2600, respiratorySignal + noise)));
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