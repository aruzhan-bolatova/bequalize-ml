## **Posture and Respiration Bequalise Belt App Development Guide**

This comprehensive guide provides an overview of sensors, algorithms, data formats, mocking techniques, app architecture, and data visualization for your mobile application.

### **1\. Sensor Descriptions and Usage**

Your device is equipped with key sensors that enable detailed monitoring of posture and respiration, with added temperature sensing for broader physiological context.

* **Elastometer:**  
  * **Description:** A stretch or deformation sensor.  
  * **Usage:** Crucial for **respiration measurement**, detecting chest/abdominal expansion and contraction during inhalation and exhalation when positioned correctly. It can also provide insights into specific body movements or deformations.  
* **Giroscopio:**  
  * **Description:** Measures angular velocity around its axes (X, Y, Z).  
  * **Usage:** Fundamental for **dynamic posturography**, detecting body rotations and inclinations (e.g., trunk tilt, head rotation). It helps understand the speed with which the body moves or oscillates.  
* **Accelerometro:**  
  * **Description:** Measures linear acceleration along its axes (X, Y, Z), including gravitational acceleration.  
  * **Usage:**  
    * **Static Posturography:** Allows calculating the device's static orientation relative to gravity to estimate body inclination angles.  
    * **Dynamic Posturography:** Detects rapid movements, center of mass oscillations, and shifts.  
    * **Event Detection:** Useful for identifying abrupt movements or falls, enhancing safety during exercises.  
* **Pulsanti:**  
  * **Description:** Physical elements for user interaction on the device.  
  * **Usage:** Control the app and device (e.g., start/stop session, mark specific events like "start deep breath," calibration).  
* **Gestione Stato Batteria:**  
  * **Description:** Integrated functionality to monitor the device's charge level.  
  * **Usage:** Essential for app reliability and usability, providing the user with information about the device's remaining operating time.  
* **Termometro:**  
  * **Description:** A sensor for temperature measurement.  
  * **Usage:**  
    * **Monitoraggio Fisiologico:** Track body temperature (if skin-contact) or ambient temperature, useful for evaluating physiological response to exercises or environmental conditions.  
    * **Correzione Dati:** Could be used to compensate for IMU sensor or elastometer drifts that may be influenced by temperature.

### **2\. Algorithms and Data Processing**

Processing raw sensor data into meaningful information requires specific algorithms.

**IMPORTANT\!: at the beginning of every exercise consider a calibration phase to store the default data needed to calculate the differences**

#### **For Posturography (WE CAN START WITH THESE @VIVI suggest others if they are more meaningful)**

The goal here is to estimate orientation and quantify body oscillations.

* **Sensor Fusion (Gyroscope \+ Accelerometer):**  
  * **Complementary Filter:** An efficient and simple algorithm to combine accelerometer data (accurate for long-term orientation) and gyroscope data (accurate for rapid, short-term movements). The output is a stable estimate of the device's **Roll** (sideways rotation) and **Pitch** (forward/backward tilt) angles.  
  * **Kalman Filter:** A more advanced and robust optimal estimation algorithm that provides more precise and stable orientation estimates by handling sensor noise and uncertainties better. Although more complex to implement, it generally yields superior results, especially in dynamic conditions.  
  * **Output:** Generally **Euler Angles** (Roll, Pitch, Yaw) or **Quaternions** (more robust for avoiding Gimbal Lock) describing the device's 3D orientation.  
* **Postural Oscillation Analysis (Sway Analysis):**  
  * **Basic Statistics:** Calculation of the **mean, standard deviation, and range** of Roll and Pitch angles to quantify oscillation amplitude.  
  * **Time-Domain Analysis:** Graphical representation of angles over time to visualize sway patterns and their evolution.  
  * **Frequency-Domain Analysis (FFT \- Fast Fourier Transform):** Applying FFT to the angular data to identify the **predominant oscillation frequencies**. This can indicate different postural control mechanisms or dysfunctions.  
  * **Confidence Ellipse Area:** If the device is positioned to estimate the center of pressure (CoP) or center of mass (CoM), you can calculate the area of the ellipse enclosing a certain percentage (e.g., 95%) of the sway points. A larger area indicates greater instability.

