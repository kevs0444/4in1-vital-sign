import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import bodyTempIcon from "../../assets/icons/temp-icon.png";
import { sensorAPI } from "../../utils/api";

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [temperature, setTemperature] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [sensorStatus, setSensorStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [userDetectionStatus, setUserDetectionStatus] = useState(""); // "no_user", "no_contact", "measuring"
  const [currentTempReading, setCurrentTempReading] = useState("");
  
  const measurementInterval = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    checkSensorConnection();

    return () => {
      clearTimeout(timer);
      stopMeasurement();
      if (measurementInterval.current) {
        clearInterval(measurementInterval.current);
      }
    };
  }, []);

  const checkSensorConnection = async () => {
    try {
      setSensorStatus("checking");
      setErrorMessage("");
      
      const result = await sensorAPI.testConnection();
      if (result.status === 'connected') {
        setSensorStatus("connected");
      } else {
        setSensorStatus("error");
        setErrorMessage("Temperature sensor not detected. Please check connection.");
      }
    } catch (error) {
      setSensorStatus("error");
      setErrorMessage("Failed to connect to temperature sensor. Please ensure device is connected properly.");
      console.error("Sensor connection error:", error);
    }
  };

  const startRealMeasurement = async () => {
    if (isMeasuring || measurementComplete) return;

    if (sensorStatus === "error") {
      alert("Cannot start measurement. Please check sensor connection first.");
      return;
    }

    setIsMeasuring(true);
    setErrorMessage("");
    setUserDetectionStatus("");
    setCurrentTempReading("");
    setTemperature("");

    try {
      // Start measurement on backend
      const startResult = await sensorAPI.startTemperature();
      
      if (startResult.error) {
        throw new Error(startResult.error);
      }

      // Handle initial detection status
      if (startResult.status === 'no_user' || startResult.status === 'no_contact') {
        setUserDetectionStatus(startResult.status);
        setErrorMessage(startResult.message);
      }

      // Start polling for measurement status
      measurementInterval.current = setInterval(async () => {
        try {
          const status = await sensorAPI.getTemperatureStatus();
          
          if (status.status === 'completed' && status.temperature) {
            // Measurement completed successfully
            setTemperature(status.temperature.toFixed(1));
            setIsMeasuring(false);
            setMeasurementComplete(true);
            setUserDetectionStatus("");
            setErrorMessage("");
            clearInterval(measurementInterval.current);
          } else if (status.status === 'no_user' || status.status === 'no_contact') {
            // No user detected or poor contact
            setUserDetectionStatus(status.status);
            setErrorMessage(status.message);
            setCurrentTempReading("");
          } else if (status.status === 'measuring' && status.temperature) {
            // Valid measurement in progress
            setCurrentTempReading(status.temperature.toFixed(1));
            setUserDetectionStatus("");
            setErrorMessage("");
          }
        } catch (error) {
          console.error("Error checking measurement status:", error);
        }
      }, 1000);

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (isMeasuring && !measurementComplete) {
          stopMeasurement();
          setErrorMessage("Measurement timeout. Please try again.");
        }
      }, 30000);

    } catch (error) {
      console.error("Error starting measurement:", error);
      setSensorStatus("error");
      setErrorMessage("Failed to start measurement. Please check sensor connection.");
      setIsMeasuring(false);
    }
  };

  const stopMeasurement = async () => {
    try {
      await sensorAPI.stopMeasurement();
      if (measurementInterval.current) {
        clearInterval(measurementInterval.current);
        measurementInterval.current = null;
      }
      setIsMeasuring(false);
    } catch (error) {
      console.error("Error stopping measurement:", error);
    }
  };

  const handleContinue = () => {
    if (!temperature) {
      alert("Please measure your temperature first");
      return;
    }

    const tempValue = parseFloat(temperature);
    const tempStatus = getTemperatureStatus(tempValue);

    navigate("/max30102", {
      state: {
        ...location.state,
        temperature: tempValue,
        temperatureStatus: tempStatus.text,
        temperatureStatusClass: tempStatus.class,
      },
    });
  };

  const handleRetry = () => {
    setTemperature("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setErrorMessage("");
    setUserDetectionStatus("");
    setCurrentTempReading("");
    
    if (measurementInterval.current) {
      clearInterval(measurementInterval.current);
      measurementInterval.current = null;
    }
  };

  const getTemperatureStatus = (temp = parseFloat(temperature)) => {
    if (!temp) return { text: "", class: "" };
    if (temp < 36.1) return { text: "Low Temperature", class: "temperature-low" };
    if (temp > 37.5) return { text: "Fever Detected", class: "temperature-fever" };
    return { text: "Normal Temperature", class: "temperature-normal" };
  };

  const getDetectionMessage = () => {
    switch (userDetectionStatus) {
      case "no_user":
        return "❌ No user detected. Please ensure the sensor is properly placed on your forehead.";
      case "no_contact":
        return "⚠️ Poor sensor contact. Please press the sensor firmly against your forehead.";
      default:
        return "";
    }
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
          <h1 className="bodytemp-title">Body Temperature Measurement</h1>
          <p className="bodytemp-subtitle">
            Place the sensor on your forehead for accurate reading
          </p>
          
          {/* Sensor Status Indicator */}
          <div className={`sensor-status ${sensorStatus}`}>
            <div className="status-indicator"></div>
            <span className="status-text">
              {sensorStatus === "connected" && "✅ Sensor Connected"}
              {sensorStatus === "checking" && "🔍 Checking Sensor..."}
              {sensorStatus === "error" && "❌ Sensor Not Connected"}
            </span>
          </div>
        </div>

        {/* Display Section */}
        <div className="bodytemp-display-section">
          <div className="bodytemp-visual-area">
            <div className="bodytemp-icon-container">
              <img src={bodyTempIcon} alt="Temperature" className="bodytemp-icon" />
              <div className={`sensor-glow ${isMeasuring ? "measuring" : ""}`}></div>
            </div>

            <div className="bodytemp-value-display">
              {isMeasuring ? (
                <div className="measuring-animation">
                  <div className="pulse-dot"></div>
                  {userDetectionStatus ? (
                    <div className="detection-warning">
                      <span className="warning-icon">⚠️</span>
                      <span className="warning-text">{getDetectionMessage()}</span>
                    </div>
                  ) : (
                    <>
                      <span className="measuring-text">Measuring Temperature...</span>
                      {currentTempReading && (
                        <div className="live-reading">
                          Current: {currentTempReading}°C
                        </div>
                      )}
                      <span className="measurement-tip">Keep sensor steady on forehead</span>
                    </>
                  )}
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

        {/* Error Message Display */}
        {errorMessage && !userDetectionStatus && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {errorMessage}
            <button className="retry-connection" onClick={checkSensorConnection}>
              Retry Connection
            </button>
          </div>
        )}

        {/* User Detection Warning */}
        {userDetectionStatus && (
          <div className={`user-detection-warning ${userDetectionStatus}`}>
            <span className="warning-icon">
              {userDetectionStatus === "no_user" ? "❌" : "⚠️"}
            </span>
            <span className="warning-text">{getDetectionMessage()}</span>
            <div className="detection-tips">
              <strong>Tips:</strong>
              <ul>
                <li>Ensure sensor is clean and unobstructed</li>
                <li>Place sensor firmly on forehead</li>
                <li>Stay still during measurement</li>
                <li>Remove hats or head coverings</li>
              </ul>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="measurement-controls">
          {!measurementComplete ? (
            <button
              className="measure-button"
              onClick={startRealMeasurement}
              disabled={isMeasuring || sensorStatus === "error"}
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