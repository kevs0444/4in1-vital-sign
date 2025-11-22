// src/pages/RegisterFlow/RegisterDataSaved.jsx - FIXED RFID PROCESSING
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterDataSaved.css";

// Enhanced registerUser function with proper error handling
const registerUser = async (userData) => {
  try {
    console.log('📤 Sending registration data to backend:', userData);
    
    const response = await fetch('http://127.0.0.1:5000/api/register/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server response error:', errorText);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.message || 'Registration failed');
    }

    console.log('✅ Registration successful:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Registration API error:', error);
    throw error;
  }
};

export default function RegisterDataSaved() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [registrationStatus, setRegistrationStatus] = useState('saving');
  const [backendResponse, setBackendResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const registrationData = location.state || {};
  const hasSavedRef = useRef(false);

  // Viewport and zoom prevention
  useEffect(() => {
    const viewport = document.querySelector('meta[name="viewport"]') || document.createElement('meta');
    viewport.name = 'viewport';
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.head.appendChild(viewport);

    const preventZoom = (e) => e.touches.length > 1 && e.preventDefault();
    const preventGesture = (e) => e.preventDefault();

    document.addEventListener('touchstart', preventZoom, { passive: false });
    document.addEventListener('touchmove', preventZoom, { passive: false });
    document.addEventListener('gesturestart', preventGesture, { passive: false });
    document.addEventListener('gesturechange', preventGesture, { passive: false });

    return () => {
      document.removeEventListener('touchstart', preventZoom);
      document.removeEventListener('touchmove', preventZoom);
      document.removeEventListener('gesturestart', preventGesture);
      document.removeEventListener('gesturechange', preventGesture);
    };
  }, []);

  // Main effect for registration and countdown
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    if (!hasSavedRef.current && registrationData.personalInfo) {
      hasSavedRef.current = true;
      console.log('🚀 Starting registration process...');
      saveRegistrationToDatabase();
    }

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1 && registrationStatus === 'success') {
          handleContinue();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [registrationStatus]);

  // Process RFID - Use EXACT numbers from scanner (NO CUTTING)
  const processRfidForRegistration = (rawRfid) => {
    console.log('🔢 Processing RFID for registration:', rawRfid);
    
    if (!rawRfid) {
      // Generate a random numeric RFID
      const randomRfid = Math.floor(10000000 + Math.random() * 90000000).toString();
      console.log('🎫 Generated new numeric RFID:', randomRfid);
      return randomRfid;
    }
    
    // Extract numbers only - NO CUTTING, NO MODIFICATIONS
    const numbersOnly = rawRfid.replace(/\D/g, '');
    console.log('🔢 Numbers extracted (exact from scanner):', numbersOnly);
    
    if (numbersOnly.length < 5) {
      // Generate if insufficient numbers
      const randomRfid = Math.floor(10000000 + Math.random() * 90000000).toString();
      console.log('🎫 Generated RFID due to insufficient numbers:', randomRfid);
      return randomRfid;
    }
    
    // USE EXACT NUMBERS FROM SCANNER - NO CUTTING, NO PADDING
    console.log('🎫 Using exact numeric RFID from scanner:', numbersOnly);
    return numbersOnly;
  };

  // Map frontend user types to backend role enum
  const mapUserTypeToRole = (userType) => {
    const roleMap = {
      "rtu-students": "Student",
      "rtu-employees": "Employee", 
      "rtu-admin": "Admin",
      "rtu-doctor": "Doctor",
      "rtu-nurse": "Nurse"
    };
    return roleMap[userType] || "Student";
  };

  // Enhanced registration function - NO RFID CUTTING
  const saveRegistrationToDatabase = async () => {
    try {
      console.log('💾 Saving registration data to database');
      
      if (!registrationData.personalInfo || !registrationData.idNumber) {
        console.warn('⚠️ Incomplete registration data:', registrationData);
        setRegistrationStatus('error');
        setErrorMessage('Incomplete registration data. Please restart registration.');
        return;
      }

      // Get current date and time
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      
      const currentDateTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
      console.log('📅 Current date time for registration:', currentDateTime);

      // Process RFID - EXACT NUMBERS FROM SCANNER (NO CUTTING)
      const rfidCode = processRfidForRegistration(registrationData.rfidCode);
      console.log('🎫 Final numeric RFID for registration (exact from scanner):', rfidCode);

      // Prepare data for backend
      const userData = {
        // Basic user info
        userId: registrationData.idNumber,
        rfidTag: rfidCode, // EXACT NUMERIC RFID FROM SCANNER
        firstname: registrationData.personalInfo.firstName || '',
        lastname: registrationData.personalInfo.lastName || '',
        role: mapUserTypeToRole(registrationData.userType),
        
        // School info
        school_number: registrationData.idNumber,
        
        // Personal details
        age: parseInt(registrationData.personalInfo.age) || 0,
        sex: registrationData.personalInfo.sex || 'Male',
        birthday: registrationData.personalInfo.birthYear && 
                 registrationData.personalInfo.birthMonth && 
                 registrationData.personalInfo.birthDay 
                  ? `${registrationData.personalInfo.birthYear}-${String(registrationData.personalInfo.birthMonth).padStart(2, '0')}-${String(registrationData.personalInfo.birthDay).padStart(2, '0')}`
                  : null,
        
        // Contact info
        mobileNumber: registrationData.mobile || '',
        email: registrationData.email || '',
        
        // Authentication
        password: registrationData.password || '123456',
        
        // Timestamp
        created_at: currentDateTime
      };

      console.log('📤 Sending registration data to backend:', userData);
      const result = await registerUser(userData);
      
      if (result.success) {
        console.log('✅ Database registration successful:', result);
        setRegistrationStatus('success');
        setBackendResponse(result);
      } else {
        throw new Error(result.message || 'Registration failed');
      }
      
    } catch (error) {
      console.error('❌ Database registration failed:', error);
      setRegistrationStatus('error');
      setErrorMessage(
        error.message.includes('HTTP error') 
          ? 'Network error. Please check your connection and try again.'
          : error.message
      );
      hasSavedRef.current = false;
    }
  };

  const handleContinue = () => {
    navigate("/login");
  };

  const handleViewDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleRetryRegistration = () => {
    setRegistrationStatus('saving');
    setErrorMessage('');
    setBackendResponse(null);
    hasSavedRef.current = false;
    saveRegistrationToDatabase();
  };

  // Improved date formatting with fallbacks
  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "Just now";
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch (error) {
      console.warn('Date formatting error:', error);
      return "Just now";
    }
  };

  const getUserTypeDisplay = () => {
    const userType = registrationData.userType;
    const typeMap = {
      "rtu-students": "RTU Student",
      "rtu-employees": "RTU Employee", 
      "rtu-admin": "RTU Administrator",
      "rtu-doctor": "RTU Doctor",
      "rtu-nurse": "RTU Nurse"
    };
    return typeMap[userType] || "RTU Member";
  };

  const getRoleDisplay = () => {
    const userType = registrationData.userType;
    const roleMap = {
      "rtu-students": "Student",
      "rtu-employees": "Employee", 
      "rtu-admin": "Administrator",
      "rtu-doctor": "Doctor",
      "rtu-nurse": "Nurse"
    };
    return roleMap[userType] || "Member";
  };

  const getStatusDisplay = () => {
    const statusMap = {
      'saving': { text: 'Saving to Database...', class: 'saving' },
      'success': { text: 'Registration Complete!', class: 'success' },
      'error': { text: 'Registration Failed', class: 'error' }
    };
    return statusMap[registrationStatus] || { text: 'Processing...', class: 'saving' };
  };

  const statusInfo = getStatusDisplay();

  return (
    <div className="register-saved-container">
      <div className={`register-saved-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Status Animation */}
        <div className={`status-animation ${registrationStatus}`}>
          <div className="status-icon">
            {registrationStatus === 'saving' && <div className="loading-spinner"></div>}
            {registrationStatus === 'success' && <div className="checkmark">✓</div>}
            {registrationStatus === 'error' && <div className="error-mark">⚠️</div>}
          </div>
          <div className="status-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
          </div>
        </div>

        {/* Status Message */}
        <div className="status-message">
          <h1 className={`status-title ${statusInfo.class}`}>
            {statusInfo.text}
          </h1>
          <p className="status-subtitle">
            {registrationStatus === 'saving' && 'Please wait while we save your information...'}
            {registrationStatus === 'success' && 'Your account has been successfully created!'}
            {registrationStatus === 'error' && 'We encountered an issue saving your data.'}
          </p>
          
          {/* Backend Response */}
          {registrationStatus === 'success' && backendResponse && (
            <div className="backend-success">
              <p>✅ User ID: <strong>{backendResponse.data?.user_id}</strong></p>
              <p>📅 Registered: {formatDate(backendResponse.data?.created_at)}</p>
              <p>🎫 RFID Number: <strong>{backendResponse.data?.rfid_tag}</strong></p>
            </div>
          )}
          
          {registrationStatus === 'error' && (
            <div className="backend-error">
              <p>❌ {errorMessage}</p>
              <button className="retry-button" onClick={handleRetryRegistration}>
                🔄 Retry Registration
              </button>
            </div>
          )}
        </div>

        {/* Registration Summary - Only show when successful */}
        {registrationStatus === 'success' && (
          <>
            <div className="registration-summary">
              <div className="summary-card">
                <div className="summary-header">
                  <h3>Account Summary</h3>
                  <button className="details-toggle" onClick={handleViewDetails}>
                    {showDetails ? "Hide Details" : "View Details"}
                  </button>
                </div>
                
                <div className="summary-content">
                  <div className="summary-item main-item">
                    <span className="summary-label">Welcome to RTU!</span>
                    <span className="summary-value">
                      {registrationData.personalInfo?.firstName} {registrationData.personalInfo?.lastName}
                    </span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Account Type</span>
                    <span className="summary-value">{getUserTypeDisplay()}</span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Role</span>
                    <span className="summary-value">{getRoleDisplay()}</span>
                  </div>
                  
                  <div className="summary-item">
                    <span className="summary-label">Status</span>
                    <span className="summary-value status-active">Active</span>
                  </div>
                  
                  {backendResponse?.data?.user_id && (
                    <div className="summary-item">
                      <span className="summary-label">User ID</span>
                      <span className="summary-value">{backendResponse.data.user_id}</span>
                    </div>
                  )}

                  {backendResponse?.data?.rfid_tag && (
                    <div className="summary-item">
                      <span className="summary-label">RFID Number</span>
                      <span className="summary-value code">{backendResponse.data.rfid_tag}</span>
                    </div>
                  )}
                </div>

                {/* Detailed Information */}
                {showDetails && (
                  <div className="detailed-info">
                    <div className="info-section">
                      <h4>Login Information</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">School Number:</span>
                          <span className="info-value">{registrationData.idNumber}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Password:</span>
                          <span className="info-value">••••••</span>
                        </div>
                        {backendResponse?.data?.rfid_tag && (
                          <div className="info-item">
                            <span className="info-label">RFID Number:</span>
                            <span className="info-value code">{backendResponse.data.rfid_tag}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="info-section">
                      <h4>Personal Information</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Full Name:</span>
                          <span className="info-value">
                            {registrationData.personalInfo?.firstName} {registrationData.personalInfo?.lastName}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Age:</span>
                          <span className="info-value">
                            {registrationData.personalInfo?.age} years old
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Biological Sex:</span>
                          <span className="info-value">
                            {registrationData.personalInfo?.sex ? 
                              registrationData.personalInfo.sex.charAt(0).toUpperCase() + 
                              registrationData.personalInfo.sex.slice(1) : 'Not specified'}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Birthday:</span>
                          <span className="info-value">
                            {registrationData.personalInfo?.birthMonth && 
                             registrationData.personalInfo?.birthDay && 
                             registrationData.personalInfo?.birthYear 
                              ? `${registrationData.personalInfo.birthMonth}/${registrationData.personalInfo.birthDay}/${registrationData.personalInfo.birthYear}`
                              : 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="info-section">
                      <h4>Contact Information</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Email:</span>
                          <span className="info-value">{registrationData.email}</span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Mobile:</span>
                          <span className="info-value">{registrationData.mobile}</span>
                        </div>
                      </div>
                    </div>

                    <div className="info-section">
                      <h4>Registration Details</h4>
                      <div className="info-grid">
                        <div className="info-item">
                          <span className="info-label">Registered On:</span>
                          <span className="info-value">
                            {formatDate(backendResponse?.data?.created_at)}
                          </span>
                        </div>
                        <div className="info-item">
                          <span className="info-label">Database Status:</span>
                          <span className="info-value status-registered">Saved to Database</span>
                        </div>
                        {backendResponse?.data?.user_id && (
                          <div className="info-item">
                            <span className="info-label">System User ID:</span>
                            <span className="info-value">{backendResponse.data.user_id}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Login Instructions */}
            <div className="login-instructions">
              <h3>How to Login</h3>
              <div className="instructions-grid">
                <div className="instruction-item">
                  <div className="instruction-icon">🎫</div>
                  <div className="instruction-content">
                    <strong>RFID Login</strong>
                    <p>Tap your ID card with RFID number: <strong>{backendResponse?.data?.rfid_tag}</strong></p>
                    <p style={{ fontSize: '0.8rem', color: '#666' }}>Make sure to use the exact same card you registered with</p>
                  </div>
                </div>
                <div className="instruction-item">
                  <div className="instruction-icon">🔑</div>
                  <div className="instruction-content">
                    <strong>Manual Login</strong>
                    <p>Use School Number: <strong>{registrationData.idNumber}</strong></p>
                    <p>Password: <strong>{registrationData.password || '123456'}</strong></p>
                  </div>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="next-steps">
              <h3>What's Next?</h3>
              <div className="steps-list">
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-content">
                    <strong>Access Campus Facilities</strong>
                    <p>Use your registered ID card to enter buildings and access services</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">2</div>
                  <div className="step-content">
                    <strong>Login to Your Account</strong>
                    <p>Use your School Number and password or tap your ID card to sign in</p>
                  </div>
                </div>
                <div className="step-item">
                  <div className="step-number">3</div>
                  <div className="step-content">
                    <strong>Complete Your Profile</strong>
                    <p>Add more details for personalized experience</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
              <button className="continue-button" onClick={handleContinue}>
                Continue to Login
                <span className="countdown">({countdown}s)</span>
              </button>
              
              <button className="secondary-button" onClick={() => window.print()}>
                Print Summary
              </button>
            </div>

            {/* Security Notice */}
            <div className="security-notice">
              <div className="security-icon">🔒</div>
              <div className="security-text">
                <strong>Security Notice:</strong> Keep your credentials secure. 
                RTU will never ask for your password.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}