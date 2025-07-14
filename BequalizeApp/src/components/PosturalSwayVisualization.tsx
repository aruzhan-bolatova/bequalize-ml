/**
 * Postural Sway Visualization Component
 * Displays actual sway path with confidence ellipse overlay
 * Shows clear deviations from expected postural control boundaries
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { 
  Circle, 
  Ellipse, 
  Path, 
  Line, 
  Text as SvgText, 
  G, 
  Defs, 
  LinearGradient, 
  Stop 
} from 'react-native-svg';

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

interface PosturalSwayVisualizationProps {
  swayPath: SwayDataPoint[];
  confidenceEllipse: ConfidenceEllipse;
  title?: string;
  showGrid?: boolean;
  showDeviations?: boolean;
  highlightExcursions?: boolean;
}

const PosturalSwayVisualization: React.FC<PosturalSwayVisualizationProps> = ({
  swayPath,
  confidenceEllipse,
  title = "Postural Sway Analysis",
  showGrid = true,
  showDeviations = true,
  highlightExcursions = true
}) => {
  const screenWidth = Dimensions.get('window').width;
  const chartSize = Math.min(screenWidth - 40, 350);
  const margin = 40;
  const plotSize = chartSize - 2 * margin;

  // Calculate data bounds and scaling
  const { bounds, scale, pathData, excursionPoints } = useMemo(() => {
    if (swayPath.length === 0) {
      return { 
        bounds: { minX: -20, maxX: 20, minY: -20, maxY: 20 }, 
        scale: { x: 1, y: 1 }, 
        pathData: '', 
        excursionPoints: [] 
      };
    }

    // Find data bounds
    const xValues = swayPath.map(p => p.x);
    const yValues = swayPath.map(p => p.y);
    const minX = Math.min(...xValues, confidenceEllipse.centerX - confidenceEllipse.semiAxisA);
    const maxX = Math.max(...xValues, confidenceEllipse.centerX + confidenceEllipse.semiAxisA);
    const minY = Math.min(...yValues, confidenceEllipse.centerY - confidenceEllipse.semiAxisB);
    const maxY = Math.max(...yValues, confidenceEllipse.centerY + confidenceEllipse.semiAxisB);

    // Add padding
    const paddingX = (maxX - minX) * 0.1;
    const paddingY = (maxY - minY) * 0.1;
    const bounds = {
      minX: minX - paddingX,
      maxX: maxX + paddingX,
      minY: minY - paddingY,
      maxY: maxY + paddingY
    };

    // Calculate scaling factors
    const scaleX = plotSize / (bounds.maxX - bounds.minX);
    const scaleY = plotSize / (bounds.maxY - bounds.minY);
    const scale = { x: scaleX, y: scaleY };

    // Generate SVG path for sway trajectory
    const pathCommands = swayPath.map((point, index) => {
      const x = margin + (point.x - bounds.minX) * scaleX;
      const y = margin + (bounds.maxY - point.y) * scaleY; // Flip Y axis
      return index === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
    }).join(' ');

    // Find points outside confidence ellipse
    const excursions = swayPath.filter(point => {
      const dx = point.x - confidenceEllipse.centerX;
      const dy = point.y - confidenceEllipse.centerY;
      const cos_rot = Math.cos(-confidenceEllipse.rotation);
      const sin_rot = Math.sin(-confidenceEllipse.rotation);
      const xRot = dx * cos_rot - dy * sin_rot;
      const yRot = dx * sin_rot + dy * cos_rot;
      
      return (xRot * xRot) / (confidenceEllipse.semiAxisA * confidenceEllipse.semiAxisA) +
             (yRot * yRot) / (confidenceEllipse.semiAxisB * confidenceEllipse.semiAxisB) > 1;
    });

    return { bounds, scale, pathData: pathCommands, excursionPoints: excursions };
  }, [swayPath, confidenceEllipse, plotSize, margin]);

  // Convert coordinate to SVG space
  const toSvgX = (x: number) => margin + (x - bounds.minX) * scale.x;
  const toSvgY = (y: number) => margin + (bounds.maxY - y) * scale.y;

  // Generate grid lines
  const generateGrid = () => {
    if (!showGrid) return null;

    const gridLines = [];
    const stepX = 10; // 10mm intervals
    const stepY = 10;

    // Vertical grid lines
    for (let x = Math.ceil(bounds.minX / stepX) * stepX; x <= bounds.maxX; x += stepX) {
      gridLines.push(
        <Line
          key={`vgrid-${x}`}
          x1={toSvgX(x)}
          y1={margin}
          x2={toSvgX(x)}
          y2={chartSize - margin}
          stroke="#e0e0e0"
          strokeWidth="0.5"
        />
      );
    }

    // Horizontal grid lines
    for (let y = Math.ceil(bounds.minY / stepY) * stepY; y <= bounds.maxY; y += stepY) {
      gridLines.push(
        <Line
          key={`hgrid-${y}`}
          x1={margin}
          y1={toSvgY(y)}
          x2={chartSize - margin}
          y2={toSvgY(y)}
          stroke="#e0e0e0"
          strokeWidth="0.5"
        />
      );
    }

    return gridLines;
  };

  // Generate axis labels
  const generateAxisLabels = () => {
    const labels = [];
    const stepX = 10;
    const stepY = 10;

    // X-axis labels
    for (let x = Math.ceil(bounds.minX / stepX) * stepX; x <= bounds.maxX; x += stepX) {
      if (x !== 0) {
        labels.push(
          <SvgText
            key={`xlabel-${x}`}
            x={toSvgX(x)}
            y={chartSize - margin + 15}
            textAnchor="middle"
            fontSize="10"
            fill="#666"
          >
            {x}
          </SvgText>
        );
      }
    }

    // Y-axis labels
    for (let y = Math.ceil(bounds.minY / stepY) * stepY; y <= bounds.maxY; y += stepY) {
      if (y !== 0) {
        labels.push(
          <SvgText
            key={`ylabel-${y}`}
            x={margin - 10}
            y={toSvgY(y) + 3}
            textAnchor="end"
            fontSize="10"
            fill="#666"
          >
            {y}
          </SvgText>
        );
      }
    }

    return labels;
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.chartContainer}>
        <Svg width={chartSize} height={chartSize} style={styles.svg}>
          <Defs>
            <LinearGradient id="ellipseGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor="#2196F3" stopOpacity="0.1" />
              <Stop offset="100%" stopColor="#2196F3" stopOpacity="0.3" />
            </LinearGradient>
          </Defs>

          {/* Grid */}
          {generateGrid()}

          {/* Axes */}
          <Line
            x1={margin}
            y1={toSvgY(0)}
            x2={chartSize - margin}
            y2={toSvgY(0)}
            stroke="#333"
            strokeWidth="1"
          />
          <Line
            x1={toSvgX(0)}
            y1={margin}
            x2={toSvgX(0)}
            y2={chartSize - margin}
            stroke="#333"
            strokeWidth="1"
          />

          {/* Confidence Ellipse */}
          <Ellipse
            cx={toSvgX(confidenceEllipse.centerX)}
            cy={toSvgY(confidenceEllipse.centerY)}
            rx={confidenceEllipse.semiAxisA * scale.x}
            ry={confidenceEllipse.semiAxisB * scale.y}
            transform={`rotate(${confidenceEllipse.rotation * 180 / Math.PI} ${toSvgX(confidenceEllipse.centerX)} ${toSvgY(confidenceEllipse.centerY)})`}
            fill="url(#ellipseGradient)"
            stroke="#2196F3"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Sway Path */}
          {pathData && (
            <Path
              d={pathData}
              fill="none"
              stroke="#333"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Start Point */}
          {swayPath.length > 0 && (
            <Circle
              cx={toSvgX(swayPath[0].x)}
              cy={toSvgY(swayPath[0].y)}
              r="3"
              fill="#4CAF50"
              stroke="#fff"
              strokeWidth="1"
            />
          )}

          {/* End Point */}
          {swayPath.length > 1 && (
            <Circle
              cx={toSvgX(swayPath[swayPath.length - 1].x)}
              cy={toSvgY(swayPath[swayPath.length - 1].y)}
              r="3"
              fill="#F44336"
              stroke="#fff"
              strokeWidth="1"
            />
          )}

          {/* Excursion Points */}
          {highlightExcursions && excursionPoints.map((point, index) => (
            <Circle
              key={`excursion-${index}`}
              cx={toSvgX(point.x)}
              cy={toSvgY(point.y)}
              r="2"
              fill="#FF9800"
              stroke="#fff"
              strokeWidth="0.5"
            />
          ))}

          {/* Center Point */}
          <Circle
            cx={toSvgX(confidenceEllipse.centerX)}
            cy={toSvgY(confidenceEllipse.centerY)}
            r="2"
            fill="#2196F3"
            stroke="#fff"
            strokeWidth="1"
          />

          {/* Axis Labels */}
          {generateAxisLabels()}

          {/* Axis Titles */}
          <SvgText
            x={chartSize / 2}
            y={chartSize - 5}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
            fontWeight="bold"
          >
            Xml (mm)
          </SvgText>
          <SvgText
            x={15}
            y={chartSize / 2}
            textAnchor="middle"
            fontSize="12"
            fill="#333"
            fontWeight="bold"
            transform={`rotate(-90 15 ${chartSize / 2})`}
          >
            Yap (mm)
          </SvgText>
        </Svg>
      </View>

      {/* Legend and Statistics */}
      <View style={styles.legendContainer}>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Start Point</Text>
          <View style={[styles.legendItem, { backgroundColor: '#F44336' }]} />
          <Text style={styles.legendText}>End Point</Text>
        </View>
        <View style={styles.legendRow}>
          <View style={[styles.legendItem, { backgroundColor: '#2196F3', opacity: 0.5 }]} />
          <Text style={styles.legendText}>95% Confidence Ellipse</Text>
          {highlightExcursions && (
            <>
              <View style={[styles.legendItem, { backgroundColor: '#FF9800' }]} />
              <Text style={styles.legendText}>Excursions</Text>
            </>
          )}
        </View>
      </View>

      {/* Statistics */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Ellipse Area</Text>
          <Text style={styles.statValue}>{confidenceEllipse.area.toFixed(1)} cm²</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Path Length</Text>
          <Text style={styles.statValue}>
            {swayPath.length > 1 ? 
              swayPath.reduce((sum, point, index) => {
                if (index === 0) return 0;
                const prev = swayPath[index - 1];
                const dist = Math.sqrt((point.x - prev.x) ** 2 + (point.y - prev.y) ** 2);
                return sum + dist;
              }, 0).toFixed(1) : '0.0'
            } mm
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Excursions</Text>
          <Text style={styles.statValue}>{excursionPoints.length}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  svg: {
    backgroundColor: '#fafafa',
    borderRadius: 8,
  },
  legendContainer: {
    marginBottom: 12,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendItem: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 12,
    color: '#666',
    marginRight: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});

export default PosturalSwayVisualization; 