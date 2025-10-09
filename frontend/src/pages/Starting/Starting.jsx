import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Starting.css";
import logo from "../../assets/images/logo.png";

export default function Starting() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: ""
  });

  useEffect(() => {
    if (location.state) {
      setUserData({
        firstName: location.state.firstName || "",
        lastName: location.state.lastName || "",
        age: location.state.age || "",
        sex: location.state.sex || ""
      });
    }
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, [location.state]);

  const handleStartMeasurements = () => {
    navigate("/weight", { state: userData });
  };

  const getSexDisplay = (sex) => {
    return sex === 'male' ? 'Male' : sex === 'female' ? 'Female' : '';
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
                {userData.firstName} {userData.lastName}
              </span>
            </div>
            <div className="info-item">
              <span className="info-label">Age:</span>
              <span className="info-value">{userData.age} years old</span>
            </div>
            <div className="info-item">
              <span className="info-label">Sex:</span>
              <span className="info-value">{getSexDisplay(userData.sex)}</span>
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
                <strong>Weight Measurement</strong>
                <span>Step on the scale for accurate weight reading</span>
              </div>
            </div>
            <div className="instruction-item">
              <div className="instruction-icon">📏</div>
              <div className="instruction-text">
                <strong>Height Measurement</strong>
                <span>Stand straight for height detection</span>
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
