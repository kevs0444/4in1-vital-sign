import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import bodyTempIcon from "../../assets/icons/temp-icon.png";
import { sensorAPI, checkBackendStatus } from "../../utils/api";

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [temperature, setTemperature] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [sensorStatus, setSensorStatus] = useState("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [userDetectionStatus, setUserDetectionStatus] = useState("");
  const [currentTempReading, setCurrentTempReading] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  
  const measurementInterval = useRef(null);
  const maxRetries = 3;

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
      
      // First check if backend is connected
      const backendStatus = await checkBackendStatus();
      
      if (backendStatus.status === 'connected') {
        // Backend is running, now check sensor status
        try {
          const sensorStatus = await sensorAPI.getStatus();
          
          if (sensorStatus.connected || sensorStatus.simulation_mode) {
            setSensorStatus("connected");
            setErrorMessage("");
            setRetryCount(0); // Reset retry count on success
            
            // Test temperature sensor specifically
            try {
              await sensorAPI.getTemperatureStatus();
            } catch (tempError) {
              console.log("Temperature status check failed:", tempError);
            }
          } else {
            setSensorStatus("error");
            setErrorMessage("Sensors not connected. Please check hardware.");
          }
        } catch (sensorError) {
          console.log("Sensor status check failed:", sensorError);
          setSensorStatus("connected"); // Still mark as connected for simulation
          setErrorMessage("Using simulation mode - Real sensors not available");
        }
      } else {
        setSensorStatus("error");
        setErrorMessage("Backend not connected. Please check if Flask server is running.");
      }
    } catch (error) {
      setSensorStatus("error");
      setErrorMessage("Connection error. Please check backend connection.");
      console.error("Sensor connection error:", error);
    }
  };

  const startRealMeasurement = async () => {
    if (isMeasuring || measurementComplete) return;

    if (sensorStatus === "error" && retryCount >= maxRetries) {
      alert("Maximum retry attempts reached. Please check sensor connection and restart.");
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

      let measurementTime = 0;
      let consecutiveErrors = 0;
      const maxConsecutiveErrors = 2;

      // Start polling for measurement status
      measurementInterval.current = setInterval(async () => {
        measurementTime += 1;
        try {
          const status = await sensorAPI.getTemperatureStatus();
          
          if (status.status === 'completed' && status.temperature) {
            // Measurement completed successfully
            setTemperature(status.temperature.toFixed(1));
            setIsMeasuring(false);
            setMeasurementComplete(true);
            setUserDetectionStatus("");
            setErrorMessage("");
            setRetryCount(0);
            clearInterval(measurementInterval.current);
          } 
          else if (status.status === 'error' || status.status === 'no_contact') {
            // Handle errors
            consecutiveErrors++;
            setUserDetectionStatus(status.status);
            setErrorMessage(status.message);
            setCurrentTempReading("");
            
            if (consecutiveErrors >= maxConsecutiveErrors) {
              setRetryCount(prev => prev + 1);
              if (retryCount + 1 >= maxRetries) {
                setErrorMessage(`${status.message} - Maximum retries reached`);
                setIsMeasuring(false);
                clearInterval(measurementInterval.current);
              } else {
                setErrorMessage(`${status.message} - Retry ${retryCount + 1}/${maxRetries}`);
              }
            }
          } 
          else if (status.status === 'measuring') {
            // Valid measurement in progress
            consecutiveErrors = 0; // Reset error count on successful reading
            if (status.temperature) {
              setCurrentTempReading(status.temperature.toFixed(1));
            }
            setUserDetectionStatus("");
            setErrorMessage("");
          } 
          else if (status.status === 'starting') {
            // Measurement starting
            setCurrentTempReading("");
            setUserDetectionStatus("");
            setErrorMessage("Initializing sensor...");
          }
        } catch (error) {
          console.error("Error checking measurement status:", error);
          consecutiveErrors++;
          
          if (consecutiveErrors >= maxConsecutiveErrors) {
            setErrorMessage("Connection lost during measurement");
            setIsMeasuring(false);
            clearInterval(measurementInterval.current);
          }
        }
      }, 1000);

      // Auto-stop after 30 seconds with retry logic
      setTimeout(() => {
        if (isMeasuring && !measurementComplete) {
          if (retryCount < maxRetries - 1) {
            setRetryCount(prev => prev + 1);
            setErrorMessage(`Measurement timeout - Retrying (${retryCount + 1}/${maxRetries})`);
            stopMeasurement();
            // Auto-retry after 2 seconds
            setTimeout(startRealMeasurement, 2000);
          } else {
            stopMeasurement();
            setErrorMessage("Measurement timeout - Maximum retries reached");
          }
        }
      }, 30000);

    } catch (error) {
      console.error("Error starting measurement:", error);
      setSensorStatus("error");
      setErrorMessage(`Failed to start measurement: ${error.message}`);
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
        measurementData: {
          temperature: tempValue,
          timestamp: new Date().toISOString(),
          status: tempStatus.text
        }
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
    setRetryCount(0);
    
    if (measurementInterval.current) {
      clearInterval(measurementInterval.current);
      measurementInterval.current = null;
    }
  };

  const handleForceRetry = async () => {
    setRetryCount(0);
    setErrorMessage("");
    await checkSensorConnection();
    
    if (sensorStatus === "connected") {
      startRealMeasurement();
    }
  };

  const getTemperatureStatus = (temp = parseFloat(temperature)) => {
    if (!temp) return { text: "", class: "" };
    if (temp < 35.5) return { text: "Hypothermia Risk", class: "temperature-low" };
    if (temp < 36.1) return { text: "Low Temperature", class: "temperature-low" };
    if (temp > 37.5) return { text: "Fever Detected", class: "temperature-fever" };
    if (temp > 38.0) return { text: "High Fever", class: "temperature-fever" };
    return { text: "Normal Temperature", class: "temperature-normal" };
  };

  const getDetectionMessage = () => {
    switch (userDetectionStatus) {
      case "no_user":
        return "❌ No user detected. Please ensure the sensor is properly placed on your forehead.";
      case "no_contact":
        return "⚠️ Poor sensor contact. Please press the sensor firmly against your forehead.";
      case "error":
        return "🔧 Sensor error detected. Please wait or retry.";
      default:
        return "";
    }
  };

  const status = measurementComplete ? getTemperatureStatus() : null;

  const getSensorStatusMessage = () => {
    if (isMeasuring) {
      if (userDetectionStatus) {
        return getDetectionMessage();
      } else if (currentTempReading) {
        return `Measuring... Current: ${currentTempReading}°C`;
      } else {
        return "Initializing temperature sensor...";
      }
    }
    return "Place sensor on forehead for accurate reading";
  };

  return (
    <div className="bodytemp-container">
      <div className={`bodytemp-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar - 3/4 progress */}
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{width: `75%`}}
            ></div>
          </div>
          <span className="progress-step">
            Step 3 of 4 - Vital Signs | 
            {sensorStatus === "connected" ? " ✅ Connected" : " ❌ Disconnected"}
            {retryCount > 0 && ` | Retry: ${retryCount}/${maxRetries}`}
          </span>
        </div>

        {/* Header */}
        <div className="bodytemp-header">
          <h1 className="bodytemp-title">Body Temperature</h1>
          <p className="bodytemp-subtitle">
            {isMeasuring ? getSensorStatusMessage() : "Place sensor on forehead for accurate temperature measurement"}
          </p>
          
          {/* Connection Status */}
          {sensorStatus !== "connected" && (
            <div className="connection-status-error">
              <span className="error-icon">⚠️</span>
              {sensorStatus === "error" && "Sensor connection issue - Using simulation mode"}
              {sensorStatus === "checking" && "Connecting to sensors..."}
              <button className="retry-connection" onClick={checkSensorConnection}>
                Retry Connection
              </button>
            </div>
          )}
        </div>

        {/* Display Section - Only Temperature Card */}
        <div className="sensor-display-section">
          
          {/* Single Centered Temperature Card */}
          <div className="temperature-card-container">
            <div className="measurement-card temperature-card">
              <div className="measurement-icon">
                <img src={bodyTempIcon} alt="Body Temperature" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Body Temperature</h3>
                <div className="measurement-value">
                  {temperature ? (
                    <>
                      <span className="value">{temperature}</span>
                      <span className="unit">°C</span>
                    </>
                  ) : (
                    <span className="placeholder">--.-</span>
                  )}
                </div>
                <span className={`measurement-status ${status?.class.replace('temperature-', '') || 'default'}`}>
                  {status?.text || "Not measured"}
                </span>
              </div>
            </div>
          </div>

          {/* Measurement Progress */}
          {isMeasuring && (
            <div className="measuring-progress">
              <div className="pulse-wave"></div>
              <span className="current-measurement">
                {userDetectionStatus ? "Adjust Sensor Position" : "Measuring Temperature"}
              </span>
              {currentTempReading && (
                <span className="progress-text">
                  Current: {currentTempReading}°C
                </span>
              )}
              {retryCount > 0 && (
                <span className="retry-indicator">Retry {retryCount}/{maxRetries}</span>
              )}
            </div>
          )}
        </div>

        {/* Error Message Display */}
        {errorMessage && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {errorMessage}
            {retryCount < maxRetries && (
              <button className="retry-button-small" onClick={handleForceRetry}>
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
              onClick={startRealMeasurement}
              disabled={isMeasuring || (sensorStatus === "error" && retryCount >= maxRetries)}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring Temperature...
                  {retryCount > 0 && ` - Retry ${retryCount}/${maxRetries}`}
                </>
              ) : (
                <>
                  <div className="button-icon">🌡️</div>
                  {sensorStatus === "connected" ? "Start Measurement" : "Check Connection First"}
                </>
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Temperature Measurement Complete</span>
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
          <h3 className="education-title">About Temperature Measurement</h3>
          <div className="education-points">
            <div className="education-card">
              <div className="card-icon">🌡️</div>
              <div className="card-content">
                <h4>Normal Range</h4>
                <p>Healthy body temperature typically ranges from 36.1°C to 37.5°C</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">⚠️</div>
              <div className="card-content">
                <h4>Fever Detection</h4>
                <p>Temperatures above 37.5°C may indicate fever and require attention</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">📋</div>
              <div className="card-content">
                <h4>Accurate Reading</h4>
                <p>Ensure proper sensor contact with forehead for reliable measurements</p>
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