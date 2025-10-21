import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Circle, CheckCircle, Error } from '@mui/icons-material';
import logo from '../../assets/images/juan.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Standby.css';
import { sensorAPI } from '../../utils/api';

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const [systemStatus, setSystemStatus] = useState('checking_backend'); // 'checking_backend', 'backend_down', 'connecting_arduino', 'calibrating_weight', 'ready'
  const navigate = useNavigate();

  const pollerRef = useRef(null);

  // Effect for updating the clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const startStatusPolling = async () => {
      // Immediately try to connect. The backend is smart enough to handle this.
      await sensorAPI.connect();
      // Set up an interval to continuously check the system status.
      pollerRef.current = setInterval(async () => {
        try {
          const status = await sensorAPI.getSystemStatus();
          
          if (status.connected && status.sensors_ready.weight) {
            setSystemStatus('ready'); // Arduino connected, weight sensor ready
          } else if (status.connection_established) { // Backend has connected to Arduino, but weight sensor is not ready
            setSystemStatus('calibrating_weight'); 
          } else {
            // Backend is running but has not yet established a connection with the Arduino.
            setSystemStatus('connecting_arduino'); 
          }
        } catch (e) {
          setSystemStatus('backend_down');
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
  }, []); // Empty dependency array ensures this runs only once on mount.

  const handleStartPress = () => {
    if (systemStatus !== 'ready') {
      alert("System is not ready. Please check the sensor connection.");
      return;
    }
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      navigate('/welcome');
    }, 200);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const getStatusIcon = (currentSystemStatus) => {
    if (currentSystemStatus === 'ready') return <CheckCircle className="standby-status-icon connected" />;
    if (currentSystemStatus === 'backend_down' || currentSystemStatus === 'connecting_arduino') return <Error className="standby-status-icon error" />;
    return <Circle className="standby-status-icon checking" />;
  };

  const getStatusText = (currentSystemStatus) => {
    if (currentSystemStatus === 'backend_down') return 'Backend Not Connected';
    if (currentSystemStatus === 'ready') return 'System Ready';
    if (currentSystemStatus === 'calibrating_weight') return 'Calibrating Weight Sensor...';
    if (currentSystemStatus === 'connecting_arduino') return 'Connecting to Arduino...';
    return 'Checking System...'; // Default for 'checking_backend'
  };

  const isStartButtonEnabled = systemStatus === 'ready';

  return (
    <Container fluid className="standby-container">
      <motion.div className="standby-backend-status">
        <div className={`standby-status-indicator ${systemStatus === 'ready' ? 'connected' : (systemStatus === 'backend_down' || systemStatus === 'connecting_arduino' ? 'error' : 'checking')}`}>
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
                {isStartButtonEnabled ? 'Touch this to Start' : getStatusText(systemStatus)}
              </span>
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}
