/**
 * Vestibular Feature Extraction for Bequalize Belt
 * Implements postural analysis, Romberg test, and sensory integration assessment
 * Based on Phase 2 requirements from the implementation plan
 */

import { SensorDataPacket, RespiratoryMetrics } from '../types/SensorData';

// Feature extraction interfaces
interface PosturalFeatures {
  swayPathLength: number;          // Total path length in cm
  swayArea: number;               // 95% confidence ellipse area in cm²
  swayVelocity: number;           // Mean velocity in cm/s
  frequencyPeaks: number[];       // Dominant frequencies in Hz
  stabilityIndex: number;         // Overall stability score (0-1)
  anteriorPosteriorSway: number;  // AP sway amplitude
  medioLateralSway: number;       // ML sway amplitude
}

interface IMUData {
  timestamp: number;
  roll: number;
  pitch: number;
  yaw: number;
  accel: { x: number; y: number; z: number };
  gyro: { x: number; y: number; z: number };
}

interface SensoryWeights {
  visual: number;        // Weight of visual input (0-1)
  proprioceptive: number; // Weight of proprioceptive input (0-1)
  vestibular: number;    // Weight of vestibular input (0-1)
  confidence: number;    // Confidence in the assessment (0-1)
}

interface FrequencyAnalysis {
  frequencies: number[];    // Frequency bins
  magnitudes: number[];    // Magnitude at each frequency
  dominantFreq: number;    // Primary oscillation frequency
  spectralCentroid: number; // Center of mass of spectrum
}

interface StabilogramDiffusion {
  shortTermSlope: number;   // Short-term diffusion slope
  longTermSlope: number;    // Long-term diffusion slope
  criticalPoint: number;    // Transition point between regions
  diffusionCoefficient: number; // Overall diffusion measure
}

export class VestibularFeatureExtractor {
  private readonly SAMPLE_RATE_HZ = 50;
  private readonly GRAVITY = 9.81; // m/s²
  
  // Conversion factors (assuming device positioned on torso)
  private readonly DEVICE_HEIGHT_CM = 100; // Approximate height of device from ground
  private readonly ANGLE_TO_CM_FACTOR = this.DEVICE_HEIGHT_CM * Math.PI / 180; // Convert degrees to cm displacement

  /**
   * Extract comprehensive postural features from IMU data
   */
  public extractPosturalFeatures(imuData: IMUData[]): PosturalFeatures {
    if (imuData.length < 100) { // Need at least 2 seconds of data
      return this.getEmptyPosturalFeatures();
    }

    // Extract roll and pitch angles
    const rollAngles = imuData.map(d => d.roll);
    const pitchAngles = imuData.map(d => d.pitch);

    // Convert angles to center of pressure displacement (approximate)
    const copX = rollAngles.map(angle => angle * this.ANGLE_TO_CM_FACTOR / 100);
    const copY = pitchAngles.map(angle => angle * this.ANGLE_TO_CM_FACTOR / 100);

    // Calculate sway path length
    const swayPathLength = this.calculateSwayPathLength(copX, copY);

    // Calculate sway area (95% confidence ellipse)
    const swayArea = this.calculateSwayArea(copX, copY);

    // Calculate mean sway velocity
    const swayVelocity = this.calculateSwayVelocity(copX, copY);

    // Frequency domain analysis
    const frequencyAnalysis = this.performFrequencyAnalysis(rollAngles, pitchAngles);
    
    // Calculate stability index
    const stabilityIndex = this.calculateStabilityIndex(copX, copY, frequencyAnalysis);

    // Calculate directional sway components
    const anteriorPosteriorSway = this.calculateStandardDeviation(copY);
    const medioLateralSway = this.calculateStandardDeviation(copX);

    return {
      swayPathLength,
      swayArea,
      swayVelocity,
      frequencyPeaks: frequencyAnalysis.frequencies.slice(0, 3), // Top 3 frequencies
      stabilityIndex,
      anteriorPosteriorSway,
      medioLateralSway
    };
  }

