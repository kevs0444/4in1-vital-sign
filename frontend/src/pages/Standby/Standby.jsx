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
  const [systemStatus, setSystemStatus] = useState('checking'); // 'checking', 'connected', or 'error'
  const navigate = useNavigate();

  const pollerRef = useRef(null);

  // Effect for updating the clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Effect for handling the connection logic
  useEffect(() => {
    // This function tells the backend to start its auto-scanning process
    const attemptConnection = async () => {
      try {
        const result = await sensorAPI.connect(); // Backend does the hard work
        if (result.connected) {
          setSystemStatus('connected');
          if (pollerRef.current) clearInterval(pollerRef.current); // Stop polling on success
        } else {
          setSystemStatus('error');
        }
      } catch (e) {
        setSystemStatus('error');
      }
    };

    // This function checks if we are already connected when the page loads
    const checkInitialStatus = async () => {
        const status = await sensorAPI.getStatus();
        if (status.connected) {
            setSystemStatus('connected');
        } else {
            // If not connected, start the connection attempt
            attemptConnection();
            // If the first attempt fails, keep trying every 5 seconds
            pollerRef.current = setInterval(attemptConnection, 5000);
        }
    };

    checkInitialStatus();

    // Cleanup function to stop the poller if the user navigates away
    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
    };
  }, []); // Empty array means this runs only once when the component mounts

  const handleStartPress = () => {
    if (systemStatus !== 'connected') {
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

  const getStatusIcon = (status) => {
    if (status === 'connected') return <CheckCircle className="standby-status-icon connected" />;
    if (status === 'error') return <Error className="standby-status-icon error" />;
    return <Circle className="standby-status-icon checking" />;
  };

  const getStatusText = (status) => {
    if (status === 'connected') return 'System Ready';
    if (status === 'error') return 'Sensors Not Found';
    return 'Connecting to Sensors...';
  };

  return (
    <Container fluid className="standby-container">
      <motion.div className="standby-backend-status">
        <div className={`standby-status-indicator ${systemStatus}`}>
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
              disabled={systemStatus !== 'connected'}
            >
              <span className="standby-button-content">
                {systemStatus === 'connected' ? 'Touch this to Start' : 'System Not Ready'}
              </span>
            </Button>
          </div>
        </Col>
      </Row>
    </Container>
  );
}