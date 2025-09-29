import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Name.css";

export default function Name() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const handleFirstNameChange = (e) => setFirstName(capitalize(e.target.value));
  const handleLastNameChange = (e) => setLastName(capitalize(e.target.value));

  const handleContinue = () => {
    if (!firstName.trim() || !lastName.trim()) {
        alert("Please enter both first name and last name");
        return;
    }
    
    // Pass data to next page
    navigate("/age", {
        state: {
        ...location.state,
        firstName: firstName.trim(),
        lastName: lastName.trim()
        }
    });
    };

  const handleBack = () => {
    navigate("/welcome");
  };

  return (
    <div className="name-container">
      <div className={`name-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '33%'}}></div>
          </div>
          <span className="progress-step">Step 1 of 3</span>
        </div>

        {/* Title */}
        <div className="name-header">
          <h1 className="name-title">What's your name?</h1>
          <p className="name-subtitle">Enter your full name for personalized health tracking</p>
        </div>

        {/* Name Inputs */}
        <div className="name-form">
          <div className="name-input-group">
            <div className="input-container">
              <label htmlFor="firstName" className="input-label">First Name</label>
              <input
                type="text"
                id="firstName"
                className="name-input"
                placeholder="Juan"
                value={firstName}
                onChange={handleFirstNameChange}
                required
                autoFocus
              />
            </div>

            <div className="input-container">
              <label htmlFor="lastName" className="input-label">Last Name</label>
              <input
                type="text"
                id="lastName"
                className="name-input"
                placeholder="Dela Cruz"
                value={lastName}
                onChange={handleLastNameChange}
                required
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="name-actions">
          <button 
            className="back-button"
            onClick={handleBack}
          >
            Back
          </button>
          
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!firstName.trim() || !lastName.trim()}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}