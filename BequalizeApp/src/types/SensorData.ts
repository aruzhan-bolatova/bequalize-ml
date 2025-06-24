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
export type VestibularCondition = 
  | 'BPPV'
  | 'Unilateral Vestibular Hypofunction'
  | 'Bilateral Vestibular Loss'
  | 'Vestibular Migraine'
  | 'Meniere Disease'
  | 'Vestibular Neuritis'
  | 'Healthy Control';

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

// Real-time feedback data structures
export interface RealTimeFeedback {
  stability_score: number;
  exercise_quality: number;
  safety_alerts: SafetyAlert[];
  coaching_cues: CoachingCue[];
}

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