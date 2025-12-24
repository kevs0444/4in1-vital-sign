import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./BodyTemp.css";
import "../main-components-measurement.css";
import tempIcon from "../../../assets/icons/temp-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";
import { speak } from "../../../utils/speech";

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled } = useInactivity();
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
  const [showExitModal, setShowExitModal] = useState(false);

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

    // Prevent zooming via touch gestures - Helper functions defined inside to avoid dependency issues if kept outside
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

  // Initialization
  useEffect(() => {
    // Enable inactivity timer initially
    setIsInactivityEnabled(true);

    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 BodyTemp received location.state:", location.state);

    // Call initialization
    initializeTemperatureSensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      stopCountdown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync inactivity with measurement
  useEffect(() => {
    // If measuring, DISABLE inactivity (enabled = false)
    // If NOT measuring, ENABLE inactivity (enabled = true)
    setIsInactivityEnabled(!isMeasuring);
  }, [isMeasuring, setIsInactivityEnabled]);

  // Voice Instructions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (measurementStep === 1) {
        speak("Step 1. Position Sensor. Point sensor at forehead.");
      } else if (measurementStep === 2) {
        speak("Step 2. Start Measurement. Click Start button.");
      } else if (measurementStep === 3) {
        speak("Step 3. Measurement Complete. Proceed to next step.");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [measurementStep]);

  // Prevent zooming functions - placeholders if referenced elsewhere (unlikely due to scoping above, removing global ones)
  // Actually, keeping them might be safer if used by other hooks, but they are not. Removing to keep clean.

  // Need to define dependencies for handlers if defined outside.
  // We'll define dummy handles just in case or better, rely on the ones inside useEffect scope.
  // BUT the previous implementation had them outside.
  // The 'no-unused-vars' warning for 'handleBack' needs to be addressed too in the rest of the file.
  // We'll deal with hooks here.

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

      if (prepareResult.error || prepareResult.status === 'error') {
        setStatusMessage(`❌ ${prepareResult.error || prepareResult.message || 'Initialization failed'}`);
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
        text: "Slight fever",
        class: "warning",
        description: "Your body temperature indicates a slight fever"
      };
    } else if (tempValue > 38.0) {
      return {
        text: "Critical",
        class: "error",
        description: "Your body temperature is in the critical range"
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

  const handleBack = () => {
    if (measurementStep > 1) {
      stopMonitoring();
      stopCountdown();
      resetMeasurement();
      setMeasurementStep(1);
      setStatusMessage("✅ Temperature sensor ready. Point at forehead and click Start Measurement");
    } else {
      navigate(-1);
    }
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = async () => {
    try {
      await sensorAPI.reset();
    } catch (e) {
      console.error("Error resetting sensors:", e);
    }
    setShowExitModal(false);
    navigate("/login");
  };

  const statusInfo = getCurrentStatusInfo();
  const displayValue = getCurrentDisplayValue();

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container"
    >
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>
        {/* Progress bar for Step X of Y */}
        <div className="w-100 mb-4">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${getProgressInfo('bodytemp', location.state?.checklist).percentage}%` }}></div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2 px-1">
            <button className="measurement-back-arrow" onClick={handleExit}>←</button>
            <span className="measurement-progress-step mb-0">
              Step {getProgressInfo('bodytemp', location.state?.checklist).currentStep} of {getProgressInfo('bodytemp', location.state?.checklist).totalSteps} - Body Temperature
            </span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="measurement-title">Body <span className="measurement-title-accent">Temperature</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator text-warning fw-bold">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="w-50 mx-auto mt-2">
              <div className="measurement-progress-bar">
                <div
                  className="measurement-progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="measurement-progress-step text-center d-block">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="w-100">
          <div className="row g-4 justify-content-center mb-4">
            {/* Single Temperature Display - Shows live reading and result */}
            <div className="col-12 col-md-8 col-lg-6">
              <div className={`measurement-card w-100 ${tempMeasuring ? 'active' : ''} ${tempComplete ? 'completed' : ''}`} style={{ minHeight: '320px' }}>
                <div className="measurement-icon" style={{ width: '80px', height: '80px', marginBottom: '20px' }}>
                  <img src={tempIcon} alt="Temperature Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                <h3 className="instruction-title fs-3">
                  {measurementComplete ? "Temperature Result" : "Body Temperature"}
                </h3>

                <div className="measurement-value-container">
                  <span className="measurement-value" style={{ fontSize: '3.5rem' }}>
                    {displayValue}
                  </span>
                  <span className="measurement-unit">°C</span>
                </div>

                <div className="text-center mt-3">
                  <span className={`measurement-status-badge ${statusInfo.class}`}>
                    {statusInfo.text}
                  </span>
                  <div className="instruction-text mt-2">
                    {statusInfo.description}
                  </div>
                </div>

                {tempMeasuring && liveTempValue && (
                  <div className="text-info fw-bold mt-3">
                    🔄 Live Reading
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INSTRUCTION DISPLAY */}
          <div className="w-100 mt-4">
            <div className="row g-3 justify-content-center">
              {/* Step 1 Card */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">1</div>
                  <div className="instruction-icon">📍</div>
                  <h4 className="instruction-title">Position Sensor</h4>
                  <p className="instruction-text">
                    Point sensor at forehead
                  </p>
                </div>
              </div>

              {/* Step 2 Card */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon">📱</div>
                  <h4 className="instruction-title">Start Measurement</h4>
                  <p className="instruction-text">
                    Click Start button
                  </p>
                  {isMeasuring && countdown > 0 && (
                    <div className="text-danger fw-bold mt-2">
                      {countdown}s
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 Card */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 3 ? 'completed' : ''}`}>
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
        </div>

        <div className="measurement-navigation mt-5">
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

      {/* Modern Exit Confirmation Popup Modal */}
      {showExitModal && (
        <div className="exit-modal-overlay" onClick={() => setShowExitModal(false)}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-modal-icon">
              <span>🚪</span>
            </div>
            <h2 className="exit-modal-title">Exit Measurement?</h2>
            <p className="exit-modal-message">Do you want to go back to login and cancel the measurement?</p>
            <div className="exit-modal-buttons">
              <button
                className="exit-modal-button secondary"
                onClick={() => setShowExitModal(false)}
              >
                Cancel
              </button>
              <button
                className="exit-modal-button primary"
                onClick={confirmExit}
              >
                Yes, Exit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}