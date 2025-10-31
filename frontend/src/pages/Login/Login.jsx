// src/pages/Login/Login.jsx - PORTRAIT SPLIT LAYOUT
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Row, Col, Form, Button, Alert } from 'react-bootstrap';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, Login as LoginIcon, PersonAdd, RadioButtonChecked, TouchApp, FlashOn, Security, Speed } from '@mui/icons-material';
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
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prevState => ({
      ...prevState,
      [name]: value
    }));
    if (error) setError('');
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

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1200));
      navigate('/measure/welcome');
      
    } catch (err) {
      setError('Login failed. Please check your credentials and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRfidTeaserClick = () => {
    // Engaging animation/feedback for the teaser
    console.log('RFID teaser clicked - encouraging card usage');
  };

  const handleRegisterClick = () => {
    navigate('/register/welcome');
  };

  return (
    <Container fluid className="login-container">
      <Row className="justify-content-center align-items-center w-100 m-0">
        <Col xs={12} className="p-0">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="w-100 d-flex justify-content-center"
          >
            <div className={`login-content ${isVisible ? 'visible' : ''}`}>
              
              {/* Top Section - RFID Teaser */}
              <div className="login-top">
                <div className="rfid-teaser-container">
                  <motion.div 
                    className="rfid-teaser-card"
                    onClick={handleRfidTeaserClick}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <RadioButtonChecked className="rfid-icon-large" />
                    <h3 className="rfid-teaser-title">Tap Your ID Card</h3>
                    <p className="rfid-teaser-subtitle">
                      Instant access with your student or employee card
                    </p>
                    <div className="quick-access-badge">
                      <FlashOn style={{ fontSize: '1.1rem' }} className="me-1" />
                      Fast & Secure
                    </div>
                  </motion.div>

                  <div className="rfid-teaser-hint">
                    <p className="rfid-teaser-hint-text">
                      <TouchApp style={{ fontSize: '1.1rem' }} />
                      Simply hold your card near the reader
                    </p>
                  </div>

                  <div className="benefits-list">
                    <div className="benefit-item">
                      <Speed style={{ fontSize: '1rem', color: '#dc2626' }} />
                      <span>Instant</span>
                    </div>
                    <div className="benefit-item">
                      <Security style={{ fontSize: '1rem', color: '#dc2626' }} />
                      <span>Secure</span>
                    </div>
                    <div className="benefit-item">
                      <CreditCard style={{ fontSize: '1rem', color: '#dc2626' }} />
                      <span>Contactless</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Section - Login Form */}
              <div className="login-bottom">
                <div className="login-form-container">
                  <div className="login-header">
                    <h2 className="login-title">Manual Login</h2>
                    <p className="login-subtitle">Or sign in with your credentials</p>
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

                  <Form onSubmit={handleSubmit}>
                    <Form.Group className="mb-3">
                      <Form.Label className="login-label">
                        Student/Employee ID
                      </Form.Label>
                      <Form.Control
                        type="text"
                        name="userId"
                        value={formData.userId}
                        onChange={handleInputChange}
                        placeholder="Enter your ID"
                        className="login-input"
                        disabled={isLoading}
                        isInvalid={!!error}
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label className="login-label">
                        Password
                      </Form.Label>
                      <Form.Control
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="Enter your password"
                        className="login-input"
                        disabled={isLoading}
                        isInvalid={!!error}
                      />
                    </Form.Group>

                    <Button
                      type="submit"
                      className="login-button"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <span className="spinner"></span>
                          Signing In...
                        </>
                      ) : (
                        <>
                          <LoginIcon style={{ fontSize: '1.3rem' }} className="me-2" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </Form>

                  <div className="register-section">
                    <p className="register-text">
                      Don't have an account yet?
                    </p>
                    <Link 
                      to="/register/welcome" 
                      className="register-link"
                      onClick={handleRegisterClick}
                    >
                      <PersonAdd style={{ fontSize: '1.2rem' }} className="me-2" />
                      Create New Account
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </Col>
      </Row>
    </Container>
  );
}