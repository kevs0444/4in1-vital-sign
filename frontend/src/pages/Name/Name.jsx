import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Name.css";
import nameImage from "../../assets/images/name.png";

export default function Name() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [activeInput, setActiveInput] = useState("first");
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false); // ✅ Temporary shift (not capslock)
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);

  // Fade-in animation and autofocus
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    setTimeout(() => {
      if (firstNameInputRef.current) firstNameInputRef.current.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert("Please enter both first name and last name");
      return;
    }
    navigate("/age", {
      state: {
        ...location.state,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
    });
  };

  // ✅ Shift works for one key only, first letter always uppercase
  const handleKeyboardPress = (key) => {
    if (key === "↑") {
      setIsShift(true); // activate Shift for next character
      return;
    }

    const applyFormatting = (prev, char) => {
      let nextChar = isShift ? char.toUpperCase() : char.toLowerCase();
      setIsShift(false); // Shift works only once

      const newText = prev + nextChar;
      // Always capitalize the first letter of the whole text
      return newText.charAt(0).toUpperCase() + newText.slice(1);
    };

    if (key === "Del") {
      if (activeInput === "first") setFirstName((prev) => prev.slice(0, -1));
      else setLastName((prev) => prev.slice(0, -1));
    } else if (key === "Space") {
      if (activeInput === "first") setFirstName((prev) => prev + " ");
      else setLastName((prev) => prev + " ");
    } else {
      if (activeInput === "first")
        setFirstName((prev) => applyFormatting(prev, key));
      else setLastName((prev) => applyFormatting(prev, key));
    }
  };

  const keyboardKeys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
    ["Space"],
  ];

  return (
    <div className="name-container">
      <div className="name-content-area">
        <div className={`name-content ${isVisible ? "visible" : ""}`}>
          {/* Progress Bar */}
          <div className="name-progress-section">
            <div className="name-progress-bar">
              <div className="name-progress-fill" style={{ width: "33%" }}></div>
            </div>
            <span className="name-progress-step">Step 1 of 3</span>
          </div>

          {/* Image */}
          <div className="name-image-section">
            <img src={nameImage} alt="Name Page" className="name-logo" />
          </div>

          {/* Header */}
          <div className="name-header-section">
            <h1 className="name-main-title">What's your name?</h1>
            <p className="name-subtitle">
              Great to have you here! Let's start with your name
            </p>
          </div>

          {/* Form */}
          <div className="name-form-section">
            <div className="name-input-group">
              {/* First Name */}
              <div className="name-input-field">
                <label htmlFor="firstName" className="name-input-label">
                  First Name
                </label>
                <input
                  ref={firstNameInputRef}
                  id="firstName"
                  type="text"
                  className={`name-text-input ${
                    activeInput === "first" ? "active" : ""
                  }`}
                  placeholder="Juan"
                  value={firstName}
                  onFocus={() => setActiveInput("first")}
                  readOnly
                />
              </div>

              {/* Last Name */}
              <div className="name-input-field">
                <label htmlFor="lastName" className="name-input-label">
                  Last Name
                </label>
                <input
                  ref={lastNameInputRef}
                  id="lastName"
                  type="text"
                  className={`name-text-input ${
                    activeInput === "last" ? "active" : ""
                  }`}
                  placeholder="Dela Cruz"
                  value={lastName}
                  onFocus={() => setActiveInput("last")}
                  readOnly
                />
              </div>
            </div>

            {/* Continue Button */}
            <button
              className={`name-continue-btn ${
                !firstName.trim() || !lastName.trim() ? "disabled" : ""
              }`}
              onClick={handleContinue}
              disabled={!firstName.trim() || !lastName.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* ✅ Custom Keyboard */}
      <div className="custom-keyboard">
        {keyboardKeys.map((row, rowIndex) => (
          <div key={rowIndex} className="keyboard-row">
            {row.map((key) => (
              <button
                key={key}
                className={`keyboard-key ${
                  key === "Del"
                    ? "delete-key"
                    : key === "Space"
                    ? "space-key"
                    : key === "↑"
                    ? `shift-key ${isShift ? "active" : ""}`
                    : ""
                }`}
                onClick={() => handleKeyboardPress(key)}
              >
                {key === "Space" ? "Space" : key}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
