import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Starting.css";
import logo from "../../../assets/images/logo.png";

export default function Starting() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: "",
    role: ""
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
    // Get user data from location state (passed from MeasurementWelcome)
    if (location.state) {
      console.log("📥 Received user data in Starting:", location.state);
      setUserData(location.state);
    } else {
      // If no data passed, try to get from localStorage
      try {
        const storedUser = localStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log("📥 Retrieved user data from localStorage:", user);
          setUserData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            age: user.age || "",
            sex: user.sex || "",
            role: user.role || ""
          });
        }
      } catch (error) {
        console.error("❌ Error retrieving user data:", error);
      }
    }

    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [location.state]);

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
    console.log("🚀 Starting navigation to Checklist with data:", userData);

    navigate("/measure/checklist", {
      state: userData
    });
  };

  // Format the display name
  const getDisplayName = () => {
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    return "User";
  };

  // Format age display
  const getAgeDisplay = () => {
    if (userData.age) {
      return `${userData.age} years old`;
    }
    return "Age not specified";
  };

  // Format sex display
  const getSexDisplay = () => {
    if (userData.sex) {
      return userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1);
    }
    return "Not specified";
  };

  // Format role display
  const getRoleDisplay = () => {
    if (userData.role) {
      return userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    }
    return "Not specified";
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
                {getDisplayName()}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Age:</span>
              <span className="info-value">{getAgeDisplay()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Sex:</span>
              <span className="info-value">{getSexDisplay()}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Role:</span>
              <span className="info-value">{getRoleDisplay()}</span>
            </div>
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