#### **For Respiration(ASK DARIO IF THERE’S SOME SPECIFIC OTHERS)**  **IMPORTANT\! For the elastomer add a check in the calibration phase, if no meaningful data is received we have to tell the user to stretch a little more the belt** 

The goal is to extract physiological parameters from the elastometer signal.

* **Signal Pre-processing:**  
  * **Low-Pass Filter:** Applied to the elastometer signal to remove high-frequency noise and isolate the slow, rhythmic component of respiration.  
* **Breathing Cycle Detection:**  
  * **Peak and Valley Detection:** Identifying maximum (inhalation) and minimum (exhalation) points in the filtered signal to delineate individual breaths. Peak detection algorithms are essential.  
  * **Signal Derivative:** Calculating the derivative can help pinpoint points of maximum change, corresponding to the start and end of inspiratory and expiratory phases.  
* **Respiratory Parameter Calculation:**  
  * **Respiratory Rate (BPM \- Breaths Per Minute):** Counting the number of complete breathing cycles (peak-to-peak or valley-to-valley) within a defined time interval (e.g., 60 seconds).  
  * **Breathing Amplitude:** Measuring the difference between the peak value and the valley value of each respiratory cycle, indicating breath depth.  
  * **Inspiration/Expiration Ratio (I:E Ratio):** The duration of the inspiration phase divided by the duration of the expiration phase. A key parameter for evaluating breath quality.

### **3\. Machine Learning Models Implementable on Smartphones**

To fully leverage sensor data, you can integrate Machine Learning (ML) models that run **directly on the smartphone (on-device ML)**, ensuring privacy, low latency, and offline operation.

* **ML Use Cases:**  
  * **Respiratory Pattern Classification:** Automatically identify types of breathing (e.g., normal, shallow, deep, irregular, apnea).  
  * **Postural Classification:** Recognize specific postures (e.g., sitting, standing, leaning, bent) or exercise phases.  
  * **Anomaly Detection:** Flag unusual respiratory or postural patterns that might indicate problems.  
  * **Objective Exercise Evaluation:** Classify whether an exercise was performed correctly or not.

* **Lightweight ML Model Types for Smartphones:**  
  * **Simple Neural Networks (DNN \- Deep Neural Networks):** Effective for classification and regression tasks on extracted features. They can be optimized for small sizes.  
  * **Support Vector Machines (SVM):** Robust models for classification, also suitable for smaller datasets and limited resources.  
  * **Decision Trees / Random Forests:** Interpretable and computationally efficient models, useful for classification tasks.  
* **Feature Engineering:** ML models should not run directly on raw data, but rather on **features extracted** from the processing algorithms (e.g., BPM, standard deviation of Roll, respiratory amplitude, I:E ratio, dominant sway frequencies). This reduces model complexity and improves generalizability.  
* **Deployment Frameworks:**  
  * **TensorFlow Lite:** A cross-platform framework by Google for on-device ML inference. It allows converting TensorFlow models into a format optimized for mobile. This is the most versatile choice for React Native.  
  * **Core ML (iOS) / ML Kit (Android):** Native alternatives for ML inference on iOS and Android respectively. They can be integrated via the React Native bridge if needed.

### **4\. Data Format and Mocking**

The **JSON format** has been chosen for data communication, offering flexibility and readability.

* JSON Data Format:  
  Each data packet sent from the device will be a JSON string, containing all sensor readings and device status.  
  {  
    "timestamp": 1678886400,          // Packet acquisition time  
    "battery\_percent": 85,            // Battery percentage (0-100)  
    "buttons\_state": 0,               // Bitmask for button states (0=no press, 1=btn1, 2=btn2, 3=btn1+btn2)  
    "accelerometer": {  
      "x": 102,                       // Acceleration on X-axis (scaled value)  
      "y": \-15,                       // Acceleration on Y-axis  
      "z": 980                        // Acceleration on Z-axis  
    },  
    "gyroscope": {  
      "x": 0.5,                       // Angular velocity on X-axis (scaled value)  
      "y": \-1.2,                      // Angular velocity on Y-axis  
      "z": 0.1  
    },  
    "elastometer\_value": 2048,        // Raw/scaled elastometer value  
    "temperature\_celsius": 36.8       // Temperature in degrees Celsius  
  }

