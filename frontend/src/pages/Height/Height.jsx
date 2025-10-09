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

  // Function to convert cm to feet and inches
  const convertToFeetInches = (cm) => {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

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

    navigate("/bodytemp", {
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

        {/* Display Section - 50% of content */}
        <div className="height-display-section">
          <div className="height-visual-area">
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
                  <div className="height-conversion">
                    {convertToFeetInches(height)}
                  </div>
                </div>
              ) : (
                <div className="height-placeholder">
                  <span className="height-number">--.--</span>
                  <span className="height-unit">cm</span>
                  <div className="height-conversion">--'--"</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls - Large Start Button */}
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
                <>
                  <div className="button-icon">📏</div>
                  Start Height Measurement
                </>
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
            <div className="education-card">
              <div className="card-icon">📏</div>
              <div className="card-content">
                <h4>BMI Calculation</h4>
                <p>Used with weight to determine body mass index and assess healthy weight ranges.</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🩺</div>
              <div className="card-content">
                <h4>Health Screening</h4>
                <p>Helps track growth patterns and identify potential developmental concerns.</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">📈</div>
              <div className="card-content">
                <h4>Data Consistency</h4>
                <p>Essential for accurate medical assessments and long-term health monitoring.</p>
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