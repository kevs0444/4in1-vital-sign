import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../assets/icons/respiratory-icon.png";
import { sensorAPI, createMax30102Poller, interpretMax30102Status } from "../../utils/api";

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState("");
  const [fingerStatus, setFingerStatus] = useState("waiting");
  const [progressSeconds, setProgressSeconds] = useState(60);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [errorMessage, setErrorMessage] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  
  const [measurements, setMeasurements] = useState({
    heartRate: "",
    spo2: "",
    respiratoryRate: ""
  });

  const pollerRef = useRef(null);
  const measurementStartTimeRef = useRef(null);
  const maxRetries = 2;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

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
      
      if (status.connected || status.simulation_mode) {
        setConnectionStatus("connected");
        setErrorMessage("");
      } else {
        // Try to connect
        const connectResult = await sensorAPI.connect();
        if (connectResult.connected) {
          setConnectionStatus("connected");
          setErrorMessage("");
        } else {
          setConnectionStatus("error");
          setErrorMessage("Failed to connect to sensors. Using simulation mode.");
        }
      }
    } catch (error) {
      setConnectionStatus("error");
      setErrorMessage("Connection error. Using simulation mode.");
      console.error("Error initializing sensor connection:", error);
    }
  };

  const startMax30102Measurement = async () => {
    if (isMeasuring) return;
    
    if (connectionStatus === "error" && retryCount >= maxRetries) {
      alert("Maximum connection attempts reached. Please check hardware and restart.");
      return;
    }

    try {
      setIsMeasuring(true);
      setMeasurementComplete(false);
      setFingerStatus("waiting");
      setProgressSeconds(60);
      setErrorMessage("");
      setRetryCount(0);
      measurementStartTimeRef.current = Date.now();
      
      // Start the measurement on Arduino
      const result = await sensorAPI.startMax30102();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      console.log("✅ MAX30102 measurement started:", result);
      
      // Start polling for updates
      startPolling();
      
    } catch (error) {
      console.error("Error starting MAX30102 measurement:", error);
      setConnectionStatus("error");
      setErrorMessage(`Failed to start measurement: ${error.message}`);
      setIsMeasuring(false);
      setRetryCount(prev => prev + 1);
    }
  };

  const startPolling = () => {
    if (pollerRef.current) {
      pollerRef.current.stopPolling();
    }

    let consecutiveErrors = 0;
    const maxConsecutiveErrors = 3;

    const poller = createMax30102Poller(
      // onUpdate callback
      (statusData) => {
        try {
          const interpreted = interpretMax30102Status(statusData);
          console.log("📊 MAX30102 Status Update:", interpreted);
          
          handleStatusUpdate(interpreted);
          consecutiveErrors = 0; // Reset error count on successful update
          
        } catch (error) {
          console.error("Error interpreting status:", error);
          consecutiveErrors++;
          if (consecutiveErrors >= maxConsecutiveErrors) {
            setErrorMessage("Data interpretation error - Please retry");
            setIsMeasuring(false);
            if (pollerRef.current) {
              pollerRef.current.stopPolling();
            }
          }
        }
      },
      // onError callback
      (error) => {
        console.error("❌ Polling error:", error);
        consecutiveErrors++;
        
        if (consecutiveErrors >= maxConsecutiveErrors) {
          setConnectionStatus("error");
          setErrorMessage("Connection lost during measurement");
          setIsMeasuring(false);
          setRetryCount(prev => prev + 1);
        }
      },
      1000 // Poll every second
    );

    pollerRef.current = poller;
    poller.startPolling();

    // Auto-timeout after 70 seconds (10 seconds grace period)
    setTimeout(() => {
      if (isMeasuring && !measurementComplete) {
        setErrorMessage("Measurement timeout - Please retry");
        setIsMeasuring(false);
        if (pollerRef.current) {
          pollerRef.current.stopPolling();
        }
        setRetryCount(prev => prev + 1);
      }
    }, 70000);
  };

  const handleStatusUpdate = (interpreted) => {
    // Update measurements
    setMeasurements({
      heartRate: interpreted.heartRate.display,
      spo2: interpreted.spo2.display,
      respiratoryRate: interpreted.respiratoryRate.display
    });

    // Update finger status and sensor visual
    setFingerStatus(interpreted.fingerStatus);
    
    // Update progress seconds from sensor data (for time display only)
    setProgressSeconds(interpreted.progress);
    
    // Update measurement state
    setIsMeasuring(interpreted.isMeasuring);
    
    // Update current measurement label based on progress and data availability
    if (interpreted.isMeasuring) {
      if (!interpreted.fingerDetected) {
        setCurrentMeasurement("Waiting for Finger");
      } else if (!interpreted.heartRate.value && !interpreted.spo2.value) {
        setCurrentMeasurement("Initializing Sensor...");
      } else if (interpreted.progress > 40) {
        setCurrentMeasurement("Stabilizing Signal...");
      } else if (interpreted.progress > 20) {
        setCurrentMeasurement("Measuring Heart Rate");
      } else if (interpreted.progress > 10) {
        setCurrentMeasurement("Measuring Blood Oxygen");
      } else {
        setCurrentMeasurement("Calculating Respiratory Rate");
      }
    }

    // Handle errors
    if (interpreted.hasError) {
      setErrorMessage(interpreted.message);
      setFingerStatus("error");
    } else if (interpreted.fingerStatus === 'waiting') {
      setErrorMessage("👆 Place finger on sensor and keep still");
    } else if (interpreted.fingerStatus === 'removed') {
      setErrorMessage("❌ Finger removed - Please place finger back");
    } else {
      setErrorMessage("");
    }

    // Check if measurement is complete
    if (interpreted.isComplete && !measurementComplete) {
      setMeasurementComplete(true);
      setIsMeasuring(false);
      setErrorMessage("");
      setRetryCount(0);
      
      // Stop polling when complete
      if (pollerRef.current) {
        pollerRef.current.stopPolling();
      }
      
      console.log("🎯 MAX30102 Measurement Complete!");
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
    
    // Validate measurements
    const hr = measurements.heartRate && measurements.heartRate !== '--' ? parseInt(measurements.heartRate) : null;
    const spo2 = measurements.spo2 && measurements.spo2 !== '--.-' ? parseFloat(measurements.spo2) : null;
    const rr = measurements.respiratoryRate && measurements.respiratoryRate !== '--' ? parseInt(measurements.respiratoryRate) : null;
    
    if (!hr || !spo2 || !rr) {
      alert("Some measurements are missing. Please complete the measurement first.");
      return;
    }

    // Create complete data object with all measurements
    const completeData = {
      // Personal information from previous steps
      ...location.state,
      
      // Max30102 measurements
      heartRate: hr,
      spo2: spo2,
      respiratoryRate: rr,
      
      // Additional metadata
      max30102Complete: true,
      measurementTimestamp: new Date().toISOString(),
      measurementDuration: measurementStartTimeRef.current ? 
        Math.round((Date.now() - measurementStartTimeRef.current) / 1000) : 0,
      
      // Ensure temperature data is preserved
      temperature: location.state?.temperature || null,
      bodyTemp: location.state?.temperature || null,
      
      // Measurement quality indicators
      measurementQuality: {
        heartRateStable: hr >= 50 && hr <= 120,
        spo2Stable: spo2 >= 90,
        respiratoryStable: rr >= 8 && rr <= 25,
        allMeasurementsComplete: true
      }
    };
    
    console.log("🧠 Navigating to AI Loading with complete data:", completeData);
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
    setErrorMessage("");
    setRetryCount(0);
    
    // Stop any ongoing measurement
    stopMeasurement();
  };

  const handleForceRetryConnection = async () => {
    setRetryCount(0);
    setErrorMessage("");
    await initializeSensorConnection();
  };

  const getStatusColor = (type, value) => {
    if (!value || value === '--' || value === '--.-') return "default";
    
    const numValue = parseFloat(value);
    
    switch (type) {
      case "heartRate":
        if (numValue < 50) return "critical";
        if (numValue < 60) return "low";
        if (numValue > 100) return "high";
        if (numValue > 120) return "critical";
        return "normal";
      case "spo2":
        if (numValue < 90) return "critical";
        if (numValue < 95) return "low";
        return "normal";
      case "respiratoryRate":
        if (numValue < 8) return "critical";
        if (numValue < 12) return "low";
        if (numValue > 20) return "high";
        if (numValue > 25) return "critical";
        return "normal";
      default:
        return "default";
    }
  };

  const getStatusText = (type, value) => {
    if (!value || value === '--' || value === '--.-') return "Not measured";
    
    const status = getStatusColor(type, value);
    
    switch (status) {
      case "critical":
        return type === "spo2" ? "Critical Low" : "Critical";
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
      case "error":
        return "🔧 Sensor error - Please retry";
      default:
        return "👆 Place finger on sensor";
    }
  };

  const allMeasurementsValid = measurements.heartRate !== '--' && 
                              measurements.spo2 !== '--.-' && 
                              measurements.respiratoryRate !== '--';

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar - Always full since we're on the last page */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `100%`}} // Always full width
            ></div>
          </div>
          <span className="progress-step">
            Step 4 of 4 - Vital Signs | 
            {connectionStatus === "connected" ? " ✅ Connected" : " ❌ Disconnected"} |
            {isMeasuring ? ` Time: ${progressSeconds}s` : " Ready to Measure"}
            {retryCount > 0 && ` | Retry: ${retryCount}/${maxRetries}`}
          </span>
        </div>

        {/* Header */}
        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">
            {isMeasuring ? getFingerStatusMessage() : "Place finger on sensor for heart rate, SpO2, and respiratory rate"}
          </p>
          
          {/* Connection Status */}
          {connectionStatus !== "connected" && (
            <div className="connection-status-error">
              <span className="error-icon">⚠️</span>
              {connectionStatus === "error" && "Sensor connection issue - Using simulation mode"}
              {connectionStatus === "connecting" && "Connecting to sensors..."}
              <button className="retry-connection" onClick={handleForceRetryConnection}>
                Retry Connection
              </button>
            </div>
          )}
        </div>

        {/* Display Section */}
        <div className="sensor-display-section">
          <div className="sensor-visual-area">
            <div className={`finger-sensor ${fingerStatus === "detected" ? 'active' : ''} ${fingerStatus === "error" ? 'error' : ''}`}>
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
                {retryCount > 0 && (
                  <span className="retry-indicator">Retry {retryCount}/{maxRetries}</span>
                )}
              </div>
            )}
          </div>

          {/* Measurements Grid */}
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

        {/* Error Message Display */}
        {errorMessage && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {errorMessage}
            {retryCount < maxRetries && (
              <button className="retry-button-small" onClick={startMax30102Measurement}>
                Retry Measurement
              </button>
            )}
          </div>
        )}

        {/* Measurement Controls */}
        <div className="measurement-controls">
          {!measurementComplete ? (
            <button 
              className="measure-button"
              onClick={startMax30102Measurement}
              disabled={isMeasuring || (connectionStatus === "error" && retryCount >= maxRetries)}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring... ({progressSeconds}s)
                  {retryCount > 0 && ` - Retry ${retryCount}/${maxRetries}`}
                </>
              ) : (
                <>
                  <div className="button-icon">❤️</div>
                  {connectionStatus === "connected" ? "Start Measurement" : "Check Connection First"}
                </>
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ All Measurements Complete</span>
              <div className="complete-actions">
                <button 
                  className="retry-button"
                  onClick={handleRetry}
                >
                  Measure Again
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Educational Content */}
        <div className="educational-content">
          <h3 className="education-title">About Pulse Oximeter</h3>
          <div className="education-points">
            <div className="education-card">
              <div className="card-icon">❤️</div>
              <div className="card-content">
                <h4>Heart Rate Monitoring</h4>
                <p>Measures beats per minute for cardiovascular health assessment</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🩸</div>
              <div className="card-content">
                <h4>Blood Oxygen (SpO2)</h4>
                <p>Measures oxygen saturation levels in your blood</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🌬️</div>
              <div className="card-content">
                <h4>Respiratory Rate</h4>
                <p>Tracks breathing rate per minute for respiratory health</p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="continue-button-container">
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!measurementComplete || !allMeasurementsValid}
          >
            {allMeasurementsValid ? "View AI Results" : "Complete All Measurements"}
          </button>
        </div>
      </div>
    </div>
  );
}