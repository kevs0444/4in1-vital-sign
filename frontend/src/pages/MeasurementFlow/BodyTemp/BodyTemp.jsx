import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import tempIcon from "../../assets/icons/temp-icon.png";
import { sensorAPI } from "../../../utils/api";

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const [temperature, setTemperature] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [liveReading, setLiveReading] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const autoStartRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeTemperatureSensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      if (autoStartRef.current) clearTimeout(autoStartRef.current);
    };
  }, []);

  const initializeTemperatureSensor = async () => {
    try {
      setStatusMessage("Powering up temperature sensor...");
      const prepareResult = await sensorAPI.prepareTemperature();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Temperature sensor ready. Point at forehead...");
      startMonitoring();
      
    } catch (error) {
      console.error("Temperature initialization error:", error);
      setStatusMessage("❌ Failed to initialize temperature sensor");
      handleRetry();
    }
  };

  const startMonitoring = () => {
    stopMonitoring();
    
    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getTemperatureStatus();
        console.log("Temperature status:", data);
        
        setIsMeasuring(data.measurement_active);
        setIsReady(data.is_ready_for_measurement);
        
        // Update live reading
        if (data.live_temperature !== null && data.live_temperature !== undefined) {
          setLiveReading(data.live_temperature.toFixed(1));
          
          // Auto-start measurement when temperature is valid and not already measuring
          if (data.live_temperature >= data.ready_threshold && 
              !data.measurement_active && 
              !measurementComplete) {
            setStatusMessage(`✅ Valid temperature detected (${data.live_temperature.toFixed(1)}°C). Starting measurement...`);
            
            // Clear any existing auto-start timeout
            if (autoStartRef.current) clearTimeout(autoStartRef.current);
            
            // Start measurement after short delay
            autoStartRef.current = setTimeout(() => {
              startMeasurement();
            }, 1000);
          } else if (data.live_temperature < data.ready_threshold && !data.measurement_active) {
            setStatusMessage(`Warming up... (${data.live_temperature.toFixed(1)}°C / ${data.ready_threshold}°C)`);
          }
        }

        // Handle progress during active measurement
        if (data.status && data.status.includes('temp_progress')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = parseInt(progressParts[2]);
          const progressPercent = (elapsed / total) * 100;
          setProgress(progressPercent);
          setStatusMessage(`Measuring temperature... ${total - elapsed}s`);
        }
        
        // Handle final result
        if (data.temperature !== null && data.temperature !== undefined) {
          if (data.temperature >= 34.0 && data.temperature <= 42.0) {
            // Valid temperature received
            setTemperature(data.temperature.toFixed(1));
            setMeasurementComplete(true);
            setStatusMessage("✅ Temperature Measurement Complete!");
            setProgress(100);
            stopMonitoring();
          } else {
            // Invalid temperature, retry
            setStatusMessage("❌ Invalid temperature reading, retrying...");
            handleRetry();
          }
        }

        // Handle status messages
        switch (data.status) {
          case 'temp_measurement_started':
            setStatusMessage("Measuring temperature...");
            break;
          case 'temp_measurement_complete':
            // Handled above with data.temperature check
            break;
          case 'error':
          case 'temp_reading_invalid':
            setStatusMessage("❌ Measurement failed, retrying...");
            handleRetry();
            break;
          default:
            // Show sensor status
            if (data.sensor_prepared && !data.measurement_active && !measurementComplete) {
              if (!data.live_temperature) {
                setStatusMessage("Sensor active, waiting for reading...");
              }
            }
            break;
        }

      } catch (error) {
        console.error("Error polling temperature status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("Starting temperature measurement...");
      const response = await sensorAPI.startTemperature();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
      } else {
        setStatusMessage("Temperature measurement started...");
      }
    } catch (error) {
      console.error("Start temperature error:", error);
      setStatusMessage("❌ Failed to start measurement");
      handleRetry();
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        initializeTemperatureSensor();
      }, 2000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the sensor.");
    }
  };

  const stopMonitoring = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !temperature) return;
    
    stopMonitoring();
    
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
            <div className="progress-fill" style={{ width: `50%` }}></div>
          </div>
          <span className="progress-step">Step 2 of 4 - Vital Signs</span>
        </div>

        <div className="bodytemp-header">
          <h1 className="bodytemp-title">Body Temperature</h1>
          <p className="bodytemp-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
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
              <img src={tempIcon} alt="Temperature Icon" className="measurement-icon"/>
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
                {liveReading && !measurementComplete && (
                  <div className="live-indicator">Live Reading</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-controls">
          {!isMeasuring && !measurementComplete && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>
                {liveReading && liveReading < 34.0 
                  ? `Point sensor at forehead (${liveReading}°C)` 
                  : "Waiting for valid temperature..."}
              </span>
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