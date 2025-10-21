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
  const [progress, setProgress] = useState(0);

  const pollerRef = useRef(null);
  const measurementTimeout = useRef(null);

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
    setStatusMessage("Initializing temperature sensor...");
    setProgress(0);

    try {
      const result = await sensorAPI.startTemperature();
      if (result.status === 'started') {
        setStatusMessage("Starting temperature measurement...");
        startPolling();
      } else {
        setStatusMessage(result.message || "Failed to start measurement.");
        setIsMeasuring(false);
      }
    } catch (error) {
      setStatusMessage("❌ Connection Failed. Check backend.");
      setIsMeasuring(false);
    }
  };

  const startPolling = () => {
    stopPolling();

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getTemperatureStatus();
        console.log("Temperature status:", data);
        
        // Handle progress updates
        if (data.status && data.status.includes('TEMP_PROGRESS')) {
          const progressParts = data.status.split(':');
          if (progressParts.length >= 3) {
            const elapsed = parseInt(progressParts[1]);
            const total = parseInt(progressParts[2]);
            const progressPercent = (elapsed / total) * 100;
            setProgress(progressPercent);
            setStatusMessage(`Measuring temperature... ${elapsed}/${total}s`);
          }
        }
        
        // Update live reading display
        if (data.live_temperature !== null && data.live_temperature !== undefined) {
          setLiveReading(data.live_temperature.toFixed(1));
        }

        // Update final temperature if available
        if (data.temperature !== null && data.temperature !== undefined) {
          setTemperature(data.temperature.toFixed(1));
        }

        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing Temperature Sensor...");
            break;
          case 'temp_measurement_started':
            setStatusMessage("Starting temperature measurement...");
            break;
          case 'temp_measurement_complete':
            setStatusMessage("Temperature Measurement Complete!");
            setProgress(100);
            if (data.temperature) {
              setTemperature(data.temperature.toFixed(1));
              setLiveReading("");
              setMeasurementComplete(true);
              setIsMeasuring(false);
              stopPolling();
            }
            break;
          case 'error':
          case 'temp_reading_invalid':
            setStatusMessage("❌ Temperature Measurement Failed");
            setIsMeasuring(false);
            stopPolling();
            break;
          default:
            if (data.status && !data.status.includes('TEMP_PROGRESS')) {
              setStatusMessage(data.status);
            }
            break;
        }

        // Direct result check
        if (data.temperature && data.temperature > 0 && !measurementComplete) {
          console.log("Temperature result received:", data.temperature);
          setTemperature(data.temperature.toFixed(1));
          setMeasurementComplete(true);
          setIsMeasuring(false);
          setStatusMessage("Temperature Measurement Complete!");
          setProgress(100);
          stopPolling();
        }

        // If measurement is no longer active but we don't have result
        if (!data.measurement_active && isMeasuring && !measurementComplete) {
          console.log("Temperature measurement stopped without result");
          setStatusMessage("❌ Measurement stopped. Please try again.");
          setIsMeasuring(false);
          stopPolling();
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

  const handleRetry = () => {
    stopPolling();
    setIsMeasuring(false);
    setMeasurementComplete(false);
    setTemperature("");
    setLiveReading("");
    setStatusMessage("Place sensor near forehead to begin.");
    setProgress(0);
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
          {!measurementComplete ? (
            <button 
              className={`measure-button ${isMeasuring ? "measuring" : ""}`} 
              onClick={handleStartMeasurement} 
              disabled={isMeasuring}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring...
                </>
              ) : (
                "🌡️ Start Measurement"
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Temperature Measured</span>
              <button className="retry-button" onClick={handleRetry}>
                Measure Again
              </button>
            </div>
          )}
        </div>

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