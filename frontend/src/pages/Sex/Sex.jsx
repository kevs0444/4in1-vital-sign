import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sex.css";
import maleIcon from "../../assets/icons/male-icon.png";
import femaleIcon from "../../assets/icons/female-icon.png";

export default function Sex() {
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedSex, setSelectedSex] = useState("");
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const handleSexSelect = (sex) => {
    setSelectedSex(sex);
  };

  const handleContinue = () => {
    if (!selectedSex) {
      alert("Please select your biological sex");
      return;
    }

    navigate("/starting", {
      state: { ...location.state, sex: selectedSex },
    });
  };

  return (
    <div className="sex-container">
      <div className={`sex-content ${isVisible ? "visible" : ""}`}>
        {/* Progress Section */}
        <div className="progress-section">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "100%" }}></div>
          </div>
          <span className="progress-step">Step 3 of 3</span>
        </div>

        {/* Header */}
        <div className="header-section">
          <h1 className="main-title">What is your biological sex?</h1>
          <p className="subtitle">Required for accurate health assessment</p>
        </div>

        {/* Sex Selection */}
        <div className="sex-selection">
          <div className="sex-options">
            <div
              className={`sex-option ${selectedSex === "male" ? "selected" : ""}`}
              onClick={() => handleSexSelect("male")}
            >
              <div className="sex-icon">
                <img src={maleIcon} alt="Male" />
              </div>
              <span className="sex-label">Male</span>
            </div>
            <div
              className={`sex-option ${selectedSex === "female" ? "selected" : ""}`}
              onClick={() => handleSexSelect("female")}
            >
              <div className="sex-icon">
                <img src={femaleIcon} alt="Female" />
              </div>
              <span className="sex-label">Female</span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="sex-disclaimer">
          <p>
            We ask for your biological sex to provide accurate BMI calculations and health assessments. 
            This information will not be shared publicly.
          </p>
        </div>

        {/* Continue Button */}
        <div className="sex-actions">
          <button
            className={`continue-btn ${!selectedSex ? "disabled" : ""}`}
            onClick={handleContinue}
            disabled={!selectedSex}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
