/**
 * Data Preparation for Vestibular ML Model Training
 * Handles feature normalization, label encoding, dataset balancing
 * Based on Phase 3 requirements from the implementation plan
 */

// TensorFlow.js removed to prevent C++ exceptions - using pure JavaScript arrays
import {
  PosturalFeatures,
  RespiratoryMetrics,
  ExerciseSession,
  VestibularCondition,
  FallRiskAssessment,
  ExerciseQualityScore
} from '../types/SensorData';

// Training data interfaces
export interface TrainingDataPoint {
  features: number[];
  labels: {
    fallRisk: number;          // 0 or 1 for binary classification
    symptoms: number[];        // [vertigo, imbalance, nausea] 0 or 1 each
    exerciseQuality: number;   // 0-1 continuous value
  };
  metadata: {
    sessionId: string;
    userId: string;
    condition: VestibularCondition;
    exerciseType: string;
    timestamp: string;
  };
}

// Pure JavaScript dataset representation (no TensorFlow.js tensors)
export interface TrainingDataset {
  features: number[][];      // 2D array instead of tf.Tensor2D
  labels: {
    fallRisk: number[][];    // 2D array instead of tf.Tensor2D
    symptoms: number[][];    // 2D array instead of tf.Tensor2D
    exerciseQuality: number[][]; // 2D array instead of tf.Tensor2D
  };
  metadata: TrainingDataPoint['metadata'][];
  stats: DatasetStatistics;
}

export interface BalancedDataset extends TrainingDataset {
  originalSize: number;
  balancedSize: number;
  classDistribution: {
    fallRisk: { low: number; high: number };
    symptoms: { none: number; mild: number; severe: number };
    exerciseQuality: { poor: number; fair: number; good: number };
  };
}

export interface DatasetStatistics {
  featureStats: {
    mean: number[];
    std: number[];
    min: number[];
    max: number[];
  };
  labelStats: {
    fallRiskDistribution: number[];
    symptomDistribution: number[][];
    exerciseQualityMean: number;
    exerciseQualityStd: number;
  };
  sampleCount: number;
  featureCount: number;
}

export interface ClinicalAssessment {
  sessionId: string;
  fallRiskScore: number;        // 0-1 clinical assessment
  symptoms: {
    vertigo: boolean;
    imbalance: boolean;
    nausea: boolean;
  };
  exercisePerformance: number;  // 0-100 clinical rating
  clinicianNotes: string;
  assessmentDate: string;
}

export interface DataAugmentationConfig {
  noiseLevel: number;
  rotationAngle: number;
  timeShift: number;
  amplitudeScale: number;
  enabled: boolean;
}

export class MLDataPreparator {
  private readonly FEATURE_VECTOR_SIZE = 32;
  private readonly MIN_SAMPLES_PER_CLASS = 50;
  private readonly VALIDATION_SPLIT = 0.2;
  private readonly TEST_SPLIT = 0.1;
  
  // Feature normalization parameters
  private featureStats: DatasetStatistics['featureStats'] | null = null;
  
  constructor() {}

  /**
   * Prepare training dataset from exercise sessions and clinical assessments
   */
  public prepareTrainingData(
    sensorSessions: ExerciseSession[],
    clinicalLabels: ClinicalAssessment[]
  ): TrainingDataset {
    console.log(`Preparing training data from ${sensorSessions.length} sessions and ${clinicalLabels.length} assessments`);
    
    // Create lookup map for clinical assessments
    const clinicalMap = new Map<string, ClinicalAssessment>();
    clinicalLabels.forEach(assessment => {
      clinicalMap.set(assessment.sessionId, assessment);
    });

    // Extract training data points
    const dataPoints: TrainingDataPoint[] = [];
    
    for (const session of sensorSessions) {
      const clinical = clinicalMap.get(session.sessionId);
      if (!clinical) {
        console.warn(`No clinical assessment found for session ${session.sessionId}, skipping`);
        continue;
      }

      // Extract features from session
      const features = this.extractSessionFeatures(session);
      
      // Create labels from clinical assessment
      const labels = {
        fallRisk: clinical.fallRiskScore > 0.5 ? 1 : 0,
        symptoms: [
          clinical.symptoms.vertigo ? 1 : 0,
          clinical.symptoms.imbalance ? 1 : 0,
          clinical.symptoms.nausea ? 1 : 0
        ],
        exerciseQuality: clinical.exercisePerformance / 100 // Normalize to 0-1
      };

      dataPoints.push({
        features,
        labels,
        metadata: {
          sessionId: session.sessionId,
          userId: session.userId,
          condition: session.condition || 'normal',
          exerciseType: session.exerciseType,
          timestamp: session.timestamp
        }
      });
    }

    console.log(`Created ${dataPoints.length} training data points`);

    // Calculate dataset statistics
    const stats = this.calculateDatasetStatistics(dataPoints);
    
    // Normalize features
    const normalizedDataPoints = this.normalizeFeatures(dataPoints, stats.featureStats);
    
    // Convert to pure JavaScript arrays (no tensors)
    const dataset = this.convertToArrays(normalizedDataPoints, stats);
    
    return dataset;
  }

