/**
 * SensorDataDisplay Component
 * Shows the latest numerical values for all sensors
 * Based on the documentation requirements
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SensorDataPacket } from '../types/SensorData';

interface SensorDataDisplayProps {
  packet: SensorDataPacket | null;
}

const SensorDataDisplay: React.FC<SensorDataDisplayProps> = ({ packet }) => {
  if (!packet) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Sensor Data</Text>
        <Text style={styles.noData}>No sensor data available</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Real-Time Sensor Data</Text>
      
      {/* Device Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Device Status</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Timestamp:</Text>
          <Text style={styles.value}>{new Date(packet.timestamp).toLocaleTimeString()}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Battery:</Text>
          <Text style={[styles.value, getBatteryColor(packet.battery_percent)]}>
            {packet.battery_percent}%
          </Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Button State:</Text>
          <Text style={styles.value}>{getButtonStateText(packet.buttons_state)}</Text>
        </View>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Temperature:</Text>
          <Text style={styles.value}>{packet.temperature_celsius}°C</Text>
        </View>
      </View>

      {/* Accelerometer Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Accelerometer (mg)</Text>
        <View style={styles.triAxisContainer}>
          <View style={styles.axisData}>
            <Text style={styles.axisLabel}>X</Text>
            <Text style={styles.axisValue}>{packet.accelerometer.x}</Text>
          </View>
          <View style={styles.axisData}>
            <Text style={styles.axisLabel}>Y</Text>
            <Text style={styles.axisValue}>{packet.accelerometer.y}</Text>
          </View>
          <View style={styles.axisData}>
            <Text style={styles.axisLabel}>Z</Text>
            <Text style={styles.axisValue}>{packet.accelerometer.z}</Text>
          </View>
        </View>
      </View>

      {/* Gyroscope Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gyroscope (°/s)</Text>
        <View style={styles.triAxisContainer}>
          <View style={styles.axisData}>
            <Text style={styles.axisLabel}>X</Text>
            <Text style={styles.axisValue}>{packet.gyroscope.x}</Text>
          </View>
          <View style={styles.axisData}>
            <Text style={styles.axisLabel}>Y</Text>
            <Text style={styles.axisValue}>{packet.gyroscope.y}</Text>
          </View>
          <View style={styles.axisData}>
            <Text style={styles.axisLabel}>Z</Text>
            <Text style={styles.axisValue}>{packet.gyroscope.z}</Text>
          </View>
        </View>
      </View>

      {/* Respiratory Data */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Respiratory Sensor</Text>
        <View style={styles.dataRow}>
          <Text style={styles.label}>Elastometer Value:</Text>
          <Text style={styles.value}>{packet.elastometer_value}</Text>
        </View>
        <View style={styles.respiratoryIndicator}>
          <Text style={styles.respiratoryLabel}>Breathing Phase:</Text>
          <View style={[
            styles.respiratoryBar,
            { width: `${Math.max(0, Math.min(100, ((packet.elastometer_value - 1800) / 500) * 100))}%` }
          ]} />
        </View>
      </View>
    </View>
  );
};

// Helper functions
const getBatteryColor = (batteryLevel: number): object => {
  if (batteryLevel > 50) {
    return { color: '#4CAF50' }; // Green
  } else if (batteryLevel > 20) {
    return { color: '#FF9800' }; // Orange
  } else {
    return { color: '#F44336' }; // Red
  }
};

const getButtonStateText = (state: number): string => {
  switch (state) {
    case 0: return 'None';
    case 1: return 'Button 1';
    case 2: return 'Button 2';
    case 3: return 'Both';
    default: return 'Unknown';
  }
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    margin: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  noData: {
    fontSize: 16,
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#555',
    marginBottom: 8,
  },
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 2,
  },
  label: {
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    textAlign: 'right',
    flex: 1,
  },
  triAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 5,
  },
  axisData: {
    alignItems: 'center',
    flex: 1,
  },
  axisLabel: {
    fontSize: 12,
    color: '#888',
    marginBottom: 2,
  },
  axisValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  respiratoryIndicator: {
    marginTop: 8,
  },
  respiratoryLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  respiratoryBar: {
    height: 8,
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    minWidth: 20,
  },
});

export default SensorDataDisplay; 