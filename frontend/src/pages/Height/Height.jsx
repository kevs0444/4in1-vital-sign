import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Height.css";
import heightIcon from "../../assets/icons/height-icon.png";

export default function Height() {
  const navigate = useNavigate();
  const location = useLocation();
  const [height, setHeight] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const simulateHeightMeasurement = () => {
    if (isMeasuring) return;

    setIsMeasuring(true);

    setTimeout(() => {
      const randomHeight = (Math.random() * 40 + 140).toFixed(1); // 140–180 cm
      setHeight(randomHeight);
      setIsMeasuring(false);
      setMeasurementComplete(true);
    }, 3000);
  };

  const handleContinue = () => {
    if (!height) {
      alert("Please measure your height first");
      return;
    }

    navigate("/temperature", {
      state: {
        ...location.state,
        height: parseFloat(height),
      },
    });
  };

  const handleRetry = () => {
    setHeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
  };

  return (
    <div className="height-container">
      <div
        className={`height-content ${isVisible ? "visible" : ""} ${
          measurementComplete ? "result-mode" : ""
        }`}
      >
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "50%" }}></div>
          </div>
          <span className="progress-step">Step 2 of 4 - Vital Signs</span>
        </div>

        {/* Header */}
        <div className="height-header">
          <h1 className="height-title">Height Measurement</h1>
          <p className="height-subtitle">
            Stand properly under the sensor for accurate measurement
          </p>
        </div>

        {/* Display Section */}
        <div className="height-display-section">
          <div className="height-icon-container">
            <img src={heightIcon} alt="Height" className="height-icon" />
            <div className={`sensor-indicator ${isMeasuring ? "active" : ""}`}>
              <div className="indicator-dot"></div>
            </div>
          </div>

          <div className="height-value-display">
            {isMeasuring ? (
              <div className="measuring-animation">
                <div className="pulse-dot"></div>
                <span className="measuring-text">Measuring...</span>
              </div>
            ) : measurementComplete ? (
              <div className="height-result">
                <span className="height-number">{height}</span>
                <span className="height-unit">cm</span>
              </div>
            ) : (
              <div className="height-placeholder">
                <span className="height-number">--.--</span>
                <span className="height-unit">cm</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
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
                "Start Height Measurement"
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
          <h3 className="education-title">Why Height Matters</h3>
          <div className="education-points">
            <div className="education-point">
              <span className="point-icon">📏</span>
              <div className="point-text">
                <strong>BMI Calculation</strong>
                <span>Used with weight to determine body mass index.</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">🩺</span>
              <div className="point-text">
                <strong>Health Screening</strong>
                <span>Helps track growth and physical development.</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">📈</span>
              <div className="point-text">
                <strong>Data Consistency</strong>
                <span>Essential for precise medical data analysis.</span>
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
            Continue to Temperature
          </button>
        </div>
      </div>
    </div>
  );
}