* Data Mocking System:  
  During development, a mocking system is crucial. The MockBluetoothManager class will simulate the generation of these JSON strings at a defined frequency (e.g., 50Hz). This allows you to:  
  * Develop and test the user interface.  
  * Validate decoding logic and processing algorithms.  
  * Work offline without needing the physical device.  
    The mocking will simulate realistic behaviors (e.g., sinusoidal breathing, slight postural sway, temperature fluctuations) and add random noise for better realism.

### **5\. Language for the React Native Bridge**

For the bridge between native code (Android/iOS) and React Native:

* The **react-native-ble-plx** library handles most of the Bluetooth Low Energy (BLE) interaction directly. This library is written in native code (Kotlin/Java for Android and Swift/Objective-C for iOS) and exposes a JavaScript interface usable in React Native. **This is the preferred method and can be mocked in this phase.**  
* If, in the future, very specific native functionalities not covered by react-native-ble-plx are required, you would need to write a **Custom Native Module** using **Kotlin or Java for Android** and **Swift or Objective-C for iOS**. However, for just sensor data reception and management, react-native-ble-plx should suffice, avoiding the need for direct native code writing.

### **6\. Components Needed for Data Visualization**

The User Interface (UI) will be built with React Native components, leveraging charting libraries for real-time visualization.

* **SensorDataDisplay:** A component that shows the latest numerical values for all sensors (e.g., Timestamp, Battery, Button State, Accelerometer X, Y, Z, Gyroscope X, Y, Z, Elastometer, Temperature).  
* **PostureGraph:** A charting component (e.g., LineChart from react-native-chart-kit) that visualizes the calculated **Pitch** and **Roll** angles over time. This allows observing postural oscillations in real-time.  
* **RespirationGraph:** A charting component (LineChart) that displays the **Elastometer** value over time, tracing the breathing waveform.  
* **TemperatureGraph:** A charting component (LineChart) that visualizes the detected **temperature** over time, allowing its fluctuations to be monitored.  
* **Control Components:** Buttons for "Connect/Disconnect," starting/stopping exercises.  
* **Status Indicators:** Text or icons indicating Bluetooth connection status, and device battery level.  
* **Responsive Design:** All components must be designed to adapt correctly to both smartphone and tablet screens, in portrait and landscape orientations, using React Native's styling utilities.

### **7\. List of Exercises to Select and What to Visualize in the App**

The app should offer a selection of specific exercises for posturography and respiration, providing visual and numerical feedback.

#### **Selectable Exercises in the App:**

* **Posturography:**  
  * **Romberg Test (Eyes Open/Closed):** Evaluation of standing stability, with and without visual feedback. The app can guide the user through the phases.  
  * **Single Leg Stand:** Maintaining balance on one leg. The app can time and assess stability.  
  * **Weight Shifting Exercises:** Guide the user to shift weight in specific directions to improve postural control.  
  * **Limits of Stability Test:** Measure the maximum angle of inclination the user can reach without losing balance or taking a step.  
* **Respiration:**  
  * **Guided Diaphragmatic Breathing:** Exercises focused on using the diaphragm, monitoring abdominal expansion via the elastometer.  
  * **Controlled Deep Breathing:** Exercises for slow, deep inhalation and exhalation at a specific rhythm.  
  * **Respiratory Coherence:** Aim to maintain a target respiratory rate (e.g., 6 breaths per minute) to train heart/respiration coherence.  
  * **Breath-Hold Exercises:** Monitoring the duration of breath-holds (inspiratory/expository) and the response afterward.

#### **What to Visualize in the App During Exercises:**

