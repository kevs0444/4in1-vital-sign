import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import tempIcon from "../../assets/icons/temp-icon.png"; // You'll add this icon

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [temperature, setTemperature] = useState("");
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

  const simulateTemperatureMeasurement = () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    
    // Simulate measurement process
    setTimeout(() => {
      const randomTemp = (Math.random() * 2 + 36.5).toFixed(1); // Random temp between 36.5-38.5°C
      setTemperature(randomTemp);
      setIsMeasuring(false);
      setMeasurementComplete(true);
    }, 3000);
  };

  const handleContinue = () => {
    if (!temperature) {
      alert("Please measure your body temperature first");
      return;
    }
    
    // Pass data to next page
    navigate("/max30102", {
      state: {
        ...location.state,
        bodyTemp: parseFloat(temperature)
      }
    });
  };

  const handleBack = () => {
    navigate("/height");
  };

  const handleRetry = () => {
    setTemperature("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
  };

  // Convert Celsius to Fahrenheit
  const celsiusToFahrenheit = (celsius) => {
    return ((celsius * 9/5) + 32).toFixed(1);
  };

  const fahrenheitTemp = temperature ? celsiusToFahrenheit(parseFloat(temperature)) : "0.0";

  return (
    <div className="bodytemp-container">
      <div className={`bodytemp-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '75%'}}></div>
          </div>
          <span className="progress-step">Step 3 of 4 - Vital Signs</span>
        </div>

        {/* Title */}
        <div className="bodytemp-header">
          <h1 className="bodytemp-title">Body Temperature</h1>
          <p className="bodytemp-subtitle">Non-contact temperature scanning</p>
        </div>

        {/* Temperature Icon and Display */}
        <div className="bodytemp-display-section">
          <div className="bodytemp-icon-container">
            <img 
              src={tempIcon} 
              alt="Temperature Measurement" 
              className="bodytemp-icon"
            />
            <div className={`temp-scanner ${isMeasuring ? 'scanning' : ''}`}>
              <div className="scanner-beam"></div>
            </div>
          </div>

          {/* Temperature Value Display */}
          <div className="bodytemp-value-display">
            {isMeasuring ? (
              <div className="measuring-animation">
                <div className="pulse-dot"></div>
                <span className="measuring-text">Scanning Temperature...</span>
              </div>
            ) : measurementComplete ? (
              <div className="bodytemp-results">
                {/* Celsius Display */}
                <div className="bodytemp-result primary">
                  <span className="bodytemp-number">{temperature}</span>
                  <span className="bodytemp-unit">°C</span>
                </div>
                {/* Fahrenheit Display */}
                <div className="bodytemp-result secondary">
                  <span className="bodytemp-number">{fahrenheitTemp}</span>
                  <span className="bodytemp-unit">°F</span>
                </div>
              </div>
            ) : (
              <div className="bodytemp-placeholder">
                <span>--.-</span>
                <span className="bodytemp-unit">°C</span>
              </div>
            )}
          </div>
        </div>

        {/* Measurement Controls */}
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
                  Scanning...
                </>
              ) : (
                'Start Temperature Scan'
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Measurement Complete</span>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                Scan Again
              </button>
            </div>
          )}
        </div>

        {/* Temperature Status Indicator */}
        {measurementComplete && (
          <div className="temperature-status">
            <div className={`status-indicator ${parseFloat(temperature) >= 37.5 ? 'fever' : 'normal'}`}>
              <span className="status-icon">
                {parseFloat(temperature) >= 37.5 ? '🤒' : '😊'}
              </span>
              <span className="status-text">
                {parseFloat(temperature) >= 37.5 ? 'Elevated Temperature' : 'Normal Temperature'}
              </span>
            </div>
          </div>
        )}

        {/* Educational Content */}
        <div className="educational-content">
          <h3 className="education-title">Why Temperature Matters</h3>
          <div className="education-points">
            <div className="education-point">
              <span className="point-icon">🌡️</span>
              <div className="point-text">
                <strong>Health Indicator</strong>
                <span>Body temperature is a key indicator of overall health status</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">🦠</span>
              <div className="point-text">
                <strong>Infection Detection</strong>
                <span>Elevated temperature can indicate infection or inflammation</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">💊</span>
              <div className="point-text">
                <strong>Treatment Monitoring</strong>
                <span>Helps track recovery and response to treatment</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="bodytemp-actions">
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
            Continue to Heart Rate
          </button>
        </div>
      </div>
    </div>
  );
}