import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Name.css";
import nameImage from "../../assets/images/name.png";

export default function Name() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const firstNameInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-focus on first name input
    setTimeout(() => {
      if (firstNameInputRef.current) {
        firstNameInputRef.current.focus();
      }
    }, 500);

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
    navigate("/age", {
      state: { ...location.state, firstName: firstName.trim(), lastName: lastName.trim() },
    });
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <div className="name-container">
      <div className="content-area">
        <div className={`name-content ${isVisible ? 'visible' : ''}`}>
          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "33%" }}></div>
            </div>
            <span className="progress-step">Step 1 of 3</span>
          </div>

          {/* Image Section with Logo */}
          <div className="image-section">
            <img
              src={nameImage}
              alt="Name Page Illustration"
              className="name-logo"
            />
          </div>

          {/* Header Section */}
          <div className="header-section">
            <h1 className="main-title">What's your name?</h1>
            <p className="subtitle">Great to have you here! Let's start with your name</p>
          </div>

          {/* Form Section */}
          <div className="form-section">
            <div className="input-group">
              <div className="input-field">
                <label htmlFor="firstName" className="input-label">First Name</label>
                <input
                  ref={firstNameInputRef}
                  id="firstName"
                  type="text"
                  className="text-input"
                  placeholder="Juan"
                  value={firstName}
                  onChange={handleFirstNameChange}
                  onKeyPress={handleKeyPress}
                  autoComplete="given-name"
                />
              </div>

              <div className="input-field">
                <label htmlFor="lastName" className="input-label">Last Name</label>
                <input
                  id="lastName"
                  type="text"
                  className="text-input"
                  placeholder="Dela Cruz"
                  value={lastName}
                  onChange={handleLastNameChange}
                  onKeyPress={handleKeyPress}
                  autoComplete="family-name"
                />
              </div>
            </div>

            {/* Continue Button */}
            <button
              className={`continue-btn ${!firstName.trim() || !lastName.trim() ? 'disabled' : ''}`}
              onClick={handleContinue}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      </div>
      
      {/* 30% Keyboard Space */}
      <div className="keyboard-space"></div>
    </div>
  );
}