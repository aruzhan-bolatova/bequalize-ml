/**
 * Test/Retest Manager for Bequalize Belt
 * Manages pre/post exercise confidence ellipse area analysis and longitudinal tracking
 * Based on research data: normal sway area ~0.01-0.02 m² (10-20 cm²), vestibular pathology >0.05 m²
 */

import { SensorDataPacket, PosturalFeatures, ExerciseType } from '../types/SensorData';
import { VestibularFeatureExtractor } from '../algorithms/VestibularFeatureExtractor';
import { LocalStorageService } from './LocalStorageService';

export interface SwayDataPoint {
  x: number; // mm displacement
  y: number; // mm displacement
  timestamp: number;
}

export interface ConfidenceEllipse {
  centerX: number;
  centerY: number;
  semiAxisA: number; // mm
  semiAxisB: number; // mm
  rotation: number; // radians
  area: number; // cm²
}

export interface TestSession {
  sessionId: string;
  userId: string;
  exerciseType: ExerciseType;
  condition: string;
  testType: 'pre' | 'post';
  timestamp: number;
  duration: number; // in seconds
  sensorData: SensorDataPacket[];
  posturalFeatures: PosturalFeatures;
  confidenceEllipseArea: number; // in cm²
  confidenceEllipse: ConfidenceEllipse;
  swayPath: SwayDataPoint[];
  normalizedEllipseArea: number; // relative to normal values
  rawIMUData: any[];
}

export interface SessionComparison {
  preSession: TestSession;
  postSession: TestSession;
  ellipseAreaChange: number; // in cm²
  percentageChange: number; // percentage improvement/deterioration
  improvementCategory: 'significant_improvement' | 'improvement' | 'stable' | 'deterioration' | 'significant_deterioration';
  clinicalInterpretation: string;
  recommendations: string[];
  timestamp: number;
}

export interface LongitudinalProgress {
  userId: string;
  sessions: TestSession[];
  comparisons: SessionComparison[];
  trends: {
    overallTrend: 'improving' | 'stable' | 'declining';
    averageEllipseArea: number;
    bestSession: TestSession;
    worstSession: TestSession;
    progressScore: number; // 0-100
  };
  insights: string[];
}

export class TestRetestManager {
  private featureExtractor: VestibularFeatureExtractor;
  private storageService: LocalStorageService;
  private readonly STORAGE_KEY = 'bequalize_test_sessions';
  private readonly COMPARISON_KEY = 'bequalize_session_comparisons';
  
  // Clinical thresholds based on research data
  private readonly NORMAL_ELLIPSE_AREA_MIN = 10; // cm² (0.001 m²)
  private readonly NORMAL_ELLIPSE_AREA_MAX = 20; // cm² (0.002 m²)
  private readonly PATHOLOGICAL_THRESHOLD = 50; // cm² (0.005 m²)
  private readonly SIGNIFICANT_CHANGE_THRESHOLD = 25; // % change
  
  constructor() {
    this.featureExtractor = new VestibularFeatureExtractor();
    this.storageService = new LocalStorageService();
  }

  /**
   * Start a new test session (pre or post exercise)
   */
  public async startTestSession(
    userId: string,
    exerciseType: ExerciseType,
    condition: string,
    testType: 'pre' | 'post'
  ): Promise<string> {
    const sessionId = `${Date.now()}_${testType}_${exerciseType}`;
    
    console.log(`🧪 Starting ${testType}-exercise test session for ${exerciseType}`);
    
    return sessionId;
  }

  /**
   * Complete a test session with collected sensor data
   */
  public async completeTestSession(
    sessionId: string,
    userId: string,
    exerciseType: ExerciseType,
    condition: string,
    testType: 'pre' | 'post',
    sensorData: SensorDataPacket[],
    duration: number
  ): Promise<TestSession> {
    
    // Convert sensor data to IMU format for feature extraction
    const imuData = sensorData.map(packet => ({
      timestamp: packet.timestamp,
      roll: Math.atan2(packet.accelerometer.y, packet.accelerometer.z) * (180 / Math.PI),
      pitch: Math.atan2(-packet.accelerometer.x, 
        Math.sqrt(packet.accelerometer.y * packet.accelerometer.y + packet.accelerometer.z * packet.accelerometer.z)
      ) * (180 / Math.PI),
      yaw: 0,
      accel: packet.accelerometer,
      gyro: packet.gyroscope
    }));

    // Extract postural features including confidence ellipse area
    const posturalFeatures = this.featureExtractor.extractPosturalFeatures(imuData);
    
    // Convert area from internal units to cm² for clinical interpretation
    const confidenceEllipseArea = posturalFeatures.swayArea;
    const normalizedEllipseArea = this.normalizeEllipseArea(confidenceEllipseArea);

    // Generate detailed sway path and confidence ellipse data
    const { swayPath, confidenceEllipse } = this.extractSwayPathAndEllipse(imuData, posturalFeatures);

    const session: TestSession = {
      sessionId,
      userId,
      exerciseType,
      condition,
      testType,
      timestamp: Date.now(),
      duration,
      sensorData,
      posturalFeatures,
      confidenceEllipseArea,
      confidenceEllipse,
      swayPath,
      normalizedEllipseArea,
      rawIMUData: imuData
    };

    // Store session data
    await this.saveTestSession(session);
    
    console.log(`✅ Completed ${testType}-exercise test: Ellipse area = ${confidenceEllipseArea.toFixed(2)} cm²`);
    
    return session;
  }

