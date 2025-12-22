// frontend/src/utils/api.js - COMPLETE UPDATED VERSION WITH MISSING SENSOR FUNCTIONS
const API_URL = (process.env.REACT_APP_API_URL || "http://127.0.0.1:5000") + "/api";

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
    console.log(`🌐 API Call: ${options.method || 'GET'} ${url}`);
    if (options.body) {
      console.log(`📦 Request Body:`, JSON.parse(options.body));
    }

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
      let errorMessage = `HTTP error! status: ${response.status}`;
      try {
        const errorData = await response.json();
        if (errorData.message) errorMessage = errorData.message;
      } catch (e) {
        // If not JSON, try text
        try {
          const errorText = await response.text();
          if (errorText) errorMessage = errorText;
        } catch (e2) { }
      }
      console.error(`❌ API Request Failed: ${errorMessage}`);
      throw new Error(errorMessage);
    }

    const result = await response.json();
    console.log(`✅ API Response:`, result);
    return result;

  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      console.error(`⏰ Request timeout after ${timeout}ms`);
      throw new Error(`Request timeout after ${timeout}ms`);
    }
    console.error(`❌ API Error:`, error);
    throw error;
  }
};

// ==================== BACKEND STATUS ====================

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

// Check database connection status
export const checkDatabaseStatus = async () => {
  try {
    const response = await fetchWithTimeout(`${API_URL}/db-check`, {}, TIMEOUTS.SHORT);
    return response;
  } catch (error) {
    console.error('Database status check failed:', error);
    return {
      connected: false,
      status: 'error',
      message: error.message || 'Database connection check failed'
    };
  }
};

// Comprehensive system check (Database, Arduino, Auto-Tare)
export const checkSystemStatus = async () => {
  try {
    console.log('🔍 Performing comprehensive system check...');
    const response = await fetchWithTimeout(`${API_URL}/system-check`, {}, TIMEOUTS.MEDIUM);
    console.log('📊 System check result:', response);
    return response;
  } catch (error) {
    console.error('System check failed:', error);
    return {
      timestamp: new Date().toISOString(),
      components: {
        database: { status: 'error', connected: false, message: 'Backend not responding' },
        arduino: { status: 'unknown', connected: false, message: 'Could not check' },
        auto_tare: { status: 'unknown', completed: false, message: 'Could not check' }
      },
      overall_status: 'backend_down',
      system_ready: false,
      can_proceed: false,
      message: 'Backend server is not responding'
    };
  }
};

// ==================== LOGIN API FUNCTIONS ====================

// RFID Login - UPDATED to return proper user data structure
export const loginWithRFID = async (rfidTag) => {
  try {
    console.log(`🎫 Attempting RFID login with tag: ${rfidTag}`);

    const response = await fetchWithTimeout(`${API_URL}/login/login`, {
      method: 'POST',
      body: JSON.stringify({ rfid_tag: rfidTag }),
    }, TIMEOUTS.MEDIUM);

    // Transform backend response to frontend format
    if (response.success && response.user) {
      return {
        success: true,
        message: response.message,
        user: {
          firstName: response.user.firstname || response.user.firstName,
          lastName: response.user.lastname || response.user.lastName,
          age: response.user.age,
          sex: response.user.sex,
          schoolNumber: response.user.school_number || response.user.schoolNumber,
          role: response.user.role,
          email: response.user.email,
          userId: response.user.user_id || response.user.id
        }
      };
    } else {
      return {
        success: false,
        message: response.message
      };
    }

  } catch (error) {
    console.error('❌ RFID login API error:', error);
    return {
      success: false,
      message: error.message || 'Network error. Please try again.'
    };
  }
};

