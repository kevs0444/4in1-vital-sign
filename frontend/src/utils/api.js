// frontend/src/utils/api.js
const API_URL = "http://127.0.0.1:5000/api";

// ✅ Add this missing export for Standby.jsx
export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_URL}/status`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error checking backend status:", error);
    return { status: 'error' };
  }
}

// Test connection to Flask
export async function helloFlask() {
  try {
    const response = await fetch(`${API_URL}/hello`);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error connecting to Flask:", error);
    return null;
  }
}

// Sensor API for all sensor operations
export const sensorAPI = {
  // Start temperature measurement
  startTemperature: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temp/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.json();
    } catch (error) {
      console.error('Error starting temperature measurement:', error);
      return { error: 'Failed to start measurement' };
    }
  },

  // Get temperature data
  getTemperature: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temp/data`);
      return await response.json();
    } catch (error) {
      console.error('Error getting temperature data:', error);
      return { error: 'Failed to get temperature data' };
    }
  },

  // Get detailed temperature status with detection info
  getTemperatureStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temp/status`);
      const data = await response.json();
      
      // Add timestamp for client-side tracking
      data.client_timestamp = Date.now();
      return data;
    } catch (error) {
      console.error('Error getting temperature status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get temperature status',
        client_timestamp: Date.now()
      };
    }
  },

  // Stop measurement
  stopMeasurement: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.json();
    } catch (error) {
      console.error('Error stopping measurement:', error);
      return { error: 'Failed to stop measurement' };
    }
  },

  // Get sensor manager status
  getStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/status`);
      return await response.json();
    } catch (error) {
      console.error('Error getting sensor status:', error);
      return { error: 'Failed to get sensor status' };
    }
  },

  // Test connection
  testConnection: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      
      // Ensure consistent response format
      if (data.status === 'connected') {
        return { status: 'connected', message: data.message || 'Arduino communication OK' };
      } else {
        return { 
          status: 'error', 
          message: data.error || 'Failed to connect to Arduino',
          error: data.error 
        };
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      return { 
        status: 'error', 
        message: 'Failed to connect to sensor system',
        error: error.message 
      };
    }
  }
};

// Utility function for polling temperature status
export const createTemperaturePoller = (onUpdate, onError, interval = 1000) => {
  let pollerId = null;
  
  const startPolling = () => {
    pollerId = setInterval(async () => {
      try {
        const status = await sensorAPI.getTemperatureStatus();
        onUpdate(status);
      } catch (error) {
        onError(error);
      }
    }, interval);
  };
  
  const stopPolling = () => {
    if (pollerId) {
      clearInterval(pollerId);
      pollerId = null;
    }
  };
  
  return { startPolling, stopPolling };
};

// Helper function to interpret temperature status
export const interpretTemperatureStatus = (statusData) => {
  if (!statusData) {
    return {
      displayText: '--.- °C',
      status: 'unknown',
      message: 'No data available',
      isMeasuring: false,
      isComplete: false,
      hasError: false,
      needsUserAction: false
    };
  }

  const { status, temperature, message } = statusData;
  
  const interpretation = {
    displayText: temperature ? `${temperature.toFixed(1)} °C` : '--.- °C',
    status: status,
    message: message,
    temperature: temperature,
    isMeasuring: status === 'measuring' || status === 'starting',
    isComplete: status === 'completed',
    hasError: status === 'error' || status === 'timeout' || status === 'disconnected',
    needsUserAction: status === 'no_user' || status === 'no_contact'
  };

  return interpretation;
};

export default sensorAPI;