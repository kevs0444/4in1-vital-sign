// src/pages/RegisterFlow/RegisterDataSaved.jsx - FIXED RFID PROCESSING & MODERN UI
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check } from '@mui/icons-material';
import "./RegisterDataSaved.css";

// Enhanced registerUser function with proper error handling
const registerUser = async (userData) => {
  try {
    console.log('📤 Sending registration data to backend:', userData);

    const getDynamicApiUrl = () => {
      if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
      return `${window.location.protocol}//${window.location.hostname}:5000`;
    };

    const API_BASE = getDynamicApiUrl();
    const response = await fetch(`${API_BASE}/api/register/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server response error:', errorText);
      // Try to parse JSON error if possible
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(errorJson.message || `HTTP error! status: ${response.status}`);
      } catch (e) {
        throw new Error(errorText || `HTTP error! status: ${response.status}`);
      }
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
  const [countdown, setCountdown] = useState(15);
  const [registrationStatus, setRegistrationStatus] = useState('saving');
  const [backendResponse, setBackendResponse] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [generatedUserId, setGeneratedUserId] = useState('');

  const registrationData = React.useMemo(() => location.state || {}, [location.state]);
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

  // Generate Advanced Random User ID
  const generateUserId = () => {
    const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
    const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
    const prefix = "USR";
    return `${prefix}-${timestamp}-${randomPart}`;
  };

  // Process RFID - Return null if skipped
  const processRfidForRegistration = (rawRfid) => {
    console.log('🔢 Processing RFID for registration:', rawRfid);

    if (!rawRfid) {
      return null;
    }

    const numbersOnly = rawRfid.replace(/\D/g, '');

    if (numbersOnly.length < 5) {
      return null;
    }

    return numbersOnly;
  };

  // Map frontend user types to backend role enum
  const mapUserTypeToRole = (userType) => {
    const roleMap = {
      "rtu-students": "Student",
      "student": "Student",
      "rtu-employees": "Employee",
      "employee": "Employee",
      "rtu-admin": "Admin",
      "rtu-doctor": "Doctor",
      "doctor": "Doctor",
      "rtu-nurse": "Nurse",
      "nurse": "Nurse"
    };
    return roleMap[userType] || "Student";
  };

  const handleContinue = useCallback(() => {
    navigate("/login");
  }, [navigate]);

  // Enhanced registration function
  const saveRegistrationToDatabase = useCallback(async () => {
    try {
      console.log('💾 Saving registration data to database');

      if (!registrationData.personalInfo || !registrationData.idNumber) {
        setRegistrationStatus('error');
        setErrorMessage('Incomplete registration data. Please restart registration.');
        return;
      }

      const now = new Date();
      const currentDateTime = now.toISOString().slice(0, 19).replace('T', ' ');

      const rfidCode = processRfidForRegistration(registrationData.rfidCode);

      // Generate unique User ID
      const newUserId = generateUserId();
      setGeneratedUserId(newUserId);

      // Prepare data for backend
      const userData = {
        // Basic user info
        userId: newUserId, // Randomly generated ID
        rfidTag: rfidCode,
        firstname: registrationData.personalInfo.firstName || '',
        middlename: registrationData.personalInfo.middleName || '',
        lastname: registrationData.personalInfo.lastName || '',
        suffix: registrationData.personalInfo.suffix || '',
        role: mapUserTypeToRole(registrationData.userType),

        // School info - Keep the actual school ID here
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

      const errorMsg = error.message.toLowerCase();
      if (errorMsg.includes('duplicate') || errorMsg.includes('already registered') || errorMsg.includes('exists')) {
        setRegistrationStatus('error');
        setIsDuplicate(true);

        if (errorMsg.includes('name') && errorMsg.includes('birthday')) {
          setErrorMessage('A user with the same Name and Birthday is already registered. Redirecting to login...');
        } else {
          setErrorMessage('This RFID or User ID is already registered. Redirecting to login...');
        }
      } else {
        setRegistrationStatus('error');
        setErrorMessage(
          error.message.includes('HTTP error')
            ? 'Network error. Please check your connection and try again.'
            : error.message
        );
      }
      hasSavedRef.current = false;
    }
  }, [registrationData]);

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
        if (prev <= 1) {
          if (registrationStatus === 'success' || isDuplicate) {
            handleContinue();
            return 0;
          }
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [registrationStatus, isDuplicate, saveRegistrationToDatabase, handleContinue, registrationData.personalInfo]);

  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return "Just now";
    }
  };

  const getRoleDisplay = () => {
    return mapUserTypeToRole(registrationData.userType) || "Member";
  };

  const isPending = ['Doctor', 'Nurse'].includes(mapUserTypeToRole(registrationData.userType));

  return (
    <div className="register-saved-container">
      <div className={`register-saved-content ${isVisible ? 'visible' : ''}`}>

        {/* Header Section */}
        <div className="saved-header">
          <div className={`status-icon-wrapper ${registrationStatus}`}>
            {registrationStatus === 'saving' && <div className="loading-spinner"></div>}
            {registrationStatus === 'success' && (
              <Check className="checkmark-icon" />
            )}
            {registrationStatus === 'error' && <div className="error-mark">!</div>}
          </div>

          <h1 className="status-title">
            {registrationStatus === 'saving' && 'Finalizing Registration...'}
            {registrationStatus === 'success' && (isPending ? 'Registration Submitted!' : 'Registration Complete!')}
            {registrationStatus === 'error' && (isDuplicate ? 'Already Registered' : 'Registration Failed')}
          </h1>

          <p className="status-subtitle">
            {registrationStatus === 'saving' && 'Please wait while we secure your data.'}
            {registrationStatus === 'success' && (isPending ? 'Your account is pending administrator approval.' : 'Your account has been successfully created.')}
            {registrationStatus === 'error' && errorMessage}
          </p>
        </div>

        {/* Success Content */}
        {registrationStatus === 'success' && (
          <div className="success-content">

            {/* Digital ID Card Preview */}
            <div className={`digital-id-card ${isPending ? 'pending' : ''}`}>
              <div className="id-card-header">
                <div className="id-card-logo">RTU</div>
                <div className="id-card-type">{getRoleDisplay()}</div>
              </div>
              <div className="id-card-body">
                <div className="id-avatar">
                  {registrationData.personalInfo?.firstName?.charAt(0)}
                </div>
                <div className="id-details">
                  <h3>
                    {registrationData.personalInfo?.firstName} {registrationData.personalInfo?.middleName ? registrationData.personalInfo.middleName.charAt(0) + '. ' : ''}
                    {registrationData.personalInfo?.lastName} {registrationData.personalInfo?.suffix}
                  </h3>
                  <p className="id-number">ID: {registrationData.idNumber}</p>
                  <p className="id-uid">UID: {generatedUserId}</p>
                </div>
              </div>
              <div className="id-card-footer">
                <div className="id-chip">
                  <span className="chip-icon">📡</span>
                  <span>{backendResponse?.data?.rfid_tag ? 'RFID Active' : 'No RFID'}</span>
                </div>
                <div className="id-status">{isPending ? 'Pending' : 'Active'}</div>
              </div>
            </div>

            {/* Quick Stats / Info Grid */}
            <div className="info-grid-modern">
              <div className="info-card">
                <span className="info-icon">🆔</span>
                <span className="info-label">System User ID</span>
                <span className="info-value-mono">{generatedUserId}</span>
              </div>
              <div className="info-card">
                <span className="info-icon">🎫</span>
                <span className="info-label">RFID Tag</span>
                <span className="info-value-mono">{backendResponse?.data?.rfid_tag || 'Not Registered'}</span>
              </div>
              <div className="info-card">
                <span className="info-icon">📅</span>
                <span className="info-label">Registered</span>
                <span className="info-value">{formatDate(new Date())}</span>
              </div>
            </div>

            {/* Next Steps */}
            <div className="next-steps-modern">
              <h3>What's Next?</h3>
              <div className="steps-timeline">
                <div className="timeline-item">
                  <div className="timeline-marker">1</div>
                  <div className="timeline-content">
                    {isPending ? (
                      <>
                        <strong>Admin Verification</strong>
                        <p>Wait for an administrator to approve your account</p>
                      </>
                    ) : (
                      <>
                        <strong>Login</strong>
                        <p>Use your School ID or tap your RFID card</p>
                      </>
                    )}
                  </div>
                </div>
                <div className="timeline-item">
                  <div className="timeline-marker">2</div>
                  <div className="timeline-content">
                    <strong>Access</strong>
                    <p>To access 4 in Juan Vital Signs</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Area */}
            <div className="action-area">
              <button className="continue-btn-modern" onClick={handleContinue}>
                <span>Continue to Login</span>
                <div className="btn-timer">
                  <svg viewBox="0 0 36 36" className="circular-chart">
                    <path className="circle-bg" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                    <path className="circle" strokeDasharray={`${(countdown / 15) * 100}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" />
                  </svg>
                  <span>{countdown}s</span>
                </div>
              </button>
            </div>

          </div>
        )}

        {/* Error State Actions */}
        {registrationStatus === 'error' && (
          <div className="error-actions">
            {isDuplicate ? (
              <div className="duplicate-redirect">
                <p>Redirecting in {countdown}s...</p>
                <button className="retry-button" onClick={handleContinue}>
                  Go to Login Now
                </button>
              </div>
            ) : (
              <button className="retry-button" onClick={() => window.location.reload()}>
                Try Again
              </button>
            )}
          </div>
        )}

      </div>
    </div>
  );
}