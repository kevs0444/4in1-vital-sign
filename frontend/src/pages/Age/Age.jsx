import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Age.css";
import ageImage from "../../assets/images/age.png";

export default function Age() {
  const navigate = useNavigate();
  const location = useLocation();
  const [age, setAge] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    if (!age.trim()) {
      alert("Please enter your age");
      return;
    }

    const ageNumber = parseInt(age, 10);
    if (ageNumber < 1 || ageNumber > 99) {
      alert("Please enter a valid age (1–99)");
      return;
    }

    // Navigate to Sex.jsx page
    navigate("/sex", { state: { ...location.state, age: ageNumber } });
  };

  const handleNumberClick = (num) => {
    // Limit input to 2 digits only
    if (age.length < 2) {
      const newAge = (age + num).replace(/^0+(?=\d)/, ""); // remove leading zeros
      setAge(newAge);
    }
  };

  const handleDelete = () => {
    setAge((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setAge("");
  };

  return (
    <div className="age-container">
      <div className="content-area">
        <div className={`age-content ${isVisible ? "visible" : ""}`}>
          {/* Progress Section */}
          <div className="progress-section">
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: "66%" }}></div>
            </div>
            <span className="progress-step">Step 2 of 3</span>
          </div>

          {/* Logo */}
          <div className="image-section">
            <img src={ageImage} alt="Age Illustration" className="age-logo" />
          </div>

          {/* Header */}
          <div className="header-section">
            <h1 className="main-title">How old are you?</h1>
            <p className="subtitle">
              Let us know your age to personalize your experience
            </p>
          </div>

          {/* Age Display */}
          <div className="form-section">
            <div className="input-group">
              <label className="input-label">Your Age</label>
              <div
                className={`age-display ${age ? "filled" : ""}`}
                onClick={() => {}}
              >
                {age ? age : <span className="placeholder-text">21</span>}
              </div>
            </div>

            {/* Continue Button */}
            <button
              className={`continue-btn ${!age.trim() ? "disabled" : ""}`}
              onClick={handleContinue}
              disabled={!age.trim()}
            >
              Continue
            </button>
          </div>
        </div>
      </div>

      {/* Custom Numpad */}
      <div className="numpad-section">
        <div className="numpad-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              className="numpad-btn"
              onClick={() => handleNumberClick(num)}
            >
              {num}
            </button>
          ))}
          <button className="numpad-btn clear" onClick={handleClear}>
            C
          </button>
          <button className="numpad-btn" onClick={() => handleNumberClick(0)}>
            0
          </button>
          <button className="numpad-btn delete" onClick={handleDelete}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
