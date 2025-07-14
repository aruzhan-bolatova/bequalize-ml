/**
 * Signal Processing Pipeline for Bequalize Belt
 * Implements complementary filter, Kalman filter, and respiratory signal processing
 * Based on Phase 2 requirements from the implementation plan
 */

import { SensorDataPacket } from '../types/SensorData';

// Mathematical utility types
interface Vector3D {
  x: number;
  y: number;
  z: number;
}

interface EulerAngles {
  roll: number;  // Rotation around X-axis (degrees)
  pitch: number; // Rotation around Y-axis (degrees)
  yaw: number;   // Rotation around Z-axis (degrees)
}

interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

interface KalmanState {
  x: number[];     // State vector
  P: number[][];   // Error covariance matrix
  Q: number[][];   // Process noise covariance
  R: number[][];   // Measurement noise covariance
  F: number[][];   // State transition matrix
  H: number[][];   // Observation matrix
}

interface RespiratoryMetrics {
  breathingRate: number;        // BPM
  breathingAmplitude: number;   // Peak-to-valley difference
  ieRatio: number;             // Inspiration/Expiration ratio
  breathingRegularity: number; // Coefficient of variation
  filteredSignal: number[];    // Low-pass filtered elastometer data
  peaks: number[];             // Peak indices
  valleys: number[];           // Valley indices
}

interface OptimalEstimate {
  orientation: EulerAngles;
  angularVelocity: Vector3D;
  confidence: number;
  timestamp: number;
}

export class SignalProcessor {
  private readonly SAMPLE_RATE_HZ = 50;
  private readonly DT = 1.0 / this.SAMPLE_RATE_HZ; // 0.02 seconds
  
  // Complementary filter parameters
  private readonly ALPHA = 0.98; // Trust gyroscope more for short-term changes
  
  // Previous state for filters
  private previousOrientation: EulerAngles = { roll: 0, pitch: 0, yaw: 0 };
  private kalmanState!: KalmanState; // Initialized in constructor
  
  // Respiratory signal processing buffers
  private elastometerBuffer: number[] = [];
  private readonly RESPIRATORY_BUFFER_SIZE = 500; // 10 seconds at 50Hz
  
  constructor() {
    this.initializeKalmanFilter();
  }

  /**
   * Initialize Kalman filter for optimal orientation estimation
   */
  private initializeKalmanFilter(): void {
    // State: [roll, pitch, roll_rate, pitch_rate]
    this.kalmanState = {
      x: [0, 0, 0, 0], // Initial state
      P: [
        [1, 0, 0, 0],
        [0, 1, 0, 0],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ], // Initial covariance
      Q: [
        [0.01, 0, 0, 0],
        [0, 0.01, 0, 0],
        [0, 0, 0.1, 0],
        [0, 0, 0, 0.1]
      ], // Process noise
      R: [
        [0.1, 0],
        [0, 0.1]
      ], // Measurement noise
      F: [
        [1, 0, this.DT, 0],
        [0, 1, 0, this.DT],
        [0, 0, 1, 0],
        [0, 0, 0, 1]
      ], // State transition
      H: [
        [1, 0, 0, 0],
        [0, 1, 0, 0]
      ] // Observation matrix
    };
  }

  /**
   * Complementary filter for IMU fusion
   * Combines accelerometer (long-term accuracy) and gyroscope (short-term accuracy)
   */
  public complementaryFilter(accel: Vector3D, gyro: Vector3D, dt: number = this.DT): EulerAngles {
    // Convert accelerometer readings to angles (assuming device is relatively stationary)
    const accelRoll = Math.atan2(accel.y, accel.z) * (180 / Math.PI);
    const accelPitch = Math.atan2(-accel.x, Math.sqrt(accel.y * accel.y + accel.z * accel.z)) * (180 / Math.PI);
    
    // Integrate gyroscope for short-term changes
    const gyroRoll = this.previousOrientation.roll + gyro.x * dt;
    const gyroPitch = this.previousOrientation.pitch + gyro.y * dt;
    const gyroYaw = this.previousOrientation.yaw + gyro.z * dt;
    
    // Complementary filter fusion
    const roll = this.ALPHA * gyroRoll + (1 - this.ALPHA) * accelRoll;
    const pitch = this.ALPHA * gyroPitch + (1 - this.ALPHA) * accelPitch;
    const yaw = gyroYaw; // Yaw can only come from gyroscope
    
    // Update previous state
    this.previousOrientation = { roll, pitch, yaw };
    
    return { roll, pitch, yaw };
  }

