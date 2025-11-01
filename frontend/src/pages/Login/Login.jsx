// src/pages/Login/Login.jsx - OPTIMIZED FOR 768x1366 TOUCH SCREEN
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Login as LoginIcon, 
  PersonAdd, 
  CreditCard,
  Info
} from '@mui/icons-material';
import 'bootstrap/dist/css/bootstrap.min.css';
import './Login.css';

export default function LoginPage() {
  const [formData, setFormData] = useState({
    userId: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeInput, setActiveInput] = useState('userId');
  const navigate = useNavigate();

  const userIdInputRef = useRef(null);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    setTimeout(() => {
      if (userIdInputRef.current) userIdInputRef.current.focus();
    }, 300);
  }, []);

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
        setFormData(prev => ({ ...prev, userId: prev.userId.slice(0, -1) }));
      } else {
        setFormData(prev => ({ ...prev, password: prev.password.slice(0, -1) }));
      }
    } else if (key === "Space") {
      if (activeInput === "userId") {
        setFormData(prev => ({ ...prev, userId: prev.userId + " " }));
      } else {
        setFormData(prev => ({ ...prev, password: prev.password + " " }));
      }
    } else {
      if (activeInput === "userId") {
        setFormData(prev => ({ ...prev, userId: applyFormatting(prev.userId, key) }));
      } else {
        setFormData(prev => ({ ...prev, password: applyFormatting(prev.password, key) }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (!formData.userId.trim() || !formData.password.trim()) {
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
              
              {/* TOP SECTION - ID CARD FORMAT (25%) */}
              <div className="login-card-section">
                <div className="card-section-content">
                  <div className="card-icon">
                    <CreditCard />
                  </div>
                  
                  <h2 className="card-title">Tap Your ID Card</h2>
                  <p className="card-subtitle">
                    Use the physical RFID scanner beside this monitor for instant access
                  </p>

                  <div className="physical-scanner-notice">
                    <Info />
                    <span>Scanner located next to this screen</span>
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
                    <label className="form-label">Student/Employee ID</label>
                    <input
                      ref={userIdInputRef}
                      type="text"
                      name="userId"
                      value={formData.userId}
                      onChange={(e) => setFormData(prev => ({ ...prev, userId: e.target.value }))}
                      onFocus={() => handleInputFocus('userId')}
                      placeholder="Enter your ID number"
                      className={`form-input ${activeInput === 'userId' ? 'active' : ''}`}
                      disabled={isLoading}
                      readOnly
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      ref={passwordInputRef}
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                      onFocus={() => handleInputFocus('password')}
                      placeholder="Enter your password"
                      className={`form-input ${activeInput === 'password' ? 'active' : ''}`}
                      disabled={isLoading}
                      readOnly
                    />
                  </div>

                  <Button
                    type="submit"
                    className="login-button"
                    disabled={isLoading || !formData.userId || !formData.password}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner"></span>
                        Signing In...
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
                            key === "Del"
                              ? "delete-key"
                              : key === "Space"
                              ? "space-key"
                              : key === "↑"
                              ? `shift-key ${isShift ? "active" : ""}`
                              : (key === "Sym" || key === "ABC")
                              ? `symbols-key ${showSymbols ? "active" : ""}`
                              : ""
                          } ${rowIndex === 0 ? 'number-key' : ''}`}
                          onClick={() => handleKeyboardPress(key)}
                          onTouchStart={(e) => {
                            e.currentTarget.style.transform = 'scale(0.95)';
                            e.currentTarget.style.backgroundColor = '#dc2626';
                            e.currentTarget.style.color = 'white';
                          }}
                          onTouchEnd={(e) => {
                            e.currentTarget.style.transform = '';
                            e.currentTarget.style.backgroundColor = '';
                            e.currentTarget.style.color = '';
                          }}
                        >
                          {key === "Space" ? "Space" : 
                           key === "↑" ? "⇧" : 
                           key === "Sym" ? "Sym" :
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