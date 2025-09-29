import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Welcome.css";
import logo from "../../assets/logo.png";

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

    // Auto proceed to next page after 5 seconds
    const autoNavigate = setTimeout(() => {
      navigate("/sex");
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoNavigate);
    };
  }, [location.state, navigate]);

  const handleContinue = () => {
    navigate("/sex");
  };

  const handleBack = () => {
    navigate("/login");
  };

  return (
    <div className="welcome-container">
      {/* Animated Background */}
      <div className="welcome-background">
        <div className="floating-shape shape1"></div>
        <div className="floating-shape shape2"></div>
        <div className="floating-shape shape3"></div>
        <div className="floating-shape shape4"></div>
      </div>

      {/* Main Content */}
      <div className={`welcome-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Logo with Animation */}
        <div className="welcome-logo">
          <img 
            src={logo} 
            alt="Logo" 
            className="logo-image"
          />
          <div className="logo-glow"></div>
        </div>

        {/* Welcome Message */}
        <div className="welcome-message">
          <h1 className="welcome-title">
            Welcome{firstName ? `, ${firstName}` : ''}!
          </h1>
          <div className="welcome-subtitle">
            <p>Before we begin, please provide us with some personal information</p>
            <p className="highlight">to ensure accurate results</p>
          </div>
        </div>

        {/* Animated Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill"></div>
          </div>
          <span className="progress-text">Auto-continuing in 5 seconds...</span>
        </div>

        {/* Action Buttons */}
        <div className="welcome-actions">
          <button 
            className="back-button"
            onClick={handleBack}
          >
            <i className="fas fa-arrow-left"></i>
            Back to Login
          </button>
          
          <button 
            className="continue-button"
            onClick={handleContinue}
          >
            Continue
            <i className="fas fa-arrow-right"></i>
          </button>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="decorative-elements">
        <div className="dot-grid"></div>
      </div>
    </div>
  );
}