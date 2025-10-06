import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Name.css";

export default function Name() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const formRef = useRef(null);
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const initialHeight = useRef(window.innerHeight);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initialHeight.current = window.innerHeight;

    const handleResize = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDiff = initialHeight.current - currentHeight;
      
      // Keyboard is considered open if viewport shrinks by more than 150px
      const isKeyboard = heightDiff > 150;
      setIsKeyboardOpen(isKeyboard);

      if (isKeyboard && document.activeElement) {
        console.log("Keyboard opened, current height:", currentHeight);
      }
    };

    const handleFocusIn = (e) => {
      if (["text", "email", "tel"].includes(e.target.type)) {
        setTimeout(() => {
          setIsKeyboardOpen(true);
        }, 100);
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const currentHeight = window.visualViewport?.height || window.innerHeight;
        const heightDiff = initialHeight.current - currentHeight;
        if (heightDiff <= 150) {
          setIsKeyboardOpen(false);
        }
      }, 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
    }
    
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      clearTimeout(timer);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      } else {
        window.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
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

  const handleBack = () => navigate("/welcome");

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <div className={`name-container ${isKeyboardOpen ? "keyboard-open" : ""}`}>
      <div ref={formRef} className={`name-content ${isVisible ? "visible" : ""}`}>
        {/* Progress Bar - ALWAYS VISIBLE but smaller when keyboard is open */}
        <div className={`progress-container ${isKeyboardOpen ? "keyboard-open" : ""}`}>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "33%" }}></div>
          </div>
          <span className="progress-step">Step 1 of 3</span>
        </div>

        <div className={`name-header ${isKeyboardOpen ? "keyboard-open" : ""}`}>
          <h1 className="name-title">
            {isKeyboardOpen ? "Enter Your Name" : "What's your name?"}
          </h1>
          {!isKeyboardOpen && (
            <p className="name-subtitle">
              Enter your full name for personalized health tracking
            </p>
          )}
        </div>

        <div className="name-form">
          <div className="name-input-group">
            <div className="input-container">
              <label htmlFor="firstName" className="input-label">
                First Name
              </label>
              <input
                ref={firstNameInputRef}
                type="text"
                id="firstName"
                className="name-input"
                placeholder="Juan"
                value={firstName}
                onChange={handleFirstNameChange}
                onKeyPress={handleKeyPress}
                required
                inputMode="text"
                autoComplete="given-name"
              />
            </div>

            <div className="input-container">
              <label htmlFor="lastName" className="input-label">
                Last Name
              </label>
              <input
                ref={lastNameInputRef}
                type="text"
                id="lastName"
                className="name-input"
                placeholder="Dela Cruz"
                value={lastName}
                onChange={handleLastNameChange}
                onKeyPress={handleKeyPress}
                required
                inputMode="text"
                autoComplete="family-name"
              />
            </div>
          </div>
        </div>

        <div className={`name-actions ${isKeyboardOpen ? "keyboard-open" : ""}`}>
          <button className="back-button" onClick={handleBack}>
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