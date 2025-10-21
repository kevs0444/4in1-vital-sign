// frontend/src/utils/api.js
const API_URL = "http://127.0.0.1:5000/api";

// ... (checkBackendStatus function can remain the same)

export const sensorAPI = {
  // ==================== CONNECTION & GENERAL ====================
  
  // Connect to Arduino - CORRECTED
  connect: async () => {
    try {
      // This function no longer sends a port number in the body.
      const response = await fetch(`${API_URL}/sensor/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error connecting to Arduino:', error);
      return { connected: false, error: 'Failed to connect to Arduino', details: error.message };
    }
  },

  // Get sensor manager status
  getStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting sensor status:', error);
      return { connected: false, error: 'Failed to get sensor status' };
    }
  },

  getSystemStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/system_status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting system status:', error);
      // Return a default error state that the frontend can interpret
      return { connected: false, connection_established: false, sensors_ready: {} };
    }
  },

  // Reset all measurements
  reset: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return { error: 'Failed to reset measurements', details: error.message };
    }
  },

  // Generic prepare/shutdown functions
  _prepareSensor: async (sensorName) => {
    try {
      await fetch(`${API_URL}/sensor/${sensorName}/prepare`, { method: 'POST' });
    } catch (error) {
      console.error(`Error preparing ${sensorName} sensor:`, error);
    }
  },

  _shutdownSensor: async (sensorName) => {
    try {
      await fetch(`${API_URL}/sensor/${sensorName}/shutdown`, { method: 'POST' });
    } catch (error) {
      console.error(`Error shutting down ${sensorName} sensor:`, error);
    }
  },

  // ... (All other API functions like startWeight, getStatus, etc., remain unchanged)
  // ==================== WEIGHT SENSOR ====================
  startWeight: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/weight/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error starting weight measurement:', error);
      return { error: 'Failed to start measurement', details: error.message };
    }
  },

  prepareWeight: () => sensorAPI._prepareSensor('weight'),
  shutdownWeight: () => sensorAPI._shutdownSensor('weight'),

  getWeightStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/weight/status`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting weight status:', error);
      return { status: 'error', message: 'Failed to get weight status' };
    }
  },

  // ==================== HEIGHT SENSOR ====================
  startHeight: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/height/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error starting height measurement:', error);
      return { error: 'Failed to start measurement', details: error.message };
    }
  },

  prepareHeight: () => sensorAPI._prepareSensor('height'),
  shutdownHeight: () => sensorAPI._shutdownSensor('height'),

  getHeightStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/height/status`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting height status:', error);
      return { status: 'error', message: 'Failed to get height status' };
    }
  },

  // ==================== TEMPERATURE SENSOR ====================
  startTemperature: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temperature/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return { error: 'Failed to start measurement', details: error.message };
    }
  },

  prepareTemperature: () => sensorAPI._prepareSensor('temperature'),
  shutdownTemperature: () => sensorAPI._shutdownSensor('temperature'),
  
  getTemperatureStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temperature/status`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return { status: 'error', message: 'Failed to get temperature status' };
    }
  },

  // ==================== MAX30102 SENSOR ====================
  startMax30102: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/max30102/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return { error: 'Failed to start MAX30102 measurement', details: error.message };
    }
  },

  prepareMax30102: () => sensorAPI._prepareSensor('max30102'),
  shutdownMax30102: () => sensorAPI._shutdownSensor('max30102'),

  getMax30102Status: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/max30102/status`);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      return { status: 'error', message: 'Failed to get MAX30102 status' };
    }
  },
};

export default sensorAPI;