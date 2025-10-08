import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Weight.css";
import weightIcon from "../../assets/icons/weight-icon.png";

export default function Weight() {
  const navigate = useNavigate();
  const location = useLocation();
  const [weight, setWeight] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const simulateWeightMeasurement = () => {
    if (isMeasuring) return;

    setIsMeasuring(true);

    setTimeout(() => {
      const randomWeight = (Math.random() * 50 + 50).toFixed(1);
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

    navigate("/height", {
      state: {
        ...location.state,
        weight: parseFloat(weight),
      },
    });
  };

  const handleRetry = () => {
    setWeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
  };

  return (
    <div className="weight-container">
      <div
        className={`weight-content ${isVisible ? "visible" : ""} ${
          measurementComplete ? "result-mode" : ""
        }`}
      >
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "25%" }}></div>
          </div>
          <span className="progress-step">Step 1 of 4 - Vital Signs</span>
        </div>

        {/* Header */}
        <div className="weight-header">
          <h1 className="weight-title">Weight Measurement</h1>
          <p className="weight-subtitle">
            Step on the scale for accurate weight reading
          </p>
        </div>

        {/* Display Section */}
        <div className="weight-display-section">
          <div className="weight-icon-container">
            <img src={weightIcon} alt="Weight" className="weight-icon" />
            <div className="scale-platform"></div>
          </div>

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
                <span className="weight-number">--.--</span>
                <span className="weight-unit">kg</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
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
                "Start Weight Measurement"
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Measurement Complete</span>
              <button className="retry-button" onClick={handleRetry}>
                Measure Again
              </button>
            </div>
          )}
        </div>

        {/* Educational Section */}
        <div className="educational-content">
          <h3 className="education-title">Why Weight Matters</h3>
          <div className="education-points">
            <div className="education-point">
              <span className="point-icon">⚖️</span>
              <div className="point-text">
                <strong>BMI Calculation</strong>
                <span>Used with height to determine healthy weight range.</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">❤️</span>
              <div className="point-text">
                <strong>Heart Health</strong>
                <span>Maintaining proper weight reduces heart risk.</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">📊</span>
              <div className="point-text">
                <strong>Health Tracking</strong>
                <span>Helps monitor fitness and detect changes.</span>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="continue-button-container">
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