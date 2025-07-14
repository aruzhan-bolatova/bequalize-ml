/**
 * Real-Time Processing Service for Bequalize Belt
 * Implements sliding window processing and real-time feature extraction
 * Based on Phase 2 requirements from the implementation plan
 */

import { SensorDataPacket } from '../types/SensorData';
import { SignalProcessor } from '../algorithms/SignalProcessor';
import { VestibularFeatureExtractor } from '../algorithms/VestibularFeatureExtractor';

// Real-time processing interfaces
interface RealTimeInsights {
  currentStability: number;        // Current stability score (0-1)
  breathingQuality: number;        // Current breathing quality (0-1)
  postureAlert: PostureAlert | null; // Any posture alerts
  exerciseProgress: ExerciseProgress; // Exercise progress metrics
  recommendations: string[];       // Real-time recommendations
  confidence: number;             // Confidence in current analysis (0-1)
  timestamp: number;              // When insights were generated
}

interface PostureAlert {
  type: 'excessive_sway' | 'poor_balance' | 'fall_risk' | 'asymmetric_posture';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
}

interface ExerciseProgress {
  duration: number;               // Current exercise duration in seconds
  qualityScore: number;          // Overall exercise quality (0-1)
  completionPercentage: number;  // Exercise completion (0-100)
  targetMet: boolean;            // Whether target is being met
}

interface ProcessingMetrics {
  bufferUtilization: number;     // How full the buffer is (0-1)
  processingLatency: number;     // Processing time in ms
  dataQuality: number;          // Quality of incoming data (0-1)
  samplingRate: number;         // Actual sampling rate
}

/**
 * Circular buffer implementation for efficient sliding window processing
 */
class CircularBuffer<T> {
  private buffer: T[];
  private head: number = 0;
  private size: number = 0;
  private readonly capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
    this.buffer = new Array(capacity);
  }

  push(item: T): void {
    this.buffer[this.head] = item;
    this.head = (this.head + 1) % this.capacity;
    if (this.size < this.capacity) {
      this.size++;
    }
  }

  getAll(): T[] {
    if (this.size === 0) return [];
    
    const result: T[] = [];
    for (let i = 0; i < this.size; i++) {
      const index = (this.head - this.size + i + this.capacity) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }

  getLast(count: number): T[] {
    const actualCount = Math.min(count, this.size);
    const result: T[] = [];
    
    for (let i = 0; i < actualCount; i++) {
      const index = (this.head - actualCount + i + this.capacity) % this.capacity;
      result.push(this.buffer[index]);
    }
    return result;
  }

  isFull(): boolean {
    return this.size === this.capacity;
  }

  getSize(): number {
    return this.size;
  }

  clear(): void {
    this.head = 0;
    this.size = 0;
  }
}

export class RealTimeProcessor {
  private readonly WINDOW_SIZE = 250; // 5 seconds at 50Hz
  private readonly FEATURE_WINDOW_SIZE = 50; // 1 second for feature extraction
  private readonly SAMPLE_RATE_HZ = 50;
  
  // Processing components
  private signalProcessor: SignalProcessor;
  private featureExtractor: VestibularFeatureExtractor;
  
  // Data buffers
  private slidingWindow: CircularBuffer<SensorDataPacket>;
  private featureBuffer: CircularBuffer<any>; // Stores extracted features
  
  // Processing state
  private isProcessing: boolean = false;
  private lastProcessingTime: number = 0;
  private exerciseStartTime: number | null = null;
  private currentExerciseType: string = 'Unknown';
  
  // Thresholds and parameters
  private readonly STABILITY_THRESHOLD = 0.3;
  private readonly SWAY_THRESHOLD = 5.0; // cm
  private readonly BREATHING_QUALITY_THRESHOLD = 0.7;

  constructor() {
    this.signalProcessor = new SignalProcessor();
    this.featureExtractor = new VestibularFeatureExtractor();
    this.slidingWindow = new CircularBuffer<SensorDataPacket>(this.WINDOW_SIZE);
    this.featureBuffer = new CircularBuffer<any>(100); // Store last 100 feature sets
  }

