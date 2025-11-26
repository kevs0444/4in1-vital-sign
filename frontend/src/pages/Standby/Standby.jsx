// Standby.jsx (updated with reset detection)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Circle, CheckCircle, Error, Warning } from '@mui/icons-material';
import logo from '../../assets/images/juan.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Standby.css';
import { sensorAPI } from '../../utils/api';

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking_backend');
  const [backendAvailable, setBackendAvailable] = useState(false);
  const [isAlreadyConnected, setIsAlreadyConnected] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const pollerRef = useRef(null);
  const connectionAttempted = useRef(false);

  // Effect for preventing zoom and controlling viewport
  useEffect(() => {
    // Prevent zooming via viewport meta tag simulation
    const preventZoom = (e) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };

    // Prevent context menu (right click)
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

  // Check if we're coming from Sharing page with reset flag
  useEffect(() => {
    if (location.state?.fromSharing && location.state?.reset) {
      console.log('🔄 System reset detected - ready for new user');
      // Perform any additional reset actions here if needed
    }
  }, [location.state]);

  // FIXED: Improved connection polling that checks if already connected first
  useEffect(() => {
    console.log('🔄 Standby component mounted - Checking connection status');

    // Prevent multiple connection attempts
    if (connectionAttempted.current) {
      console.log('⚡ Connection already attempted, skipping reconnection');
      return;
    }

    const startStatusPolling = async () => {
      connectionAttempted.current = true;

      // Clear any existing poller first
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }

      try {
        setSystemStatus('checking_backend');

        // First, check if we're already connected without trying to reconnect
        console.log('🔍 Checking current system status...');
        const currentStatus = await sensorAPI.getSystemStatus();
        console.log('📊 Current system status:', currentStatus);

        if (currentStatus.connected) {
          console.log('✅ Already connected to Arduino - skipping reconnection');
          setIsAlreadyConnected(true);

          if (currentStatus.auto_tare_completed) {
            setSystemStatus('ready');
            setBackendAvailable(true);
          } else {
            setSystemStatus('waiting_for_auto_tare');
            setBackendAvailable(true);
          }
        } else {
          // Only attempt connection if not already connected
          console.log('🔌 Not connected - attempting Arduino connection...');
          console.log('⏳ Step 1: Connecting to Arduino...');

          const connectResult = await sensorAPI.connect();
          console.log('📡 Arduino connection result:', connectResult);

          if (connectResult.connected) {
            console.log('✅ Step 1 Complete: Arduino connected to', connectResult.port);
            console.log('⏳ Step 2: Waiting for auto-tare to complete...');

            if (connectResult.auto_tare_completed) {
              console.log('✅ Step 2 Complete: Auto-tare already done');
              setSystemStatus('ready');
            } else {
              console.log('⏳ Auto-tare in progress...');
              setSystemStatus('waiting_for_auto_tare');
            }

            setBackendAvailable(true);
            console.log('✅ Arduino and sensors initialized successfully');
          } else {
            console.log('❌ Failed to connect to Arduino');
            setSystemStatus('offline_mode');
          }
        }
      } catch (error) {
        console.log('❌ Connection check failed:', error.message);

        // Check if it's a permission error (already connected)
        if (error.message.includes('Access is denied') || error.message.includes('COM3')) {
          console.log('⚡ Port COM3 already in use - assuming connected');
          setIsAlreadyConnected(true);
          setBackendAvailable(true);
          setSystemStatus('waiting_for_auto_tare');
        } else {
          console.log('🔌 Entering offline mode');
          setBackendAvailable(false);
          setSystemStatus('offline_mode');
        }
        return;
      }

      // Start polling for system status updates
      pollerRef.current = setInterval(async () => {
        try {
          const status = await sensorAPI.getSystemStatus();
          console.log('📊 System status update:', status);

          if (status.connected) {
            if (status.auto_tare_completed) {
              setSystemStatus('ready');
            } else {
              setSystemStatus('waiting_for_auto_tare');
            }
          } else {
            setSystemStatus('connecting_arduino');
          }
        } catch (error) {
          console.log('⚠️ Status polling failed:', error.message);

          // If we were previously connected, maintain connection state
          if (!isAlreadyConnected) {
            setBackendAvailable(false);
            setSystemStatus('offline_mode');
          }

          if (pollerRef.current) {
            clearInterval(pollerRef.current);
            pollerRef.current = null;
          }
        }
      }, 3000); // Increased to 3 seconds to reduce load
    };

    startStatusPolling();

    // Cleanup function - clear interval when component unmounts
    return () => {
      console.log('🧹 Standby component unmounting - Cleaning up poller');
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
        pollerRef.current = null;
      }
      // Don't reset connectionAttempted here - we want to remember we tried
    };
  }, [isAlreadyConnected]); // Only re-run if connection state changes

  const handleStartPress = () => {
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

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getStatusIcon = (currentSystemStatus) => {
    if (currentSystemStatus === 'ready') return <CheckCircle className="standby-status-icon connected" />;
    if (currentSystemStatus === 'waiting_for_auto_tare') return <Circle className="standby-status-icon checking" />;
    if (currentSystemStatus === 'offline_mode') return <Warning className="standby-status-icon warning" />;
    if (currentSystemStatus === 'backend_down' || currentSystemStatus === 'connecting_arduino') return <Error className="standby-status-icon error" />;
    return <Circle className="standby-status-icon checking" />;
  };

  const getStatusText = (currentSystemStatus) => {
    switch (currentSystemStatus) {
      case 'backend_down':
        return 'Backend Not Connected';
      case 'ready':
        return 'System Ready - Auto-Tare Completed';
      case 'waiting_for_auto_tare':
        return isAlreadyConnected ? 'System Connected - Auto-Tare in Progress...' : 'Arduino Connected - Waiting for Auto-Tare...';
      case 'connecting_arduino':
        return 'Connecting to System...';
      case 'offline_mode':
        return 'Offline Mode - Manual Input Available';
      default:
        return 'Checking System...';
    }
  };

  const getButtonText = () => {
    return 'Touch to Start';
  };

  const isStartButtonEnabled = true;

  return (
    <Container fluid className="standby-container">
      <motion.div className="standby-backend-status">
        <div className={`standby-status-indicator ${systemStatus === 'ready' ? 'connected' :
          systemStatus === 'offline_mode' ? 'warning' :
            (systemStatus === 'backend_down' || systemStatus === 'connecting_arduino') ? 'error' : 'checking'
          }`}>
          {getStatusIcon(systemStatus)}
          <span className="standby-status-text">{getStatusText(systemStatus)}</span>
        </div>
      </motion.div>

      <Row className="justify-content-center align-items-center h-100">
        <Col xs={12} className="text-center">
          <div className="standby-main-content-container">
            <div className="standby-logo-section">
              <img src={logo} alt="4 in Juan Logo" className="standby-juan-logo" />
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
              className={`standby-start-button ${isPressed ? 'pressed' : ''}`}
              disabled={!isStartButtonEnabled}
            >
              <span className="standby-button-content">
                {getButtonText()}
              </span>
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}