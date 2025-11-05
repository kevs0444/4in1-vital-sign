import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Starting.css";
import logo from "../../../assets/images/logo.png";

export default function Starting() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "Juan",
    lastName: "Dela Cruz",
    age: "21",
    sex: "male"
  });

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
    // Use default values regardless of location.state
    setUserData({
      firstName: "Juan",
      lastName: "Dela Cruz",
      age: "21",
      sex: "male"
    });
    
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
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

  // ✅ Fixed navigation path to match routes.js
  const handleStartMeasurements = () => {
    const userData = {
      firstName: "Juan",
      lastName: "Dela Cruz",
      age: "21",
      sex: "male"
    };
    
    console.log("🚀 Starting navigation to BMI with data:", userData);
    
    navigate("/measure/bmi", { 
      state: userData
    });
  };

  return (
    <div className="starting-container">
      <div className={`starting-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Logo */}
        <div className="starting-logo">
          <img 
            src={logo} 
            alt="VitalSign AI Logo" 
            className="logo-image"
          />
        </div>

        {/* Title */}
        <div className="starting-header">
          <h1 className="starting-title">Ready to Begin!</h1>
          <p className="starting-subtitle">Let's start gathering your vital signs</p>
        </div>

        {/* Personal Info Summary */}
        <div className="personal-info-summary">
          <h2 className="summary-title">Your Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Name:</span>
              <span className="info-value">
                Juan Dela Cruz
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Age:</span>
              <span className="info-value">21 years old</span>
            </div>
            <div className="info-item">
              <span className="info-label">Sex:</span>
              <span className="info-value">Male</span>
            </div>
          </div>
          <div className="simulation-notice">
            🔄 Simulation Mode - Using test data
          </div>
        </div>

        {/* Measurement Instructions */}
        <div className="measurement-instructions">
          <h3 className="instructions-title">What's Next?</h3>
          <div className="instructions-list">
            <div className="instruction-item">
              <div className="instruction-icon">⚖️</div>
              <div className="instruction-text">
                <strong>BMI Calculation</strong>
                <span>We'll measure your weight and height for BMI</span>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">🌡️</div>
              <div className="instruction-text">
                <strong>Body Temperature</strong>
                <span>Non-contact temperature scanning</span>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">❤️</div>
              <div className="instruction-text">
                <strong>Pulse Oximeter</strong>
                <span>Finger sensor for Heart Rate, spO2 and Respiratory Rate</span>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">🩺</div>
              <div className="instruction-text">
                <strong>Blood Pressure</strong>
                <span>Cuff measurement for systolic and diastolic pressure</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="starting-actions">
          <button 
            className="start-button"
            onClick={handleStartMeasurements}
          >
            Start Measurements
          </button>
        </div>
      </div>
    </div>
  );
}