* **Real-time Graphs:**  
  * **PostureGraph:** Lines tracking Roll and Pitch, showing body oscillations. Could include target zones or safety limits.  
  * **RespirationGraph:** The elastometer waveform expanding and contracting, with visual indicators for inhalation/exhalation.  
  * **TemperatureGraph:** The temperature curve over time.  
* **Updated Numerical Values:**  
  * Current Respiratory Rate (BPM).  
  * Current Breathing Amplitude.  
  * Roll and Pitch angle values.  
  * Current Temperature.  
  * Device battery level.  
* **Dynamic Visual Feedback:**  
  * **For Posture:** A "bubble" or indicator on a target that the user must keep centered to improve balance.  
  * **For Respiration:** A progress bar, an animated sine wave, or a light guiding the inhalation/exhalation rhythm.  
* **Timers and Counters:** Exercise duration, number of breaths completed, remaining time for a specific phase.  
* **Post-Exercise Summary:**  
  * Detailed report with summary graphs.  
  * Average parameters and standard deviations.  
  * Stability or respiratory efficiency scores.  
  * Comparison with previous sessions to track progress.  
  * Any ML classifications (e.g., "Effective deep breathing," "Stable posture").

### **8\. Data Persistence with Local Storage for Progress Tracking**

To allow users to track their progress over time, storing historical data is essential. For this, **local storage** will be used on the smartphone.

#### **Why Local Storage (AsyncStorage)?**

* **Offline Access:** Data is stored directly on the device, making it instantly available even without an internet connection.  
* **Simplicity:** Easier to set up for personal, single-user apps compared to cloud databases.  
* **Privacy:** Data remains on the user's device by default.  
* **React Native Integration:** React Native provides AsyncStorage, a simple, asynchronous, unencrypted, persistent key-value storage system.

#### **Data Model in Local Storage**

You will store a collection of exercise sessions, likely as a single JSON string within AsyncStorage.

* **Key:** A single, consistent key (e.g., '@exercise\_sessions') will be used to store all sessions.  
* **Value:** An array of exercise session objects, stringified into JSON.  
* **Example Document Structure for an Exercise Session (same as before):**  
  {  
    "sessionId": "unique-session-id",  
    "timestamp": "2024-06-10T10:00:00Z", // Use ISO 8601 string for easy sorting  
    "exerciseType": "Romberg Test (Eyes Open)",  
    "durationSeconds": 90,  
    "summaryData": {  
      "posture": {  
        "avgPitch": 2.5,  
        "stdDevPitch": 0.8,  
        "avgRoll": \-1.1,  
        "stdDevRoll": 0.5,  
        "swayAreaCm2": 1.2  
      },  
      "respiration": {  
        "avgBPM": 14,  
        "avgAmplitude": 500,  
        "avgIERatio": 0.5,  
        "maxAmplitude": 700  
      },  
      "temperature": {  
        "avgCelsius": 37.0,  
        "maxCelsius": 37.3  
      }  
    }  
    // No 'userId' needed if only local, unless you want to simulate multiple local users  
  }

* **Important Considerations for Storing Data:**  
  * **JSON Serialization:** AsyncStorage only stores strings. You **MUST stringify your JavaScript objects into JSON strings using JSON.stringify()** before saving and parse them back with JSON.parse() when retrieving.  
  * **Data Size:** While AsyncStorage can store a fair amount, it's not designed for very large datasets (e.g., hundreds of MBs). If you plan to store raw, high-frequency sensor data for every session, you might hit limits or experience performance issues. Stick to storing summarized session data.  
  * **Performance:** Reading and writing large amounts of data to AsyncStorage in a single operation can be slow and block the UI. Consider processing data in chunks or off the main thread if performance becomes an issue.  
  * **No Cloud Sync:** Data is tied to the specific device. If the user changes devices or reinstalls the app, historical data will be lost unless you implement your own backup/restore mechanism (e.g., exporting to file).  
  * **No Real-time Listeners:** Unlike Firestore, AsyncStorage doesn't have built-in real-time listeners. You'll need to manually fetch data whenever you expect updates.

#### **Implementing Local Storage in React Native**

