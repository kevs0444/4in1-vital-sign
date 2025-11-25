import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BodyTemp.css";
import "../main-components-measurement.css";
import tempIcon from "../../../assets/icons/temp-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";

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

  // Interactive state variables
  const [tempMeasuring, setTempMeasuring] = useState(false);
  const [tempComplete, setTempComplete] = useState(false);
  const [liveTempValue, setLiveTempValue] = useState("");
  const [measurementStep, setMeasurementStep] = useState(0); // 0: not started, 1: ready, 2: measuring, 3: complete

  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const countdownRef = useRef(null);

  // Add viewport meta tag to prevent zooming
  useEffect(() => {
    // Create or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';

    // Prevent zooming via touch gestures
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 BodyTemp received location.state:", location.state);
    initializeTemperatureSensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      stopCountdown();
    };
  }, []);

  // Prevent zooming functions
  const handleTouchStart = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
    }
  };

  const preventZoom = (e) => {
    e.preventDefault();
  };

  const initializeTemperatureSensor = async () => {
    try {
      setStatusMessage("Powering up temperature sensor...");
      const prepareResult = await sensorAPI.prepareTemperature();

      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }

      setStatusMessage("✅ Temperature sensor ready. Point at forehead and click Start Measurement");
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

  const startMonitoring = () => {
    stopMonitoring();

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getTemperatureStatus();
        console.log("Temperature status:", data);

        // Update sensor readiness
        setIsReady(data.is_ready_for_measurement);

        // Update live reading from actual sensor data
        if (data.live_temperature !== null && data.live_temperature !== undefined) {
          const currentTemp = data.live_temperature.toFixed(1);
          setLiveReading(currentTemp);
          setLiveTempValue(currentTemp);

          // Show live temperature when sensor is ready but not measuring
          if (!isMeasuring && !measurementComplete) {
            setStatusMessage(`✅ Sensor ready. Current reading: ${currentTemp}°C - Click Start Measurement`);
          }
        }

        // Handle progress during active measurement
        if (data.measurement_active && data.live_data) {
          setProgress(data.live_data.progress);
          const timeLeft = data.live_data.total - data.live_data.elapsed;
          setStatusMessage(`Measuring... ${timeLeft}s remaining`);
        }

        // Handle final result
        if (data.temperature !== null && data.temperature !== undefined && !measurementComplete) {
          if (data.temperature >= 34.0 && data.temperature <= 42.0) {
            // Valid temperature received
            handleMeasurementComplete(data.temperature);
          } else {
            // Invalid temperature, retry
            setStatusMessage("❌ Invalid temperature reading, please try again");
            resetMeasurement();
          }
        }

        // Handle measurement completion from sensor manager
        if (data.live_data && data.live_data.status === 'complete' && data.temperature) {
          handleMeasurementComplete(data.temperature);
        }

      } catch (error) {
        console.error("Error polling temperature status:", error);
        if (!measurementComplete) {
          setStatusMessage("⚠️ Connection issue, retrying...");
        }
      }
    }, 500); // Poll every 500ms for faster response
  };

  const startMeasurement = async () => {
    if (isMeasuring || measurementComplete) return;

    try {
      setStatusMessage("Starting temperature measurement...");
      setIsMeasuring(true);
      setTempMeasuring(true);
      setMeasurementStep(2);
      setProgress(0);

      // Clear any previous measurement
      setTemperature("");

      const response = await sensorAPI.startTemperature();

      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        resetMeasurement();
        handleRetry();
      } else {
        setStatusMessage("🔄 Measuring temperature... Hold sensor steady");
        startCountdown(2); // 2 seconds countdown
      }
    } catch (error) {
      console.error("Start temperature error:", error);
      setStatusMessage("❌ Failed to start measurement");
      resetMeasurement();
      handleRetry();
    }
  };

  const handleMeasurementComplete = (finalTemperature) => {
    setTemperature(finalTemperature.toFixed(1));
    setMeasurementComplete(true);
    setTempComplete(true);
    setTempMeasuring(false);
    setIsMeasuring(false);
    setMeasurementStep(3);
    setProgress(100);
    setStatusMessage("✅ Temperature Measurement Complete!");
    stopMonitoring();
    stopCountdown();
  };

  const resetMeasurement = () => {
    setIsMeasuring(false);
    setTempMeasuring(false);
    setProgress(0);
    stopCountdown();
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
    stopCountdown();

    // Merge all previous data with temperature
    const vitalSignsData = {
      ...location.state, // This includes BMI data and personal info
      temperature: parseFloat(temperature)
    };

    console.log("🚀 BodyTemp complete - navigating to next step with data:", vitalSignsData);

    const nextPath = getNextStepPath('bodytemp', location.state?.checklist);
    navigate(nextPath, {
      state: vitalSignsData,
    });
  };

  const getTemperatureStatus = (temp) => {
    if (!temp || temp === "--.-") return {
      text: "Not measured",
      class: "pending",
      description: "Temperature not measured yet"
    };

    const tempValue = parseFloat(temp);

    if (tempValue >= 35.0 && tempValue <= 37.2) {
      return {
        text: "Normal",
        class: "complete",
        description: "Your body temperature is within normal range"
      };
    } else if (tempValue >= 37.3 && tempValue <= 38.0) {
      return {
        text: "Elevated",
        class: "warning",
        description: "Your body temperature is elevated"
      };
    } else if (tempValue > 38.0) {
      return {
        text: "Critical",
        class: "error",
        description: "Your body temperature indicates fever"
      };
    }

    // For temperatures below 35.0, show as default/unknown
    return {
      text: "Invalid",
      class: "pending",
      description: "Temperature reading is outside normal range"
    };
  };

  const getCurrentDisplayValue = () => {
    if (tempMeasuring && liveTempValue) {
      return liveTempValue;
    }
    if (measurementComplete && temperature) {
      return temperature;
    }
    return "--.-";
  };

  const getCurrentStatusInfo = () => {
    if (measurementComplete && temperature) {
      return getTemperatureStatus(temperature);
    }

    const currentValue = getCurrentDisplayValue();
    if (currentValue !== "--.-") {
      return getTemperatureStatus(currentValue);
    }

    return {
      text: isReady ? 'Ready' : 'Initializing',
      class: isReady ? 'active' : 'pending',
      description: isReady ? 'Ready for measurement' : 'Initializing temperature sensor'
    };
  };

  const getButtonText = () => {
    if (isMeasuring) {
      return `Measuring... ${countdown}s`;
    }

    if (measurementComplete) {
      const isLast = isLastStep('bodytemp', location.state?.checklist);
      return isLast ? "Continue to Result" : "Continue to Next Step";
    }

    return "Start Temperature Measurement";
  };

  const getButtonDisabled = () => {
    return isMeasuring;
  };

  const statusInfo = getCurrentStatusInfo();
  const displayValue = getCurrentDisplayValue();

  return (
    <div className="measurement-container">
      <div className={`measurement-content ${isVisible ? 'visible' : ''}`}>

        {/* Progress bar for Step X of Y */}
        <div className="measurement-progress-container">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${getProgressInfo('bodytemp', location.state?.checklist).percentage}%` }}></div>
          </div>
          <span className="measurement-progress-step">
            Step {getProgressInfo('bodytemp', location.state?.checklist).currentStep} of {getProgressInfo('bodytemp', location.state?.checklist).totalSteps} - Body Temperature
          </span>
        </div>

        <div className="measurement-header">
          <h1 className="measurement-title">Body <span className="measurement-title-accent">Temperature</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="measurement-progress-container" style={{ width: '50%', margin: '0 auto' }}>
              <div className="measurement-progress-bar">
                <div
                  className="measurement-progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="measurement-progress-step" style={{ textAlign: 'center' }}>{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="measurement-display-section">
          {/* Single Temperature Display - Shows live reading and result */}
          <div className={`measurement-card ${tempMeasuring ? 'active' : ''} ${tempComplete ? 'completed' : ''}`} style={{ minWidth: '320px', minHeight: '320px' }}>
            <div className="measurement-icon" style={{ width: '80px', height: '80px', marginBottom: '20px' }}>
              <img src={tempIcon} alt="Temperature Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <h3 className="instruction-title" style={{ fontSize: '1.5rem' }}>
              {measurementComplete ? "Temperature Result" : "Body Temperature"}
            </h3>

            <div className="measurement-value-container">
              <span className="measurement-value" style={{ fontSize: '3.5rem' }}>
                {displayValue}
              </span>
              <span className="measurement-unit">°C</span>
            </div>

            <div className="measurement-status-badge-container" style={{ marginTop: '15px', textAlign: 'center' }}>
              <span className={`measurement-status-badge ${statusInfo.class}`}>
                {statusInfo.text}
              </span>
              <div className="instruction-text" style={{ marginTop: '10px' }}>
                {statusInfo.description}
              </div>
            </div>

            {tempMeasuring && liveTempValue && (
              <div style={{ color: '#17a2b8', fontWeight: 'bold', marginTop: '15px' }}>
                🔄 Live Reading
              </div>
            )}
          </div>

          {/* INSTRUCTION DISPLAY */}
          <div className="measurement-instruction-container">
            <div className="instruction-cards">
              {/* Step 1 Card */}
              <div className={`instruction-card ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                <div className="instruction-step-number">1</div>
                <div className="instruction-icon">📍</div>
                <h4 className="instruction-title">Position Sensor</h4>
                <p className="instruction-text">
                  Point sensor at forehead
                </p>
              </div>

              {/* Step 2 Card */}
              <div className={`instruction-card ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                <div className="instruction-step-number">2</div>
                <div className="instruction-icon">📱</div>
                <h4 className="instruction-title">Start Measurement</h4>
                <p className="instruction-text">
                  Click Start button
                </p>
                {isMeasuring && countdown > 0 && (
                  <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '5px' }}>
                    {countdown}s
                  </div>
                )}
              </div>

              {/* Step 3 Card */}
              <div className={`instruction-card ${measurementStep >= 3 ? 'completed' : ''}`}>
                <div className="instruction-step-number">3</div>
                <div className="instruction-icon">✅</div>
                <h4 className="instruction-title">Continue</h4>
                <p className="instruction-text">
                  Proceed to next step
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-action-container">
          <button
            className="measurement-button"
            onClick={measurementComplete ? handleContinue : startMeasurement}
            disabled={getButtonDisabled()}
          >
            {isMeasuring && (
              <div className="spinner"></div>
            )}
            {getButtonText()}
          </button>
        </div>
      </div>
    </div>
  );
}