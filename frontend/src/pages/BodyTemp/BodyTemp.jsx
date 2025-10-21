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
  const [isMeasuring, setIsMeasuring] = useState(false); // Tracks if backend is busy
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [liveReading, setLiveReading] = useState("");
  const [isReady, setIsReady] = useState(false); // Tracks if temp is valid for measurement
  const [progress, setProgress] = useState(0);

  const pollerRef = useRef(null);
  const measurementTimeout = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    sensorAPI.prepareTemperature().then(() => {
      startPolling(); // Start polling immediately on component mount
    });

    return () => {
      clearTimeout(timer);
      stopPolling();
      sensorAPI.shutdownTemperature();
    };
  }, []);

  const startPolling = () => {
    stopPolling();

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getTemperatureStatus();
        setIsMeasuring(data.measurement_active);
        setIsReady(data.is_ready_for_measurement);
        
        if (data.status && data.status.includes('TEMP_PROGRESS')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = parseInt(progressParts[2]);
          const progressPercent = (elapsed / total) * 100;
          setProgress(progressPercent);
          setStatusMessage(`Measuring... ${elapsed}/${total}s`);
        }
        
        if (data.live_temperature !== null && data.live_temperature !== undefined) {
          setLiveReading(data.live_temperature.toFixed(1));
        }

        if (data.temperature !== null && data.temperature !== undefined) {
          setTemperature(data.temperature.toFixed(1));
        }

        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing sensor...");
            break;
          case 'temp_measurement_started':
            setStatusMessage("Measurement started...");
            break;
          case 'temp_measurement_complete':
            setStatusMessage("Measurement Complete!");
            setProgress(100);
            setLiveReading("");
            setMeasurementComplete(true);
            stopPolling();
            break;
          case 'error':
          case 'temp_reading_invalid':
            setStatusMessage("❌ Measurement Failed. Please try again.");
            stopPolling();
            break;
          default:
            // For idle states, guide the user
            if (!data.measurement_active && !measurementComplete) {
              if (data.live_temperature && data.live_temperature < data.ready_threshold) {
                setStatusMessage(`Sensor is too cold (${data.live_temperature.toFixed(1)}°C). Please warm it up.`);
              } else {
                setStatusMessage("Place sensor near forehead to begin.");
              }
            }
            break;
        }

      } catch (error) {
        console.error("Error polling temperature status:", error);
        setStatusMessage("❌ Connection Error");
        setIsMeasuring(false);
        stopPolling();
      }
    }, 1000);
  };

  const stopPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    if (measurementTimeout.current) {
      clearTimeout(measurementTimeout.current);
      measurementTimeout.current = null;
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !temperature) return;
    
    navigate("/max30102", {
      state: { 
        ...location.state, 
        weight: location.state?.weight,
        height: location.state?.height,
        temperature: parseFloat(temperature) 
      },
    });
  };

  const getTemperatureStatus = (temp) => {
    if (!temp || temp === "--.-") return { text: "Not measured", class: "default" };
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
          {isMeasuring && progress > 0 && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          <div className="temperature-card-container">
            <div className="measurement-card temperature-card">
              <img src={bodyTempIcon} alt="Temperature Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Temperature</h3>
                <div className="measurement-value">
                  <span className="value">
                    {isMeasuring && liveReading ? liveReading : temperature || "--.-"}
                  </span>
                  <span className="unit">°C</span>
                </div>
                <span className={`measurement-status ${statusInfo.class}`}>
                  {statusInfo.text}
                </span>
              </div>
            </div>
          </div>
          
          {/* Live measurement indicator */}
          {isMeasuring && liveReading && (
            <div className="live-measurement-indicator">
              <div className="pulse-ring"></div>
              <span>Live Reading: {liveReading}°C</span>
            </div>
          )}
        </div>

        <div className="measurement-controls">
          {!isMeasuring && !measurementComplete && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>Waiting for valid temperature...</span>
            </div>
          )}
          {measurementComplete && (
            <span className="success-text">✓ Temperature Measured</span>
          )}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete || !temperature}
          >
            Continue to Pulse Oximeter
          </button>
        </div>
      </div>
    </div>
  );
}