  /**
   * Balance dataset to handle class imbalance
   */
  public balanceDataset(dataset: TrainingDataset): BalancedDataset {
    console.log('Balancing dataset for class imbalance');
    
    const originalSize = dataset.metadata.length;
    
    // Data is already in array format, no need for tensor conversion
    const featuresArray = dataset.features;
    const fallRiskArray = dataset.labels.fallRisk;
    const symptomsArray = dataset.labels.symptoms;
    const exerciseQualityArray = dataset.labels.exerciseQuality;
    
    // Analyze class distribution
    const classDistribution = this.analyzeClassDistribution(
      fallRiskArray,
      symptomsArray,
      exerciseQualityArray
    );
    
    // Apply SMOTE-like oversampling for minority classes
    const balancedData = this.applySMOTE(
      featuresArray,
      fallRiskArray,
      symptomsArray,
      exerciseQualityArray,
      dataset.metadata
    );
    
    // Data is already in array format, no tensor conversion needed
    return {
      ...dataset,
      features: balancedData.features,
      labels: {
        fallRisk: balancedData.fallRisk,
        symptoms: balancedData.symptoms,
        exerciseQuality: balancedData.exerciseQuality
      },
      metadata: balancedData.metadata,
      originalSize,
      balancedSize: balancedData.features.length,
      classDistribution
    };
  }

  /**
   * Split dataset into train/validation/test sets
   */
  public splitDataset(dataset: TrainingDataset | BalancedDataset): {
    train: TrainingDataset;
    validation: TrainingDataset;
    test: TrainingDataset;
  } {
    const totalSamples = dataset.metadata.length;
    const testSize = Math.floor(totalSamples * this.TEST_SPLIT);
    const validationSize = Math.floor(totalSamples * this.VALIDATION_SPLIT);
    const trainSize = totalSamples - testSize - validationSize;
    
    console.log(`Splitting dataset: Train=${trainSize}, Validation=${validationSize}, Test=${testSize}`);
    
    // Create stratified split to maintain class distribution
    const indices = this.createStratifiedIndices(dataset, trainSize, validationSize, testSize);
    
    const train = this.createSubset(dataset, indices.train);
    const validation = this.createSubset(dataset, indices.validation);
    const test = this.createSubset(dataset, indices.test);
    
    return { train, validation, test };
  }

  /**
   * Apply data augmentation to increase dataset size
   */
  public augmentData(
    dataset: TrainingDataset,
    config: DataAugmentationConfig
  ): TrainingDataset {
    if (!config.enabled) {
      return dataset;
    }
    
    console.log('Applying data augmentation');
    
    const featuresArray = dataset.features;
    const augmentedFeatures: number[][] = [...featuresArray];
    const augmentedMetadata = [...dataset.metadata];
    
    // Create augmented versions of each sample
    for (let i = 0; i < featuresArray.length; i++) {
      const originalFeatures = featuresArray[i];
      
      // Apply noise augmentation
      if (config.noiseLevel > 0) {
        const noisyFeatures = this.addNoise(originalFeatures, config.noiseLevel);
        augmentedFeatures.push(noisyFeatures);
        augmentedMetadata.push({
          ...dataset.metadata[i],
          sessionId: `${dataset.metadata[i].sessionId}_noise`
        });
      }
      
      // Apply amplitude scaling
      if (config.amplitudeScale !== 1.0) {
        const scaledFeatures = this.scaleAmplitude(originalFeatures, config.amplitudeScale);
        augmentedFeatures.push(scaledFeatures);
        augmentedMetadata.push({
          ...dataset.metadata[i],
          sessionId: `${dataset.metadata[i].sessionId}_scaled`
        });
      }
    }
    
    // Duplicate labels for augmented data
    const fallRiskArray = dataset.labels.fallRisk;
    const symptomsArray = dataset.labels.symptoms;
    const exerciseQualityArray = dataset.labels.exerciseQuality;
    
    const augmentedFallRisk = [...fallRiskArray, ...fallRiskArray, ...fallRiskArray];
    const augmentedSymptoms = [...symptomsArray, ...symptomsArray, ...symptomsArray];
    const augmentedExerciseQuality = [...exerciseQualityArray, ...exerciseQualityArray, ...exerciseQualityArray];
    
    const augmentedDataset: TrainingDataset = {
      features: augmentedFeatures,
      labels: {
        fallRisk: augmentedFallRisk,
        symptoms: augmentedSymptoms,
        exerciseQuality: augmentedExerciseQuality
      },
      metadata: augmentedMetadata,
      stats: dataset.stats
    };
    
    console.log(`Data augmentation complete: ${featuresArray.length} -> ${augmentedFeatures.length} samples`);
    
    return augmentedDataset;
  }

