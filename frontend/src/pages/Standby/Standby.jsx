// Standby.jsx - Dual Mode: Status Badge (Kiosk) | Landing Page (Remote)
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Button, Card } from 'react-bootstrap';
import { motion } from 'framer-motion';
import {
  Circle,
  CheckCircle,
  Error,
  Warning,
  Dashboard as DashboardIcon,
  Login as LoginIcon
} from '@mui/icons-material';
import logo from '../../assets/images/juan.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Standby.css';
import { checkSystemStatus, sensorAPI } from '../../utils/api';
import { isLocalDevice } from '../../utils/network';

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);

  // System status state
  const [systemCheck, setSystemCheck] = useState({
    overall_status: 'checking',
    system_ready: false,
    can_proceed: false,
    message: 'Initializing system...',
    components: {
      database: { connected: false },
      arduino: { connected: false, port: null },
      auto_tare: { completed: false }
    }
  });

  const [isConnecting, setIsConnecting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const pollerRef = useRef(null);
  const initialCheckDone = useRef(false);

  // Effect for preventing zoom and controlling viewport
  useEffect(() => {
    const preventZoom = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const preventContextMenu = (e) => {
      e.preventDefault();
    };

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('contextmenu', preventContextMenu);
    };
  }, []);

  // Effect for updating the clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if we're coming from Sharing page with reset flag OR from inactivity
  useEffect(() => {
    if (location.state?.fromSharing && location.state?.reset) {
      console.log('🔄 System reset detected from Sharing - ready for new user');
      initialCheckDone.current = false;
    }

    // Handle inactivity redirect - ensure full reset
    if (location.state?.fromInactivity) {
      console.log('⏰ Returned from inactivity - triggering full sensor reset');
      initialCheckDone.current = false;
    }
  }, [location.state]);

  // CRITICAL: Clear ALL measurement data when Standby loads
  // This ensures a fresh start for every new user
  useEffect(() => {
    const clearAllMeasurementData = async () => {
      console.log('🧹 Standby: Clearing all measurement data for new user...');

      // 1. Clear localStorage
      localStorage.removeItem('currentUser');
      localStorage.removeItem('measurementData');
      localStorage.removeItem('vitalSignsData');
      localStorage.removeItem('bmiData');
      localStorage.removeItem('temperatureData');
      localStorage.removeItem('bloodPressureData');
      localStorage.removeItem('max30102Data');

      // 2. Clear sessionStorage
      sessionStorage.removeItem('currentUser');
      sessionStorage.removeItem('measurementData');
      sessionStorage.removeItem('vitalSignsData');
      sessionStorage.removeItem('bmiData');
      sessionStorage.removeItem('temperatureData');
      sessionStorage.removeItem('bloodPressureData');
      sessionStorage.removeItem('max30102Data');

      // 3. Reset sensors on backend (if connected) - ONLY FOR LOCAL COMPONENT
      if (isLocalDevice()) {
        try {
          await sensorAPI.reset();
          console.log('✅ Backend sensor data reset');
        } catch (error) {
          console.log('ℹ️ Backend reset skipped (may not be connected yet)');
        }
      }

      console.log('✅ All measurement data cleared - ready for new user');
    };

    clearAllMeasurementData();
  }, []); // Run once on mount

  // Perform comprehensive system check
  const performSystemCheck = useCallback(async () => {
    // console.log('🔍 Performing comprehensive system check...');

    try {
      const status = await checkSystemStatus();
      // console.log('📊 System check result:', status);

      setSystemCheck(status);

      // If Arduino is not connected and we haven't tried connecting, attempt connection
      // ONLY LOCAL DEVICE SHOULD ATTEMPT TO CONNECT SENSORS
      if (isLocalDevice() && !status.components.arduino.connected && !isConnecting) {
        console.log('🔌 Arduino not connected - attempting connection...');
        setIsConnecting(true);

        try {
          const connectResult = await sensorAPI.connect();
          console.log('📡 Connection result:', connectResult);

          // Re-check system status after connection attempt
          const newStatus = await checkSystemStatus();
          setSystemCheck(newStatus);
        } catch (connectError) {
          console.log('⚠️ Connection attempt failed:', connectError.message);
        } finally {
          setIsConnecting(false);
        }
      }

      return status;
    } catch (error) {
      console.error('❌ System check failed:', error);
      setSystemCheck(prev => ({
        ...prev,
        overall_status: 'backend_down',
        can_proceed: false,
        message: 'Backend server not responding'
      }));
      return null;
    }
  }, [isConnecting]);

  // Initial system check and polling
  useEffect(() => {
    if (!initialCheckDone.current) {
      initialCheckDone.current = true;
      performSystemCheck();
    }

    // Start polling for system status updates
    pollerRef.current = setInterval(async () => {
      await performSystemCheck();
    }, 3000);

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
    };
  }, [performSystemCheck]);

  const handleStartPress = () => {
    // Check if user can proceed
    if (!systemCheck.can_proceed) {
      console.log('❌ Cannot proceed - system not ready');
      return;
    }

    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      // Clear any residual data before going to login
      localStorage.removeItem('currentUser');
      sessionStorage.removeItem('currentUser');
      console.log('🧹 Cleared residual data - navigating to login');
      navigate('/login');
    }, 200);
  };

  const handleRemoteAccess = () => {
    // Direct navigation for remote users
    navigate('/login');
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  // Get status indicator class
  const getStatusClass = () => {
    const status = systemCheck.overall_status;
    switch (status) {
      case 'ready':
        return 'connected';
      case 'waiting_auto_tare':
      case 'checking':
        return 'checking';
      case 'offline_mode':
        return 'warning';
      case 'database_error':
      case 'backend_down':
      case 'critical_error':
        return 'error';
      default:
        return 'checking';
    }
  };

  // Get overall status icon
  const getStatusIcon = () => {
    const status = systemCheck.overall_status;

    if (status === 'ready') {
      return <CheckCircle className="standby-status-icon connected" />;
    } else if (status === 'waiting_auto_tare' || status === 'checking') {
      return <Circle className="standby-status-icon checking" />;
    } else if (status === 'offline_mode') {
      return <Warning className="standby-status-icon warning" />;
    } else {
      return <Error className="standby-status-icon error" />;
    }
  };

  // Get overall status text
  const getStatusText = () => {
    const status = systemCheck.overall_status;

    switch (status) {
      case 'ready':
        return 'System Ready';
      case 'waiting_auto_tare':
        return 'Calibrating...';
      case 'checking':
        return 'Checking System...';
      case 'offline_mode':
        return 'Offline Mode';
      case 'database_error':
        return 'Database Error';
      case 'backend_down':
        return 'Backend Online'; // Keep as online if accessible for remote landing
      case 'critical_error':
        return 'System Error';
      default:
        return 'Checking...';
    }
  };

  // Get button text based on system status
  const getButtonText = () => {
    if (systemCheck.overall_status === 'backend_down') {
      return 'System Unavailable';
    } else if (systemCheck.overall_status === 'database_error') {
      return 'Database Error';
    } else if (!systemCheck.can_proceed) {
      return 'Initializing...';
    } else if (systemCheck.overall_status === 'offline_mode') {
      return 'Start (Offline)';
    } else {
      return 'Touch to Start';
    }
  };

  const isStartButtonEnabled = systemCheck.can_proceed;

  /* =========================================
     RENDER LOGIC: DISTINGUISH KIOSK VS REMOTE
     ========================================= */



  // 2. KIOSK DEVICE (Mini PC) - Original Standby UI
  return (
    <div className="standby-container container-fluid">
      {/* Simple Status Badge - Top Right */}
      <motion.div
        className="standby-backend-status"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className={`standby-status-indicator ${getStatusClass()}`}>
          {getStatusIcon()}
          <span className="standby-status-text">{getStatusText()}</span>
        </div>
      </motion.div>

      <Row className="justify-content-center align-items-center h-100">
        <Col xs={12} className="text-center">
          <div className="standby-main-content-container">
            <div className="standby-logo-section">
              <div className="standby-logo-main-circle">
                <img src={logo} alt="4 in Juan Logo" className="standby-juan-logo" />
              </div>
            </div>
            <div className="standby-title-section">
              <h1 className="standby-main-title">4 in <span className="standby-juan-red">Juan</span> Vital Kiosk</h1>
              <p className="standby-motto">Making health accessible to every<span className="standby-juan-red">Juan</span></p>
            </div>
            <div className="standby-time-display">
              <div className="standby-current-time">{formatTime(currentTime)}</div>
              <div className="standby-current-date">{formatDate(currentTime)}</div>
            </div>
            <Button
              onClick={handleStartPress}
              onTouchStart={() => setIsPressed(true)}
              onTouchEnd={() => setIsPressed(false)}
              className={`standby-start-button ${isPressed ? 'pressed' : ''} ${!isStartButtonEnabled ? 'disabled' : ''}`}
              disabled={!isStartButtonEnabled}
            >
              <span className="standby-button-content">
                {getButtonText()}
              </span>
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
}