1. Install AsyncStorage:  
   AsyncStorage is no longer part of core React Native. You need to install it:  
   npm install @react-native-async-storage/async-storage  
   \# cd ios && pod install && cd ..

2. LocalStorageService.ts:  
   Create a dedicated service for local storage operations.  
   // src/services/LocalStorageService.ts  
   import AsyncStorage from '@react-native-async-storage/async-storage';  
   import { SensorDataPacket } from '../types/SensorData'; // Assuming SensorDataPacket structure  
   import { v4 as uuidv4 } from 'uuid'; // For generating unique session IDs

   // Define the structure for a saved exercise session summary  
   export interface ExerciseSessionSummary {  
     sessionId: string;  
     timestamp: string; // ISO 8601 string for sorting  
     exerciseType: string;  
     durationSeconds: number;  
     summaryData: {  
       posture: { avgPitch: number; stdDevPitch: number; avgRoll: number; stdDevRoll: number; swayAreaCm2: number; };  
       respiration: { avgBPM: number; avgAmplitude: number; avgIERatio: number; maxAmplitude: number; };  
       temperature: { avgCelsius: number; maxCelsius: number; };  
     };  
     // You can also include a reference to raw data if stored separately  
     // rawDataPoints?: SensorDataPacket\[\]; // Only for small sessions if you want to store some raw data  
   }

   const SESSIONS\_STORAGE\_KEY \= '@exercise\_sessions';

   class LocalStorageService {

     /\*\*  
      \* Saves a new exercise session summary to local storage.  
      \* Appends to existing sessions.  
      \*/  
     public async saveSession(session: Omit\<ExerciseSessionSummary, 'sessionId' | 'timestamp'\>): Promise\<void\> {  
       try {  
         const existingSessionsJson \= await AsyncStorage.getItem(SESSIONS\_STORAGE\_KEY);  
         let existingSessions: ExerciseSessionSummary\[\] \= existingSessionsJson ? JSON.parse(existingSessionsJson) : \[\];

         const newSession: ExerciseSessionSummary \= {  
           sessionId: uuidv4(), // Generate a unique ID for the session  
           timestamp: new Date().toISOString(), // Store as ISO 8601 string  
           ...session  
         };

         existingSessions.push(newSession);  
         await AsyncStorage.setItem(SESSIONS\_STORAGE\_KEY, JSON.stringify(existingSessions));  
         console.log('Session saved successfully\!');  
       } catch (error) {  
         console.error('Error saving session:', error);  
         throw error;  
       }  
     }

     /\*\*  
      \* Loads all saved exercise session summaries from local storage.  
      \* Sessions are returned sorted by timestamp in descending order (latest first).  
      \*/  
     public async loadSessions(): Promise\<ExerciseSessionSummary\[\]\> {  
       try {  
         const sessionsJson \= await AsyncStorage.getItem(SESSIONS\_STORAGE\_KEY);  
         if (sessionsJson) {  
           const sessions: ExerciseSessionSummary\[\] \= JSON.parse(sessionsJson);  
           // Sort by timestamp (latest first)  
           return sessions.sort((a, b) \=\> new Date(b.timestamp).getTime() \- new Date(a.timestamp).getTime());  
         }  
         return \[\];  
       } catch (error) {  
         console.error('Error loading sessions:', error);  
         return \[\];  
       }  
     }

     /\*\*  
      \* Clears all saved sessions from local storage. (For development/testing)  
      \*/  
     public async clearAllSessions(): Promise\<void\> {  
       try {  
         await AsyncStorage.removeItem(SESSIONS\_STORAGE\_KEY);  
         console.log('All sessions cleared\!');  
       } catch (error) {  
         console.error('Error clearing sessions:', error);  
       }  
     }

     // Potentially add functions for:  
     // \- updateSession(sessionId, updatedData)  
     // \- deleteSession(sessionId)  
     // \- getSessionById(sessionId)  
   }

   export const localStorageService \= new LocalStorageService();

   // Don't forget to install uuid: npm install uuid && npm install \--save-dev @types/uuid

