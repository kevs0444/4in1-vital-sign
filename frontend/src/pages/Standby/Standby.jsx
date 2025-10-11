import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Container, Row, Col, Button } from 'react-bootstrap';
import { motion } from 'framer-motion';
import { Circle, CheckCircle, Error } from '@mui/icons-material';
import logo from '../../assets/images/juan.png';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Standby.css';
import { checkBackendStatus } from '../../utils/api'; // Import the function

export default function Standby() {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isPressed, setIsPressed] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');
  const navigate = useNavigate();

  // Backend status check - UPDATED
  useEffect(() => {
    let timeoutId;

    const checkStatus = async (retryCount = 0) => {
      try {
        const data = await checkBackendStatus();
        setBackendStatus(data.status === 'connected' ? 'connected' : 'error');
      } catch (error) {
        setBackendStatus('error');
      }

      const delay = backendStatus === 'error' ? Math.min(1000 * 2 ** retryCount, 8000) : 30000;
      timeoutId = setTimeout(() => checkStatus(retryCount + 1), delay);
    };

    checkStatus();
    return () => clearTimeout(timeoutId);
  }, [backendStatus]);

  // Rest of the component remains the same...
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
      second: '2-digit',
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
    switch (backendStatus) {
      case 'connected':
        return <CheckCircle className="standby-status-icon connected" />;
      case 'error':
        return <Error className="standby-status-icon error" />;
      default:
        return <Circle className="standby-status-icon checking" />;
    }
  };

  const getStatusText = () => {
    switch (backendStatus) {
      case 'connected':
        return ''; // Empty string when connected
      case 'error':
        return 'Connecting...';
      default:
        return 'Checking...';
    }
  };

  return (
    <Container fluid className="standby-container">
      {/* Backend Status - Simplified when connected */}
      <motion.div
        className="standby-backend-status"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className={`standby-status-indicator ${backendStatus}`}>
          {getStatusIcon()}
          {getStatusText() && <span className="standby-status-text">{getStatusText()}</span>}
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
                  disabled={backendStatus !== 'connected'}
                >
                  <span className="standby-button-content">
                    Touch this to Start
                  </span>
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}