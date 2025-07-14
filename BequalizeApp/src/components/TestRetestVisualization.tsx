/**
 * Test/Retest Visualization Component for Bequalize Belt
 * Displays confidence ellipse area changes, progress insights, and longitudinal data
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import { TestSession, SessionComparison, LongitudinalProgress } from '../services/TestRetestManager';
import PosturalSwayVisualization from './PosturalSwayVisualization';

interface TestRetestVisualizationProps {
  comparison?: SessionComparison;
  longitudinalProgress?: LongitudinalProgress;
  showDetailedAnalysis?: boolean;
  showSwayVisualization?: boolean;
}

const TestRetestVisualization: React.FC<TestRetestVisualizationProps> = ({
  comparison,
  longitudinalProgress,
  showDetailedAnalysis = true,
  showSwayVisualization = true
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 40;

  const renderComparisonChart = () => {
    if (!comparison) return null;

    const data = {
      labels: ['Pre-Exercise', 'Post-Exercise'],
      datasets: [{
        data: [
          comparison.preSession.confidenceEllipseArea,
          comparison.postSession.confidenceEllipseArea
        ],
        color: (opacity = 1) => `rgba(134, 65, 244, ${opacity})`,
        strokeWidth: 3
      }]
    };

    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#f8f9fa',
      backgroundGradientTo: '#e9ecef',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(13, 110, 253, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(33, 37, 41, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '6',
        strokeWidth: '2',
        stroke: '#495057'
      }
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Confidence Ellipse Area Comparison</Text>
        <LineChart
          data={data}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
        <Text style={styles.chartSubtitle}>
          Lower values indicate better balance stability
        </Text>
      </View>
    );
  };

  const renderLongitudinalChart = () => {
    if (!longitudinalProgress || longitudinalProgress.sessions.length < 3) return null;

    // Prepare data for longitudinal view
    const sessions = longitudinalProgress.sessions.slice(-10); // Last 10 sessions
    const labels = sessions.map((_, index) => `S${index + 1}`);
    const ellipseAreas = sessions.map(s => s.confidenceEllipseArea);

    const data = {
      labels,
      datasets: [{
        data: ellipseAreas,
        color: (opacity = 1) => `rgba(255, 99, 132, ${opacity})`,
        strokeWidth: 3
      }]
    };

    const chartConfig = {
      backgroundColor: '#ffffff',
      backgroundGradientFrom: '#fff5f5',
      backgroundGradientTo: '#fed7d7',
      decimalPlaces: 1,
      color: (opacity = 1) => `rgba(220, 38, 127, ${opacity})`,
      labelColor: (opacity = 1) => `rgba(33, 37, 41, ${opacity})`,
      style: {
        borderRadius: 16,
      },
      propsForDots: {
        r: '4',
        strokeWidth: '2',
        stroke: '#d63384'
      }
    };

    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Progress Over Time</Text>
        <LineChart
          data={data}
          width={chartWidth}
          height={220}
          chartConfig={chartConfig}
          bezier
          style={styles.chart}
        />
        <Text style={styles.chartSubtitle}>
          Recent sessions showing balance stability trend
        </Text>
      </View>
    );
  };

  const renderNormalRangeIndicator = () => {
    const normalMin = 10; // cm²
    const normalMax = 20; // cm²
    const pathologicalThreshold = 50; // cm²

    return (
      <View style={styles.normalRangeContainer}>
        <Text style={styles.normalRangeTitle}>Clinical Reference Ranges</Text>
        <View style={styles.rangeIndicator}>
          <View style={[styles.rangeBar, styles.normalRange]}>
            <Text style={styles.rangeText}>Normal: {normalMin}-{normalMax} cm²</Text>
          </View>
                     <View style={[styles.rangeBar, styles.pathologicalRange]}>
             <Text style={styles.rangeText}>Pathological: {'>'}{pathologicalThreshold} cm²</Text>
           </View>
        </View>
      </View>
    );
  };

  const renderComparisonInsights = () => {
    if (!comparison) return null;

    const getImprovementColor = (category: string) => {
      switch (category) {
        case 'significant_improvement': return '#28a745';
        case 'improvement': return '#20c997';
        case 'stable': return '#6c757d';
        case 'deterioration': return '#fd7e14';
        case 'significant_deterioration': return '#dc3545';
        default: return '#6c757d';
      }
    };

    const getImprovementIcon = (category: string) => {
      switch (category) {
        case 'significant_improvement': return '🚀';
        case 'improvement': return '📈';
        case 'stable': return '📊';
        case 'deterioration': return '📉';
        case 'significant_deterioration': return '⚠️';
        default: return '📊';
      }
    };

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Assessment Results</Text>
        
        <View style={[styles.categoryCard, { borderLeftColor: getImprovementColor(comparison.improvementCategory) }]}>
          <Text style={styles.categoryIcon}>{getImprovementIcon(comparison.improvementCategory)}</Text>
          <View style={styles.categoryContent}>
            <Text style={styles.categoryTitle}>
              {comparison.improvementCategory.replace(/_/g, ' ').toUpperCase()}
            </Text>
            <Text style={styles.changeValue}>
              {comparison.ellipseAreaChange > 0 ? '+' : ''}{comparison.ellipseAreaChange.toFixed(1)} cm²
            </Text>
            <Text style={styles.percentageChange}>
              ({comparison.percentageChange > 0 ? '+' : ''}{comparison.percentageChange.toFixed(1)}%)
            </Text>
          </View>
        </View>

        <View style={styles.interpretationCard}>
          <Text style={styles.interpretationTitle}>Clinical Interpretation</Text>
          <Text style={styles.interpretationText}>{comparison.clinicalInterpretation}</Text>
        </View>

        <View style={styles.recommendationsCard}>
          <Text style={styles.recommendationsTitle}>Recommendations</Text>
          {comparison.recommendations.map((rec, index) => (
            <Text key={index} style={styles.recommendationItem}>• {rec}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderLongitudinalInsights = () => {
    if (!longitudinalProgress) return null;

    const trends = longitudinalProgress.trends;
    const getTrendColor = (trend: string) => {
      switch (trend) {
        case 'improving': return '#28a745';
        case 'stable': return '#6c757d';
        case 'declining': return '#dc3545';
        default: return '#6c757d';
      }
    };

    const getTrendIcon = (trend: string) => {
      switch (trend) {
        case 'improving': return '📈';
        case 'stable': return '📊';
        case 'declining': return '📉';
        default: return '📊';
      }
    };

    return (
      <View style={styles.longitudinalContainer}>
        <Text style={styles.longitudinalTitle}>Progress Summary</Text>
        
        <View style={styles.progressGrid}>
          <View style={styles.progressCard}>
            <Text style={styles.progressValue}>{longitudinalProgress.sessions.length}</Text>
            <Text style={styles.progressLabel}>Total Sessions</Text>
          </View>
          
          <View style={styles.progressCard}>
            <Text style={styles.progressValue}>{trends.averageEllipseArea.toFixed(1)}</Text>
            <Text style={styles.progressLabel}>Avg. Sway Area (cm²)</Text>
          </View>
          
          <View style={styles.progressCard}>
            <Text style={[styles.progressValue, { color: getTrendColor(trends.overallTrend) }]}>
              {getTrendIcon(trends.overallTrend)} {trends.overallTrend.toUpperCase()}
            </Text>
            <Text style={styles.progressLabel}>Overall Trend</Text>
          </View>
          
          <View style={styles.progressCard}>
            <Text style={styles.progressValue}>{trends.progressScore}/100</Text>
            <Text style={styles.progressLabel}>Progress Score</Text>
          </View>
        </View>

        <View style={styles.insightsCard}>
          <Text style={styles.insightsCardTitle}>Key Insights</Text>
          {longitudinalProgress.insights.map((insight, index) => (
            <Text key={index} style={styles.insightItem}>• {insight}</Text>
          ))}
        </View>
      </View>
    );
  };

  const renderSessionDetails = () => {
    if (!comparison || !showDetailedAnalysis) return null;

    return (
      <View style={styles.sessionDetailsContainer}>
        <Text style={styles.sessionDetailsTitle}>Session Details</Text>
        
        <View style={styles.sessionRow}>
          <View style={styles.sessionCard}>
            <Text style={styles.sessionType}>PRE-EXERCISE</Text>
            <Text style={styles.sessionDate}>
              {new Date(comparison.preSession.timestamp).toLocaleDateString()}
            </Text>
            <Text style={styles.sessionValue}>
              {comparison.preSession.confidenceEllipseArea.toFixed(1)} cm²
            </Text>
            <Text style={styles.sessionDuration}>
              Duration: {comparison.preSession.duration}s
            </Text>
          </View>

          <View style={styles.sessionArrow}>
            <Text style={styles.arrowText}>→</Text>
          </View>

          <View style={styles.sessionCard}>
            <Text style={styles.sessionType}>POST-EXERCISE</Text>
            <Text style={styles.sessionDate}>
              {new Date(comparison.postSession.timestamp).toLocaleDateString()}
            </Text>
            <Text style={styles.sessionValue}>
              {comparison.postSession.confidenceEllipseArea.toFixed(1)} cm²
            </Text>
            <Text style={styles.sessionDuration}>
              Duration: {comparison.postSession.duration}s
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderSwayVisualization = () => {
    if (!comparison || !showSwayVisualization) return null;

    const { preSession, postSession } = comparison;

    return (
      <View style={styles.swayVisualizationContainer}>
        <Text style={styles.sectionTitle}>Postural Sway Analysis</Text>
        
        
        <View style={styles.swayComparisonRow}>
          <View style={styles.swayVisualizationItem}>
            <PosturalSwayVisualization
              swayPath={preSession.swayPath}
              confidenceEllipse={preSession.confidenceEllipse}
              title="Pre-Exercise"
              showGrid={true}
              highlightExcursions={true}
            />
          </View>
          
          <View style={styles.swayVisualizationItem}>
            <PosturalSwayVisualization
              swayPath={postSession.swayPath}
              confidenceEllipse={postSession.confidenceEllipse}
              title="Post-Exercise"
              showGrid={true}
              highlightExcursions={true}
            />
          </View>
        </View>

        {/* Comparison Summary */}
        <View style={styles.swayComparisonSummary}>
          <Text style={styles.swayComparisonTitle}>Sway Analysis Summary</Text>
          <View style={styles.swayMetricsRow}>
            <View style={styles.swayMetric}>
              <Text style={styles.swayMetricLabel}>Ellipse Area Change</Text>
              <Text style={[
                styles.swayMetricValue,
                { color: comparison.ellipseAreaChange < 0 ? '#28a745' : '#dc3545' }
              ]}>
                {comparison.ellipseAreaChange > 0 ? '+' : ''}{comparison.ellipseAreaChange.toFixed(1)} cm²
              </Text>
            </View>
            <View style={styles.swayMetric}>
              <Text style={styles.swayMetricLabel}>Path Length Change</Text>
                             <Text style={styles.swayMetricValue}>
                 {calculatePathLengthChange(preSession, postSession).toFixed(1)} mm
               </Text>
             </View>
             <View style={styles.swayMetric}>
               <Text style={styles.swayMetricLabel}>Excursion Change</Text>
               <Text style={styles.swayMetricValue}>
                 {calculateExcursionChange(preSession, postSession)}
               </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  // Helper functions for sway analysis
  const calculatePathLengthChange = (preSession: TestSession, postSession: TestSession): number => {
    const calculatePathLength = (swayPath: any[]) => {
      if (swayPath.length < 2) return 0;
      return swayPath.reduce((sum, point, index) => {
        if (index === 0) return 0;
        const prev = swayPath[index - 1];
        const dist = Math.sqrt((point.x - prev.x) ** 2 + (point.y - prev.y) ** 2);
        return sum + dist;
      }, 0);
    };

    const preLength = calculatePathLength(preSession.swayPath);
    const postLength = calculatePathLength(postSession.swayPath);
    return postLength - preLength;
  };

  const calculateExcursionChange = (preSession: TestSession, postSession: TestSession): string => {
    const countExcursions = (swayPath: any[], ellipse: any) => {
      return swayPath.filter(point => {
        const dx = point.x - ellipse.centerX;
        const dy = point.y - ellipse.centerY;
        const cos_rot = Math.cos(-ellipse.rotation);
        const sin_rot = Math.sin(-ellipse.rotation);
        const xRot = dx * cos_rot - dy * sin_rot;
        const yRot = dx * sin_rot + dy * cos_rot;
        
        return (xRot * xRot) / (ellipse.semiAxisA * ellipse.semiAxisA) +
               (yRot * yRot) / (ellipse.semiAxisB * ellipse.semiAxisB) > 1;
      }).length;
    };

    const preExcursions = countExcursions(preSession.swayPath, preSession.confidenceEllipse);
    const postExcursions = countExcursions(postSession.swayPath, postSession.confidenceEllipse);
    const change = postExcursions - preExcursions;
    
    return change > 0 ? `+${change}` : `${change}`;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderNormalRangeIndicator()}
      {renderComparisonChart()}
      {renderComparisonInsights()}
      {renderSwayVisualization()}
      {renderSessionDetails()}
      {renderLongitudinalChart()}
      {renderLongitudinalInsights()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  chartContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
    textAlign: 'center',
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  chartSubtitle: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  normalRangeContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  normalRangeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 12,
  },
  rangeIndicator: {
    flexDirection: 'column',
    gap: 8,
  },
  rangeBar: {
    padding: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  normalRange: {
    backgroundColor: '#d4edda',
  },
  pathologicalRange: {
    backgroundColor: '#f8d7da',
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  insightsContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  insightsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    marginBottom: 16,
  },
  categoryIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  categoryContent: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 4,
  },
  changeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  percentageChange: {
    fontSize: 14,
    color: '#6c757d',
  },
  interpretationCard: {
    backgroundColor: '#e7f1ff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16,
  },
  interpretationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0d47a1',
    marginBottom: 8,
  },
  interpretationText: {
    fontSize: 14,
    color: '#1565c0',
    lineHeight: 20,
  },
  recommendationsCard: {
    backgroundColor: '#fff3cd',
    padding: 16,
    borderRadius: 8,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#856404',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
    marginBottom: 4,
  },
  longitudinalContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  longitudinalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    width: '48%',
    marginBottom: 8,
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    color: '#6c757d',
    textAlign: 'center',
  },
  insightsCard: {
    backgroundColor: '#e8f5e8',
    padding: 16,
    borderRadius: 8,
  },
  insightsCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#155724',
    marginBottom: 8,
  },
  insightItem: {
    fontSize: 14,
    color: '#155724',
    lineHeight: 20,
    marginBottom: 4,
  },
  sessionDetailsContainer: {
    backgroundColor: 'white',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sessionDetailsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 16,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionCard: {
    backgroundColor: '#f8f9fa',
    padding: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
  },
  sessionType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    marginBottom: 8,
  },
  sessionDate: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 8,
  },
  sessionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 4,
  },
  sessionDuration: {
    fontSize: 12,
    color: '#6c757d',
  },
  sessionArrow: {
    marginHorizontal: 16,
  },
  arrowText: {
    fontSize: 24,
    color: '#6c757d',
  },
  swayVisualizationContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  swayComparisonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  swayVisualizationItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  swayComparisonSummary: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  swayComparisonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  swayMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  swayMetric: {
    alignItems: 'center',
    flex: 1,
  },
  swayMetricLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 4,
  },
  swayMetricValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
});

export default TestRetestVisualization; 