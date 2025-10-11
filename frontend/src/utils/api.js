// frontend/src/utils/api.js
const API_URL = "http://127.0.0.1:5000/api";

// ✅ Backend status check
export async function checkBackendStatus() {
  try {
    const response = await fetch(`${API_URL}/hello`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return { status: 'connected', message: data.message };
  } catch (error) {
    console.error("Error checking backend status:", error);
    return { status: 'error', message: 'Backend not reachable' };
  }
}

// Sensor API for all sensor operations
export const sensorAPI = {
  // ==================== CONNECTION & GENERAL ====================
  
  // Connect to Arduino
  connect: async (port = 'COM3') => {
    try {
      const response = await fetch(`${API_URL}/sensor/connect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ port })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error connecting to Arduino:', error);
      return { error: 'Failed to connect to Arduino', details: error.message };
    }
  },

  // Get sensor manager status
  getStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log("📡 Sensor status response:", data);
      return data;
    } catch (error) {
      console.error('Error getting sensor status:', error);
      return { 
        error: 'Failed to get sensor status', 
        details: error.message,
        connected: false,
        simulation_mode: true
      };
    }
  },

  // Test connection
  testConnection: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.status === 'connected' || data.connected) {
        return { 
          status: 'connected', 
          message: data.message || 'Sensor communication OK',
          connected: true
        };
      } else {
        return { 
          status: 'error', 
          message: data.error || 'Failed to connect to sensors',
          error: data.error,
          connected: false
        };
      }
    } catch (error) {
      console.error('Error testing connection:', error);
      return { 
        status: 'error', 
        message: 'Failed to connect to sensor system',
        error: error.message,
        connected: false
      };
    }
  },

  // ==================== TEMPERATURE SENSOR ====================
  
  // Start temperature measurement
  startTemperature: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temperature/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error starting temperature measurement:', error);
      return { error: 'Failed to start measurement', details: error.message };
    }
  },

  // Get temperature data
  getTemperature: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temperature/data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting temperature data:', error);
      return { error: 'Failed to get temperature data', details: error.message };
    }
  },

  // Get detailed temperature status with detection info
  getTemperatureStatus: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/temperature/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      // Add timestamp for client-side tracking
      data.client_timestamp = Date.now();
      return data;
    } catch (error) {
      console.error('Error getting temperature status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get temperature status',
        details: error.message,
        client_timestamp: Date.now()
      };
    }
  },

  // ==================== MAX30102 SENSOR ====================
  
  // Start MAX30102 measurement
  startMax30102: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/max30102/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error starting MAX30102 measurement:', error);
      return { error: 'Failed to start MAX30102 measurement', details: error.message };
    }
  },

  // Get MAX30102 real-time data
  getMax30102Data: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/max30102/data`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting MAX30102 data:', error);
      return { error: 'Failed to get MAX30102 data', details: error.message };
    }
  },

  // Get MAX30102 status
  getMax30102Status: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/max30102/status`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      data.client_timestamp = Date.now();
      return data;
    } catch (error) {
      console.error('Error getting MAX30102 status:', error);
      return { 
        status: 'error', 
        message: 'Failed to get MAX30102 status',
        details: error.message,
        client_timestamp: Date.now()
      };
    }
  },

  // ==================== COMMON ====================
  
  // Stop current measurement
  stopMeasurement: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/measurement/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error stopping measurement:', error);
      return { error: 'Failed to stop measurement', details: error.message };
    }
  },

  // Get all completed measurements
  getAllMeasurements: async () => {
    try {
      const response = await fetch(`${API_URL}/sensor/measurements`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error getting all measurements:', error);
      return { error: 'Failed to get measurements', details: error.message };
    }
  },

  // ==================== SIMULATION ROUTES ====================
  
  // Simulate temperature measurement
  simulateTemperature: async (action = 'start') => {
    try {
      const response = await fetch(`${API_URL}/sensor/simulate/temperature`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error simulating temperature:', error);
      return { error: 'Failed to simulate temperature', details: error.message };
    }
  },

  // Simulate MAX30102 measurement
  simulateMax30102: async (action = 'start') => {
    try {
      const response = await fetch(`${API_URL}/sensor/simulate/max30102`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error simulating MAX30102:', error);
      return { error: 'Failed to simulate MAX30102', details: error.message };
    }
  }
};

// ==================== UTILITY FUNCTIONS ====================

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

// Utility function for polling MAX30102 status
export const createMax30102Poller = (onUpdate, onError, interval = 1000) => {
  let pollerId = null;
  
  const startPolling = () => {
    pollerId = setInterval(async () => {
      try {
        const status = await sensorAPI.getMax30102Status();
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

// Helper function to interpret MAX30102 status
export const interpretMax30102Status = (statusData) => {
  if (!statusData) {
    return {
      heartRate: { value: null, display: '--', status: 'default' },
      spo2: { value: null, display: '--.-', status: 'default' },
      respiratoryRate: { value: null, display: '--', status: 'default' },
      isMeasuring: false,
      isComplete: false,
      hasError: false,
      fingerStatus: 'waiting',
      progress: 60,
      message: 'No data available'
    };
  }

  const { 
    current_phase, 
    measurement_active, 
    heart_rate, 
    spo2, 
    respiratory_rate,
    finger_detected 
  } = statusData;

  // Determine finger status
  let fingerStatus = 'waiting';
  if (finger_detected) {
    fingerStatus = 'detected';
  } else if (current_phase === 'MAX' && !finger_detected) {
    fingerStatus = 'waiting';
  }

  // Determine measurement status
  const isMeasuring = current_phase === 'MAX' && measurement_active;
  const isComplete = !measurement_active && (heart_rate || spo2 || respiratory_rate);

  // Calculate progress (assuming 60-second measurement)
  let progress = 60;
  if (isMeasuring && statusData.progress_seconds !== undefined) {
    progress = statusData.progress_seconds;
  } else if (isComplete) {
    progress = 0;
  }

  // Helper to get status for each measurement
  const getMeasurementStatus = (type, value) => {
    if (!value) return 'default';
    
    switch (type) {
      case 'heartRate':
        if (value < 60) return 'low';
        if (value > 100) return 'high';
        return 'normal';
      case 'spo2':
        if (value < 95) return 'low';
        return 'normal';
      case 'respiratoryRate':
        if (value < 12) return 'low';
        if (value > 20) return 'high';
        return 'normal';
      default:
        return 'default';
    }
  };

  return {
    heartRate: {
      value: heart_rate,
      display: heart_rate ? Math.round(heart_rate).toString() : '--',
      status: getMeasurementStatus('heartRate', heart_rate)
    },
    spo2: {
      value: spo2,
      display: spo2 ? spo2.toFixed(1) : '--.-',
      status: getMeasurementStatus('spo2', spo2)
    },
    respiratoryRate: {
      value: respiratory_rate,
      display: respiratory_rate ? Math.round(respiratory_rate).toString() : '--',
      status: getMeasurementStatus('respiratoryRate', respiratory_rate)
    },
    isMeasuring,
    isComplete,
    hasError: current_phase === 'error',
    fingerStatus,
    progress,
    message: statusData.message || ''
  };
};

export default sensorAPI;