3. **Integrate into App.tsx (or a dedicated "History" screen):**  
   * Call localStorageService.saveSession after an exercise is completed.  
   * Call localStorageService.loadSessions when the history/progress screen loads.

// App.tsx (Conceptual integration \- simplified)  
import React, { useState, useEffect, useCallback } from 'react';  
import { /\* ... existing imports ... \*/ Alert, ScrollView } from 'react-native';  
import { /\* ... existing sensor imports ... \*/ } from './src/types/SensorData';  
import { /\* ... existing BluetoothManager imports ... \*/ } from './src/services/BluetoothManager';  
import { /\* ... existing MockBluetoothManager imports ... \*/ } from './src/services/MockBluetoothManager';  
import SensorDataDisplay from './src/components/SensorDataDisplay';  
import PostureGraph from './src/components/PostureGraph';  
import RespirationGraph from './src/components/RespirationGraph';  
import TemperatureGraph from './src/components/TemperatureGraph';  
import { localStorageService, ExerciseSessionSummary } from './src/services/LocalStorageService'; // NEW IMPORT  
import { PERMISSIONS, requestMultiple } from 'react-native-permissions'; // Assuming you have this  
import { Platform } from 'react-native';

// ... (USE\_MOCK\_DATA and activeBluetoothManager as before)