  // Private utility methods

  private extractSessionFeatures(session: ExerciseSession): number[] {
    // Extract comprehensive features from exercise session
    // This would integrate with VestibularFeatureExtractor from Phase 2
    
    const features: number[] = [];
    
    // Postural features (16 values)
    if (session.summaryData?.posture) {
      features.push(
        session.summaryData.posture.avgPitch || 0,
        session.summaryData.posture.stdDevPitch || 0,
        session.summaryData.posture.avgRoll || 0,
        session.summaryData.posture.stdDevRoll || 0,
        session.summaryData.posture.swayAreaCm2 || 0
      );
    }
    
    // Respiratory features (8 values)
    if (session.summaryData?.respiration) {
      features.push(
        session.summaryData.respiration.avgBPM || 0,
        session.summaryData.respiration.avgAmplitude || 0,
        session.summaryData.respiration.avgIERatio || 0,
        session.summaryData.respiration.maxAmplitude || 0
      );
    }
    
    // Temporal features (4 values)
    features.push(
      session.durationSeconds || 0,
      this.calculateSessionComplexity(session),
      this.calculateSessionVariability(session),
      this.calculateSessionTrend(session)
    );
    
    // Demographic features (4 values)
    features.push(
      this.getUserAge(session.userId),
      this.getConditionSeverity(session.condition),
      this.getExerciseDifficulty(session.exerciseType),
      this.getSessionQuality(session)
    );
    
    // Pad to ensure consistent size
    while (features.length < this.FEATURE_VECTOR_SIZE) {
      features.push(0);
    }
    
    return features.slice(0, this.FEATURE_VECTOR_SIZE);
  }

  private calculateDatasetStatistics(dataPoints: TrainingDataPoint[]): DatasetStatistics {
    const features = dataPoints.map(dp => dp.features);
    const fallRiskLabels = dataPoints.map(dp => dp.labels.fallRisk);
    const symptomLabels = dataPoints.map(dp => dp.labels.symptoms);
    const exerciseQualityLabels = dataPoints.map(dp => dp.labels.exerciseQuality);
    
    // Calculate feature statistics
    const featureCount = features[0].length;
    const mean = new Array(featureCount).fill(0);
    const std = new Array(featureCount).fill(0);
    const min = new Array(featureCount).fill(Infinity);
    const max = new Array(featureCount).fill(-Infinity);
    
    // Calculate means, mins, maxs
    for (const featureVector of features) {
      for (let i = 0; i < featureCount; i++) {
        mean[i] += featureVector[i];
        min[i] = Math.min(min[i], featureVector[i]);
        max[i] = Math.max(max[i], featureVector[i]);
      }
    }
    
    for (let i = 0; i < featureCount; i++) {
      mean[i] /= features.length;
    }
    
    // Calculate standard deviations
    for (const featureVector of features) {
      for (let i = 0; i < featureCount; i++) {
        std[i] += Math.pow(featureVector[i] - mean[i], 2);
      }
    }
    
    for (let i = 0; i < featureCount; i++) {
      std[i] = Math.sqrt(std[i] / features.length);
    }
    
    // Calculate label statistics
    const fallRiskDistribution = [
      fallRiskLabels.filter(label => label === 0).length,
      fallRiskLabels.filter(label => label === 1).length
    ];
    
    const symptomDistribution = [
      symptomLabels.map(symptoms => symptoms[0]),
      symptomLabels.map(symptoms => symptoms[1]),
      symptomLabels.map(symptoms => symptoms[2])
    ];
    
    const exerciseQualityMean = exerciseQualityLabels.reduce((sum, val) => sum + val, 0) / exerciseQualityLabels.length;
    const exerciseQualityStd = Math.sqrt(
      exerciseQualityLabels.reduce((sum, val) => sum + Math.pow(val - exerciseQualityMean, 2), 0) / exerciseQualityLabels.length
    );
    
    return {
      featureStats: { mean, std, min, max },
      labelStats: {
        fallRiskDistribution,
        symptomDistribution,
        exerciseQualityMean,
        exerciseQualityStd
      },
      sampleCount: dataPoints.length,
      featureCount
    };
  }

