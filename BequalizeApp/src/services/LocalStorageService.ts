/**
 * Local Storage Service for Bequalize Belt
 * Handles exercise session persistence using AsyncStorage
 * Based on the documentation requirements
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SensorDataPacket, ExerciseSessionSummary, ExerciseType } from '../types/SensorData';
import { v4 as uuidv4 } from 'uuid';

const SESSIONS_STORAGE_KEY = '@exercise_sessions';

export class LocalStorageService {

  /**
   * Saves a new exercise session summary to local storage.
   * Appends to existing sessions.
   */
  public async saveSession(session: Omit<ExerciseSessionSummary, 'sessionId' | 'timestamp'>): Promise<void> {
    try {
      const existingSessionsJson = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      let existingSessions: ExerciseSessionSummary[] = existingSessionsJson ? JSON.parse(existingSessionsJson) : [];

      const newSession: ExerciseSessionSummary = {
        sessionId: uuidv4(), // Generate a unique ID for the session
        timestamp: new Date().toISOString(), // Store as ISO 8601 string
        ...session
      };

      existingSessions.push(newSession);
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(existingSessions));
      console.log('Session saved successfully!');
    } catch (error) {
      console.error('Error saving session:', error);
      throw error;
    }
  }

  /**
   * Loads all saved exercise session summaries from local storage.
   * Sessions are returned sorted by timestamp in descending order (latest first).
   */
  public async loadSessions(): Promise<ExerciseSessionSummary[]> {
    try {
      const sessionsJson = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      if (sessionsJson) {
        const sessions: ExerciseSessionSummary[] = JSON.parse(sessionsJson);
        // Sort by timestamp (latest first)
        return sessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      }
      return [];
    } catch (error) {
      console.error('Error loading sessions:', error);
      return [];
    }
  }

  /**
   * Loads sessions filtered by exercise type
   */
  public async loadSessionsByType(exerciseType: ExerciseType): Promise<ExerciseSessionSummary[]> {
    try {
      const allSessions = await this.loadSessions();
      return allSessions.filter(session => session.exerciseType === exerciseType);
    } catch (error) {
      console.error('Error loading sessions by type:', error);
      return [];
    }
  }

  /**
   * Gets a specific session by ID
   */
  public async getSessionById(sessionId: string): Promise<ExerciseSessionSummary | null> {
    try {
      const allSessions = await this.loadSessions();
      return allSessions.find(session => session.sessionId === sessionId) || null;
    } catch (error) {
      console.error('Error getting session by ID:', error);
      return null;
    }
  }

  /**
   * Updates an existing session
   */
  public async updateSession(sessionId: string, updatedData: Partial<ExerciseSessionSummary>): Promise<void> {
    try {
      const existingSessionsJson = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!existingSessionsJson) {
        throw new Error('No sessions found');
      }

      let sessions: ExerciseSessionSummary[] = JSON.parse(existingSessionsJson);
      const sessionIndex = sessions.findIndex(session => session.sessionId === sessionId);
      
      if (sessionIndex === -1) {
        throw new Error('Session not found');
      }

      sessions[sessionIndex] = { ...sessions[sessionIndex], ...updatedData };
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      console.log('Session updated successfully!');
    } catch (error) {
      console.error('Error updating session:', error);
      throw error;
    }
  }

  /**
   * Deletes a specific session
   */
  public async deleteSession(sessionId: string): Promise<void> {
    try {
      const existingSessionsJson = await AsyncStorage.getItem(SESSIONS_STORAGE_KEY);
      if (!existingSessionsJson) {
        return; // No sessions to delete
      }

      let sessions: ExerciseSessionSummary[] = JSON.parse(existingSessionsJson);
      sessions = sessions.filter(session => session.sessionId !== sessionId);
      
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
      console.log('Session deleted successfully!');
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }

  /**
   * Gets exercise statistics for progress tracking
   */
  public async getExerciseStatistics(exerciseType?: ExerciseType): Promise<ExerciseStatistics> {
    try {
      const sessions = exerciseType ? 
        await this.loadSessionsByType(exerciseType) : 
        await this.loadSessions();

      if (sessions.length === 0) {
        return {
          totalSessions: 0,
          averageDuration: 0,
          averageStabilityScore: 0,
          averageRespiratoryRate: 0,
          progressTrend: 'stable',
          lastSessionDate: null
        };
      }

      const totalSessions = sessions.length;
      const averageDuration = sessions.reduce((sum, session) => sum + session.durationSeconds, 0) / totalSessions;
      const averageStabilityScore = sessions.reduce((sum, session) => 
        sum + (1 / (session.summaryData.posture.swayAreaCm2 + 0.1)), 0) / totalSessions;
      const averageRespiratoryRate = sessions.reduce((sum, session) => 
        sum + session.summaryData.respiration.avgBPM, 0) / totalSessions;

      // Calculate progress trend (comparing recent vs older sessions)
      const recentSessions = sessions.slice(0, Math.min(5, Math.floor(sessions.length / 2)));
      const olderSessions = sessions.slice(-Math.min(5, Math.floor(sessions.length / 2)));
      
      let progressTrend: 'improving' | 'stable' | 'declining' = 'stable';
      
      if (recentSessions.length > 0 && olderSessions.length > 0) {
        const recentAvgStability = recentSessions.reduce((sum, session) => 
          sum + (1 / (session.summaryData.posture.swayAreaCm2 + 0.1)), 0) / recentSessions.length;
        const olderAvgStability = olderSessions.reduce((sum, session) => 
          sum + (1 / (session.summaryData.posture.swayAreaCm2 + 0.1)), 0) / olderSessions.length;
        
        const improvementRatio = recentAvgStability / olderAvgStability;
        
        if (improvementRatio > 1.1) {
          progressTrend = 'improving';
        } else if (improvementRatio < 0.9) {
          progressTrend = 'declining';
        }
      }

      return {
        totalSessions,
        averageDuration,
        averageStabilityScore,
        averageRespiratoryRate,
        progressTrend,
        lastSessionDate: sessions[0]?.timestamp || null
      };
    } catch (error) {
      console.error('Error calculating exercise statistics:', error);
      throw error;
    }
  }

  /**
   * Clears all saved sessions from local storage. (For development/testing)
   */
  public async clearAllSessions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SESSIONS_STORAGE_KEY);
      console.log('All sessions cleared!');
    } catch (error) {
      console.error('Error clearing sessions:', error);
    }
  }

  /**
   * Exports all sessions as JSON string for backup
   */
  public async exportSessions(): Promise<string> {
    try {
      const sessions = await this.loadSessions();
      return JSON.stringify(sessions, null, 2);
    } catch (error) {
      console.error('Error exporting sessions:', error);
      throw error;
    }
  }

  /**
   * Imports sessions from JSON string
   */
  public async importSessions(sessionsJson: string): Promise<void> {
    try {
      const importedSessions: ExerciseSessionSummary[] = JSON.parse(sessionsJson);
      
      // Validate the imported data structure
      if (!Array.isArray(importedSessions)) {
        throw new Error('Invalid sessions data format');
      }

      // Merge with existing sessions, avoiding duplicates
      const existingSessions = await this.loadSessions();
      const existingIds = new Set(existingSessions.map(session => session.sessionId));
      
      const newSessions = importedSessions.filter(session => !existingIds.has(session.sessionId));
      const allSessions = [...existingSessions, ...newSessions];
      
      await AsyncStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(allSessions));
      console.log(`Imported ${newSessions.length} new sessions`);
    } catch (error) {
      console.error('Error importing sessions:', error);
      throw error;
    }
  }

  /**
   * Generic method to store any data by key
   */
  public async setItem<T>(key: string, value: T): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error storing item:', error);
      throw error;
    }
  }

  /**
   * Generic method to retrieve any data by key
   */
  public async getItem<T>(key: string): Promise<T | null> {
    try {
      const item = await AsyncStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Error retrieving item:', error);
      return null;
    }
  }
}

// Statistics interface for progress tracking
export interface ExerciseStatistics {
  totalSessions: number;
  averageDuration: number;
  averageStabilityScore: number;
  averageRespiratoryRate: number;
  progressTrend: 'improving' | 'stable' | 'declining';
  lastSessionDate: string | null;
}

// Export singleton instance for global use
export const localStorageService = new LocalStorageService(); 