import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Height.css";
import heightIcon from "../../assets/icons/height-icon.png"; // You'll add this icon

export default function Height() {
  const navigate = useNavigate();
  const location = useLocation();
  const [heightCm, setHeightCm] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);

  useEffect(() => {
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Convert cm to feet and inches
  const cmToFeetInches = (cm) => {
    const inches = cm / 2.54;
    const feet = Math.floor(inches / 12);
    const remainingInches = Math.round(inches % 12);
    return { feet, inches: remainingInches };
  };

  const simulateHeightMeasurement = () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    
    // Simulate measurement process
    setTimeout(() => {
      const randomHeight = (Math.random() * 60 + 140).toFixed(1); // Random height between 140-200 cm
      setHeightCm(randomHeight);
      setIsMeasuring(false);
      setMeasurementComplete(true);
    }, 3000);
  };

  const handleContinue = () => {
    if (!heightCm) {
      alert("Please measure your height first");
      return;
    }
    
    // Pass data to next page
    navigate("/bodytemp", {  // ✅ Remove the hyphen to match your route
      state: {
        ...location.state,
        height: parseFloat(heightCm)
      }
    });
  };

  const handleBack = () => {
    navigate("/weight");
  };

  const handleRetry = () => {
    setHeightCm("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
  };

  // Get feet and inches conversion
  const feetInches = heightCm ? cmToFeetInches(parseFloat(heightCm)) : { feet: 0, inches: 0 };

  return (
    <div className="height-container">
      <div className={`height-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '50%'}}></div>
          </div>
          <span className="progress-step">Step 2 of 4 - Vital Signs</span>
        </div>

        {/* Title */}
        <div className="height-header">
          <h1 className="height-title">Height Measurement</h1>
          <p className="height-subtitle">Stand straight for accurate height reading</p>
        </div>

        {/* Height Icon and Display */}
        <div className="height-display-section">
          <div className="height-icon-container">
            <img 
              src={heightIcon} 
              alt="Height Measurement" 
              className="height-icon"
            />
            <div className={`height-scale ${isMeasuring ? 'measuring' : ''}`}>
              <div className="scale-marker"></div>
            </div>
          </div>

          {/* Height Value Display */}
          <div className="height-value-display">
            {isMeasuring ? (
              <div className="measuring-animation">
                <div className="pulse-dot"></div>
                <span className="measuring-text">Measuring...</span>
              </div>
            ) : measurementComplete ? (
              <div className="height-results">
                {/* Centimeters Display */}
                <div className="height-result primary">
                  <span className="height-number">{heightCm}</span>
                  <span className="height-unit">cm</span>
                </div>
                {/* Feet and Inches Display */}
                <div className="height-result secondary">
                  <span className="height-number">{feetInches.feet}'</span>
                  <span className="height-number">{feetInches.inches}"</span>
                  <span className="height-unit">ft/in</span>
                </div>
              </div>
            ) : (
              <div className="height-placeholder">
                <span>--.--</span>
                <span className="height-unit">cm</span>
              </div>
            )}
          </div>
        </div>

        {/* Measurement Controls */}
        <div className="measurement-controls">
          {!measurementComplete ? (
            <button 
              className="measure-button"
              onClick={simulateHeightMeasurement}
              disabled={isMeasuring}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring...
                </>
              ) : (
                'Start Height Measurement'
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Measurement Complete</span>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                Measure Again
              </button>
            </div>
          )}
        </div>

        {/* Educational Content */}
        <div className="educational-content">
          <h3 className="education-title">Why Height Matters</h3>
          <div className="education-points">
            <div className="education-point">
              <span className="point-icon">📐</span>
              <div className="point-text">
                <strong>BMI Calculation</strong>
                <span>Essential for calculating Body Mass Index with weight</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">📊</span>
              <div className="point-text">
                <strong>Growth Tracking</strong>
                <span>Helps monitor development and nutritional status</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">💪</span>
              <div className="point-text">
                <strong>Body Proportions</strong>
                <span>Important for assessing overall body composition</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="height-actions">
          <button 
            className="back-button"
            onClick={handleBack}
          >
            Back
          </button>
          
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!measurementComplete}
          >
            Continue to Body Temp
          </button>
        </div>
      </div>
    </div>
  );
}