  private normalizeFeatures(
    dataPoints: TrainingDataPoint[],
    stats: DatasetStatistics['featureStats']
  ): TrainingDataPoint[] {
    this.featureStats = stats;
    
    return dataPoints.map(dp => ({
      ...dp,
      features: dp.features.map((value, index) => {
        const mean = stats.mean[index];
        const std = stats.std[index];
        return std > 0 ? (value - mean) / std : 0;
      })
    }));
  }

  /**
   * Convert normalized data points to pure JavaScript arrays (no TensorFlow.js tensors)
   */
  private convertToArrays(dataPoints: TrainingDataPoint[], stats: DatasetStatistics): TrainingDataset {
    const features: number[][] = [];
    const fallRisk: number[][] = [];
    const symptoms: number[][] = [];
    const exerciseQuality: number[][] = [];
    const metadata: TrainingDataPoint['metadata'][] = [];

    for (const point of dataPoints) {
      features.push(point.features);
      fallRisk.push([point.labels.fallRisk]);
      symptoms.push(point.labels.symptoms);
      exerciseQuality.push([point.labels.exerciseQuality]);
      metadata.push(point.metadata);
    }

    return {
      features,
      labels: {
        fallRisk,
        symptoms,
        exerciseQuality
      },
      metadata,
      stats
    };
  }

  private analyzeClassDistribution(
    fallRisk: number[][],
    symptoms: number[][],
    exerciseQuality: number[][]
  ) {
    const fallRiskCounts = { low: 0, high: 0 };
    const symptomCounts = { none: 0, mild: 0, severe: 0 };
    const qualityCounts = { poor: 0, fair: 0, good: 0 };
    
    fallRisk.forEach(([risk]) => {
      if (risk < 0.5) fallRiskCounts.low++;
      else fallRiskCounts.high++;
    });
    
    symptoms.forEach(symptomVector => {
      const symptomCount = symptomVector.reduce((sum, val) => sum + val, 0);
      if (symptomCount === 0) symptomCounts.none++;
      else if (symptomCount <= 1) symptomCounts.mild++;
      else symptomCounts.severe++;
    });
    
    exerciseQuality.forEach(([quality]) => {
      if (quality < 0.33) qualityCounts.poor++;
      else if (quality < 0.67) qualityCounts.fair++;
      else qualityCounts.good++;
    });
    
    return {
      fallRisk: fallRiskCounts,
      symptoms: symptomCounts,
      exerciseQuality: qualityCounts
    };
  }

  private applySMOTE(
    features: number[][],
    fallRisk: number[][],
    symptoms: number[][],
    exerciseQuality: number[][],
    metadata: TrainingDataPoint['metadata'][]
  ) {
    // Simplified SMOTE implementation
    // In production, this would be more sophisticated
    
    const minorityIndices = this.findMinorityClassIndices(fallRisk);
    const syntheticSamples = this.generateSyntheticSamples(features, minorityIndices);
    
    return {
      features: [...features, ...syntheticSamples],
      fallRisk: [...fallRisk, ...minorityIndices.map(i => fallRisk[i])],
      symptoms: [...symptoms, ...minorityIndices.map(i => symptoms[i])],
      exerciseQuality: [...exerciseQuality, ...minorityIndices.map(i => exerciseQuality[i])],
      metadata: [...metadata, ...minorityIndices.map(i => ({
        ...metadata[i],
        sessionId: `${metadata[i].sessionId}_synthetic`
      }))]
    };
  }

  private findMinorityClassIndices(fallRisk: number[][]): number[] {
    const highRiskCount = fallRisk.filter(([risk]) => risk >= 0.5).length;
    const lowRiskCount = fallRisk.length - highRiskCount;
    
    // Return indices of minority class
    if (highRiskCount < lowRiskCount) {
      return fallRisk.map((risk, index) => risk[0] >= 0.5 ? index : -1).filter(i => i >= 0);
    } else {
      return fallRisk.map((risk, index) => risk[0] < 0.5 ? index : -1).filter(i => i >= 0);
    }
  }

  private generateSyntheticSamples(features: number[][], indices: number[]): number[][] {
    const synthetic: number[][] = [];
    
    for (let i = 0; i < indices.length; i++) {
      const baseIndex = indices[i];
      const neighborIndex = indices[(i + 1) % indices.length];
      
      const syntheticSample = features[baseIndex].map((value, featureIndex) => {
        const neighborValue = features[neighborIndex][featureIndex];
        const alpha = Math.random();
        return value + alpha * (neighborValue - value);
      });
      
      synthetic.push(syntheticSample);
    }
    
    return synthetic;
  }

