import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Circle, CheckCircle, Error } from '@mui/icons-material';
import logo from '../../assets/images/juan.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Standby.css';
import { checkBackendStatus, sensorAPI } from '../../utils/api';

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const [sensorStatus, setSensorStatus] = useState('disconnected');
  const navigate = useNavigate();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Backend and sensor status check - OPTIMIZED FETCHING
  useEffect(() => {
    let intervalId;
    let isMounted = true;

    const checkStatus = async () => {
      if (!isMounted) return;

      try {
        // 1. First check if backend is running
        const backendData = await checkBackendStatus();
        
        if (backendData.status === 'connected' && isMounted) {
          setBackendStatus('connected');
          
          // 2. If backend is connected, check sensor status
          try {
            const sensorData = await sensorAPI.getStatus();
            
            if (sensorData.connected && isMounted) {
              setSensorStatus('connected');
              // Stop checking when everything is connected
              if (intervalId) {
                clearInterval(intervalId);
              }
            } else if (isMounted) {
              setSensorStatus('disconnected');
              
              // Try to connect to sensors with Windows ports
              const portsToTry = getWindowsPorts();
              let connected = false;
              
              for (const port of portsToTry) {
                if (connected) break;
                
                try {
                  const connectResult = await sensorAPI.connect(port);
                  if (connectResult.connected) {
                    setSensorStatus('connected');
                    connected = true;
                    // Stop checking when connected
                    if (intervalId) {
                      clearInterval(intervalId);
                    }
                    break;
                  }
                } catch (portError) {
                  console.log(`Failed to connect to ${port}`);
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
              }
              
              if (!connected && isMounted) {
                setSensorStatus('error');
              }
            }
          } catch (sensorError) {
            if (isMounted) {
              setSensorStatus('error');
            }
          }
        } else if (isMounted) {
          setBackendStatus('error');
          setSensorStatus('disconnected');
        }
      } catch (error) {
        if (isMounted) {
          setBackendStatus('error');
          setSensorStatus('disconnected');
        }
      }
    };

    // Start checking immediately
    checkStatus();

    // Only set up interval if not everything is connected yet
    if (backendStatus !== 'connected' || sensorStatus !== 'connected') {
      intervalId = setInterval(checkStatus, 2000); // Check every 2 seconds when errors
    }

    return () => {
      isMounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []); // Empty dependency array - run only once on mount

  // Get common Windows Arduino ports
  const getWindowsPorts = () => {
    return ['COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'];
  };

  const handleStartPress = () => {
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      navigate('/welcome');
    }, 200);
  };

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });

  const formatDate = (date) =>
    date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

  const getStatusIcon = () => {
    if (backendStatus === 'connected' && sensorStatus === 'connected') {
      return <CheckCircle className="standby-status-icon connected" />;
    } else if (backendStatus === 'error' || sensorStatus === 'error') {
      return <Error className="standby-status-icon error" />;
    } else {
      return <Circle className="standby-status-icon checking" />;
    }
  };

  const getStatusText = () => {
    if (backendStatus === 'connected' && sensorStatus === 'connected') {
      return 'System Ready';
    } else if (backendStatus === 'connected' && sensorStatus === 'disconnected') {
      return 'Searching for Sensors...';
    } else if (backendStatus === 'connected' && sensorStatus === 'checking') {
      return 'Checking Sensors...';
    } else if (backendStatus === 'connected' && sensorStatus === 'error') {
      return 'Sensors Not Found';
    } else if (backendStatus === 'error') {
      return 'Backend Not Connected';
    } else {
      return 'Checking System...';
    }
  };

  const getStatusClass = () => {
    if (backendStatus === 'connected' && sensorStatus === 'connected') {
      return 'connected';
    } else if (backendStatus === 'error' || sensorStatus === 'error') {
      return 'error';
    } else {
      return 'checking';
    }
  };

  return (
    <Container fluid className="standby-container">
      {/* System Status - Only one status indicator */}
      <motion.div
        className="standby-backend-status"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`standby-status-indicator ${getStatusClass()}`}>
          {getStatusIcon()}
          <span className="standby-status-text">{getStatusText()}</span>
        </div>
      </motion.div>

      <Row className="justify-content-center align-items-center h-100">
        <Col xs={12} className="text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            {/* Main Content Container */}
            <div className="standby-main-content-container">
              {/* Logo Section */}
              <div className="standby-logo-section">
                <div className="standby-logo-main-circle">
                  <img src={logo} alt="4 in Juan Logo" className="standby-juan-logo" />
                </div>
              </div>

              {/* Title Section */}
              <div className="standby-title-section">
                <h1 className="standby-main-title">
                  4 in <span className="standby-juan-red">Juan</span> Vital Kiosk
                </h1>
                <p className="standby-motto">
                  Making health accessible to every<span className="standby-juan-red">Juan</span>
                </p>
              </div>

              {/* Time Display */}
              <div className="standby-time-display">
                <div className="standby-current-time">
                  {formatTime(currentTime)}
                </div>
                <div className="standby-current-date">
                  {formatDate(currentTime)}
                </div>
              </div>

              {/* Start Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
              >
                <Button
                  onClick={handleStartPress}
                  onTouchStart={() => setIsPressed(true)}
                  onTouchEnd={() => setIsPressed(false)}
                  className={`standby-start-button ${isPressed ? 'pressed' : ''}`}
                  size="lg"
                >
                  <span className="standby-button-content">
                    Touch this to Start
                  </span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </Col>a
      </Row>
    </Container>
  );
}