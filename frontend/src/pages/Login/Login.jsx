// src/pages/Login/Login.jsx - NUMERIC RFID ONLY
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Login as LoginIcon,
  PersonAdd,
  CreditCard,
  RadioButtonChecked,
  CheckCircle,
  Error,
  Schedule
} from '@mui/icons-material';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';

// Import API functions
import { loginWithRFID, loginWithCredentials, storeUserData, testLoginConnection } from '../../utils/api';

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [rfidLoading, setRfidLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeInput, setActiveInput] = useState('schoolNumber');
  const [rfidStatus, setRfidStatus] = useState('ready');
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const navigate = useNavigate();

  const schoolNumberInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const rfidInputRef = useRef(null);
  const rfidTimeoutRef = useRef(null);
  const rfidDataRef = useRef('');

  // Check backend connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        console.log('🔍 Checking backend connection...');
        const result = await testLoginConnection();
        if (result.success) {
          setConnectionStatus('connected');
          console.log('✅ Backend connection successful');
        } else {
          setConnectionStatus('error');
          console.error('❌ Backend connection failed');
        }
      } catch (error) {
        setConnectionStatus('error');
        console.error('❌ Backend connection error:', error);
      }
    };

    checkConnection();
  }, []);

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
    const preventZoom = (e) => e.touches.length > 1 && e.preventDefault();
    const preventGesture = (e) => e.preventDefault();

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });

    // Setup RFID scanner listener immediately
    setupRfidScanner();

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
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
    console.log('🎫 RFID Format: Numeric only (exact number from scanner)');

    // Listen to ALL keyboard events on the entire document
    document.addEventListener('keydown', handleGlobalKeyDown);

    // Auto-focus on hidden RFID input
    setTimeout(() => {
      if (rfidInputRef.current) {
        rfidInputRef.current.focus();
      }
    }, 500);
  };

  // FIXED: Handle ALL keyboard input for RFID scanning with null check
  const handleGlobalKeyDown = (e) => {
    // Ignore if we're already processing RFID
    if (rfidLoading || isLoading) {
      return;
    }

    // FIX: Check if rfidDataRef.current exists before accessing length
    const currentRfidData = rfidDataRef.current || '';

    // RFID scanners typically send numbers/letters followed by Enter
    if (e.key === 'Enter') {
      // Process the accumulated RFID data when Enter is pressed
      if (currentRfidData.length >= 5) {
        console.log('🔑 Enter key pressed, processing RFID data:', currentRfidData);
        const processedRfid = processRfidData(currentRfidData);
        if (processedRfid) {
          processRfidScan(processedRfid);
        }
        rfidDataRef.current = ''; // Reset buffer
        e.preventDefault();
        return;
      }
    } else if (e.key.length === 1) {
      // Accumulate ALL characters (RFID data can have numbers, letters, symbols)
      rfidDataRef.current = currentRfidData + e.key;
      console.log('📝 RFID data accumulated:', rfidDataRef.current);

      // Auto-detect RFID after certain length (some scanners don't send Enter)
      if (rfidDataRef.current.length >= 8 && !rfidLoading) {
        rfidTimeoutRef.current = setTimeout(() => {
          const updatedRfidData = rfidDataRef.current || '';
          if (updatedRfidData.length >= 8) {
            console.log('⏰ Auto-detecting RFID:', updatedRfidData);
            const processedRfid = processRfidData(updatedRfidData);
            if (processedRfid) {
              processRfidScan(processedRfid);
            }
            rfidDataRef.current = '';
          }
        }, 100);
      }
    }
  };

  // Process RFID data - Extract numbers only (NO RTU PREFIX)
  const processRfidData = (rawRfidData) => {
    if (!rawRfidData) {
      console.log('❌ No RFID data provided');
      return null;
    }

    console.log('🔢 Raw RFID data received:', rawRfidData);

    // Extract only numbers from the RFID data - NO RTU PREFIX
    const numbersOnly = rawRfidData.replace(/\D/g, '');
    console.log('🔢 Numbers extracted:', numbersOnly);

    if (numbersOnly.length < 5) {
      console.log('❌ Insufficient numbers in RFID data');
      return null;
    }

    // Use exact numeric RFID from scanner - NO MODIFICATIONS
    console.log('🎫 Using exact numeric RFID:', numbersOnly);
    return numbersOnly;
  };

  const processRfidScan = async (processedRfid) => {
    console.log('🎫 Numeric RFID for validation:', processedRfid);

    setRfidLoading(true);
    setRfidStatus('scanning');
    setError(''); // Clear any previous errors

    try {
      // Call backend API for RFID login with numeric RFID
      const response = await loginWithRFID(processedRfid);

      if (response.success) {
        console.log('✅ RFID validation successful:', response);
        setRfidStatus('success');
        // DON'T set error message for success - let the RFID status handle it

        // Store user data in localStorage
        storeUserData(response.user);

        // FIXED: Navigate to measurement welcome with user data
        setTimeout(() => {
          navigate('/measure/welcome', {
            state: {
              firstName: response.user.firstName,
              lastName: response.user.lastName,
              age: response.user.age,
              sex: response.user.sex,
              schoolNumber: response.user.schoolNumber,
              role: response.user.role
            }
          });
        }, 1500);

      } else {
        console.log('❌ RFID validation failed:', response.message);
        setRfidStatus('error');
        setError(response.message); // No emoji prefix
        setRfidLoading(false);
      }

    } catch (err) {
      console.error('❌ RFID login error:', err);
      setRfidStatus('error');
      setError('RFID login failed. Please try again.'); // No emoji prefix
      setRfidLoading(false);
    }
  };

  // FIXED: Manual login also navigates to measurement welcome with user data
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const schoolNumber = schoolNumberInputRef.current?.value || '';
      const password = passwordInputRef.current?.value || '';

      if (!schoolNumber.trim() || !password.trim()) {
        setError('Please enter both School Number and password');
        setIsLoading(false);
        return;
      }

      console.log('📤 Sending manual login credentials...');
      const response = await loginWithCredentials(schoolNumber, password);

      if (response.success) {
        console.log('✅ Manual login successful:', response);
        storeUserData(response.user);
        // FIXED: Navigate to measurement welcome with user data
        navigate('/measure/welcome', {
          state: {
            firstName: response.user.firstName,
            lastName: response.user.lastName,
            age: response.user.age,
            sex: response.user.sex,
            schoolNumber: response.user.schoolNumber,
            role: response.user.role
          }
        });
      } else {
        setError(response.message); // No emoji prefix
        setIsLoading(false);
      }

    } catch (err) {
      console.error('❌ Manual login error:', err);
      setError('Login failed. Please check your credentials and try again.'); // No emoji prefix
      setIsLoading(false);
    }
  };

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
      if (activeInput === "schoolNumber") {
        if (schoolNumberInputRef.current) {
          const current = schoolNumberInputRef.current.value || '';
          schoolNumberInputRef.current.value = current.slice(0, -1);
        }
      } else {
        if (passwordInputRef.current) {
          const current = passwordInputRef.current.value || '';
          passwordInputRef.current.value = current.slice(0, -1);
        }
      }
    } else if (key === "Space") {
      if (activeInput === "schoolNumber") {
        if (schoolNumberInputRef.current) {
          const current = schoolNumberInputRef.current.value || '';
          schoolNumberInputRef.current.value = current + " ";
        }
      } else {
        if (passwordInputRef.current) {
          const current = passwordInputRef.current.value || '';
          passwordInputRef.current.value = current + " ";
        }
      }
    } else {
      if (activeInput === "schoolNumber") {
        if (schoolNumberInputRef.current) {
          const current = schoolNumberInputRef.current.value || '';
          schoolNumberInputRef.current.value = current + applyFormatting('', key);
        }
      } else {
        if (passwordInputRef.current) {
          const current = passwordInputRef.current.value || '';
          passwordInputRef.current.value = current + applyFormatting('', key);
        }
      }
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

  // FIXED: Get RFID status text without redundant icons/emojis
  const getRfidStatusText = () => {
    switch (rfidStatus) {
      case 'ready':
        return 'Scanner Active - Tap Any ID Card';
      case 'scanning':
        return 'Processing ID Card...';
      case 'success':
        return 'Access Granted!';
      case 'error':
        return 'Card Not Recognized';
      default:
        return 'Scanner Active - Tap Any ID Card';
    }
  };

  // FIXED: Get RFID status icon
  const getRfidStatusIcon = () => {
    switch (rfidStatus) {
      case 'ready':
        return <RadioButtonChecked style={{ fontSize: '1rem', marginRight: '0.5rem', color: '#22c55e' }} />;
      case 'scanning':
        return <Schedule style={{ fontSize: '1rem', marginRight: '0.5rem', color: '#3b82f6' }} />;
      case 'success':
        return <CheckCircle style={{ fontSize: '1rem', marginRight: '0.5rem', color: '#16a34a' }} />;
      case 'error':
        return <Error style={{ fontSize: '1rem', marginRight: '0.5rem', color: '#dc2626' }} />;
      default:
        return <RadioButtonChecked style={{ fontSize: '1rem', marginRight: '0.5rem', color: '#22c55e' }} />;
    }
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'checking':
        return '🔍 Checking connection...';
      case 'connected':
        return '✅ System Ready';
      case 'error':
        return '❌ System Offline';
      default:
        return '🔍 Checking connection...';
    }
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

              {/* Connection Status */}
              <div className="connection-status">
                <div className={`status-indicator ${connectionStatus}`}>
                  {getConnectionStatusText()}
                </div>
              </div>

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
                  <div className="card-icon">
                    <CreditCard />
                  </div>

                  <h2 className="card-title">Tap Your ID Card</h2>
                  <p className="card-subtitle">
                    Place your ID card near the scanner for instant access
                  </p>

                  <div className="physical-scanner-notice">
                    <RadioButtonChecked style={{ color: '#22c55e', fontSize: '1.2rem' }} />
                    <span style={{ fontWeight: 'bold', color: '#22c55e' }}>SCANNER READY</span>
                  </div>

                  {/* FIXED: RFID Status Display */}
                  <div className={`rfid-status ${rfidStatus}`}>
                    {getRfidStatusIcon()}
                    {getRfidStatusText()}
                  </div>

                  {/* RFID Processing Info */}
                  <div className="rfid-processing-info">
                    <p style={{ fontSize: '0.8rem', color: '#666', marginTop: '0.5rem', textAlign: 'center' }}>
                      <strong>Note:</strong> Uses exact numeric RFID from your card
                    </p>
                  </div>
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
                    <label className="form-label">School Number</label>
                    <input
                      ref={schoolNumberInputRef}
                      type="text"
                      name="schoolNumber"
                      onFocus={() => handleInputFocus('schoolNumber')}
                      placeholder="Enter your school number"
                      className={`form-input ${activeInput === 'schoolNumber' ? 'active' : ''}`}
                      disabled={isLoading || rfidLoading}
                      defaultValue=""
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
                      defaultValue=""
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
                        {rfidLoading ? 'Processing Card...' : 'Signing In...'}
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
                          className={`login-keyboard-key ${key === "↑" && isShift ? "active" : ""
                            } ${key === "Sym" && showSymbols ? "active" : ""
                            } ${key === "Del" ? "delete-key" : ""
                            } ${key === "Space" ? "space-key" : ""
                            } ${key === "↑" ? "shift-key" : ""
                            } ${key === "Sym" || key === "ABC" ? "symbols-key" : ""
                            } ${!isNaN(key) && key !== " " ? "number-key" : ""
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