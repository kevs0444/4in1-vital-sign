import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterDataSaved.css";

export default function RegisterDataSaved() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const registrationData = location.state || {};

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
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-redirect after 5 seconds
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
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
  }, []);

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

  const handleContinue = () => {
    navigate("/login");
  };

  const handleViewDetails = () => {
    setShowDetails(!showDetails);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Just now";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getUserTypeDisplay = () => {
    const userType = registrationData.userType;
    switch (userType) {
      case "rtu-students":
        return "RTU Student";
      case "rtu-employees":
        return "RTU Employee";
      case "rtu-admin":
        return "RTU Administrator";
      default:
        return "RTU Member";
    }
  };

  return (
    <div className="register-saved-container">
      <div className={`register-saved-content ${isVisible ? 'visible' : ''}`}>
        {/* Success Animation */}
        <div className="success-animation">
          <div className="success-icon">
            <div className="checkmark">✓</div>
          </div>
          <div className="success-rings">
            <div className="ring ring-1"></div>
            <div className="ring ring-2"></div>
            <div className="ring ring-3"></div>
          </div>
        </div>

        {/* Success Message */}
        <div className="success-message">
          <h1 className="success-title">Registration Complete!</h1>
          <p className="success-subtitle">
            Your account has been successfully created and your ID has been registered.
          </p>
        </div>

        {/* Registration Summary */}
        <div className="registration-summary">
          <div className="summary-card">
            <div className="summary-header">
              <h3>Account Summary</h3>
              <button 
                className="details-toggle"
                onClick={handleViewDetails}
              >
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
                <span className="summary-label">Status</span>
                <span className="summary-value status-active">Active</span>
              </div>
            </div>

            {/* Detailed Information */}
            {showDetails && (
              <div className="detailed-info">
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
                          registrationData.personalInfo.sex.charAt(0).toUpperCase() + registrationData.personalInfo.sex.slice(1) 
                          : 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="info-section">
                  <h4>Account Information</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">
                        {registrationData.userType === 'rtu-employees' ? 'Employee No:' : 'Student No:'}
                      </span>
                      <span className="info-value">{registrationData.idNumber}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Email:</span>
                      <span className="info-value">{registrationData.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Mobile:</span>
                      <span className="info-value">{registrationData.mobile}</span>
                    </div>
                    {registrationData.rfidCode && (
                      <div className="info-item">
                        <span className="info-label">RFID Code:</span>
                        <span className="info-value code">{registrationData.rfidCode}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="info-section">
                  <h4>Registration Details</h4>
                  <div className="info-grid">
                    <div className="info-item">
                      <span className="info-label">Registered On:</span>
                      <span className="info-value">
                        {formatDate(registrationData.registrationDate || registrationData.timestamp)}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">ID Status:</span>
                      <span className="info-value status-registered">
                        {registrationData.idRegistered ? 'Registered' : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
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
                <p>Use your registered ID to enter buildings and access services</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <strong>Login to Your Account</strong>
                <p>Use your {registrationData.userType === 'rtu-employees' ? 'employee' : 'student'} number and password to sign in</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <strong>Complete Your Profile</strong>
                <p>Add more details to your profile for personalized experience</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="continue-button"
            onClick={handleContinue}
          >
            Continue to Login
            <span className="countdown">({countdown}s)</span>
          </button>
          
          <button 
            className="secondary-button"
            onClick={() => window.print()}
          >
            Print Summary
          </button>
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-icon">🔒</div>
          <div className="security-text">
            <strong>Security Notice:</strong> Keep your login credentials secure. 
            Do not share your password with anyone. RTU will never ask for your password.
          </div>
        </div>
      </div>
    </div>
  );
}