// src/pages/Login/Login.jsx - AUTO RFID LOGIN
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Login as LoginIcon, 
  PersonAdd, 
  CreditCard,
  Info,
  RadioButtonChecked
} from '@mui/icons-material';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeInput, setActiveInput] = useState('userId');
  const [rfidStatus, setRfidStatus] = useState('ready');
  const navigate = useNavigate();

  const userIdInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const rfidInputRef = useRef(null);
  const rfidTimeoutRef = useRef(null);
  const rfidDataRef = useRef('');

  // Add viewport meta tag to prevent zooming
  useEffect(() => {
    // Create or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';
    
    // Prevent zooming via touch gestures
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });
    
    // Setup RFID scanner listener immediately
    setupRfidScanner();
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
      document.removeEventListener('keydown', handleGlobalKeyDown);
      
      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // RFID Scanner Setup - LISTENS TO ALL KEYBOARD INPUT
  const setupRfidScanner = () => {
    console.log('🔔 RFID Scanner Active - Ready to accept any card');
    
    // Listen to ALL keyboard events on the entire document
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // Auto-focus on hidden RFID input
    setTimeout(() => {
      if (rfidInputRef.current) {
        rfidInputRef.current.focus();
      }
    }, 500);
  };

  // Handle ALL keyboard input for RFID scanning
  const handleGlobalKeyDown = (e) => {
    // Ignore if we're already processing RFID
    if (rfidLoading || isLoading) {
      return;
    }

    // RFID scanners typically send numbers/letters followed by Enter
    if (e.key === 'Enter') {
      // Process the accumulated RFID data when Enter is pressed
      if (rfidDataRef.current.length >= 5) { // Minimum RFID length
        processRfidScan(rfidDataRef.current);
        rfidDataRef.current = ''; // Reset buffer
        e.preventDefault();
        return;
      }
    } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      // Accumulate alphanumeric characters (RFID data)
      rfidDataRef.current += e.key;
      
      // Auto-detect RFID after certain length (some scanners don't send Enter)
      if (rfidDataRef.current.length >= 8 && !rfidLoading) {
        rfidTimeoutRef.current = setTimeout(() => {
          if (rfidDataRef.current.length >= 8) {
            processRfidScan(rfidDataRef.current);
            rfidDataRef.current = '';
          }
        }, 100);
      }
    }
  };

  const processRfidScan = async (rfidData) => {
    console.log('🎫 RFID Card Detected:', rfidData);
    
    setRfidLoading(true);
    setRfidStatus('scanning');
    setError('');

    try {
      // Show scanning status briefly
      await new Promise(resolve => setTimeout(resolve, 800));

      setRfidStatus('success');
      setError(`✅ Access Granted! Welcome User ${rfidData.slice(-6)}`);

      // Auto-login immediately
      rfidTimeoutRef.current = setTimeout(async () => {
        setIsLoading(true);
        
        // Quick login process
        await new Promise(resolve => setTimeout(resolve, 600));
        
        console.log('🚀 Auto-login successful, navigating to welcome page');
        
        // Navigate to welcome page
        navigate('/measure/welcome');
        
      }, 800);

    } catch (err) {
      console.error('RFID login error:', err);
      setRfidStatus('ready');
      setError('❌ RFID login failed. Please try again.');
      setRfidLoading(false);
    }
  };

  // Manual RFID trigger for testing
  const triggerTestRfid = () => {
    if (!rfidLoading && !isLoading) {
      const testRfid = Math.floor(10000000 + Math.random() * 90000000).toString();
      processRfidScan(testRfid);
    }
  };

  // Manual login functions
  const handleInputFocus = (inputName) => {
    setActiveInput(inputName);
  };

  const handleKeyboardPress = (key) => {
    if (key === "↑") {
      setIsShift(!isShift);
      return;
    }

    if (key === "Sym" || key === "ABC") {
      setShowSymbols(!showSymbols);
      return;
    }

    const applyFormatting = (prev, char) => {
      let nextChar = isShift ? char.toUpperCase() : char.toLowerCase();
      setIsShift(false);
      return prev + nextChar;
    };

    if (key === "Del") {
      if (activeInput === "userId") {
        // For manual input
        if (userIdInputRef.current) {
          const current = userIdInputRef.current.value;
          userIdInputRef.current.value = current.slice(0, -1);
        }
      } else {
        if (passwordInputRef.current) {
          const current = passwordInputRef.current.value;
          passwordInputRef.current.value = current.slice(0, -1);
        }
      }
    } else if (key === "Space") {
      if (activeInput === "userId") {
        if (userIdInputRef.current) {
          userIdInputRef.current.value += " ";
        }
      } else {
        if (passwordInputRef.current) {
          passwordInputRef.current.value += " ";
        }
      }
    } else {
      if (activeInput === "userId") {
        if (userIdInputRef.current) {
          userIdInputRef.current.value += applyFormatting('', key);
        }
      } else {
        if (passwordInputRef.current) {
          passwordInputRef.current.value += applyFormatting('', key);
        }
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const userId = userIdInputRef.current?.value || '';
      const password = passwordInputRef.current?.value || '';

      if (!userId.trim() || !password.trim()) {
        setError('Please enter both Student/Employee ID and password');
        setIsLoading(false);
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 1200));
      navigate('/measure/welcome');
      
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterClick = () => {
    navigate('/register/welcome');
  };

  const alphabetKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
    ["Sym", "Space", "-"],
  ];

  const symbolKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
    ["-", "_", "+", "=", "{", "}", "[", "]", "|"],
    [".", ",", "?", "!", "'", '"', ":", ";", "Del"],
    ["ABC", "~", "`", "\\", "/", "Space"],
  ];

  const keyboardKeys = showSymbols ? symbolKeys : alphabetKeys;

  const getRfidStatusText = () => {
    switch (rfidStatus) {
      case 'ready':
        return 'Scanner Active - Tap Any ID Card';
      case 'scanning':
        return '🔄 Processing ID Card...';
      case 'success':
        return '✅ Access Granted!';
      default:
        return 'Scanner Active - Tap Any ID Card';
    }
  };

  // Prevent zooming functions
  const handleTouchStart = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
    }
  };

  const preventZoom = (e) => {
    e.preventDefault();
  };

  return (
    <Container fluid className="login-container">
      <Row className="justify-content-center align-items-center w-100 m-0 h-100">
        <Col xs={12} className="p-0 h-100">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="w-100 h-100"
          >
            <div className={`login-content ${isVisible ? 'visible' : ''}`}>
              
              {/* HIDDEN RFID INPUT - CAPTURES ALL SCANNER INPUT */}
              <input
                ref={rfidInputRef}
                type="text"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '1px',
                  height: '1px',
                  opacity: 0,
                  border: 'none',
                  background: 'transparent',
                  pointerEvents: 'none'
                }}
                autoComplete="off"
                autoFocus
              />
              
              {/* TOP SECTION - ID CARD FORMAT (25%) */}
              <div className={`login-card-section ${rfidLoading ? 'rfid-scanning' : ''}`}>
                <div className="card-section-content">
                  <div className="card-icon" onClick={triggerTestRfid} style={{ cursor: 'pointer' }}>
                    <CreditCard />
                  </div>
                  
                  <h2 className="card-title">Tap Any ID Card</h2>
                  <p className="card-subtitle">
                    RFID scanner is active - Tap any card for instant access
                  </p>

                  <div className="physical-scanner-notice">
                    <RadioButtonChecked style={{ color: '#22c55e', fontSize: '1.2rem' }} />
                    <span style={{ fontWeight: 'bold', color: '#22c55e' }}>SCANNER ACTIVE</span>
                  </div>

                  <div className={`rfid-status ${rfidStatus}`}>
                    <RadioButtonChecked style={{ fontSize: '1rem', marginRight: '0.5rem' }} />
                    {getRfidStatusText()}
                  </div>

                  {/* Test button */}
                  <button
                    onClick={triggerTestRfid}
                    style={{
                      padding: '0.5rem 1rem',
                      background: '#dc2626',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '0.9rem',
                      cursor: 'pointer',
                      marginTop: '0.5rem',
                      fontWeight: 'bold'
                    }}
                    disabled={rfidLoading || isLoading}
                  >
                    {rfidLoading ? '🔄 Scanning...' : '🧪 Test RFID'}
                  </button>
                </div>
              </div>

              {/* MIDDLE SECTION - MANUAL LOGIN (45%) */}
              <div className="login-manual-section">
                <div className="login-header">
                  <h2 className="login-title">Or Login Manually</h2>
                  <p className="login-subtitle">Enter your credentials below</p>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Alert variant="danger" className="login-alert">
                        {error}
                      </Alert>
                    </motion.div>
                  )}
                </AnimatePresence>

                <Form onSubmit={handleSubmit} className="login-form">
                  <div className="form-group">
                    <label className="form-label">Student/Employee ID</label>
                    <input
                      ref={userIdInputRef}
                      type="text"
                      name="userId"
                      onFocus={() => handleInputFocus('userId')}
                      placeholder="Enter your ID number"
                      className={`form-input ${activeInput === 'userId' ? 'active' : ''}`}
                      disabled={isLoading || rfidLoading}
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      ref={passwordInputRef}
                      type="password"
                      name="password"
                      onFocus={() => handleInputFocus('password')}
                      placeholder="Enter your password"
                      className={`form-input ${activeInput === 'password' ? 'active' : ''}`}
                      disabled={isLoading || rfidLoading}
                    />
                  </div>

                  <Button
                    type="submit"
                    className="login-button"
                    disabled={isLoading || rfidLoading}
                  >
                    {isLoading || rfidLoading ? (
                      <>
                        <span className="spinner"></span>
                        {rfidLoading ? 'RFID Login...' : 'Signing In...'}
                      </>
                    ) : (
                      <>
                        <LoginIcon className="button-icon" />
                        Access Vital Sign System
                      </>
                    )}
                  </Button>

                  <div className="register-section">
                    <p className="register-text">
                      New to the system?
                    </p>
                    <Link 
                      to="/register/welcome" 
                      className="register-link"
                      onClick={handleRegisterClick}
                    >
                      <PersonAdd className="button-icon" />
                      Register Account
                    </Link>
                  </div>
                </Form>
              </div>

              {/* BOTTOM SECTION - KEYBOARD (30%) */}
              <div className="login-keyboard-section">
                <div className="login-keyboard-rows">
                  {keyboardKeys.map((row, rowIndex) => (
                    <div key={rowIndex} className="login-keyboard-row">
                      {row.map((key) => (
                        <button
                          key={key}
                          className={`login-keyboard-key ${
                            key === "↑" && isShift ? "active" : ""
                          } ${
                            key === "Sym" && showSymbols ? "active" : ""
                          } ${
                            key === "Del" ? "delete-key" : ""
                          } ${
                            key === "Space" ? "space-key" : ""
                          } ${
                            key === "↑" ? "shift-key" : ""
                          } ${
                            key === "Sym" || key === "ABC" ? "symbols-key" : ""
                          } ${
                            !isNaN(key) && key !== " " ? "number-key" : ""
                          }`}
                          onClick={() => handleKeyboardPress(key)}
                          type="button"
                          disabled={isLoading || rfidLoading}
                        >
                          {key === "↑" ? "SHIFT" : 
                           key === "Del" ? "DELETE" : 
                           key === "Space" ? "SPACE" : 
                           key === "Sym" ? "SYMBOLS" : 
                           key === "ABC" ? "ABC" : key}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}