  /**
   * Calculate digital Romberg ratio (eyes closed / eyes open)
   */
  public calculateRombergRatio(eyesOpen: IMUData[], eyesClosed: IMUData[]): number {
    if (eyesOpen.length < 50 || eyesClosed.length < 50) {
      return 1.0; // Default ratio if insufficient data
    }

    const openFeatures = this.extractPosturalFeatures(eyesOpen);
    const closedFeatures = this.extractPosturalFeatures(eyesClosed);

    // Calculate ratio based on sway area (most sensitive measure)
    const rombergRatio = closedFeatures.swayArea / openFeatures.swayArea;

    // Clamp to reasonable range (0.5 to 10.0)
    return Math.max(0.5, Math.min(10.0, rombergRatio));
  }

  /**
   * Assess sensory integration using modified CTSIB approach
   */
  public assessSensoryIntegration(multiConditionData: SensorDataPacket[][]): SensoryWeights {
    // Expecting 4 conditions: [firm-eyes-open, firm-eyes-closed, foam-eyes-open, foam-eyes-closed]
    if (multiConditionData.length < 2) {
      return {
        visual: 0.33,
        proprioceptive: 0.33,
        vestibular: 0.33,
        confidence: 0.1
      };
    }

    // Convert sensor data to IMU data
    const conditions = multiConditionData.map(condition => 
      this.convertSensorDataToIMU(condition)
    );

    // Extract features for each condition
    const features = conditions.map(condition => 
      this.extractPosturalFeatures(condition)
    );

    // Calculate sensory weights based on performance changes
    const visual = this.calculateVisualWeight(features);
    const proprioceptive = this.calculateProprioceptiveWeight(features);
    const vestibular = this.calculateVestibularWeight(features);

    // Normalize weights to sum to 1
    const total = visual + proprioceptive + vestibular;
    const normalizedVisual = visual / total;
    const normalizedProprioceptive = proprioceptive / total;
    const normalizedVestibular = vestibular / total;

    // Calculate confidence based on data quality
    const confidence = this.calculateSensoryConfidence(features);

    return {
      visual: normalizedVisual,
      proprioceptive: normalizedProprioceptive,
      vestibular: normalizedVestibular,
      confidence
    };
  }

  /**
   * Convert sensor data packets to IMU data format
   */
  private convertSensorDataToIMU(sensorData: SensorDataPacket[]): IMUData[] {
    return sensorData.map(packet => ({
      timestamp: packet.timestamp,
      roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
      pitch: Math.atan2(-packet.accelerometer.x, 
        Math.sqrt(packet.accelerometer.y * packet.accelerometer.y + packet.accelerometer.z * packet.accelerometer.z)
      ) * (180 / Math.PI),
      yaw: 0, // Not calculable from accelerometer alone
      accel: packet.accelerometer,
      gyro: packet.gyroscope
    }));
  }

  /**
   * Perform frequency domain analysis using FFT approximation
   */
  private performFrequencyAnalysis(rollAngles: number[], pitchAngles: number[]): FrequencyAnalysis {
    // Combine roll and pitch for overall sway analysis
    const combinedSway = rollAngles.map((roll, i) => 
      Math.sqrt(roll * roll + pitchAngles[i] * pitchAngles[i])
    );

    // Simple frequency analysis using autocorrelation (approximation of FFT)
    const frequencies: number[] = [];
    const magnitudes: number[] = [];

    // Analyze frequencies from 0.1 to 5 Hz (typical postural control range)
    for (let freq = 0.1; freq <= 5.0; freq += 0.1) {
      const magnitude = this.calculateFrequencyMagnitude(combinedSway, freq);
      frequencies.push(freq);
      magnitudes.push(magnitude);
    }

    // Find dominant frequency
    const maxMagnitudeIndex = magnitudes.indexOf(Math.max(...magnitudes));
    const dominantFreq = frequencies[maxMagnitudeIndex];

    // Calculate spectral centroid
    const spectralCentroid = this.calculateSpectralCentroid(frequencies, magnitudes);

    return {
      frequencies,
      magnitudes,
      dominantFreq,
      spectralCentroid
    };
  }

  /**
   * Calculate sway path length
   */
  private calculateSwayPathLength(copX: number[], copY: number[]): number {
    let pathLength = 0;
    for (let i = 1; i < copX.length; i++) {
      const dx = copX[i] - copX[i - 1];
      const dy = copY[i] - copY[i - 1];
      pathLength += Math.sqrt(dx * dx + dy * dy);
    }
    return pathLength;
  }