  /**
   * Kalman filter for optimal estimation with noise handling
   */
  public kalmanFilter(accel: Vector3D, gyro: Vector3D): OptimalEstimate {
    const dt = this.DT;
    
    // Convert accelerometer to angles
    const accelRoll = Math.atan2(accel.y, accel.z) * (180 / Math.PI);
    const accelPitch = Math.atan2(-accel.x, Math.sqrt(accel.y * accel.y + accel.z * accel.z)) * (180 / Math.PI);
    
    // Prediction step
    const x_pred = this.matrixVectorMultiply(this.kalmanState.F, this.kalmanState.x);
    const P_pred = this.matrixAdd(
      this.matrixMultiply(this.matrixMultiply(this.kalmanState.F, this.kalmanState.P), this.matrixTranspose(this.kalmanState.F)),
      this.kalmanState.Q
    );
    
    // Measurement update
    const z = [accelRoll, accelPitch]; // Measurements from accelerometer
    const y = this.vectorSubtract(z, this.matrixVectorMultiply(this.kalmanState.H, x_pred)); // Innovation
    
    const S = this.matrixAdd(
      this.matrixMultiply(this.matrixMultiply(this.kalmanState.H, P_pred), this.matrixTranspose(this.kalmanState.H)),
      this.kalmanState.R
    );
    
    const K = this.matrixMultiply(this.matrixMultiply(P_pred, this.matrixTranspose(this.kalmanState.H)), this.matrixInverse(S));
    
    // Update state and covariance
    this.kalmanState.x = this.vectorAdd(x_pred, this.matrixVectorMultiply(K, y));
    this.kalmanState.P = this.matrixSubtract(this.createIdentityMatrix(4), this.matrixMultiply(K, this.kalmanState.H));
    this.kalmanState.P = this.matrixMultiply(this.kalmanState.P, P_pred);
    
    // Calculate confidence based on trace of covariance matrix
    const confidence = 1.0 / (1.0 + this.matrixTrace(this.kalmanState.P));
    
    return {
      orientation: {
        roll: this.kalmanState.x[0],
        pitch: this.kalmanState.x[1],
        yaw: 0 // Yaw not observable from accelerometer alone
      },
      angularVelocity: gyro,
      confidence,
      timestamp: Date.now()
    };
  }

  /**
   * Process respiratory signal from elastometer data
   * Implements low-pass filtering and breathing cycle detection
   */
  public processRespiratorySignal(elastometerData: number[]): RespiratoryMetrics {
    // Add new data to buffer
    this.elastometerBuffer.push(...elastometerData);
    
    // Keep buffer size manageable
    if (this.elastometerBuffer.length > this.RESPIRATORY_BUFFER_SIZE) {
      this.elastometerBuffer = this.elastometerBuffer.slice(-this.RESPIRATORY_BUFFER_SIZE);
    }
    
    if (this.elastometerBuffer.length < 100) { // Need at least 2 seconds of data
      return {
        breathingRate: 0,
        breathingAmplitude: 0,
        ieRatio: 0,
        breathingRegularity: 0,
        filteredSignal: [],
        peaks: [],
        valleys: []
      };
    }
    
    // Apply low-pass filter (0.1-2 Hz for respiratory signals)
    const filteredSignal = this.lowPassFilter(this.elastometerBuffer, 2.0);
    
    // Detect peaks and valleys
    const peaks = this.findPeaks(filteredSignal, 0.3); // Minimum prominence
    const valleys = this.findValleys(filteredSignal, 0.3);
    
    // Calculate breathing rate (BPM)
    const breathingRate = this.calculateBreathingRate(peaks);
    
    // Calculate breathing amplitude
    const breathingAmplitude = this.calculateBreathingAmplitude(filteredSignal, peaks, valleys);
    
    // Calculate I:E ratio
    const ieRatio = this.calculateIERatio(peaks, valleys);
    
    // Calculate breathing regularity
    const breathingRegularity = this.calculateBreathingRegularity(peaks);
    
    return {
      breathingRate,
      breathingAmplitude,
      ieRatio,
      breathingRegularity,
      filteredSignal,
      peaks,
      valleys
    };
  }

