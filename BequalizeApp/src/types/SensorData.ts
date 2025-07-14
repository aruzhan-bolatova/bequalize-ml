/**
 * Core sensor data types for Bequalize Belt
 * Based on the JSON format specified in the documentation
 */

// Base sensor data packet as defined in the documentation
export interface SensorDataPacket {
  timestamp: number;              // Packet acquisition time
  battery_percent: number;        // Battery percentage (0-100)
  buttons_state: number;          // Bitmask for button states (0=no press, 1=btn1, 2=btn2, 3=btn1+btn2)
  accelerometer: {
    x: number;                    // Acceleration on X-axis (scaled value)
    y: number;                    // Acceleration on Y-axis
    z: number;                    // Acceleration on Z-axis
  };
  gyroscope: {
    x: number;                    // Angular velocity on X-axis (scaled value)
    y: number;                    // Angular velocity on Y-axis
    z: number;                    // Angular velocity on Z-axis
  };
  elastometer_value: number;      // Raw/scaled elastometer value
  temperature_celsius: number;    // Temperature in degrees Celsius
}

// Calibration data for baseline correction
export interface CalibrationData {
  accelerometer_baseline: { x: number; y: number; z: number };
  gyroscope_baseline: { x: number; y: number; z: number };
  elastometer_baseline: number;
  temperature_baseline: number;
  calibration_timestamp: number;
}

// Enhanced sensor data with calibration and processing
export interface CalibratedSensorData extends SensorDataPacket {
  session_id: string;
  user_id: string;
  exercise_type: ExerciseType;
  exercise_phase: 'calibration' | 'active' | 'rest';
  calibration_baseline: CalibrationData;
  
  // Calibrated values (baseline-corrected)
  calibrated_accelerometer: { x: number; y: number; z: number };
  calibrated_gyroscope: { x: number; y: number; z: number };
  calibrated_elastometer: number;
}

// Exercise types as mentioned in the documentation
export type ExerciseType = 
  | 'Romberg Test (Eyes Open)'
  | 'Romberg Test (Eyes Closed)'
  | 'Single Leg Stand'
  | 'Weight Shifting Exercises'
  | 'Limits of Stability Test'
  | 'Guided Diaphragmatic Breathing'
  | 'Controlled Deep Breathing'
  | 'Respiratory Coherence'
  | 'Breath-Hold Exercises';

// Vestibular conditions for user profiling
// Q: what conditions are we looking for?
export type VestibularCondition = 
  | 'normal'
  | 'bppv'
  | 'vestibular_neuritis'
  | 'menieres'
  | 'bilateral_loss'
  | 'unilateral_loss'
  | 'migraine';

// User profile interface
export interface UserProfile {
  user_id: string;
  age: number;
  vestibular_diagnosis: VestibularCondition;
  severity_level: 1 | 2 | 3 | 4 | 5;
  current_medications: string[];
  exercise_history: ExerciseHistory[];
}

// Exercise history tracking
export interface ExerciseHistory {
  exercise_id: string;
  exercise_type: ExerciseType;
  completion_date: string;
  duration_seconds: number;
  performance_score: number;
  notes?: string;
}

// Processed features for ML input
export interface ProcessedFeatures {
  // Postural stability features
  roll_angle: number; 
  pitch_angle: number;
  yaw_angle: number;
  
  // Sway analysis
  sway_velocity: number;
  sway_area: number;
  sway_path_length: number;
  
  // Respiratory features
  respiratory_rate: number;
  breathing_amplitude: number;
  ie_ratio: number;
  
  // Additional features
  temperature_trend: number;
  movement_intensity: number;
}

// Exercise session summary for local storage
export interface ExerciseSessionSummary {
  sessionId: string;
  timestamp: string;           // ISO 8601 string for sorting
  exerciseType: ExerciseType;
  durationSeconds: number;
  summaryData: {
    posture: {    
      avgPitch: number;
      stdDevPitch: number;
      avgRoll: number;
      stdDevRoll: number;   
      swayAreaCm2: number;
    };
    respiration: {
      avgBPM: number;          // average breaths per minute
      avgAmplitude: number;    // average breath amplitude
      avgIERatio: number;      // average inspiratory-expiratory ratio
      maxAmplitude: number;   // maximum breath amplitude
    };
    temperature: {
      avgCelsius: number;
      maxCelsius: number;
    };
  };
}

// Exercise session interface for ML training
export interface ExerciseSession extends ExerciseSessionSummary {
  userId: string;
  condition?: VestibularCondition;
}

// Real-time feedback data structures
export interface RealTimeFeedback {
  stability_score: number;
  exercise_quality: number;
  safety_alerts: SafetyAlert[];
  coaching_cues: CoachingCue[];
}

// Safety alerts returned from the ML model
// Q: what are the safety alerts we are looking for?
export interface SafetyAlert {
  type: 'fall_risk' | 'excessive_sway' | 'irregular_breathing' | 'device_malfunction';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
}

export interface CoachingCue {
  type: 'posture' | 'breathing' | 'movement' | 'encouragement';
  message: string;
  duration_ms: number;
  priority: 'low' | 'medium' | 'high';
}

// ML model prediction interfaces
export interface FallRiskAssessment {
  risk_score: number;        // 0-1 probability
  risk_factors: string[];    // Contributing factors
  confidence: number;        // Model confidence
  recommendations: string[];
}

export interface ExerciseQualityScore {
  overall_score: number;     // 0-100 scale
  form_analysis: {
    posture_quality: number;
    breathing_quality: number;
    stability_score: number;
  };
  improvement_areas: string[];
  next_progression: string;
}