  /**
   * Compare pre and post exercise sessions
   */
  public async comparePrePostSessions(
    preSessionId: string,
    postSessionId: string
  ): Promise<SessionComparison> {
    
    const preSession = await this.getTestSession(preSessionId);
    const postSession = await this.getTestSession(postSessionId);
    
    if (!preSession || !postSession) {
      throw new Error('Sessions not found for comparison');
    }

    // Calculate changes
    const ellipseAreaChange = postSession.confidenceEllipseArea - preSession.confidenceEllipseArea;
    const percentageChange = (ellipseAreaChange / preSession.confidenceEllipseArea) * 100;
    
    // Categorize improvement
    const improvementCategory = this.categorizeImprovement(percentageChange);
    
    // Generate clinical interpretation
    const clinicalInterpretation = this.generateClinicalInterpretation(
      preSession, postSession, ellipseAreaChange, percentageChange
    );
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      preSession, postSession, improvementCategory
    );

    const comparison: SessionComparison = {
      preSession,
      postSession,
      ellipseAreaChange,
      percentageChange,
      improvementCategory,
      clinicalInterpretation,
      recommendations,
      timestamp: Date.now()
    };

    // Store comparison
    await this.saveSessionComparison(comparison);
    
    return comparison;
  }

  /**
   * Get longitudinal progress for a user
   */
  public async getLongitudinalProgress(userId: string): Promise<LongitudinalProgress> {
    const sessions = await this.getUserSessions(userId);
    const comparisons = await this.getUserComparisons(userId);
    
    if (sessions.length === 0) {
      throw new Error('No sessions found for user');
    }

    // Calculate trends
    const trends = this.calculateTrends(sessions);
    
    // Generate insights
    const insights = this.generateLongitudinalInsights(sessions, comparisons, trends);

    return {
      userId,
      sessions,
      comparisons,
      trends,
      insights
    };
  }

  /**
   * Normalize ellipse area relative to normal values
   */
  private normalizeEllipseArea(area: number): number {
    const normalMean = (this.NORMAL_ELLIPSE_AREA_MIN + this.NORMAL_ELLIPSE_AREA_MAX) / 2;
    return area / normalMean;
  }

  /**
   * Categorize improvement based on percentage change
   */
  private categorizeImprovement(percentageChange: number): 'significant_improvement' | 'improvement' | 'stable' | 'deterioration' | 'significant_deterioration' {
    if (percentageChange <= -this.SIGNIFICANT_CHANGE_THRESHOLD) {
      return 'significant_improvement'; // Reduction in sway area is improvement
    } else if (percentageChange <= -10) {
      return 'improvement';
    } else if (percentageChange >= this.SIGNIFICANT_CHANGE_THRESHOLD) {
      return 'significant_deterioration'; // Increase in sway area is deterioration
    } else if (percentageChange >= 10) {
      return 'deterioration';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate clinical interpretation of results
   */
  private generateClinicalInterpretation(
    preSession: TestSession,
    postSession: TestSession,
    change: number,
    percentageChange: number
  ): string {
    const preArea = preSession.confidenceEllipseArea;
    const postArea = postSession.confidenceEllipseArea;
    
    let interpretation = `Pre-exercise sway area: ${preArea.toFixed(1)} cm². Post-exercise: ${postArea.toFixed(1)} cm². `;
    
    if (change < 0) {
      interpretation += `Reduction of ${Math.abs(change).toFixed(1)} cm² (${Math.abs(percentageChange).toFixed(1)}% improvement). `;
    } else {
      interpretation += `Increase of ${change.toFixed(1)} cm² (${percentageChange.toFixed(1)}% deterioration). `;
    }
    
    // Clinical context based on research norms
    if (postArea <= this.NORMAL_ELLIPSE_AREA_MAX) {
      interpretation += 'Post-exercise values are within normal range for healthy adults.';
    } else if (postArea <= this.PATHOLOGICAL_THRESHOLD) {
      interpretation += 'Post-exercise values suggest mild balance impairment.';
    } else {
      interpretation += 'Post-exercise values indicate significant balance impairment requiring attention.';
    }
    
    return interpretation;
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(
    preSession: TestSession,
    postSession: TestSession,
    category: string
  ): string[] {
    const recommendations: string[] = [];
    
    switch (category) {
      case 'significant_improvement':
        recommendations.push('Excellent progress! Continue with current exercise protocol.');
        recommendations.push('Consider progressing to more challenging balance exercises.');
        break;
        
      case 'improvement':
        recommendations.push('Good improvement shown. Maintain consistency with exercises.');
        recommendations.push('Monitor progress with regular assessments.');
        break;
        
      case 'stable':
        recommendations.push('Balance stability maintained. Continue current protocol.');
        recommendations.push('Consider exercise intensity adjustments if targeting improvement.');
        break;
        
      case 'deterioration':
        recommendations.push('Some decline in balance stability observed.');
        recommendations.push('Review exercise technique and consider modifications.');
        recommendations.push('Monitor fatigue levels and ensure adequate rest.');
        break;
        
      case 'significant_deterioration':
        recommendations.push('Significant decline in balance stability requires attention.');
        recommendations.push('Consider consulting with healthcare provider.');
        recommendations.push('Review exercise protocol and potential underlying factors.');
        break;
    }
    
    // Add area-specific recommendations
    if (postSession.confidenceEllipseArea > this.PATHOLOGICAL_THRESHOLD) {
      recommendations.push('Consider fall prevention strategies and environmental modifications.');
    }
    
    return recommendations;
  }

  /**
   * Calculate trends from session history
   */
  private calculateTrends(sessions: TestSession[]): any {
    if (sessions.length === 0) {
      return {
        overallTrend: 'stable' as const,
        averageEllipseArea: 0,
        bestSession: null,
        worstSession: null,
        progressScore: 50
      };
    }

    const ellipseAreas = sessions.map(s => s.confidenceEllipseArea);
    const averageEllipseArea = ellipseAreas.reduce((sum, area) => sum + area, 0) / ellipseAreas.length;
    
    // Find best (lowest) and worst (highest) sway areas
    const bestSession = sessions.reduce((best, current) => 
      current.confidenceEllipseArea < best.confidenceEllipseArea ? current : best
    );
    
    const worstSession = sessions.reduce((worst, current) => 
      current.confidenceEllipseArea > worst.confidenceEllipseArea ? current : worst
    );
    
    // Calculate overall trend
    let overallTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (sessions.length >= 3) {
      const recentAvg = ellipseAreas.slice(-3).reduce((sum, area) => sum + area, 0) / 3;
      const olderAvg = ellipseAreas.slice(0, 3).reduce((sum, area) => sum + area, 0) / 3;
      const trendChange = (recentAvg - olderAvg) / olderAvg;
      
      if (trendChange < -0.1) overallTrend = 'improving';
      else if (trendChange > 0.1) overallTrend = 'declining';
    }
    
    // Calculate progress score (0-100, higher is better)
    const normalizedScore = Math.max(0, Math.min(100, 
      100 - (averageEllipseArea / this.NORMAL_ELLIPSE_AREA_MAX) * 50
    ));
    
    return {
      overallTrend,
      averageEllipseArea,
      bestSession,
      worstSession,
      progressScore: Math.round(normalizedScore)
    };
  }

  /**
   * Generate longitudinal insights
   */
  private generateLongitudinalInsights(
    sessions: TestSession[],
    comparisons: SessionComparison[],
    trends: any
  ): string[] {
    const insights: string[] = [];
    
    insights.push(`Analyzed ${sessions.length} test sessions over time period.`);
    insights.push(`Average sway area: ${trends.averageEllipseArea.toFixed(1)} cm².`);
    
    if (trends.overallTrend === 'improving') {
      insights.push('📈 Overall trend shows improvement in balance stability.');
    } else if (trends.overallTrend === 'declining') {
      insights.push('📉 Overall trend shows decline in balance stability - consider protocol review.');
    } else {
      insights.push('📊 Balance stability has remained stable over time.');
    }
    
    insights.push(`Progress score: ${trends.progressScore}/100.`);
    
    // Add exercise-specific insights
    const exerciseTypes = [...new Set(sessions.map(s => s.exerciseType))];
    if (exerciseTypes.length > 1) {
      insights.push(`Tested with ${exerciseTypes.length} different exercise types.`);
    }
    
    return insights;
  }

  /**
   * Storage methods
   */
  private async saveTestSession(session: TestSession): Promise<void> {
    const sessions = await this.getAllTestSessions();
    sessions.push(session);
    await this.storageService.setItem(this.STORAGE_KEY, sessions);
  }

  private async getTestSession(sessionId: string): Promise<TestSession | null> {
    const sessions = await this.getAllTestSessions();
    return sessions.find(s => s.sessionId === sessionId) || null;
  }

  private async getAllTestSessions(): Promise<TestSession[]> {
    const sessions = await this.storageService.getItem<TestSession[]>(this.STORAGE_KEY);
    return sessions || [];
  }

  private async getUserSessions(userId: string): Promise<TestSession[]> {
    const allSessions = await this.getAllTestSessions();
    return allSessions.filter(s => s.userId === userId);
  }

  private async saveSessionComparison(comparison: SessionComparison): Promise<void> {
    const comparisons = await this.getAllComparisons();
    comparisons.push(comparison);
    await this.storageService.setItem(this.COMPARISON_KEY, comparisons);
  }

  private async getAllComparisons(): Promise<SessionComparison[]> {
    const comparisons = await this.storageService.getItem<SessionComparison[]>(this.COMPARISON_KEY);
    return comparisons || [];
  }

  private async getUserComparisons(userId: string): Promise<SessionComparison[]> {
    const allComparisons = await this.getAllComparisons();
    return allComparisons.filter(c => c.preSession.userId === userId);
  }

  /**
   * Extract detailed sway path and confidence ellipse parameters
   */
  private extractSwayPathAndEllipse(imuData: any[], posturalFeatures: PosturalFeatures): { 
    swayPath: SwayDataPoint[], 
    confidenceEllipse: ConfidenceEllipse 
  } {
    // Convert IMU angles to center of pressure displacement
    const DEVICE_HEIGHT_CM = 100; // Approximate height of device from ground
    const ANGLE_TO_MM_FACTOR = DEVICE_HEIGHT_CM * Math.PI / 180 * 10; // Convert degrees to mm

    const swayPath: SwayDataPoint[] = imuData.map(data => ({
      x: data.roll * ANGLE_TO_MM_FACTOR,
      y: data.pitch * ANGLE_TO_MM_FACTOR,
      timestamp: data.timestamp
    }));

    // Calculate confidence ellipse parameters
    const xValues = swayPath.map(p => p.x);
    const yValues = swayPath.map(p => p.y);
    
    const meanX = xValues.reduce((sum, x) => sum + x, 0) / xValues.length;
    const meanY = yValues.reduce((sum, y) => sum + y, 0) / yValues.length;

    // Calculate covariance matrix
    let sumXX = 0, sumYY = 0, sumXY = 0;
    for (let i = 0; i < xValues.length; i++) {
      const dx = xValues[i] - meanX;
      const dy = yValues[i] - meanY;
      sumXX += dx * dx;
      sumYY += dy * dy;
      sumXY += dx * dy;
    }

    const n = xValues.length;
    const covXX = sumXX / (n - 1);
    const covYY = sumYY / (n - 1);
    const covXY = sumXY / (n - 1);

    // Calculate eigenvalues and eigenvectors for ellipse parameters
    const trace = covXX + covYY;
    const det = covXX * covYY - covXY * covXY;
    const discriminant = Math.max(0, trace * trace - 4 * det); // Ensure non-negative
    const lambda1 = (trace + Math.sqrt(discriminant)) / 2;
    const lambda2 = (trace - Math.sqrt(discriminant)) / 2;

    // 95% confidence ellipse scaling
    const chiSquared95 = 5.991;
    const semiAxisA = Math.sqrt(Math.max(0, lambda1 * chiSquared95));
    const semiAxisB = Math.sqrt(Math.max(0, lambda2 * chiSquared95));

    // Calculate rotation angle
    const rotation = Math.abs(covXY) < 1e-6 ? 0 : Math.atan2(2 * covXY, covXX - covYY) / 2;

    const confidenceEllipse: ConfidenceEllipse = {
      centerX: meanX,
      centerY: meanY,
      semiAxisA,
      semiAxisB,
      rotation,
      area: posturalFeatures.swayArea // Use the calculated area from feature extractor
    };

    return { swayPath, confidenceEllipse };
  }
} 