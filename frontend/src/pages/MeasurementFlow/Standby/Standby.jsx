import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Circle, CheckCircle, Error, Warning } from '@mui/icons-material';
import logo from '../../assets/images/juan.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Standby.css';
import { sensorAPI } from '../../../utils/api';

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking_backend'); // 'checking_backend', 'backend_down', 'connecting_arduino', 'calibrating_weight', 'ready', 'offline_mode'
  const [backendAvailable, setBackendAvailable] = useState(false);
  const navigate = useNavigate();

  const pollerRef = useRef(null);

  // Effect for updating the clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const startStatusPolling = async () => {
      try {
        // Try to connect to backend
        await sensorAPI.connect();
        setBackendAvailable(true);
      } catch (error) {
        console.log('Backend connection failed, entering offline mode');
        setBackendAvailable(false);
        setSystemStatus('offline_mode');
        return; // Stop further polling if backend is not available
      }

      // Set up an interval to continuously check the system status only if backend is available
      pollerRef.current = setInterval(async () => {
        try {
          const status = await sensorAPI.getSystemStatus();

          if (status.connected && status.sensors_ready.weight) {
            setSystemStatus('ready');
          } else {
            setSystemStatus('connecting_arduino'); 
          }
        } catch (error) {
          console.log('Backend polling failed, switching to offline mode');
          setBackendAvailable(false);
          setSystemStatus('offline_mode');
          clearInterval(pollerRef.current); // Stop polling if backend becomes unavailable
        }
      }, 2500); // Poll every 2.5 seconds
    };

    startStatusPolling();

    // Cleanup function to stop the poller when the component unmounts.
    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
      }
    };
  }, []);

  const handleStartPress = () => {
    // Allow navigation even if backend is not available
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      
      // Navigate directly to MeasurementTapID instead of Welcome
      navigate('/measurement-tap-id', { 
        state: { 
          backendAvailable,
          systemStatus 
        } 
      });
    }, 200);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getStatusIcon = (currentSystemStatus) => {
    if (currentSystemStatus === 'ready') return <CheckCircle className="standby-status-icon connected" />;
    if (currentSystemStatus === 'offline_mode') return <Warning className="standby-status-icon warning" />;
    if (currentSystemStatus === 'backend_down' || currentSystemStatus === 'connecting_arduino') return <Error className="standby-status-icon error" />;
    return <Circle className="standby-status-icon checking" />;
  };

  const getStatusText = (currentSystemStatus) => {
    switch (currentSystemStatus) {
      case 'backend_down':
        return 'Backend Not Connected';
      case 'ready':
        return 'System Ready';
      case 'connecting_arduino':
        return 'Connecting to System...';
      case 'offline_mode':
        return 'Offline Mode - Manual Input Available';
      default:
        return 'Checking System...';
    }
  };

  const getButtonText = () => {
    if (systemStatus === 'offline_mode') {
      return 'Start in Offline Mode';
    }
    return systemStatus === 'ready' ? 'Touch this to Start' : 'Touch to Start Anyway';
  };

  // Button is always enabled now
  const isStartButtonEnabled = true;

  return (
    <Container fluid className="standby-container">
      <motion.div className="standby-backend-status">
        <div className={`standby-status-indicator ${
          systemStatus === 'ready' ? 'connected' : 
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
            
            {/* Offline mode information */}
            {systemStatus === 'offline_mode' && (
              <div className="standby-offline-info">
                <p style={{ color: '#666', fontSize: '0.9rem', marginTop: '1rem' }}>
                  You can still proceed with manual measurements
                </p>
              </div>
            )}
          </div>
        </Col>
      </Row>
    </Container>
  );
}