  private createStratifiedIndices(
    dataset: TrainingDataset | BalancedDataset,
    trainSize: number,
    validationSize: number,
    testSize: number
  ) {
    // Simplified stratified sampling
    const totalSize = dataset.metadata.length;
    const indices = Array.from({ length: totalSize }, (_, i) => i);
    
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    
    return {
      train: indices.slice(0, trainSize),
      validation: indices.slice(trainSize, trainSize + validationSize),
      test: indices.slice(trainSize + validationSize)
    };
  }

  private createSubset(dataset: TrainingDataset | BalancedDataset, indices: number[]): TrainingDataset {
    const featuresArray = dataset.features;
    const fallRiskArray = dataset.labels.fallRisk;
    const symptomsArray = dataset.labels.symptoms;
    const exerciseQualityArray = dataset.labels.exerciseQuality;
    
    const subsetFeatures = indices.map(i => featuresArray[i]);
    const subsetFallRisk = indices.map(i => fallRiskArray[i]);
    const subsetSymptoms = indices.map(i => symptomsArray[i]);
    const subsetExerciseQuality = indices.map(i => exerciseQualityArray[i]);
    const subsetMetadata = indices.map(i => dataset.metadata[i]);
    
    return {
      features: subsetFeatures,
      labels: {
        fallRisk: subsetFallRisk,
        symptoms: subsetSymptoms,
        exerciseQuality: subsetExerciseQuality
      },
      metadata: subsetMetadata,
      stats: dataset.stats
    };
  }

  private addNoise(features: number[], noiseLevel: number): number[] {
    return features.map(value => {
      const noise = (Math.random() - 0.5) * 2 * noiseLevel;
      return value + noise;
    });
  }

  private scaleAmplitude(features: number[], scale: number): number[] {
    return features.map(value => value * scale);
  }

  // Utility methods for feature extraction
  private calculateSessionComplexity(session: ExerciseSession): number {
    // Calculate based on exercise type and duration
    const baseComplexity = this.getExerciseDifficulty(session.exerciseType);
    const durationFactor = Math.min(1.0, (session.durationSeconds || 60) / 300); // Normalize to 5 minutes
    return baseComplexity * durationFactor;
  }

  private calculateSessionVariability(session: ExerciseSession): number {
    // Calculate based on postural sway variability
    if (session.summaryData?.posture) {
      const pitchVar = session.summaryData.posture.stdDevPitch || 0;
      const rollVar = session.summaryData.posture.stdDevRoll || 0;
      return Math.sqrt(pitchVar * pitchVar + rollVar * rollVar);
    }
    return 0;
  }

  private calculateSessionTrend(session: ExerciseSession): number {
    // Simplified trend calculation
    // In production, this would analyze time-series data
    return Math.random() * 0.2 - 0.1; // -0.1 to 0.1
  }

  private getUserAge(userId: string): number {
    // Mock user age - in production, get from user profile
    return 50; // Default age
  }

  private getConditionSeverity(condition?: VestibularCondition): number {
    const severityMap: Record<string, number> = {
      'normal': 1,
      'bppv': 3,
      'vestibular_neuritis': 4,
      'menieres': 3,
      'bilateral_loss': 5,
      'unilateral_loss': 3,
      'migraine': 2
    };
    return severityMap[condition || 'normal'] || 1;
  }

  private getExerciseDifficulty(exerciseType: string): number {
    const difficultyMap: Record<string, number> = {
      'romberg_eyes_open': 0.3,
      'romberg_eyes_closed': 0.6,
      'single_leg_stand': 0.7,
      'tandem_walk': 0.8,
      'dynamic_balance': 0.9
    };
    return difficultyMap[exerciseType] || 0.5;
  }

  private getSessionQuality(session: ExerciseSession): number {
    // Calculate overall session quality based on completion and consistency
    if (session.summaryData?.respiration) {
      const breathingRegularity = session.summaryData.respiration.avgIERatio || 0.5;
      const expectedDuration = 120; // 2 minutes
      const durationScore = Math.min(1.0, (session.durationSeconds || 0) / expectedDuration);
      return (breathingRegularity + durationScore) / 2;
    }
    return 0.5;
  }

  /**
   * Dispose of tensors to free memory
   */
  public dispose(dataset: TrainingDataset | BalancedDataset): void {
    // No tensors to dispose of in pure JavaScript implementation
  }
} 