const App: React.FC \= () \=\> {  
  const \[isConnected, setIsConnected\] \= useState(false);  
  const \[latestPacket, setLatestPacket\] \= useState\<SensorDataPacket | null\>(null);  
  const \[sensorDataBuffer, setSensorDataBuffer\] \= useState\<SensorDataPacket\[\]\>(\[\]);  
  const \[pastSessions, setPastSessions\] \= useState\<ExerciseSessionSummary\[\]\>(\[\]); // NEW state for past sessions

  const MAX\_BUFFER\_SIZE \= 500;

  // ... (requestBluetoothPermissions, handleConnect, handleDisconnect, dataListener as before)

  // NEW: Function to simulate completing an exercise and saving data  
  const simulateExerciseCompletion \= useCallback(async () \=\> {  
    if (sensorDataBuffer.length \=== 0\) {  
      Alert.alert("No data", "Perform an exercise first to save data.");  
      return;  
    }

    // \*\*\* Here you would run your final algorithms on sensorDataBuffer \*\*\*  
    // For demonstration, let's create a dummy summary  
    const dummySummary: Omit\<ExerciseSessionSummary, 'sessionId' | 'timestamp'\> \= {  
      exerciseType: "Simulated Test",  
      durationSeconds: sensorDataBuffer.length \* (20 / 1000), // Assuming 20ms interval  
      summaryData: {  
        posture: { avgPitch: 0.5, stdDevPitch: 0.2, avgRoll: 0.1, stdDevRoll: 0.1, swayAreaCm2: 0.5 },  
        respiration: { avgBPM: 15, avgAmplitude: 300, avgIERatio: 0.6, maxAmplitude: 400 },  
        temperature: { avgCelsius: 36.8, maxCelsius: 37.2 }  
      }  
    };

    try {  
      await localStorageService.saveSession(dummySummary);  
      Alert.alert("Success", "Exercise session saved\!");  
      // Reload sessions to update the history view  
      const loadedSessions \= await localStorageService.loadSessions();  
      setPastSessions(loadedSessions);  
    } catch (error) {  
      Alert.alert("Error", \`Failed to save session: ${error.message}\`);  
    }  
  }, \[sensorDataBuffer\]);

  // NEW: Load past sessions on app start  
  useEffect(() \=\> {  
    const loadInitialSessions \= async () \=\> {  
      try {  
        const loadedSessions \= await localStorageService.loadSessions();  
        setPastSessions(loadedSessions);  
      } catch (error) {  
        console.error("Failed to load initial sessions:", error);  
      }  
    };  
    loadInitialSessions();  
  }, \[\]); // Run once on component mount

  useEffect(() \=\> {  
    activeBluetoothManager.addDataListener(dataListener);  
    setIsConnected(activeBluetoothManager.getIsConnected());

    return () \=\> {  
      activeBluetoothManager.removeDataListener(dataListener);  
    };  
  }, \[dataListener\]);

  return (  
    \<SafeAreaView style={styles.container}\>  
      \<ScrollView contentContainerStyle={styles.scrollContent}\>  
        \<Text style={styles.title}\>Posture & Breathing App\</Text\>  
        \<Text style={styles.status}\>  
          Status: {isConnected ? 'Connected' : 'Disconnected'}  
        \</Text\>

        \<View style={styles.buttonContainer}\>  
          \<Button  
            title={isConnected ? 'Disconnect' : 'Connect Device'}  
            onPress={isConnected ? handleDisconnect : handleConnect}  
            color={isConnected ? 'red' : 'green'}  
          /\>  
          \<View style={{ height: 10 }} /\> {/\* Spacer \*/}  
          \<Button  
            title="Simulate Exercise & Save"  
            onPress={simulateExerciseCompletion}  
            color="blue"  
          /\>  
        \</View\>

        {latestPacket && (  
          \<SensorDataDisplay packet={latestPacket} /\>  
        )}

        {isConnected && sensorDataBuffer.length \> 0 && (  
          \<\>  
            \<PostureGraph data={sensorDataBuffer} /\>  
            \<RespirationGraph data={sensorDataBuffer} /\>  
            \<TemperatureGraph data={sensorDataBuffer} /\>  
          \</\>  
        )}

        {\!isConnected && (  
          \<Text style={styles.infoText}\>Connect to your device to start exercises.\</Text\>  
        )}

        {/\* NEW: Display past sessions \*/}  
        \<Text style={styles.historyHeader}\>Past Sessions ({pastSessions.length})\</Text\>  
        {pastSessions.length \> 0 ? (  
          pastSessions.map((session) \=\> (  
            \<View key={session.sessionId} style={styles.sessionItem}\>  
              \<Text style={styles.sessionText}\>Type: {session.exerciseType}\</Text\>  
              \<Text style={styles.sessionText}\>Date: {new Date(session.timestamp).toLocaleString()}\</Text\>  
              \<Text style={styles.sessionText}\>Duration: {session.durationSeconds}s\</Text\>  
              {/\* You can add more summary data here \*/}  
            \</View\>  
          ))  
        ) : (  
          \<Text style={styles.noDataText}\>No past sessions saved.\</Text\>  
        )}

      \</ScrollView\>  
    \</SafeAreaView\>  
  );  
};

const styles \= StyleSheet.create({  
  container: {  
    flex: 1,  
    backgroundColor: '\#f0f0f0',  
  },  
  scrollContent: {  
    padding: 20,  
    alignItems: 'center',  
  },  
  title: {  
    fontSize: 28,  
    fontWeight: 'bold',  
    marginBottom: 20,  
    color: '\#333',  
  },  
  status: {  
    fontSize: 18,  
    marginBottom: 10,  
    color: '\#555',  
  },  
  buttonContainer: {  
    width: '80%',  
    marginVertical: 20,  
  },  
  infoText: {  
    fontSize: 16,  
    color: '\#888',  
    marginTop: 50,  
    textAlign: 'center',  
  },  
  historyHeader: { // NEW STYLE  
    fontSize: 22,  
    fontWeight: 'bold',  
    marginTop: 30,  
    marginBottom: 15,  
    color: '\#333',  
  },  
  sessionItem: { // NEW STYLE  
    backgroundColor: '\#fff',  
    borderRadius: 10,  
    padding: 15,  
    marginVertical: 5,  
    width: '95%',  
    shadowColor: '\#000',  
    shadowOffset: { width: 0, height: 1 },  
    shadowOpacity: 0.05,  
    shadowRadius: 2,  
    elevation: 3,  
  },  
  sessionText: { // NEW STYLE  
    fontSize: 14,  
    color: '\#444',  
  },  
  noDataText: {  
    fontSize: 16,  
    color: '\#888',  
    padding: 20,  
  }  
});

export default App;

—--------------------------------------------  
Tha data is saved on the phone and we can upload it on ur server or use it in other ways

