import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import bodyTempIcon from "../../assets/icons/temp-icon.png";

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [temperature, setTemperature] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const simulateTemperatureMeasurement = () => {
    if (isMeasuring) return;

    setIsMeasuring(true);

    setTimeout(() => {
      // Normal range: 36.1°C - 37.2°C, fever: >37.5°C
      const randomTemp = (Math.random() * 2 + 36.0).toFixed(1);
      setTemperature(randomTemp);
      setIsMeasuring(false);
      setMeasurementComplete(true);
    }, 3000);
  };

  const handleContinue = () => {
    if (!temperature) {
      alert("Please measure your temperature first");
      return;
    }

    const tempValue = parseFloat(temperature);
    const tempStatus = getTemperatureStatus(tempValue);

    console.log("📤 BodyTemp Sending Data to Max30102:", {
      ...location.state,
      temperature: tempValue,
      temperatureStatus: tempStatus.text,
      temperatureStatusClass: tempStatus.class,
      timestamp: new Date().toISOString()
    });

    // Navigate to Max30102 page with all collected data including temperature
    navigate("/max30102", {
      state: {
        ...location.state, // Preserve previous data (personal info, etc.)
        temperature: tempValue,
        temperatureStatus: tempStatus.text,
        temperatureStatusClass: tempStatus.class,
        timestamp: new Date().toISOString()
      },
    });
  };

  const handleRetry = () => {
    setTemperature("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
  };

  const getTemperatureStatus = (temp = parseFloat(temperature)) => {
    if (temp < 36.1) return { text: "Low Temperature", class: "temperature-low" };
    if (temp > 37.5) return { text: "Fever Detected", class: "temperature-fever" };
    return { text: "Normal Temperature", class: "temperature-normal" };
  };

  const status = measurementComplete ? getTemperatureStatus() : null;

  return (
    <div className="bodytemp-container">
      <div
        className={`bodytemp-content ${isVisible ? "visible" : ""} ${
          measurementComplete ? "result-mode" : ""
        }`}
      >
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "75%" }}></div>
          </div>
          <span className="progress-step">Step 3 of 4 - Vital Signs</span>
        </div>

        {/* Header */}
        <div className="bodytemp-header">
          <h1 className="bodytemp-title">Body Temperature</h1>
          <p className="bodytemp-subtitle">
            Place the sensor on your forehead for accurate reading
          </p>
        </div>

        {/* Display Section - Takes 50% of content */}
        <div className="bodytemp-display-section">
          <div className="bodytemp-visual-area">
            <div className="bodytemp-icon-container">
              <img src={bodyTempIcon} alt="Temperature" className="bodytemp-icon" />
              <div className={`thermometer-indicator ${isMeasuring ? "active" : ""}`}>
                <div className="indicator-dot"></div>
              </div>
            </div>

            <div className="bodytemp-value-display">
              {isMeasuring ? (
                <div className="measuring-animation">
                  <div className="pulse-dot"></div>
                  <span className="measuring-text">Measuring...</span>
                </div>
              ) : measurementComplete ? (
                <div className="bodytemp-result">
                  <span className="bodytemp-number">{temperature}</span>
                  <span className="bodytemp-unit">°C</span>
                  {status && (
                    <div className={`temperature-status ${status.class}`}>
                      {status.text}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bodytemp-placeholder">
                  <span className="bodytemp-number">--.-</span>
                  <span className="bodytemp-unit">°C</span>
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
              onClick={simulateTemperatureMeasurement}
              disabled={isMeasuring}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring...
                </>
              ) : (
                <>
                  <div className="button-icon">🌡️</div>
                  Start Temperature Measurement
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
          <h3 className="education-title">Why Temperature Matters</h3>
          <div className="education-points">
            <div className="education-card">
              <div className="card-icon">🌡️</div>
              <div className="card-content">
                <h4>Health Indicator</h4>
                <p>Body temperature reflects overall health status and can detect infections.</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🦠</div>
              <div className="card-content">
                <h4>Infection Detection</h4>
                <p>Fever is often the first sign of infection or inflammation.</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">⚕️</div>
              <div className="card-content">
                <h4>Medical Assessment</h4>
                <p>Helps healthcare providers diagnose and monitor conditions.</p>
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
            Continue to Pulse Oximeter
          </button>
        </div>
      </div>
    </div>
  );
}