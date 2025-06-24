/**
 * Enhanced Mock Bluetooth Manager for Bequalize Belt
 * Simulates realistic vestibular conditions and sensor patterns
 * Based on the documentation requirements
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
    currentCondition: 'Healthy Control' as VestibularCondition,
    currentExercise: 'Romberg Test (Eyes Open)' as ExerciseType,
    batteryLevel: 85,
    temperature: 36.8,
    isCalibrating: false,
    exerciseDuration: 0
  };

  // Vestibular condition parameters
  private vestibularParams = {
    'Healthy Control': {
      swayAmplitude: 0.5,
      swayFrequency: 0.8,
      respiratoryRate: 15,
      stabilityIndex: 0.95
    },
    'BPPV': {
      swayAmplitude: 2.5,
      swayFrequency: 1.5,
      respiratoryRate: 18,
      stabilityIndex: 0.7,
      rotationalComponent: true
    },
    'Unilateral Vestibular Hypofunction': {
      swayAmplitude: 3.0,
      swayFrequency: 0.6,
      respiratoryRate: 16,
      stabilityIndex: 0.6,
      asymmetricPattern: true
    },
    'Bilateral Vestibular Loss': {
      swayAmplitude: 4.0,
      swayFrequency: 0.4,
      respiratoryRate: 20,
      stabilityIndex: 0.4,
      highFrequencyTremor: true
    },
    'Vestibular Migraine': {
      swayAmplitude: 2.8,
      swayFrequency: 1.2,
      respiratoryRate: 19,
      stabilityIndex: 0.65,
      episodicWorseningPattern: true
    },
    'Meniere Disease': {
      swayAmplitude: 3.2,
      swayFrequency: 1.0,
      respiratoryRate: 17,
      stabilityIndex: 0.55,
      lowFrequencyInstability: true
    },
    'Vestibular Neuritis': {
      swayAmplitude: 3.5,
      swayFrequency: 0.7,
      respiratoryRate: 21,
      stabilityIndex: 0.5,
      acutePhasePattern: true
    }
  };

  constructor() {
    console.log('Enhanced Mock Bluetooth Manager initialized');
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

  // Simulation control methods
  public setVestibularCondition(condition: VestibularCondition): void {
    this.simulationState.currentCondition = condition;
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
    
    const params = this.vestibularParams[this.simulationState.currentCondition];

    // Generate accelerometer data (including gravity and sway)
    const accelerometer = this.generateAccelerometerData(elapsedSeconds, params);
    
    // Generate gyroscope data (angular velocity)
    const gyroscope = this.generateGyroscopeData(elapsedSeconds, params);
    
    // Generate elastometer data (respiratory signal)
    const elastometer_value = this.generateElastometerData(elapsedSeconds, params);
    
    // Generate temperature with realistic drift
    const temperature_celsius = this.generateTemperatureData(elapsedSeconds);
    
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

  private generateAccelerometerData(elapsedSeconds: number, params: any): { x: number; y: number; z: number } {
    // Base gravity component (device assumed to be on torso)
    const baseGravity = { x: 0, y: 0, z: 980 }; // mg units
    
    // Add postural sway based on condition
    const swayX = params.swayAmplitude * 100 * Math.sin(2 * Math.PI * params.swayFrequency * elapsedSeconds);
    const swayY = params.swayAmplitude * 80 * Math.cos(2 * Math.PI * params.swayFrequency * elapsedSeconds * 0.7);
    
    // Add condition-specific patterns
    let conditionModifierX = 0;
    let conditionModifierY = 0;
    
    if (params.asymmetricPattern) {
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
    if (this.simulationState.currentCondition !== 'Healthy Control') {
      const irregularity = 50 * Math.sin(2 * Math.PI * 0.1 * elapsedSeconds);
      respiratorySignal += irregularity;
    }

    // Add noise
    const noise = (Math.random() - 0.5) * 20;
    
    // Check for meaningful data (as mentioned in documentation)
    const meaningfulDataCheck = this.simulationState.isCalibrating ? 
      Math.abs(respiratorySignal - 2048) > 50 : true;
    
    if (!meaningfulDataCheck && this.simulationState.isCalibrating) {
      // Simulate user needs to stretch belt more
      respiratorySignal = 2048 + (Math.random() - 0.5) * 30;
    }

    return Math.round(respiratorySignal + noise);
  }

  private generateTemperatureData(elapsedSeconds: number): number {
    // Start at body temperature, slight variations
    const baseTemp = 36.8;
    const dailyVariation = 0.3 * Math.sin(2 * Math.PI * elapsedSeconds / 3600); // hourly cycle
    const noise = (Math.random() - 0.5) * 0.1;
    
    return parseFloat((baseTemp + dailyVariation + noise).toFixed(1));
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

  // Utility methods for testing different scenarios
  public simulateVestibularEpisode(duration: number = 30): void {
    console.log(`Mock: Simulating vestibular episode for ${duration} seconds`);
    const originalCondition = this.simulationState.currentCondition;
    
    // Temporarily worsen the condition
    this.setVestibularCondition('Vestibular Migraine');
    
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
}

// Export singleton instance for global use
export const mockBluetoothManager = new EnhancedMockBluetoothManager(); 