  /**
   * Process incoming sensor data packet and generate real-time insights
   */
  public async processIncomingData(packet: SensorDataPacket): Promise<RealTimeInsights> {
    const processingStart = Date.now();
    
    // Add to sliding window
    this.slidingWindow.push(packet);
    
    // Only process if we have enough data and aren't already processing
    if (!this.slidingWindow.isFull() || this.isProcessing) {
      return this.getDefaultInsights();
    }
    
    this.isProcessing = true;
    
    try {
      // Get recent data for processing
      const recentData = this.slidingWindow.getLast(this.FEATURE_WINDOW_SIZE);
      
      // Extract features if we have enough data
      let insights: RealTimeInsights;
      if (recentData.length >= this.FEATURE_WINDOW_SIZE) {
        insights = await this.extractRealTimeFeatures(recentData);
      } else {
        insights = this.getDefaultInsights();
      }
      
      // Update processing metrics
      this.lastProcessingTime = Date.now() - processingStart;
      
      return insights;
      
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Start a new exercise session
   */
  public startExercise(exerciseType: string): void {
    this.exerciseStartTime = Date.now();
    this.currentExerciseType = exerciseType;
    this.slidingWindow.clear();
    this.featureBuffer.clear();
    this.signalProcessor.reset();
    
    console.log(`RealTimeProcessor: Started ${exerciseType} exercise`);
  }

  /**
   * Stop the current exercise session
   */
  public stopExercise(): void {
    this.exerciseStartTime = null;
    this.currentExerciseType = 'Unknown';
    
    console.log('RealTimeProcessor: Stopped exercise');
  }

  /**
   * Extract real-time features and generate insights
   */
  private async extractRealTimeFeatures(recentData: SensorDataPacket[]): Promise<RealTimeInsights> {
    // Process respiratory signal
    const elastometerValues = recentData.map(p => p.elastometer_value);
    const respiratoryMetrics = this.signalProcessor.processRespiratorySignal(elastometerValues);
    
    // Process IMU data for posture
    const imuData = recentData.map(packet => ({
      timestamp: packet.timestamp,
      roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
      pitch: Math.atan2(-packet.accelerometer.x, 
        Math.sqrt(packet.accelerometer.y * packet.accelerometer.y + packet.accelerometer.z * packet.accelerometer.z)
      ) * (180 / Math.PI),
      yaw: 0,
      accel: packet.accelerometer,
      gyro: packet.gyroscope
    }));
    
    const posturalFeatures = this.featureExtractor.extractPosturalFeatures(imuData);
    
    // Store features in buffer
    this.featureBuffer.push({
      timestamp: Date.now(),
      respiratory: respiratoryMetrics,
      postural: posturalFeatures
    });
    
    // Calculate current stability
    const currentStability = posturalFeatures.stabilityIndex;
    
    // Calculate breathing quality
    const breathingQuality = this.calculateBreathingQuality(respiratoryMetrics);
    
    // Check for posture alerts
    const postureAlert = this.checkPostureAlerts(posturalFeatures);
    
    // Calculate exercise progress
    const exerciseProgress = this.calculateExerciseProgress(posturalFeatures, respiratoryMetrics);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(posturalFeatures, respiratoryMetrics);
    
    // Calculate confidence
    const confidence = this.calculateConfidence(posturalFeatures, respiratoryMetrics);
    
    return {
      currentStability,
      breathingQuality,
      postureAlert,
      exerciseProgress,
      recommendations,
      confidence,
      timestamp: Date.now()
    };
  }

  /**
   * Calculate breathing quality score
   */
  private calculateBreathingQuality(respiratoryMetrics: any): number {
    if (!respiratoryMetrics || respiratoryMetrics.breathingRate === 0) {
      return 0;
    }
    
    // Ideal breathing rate is 12-20 BPM
    const rateScore = this.calculateRateScore(respiratoryMetrics.breathingRate, 12, 20);
    
    // Regularity score (higher is better)
    const regularityScore = respiratoryMetrics.breathingRegularity || 0;
    
    // I:E ratio score (ideal is around 0.5-0.6)
    const ieScore = this.calculateIEScore(respiratoryMetrics.ieRatio);
    
    // Combined score
    const quality = (rateScore + regularityScore + ieScore) / 3;
    
    return Math.max(0, Math.min(1, quality));
  }

  /**
   * Check for posture alerts
   */
  private checkPostureAlerts(posturalFeatures: any): PostureAlert | null {
    // Check for excessive sway
    if (posturalFeatures.swayArea > this.SWAY_THRESHOLD) {
      return {
        type: 'excessive_sway',
        severity: posturalFeatures.swayArea > this.SWAY_THRESHOLD * 2 ? 'high' : 'medium',
        message: 'Excessive body sway detected. Try to maintain a more stable posture.',
        timestamp: Date.now()
      };
    }
    
    // Check for poor balance
    if (posturalFeatures.stabilityIndex < this.STABILITY_THRESHOLD) {
      return {
        type: 'poor_balance',
        severity: posturalFeatures.stabilityIndex < this.STABILITY_THRESHOLD / 2 ? 'high' : 'medium',
        message: 'Balance instability detected. Focus on maintaining your center of balance.',
        timestamp: Date.now()
      };
    }
    
    // Check for asymmetric posture
    const asymmetryRatio = Math.abs(posturalFeatures.anteriorPosteriorSway) / 
                          Math.abs(posturalFeatures.medioLateralSway);
    if (asymmetryRatio > 3.0 || asymmetryRatio < 0.33) {
      return {
        type: 'asymmetric_posture',
        severity: 'medium',
        message: 'Asymmetric posture detected. Try to distribute your weight evenly.',
        timestamp: Date.now()
      };
    }
    
    return null;
  }

  /**
   * Calculate exercise progress
   */
  private calculateExerciseProgress(posturalFeatures: any, respiratoryMetrics: any): ExerciseProgress {
    const duration = this.exerciseStartTime ? 
      (Date.now() - this.exerciseStartTime) / 1000 : 0;
    
    // Calculate quality score based on stability and breathing
    const stabilityScore = posturalFeatures.stabilityIndex || 0;
    const breathingScore = this.calculateBreathingQuality(respiratoryMetrics);
    const qualityScore = (stabilityScore + breathingScore) / 2;
    
    // Calculate completion percentage (assuming 60-second exercises)
    const targetDuration = 60; // seconds
    const completionPercentage = Math.min(100, (duration / targetDuration) * 100);
    
    // Check if targets are being met
    const targetMet = qualityScore > 0.6 && posturalFeatures.stabilityIndex > this.STABILITY_THRESHOLD;
    
    return {
      duration,
      qualityScore,
      completionPercentage,
      targetMet
    };
  }

  /**
   * Generate real-time recommendations
   */
  private generateRecommendations(posturalFeatures: any, respiratoryMetrics: any): string[] {
    const recommendations: string[] = [];
    
    // Posture recommendations
    if (posturalFeatures.stabilityIndex < this.STABILITY_THRESHOLD) {
      recommendations.push('Focus on maintaining a stable, upright posture');
    }
    
    if (posturalFeatures.swayArea > this.SWAY_THRESHOLD) {
      recommendations.push('Reduce body sway by engaging your core muscles');
    }
    
    // Breathing recommendations
    if (respiratoryMetrics.breathingRate > 25) {
      recommendations.push('Slow down your breathing rate');
    } else if (respiratoryMetrics.breathingRate < 10) {
      recommendations.push('Increase your breathing rate slightly');
    }
    
    if (respiratoryMetrics.breathingRegularity < 0.7) {
      recommendations.push('Try to maintain a more regular breathing pattern');
    }
    
    if (respiratoryMetrics.ieRatio > 0.8) {
      recommendations.push('Extend your exhalation phase');
    } else if (respiratoryMetrics.ieRatio < 0.3) {
      recommendations.push('Extend your inhalation phase');
    }
    
    // General recommendations
    if (recommendations.length === 0) {
      recommendations.push('Great job! Continue maintaining your current form');
    }
    
    return recommendations;
  }

  /**
   * Calculate confidence in current analysis
   */
  private calculateConfidence(posturalFeatures: any, respiratoryMetrics: any): number {
    // Factors affecting confidence
    const dataQuality = this.calculateDataQuality();
    const featureConsistency = this.calculateFeatureConsistency();
    const signalStrength = this.calculateSignalStrength(respiratoryMetrics);
    
    const confidence = (dataQuality + featureConsistency + signalStrength) / 3;
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  /**
   * Get processing metrics
   */
  public getProcessingMetrics(): ProcessingMetrics {
    const bufferUtilization = this.slidingWindow.getSize() / this.WINDOW_SIZE;
    const dataQuality = this.calculateDataQuality();
    
    return {
      bufferUtilization,
      processingLatency: this.lastProcessingTime,
      dataQuality,
      samplingRate: this.SAMPLE_RATE_HZ
    };
  }

  // Utility functions
  private getDefaultInsights(): RealTimeInsights {
    return {
      currentStability: 0,
      breathingQuality: 0,
      postureAlert: null,
      exerciseProgress: {
        duration: 0,
        qualityScore: 0,
        completionPercentage: 0,
        targetMet: false
      },
      recommendations: ['Collecting data...'],
      confidence: 0.1,
      timestamp: Date.now()
    };
  }

  private calculateRateScore(rate: number, idealMin: number, idealMax: number): number {
    if (rate >= idealMin && rate <= idealMax) {
      return 1.0;
    } else if (rate < idealMin) {
      return Math.max(0, 1 - (idealMin - rate) / idealMin);
    } else {
      return Math.max(0, 1 - (rate - idealMax) / idealMax);
    }
  }

  private calculateIEScore(ieRatio: number): number {
    const ideal = 0.55;
    const tolerance = 0.2;
    const difference = Math.abs(ieRatio - ideal);
    return Math.max(0, 1 - difference / tolerance);
  }

  private calculateDataQuality(): number {
    // Simple data quality assessment based on buffer fullness and recent data
    const recentData = this.slidingWindow.getLast(10);
    if (recentData.length < 5) return 0.1;
    
    // Check for data consistency
    let consistencyScore = 1.0;
    for (let i = 1; i < recentData.length; i++) {
      const timeDiff = recentData[i].timestamp - recentData[i-1].timestamp;
      if (timeDiff > 30 || timeDiff < 10) { // Expected ~20ms
        consistencyScore -= 0.1;
      }
    }
    
    return Math.max(0.1, consistencyScore);
  }

  private calculateFeatureConsistency(): number {
    const recentFeatures = this.featureBuffer.getLast(5);
    if (recentFeatures.length < 3) return 0.5;
    
    // Calculate variance in stability scores
    const stabilityScores = recentFeatures.map(f => f.postural?.stabilityIndex || 0);
    const mean = stabilityScores.reduce((sum, val) => sum + val, 0) / stabilityScores.length;
    const variance = stabilityScores.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / stabilityScores.length;
    
    // Lower variance = higher consistency
    return Math.max(0.1, 1 - variance);
  }

  private calculateSignalStrength(respiratoryMetrics: any): number {
    if (!respiratoryMetrics || respiratoryMetrics.breathingAmplitude === 0) {
      return 0.1;
    }
    
    // Signal strength based on breathing amplitude and regularity
    const amplitudeScore = Math.min(1.0, respiratoryMetrics.breathingAmplitude / 200);
    const regularityScore = respiratoryMetrics.breathingRegularity || 0;
    
    return (amplitudeScore + regularityScore) / 2;
  }

  /**
   * Reset processor state
   */
  public reset(): void {
    this.slidingWindow.clear();
    this.featureBuffer.clear();
    this.signalProcessor.reset();
    this.isProcessing = false;
    this.exerciseStartTime = null;
    this.currentExerciseType = 'Unknown';
  }
} 