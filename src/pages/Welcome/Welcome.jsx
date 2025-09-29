import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Welcome.css";
import logo from "../../assets/images/logo.png";

export default function Welcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Get user data from location state (passed from Login)
    if (location.state && location.state.firstName) {
      setFirstName(location.state.firstName);
    }
    
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => {
      clearTimeout(timer);
    };
  }, [location.state]);

  const handleContinue = () => {
    navigate("/sex");
  };

  return (
    <div className="welcome-container">
      {/* Main Content */}
      <div className={`welcome-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Logo */}
        <div className="welcome-logo">
          <img 
            src={logo} 
            alt="VitalSign AI Logo" 
            className="logo-image"
          />
        </div>

        {/* Welcome Message */}
        <div className="welcome-message">
          <h1 className="welcome-title">
            Welcome to VitalSign AI!
          </h1>
          <div className="system-description">
            <p className="system-tagline">Four-in-One Vital Sign Sensor</p>
            <p className="system-features">with BMI Calculation using AI and IoT</p>
            <p className="system-purpose">for Health Risk Prediction</p>
          </div>
          <div className="welcome-subtitle">
            <p>Before we begin, please provide us with some personal information</p>
            <p>to ensure accurate monitoring and personalized health insights.</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="welcome-actions">
          <button 
            className="continue-button"
            onClick={handleContinue}
          >
            OK, Let's Start
          </button>
        </div>
      </div>
    </div>
  );
}