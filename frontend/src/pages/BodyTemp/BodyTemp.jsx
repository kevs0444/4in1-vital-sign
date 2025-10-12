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
  const [debugInfo, setDebugInfo] = useState("");
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
      setDebugInfo("Checking sensor connection...");
      
      // First check if backend is connected
      const backendStatus = await checkBackendStatus();
      setDebugInfo(`Backend: ${backendStatus.status}`);
      
      if (backendStatus.status === 'connected') {
        // Backend is running, now check sensor status
        try {
          const sensorStatus = await sensorAPI.getStatus();
          setDebugInfo(`Sensors: ${sensorStatus.connected ? 'Connected' : 'Disconnected'}`);
          
          if (sensorStatus.connected || sensorStatus.simulation_mode) {
            setSensorStatus("connected");
            setErrorMessage("");
            setRetryCount(0); // Reset retry count on success
            
            // Test temperature sensor specifically
            try {
              const tempStatus = await sensorAPI.getTemperatureStatus();
              setDebugInfo(prev => prev + ` | Temp: ${tempStatus.status}`);
            } catch (tempError) {
              console.log("Temperature status check failed:", tempError);
            }
          } else {
            setSensorStatus("error");
            setErrorMessage("Sensors not connected. Please check hardware.");
            setDebugInfo(prev => prev + " | Sensors not connected");
          }
        } catch (sensorError) {
          console.log("Sensor status check failed:", sensorError);
          setSensorStatus("connected"); // Still mark as connected for simulation
          setErrorMessage("Using simulation mode - Real sensors not available");
          setDebugInfo(prev => prev + ` | Sensor check failed: ${sensorError.message}`);
        }
      } else {
        setSensorStatus("error");
        setErrorMessage("Backend not connected. Please check if Flask server is running.");
        setDebugInfo(`Backend error: ${backendStatus.message}`);
      }
    } catch (error) {
      setSensorStatus("error");
      setErrorMessage("Connection error. Please check backend connection.");
      setDebugInfo(`Connection error: ${error.message}`);
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
    setDebugInfo("Starting temperature measurement...");

    try {
      // Start measurement on backend
      const startResult = await sensorAPI.startTemperature();
      setDebugInfo(`Start: ${startResult.status} - ${startResult.message}`);
      
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
          setDebugInfo(`Time: ${measurementTime}s | Status: ${status.status} | Temp: ${status.temperature || 'N/A'}`);
          
          if (status.status === 'completed' && status.temperature) {
            // Measurement completed successfully
            setTemperature(status.temperature.toFixed(1));
            setIsMeasuring(false);
            setMeasurementComplete(true);
            setUserDetectionStatus("");
            setErrorMessage("");
            setRetryCount(0);
            clearInterval(measurementInterval.current);
            setDebugInfo("✅ Measurement completed successfully");
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
          setDebugInfo(`Poll error: ${error.message}`);
          
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
            setDebugInfo("❌ Measurement failed after maximum retries");
          }
        }
      }, 30000);

    } catch (error) {
      console.error("Error starting measurement:", error);
      setSensorStatus("error");
      setErrorMessage(`Failed to start measurement: ${error.message}`);
      setIsMeasuring(false);
      setDebugInfo(`Start error: ${error.message}`);
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
      setDebugInfo("Measurement stopped");
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
    setDebugInfo("Measurement reset");
    
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
            {sensorStatus === "error" && (
              <button 
                className="retry-connection" 
                onClick={checkSensorConnection}
              >
                Retry Connection
              </button>
            )}
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
                      <span className="warning-icon">
                        {userDetectionStatus === "no_user" ? "❌" : "⚠️"}
                      </span>
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
                      {retryCount > 0 && (
                        <span className="retry-count">Retry {retryCount}/{maxRetries}</span>
                      )}
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
            {retryCount < maxRetries && (
              <button className="retry-button-small" onClick={handleForceRetry}>
                Force Retry
              </button>
            )}
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
              <strong>Tips for better measurement:</strong>
              <ul>
                <li>Ensure sensor is clean and unobstructed</li>
                <li>Place sensor firmly on forehead</li>
                <li>Stay still during measurement</li>
                <li>Remove hats or head coverings</li>
                <li>Avoid direct sunlight or drafts</li>
              </ul>
            </div>
          </div>
        )}

        {/* Debug Information - Remove in production */}
        <div className="debug-info">
          <strong>Debug:</strong> {debugInfo}
        </div>

        {/* Controls */}
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
                  Measuring... {retryCount > 0 && `(Retry ${retryCount}/${maxRetries})`}
                </>
              ) : (
                <>
                  <div className="button-icon">🌡️</div>
                  {sensorStatus === "error" ? "Check Connection First" : "Start Temperature Measurement"}
                </>
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Measurement Complete</span>
              <div className="complete-actions">
                <button className="retry-button" onClick={handleRetry}>
                  Measure Again
                </button>
                <button className="view-details-button" onClick={() => setDebugInfo(prev => prev + " | Details viewed")}>
                  View Details
                </button>
              </div>
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