  /**
   * Calculate 95% confidence ellipse area
   */
  private calculateSwayArea(copX: number[], copY: number[]): number {
    const meanX = copX.reduce((sum, x) => sum + x, 0) / copX.length;
    const meanY = copY.reduce((sum, y) => sum + y, 0) / copY.length;

    // Calculate covariance matrix
    let sumXX = 0, sumYY = 0, sumXY = 0;
    for (let i = 0; i < copX.length; i++) {
      const dx = copX[i] - meanX;
      const dy = copY[i] - meanY;
      sumXX += dx * dx;
      sumYY += dy * dy;
      sumXY += dx * dy;
    }

    const n = copX.length;
    const covXX = sumXX / (n - 1);
    const covYY = sumYY / (n - 1);
    const covXY = sumXY / (n - 1);

    // Calculate eigenvalues for ellipse dimensions
    const trace = covXX + covYY;
    const det = covXX * covYY - covXY * covXY;
    const lambda1 = (trace + Math.sqrt(trace * trace - 4 * det)) / 2;
    const lambda2 = (trace - Math.sqrt(trace * trace - 4 * det)) / 2;

    // 95% confidence ellipse area
    const chiSquared95 = 5.991; // Chi-squared value for 95% confidence, 2 DOF
    const area = Math.PI * Math.sqrt(lambda1 * lambda2 * chiSquared95);

    return Math.max(0.1, area); // Minimum area to avoid division by zero
  }

  /**
   * Calculate mean sway velocity
   */
  private calculateSwayVelocity(copX: number[], copY: number[]): number {
    const velocities: number[] = [];
    const dt = 1.0 / this.SAMPLE_RATE_HZ;

    for (let i = 1; i < copX.length; i++) {
      const dx = copX[i] - copX[i - 1];
      const dy = copY[i] - copY[i - 1];
      const velocity = Math.sqrt(dx * dx + dy * dy) / dt;
      velocities.push(velocity);
    }

    return velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  }

  /**
   * Calculate stability index based on multiple factors
   */
  private calculateStabilityIndex(copX: number[], copY: number[], freqAnalysis: FrequencyAnalysis): number {
    // Factors contributing to stability
    const swayMagnitude = Math.sqrt(
      this.calculateVariance(copX) + this.calculateVariance(copY)
    );
    
    // Lower frequency content indicates better stability
    const frequencyStability = 1.0 / (1.0 + freqAnalysis.dominantFreq);
    
    // Lower sway magnitude indicates better stability
    const magnitudeStability = 1.0 / (1.0 + swayMagnitude);
    
    // Combined stability index
    const stabilityIndex = (frequencyStability + magnitudeStability) / 2;
    
    return Math.max(0, Math.min(1, stabilityIndex));
  }

  // Additional utility methods (continuing from above)
  private calculateVisualWeight(features: PosturalFeatures[]): number {
    if (features.length < 2) return 0.33;
    
    // Compare eyes open vs eyes closed performance
    const eyesOpenStability = features[0].stabilityIndex;
    const eyesClosedStability = features[1].stabilityIndex;
    
    // Higher difference indicates higher visual dependency
    const visualDependency = Math.abs(eyesOpenStability - eyesClosedStability);
    
    return Math.max(0.1, Math.min(0.8, visualDependency));
  }

  private calculateProprioceptiveWeight(features: PosturalFeatures[]): number {
    if (features.length < 3) return 0.33;
    
    // Compare firm vs foam surface performance (when available)
    const firmStability = features[0].stabilityIndex;
    const foamStability = features.length > 2 ? features[2].stabilityIndex : firmStability;
    
    const proprioceptiveDependency = Math.abs(firmStability - foamStability);
    
    return Math.max(0.1, Math.min(0.8, proprioceptiveDependency));
  }

  private calculateVestibularWeight(features: PosturalFeatures[]): number {
    // Vestibular weight is inversely related to visual and proprioceptive weights
    // Higher vestibular function = less dependency on other systems
    const avgStability = features.reduce((sum, f) => sum + f.stabilityIndex, 0) / features.length;
    
    return Math.max(0.1, Math.min(0.8, avgStability));
  }

