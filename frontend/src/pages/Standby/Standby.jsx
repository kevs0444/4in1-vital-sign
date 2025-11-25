// Standby.jsx (updated)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const pollerRef = useRef(null);

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

  useEffect(() => {
    const startStatusPolling = async () => {
      try {
        await sensorAPI.connect();
        setBackendAvailable(true);
      } catch (error) {
        console.log('Backend connection failed, entering offline mode');
        setBackendAvailable(false);
        setSystemStatus('offline_mode');
        return;
      }

      pollerRef.current = setInterval(async () => {
        try {
          const status = await sensorAPI.getSystemStatus();

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
          console.log('Backend polling failed, switching to offline mode');
          setBackendAvailable(false);
          setSystemStatus('offline_mode');
          clearInterval(pollerRef.current);
        }
      }, 2500);
    };

    startStatusPolling();

    return () => {
      if (pollerRef.current) {
        clearInterval(pollerRef.current);
      }
    };
  }, []);

  const handleStartPress = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      // ✅ Navigate to login page instead of measurement welcome
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
        return 'Arduino Connected - Waiting for Auto-Tare...';
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