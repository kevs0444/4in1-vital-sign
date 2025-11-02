// frontend/src/utils/api.js
const API_URL = "http://127.0.0.1:5000/api";

export const sensorAPI = {
  // ==================== CONNECTION & GENERAL ====================
  
  // Connect to Arduino
  connect: async () => {
    try {
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

  // Tare operation
  performTare: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/tare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error performing tare:', error);
      return { error: 'Failed to perform tare', details: error.message };
    }
  },

  // Auto-tare operation
  autoTare: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/auto_tare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error performing auto-tare:', error);
      return { error: 'Failed to perform auto-tare', details: error.message };
    }
  },

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

  prepareWeight: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/weight/prepare`, { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error preparing weight sensor:', error);
      return { error: 'Failed to prepare weight sensor' };
    }
  },

  shutdownWeight: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/weight/shutdown`, { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error shutting down weight sensor:', error);
      return { error: 'Failed to shutdown weight sensor' };
    }
  },

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

  prepareHeight: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/height/prepare`, { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error preparing height sensor:', error);
      return { error: 'Failed to prepare height sensor' };
    }
  },

  shutdownHeight: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/height/shutdown`, { 
        method: 'POST' 
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      console.error('Error shutting down height sensor:', error);
      return { error: 'Failed to shutdown height sensor' };
    }
  },

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
};

export default sensorAPI;