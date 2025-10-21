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
  const [statusMessage, setStatusMessage] = useState("Place sensor near forehead to begin.");
  const [liveReading, setLiveReading] = useState("");

  const pollerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(timer);
      stopPolling();
    };
  }, []);

  const handleStartMeasurement = async () => {
    if (isMeasuring) return;

    setIsMeasuring(true);
    setMeasurementComplete(false);
    setTemperature("");
    setLiveReading("");
    setStatusMessage("Initializing sensor...");

    const result = await sensorAPI.startTemperature();
    if (result.status === 'started') {
      startPolling();
    } else {
      setStatusMessage(result.message || "Failed to start measurement.");
      setIsMeasuring(false);
    }
  };
  
  const startPolling = () => {
    stopPolling(); // Ensure no multiple pollers are running

    pollerRef.current = setInterval(async () => {
      const data = await sensorAPI.getTemperatureStatus();
      
      // Update the status message based on the backend's current state
      setStatusMessage(getFriendlyStatusMessage(data.status, data.live_temperature));

      // Update the live reading display
      if (data.live_temperature) {
        setLiveReading(data.live_temperature.toFixed(1));
      }

      // Check if the measurement is fully complete
      if (data.status === 'completed' && data.temperature) {
        setTemperature(data.temperature.toFixed(1));
        setLiveReading(""); // Clear live reading on completion
        setMeasurementComplete(true);
        setIsMeasuring(false);
        stopPolling();
      } else if (data.status === 'error') {
        setIsMeasuring(false);
        stopPolling();
      }
    }, 1000); // Poll every 1 second
  };

  const getFriendlyStatusMessage = (status, liveTemp) => {
    switch (status) {
      case 'initializing_temp_sensor':
        return "Initializing sensor...";
      case 'temp_measurement_started':
        return "Acquiring signal...";
      case 'measuring':
        return liveTemp ? `Measuring... Keep sensor steady.` : "Acquiring signal...";
      case 'completed':
        return "Measurement Complete!";
      case 'error':
        return "❌ Sensor Error. Please try again.";
      default:
        return "Place sensor near forehead to begin.";
    }
  };
  
  const stopPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !temperature) return;
    navigate("/max30102", {
      state: { ...location.state, temperature: parseFloat(temperature) },
    });
  };

  const handleRetry = () => {
    stopPolling();
    setIsMeasuring(false);
    setMeasurementComplete(false);
    setTemperature("");
    setLiveReading("");
    setStatusMessage("Place sensor near forehead to begin.");
  };

  const getTemperatureStatus = (temp) => {
    if (!temp) return { text: "Not measured", class: "default" };
    const tempValue = parseFloat(temp);
    if (tempValue > 37.5) return { text: "Fever Detected", class: "fever" };
    if (tempValue < 36.1) return { text: "Low Temperature", class: "low" };
    return { text: "Normal", class: "normal" };
  };

  const statusInfo = getTemperatureStatus(temperature);

  return (
    <div className="bodytemp-container">
      <div className={`bodytemp-content ${isVisible ? 'visible' : ''}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `75%` }}></div>
          </div>
          <span className="progress-step">Step 3 of 4 - Vital Signs</span>
        </div>

        <div className="bodytemp-header">
          <h1 className="bodytemp-title">Body Temperature</h1>
          <p className="bodytemp-subtitle">{statusMessage}</p>
        </div>

        <div className="sensor-display-section">
          <div className="temperature-card-container">
            <div className="measurement-card temperature-card">
              <img src={bodyTempIcon} alt="Temperature Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Temperature</h3>
                <div className="measurement-value">
                  <span className="value">{isMeasuring && liveReading ? liveReading : temperature || "--.-"}</span>
                  <span className="unit">°C</span>
                </div>
                <span className={`measurement-status ${statusInfo.class}`}>
                  {statusInfo.text}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-controls">
          {!measurementComplete ? (
            <button className="measure-button" onClick={handleStartMeasurement} disabled={isMeasuring}>
              {isMeasuring ? (<><div className="spinner"></div>Measuring...</>) : "🌡️ Start Measurement"}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Temperature Measured</span>
              <button className="retry-button" onClick={handleRetry}>Measure Again</button>
            </div>
          )}
        </div>

        <div className="continue-button-container">
          <button className="continue-button" onClick={handleContinue} disabled={!measurementComplete}>
            Continue to Pulse Oximeter
          </button>
        </div>
      </div>
    </div>
  );
}