// Manual Credentials Login - UPDATED to return proper user data structure
export const loginWithCredentials = async (schoolNumber, password) => {
  try {
    console.log(`🔑 Attempting manual login with school_number: ${schoolNumber}`);

    const response = await fetchWithTimeout(`${API_URL}/login/login`, {
      method: 'POST',
      body: JSON.stringify({
        school_number: schoolNumber,
        password: password
      }),
    }, TIMEOUTS.MEDIUM);

    // Transform backend response to frontend format
    if (response.success && response.user) {
      return {
        success: true,
        message: response.message,
        user: {
          firstName: response.user.firstname || response.user.firstName,
          lastName: response.user.lastname || response.user.lastName,
          age: response.user.age,
          sex: response.user.sex,
          schoolNumber: response.user.school_number || response.user.schoolNumber,
          role: response.user.role,
          email: response.user.email,
          userId: response.user.user_id || response.user.id
        }
      };
    } else {
      return {
        success: false,
        message: response.message
      };
    }

  } catch (error) {
    console.error('❌ Manual login API error:', error);
    return {
      success: false,
      message: error.message || 'Network error. Please try again.'
    };
  }
};

// Check if user exists by school number
export const checkUserExists = async (schoolNumber) => {
  try {
    console.log(`🔍 Checking if user exists: ${schoolNumber}`);
    return await fetchWithTimeout(`${API_URL}/login/check-user/${schoolNumber}`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Check user API error:', error);
    throw error;
  }
};

// Check if RFID exists
export const checkRfidExists = async (rfidTag) => {
  try {
    console.log(`🔍 Checking if RFID exists: ${rfidTag}`);
    return await fetchWithTimeout(`${API_URL}/login/check-rfid/${rfidTag}`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Check RFID API error:', error);
    throw error;
  }
};

// Test login endpoints
export const testLoginConnection = async () => {
  try {
    console.log('🧪 Testing login connection...');
    return await fetchWithTimeout(`${API_URL}/login/test-login`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Test login connection error:', error);
    throw error;
  }
};

// Legacy login function for backward compatibility
export const loginUser = async (credentials) => {
  try {
    // Determine if it's RFID or manual login
    if (credentials.rfid_tag) {
      return await loginWithRFID(credentials.rfid_tag);
    } else {
      return await loginWithCredentials(credentials.school_number, credentials.password);
    }
  } catch (error) {
    console.error('Login API error:', error);
    throw error;
  }
};

// ==================== AUTHENTICATION UTILITIES ====================

// Store user data after successful login - UPDATED for proper data structure
export const storeUserData = (userData) => {
  try {
    localStorage.setItem('userData', JSON.stringify(userData));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('loginTime', new Date().toISOString());
    console.log('✅ User data stored in localStorage:', {
      firstName: userData.firstName,
      lastName: userData.lastName,
      age: userData.age,
      sex: userData.sex,
      schoolNumber: userData.schoolNumber,
      role: userData.role
    });
    return true;
  } catch (error) {
    console.error('Error storing user data:', error);
    return false;
  }
};

// Get current user data - UPDATED for proper data structure
export const getCurrentUser = () => {
  try {
    const userData = localStorage.getItem('userData');
    const user = userData ? JSON.parse(userData) : null;
    if (user) {
      console.log('📋 Retrieved user from storage:', {
        name: `${user.firstName} ${user.lastName}`,
        age: user.age,
        sex: user.sex,
        role: user.role
      });
    }
    return user;
  } catch (error) {
    console.error('Error getting user data:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  try {
    const authStatus = localStorage.getItem('isAuthenticated');
    const authenticated = authStatus === 'true';
    console.log('🔐 Authentication status:', authenticated);
    return authenticated;
  } catch (error) {
    console.error('Error checking authentication:', error);
    return false;
  }
};

// Logout user
export const logoutUser = () => {
  try {
    const user = getCurrentUser();
    localStorage.removeItem('userData');
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('loginTime');
    console.log('✅ User logged out successfully:', user?.firstName, user?.lastName);
    return true;
  } catch (error) {
    console.error('Error during logout:', error);
    return false;
  }
};

// Get user role for navigation
export const getUserRole = () => {
  const user = getCurrentUser();
  const role = user ? user.role : null;
  console.log('🎭 User role:', role);
  return role;
};

// Get user ID
export const getUserId = () => {
  const user = getCurrentUser();
  return user ? user.userId : null;
};

// Get school number
export const getSchoolNumber = () => {
  const user = getCurrentUser();
  return user ? user.schoolNumber : null;
};

// Get user full name
export const getUserFullName = () => {
  const user = getCurrentUser();
  return user ? `${user.firstName} ${user.lastName}` : null;
};

// Get user first name
export const getUserFirstName = () => {
  const user = getCurrentUser();
  return user ? user.firstName : null;
};

// Get user age
export const getUserAge = () => {
  const user = getCurrentUser();
  return user ? user.age : null;
};

// Get user sex
export const getUserSex = () => {
  const user = getCurrentUser();
  return user ? user.sex : null;
};

// Check if user has specific role
export const hasRole = (role) => {
  const userRole = getUserRole();
  return userRole === role;
};

// Check if user is admin
export const isAdmin = () => hasRole('Admin');

// Check if user is student
export const isStudent = () => hasRole('Student');

// Check if user is employee
export const isEmployee = () => hasRole('Employee');

// Check if user is doctor
export const isDoctor = () => hasRole('Doctor');

// Check if user is nurse
export const isNurse = () => hasRole('Nurse');

// ==================== REGISTRATION API FUNCTIONS ====================

// User registration API call - UPDATED for proper data structure
export const registerUser = async (userData) => {
  try {
    console.log('📤 Sending registration data to backend:', userData);

    const response = await fetchWithTimeout(`${API_URL}/register/register`, {
      method: 'POST',
      body: JSON.stringify({
        first_name: userData.firstName,
        last_name: userData.lastName,
        age: userData.age,
        sex: userData.sex,
        school_number: userData.schoolNumber,
        role: userData.role,
        email: userData.email,
        password: userData.password,
        rfid_number: userData.rfidNumber
      }),
    }, TIMEOUTS.MEDIUM);

    // Transform backend response to frontend format
    if (response.success && response.user) {
      return {
        success: true,
        message: response.message,
        user: {
          firstName: response.user.first_name || response.user.firstName,
          lastName: response.user.last_name || response.user.lastName,
          age: response.user.age,
          sex: response.user.sex,
          schoolNumber: response.user.school_number || response.user.schoolNumber,
          role: response.user.role,
          email: response.user.email,
          userId: response.user.user_id || response.user.id
        }
      };
    } else {
      return {
        success: false,
        message: response.message
      };
    }

  } catch (error) {
    console.error('❌ Registration API error:', error);
    return {
      success: false,
      message: 'Network error. Please try again.'
    };
  }
};

// Check if ID number exists
export const checkIdNumber = async (idNumber, userType) => {
  try {
    console.log(`🔍 Checking if ID exists: ${idNumber} for ${userType}`);
    return await fetchWithTimeout(`${API_URL}/register/check-id`, {
      method: 'POST',
      body: JSON.stringify({ idNumber, userType }),
    }, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('ID check API error:', error);
    throw error;
  }
};

// Test backend connection for registration
export const testRegistrationConnection = async () => {
  try {
    console.log('🧪 Testing registration connection...');
    return await fetchWithTimeout(`${API_URL}/register/test-connection`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Registration connection test failed:', error);
    throw error;
  }
};

// Get all registered users (for testing)
export const getAllUsers = async () => {
  try {
    console.log('📋 Getting all users...');
    return await fetchWithTimeout(`${API_URL}/register/users`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Get users API error:', error);
    throw error;
  }
};

// ==================== USER PROFILE FUNCTIONS ====================

// Get user profile
export const getUserProfile = async (userId) => {
  try {
    console.log(`👤 Getting user profile: ${userId}`);
    return await fetchWithTimeout(`${API_URL}/users/${userId}`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Get user profile API error:', error);
    throw error;
  }
};

// Update user profile
export const updateUserProfile = async (userId, profileData) => {
  try {
    console.log(`✏️ Updating user profile: ${userId}`, profileData);
    return await fetchWithTimeout(`${API_URL}/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(profileData),
    }, TIMEOUTS.MEDIUM);
  } catch (error) {
    console.error('Update user profile API error:', error);
    throw error;
  }
};

// Delete user account
export const deleteUserAccount = async (userId) => {
  try {
    console.log(`🗑️ Deleting user account: ${userId}`);
    return await fetchWithTimeout(`${API_URL}/users/${userId}`, {
      method: 'DELETE',
    }, TIMEOUTS.MEDIUM);
  } catch (error) {
    console.error('Delete user account API error:', error);
    throw error;
  }
};

// ==================== MEASUREMENT DATA FUNCTIONS ====================

// Save measurement results
export const saveMeasurementResults = async (measurementData) => {
  try {
    console.log('💾 Saving measurement results:', measurementData);
    return await fetchWithTimeout(`${API_URL}/measurements/save`, {
      method: 'POST',
      body: JSON.stringify(measurementData),
    }, TIMEOUTS.MEDIUM);
  } catch (error) {
    console.error('Error saving measurement results:', error);
    throw error;
  }
};

// Get measurement history for user
export const getMeasurementHistory = async (userId) => {
  try {
    console.log(`📊 Getting measurement history for user: ${userId}`);
    return await fetchWithTimeout(`${API_URL}/measurements/history/${userId}`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Error getting measurement history:', error);
    throw error;
  }
};

// Get all measurements (admin only)
export const getAllMeasurements = async () => {
  try {
    console.log('📈 Getting all measurements...');
    return await fetchWithTimeout(`${API_URL}/measurements/all`, {}, TIMEOUTS.SHORT);
  } catch (error) {
    console.error('Error getting all measurements:', error);
    throw error;
  }
};

// Delete measurement
export const deleteMeasurement = async (measurementId) => {
  try {
    console.log(`🗑️ Deleting measurement: ${measurementId}`);
    return await fetchWithTimeout(`${API_URL}/measurements/${measurementId}`, {
      method: 'DELETE',
    }, TIMEOUTS.MEDIUM);
  } catch (error) {
    console.error('Error deleting measurement:', error);
    throw error;
  }
};

// ==================== SENSOR API FUNCTIONS ====================

export const sensorAPI = {
  // ==================== CONNECTION & GENERAL ====================

  // Connect to Arduino
  connect: async () => {
    try {
      console.log('🔌 Connecting to Arduino...');
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
      console.log('🔌 Disconnecting from Arduino...');
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
      console.log('📊 Getting sensor status...');
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
      console.log('📈 Getting system status...');
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
      console.log('🚀 Initializing system...');
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

  // Reset all measurements
  reset: async () => {
    try {
      console.log('🔄 Resetting measurements...');
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
      console.log('🔁 Forcing reconnect...');
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
      console.log('📋 Getting all sensor measurements...');
      return await fetchWithTimeout(`${API_URL}/sensor/measurements`, {}, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error getting measurements:', error);
      return {
        error: 'Failed to get measurements',
        details: error.message
      };
    }
  },

  // Shutdown all sensors
  shutdownAll: async () => {
    try {
      console.log('🔴 Shutting down all sensors...');
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

  // ==================== WEIGHT SENSOR ====================
  startWeight: async () => {
    try {
      console.log('⚖️ Starting weight measurement...');
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

  // NEW: Prepare weight sensor
  prepareWeight: async () => {
    try {
      console.log('⚖️ Preparing weight sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/weight/prepare`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error preparing weight sensor:', error);
      return {
        error: 'Failed to prepare weight sensor',
        details: error.message
      };
    }
  },

  // NEW: Shutdown weight sensor
  shutdownWeight: async () => {
    try {
      console.log('⚖️ Shutting down weight sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/weight/shutdown`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error shutting down weight sensor:', error);
      return {
        error: 'Failed to shutdown weight sensor',
        details: error.message
      };
    }
  },

  // ==================== HEIGHT SENSOR ====================
  startHeight: async () => {
    try {
      console.log('📏 Starting height measurement...');
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

  // NEW: Prepare height sensor
  prepareHeight: async () => {
    try {
      console.log('📏 Preparing height sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/height/prepare`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error preparing height sensor:', error);
      return {
        error: 'Failed to prepare height sensor',
        details: error.message
      };
    }
  },

  // NEW: Shutdown height sensor
  shutdownHeight: async () => {
    try {
      console.log('📏 Shutting down height sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/height/shutdown`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error shutting down height sensor:', error);
      return {
        error: 'Failed to shutdown height sensor',
        details: error.message
      };
    }
  },

  // ==================== TEMPERATURE SENSOR ====================
  startTemperature: async () => {
    try {
      console.log('🌡️ Starting temperature measurement...');
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

  // NEW: Prepare temperature sensor
  prepareTemperature: async () => {
    try {
      console.log('🌡️ Preparing temperature sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/temperature/prepare`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error preparing temperature sensor:', error);
      return {
        error: 'Failed to prepare temperature sensor',
        details: error.message
      };
    }
  },

  // NEW: Shutdown temperature sensor
  shutdownTemperature: async () => {
    try {
      console.log('🌡️ Shutting down temperature sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/temperature/shutdown`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error shutting down temperature sensor:', error);
      return {
        error: 'Failed to shutdown temperature sensor',
        details: error.message
      };
    }
  },

  // ==================== MAX30102 SENSOR ====================
  startMax30102: async () => {
    try {
      console.log('❤️ Starting MAX30102 measurement...');
      return await fetchWithTimeout(`${API_URL}/sensor/max30102/start`, {
        method: 'POST',
      }, TIMEOUTS.LONG);
    } catch (error) {
      console.error('Error starting MAX30102 measurement:', error);
      return {
        error: 'Failed to start MAX30102 measurement',
        details: error.message
      };
    }
  },

  getMax30102Status: async () => {
    try {
      return await fetchWithTimeout(`${API_URL}/sensor/max30102/status`, {}, TIMEOUTS.SHORT);
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
        measurement_started: false,
        final_result_shown: false,
        final_results: {
          heart_rate: null,
          spo2: null,
          respiratory_rate: null
        },
        timestamp: new Date().toISOString()
      };
    }
  },

  // NEW: Prepare MAX30102 sensor
  prepareMax30102: async () => {
    try {
      console.log('❤️ Preparing MAX30102 sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/max30102/prepare`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error preparing MAX30102 sensor:', error);
      return {
        error: 'Failed to prepare MAX30102 sensor',
        details: error.message
      };
    }
  },

  // NEW: Shutdown MAX30102 sensor
  shutdownMax30102: async () => {
    try {
      console.log('❤️ Shutting down MAX30102 sensor...');
      return await fetchWithTimeout(`${API_URL}/sensor/max30102/shutdown`, {
        method: 'POST',
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error shutting down MAX30102 sensor:', error);
      return {
        error: 'Failed to shutdown MAX30102 sensor',
        details: error.message
      };
    }
  },

  // Check finger detection
  checkFingerDetection: async () => {
    try {
      console.log('👆 Checking finger detection...');
      const status = await sensorAPI.getMax30102Status();

      return {
        finger_detected: status.finger_detected,
        ir_value: status.ir_value || 0,
        sensor_ready: status.sensor_prepared,
        measurement_started: status.measurement_started,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking finger detection:', error);
      return {
        finger_detected: false,
        ir_value: 0,
        sensor_ready: false,
        measurement_started: false,
        error: error.message
      };
    }
  },
};

export const cameraAPI = {
  start: async () => {
    try {
      console.log('📷 Starting camera...');
      return await fetchWithTimeout(`${API_URL}/camera/start`, { method: 'POST' }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error starting camera:', error);
      return { success: false, message: error.message };
    }
  },

  stop: async () => {
    try {
      console.log('📷 Stopping camera...');
      return await fetchWithTimeout(`${API_URL}/camera/stop`, { method: 'POST' }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error stopping camera:', error);
      return { success: false, message: error.message };
    }
  },

  setMode: async (mode) => {
    try {
      console.log(`📷 Setting camera mode: ${mode}`);
      return await fetchWithTimeout(`${API_URL}/camera/set_mode`, {
        method: 'POST',
        body: JSON.stringify({ mode })
      }, TIMEOUTS.SHORT);
    } catch (error) {
      console.error('Error setting camera mode:', error);
      return { success: false, message: error.message };
    }
  },

  analyzeBP: async () => {
    try {
      console.log('🧠 Analying BP Image with Hybrid AI...');
      // Updated endpoint to use dedicated BP Camera route
      return await fetchWithTimeout(`${API_URL}/bp-camera/analyze-bp-camera`, { method: 'POST' }, TIMEOUTS.MEDIUM);
    } catch (error) {
      console.error('Error analyzing BP:', error);
      return { success: false, message: error.message };
    }
  }
};