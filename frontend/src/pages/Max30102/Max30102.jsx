// In Max30102.jsx - Fix the import
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../assets/icons/respiratory-icon.png";
import { sensorAPI, createMax30102Poller, interpretMax30102Status } from "../../utils/api"; // ✅ All exports now available

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState("");
  const [fingerStatus, setFingerStatus] = useState("waiting"); // waiting, detected, removed
  const [progressSeconds, setProgressSeconds] = useState(60);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  
  const [measurements, setMeasurements] = useState({
    heartRate: "",
    spo2: "",
    respiratoryRate: ""
  });

  const pollerRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    // Initialize sensor connection
    initializeSensorConnection();

    return () => {
      clearTimeout(timer);
      stopMeasurement();
      if (pollerRef.current) {
        pollerRef.current.stopPolling();
      }
    };
  }, []);

  const initializeSensorConnection = async () => {
    try {
      setConnectionStatus("connecting");
      
      // Test backend connection first
      const status = await sensorAPI.getStatus();
      console.log("🔌 Sensor status:", status);
      
      if (status.connected) {
        setConnectionStatus("connected");
      } else {
        // Try to connect
        const connectResult = await sensorAPI.connect();
        if (connectResult.connected) {
          setConnectionStatus("connected");
        } else {
          setConnectionStatus("disconnected");
          console.error("Failed to connect to sensors:", connectResult.error);
        }
      }
    } catch (error) {
      setConnectionStatus("error");
      console.error("Error initializing sensor connection:", error);
    }
  };

  const startMax30102Measurement = async () => {
    if (isMeasuring) return;
    
    try {
      setIsMeasuring(true);
      setMeasurementComplete(false);
      setFingerStatus("waiting");
      setProgressSeconds(60);
      
      // Start the measurement on Arduino
      const result = await sensorAPI.startMax30102();
      
      if (result.error) {
        console.error("Failed to start MAX30102 measurement:", result.error);
        alert("Failed to start measurement. Please check sensor connection.");
        setIsMeasuring(false);
        return;
      }
      
      console.log("✅ MAX30102 measurement started:", result);
      
      // Start polling for updates
      startPolling();
      
    } catch (error) {
      console.error("Error starting MAX30102 measurement:", error);
      setIsMeasuring(false);
      alert("Error starting measurement. Please try again.");
    }
  };

  const startPolling = () => {
    if (pollerRef.current) {
      pollerRef.current.stopPolling();
    }

    const poller = createMax30102Poller(
      // onUpdate callback
      (statusData) => {
        console.log("📊 MAX30102 Status Update:", statusData);
        handleStatusUpdate(statusData);
      },
      // onError callback
      (error) => {
        console.error("❌ Polling error:", error);
        setConnectionStatus("error");
      },
      1000 // Poll every second
    );

    pollerRef.current = poller;
    poller.startPolling();
  };

  const handleStatusUpdate = (statusData) => {
    const interpreted = interpretMax30102Status(statusData);
    
    // Update measurements
    setMeasurements({
      heartRate: interpreted.heartRate.display,
      spo2: interpreted.spo2.display,
      respiratoryRate: interpreted.respiratoryRate.display
    });

    // Update finger status and sensor visual
    setFingerStatus(interpreted.fingerStatus);
    
    // Update progress
    setProgressSeconds(interpreted.progress);
    
    // Update measurement state
    setIsMeasuring(interpreted.isMeasuring);
    
    // Check if measurement is complete
    if (interpreted.isComplete && !measurementComplete) {
      setMeasurementComplete(true);
      setIsMeasuring(false);
      
      // Stop polling when complete
      if (pollerRef.current) {
        pollerRef.current.stopPolling();
      }
      
      console.log("🎯 MAX30102 Measurement Complete!");
    }

    // Update current measurement label based on progress
    if (interpreted.isMeasuring) {
      if (interpreted.progress > 40) {
        setCurrentMeasurement("Initializing...");
      } else if (interpreted.progress > 20) {
        setCurrentMeasurement("Measuring Heart Rate");
      } else if (interpreted.progress > 10) {
        setCurrentMeasurement("Measuring Blood Oxygen");
      } else {
        setCurrentMeasurement("Calculating Respiratory Rate");
      }
    }
  };

  const stopMeasurement = async () => {
    try {
      await sensorAPI.stopMeasurement();
    } catch (error) {
      console.error("Error stopping measurement:", error);
    } finally {
      setIsMeasuring(false);
      if (pollerRef.current) {
        pollerRef.current.stopPolling();
      }
    }
  };

  const handleContinue = () => {
    if (!measurementComplete) {
      alert("Please complete all measurements first");
      return;
    }
    
    // Create complete data object with all measurements
    const completeData = {
      // Personal information from previous steps
      ...location.state,
      
      // Max30102 measurements - convert strings back to numbers
      heartRate: measurements.heartRate && measurements.heartRate !== '--' ? 
                 parseInt(measurements.heartRate) : null,
      spo2: measurements.spo2 && measurements.spo2 !== '--.-' ? 
            parseFloat(measurements.spo2) : null,
      respiratoryRate: measurements.respiratoryRate && measurements.respiratoryRate !== '--' ? 
                      parseInt(measurements.respiratoryRate) : null,
      
      // Additional metadata
      max30102Complete: true,
      measurementTimestamp: new Date().toISOString(),
      
      // Ensure temperature data is preserved
      temperature: location.state?.temperature || location.state?.bodyTemp || null,
      bodyTemp: location.state?.bodyTemp || location.state?.temperature || null
    };
    
    console.log("🧠 Navigating to AI Loading with data:", completeData);
    navigate("/ai-loading", {
      state: completeData
    });
  };

  const handleRetry = () => {
    setMeasurements({
      heartRate: "",
      spo2: "",
      respiratoryRate: ""
    });
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setCurrentMeasurement("");
    setFingerStatus("waiting");
    setProgressSeconds(60);
    
    // Stop any ongoing measurement
    stopMeasurement();
  };

  const getStatusColor = (type, value) => {
    if (!value || value === '--' || value === '--.-') return "default";
    
    const numValue = parseFloat(value);
    
    switch (type) {
      case "heartRate":
        if (numValue < 60) return "low";
        if (numValue > 100) return "high";
        return "normal";
      case "spo2":
        if (numValue < 95) return "low";
        return "normal";
      case "respiratoryRate":
        if (numValue < 12) return "low";
        if (numValue > 20) return "high";
        return "normal";
      default:
        return "default";
    }
  };

  const getStatusText = (type, value) => {
    if (!value || value === '--' || value === '--.-') return "Not measured";
    
    const status = getStatusColor(type, value);
    
    switch (status) {
      case "low":
        return type === "spo2" ? "Low Oxygen" : "Low";
      case "high":
        return type === "spo2" ? "Normal" : "High";
      case "normal":
        return "Normal";
      default:
        return "Not measured";
    }
  };

  const getFingerStatusMessage = () => {
    switch (fingerStatus) {
      case "detected":
        return "✅ Finger detected - Measuring...";
      case "waiting":
        return "👆 Place finger on sensor";
      case "removed":
        return "❌ Finger removed - Please place finger back";
      default:
        return "👆 Place finger on sensor";
    }
  };

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `${((60 - progressSeconds) / 60) * 100}%`}}
            ></div>
          </div>
          <span className="progress-step">
            Step 4 of 4 - Vital Signs | 
            {connectionStatus === "connected" ? " ✅ Connected" : " ❌ Disconnected"} |
            Time: {progressSeconds}s
          </span>
        </div>

        {/* Header */}
        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">
            {isMeasuring ? getFingerStatusMessage() : "Place finger on sensor for heart rate, SpO2, and respiratory rate"}
          </p>
        </div>

        {/* Display Section */}
        <div className="sensor-display-section">
          <div className="sensor-visual-area">
            <div className={`finger-sensor ${fingerStatus === "detected" ? 'active' : ''}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">👆</div>
            </div>
            {isMeasuring && (
              <div className="measuring-progress">
                <div className="pulse-wave"></div>
                <span className="current-measurement">
                  {currentMeasurement || "Initializing..."}
                </span>
                <span className="progress-text">
                  {progressSeconds > 0 ? `${progressSeconds}s remaining` : "Complete!"}
                </span>
              </div>
            )}
          </div>

          {/* Measurements Grid - 3 cards in a row */}
          <div className="measurements-grid">
            {/* Heart Rate */}
            <div className="measurement-card">
              <div className="measurement-icon">
                <img src={heartRateIcon} alt="Heart Rate" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Heart Rate</h3>
                <div className="measurement-value">
                  {measurements.heartRate ? (
                    <>
                      <span className="value">{measurements.heartRate}</span>
                      <span className="unit">BPM</span>
                    </>
                  ) : (
                    <span className="placeholder">--</span>
                  )}
                </div>
                <span className={`measurement-status ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="measurement-card">
              <div className="measurement-icon">
                <img src={spo2Icon} alt="Blood Oxygen" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Blood Oxygen</h3>
                <div className="measurement-value">
                  {measurements.spo2 ? (
                    <>
                      <span className="value">{measurements.spo2}</span>
                      <span className="unit">%</span>
                    </>
                  ) : (
                    <span className="placeholder">--.-</span>
                  )}
                </div>
                <span className={`measurement-status ${getStatusColor('spo2', measurements.spo2)}`}>
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="measurement-card">
              <div className="measurement-icon">
                <img src={respiratoryIcon} alt="Respiratory Rate" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Respiratory Rate</h3>
                <div className="measurement-value">
                  {measurements.respiratoryRate ? (
                    <>
                      <span className="value">{measurements.respiratoryRate}</span>
                      <span className="unit">/min</span>
                    </>
                  ) : (
                    <span className="placeholder">--</span>
                  )}
                </div>
                <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Measurement Controls */}
        <div className="measurement-controls">
          {!measurementComplete ? (
            <button 
              className="measure-button"
              onClick={startMax30102Measurement}
              disabled={isMeasuring || connectionStatus !== "connected"}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring... ({progressSeconds}s)
                </>
              ) : (
                <>
                  <div className="button-icon">❤️</div>
                  {connectionStatus === "connected" ? "Start Measurement" : "Connecting..."}
                </>
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ All Measurements Complete</span>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                Measure Again
              </button>
            </div>
          )}
        </div>

        {/* Connection Status */}
        {connectionStatus !== "connected" && (
          <div className="connection-status">
            <p className={`status-message ${connectionStatus}`}>
              {connectionStatus === "disconnected" && "❌ Sensor disconnected - Please check connection"}
              {connectionStatus === "error" && "❌ Connection error - Please try again"}
              {connectionStatus === "connecting" && "🔌 Connecting to sensors..."}
            </p>
            <button 
              className="retry-button"
              onClick={initializeSensorConnection}
            >
              Retry Connection
            </button>
          </div>
        )}

        {/* Educational Content */}
        <div className="educational-content">
          <h3 className="education-title">About Pulse Oximeter</h3>
          <div className="education-points">
            <div className="education-card">
              <div className="card-icon">❤️</div>
              <div className="card-content">
                <h4>Heart Rate Monitoring</h4>
                <p>Measures beats per minute for cardiovascular health</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🩸</div>
              <div className="card-content">
                <h4>Blood Oxygen (SpO2)</h4>
                <p>Measures oxygen saturation in your blood</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🌬️</div>
              <div className="card-content">
                <h4>Respiratory Rate</h4>
                <p>Tracks breathing rate per minute</p>
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
            View AI Results
          </button>
        </div>
      </div>
    </div>
  );
}