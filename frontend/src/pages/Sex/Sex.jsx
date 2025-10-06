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
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

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
    
    // Pass data to next page
    navigate("/starting", {
      state: {
        ...location.state,
        sex: selectedSex
      }
    });
  };

  const handleBack = () => {
    navigate("/age");
  };

  return (
    <div className="sex-container">
      <div className={`sex-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '100%'}}></div>
          </div>
          <span className="progress-step">Step 3 of 3</span>
        </div>

        {/* Title */}
        <div className="sex-header">
          <h1 className="sex-title">What is your biological sex?</h1>
          <p className="sex-subtitle">Required for accurate health assessment</p>
        </div>

        {/* Sex Selection */}
        <div className="sex-selection">
          <div className="sex-options">
            <div 
              className={`sex-option ${selectedSex === 'male' ? 'selected' : ''}`}
              onClick={() => handleSexSelect('male')}
            >
              <div className="sex-icon">
                <img src={maleIcon} alt="Male" />
              </div>
              <span className="sex-label">Male</span>
            </div>

            <div 
              className={`sex-option ${selectedSex === 'female' ? 'selected' : ''}`}
              onClick={() => handleSexSelect('female')}
            >
              <div className="sex-icon">
                <img src={femaleIcon} alt="Female" />
              </div>
              <span className="sex-label">Female</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="sex-actions">
          <button 
            className="back-button"
            onClick={handleBack}
          >
            Back
          </button>
          
          <button 
            className="continue-button"
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