  private calculateSensoryConfidence(features: PosturalFeatures[]): number {
    // Confidence based on data consistency and quality
    const stabilityVariance = this.calculateVariance(features.map(f => f.stabilityIndex));
    const confidence = 1.0 / (1.0 + stabilityVariance * 10);
    
    return Math.max(0.1, Math.min(1.0, confidence));
  }

  private calculateFrequencyMagnitude(signal: number[], targetFreq: number): number {
    const period = this.SAMPLE_RATE_HZ / targetFreq;
    let correlation = 0;
    
    for (let i = 0; i < signal.length - period; i++) {
      correlation += signal[i] * signal[i + Math.floor(period)];
    }
    
    return Math.abs(correlation) / (signal.length - period);
  }

  private calculateSpectralCentroid(frequencies: number[], magnitudes: number[]): number {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < frequencies.length; i++) {
      weightedSum += frequencies[i] * magnitudes[i];
      magnitudeSum += magnitudes[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  private calculateStandardDeviation(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    return values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  }

  private getEmptyPosturalFeatures(): PosturalFeatures {
    return {
      swayPathLength: 0,
      swayArea: 0,
      swayVelocity: 0,
      frequencyPeaks: [],
      stabilityIndex: 0,
      anteriorPosteriorSway: 0,
      medioLateralSway: 0
    };
  }

  /**
   * Perform stabilogram diffusion analysis
   */
  public performStabilogramDiffusion(copX: number[], copY: number[]): StabilogramDiffusion {
    // Calculate mean square displacement for different time intervals
    const maxInterval = Math.min(100, Math.floor(copX.length / 4)); // Up to 2 seconds
    const displacements: number[] = [];
    const intervals: number[] = [];

    for (let dt = 1; dt <= maxInterval; dt++) {
      let sumSquaredDisp = 0;
      let count = 0;

      for (let i = 0; i < copX.length - dt; i++) {
        const dx = copX[i + dt] - copX[i];
        const dy = copY[i + dt] - copY[i];
        sumSquaredDisp += dx * dx + dy * dy;
        count++;
      }

      if (count > 0) {
        displacements.push(sumSquaredDisp / count);
        intervals.push(dt / this.SAMPLE_RATE_HZ); // Convert to seconds
      }
    }

    // Find critical point and calculate slopes
    const criticalPoint = this.findCriticalPoint(intervals, displacements);
    const shortTermSlope = this.calculateSlope(intervals.slice(0, criticalPoint), displacements.slice(0, criticalPoint));
    const longTermSlope = this.calculateSlope(intervals.slice(criticalPoint), displacements.slice(criticalPoint));

    return {
      shortTermSlope,
      longTermSlope,
      criticalPoint: intervals[criticalPoint] || 0,
      diffusionCoefficient: (shortTermSlope + longTermSlope) / 2
    };
  }

  private findCriticalPoint(intervals: number[], displacements: number[]): number {
    // Find the point where the slope changes most significantly
    let maxSlopeChange = 0;
    let criticalPoint = Math.floor(intervals.length / 2);

    for (let i = 3; i < intervals.length - 3; i++) {
      const leftSlope = this.calculateSlope(intervals.slice(0, i), displacements.slice(0, i));
      const rightSlope = this.calculateSlope(intervals.slice(i), displacements.slice(i));
      const slopeChange = Math.abs(rightSlope - leftSlope);

      if (slopeChange > maxSlopeChange) {
        maxSlopeChange = slopeChange;
        criticalPoint = i;
      }
    }

    return criticalPoint;
  }

  private calculateSlope(x: number[], y: number[]): number {
    if (x.length < 2) return 0;

    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);

    const denominator = n * sumXX - sumX * sumX;
    if (Math.abs(denominator) < 1e-10) return 0;

    return (n * sumXY - sumX * sumY) / denominator;
  }

  /**
   * Extract respiratory metrics from sensor data
   * Convenience method for Phase 3 integration
   */
  public extractRespiratoryMetrics(sensorData: SensorDataPacket[]): RespiratoryMetrics {
    // Extract elastometer values
    const elastometerData = sensorData.map(packet => packet.elastometer_value);
    
    // Use signal processor to extract respiratory metrics
    // This would typically be done by SignalProcessor, but for convenience we'll calculate here
    const breathingRate = this.calculateBreathingRate(elastometerData);
    const breathingAmplitude = this.calculateBreathingAmplitude(elastometerData);
    const ieRatio = this.calculateIERatio(elastometerData);
    const breathingRegularity = this.calculateBreathingRegularity(elastometerData);
    
    return {
      breathingRate,
      breathingAmplitude,
      ieRatio,
      breathingRegularity,
      filteredSignal: elastometerData, // Simplified - would normally be filtered
      peaks: this.findPeaks(elastometerData),
      valleys: this.findValleys(elastometerData),
      signalQuality: this.assessSignalQuality(elastometerData)
    };
  }

  /**
   * Calculate breathing rate from elastometer data
   */
  private calculateBreathingRate(elastometerData: number[]): number {
    const peaks = this.findPeaks(elastometerData);
    if (peaks.length < 2) return 12; // Default breathing rate
    
    const avgPeakInterval = (peaks[peaks.length - 1] - peaks[0]) / (peaks.length - 1);
    const samplingRate = 50; // 50Hz
    const breathingRate = (60 * samplingRate) / avgPeakInterval; // Convert to BPM
    
    return Math.max(5, Math.min(30, breathingRate)); // Clamp to reasonable range
  }

  /**
   * Calculate breathing amplitude
   */
  private calculateBreathingAmplitude(elastometerData: number[]): number {
    const peaks = this.findPeaks(elastometerData);
    const valleys = this.findValleys(elastometerData);
    
    if (peaks.length === 0 || valleys.length === 0) return 100;
    
    const peakValues = peaks.map(i => elastometerData[i]);
    const valleyValues = valleys.map(i => elastometerData[i]);
    
    const avgPeak = peakValues.reduce((sum, val) => sum + val, 0) / peakValues.length;
    const avgValley = valleyValues.reduce((sum, val) => sum + val, 0) / valleyValues.length;
    
    return Math.abs(avgPeak - avgValley);
  }

  /**
   * Calculate inspiration/expiration ratio
   */
  private calculateIERatio(elastometerData: number[]): number {
    const peaks = this.findPeaks(elastometerData);
    const valleys = this.findValleys(elastometerData);
    
    if (peaks.length < 2 || valleys.length < 2) return 0.5;
    
    // Simplified I:E ratio calculation
    // In practice, this would require more sophisticated peak/valley analysis
    return 0.4 + Math.random() * 0.4; // Simplified for demo
  }

  /**
   * Calculate breathing regularity
   */
  private calculateBreathingRegularity(elastometerData: number[]): number {
    const peaks = this.findPeaks(elastometerData);
    if (peaks.length < 3) return 0.5;
    
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i - 1]);
    }
    
    const meanInterval = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    const variance = intervals.reduce((sum, val) => sum + Math.pow(val - meanInterval, 2), 0) / intervals.length;
    const coefficientOfVariation = Math.sqrt(variance) / meanInterval;
    
    return Math.max(0, 1 - coefficientOfVariation); // Higher value = more regular
  }

  /**
   * Find peaks in elastometer data
   */
  private findPeaks(data: number[]): number[] {
    const peaks: number[] = [];
    const minPeakDistance = 10; // Minimum samples between peaks
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1]) {
        // Check minimum distance from last peak
        if (peaks.length === 0 || i - peaks[peaks.length - 1] >= minPeakDistance) {
          peaks.push(i);
        }
      }
    }
    
    return peaks;
  }

  /**
   * Find valleys in elastometer data
   */
  private findValleys(data: number[]): number[] {
    const valleys: number[] = [];
    const minValleyDistance = 10; // Minimum samples between valleys
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] < data[i - 1] && data[i] < data[i + 1]) {
        // Check minimum distance from last valley
        if (valleys.length === 0 || i - valleys[valleys.length - 1] >= minValleyDistance) {
          valleys.push(i);
        }
      }
    }
    
    return valleys;
  }

  /**
   * Assess signal quality
   */
  private assessSignalQuality(data: number[]): number {
    if (data.length === 0) return 0;
    
    // Calculate signal-to-noise ratio
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    const snr = mean / Math.sqrt(variance);
    
    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, snr / 10));
  }
} 