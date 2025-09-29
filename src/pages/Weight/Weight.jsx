import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Weight.css";
import weightIcon from "../../assets/icons/weight-icon.png"; // You'll add this icon

export default function Weight() {
  const navigate = useNavigate();
  const location = useLocation();
  const [weight, setWeight] = useState("");
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

  const simulateWeightMeasurement = () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    
    // Simulate measurement process
    setTimeout(() => {
      const randomWeight = (Math.random() * 50 + 50).toFixed(1); // Random weight between 50-100 kg
      setWeight(randomWeight);
      setIsMeasuring(false);
      setMeasurementComplete(true);
    }, 3000);
  };

  const handleContinue = () => {
    if (!weight) {
      alert("Please measure your weight first");
      return;
    }
    
    // Pass data to next page
    navigate("/height", {
      state: {
        ...location.state,
        weight: parseFloat(weight)
      }
    });
  };

  const handleBack = () => {
    navigate("/starting");
  };

  const handleRetry = () => {
    setWeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
  };

  return (
    <div className="weight-container">
      <div className={`weight-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '25%'}}></div>
          </div>
          <span className="progress-step">Step 1 of 4 - Vital Signs</span>
        </div>

        {/* Title */}
        <div className="weight-header">
          <h1 className="weight-title">Weight Measurement</h1>
          <p className="weight-subtitle">Step on the scale for accurate weight reading</p>
        </div>

        {/* Weight Icon and Display */}
        <div className="weight-display-section">
          <div className="weight-icon-container">
            <img 
              src={weightIcon} 
              alt="Weight Scale" 
              className="weight-icon"
            />
            <div className={`scale-platform ${isMeasuring ? 'measuring' : ''}`}>
              <div className="scale-indicator"></div>
            </div>
          </div>

          {/* Weight Value Display */}
          <div className="weight-value-display">
            {isMeasuring ? (
              <div className="measuring-animation">
                <div className="pulse-dot"></div>
                <span className="measuring-text">Measuring...</span>
              </div>
            ) : measurementComplete ? (
              <div className="weight-result">
                <span className="weight-number">{weight}</span>
                <span className="weight-unit">kg</span>
              </div>
            ) : (
              <div className="weight-placeholder">
                <span>--.--</span>
                <span className="weight-unit">kg</span>
              </div>
            )}
          </div>
        </div>

        {/* Measurement Controls */}
        <div className="measurement-controls">
          {!measurementComplete ? (
            <button 
              className="measure-button"
              onClick={simulateWeightMeasurement}
              disabled={isMeasuring}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring...
                </>
              ) : (
                'Start Weight Measurement'
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
          <h3 className="education-title">Why Weight Matters</h3>
          <div className="education-points">
            <div className="education-point">
              <span className="point-icon">⚖️</span>
              <div className="point-text">
                <strong>BMI Calculation</strong>
                <span>Essential for calculating Body Mass Index with height</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">❤️</span>
              <div className="point-text">
                <strong>Heart Health</strong>
                <span>Weight impacts blood pressure and cardiovascular risk</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">📊</span>
              <div className="point-text">
                <strong>Health Tracking</strong>
                <span>Helps monitor progress and detect health changes</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="weight-actions">
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
            Continue to Height
          </button>
        </div>
      </div>
    </div>
  );
}