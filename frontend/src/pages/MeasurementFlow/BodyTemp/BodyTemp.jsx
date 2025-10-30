import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import tempIcon from "../../../assets/icons/temp-icon.png";
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
  const [countdown, setCountdown] = useState(0);
  
  // New interactive state variables
  const [tempMeasuring, setTempMeasuring] = useState(false);
  const [tempComplete, setTempComplete] = useState(false);
  const [liveTempValue, setLiveTempValue] = useState("");
  const [measurementStep, setMeasurementStep] = useState(0); // 0: not started, 1: ready, 2: measuring, 3: complete

  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const autoStartRef = useRef(null);
  const tempIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeTemperatureSensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      if (autoStartRef.current) clearTimeout(autoStartRef.current);
      clearSimulatedMeasurements();
      stopCountdown();
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
      setMeasurementStep(1);
      startMonitoring();
      
    } catch (error) {
      console.error("Temperature initialization error:", error);
      setStatusMessage("❌ Failed to initialize temperature sensor");
      handleRetry();
    }
  };

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
  };

  const clearSimulatedMeasurements = () => {
    if (tempIntervalRef.current) {
      clearInterval(tempIntervalRef.current);
      tempIntervalRef.current = null;
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
          setLiveTempValue(data.live_temperature.toFixed(1));
          
          // Auto-start measurement when temperature is valid and not already measuring
          if (data.live_temperature >= data.ready_threshold && 
              !data.measurement_active && 
              !measurementComplete) {
            setStatusMessage(`✅ Valid temperature detected (${data.live_temperature.toFixed(1)}°C). Starting measurement...`);
            setMeasurementStep(2);
            
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
            setTempComplete(true);
            setTempMeasuring(false);
            setMeasurementStep(3);
            setStatusMessage("✅ Temperature Measurement Complete!");
            setProgress(100);
            stopMonitoring();
            clearSimulatedMeasurements();
            stopCountdown();
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
            setTempMeasuring(true);
            startSimulatedMeasurement();
            startCountdown(5);
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

  const startSimulatedMeasurement = () => {
    clearSimulatedMeasurements();
    let simulatedTemp = 36.0;
    tempIntervalRef.current = setInterval(() => {
      simulatedTemp += (Math.random() - 0.5) * 0.2; // Small fluctuations
      if (simulatedTemp > 37.5) simulatedTemp = 37.5 - Math.random() * 0.5;
      if (simulatedTemp < 35.5) simulatedTemp = 35.5 + Math.random() * 0.5;
      setLiveTempValue(simulatedTemp.toFixed(1));
    }, 300);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("Starting temperature measurement...");
      setTempMeasuring(true);
      const response = await sensorAPI.startTemperature();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
      } else {
        setStatusMessage("Temperature measurement started...");
        startSimulatedMeasurement();
        startCountdown(5);
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
      clearSimulatedMeasurements();
      stopCountdown();
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
    clearSimulatedMeasurements();
    stopCountdown();
    
    navigate("/measure/max30102", {
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

  const getButtonText = () => {
    if (isMeasuring) {
      return "Measuring Temperature...";
    }
    
    switch (measurementStep) {
      case 0:
        return "Start Temperature Measurement";
      case 1:
        return "Waiting for Sensor...";
      case 2:
        return "Measuring Temperature...";
      case 3:
        return "Continue to Pulse Oximeter";
      default:
        return "Start Temperature Measurement";
    }
  };

  const getButtonDisabled = () => {
    return isMeasuring || (measurementStep === 3 && (!temperature));
  };

  const statusInfo = getTemperatureStatus(temperature);

  return (
    <div className="bodytemp-container">
      <div className={`bodytemp-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress bar for Step 2 of 4 */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `50%` }}></div>
          </div>
          <span className="progress-step">Step 2 of 4 - Body Temperature</span>
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
          {/* Single Temperature Card - Enhanced to match BMI cards */}
          <div className="temperature-card-container">
            <div className={`measurement-card temperature-card ${
              tempMeasuring ? 'measuring-active' : 
              tempComplete ? 'measurement-complete' : ''
            }`}>
              <div className="measurement-icon">
                <img src={tempIcon} alt="Temperature Icon" className="measurement-image"/>
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Temperature</h3>
                <div className="measurement-value">
                  <span className={`value ${
                    tempMeasuring ? 'measuring-live' : ''
                  }`}>
                    {tempMeasuring ? (liveTempValue || "00.0") : 
                     temperature || "--.-"}
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

          {/* Temperature Result Card */}
          {measurementComplete && temperature && (
            <div className="temperature-card-container">
              <div className="temp-result-card has-result">
                <div className="temp-result-header">
                  <h3>Temperature Result</h3>
                </div>
                <div className="temp-result-content">
                  <div className="temp-value-display">
                    <span className="temp-value">
                      {temperature}
                    </span>
                    <span className="temp-unit">°C</span>
                  </div>
                  {temperature && (
                    <>
                      <div className={`temp-category ${statusInfo.class}`}>
                        {statusInfo.text}
                      </div>
                      <div className="temp-description">
                        {statusInfo.text === "Normal" 
                          ? "Your body temperature is within normal range" 
                          : statusInfo.text === "Low Temperature"
                          ? "Your body temperature is below normal range"
                          : "Your body temperature indicates fever"
                        }
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INSTRUCTION DISPLAY - Horizontal layout with 3 cards matching BMI */}
          <div className="instruction-container">
            <div className="instruction-cards-horizontal">
              {/* Step 1 Card */}
              <div className={`instruction-card-step ${
                measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">1</div>
                <div className="step-icon">🔍</div>
                <h4 className="step-title">Point Sensor</h4>
                <p className="step-description">
                  Point temperature sensor at forehead
                </p>
                <div className={`step-status ${
                  measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 1 ? (measurementStep > 1 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>

              {/* Step 2 Card */}
              <div className={`instruction-card-step ${
                measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">2</div>
                <div className="step-icon">🌡️</div>
                <h4 className="step-title">Hold Steady</h4>
                <p className="step-description">
                  {tempMeasuring 
                    ? "Hold position for measurement"
                    : "Wait for temperature reading"
                  }
                </p>
                {tempMeasuring && countdown > 0 && (
                  <div className="countdown-mini">
                    <div className="countdown-mini-circle">
                      <span className="countdown-mini-number">{countdown}</span>
                    </div>
                    <span className="countdown-mini-text">seconds</span>
                  </div>
                )}
                <div className={`step-status ${
                  measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 2 ? (measurementStep > 2 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>

              {/* Step 3 Card */}
              <div className={`instruction-card-step ${
                measurementStep >= 3 ? 'completed' : ''
              }`}>
                <div className="step-number-circle">3</div>
                <div className="step-icon">✅</div>
                <h4 className="step-title">Continue</h4>
                <p className="step-description">
                  {measurementComplete 
                    ? "Temperature complete! Continue" 
                    : "Proceed after measurement"
                  }
                </p>
                <div className={`step-status ${
                  measurementStep >= 3 ? 'completed' : 'pending'
                }`}>
                  {measurementStep >= 3 ? 'Completed' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={measurementStep === 3 ? handleContinue : startMeasurement} 
            disabled={getButtonDisabled()}
          >
            {isMeasuring && (
              <div className="spinner"></div>
            )}
            {getButtonText()}
            {measurementComplete && (
              <span style={{fontSize: '0.8rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
                Temperature: {temperature}°C
              </span>
            )}
          </button>
          
          {/* Debug info */}
          <div style={{ 
            marginTop: '10px', 
            fontSize: '0.7rem', 
            color: '#666',
            textAlign: 'center',
            padding: '5px',
            background: '#f5f5f5',
            borderRadius: '5px',
            fontFamily: 'monospace'
          }}>
            Step: {measurementStep} | 
            Status: {measurementComplete ? '✅ COMPLETE' : '⏳ MEASURING'} | 
            Temperature: {temperature || '--'} |
            Path: /measure/max30102
          </div>
        </div>
      </div>
    </div>
  );
}