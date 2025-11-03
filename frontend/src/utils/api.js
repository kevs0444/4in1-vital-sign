// frontend/src/utils/api.js
const API_URL = "http://127.0.0.1:5000/api";

// Timeout configuration
const TIMEOUTS = {
  SHORT: 5000,    // 5 seconds for quick operations
  MEDIUM: 10000,  // 10 seconds for measurements
  LONG: 30000     // 30 seconds for MAX30102 measurement
};

// Helper function for API calls with timeout
const fetchWithTimeout = async (url, options = {}, timeout = TIMEOUTS.MEDIUM) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    throw error;
  }
};

// Check backend status
export const checkBackendStatus = async () => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/health`, {}, TIMEOUTS.SHORT);
    return { available: true, ...response };
  } catch (error) {
    console.error('Backend status check failed:', error);
    return { 
      available: false, 
      error: 'Backend unavailable',
      details: error.message 
    };
  }
};

export const sensorAPI = {
  // ==================== CONNECTION & GENERAL ====================
  
  // Connect to Arduino
  connect: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/connect`, {
        method: 'POST',
      }, TIMEOUTS.LONG);
    } catch (error) {
      console.error('Error connecting to Arduino:', error);
      return { 
        connected: false, 
        error: 'Failed to connect to Arduino', 
        details: error.message 
      };
    }
  },

  // Disconnect from Arduino
  disconnect: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/disconnect`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error disconnecting from Arduino:', error);
      return { 
        status: 'error', 
        error: 'Failed to disconnect from Arduino',
        details: error.message 
      };
    }
  },

  // Get sensor manager status
  getStatus: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/status`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting sensor status:', error);
      return { 
        connected: false, 
        error: 'Failed to get sensor status',
        details: error.message 
      };
    }
  },

  // Get comprehensive system status
  getSystemStatus: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/system_status`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting system status:', error);
      return { 
        connected: false, 
        connection_established: false, 
        sensors_ready: {},
        error: 'Failed to get system status',
        details: error.message
      };
    }
  },

  // Initialize system
  initializeSystem: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/initialize`, {
        method: 'POST',
      }, TIMEOUTS.LONG);
    } catch (error) {
      console.error('Error initializing system:', error);
      return { 
        status: 'error', 
        error: 'Failed to initialize system',
        details: error.message 
      };
    }
  },

  // Initialize weight sensor
  initializeWeight: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/initialize_weight`, {
        method: 'POST',
      }, TIMEOUTS.LONG);
    } catch (error) {
      console.error('Error initializing weight sensor:', error);
      return { 
        status: 'error', 
        error: 'Failed to initialize weight sensor',
        details: error.message 
      };
    }
  },

  // Reset all measurements
  reset: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/reset`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error resetting measurements:', error);
      return { 
        error: 'Failed to reset measurements', 
        details: error.message 
      };
    }
  },

  // Force reconnect
  forceReconnect: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/reconnect`, {
        method: 'POST',
      }, TIMEOUTS.LONG);
    } catch (error) {
      console.error('Error forcing reconnect:', error);
      return { 
        status: 'error', 
        error: 'Failed to force reconnect',
        details: error.message 
      };
    }
  },

  // Get all measurements
  getMeasurements: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/measurements`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting measurements:', error);
      return { 
        error: 'Failed to get measurements', 
        details: error.message 
      };
    }
  },

  // Perform tare operation
  tareWeight: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/tare`, {
        method: 'POST',
      }, TIMEOUTS.MEDIUM);
    } catch (error) {
      console.error('Error performing tare:', error);
      return { 
        status: 'error', 
        error: 'Failed to perform tare',
        details: error.message 
      };
    }
  },

  // Shutdown all sensors
  shutdownAll: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/shutdown`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error shutting down all sensors:', error);
      return { 
        status: 'error', 
        error: 'Failed to shutdown all sensors',
        details: error.message 
      };
    }
  },

  // Generic prepare/shutdown functions
  _prepareSensor: async (sensorName) => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/${sensorName}/prepare`, { 
        method: 'POST' 
      }, TIMEOUTS.MEDIUM);
    } catch (error) {
      console.error(`Error preparing ${sensorName} sensor:`, error);
      return { 
        error: `Failed to prepare ${sensorName} sensor`,
        details: error.message 
      };
    }
  },

  _shutdownSensor: async (sensorName) => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/${sensorName}/shutdown`, { 
        method: 'POST' 
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error(`Error shutting down ${sensorName} sensor:`, error);
      return { 
        error: `Failed to shutdown ${sensorName} sensor`,
        details: error.message 
      };
    }
  },

  // ==================== WEIGHT SENSOR ====================
  startWeight: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/weight/start`, {
        method: 'POST',
      }, TIMEOUTS.MEDIUM);
    } catch (error) {
      console.error('Error starting weight measurement:', error);
      return { 
        error: 'Failed to start weight measurement', 
        details: error.message 
      };
    }
  },

  prepareWeight: () => sensorAPI._prepareSensor('weight'),
  shutdownWeight: () => sensorAPI._shutdownSensor('weight'),

  getWeightStatus: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/weight/status`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting weight status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get weight status',
        details: error.message,
        measurement_active: false,
        weight: null
      };
    }
  },

  // ==================== HEIGHT SENSOR ====================
  startHeight: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/height/start`, {
        method: 'POST',
      }, TIMEOUTS.MEDIUM);
    } catch (error) {
      console.error('Error starting height measurement:', error);
      return { 
        error: 'Failed to start height measurement', 
        details: error.message 
      };
    }
  },

  prepareHeight: () => sensorAPI._prepareSensor('height'),
  shutdownHeight: () => sensorAPI._shutdownSensor('height'),

  getHeightStatus: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/height/status`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting height status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get height status',
        details: error.message,
        measurement_active: false,
        height: null
      };
    }
  },

  // ==================== TEMPERATURE SENSOR ====================
  startTemperature: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/temperature/start`, {
        method: 'POST',
      }, TIMEOUTS.MEDIUM);
    } catch (error) {
      console.error('Error starting temperature measurement:', error);
      return { 
        error: 'Failed to start temperature measurement', 
        details: error.message 
      };
    }
  },

  prepareTemperature: () => sensorAPI._prepareSensor('temperature'),
  shutdownTemperature: () => sensorAPI._shutdownSensor('temperature'),
  
  getTemperatureStatus: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/temperature/status`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting temperature status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get temperature status',
        details: error.message,
        measurement_active: false,
        temperature: null,
        live_temperature: null
      };
    }
  },

  // ==================== MAX30102 SENSOR - IMPROVED ====================
  startMax30102: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/max30102/start`, {
        method: 'POST',
      }, TIMEOUTS.LONG); // 30 seconds for MAX30102 measurement
    } catch (error) {
      console.error('Error starting MAX30102 measurement:', error);
      return { 
        error: 'Failed to start MAX30102 measurement', 
        details: error.message 
      };
    }
  },

  prepareMax30102: async () => {
    try {
      // First power up the sensor
      const result = await sensorAPI._prepareSensor('max30102');
      
      if (result.error) {
        return result;
      }
      
      // Wait for sensor to initialize and check finger detection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Check initial status to see if finger is already detected
      const status = await sensorAPI.getMax30102Status();
      
      return {
        ...result,
        initial_finger_detected: status.finger_detected || false,
        sensor_ready: status.sensor_prepared || false
      };
      
    } catch (error) {
      console.error('Error preparing MAX30102 sensor:', error);
      return { 
        error: 'Failed to prepare MAX30102 sensor',
        details: error.message 
      };
    }
  },

  shutdownMax30102: () => sensorAPI._shutdownSensor('max30102'),

  getMax30102Status: async () => {
    try {
      const response = await fetchWithTimeout(`${API_URL}/sensor/max30102/status`, {}, TIMEOUTS.SHORT);
      
      // Enhanced response with better finger detection handling
      return {
        ...response,
        // Ensure finger_detected is always a boolean
        finger_detected: Boolean(response.finger_detected),
        // Enhanced sensor readiness check
        sensor_fully_ready: Boolean(response.sensor_prepared && response.status !== 'error'),
        // Add timestamp for debugging
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      console.error('Error getting MAX30102 status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get MAX30102 status',
        details: error.message,
        measurement_active: false,
        heart_rate: null,
        spo2: null,
        respiratory_rate: null,
        finger_detected: false,
        progress: 0,
        elapsed: 0,
        total_time: 30,
        sensor_prepared: false,
        sensor_fully_ready: false,
        final_results: {
          heart_rate: null,
          spo2: null,
          respiratory_rate: null
        },
        timestamp: new Date().toISOString()
      };
    }
  },

  // New method to force finger detection check
  checkFingerDetection: async () => {
    try {
      // This triggers the backend to immediately check finger status
      const status = await sensorAPI.getMax30102Status();
      
      return {
        finger_detected: status.finger_detected,
        ir_value: status.ir_value || 0,
        sensor_ready: status.sensor_prepared,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking finger detection:', error);
      return {
        finger_detected: false,
        ir_value: 0,
        sensor_ready: false,
        error: error.message
      };
    }
  }
};

// Export for backward compatibility
export default sensorAPI;