// Vestibular assessment results
export interface VestibularAssessment {
  romberg_ratio: number;
  dynamic_balance_score: number;
  sensory_integration_scores: {
    visual_dependence: number;
    proprioceptive_weighting: number;
    vestibular_contribution: number;
  };
  fall_risk_category: 'low' | 'moderate' | 'high';
  recommendations: string[];
}

// Phase 2: Advanced Signal Processing Types

// Mathematical utility types for signal processing
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface EulerAngles {
  roll: number;  // Rotation around X-axis (degrees)
  pitch: number; // Rotation around Y-axis (degrees)
  yaw: number;   // Rotation around Z-axis (degrees)
}

export interface Quaternion {
  w: number;
  x: number;
  y: number;
  z: number;
}

// Respiratory analysis results
export interface RespiratoryMetrics {
  breathingRate: number;        // BPM
  breathingAmplitude: number;   // Peak-to-valley difference
  ieRatio: number;             // Inspiration/Expiration ratio
  breathingRegularity: number; // Coefficient of variation
  filteredSignal: number[];    // Low-pass filtered elastometer data
  peaks: number[];             // Peak indices
  valleys: number[];           // Valley indices
  signalQuality?: number;      // Quality of respiratory signal (0-1) - optional for now
}

// Postural analysis results
export interface PosturalFeatures {
  swayPathLength: number;          // Total path length in cm
  swayArea: number;               // 95% confidence ellipse area in cm²
  swayVelocity: number;           // Mean velocity in cm/s
  frequencyPeaks: number[];       // Dominant frequencies in Hz
  stabilityIndex: number;         // Overall stability score (0-1)
  anteriorPosteriorSway: number;  // AP sway amplitude
  medioLateralSway: number;       // ML sway amplitude
  stabilogramDiffusion?: StabilogramDiffusion; // Optional for now
}

export interface StabilogramDiffusion {
  shortTermSlope: number;   // Short-term diffusion slope
  longTermSlope: number;    // Long-term diffusion slope
  criticalPoint: number;    // Transition point between regions
  diffusionCoefficient: number; // Overall diffusion measure
}

// Sensory integration assessment
export interface SensoryWeights {
  visual: number;        // Weight of visual input (0-1)
  proprioceptive: number; // Weight of proprioceptive input (0-1)
  vestibular: number;    // Weight of vestibular input (0-1)
  confidence: number;    // Confidence in the assessment (0-1)
}

// IMU data structure for feature extraction
export interface IMUData {
  timestamp: number;
  roll: number;
  pitch: number;
  yaw: number;
  accel: Vector3D;
  gyro: Vector3D;
}

// Frequency domain analysis
export interface FrequencyAnalysis {
  frequencies: number[];    // Frequency bins
  magnitudes: number[];    // Magnitude at each frequency
  dominantFreq: number;    // Primary oscillation frequency
  spectralCentroid: number; // Center of mass of spectrum
  powerSpectralDensity: number[]; // PSD values
}

// Kalman filter state for optimal estimation
export interface OptimalEstimate {
  orientation: EulerAngles;
  angularVelocity: Vector3D;
  confidence: number;
  timestamp: number;
}

// Real-time processing insights
export interface RealTimeInsights {
  currentStability: number;        // Current stability score (0-1)
  breathingQuality: number;        // Current breathing quality (0-1)
  postureAlert: PostureAlert | null; // Any posture alerts
  exerciseProgress: ExerciseProgress; // Exercise progress metrics
  recommendations: string[];       // Real-time recommendations
  confidence: number;             // Confidence in current analysis (0-1)
  timestamp: number;              // When insights were generated
}

export interface PostureAlert {
  type: 'excessive_sway' | 'poor_balance' | 'fall_risk' | 'asymmetric_posture';
  severity: 'low' | 'medium' | 'high';
  message: string;
  timestamp: number;
}

export interface ExerciseProgress {
  duration: number;               // Current exercise duration in seconds
  qualityScore: number;          // Overall exercise quality (0-1)
  completionPercentage: number;  // Exercise completion (0-100)
  targetMet: boolean;            // Whether target is being met
  phase?: 'warmup' | 'active' | 'cooldown' | 'complete'; // Optional for now
}

// Processing performance metrics
export interface ProcessingMetrics {
  bufferUtilization: number;     // How full the buffer is (0-1)
  processingLatency: number;     // Processing time in ms
  dataQuality: number;          // Quality of incoming data (0-1)
  samplingRate: number;         // Actual sampling rate
  memoryUsage?: number;         // Memory usage in MB - optional for now
}

// Enhanced exercise session with Phase 2 features
export interface EnhancedExerciseSession extends ExerciseSessionSummary {
  advancedMetrics: {
    signalProcessing: {
      kalmanFilterPerformance: number;
      complementaryFilterStability: number;
      signalToNoiseRatio: number;
    };
    vestibularAnalysis: {
      rombergRatio: number;
      sensoryWeights: SensoryWeights;
      stabilogramDiffusion: StabilogramDiffusion;
    };
    realTimePerformance: {
      averageProcessingLatency: number;
      dataQualityScore: number;
      alertsGenerated: number;
    };
  };
  rawFeatureData?: {
    respiratory: RespiratoryMetrics[];
    postural: PosturalFeatures[];
    realTimeInsights: RealTimeInsights[];
  };
}

// Phase 3: Additional ML Model Types

export interface MLModelMetrics {
  accuracy: number;
  loss: number;
  trainingTime: number;
  modelSize: number;
  inferenceTime: number;
}

export interface SymptomPrediction {
  vertigo: number;        // 0-1 probability
  imbalance: number;      // 0-1 probability
  nausea: number;         // 0-1 probability
  confidence: number;
}

export interface ModelPrediction {
  fallRisk: FallRiskAssessment;
  exerciseQuality: ExerciseQualityScore;
  symptomPrediction: SymptomPrediction;
  confidence: number;
  processingTime: number;
} 