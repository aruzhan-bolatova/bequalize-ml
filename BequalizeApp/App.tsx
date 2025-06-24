/**
 * Bequalize Belt - Main App Component
 * Integrates mock Bluetooth manager, sensor data display, and local storage
 * Based on the documentation requirements
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
  Button,
  Alert,
  StatusBar,
} from 'react-native';

import { SensorDataPacket, ExerciseSessionSummary, VestibularCondition, ExerciseType } from './src/types/SensorData';
import { mockBluetoothManager } from './src/services/EnhancedMockBluetoothManager';
import { localStorageService } from './src/services/LocalStorageService';
import SensorDataDisplay from './src/components/SensorDataDisplay';

const App: React.FC = () => {
  // State management
  const [isConnected, setIsConnected] = useState(false);
  const [latestPacket, setLatestPacket] = useState<SensorDataPacket | null>(null);
  const [sensorDataBuffer, setSensorDataBuffer] = useState<SensorDataPacket[]>([]);
  const [pastSessions, setPastSessions] = useState<ExerciseSessionSummary[]>([]);
  const [currentExercise, setCurrentExercise] = useState<ExerciseType>('Romberg Test (Eyes Open)');
  const [isExerciseActive, setIsExerciseActive] = useState(false);
  const [exerciseStartTime, setExerciseStartTime] = useState<number | null>(null);

  const MAX_BUFFER_SIZE = 500; // Keep last 500 data points (10 seconds at 50Hz)

  // Data listener for incoming sensor packets
  const dataListener = useCallback((packet: SensorDataPacket) => {
    setLatestPacket(packet);
    
    if (isExerciseActive) {
      setSensorDataBuffer(prevBuffer => {
        const newBuffer = [...prevBuffer, packet];
        // Keep buffer size manageable
        if (newBuffer.length > MAX_BUFFER_SIZE) {
          return newBuffer.slice(-MAX_BUFFER_SIZE);
        }
        return newBuffer;
      });
    }
  }, [isExerciseActive]);

  // Connection listener
  const connectionListener = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  // Connect to mock device
  const handleConnect = async () => {
    try {
      const success = await mockBluetoothManager.connect();
      if (success) {
        Alert.alert('Success', 'Connected to Bequalize Belt (Mock)');
      }
    } catch (error) {
      Alert.alert('Error', `Failed to connect: ${error.message}`);
    }
  };

  // Disconnect from device
  const handleDisconnect = async () => {
    try {
      await mockBluetoothManager.disconnect();
      Alert.alert('Disconnected', 'Disconnected from Bequalize Belt');
      setLatestPacket(null);
      setSensorDataBuffer([]);
      setIsExerciseActive(false);
    } catch (error) {
      Alert.alert('Error', `Failed to disconnect: ${error.message}`);
    }
  };

  // Start exercise session
  const startExercise = () => {
    if (!isConnected) {
      Alert.alert('Error', 'Please connect to the device first');
      return;
    }

    setIsExerciseActive(true);
    setExerciseStartTime(Date.now());
    setSensorDataBuffer([]);
    
    // Start calibration phase
    mockBluetoothManager.startCalibration();
    
    setTimeout(() => {
      mockBluetoothManager.endCalibration();
      Alert.alert('Calibration Complete', 'Exercise session started. Maintain your position and breathe normally.');
    }, 5000); // 5 second calibration

    mockBluetoothManager.setExerciseType(currentExercise);
    console.log(`Started ${currentExercise} exercise`);
  };

  // Stop exercise session and save data
  const stopExercise = async () => {
    if (!isExerciseActive || !exerciseStartTime) {
      return;
    }

    setIsExerciseActive(false);
    const exerciseDuration = (Date.now() - exerciseStartTime) / 1000;

    if (sensorDataBuffer.length === 0) {
      Alert.alert("No data", "No exercise data to save.");
      return;
    }

    // Calculate basic summary statistics
    const summary = calculateExerciseSummary(sensorDataBuffer, exerciseDuration);
    
    try {
      await localStorageService.saveSession({
        exerciseType: currentExercise,
        durationSeconds: exerciseDuration,
        summaryData: summary
      });
      
      Alert.alert("Success", "Exercise session saved!");
      
      // Reload sessions to update the history view
      const loadedSessions = await localStorageService.loadSessions();
      setPastSessions(loadedSessions);
      
      // Clear the buffer
      setSensorDataBuffer([]);
    } catch (error) {
      Alert.alert("Error", `Failed to save session: ${error.message}`);
    }
  };

  // Calculate exercise summary from sensor data
  const calculateExerciseSummary = (data: SensorDataPacket[], duration: number) => {
    // Basic postural analysis
    const accelerometerData = data.map(packet => packet.accelerometer);
    const gyroscopeData = data.map(packet => packet.gyroscope);
    const elastometerData = data.map(packet => packet.elastometer_value);
    const temperatureData = data.map(packet => packet.temperature_celsius);

    // Calculate simple roll and pitch from accelerometer
    const rollAngles = accelerometerData.map(acc => 
      Math.atan2(acc.y, acc.z) * 180 / Math.PI
    );
    const pitchAngles = accelerometerData.map(acc => 
      Math.atan2(-acc.x, Math.sqrt(acc.y * acc.y + acc.z * acc.z)) * 180 / Math.PI
    );

    // Calculate basic respiratory metrics
    const avgElastometer = elastometerData.reduce((sum, val) => sum + val, 0) / elastometerData.length;
    const maxElastometer = Math.max(...elastometerData);
    const minElastometer = Math.min(...elastometerData);
    const breathingAmplitude = maxElastometer - minElastometer;

    // Estimate breathing rate (very basic peak counting)
    let breathCount = 0;
    for (let i = 1; i < elastometerData.length - 1; i++) {
      if (elastometerData[i] > elastometerData[i-1] && 
          elastometerData[i] > elastometerData[i+1] && 
          elastometerData[i] > avgElastometer + breathingAmplitude * 0.3) {
        breathCount++;
      }
    }
    const avgBPM = (breathCount / duration) * 60;

    return {
      posture: {
        avgPitch: rollAngles.reduce((sum, val) => sum + val, 0) / rollAngles.length,
        stdDevPitch: Math.sqrt(rollAngles.reduce((sum, val) => sum + Math.pow(val - rollAngles.reduce((s, v) => s + v, 0) / rollAngles.length, 2), 0) / rollAngles.length),
        avgRoll: pitchAngles.reduce((sum, val) => sum + val, 0) / pitchAngles.length,
        stdDevRoll: Math.sqrt(pitchAngles.reduce((sum, val) => sum + Math.pow(val - pitchAngles.reduce((s, v) => s + v, 0) / pitchAngles.length, 2), 0) / pitchAngles.length),
        swayAreaCm2: Math.max(0.1, Math.abs(rollAngles.reduce((sum, val) => sum + Math.abs(val), 0) / rollAngles.length * 0.1))
      },
      respiration: {
        avgBPM: Math.max(5, Math.min(30, avgBPM || 15)),
        avgAmplitude: breathingAmplitude,
        avgIERatio: 0.6, // Default I:E ratio
        maxAmplitude: maxElastometer
      },
      temperature: {
        avgCelsius: temperatureData.reduce((sum, val) => sum + val, 0) / temperatureData.length,
        maxCelsius: Math.max(...temperatureData)
      }
    };
  };

  // Change vestibular condition simulation
  const changeVestibularCondition = (condition: VestibularCondition) => {
    mockBluetoothManager.setVestibularCondition(condition);
    Alert.alert('Simulation', `Now simulating ${condition} condition`);
  };

  // Load past sessions on app start
  useEffect(() => {
    const loadInitialSessions = async () => {
      try {
        const loadedSessions = await localStorageService.loadSessions();
        setPastSessions(loadedSessions);
      } catch (error) {
        console.error("Failed to load initial sessions:", error);
      }
    };
    loadInitialSessions();
  }, []);

  // Set up listeners
  useEffect(() => {
    mockBluetoothManager.addDataListener(dataListener);
    mockBluetoothManager.addConnectionListener(connectionListener);
    setIsConnected(mockBluetoothManager.getIsConnected());

    return () => {
      mockBluetoothManager.removeDataListener(dataListener);
      mockBluetoothManager.removeConnectionListener(connectionListener);
    };
  }, [dataListener, connectionListener]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f0f0" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Bequalize Belt</Text>
        <Text style={styles.subtitle}>Vestibular Health Monitoring</Text>
        
        <Text style={styles.status}>
          Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
        </Text>

        {/* Connection Controls */}
        <View style={styles.buttonContainer}>
          <Button
            title={isConnected ? 'Disconnect Device' : 'Connect Device'}
            onPress={isConnected ? handleDisconnect : handleConnect}
            color={isConnected ? '#f44336' : '#4CAF50'}
          />
        </View>

        {/* Exercise Controls */}
        {isConnected && (
          <View style={styles.exerciseControls}>
            <Text style={styles.exerciseTitle}>Current Exercise: {currentExercise}</Text>
            <View style={styles.buttonRow}>
              <Button
                title={isExerciseActive ? 'Stop Exercise' : 'Start Exercise'}
                onPress={isExerciseActive ? stopExercise : startExercise}
                color={isExerciseActive ? '#ff5722' : '#2196F3'}
              />
            </View>
            {isExerciseActive && (
              <Text style={styles.exerciseStatus}>
                🔴 Recording... ({sensorDataBuffer.length} data points)
              </Text>
            )}
          </View>
        )}

        {/* Sensor Data Display */}
        <SensorDataDisplay packet={latestPacket} />

        {/* Simulation Controls */}
        {isConnected && (
          <View style={styles.simulationControls}>
            <Text style={styles.sectionTitle}>Simulation Controls</Text>
            <View style={styles.buttonRow}>
              <Button title="Healthy" onPress={() => changeVestibularCondition('Healthy Control')} />
              <Button title="BPPV" onPress={() => changeVestibularCondition('BPPV')} />
            </View>
            <View style={styles.buttonRow}>
              <Button title="UVH" onPress={() => changeVestibularCondition('Unilateral Vestibular Hypofunction')} />
              <Button title="BVL" onPress={() => changeVestibularCondition('Bilateral Vestibular Loss')} />
            </View>
          </View>
        )}

        {/* Past Sessions */}
        <View style={styles.historySection}>
          <Text style={styles.historyHeader}>Past Sessions ({pastSessions.length})</Text>
          {pastSessions.length > 0 ? (
            pastSessions.slice(0, 5).map((session) => (
              <View key={session.sessionId} style={styles.sessionItem}>
                <Text style={styles.sessionText}>📋 {session.exerciseType}</Text>
                <Text style={styles.sessionText}>📅 {new Date(session.timestamp).toLocaleDateString()}</Text>
                <Text style={styles.sessionText}>⏱️ {Math.round(session.durationSeconds)}s</Text>
                <Text style={styles.sessionText}>
                  💨 {session.summaryData.respiration.avgBPM.toFixed(1)} BPM
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.noDataText}>No past sessions saved.</Text>
          )}
        </View>

        {!isConnected && (
          <Text style={styles.infoText}>
            Connect to your Bequalize Belt to start monitoring your vestibular health.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f0f0',
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  status: {
    fontSize: 18,
    marginBottom: 20,
    color: '#555',
    textAlign: 'center',
  },
  buttonContainer: {
    width: '80%',
    marginVertical: 10,
  },
  exerciseControls: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  exerciseTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 5,
  },
  exerciseStatus: {
    fontSize: 14,
    color: '#f44336',
    textAlign: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  simulationControls: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  historySection: {
    width: '100%',
    marginTop: 20,
  },
  historyHeader: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  sessionItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 3,
  },
  sessionText: {
    fontSize: 14,
    color: '#444',
    marginVertical: 1,
  },
  noDataText: {
    fontSize: 16,
    color: '#888',
    padding: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 16,
    color: '#888',
    marginTop: 30,
    textAlign: 'center',
    paddingHorizontal: 20,
    lineHeight: 24,
  },
});

export default App; 