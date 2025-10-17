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
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const navigate = useNavigate();

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Backend and sensor status check - IMPROVED FOR WINDOWS
  useEffect(() => {
    let timeoutId;
    let isMounted = true;

    const checkStatus = async (retryCount = 0) => {
      if (!isMounted) return;

      try {
        console.log('🔍 Checking backend status...');
        
        // 1. First check if backend is running
        const backendData = await checkBackendStatus();
        
        if (backendData.status === 'connected' && isMounted) {
          setBackendStatus('connected');
          
          // 2. If backend is connected, check sensor status
          try {
            const sensorData = await sensorAPI.getStatus();
            console.log('📡 Sensor status:', sensorData);
            
            if (sensorData.connected && isMounted) {
              setSensorStatus('connected');
              setConnectionAttempts(0); // Reset attempts on success
            } else if (isMounted) {
              setSensorStatus('disconnected');
              
              // Try to connect to sensors with Windows ports
              const portsToTry = getWindowsPorts();
              let connected = false;
              
              for (const port of portsToTry) {
                if (connected) break;
                
                console.log(`🔄 Trying to connect to ${port}...`);
                try {
                  const connectResult = await sensorAPI.connect(port);
                  if (connectResult.connected) {
                    console.log(`✅ Connected to Arduino on ${port}`);
                    setSensorStatus('connected');
                    connected = true;
                    setConnectionAttempts(0);
                    break;
                  }
                } catch (portError) {
                  console.log(`❌ Failed to connect to ${port}:`, portError.message);
                }
                
                // Small delay between port attempts
                await new Promise(resolve => setTimeout(resolve, 500));
              }
              
              if (!connected && isMounted) {
                setSensorStatus('error');
                setConnectionAttempts(prev => prev + 1);
              }
            }
          } catch (sensorError) {
            console.error('Sensor check failed:', sensorError);
            if (isMounted) {
              setSensorStatus('error');
              setConnectionAttempts(prev => prev + 1);
            }
          }
        } else if (isMounted) {
          setBackendStatus('error');
          setSensorStatus('disconnected');
        }
      } catch (error) {
        console.error('Status check failed:', error);
        if (isMounted) {
          setBackendStatus('error');
          setSensorStatus('disconnected');
        }
      }

      // Retry logic with increasing delays for sensor connection
      if (isMounted) {
        const baseDelay = backendStatus === 'connected' ? 10000 : 5000;
        const sensorRetryDelay = Math.min(2000 * (connectionAttempts + 1), 15000);
        const delay = Math.max(baseDelay, sensorRetryDelay);
        
        timeoutId = setTimeout(() => checkStatus(retryCount + 1), delay);
      }
    };

    checkStatus();
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [backendStatus, connectionAttempts]);

  // Get common Windows Arduino ports
  const getWindowsPorts = () => {
    return ['COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8'];
  };

  const handleStartPress = () => {
    if (backendStatus !== 'connected') {
      alert('Backend is not connected. Please check if the Flask server is running.');
      return;
    }
    
    if (sensorStatus !== 'connected') {
      alert('Sensors are not connected. Please check if Arduino is plugged in.');
      return;
    }
    
    setIsPressed(true);
    setTimeout(() => {
      setIsPressed(false);
      navigate('/welcome');
    }, 200);
  };

  const handleManualRetry = async () => {
    setSensorStatus('checking');
    setConnectionAttempts(0);
    
    // Force re-check immediately
    const portsToTry = getWindowsPorts();
    let connected = false;
    
    for (const port of portsToTry) {
      if (connected) break;
      
      console.log(`🔄 Manual retry: Trying ${port}...`);
      try {
        const connectResult = await sensorAPI.connect(port);
        if (connectResult.connected) {
          console.log(`✅ Connected to Arduino on ${port}`);
          setSensorStatus('connected');
          connected = true;
          break;
        }
      } catch (portError) {
        console.log(`❌ Failed to connect to ${port}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    if (!connected) {
      setSensorStatus('error');
    }
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

  const isStartButtonEnabled = backendStatus === 'connected' && sensorStatus === 'connected';

  return (
    <Container fluid className="standby-container">
      {/* System Status */}
      <motion.div
        className="standby-backend-status"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`standby-status-indicator ${getStatusClass()}`}>
          {getStatusIcon()}
          <span className="standby-status-text">{getStatusText()}</span>
          {(sensorStatus === 'error' || sensorStatus === 'disconnected') && (
            <button 
              className="standby-retry-button"
              onClick={handleManualRetry}
              style={{
                marginLeft: '10px',
                padding: '2px 8px',
                fontSize: '12px',
                background: '#007bff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Retry
            </button>
          )}
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
                  className={`standby-start-button ${isPressed ? 'pressed' : ''} ${!isStartButtonEnabled ? 'disabled' : ''}`}
                  size="lg"
                  disabled={!isStartButtonEnabled}
                >
                  <span className="standby-button-content">
                    {isStartButtonEnabled ? 'Touch this to Start' : 'System Starting...'}
                  </span>
                </Button>
              </motion.div>

              {/* Connection Instructions */}
              {(sensorStatus === 'error' || sensorStatus === 'disconnected') && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="standby-connection-help"
                >
                  <p style={{ color: '#dc3545', fontSize: '14px', marginTop: '10px' }}>
                    💡 Make sure Arduino is plugged in via USB
                  </p>
                </motion.div>
              )}

              {/* Debug Info - Remove in production */}
              <div style={{ marginTop: '20px', fontSize: '12px', color: '#666' }}>
                <div>Backend: {backendStatus}</div>
                <div>Sensors: {sensorStatus}</div>
                <div>Connection Attempts: {connectionAttempts}</div>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}