  /**
   * Low-pass filter implementation using simple moving average
   */
  private lowPassFilter(signal: number[], cutoffHz: number): number[] {
    const windowSize = Math.floor(this.SAMPLE_RATE_HZ / cutoffHz);
    const filtered: number[] = [];
    
    for (let i = 0; i < signal.length; i++) {
      const start = Math.max(0, i - windowSize + 1);
      const window = signal.slice(start, i + 1);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      filtered.push(average);
    }
    
    return filtered;
  }

  /**
   * Find peaks in signal using simple prominence-based detection
   */
  private findPeaks(signal: number[], minProminence: number): number[] {
    const peaks: number[] = [];
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const std = Math.sqrt(signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length);
    const threshold = mean + minProminence * std;
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] > signal[i - 1] && 
          signal[i] > signal[i + 1] && 
          signal[i] > threshold) {
        peaks.push(i);
      }
    }
    
    return peaks;
  }

  /**
   * Find valleys in signal
   */
  private findValleys(signal: number[], minProminence: number): number[] {
    const valleys: number[] = [];
    const mean = signal.reduce((sum, val) => sum + val, 0) / signal.length;
    const std = Math.sqrt(signal.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / signal.length);
    const threshold = mean - minProminence * std;
    
    for (let i = 1; i < signal.length - 1; i++) {
      if (signal[i] < signal[i - 1] && 
          signal[i] < signal[i + 1] && 
          signal[i] < threshold) {
        valleys.push(i);
      }
    }
    
    return valleys;
  }

  /**
   * Calculate breathing rate from peak intervals
   */
  private calculateBreathingRate(peaks: number[]): number {
    if (peaks.length < 2) return 0;
    
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const avgInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const intervalInSeconds = avgInterval / this.SAMPLE_RATE_HZ;
    const breathingRate = 60 / intervalInSeconds; // Convert to BPM
    
    return Math.max(5, Math.min(30, breathingRate)); // Clamp to reasonable range
  }

  /**
   * Calculate breathing amplitude (peak-to-valley difference)
   */
  private calculateBreathingAmplitude(signal: number[], peaks: number[], valleys: number[]): number {
    if (peaks.length === 0 || valleys.length === 0) return 0;
    
    const peakValues = peaks.map(idx => signal[idx]);
    const valleyValues = valleys.map(idx => signal[idx]);
    
    const avgPeak = peakValues.reduce((sum, val) => sum + val, 0) / peakValues.length;
    const avgValley = valleyValues.reduce((sum, val) => sum + val, 0) / valleyValues.length;
    
    return Math.abs(avgPeak - avgValley);
  }

  /**
   * Calculate Inspiration:Expiration ratio
   */
  private calculateIERatio(peaks: number[], valleys: number[]): number {
    if (peaks.length < 2 || valleys.length < 2) return 0.5; // Default ratio
    
    // Simple approximation: assume inspiration is peak-to-valley, expiration is valley-to-peak
    let totalInspirationTime = 0;
    let totalExpirationTime = 0;
    let cycles = 0;
    
    for (let i = 0; i < Math.min(peaks.length - 1, valleys.length - 1); i++) {
      const inspirationTime = Math.abs(peaks[i] - valleys[i]);
      const expirationTime = Math.abs(valleys[i + 1] - peaks[i]);
      
      totalInspirationTime += inspirationTime;
      totalExpirationTime += expirationTime;
      cycles++;
    }
    
    if (cycles === 0 || totalExpirationTime === 0) return 0.5;
    
    return totalInspirationTime / totalExpirationTime;
  }

  /**
   * Calculate breathing regularity (coefficient of variation of intervals)
   */
  private calculateBreathingRegularity(peaks: number[]): number {
    if (peaks.length < 3) return 0;
    
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / intervals.length;
    const std = Math.sqrt(variance);
    
    const coefficientOfVariation = std / mean;
    return 1.0 / (1.0 + coefficientOfVariation); // Higher value = more regular
  }

  // Matrix utility functions for Kalman filter
  private matrixMultiply(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < B[0].length; j++) {
        let sum = 0;
        for (let k = 0; k < B.length; k++) {
          sum += A[i][k] * B[k][j];
        }
        result[i][j] = sum;
      }
    }
    return result;
  }

  private matrixVectorMultiply(A: number[][], v: number[]): number[] {
    const result: number[] = [];
    for (let i = 0; i < A.length; i++) {
      let sum = 0;
      for (let j = 0; j < v.length; j++) {
        sum += A[i][j] * v[j];
      }
      result[i] = sum;
    }
    return result;
  }

  private matrixAdd(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < A[0].length; j++) {
        result[i][j] = A[i][j] + B[i][j];
      }
    }
    return result;
  }

  private matrixSubtract(A: number[][], B: number[][]): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < A.length; i++) {
      result[i] = [];
      for (let j = 0; j < A[0].length; j++) {
        result[i][j] = A[i][j] - B[i][j];
      }
    }
    return result;
  }

  private matrixTranspose(A: number[][]): number[][] {
    const result: number[][] = [];
    for (let j = 0; j < A[0].length; j++) {
      result[j] = [];
      for (let i = 0; i < A.length; i++) {
        result[j][i] = A[i][j];
      }
    }
    return result;
  }

  private matrixInverse(A: number[][]): number[][] {
    // Simple 2x2 matrix inverse for this use case
    if (A.length === 2 && A[0].length === 2) {
      const det = A[0][0] * A[1][1] - A[0][1] * A[1][0];
      if (Math.abs(det) < 1e-10) {
        // Return identity if singular
        return [[1, 0], [0, 1]];
      }
      return [
        [A[1][1] / det, -A[0][1] / det],
        [-A[1][0] / det, A[0][0] / det]
      ];
    }
    // For larger matrices, would need more complex implementation
    throw new Error('Matrix inverse only implemented for 2x2 matrices');
  }

  private createIdentityMatrix(size: number): number[][] {
    const result: number[][] = [];
    for (let i = 0; i < size; i++) {
      result[i] = [];
      for (let j = 0; j < size; j++) {
        result[i][j] = i === j ? 1 : 0;
      }
    }
    return result;
  }

  private matrixTrace(A: number[][]): number {
    let trace = 0;
    for (let i = 0; i < Math.min(A.length, A[0].length); i++) {
      trace += A[i][i];
    }
    return trace;
  }

  private vectorAdd(a: number[], b: number[]): number[] {
    return a.map((val, idx) => val + b[idx]);
  }

  private vectorSubtract(a: number[], b: number[]): number[] {
    return a.map((val, idx) => val - b[idx]);
  }

  /**
   * Reset all internal states (useful for new exercise sessions)
   */
  public reset(): void {
    this.previousOrientation = { roll: 0, pitch: 0, yaw: 0 };
    this.elastometerBuffer = [];
    this.initializeKalmanFilter();
  }

  /**
   * Get current buffer status for debugging
   */
  public getBufferStatus(): { elastometerBufferSize: number; sampleRate: number } {
    return {
      elastometerBufferSize: this.elastometerBuffer.length,
      sampleRate: this.SAMPLE_RATE_HZ
    };
  }
} 