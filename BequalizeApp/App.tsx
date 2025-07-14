/**
 * Bequalize Belt - Main App Component
 * Integrates mock Bluetooth manager, sensor data display, and local storage
 * Based on the documentation requirements
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';

// Components
import SensorDataDisplay from './src/components/SensorDataDisplay';
import BalanceTestingTab from './src/components/BalanceTestingTab';
import BreathingExerciseTab from './src/components/BreathingExerciseTab';
import RealTimeMonitoringTab from './src/components/RealTimeMonitoringTab';

// Services
import { EnhancedMockBluetoothManager } from './src/services/EnhancedMockBluetoothManager';
import { LocalStorageService } from './src/services/LocalStorageService';
import { VestibularMLModel } from './src/ml/VestibularMLModel';

// Types
import { SensorDataPacket, ExerciseType } from './src/types/SensorData';

type TabType = 'balance' | 'breathing' | 'monitoring';

const App: React.FC = () => {
  // Core state
  const [isConnected, setIsConnected] = useState(false);
  const [latestPacket, setLatestPacket] = useState<SensorDataPacket | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('balance');

  // ML Model state
  const [isMLModelReady, setIsMLModelReady] = useState(false);
  const [mlModel, setMLModel] = useState<VestibularMLModel | null>(null);

  // Services
  const bluetoothManager = useRef(new EnhancedMockBluetoothManager());
  const storageService = useRef(new LocalStorageService());

  useEffect(() => {
    const initializeServices = async () => {
      try {
                 // Initialize ML Model
         const initializeONNXModel = async () => {
           try {
             const model = new VestibularMLModel();
             await model.initializeModel();
             await model.buildModel();
             setMLModel(model);
             setIsMLModelReady(true);
             console.log('✅ ONNX ML Model initialized successfully');
           } catch (error) {
             console.warn('⚠️ ML Model initialization failed:', error);
             setIsMLModelReady(false);
           }
         };

         await initializeONNXModel();

         // Setup Bluetooth data handler
         const handleSensorData = (packet: SensorDataPacket) => {
           setLatestPacket(packet);
         };

         bluetoothManager.current.addDataListener(handleSensorData);

        // Start connection
        const startConnection = async () => {
          try {
            await bluetoothManager.current.connect();
            setIsConnected(true);
            console.log('Connected to Bequalize Belt');
          } catch (error) {
            console.error('Connection failed:', error);
            setIsConnected(false);
          }
        };

        startConnection();
      } catch (error) {
        console.error('Service initialization failed:', error);
      }
    };

    initializeServices();

    return () => {
      bluetoothManager.current.disconnect();
    };
  }, []);

  const renderTabButton = (tab: TabType, label: string, icon: string) => (
    <TouchableOpacity
      style={[
        styles.tabButton,
        currentTab === tab && styles.activeTabButton
      ]}
      onPress={() => setCurrentTab(tab)}
    >
      <Text style={[
        styles.tabButtonText,
        currentTab === tab && styles.activeTabButtonText
      ]}>
        {icon} {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTabContent = () => {
    switch (currentTab) {
      case 'balance':
        return (
          <BalanceTestingTab
            bluetoothManager={bluetoothManager.current}
            storageService={storageService.current}
            isConnected={isConnected}
            latestPacket={latestPacket}
          />
        );
      case 'breathing':
        return (
          <BreathingExerciseTab
            bluetoothManager={bluetoothManager.current}
            isConnected={isConnected}
            latestPacket={latestPacket}
          />
        );
      case 'monitoring':
        return (
          <RealTimeMonitoringTab
            bluetoothManager={bluetoothManager.current}
            mlModel={mlModel}
            isMLModelReady={isMLModelReady}
            isConnected={isConnected}
            latestPacket={latestPacket}
          />
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Bequalize Belt</Text>
        <Text style={styles.subtitle}>Vestibular Health Monitoring</Text>
        <View style={styles.connectionStatus}>
          <View style={[
            styles.statusIndicator,
            { backgroundColor: isConnected ? '#4CAF50' : '#F44336' }
          ]} />
          <Text style={styles.connectionText}>
            {isConnected ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {renderTabButton('balance', 'Balance Testing', '⚖️')}
        {renderTabButton('breathing', 'Breathing', '🫁')}
        {renderTabButton('monitoring', 'Real-time', '📊')}
      </View>

      {/* Tab Content */}
      <View style={styles.contentContainer}>
        {renderTabContent()}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: '#fff',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 12,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  connectionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#495057',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTabButton: {
    borderBottomColor: '#0d6efd',
    backgroundColor: '#f8f9fa',
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6c757d',
    textAlign: 'center',
  },
  activeTabButtonText: {
    color: '#0d6efd',
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
  },
});

export default App; 