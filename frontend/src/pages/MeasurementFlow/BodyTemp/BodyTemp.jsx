import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./BodyTemp.css";
import "../main-components-measurement.css";
import tempIcon from "../../../assets/icons/temp-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";
import { isLocalDevice } from "../../../utils/network";
import { speak } from "../../../utils/speech";
import step1Icon from "../../../assets/icons/bodytemp-step1.png";
import step2Icon from "../../../assets/icons/bodytemp-step2.png";
import step3Icon from "../../../assets/icons/measurement-step3.png";

export default function BodyTemp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled } = useInactivity();

  // BLOCK REMOTE ACCESS
  useEffect(() => {
    if (!isLocalDevice()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const [temperature, setTemperature] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");

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

    // Prevent zooming via touch gestures
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
      sensorAPI.shutdownTemperature();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync inactivity with measurement
  useEffect(() => {
    // If measuring, DISABLE inactivity (enabled = false)
    // If NOT measuring, ENABLE inactivity (enabled = true)
    setIsInactivityEnabled(!isMeasuring);
  }, [isMeasuring, setIsInactivityEnabled]);

  // Voice Instructions - Synced with UI
  useEffect(() => {
    const timer = setTimeout(() => {
      const isLast = isLastStep('bodytemp', location.state?.checklist);
      if (measurementStep === 0) {
        speak("Body Temperature Measurement. Get ready to measure your temperature.");
      } else if (measurementStep === 1) {
        speak("Step 1. Position Sensor. Point sensor at forehead.");
      } else if (measurementStep === 2) {
        speak("Step 2. Start Measurement. Click Start button.");
      } else if (measurementStep === 3) {
        if (isLast) {
          speak("Step 3. Results Ready. All measurements complete.");
        } else {
          speak("Step 3. Measurement Complete. Continue to next step.");
        }
      }
    }, 300); // Small delay to sync with UI update
    return () => clearTimeout(timer);
  }, [measurementStep, location.state?.checklist]);

  // Ref for cleanup
  const isMountedRef = useRef(true);
  const isMeasuringRef = useRef(false);

  // Sync ref with state
  useEffect(() => {
    isMeasuringRef.current = isMeasuring;
  }, [isMeasuring]);

  // Initialize mount ref
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const initializeTemperatureSensor = async () => {
    try {
      setStatusMessage("Powering up temperature sensor...");
      const prepareResult = await sensorAPI.prepareTemperature();

      if (prepareResult.error || prepareResult.status === 'error') {
        // Only retry if it's a connection error, not just "busy"
        console.warn("Prepare warning:", prepareResult);
      }

      setStatusMessage("✅ Temperature sensor ready. Point at forehead and click Start Measurement");
      // Don't force retry here, just let user try to start
      setMeasurementStep(1);
      startMonitoring();

    } catch (error) {
      console.error("Temperature initialization error:", error);
      setStatusMessage("⚠️ Sensor check failed. Check connection.");
      // NO aggressive retry loop here
    }
  };

  const tempReadingsRef = useRef([]);

  // Handle Countdown Completion - Frontend Timing Control
  useEffect(() => {
    if (isMeasuring && countdown === 0) {
      if (tempReadingsRef.current.length > 0) {
        // Calculate Average of VALID readings
        const sum = tempReadingsRef.current.reduce((a, b) => a + b, 0);
        const avg = sum / tempReadingsRef.current.length;

        // Double check validity (though inputs were filtered)
        if (avg >= 35.0 && avg <= 43.0) {
          handleMeasurementComplete(avg);
        } else {
          // Should ideally not happen if we filtered inputs, but safe fallback
          setStatusMessage("Reading unclear. Try again.");
          tempReadingsRef.current = [];
          startCountdown(2);
        }
      } else {
        // Time is up but no valid readings (e.g. ambient only)
        // Keep waiting / looping
        setStatusMessage("🌡️ Low reading. Move sensor closer to forehead...");
        // Reset timer to keep scanning without user interaction
        startCountdown(2);
      }
    }
  }, [countdown, isMeasuring]);

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    if (countdownRef.current) clearInterval(countdownRef.current);

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

    const poll = async () => {
      if (!isMountedRef.current) return;
      try {
        const data = await sensorAPI.getTemperatureStatus();

        // Update sensor readiness
        setIsReady(data.is_ready_for_measurement);

        // Update live reading
        if (data.live_temperature !== null && data.live_temperature !== undefined) {
          // Only update if value is valid number
          if (!isNaN(data.live_temperature)) {
            const currentTemp = parseFloat(data.live_temperature);

            // UPDATED: Filter out low temperatures (< 35.0) as per user request
            // Only show valid body temperature ranges.
            if (currentTemp >= 35.0) {
              setLiveTempValue(currentTemp.toFixed(1));
              setStatusMessage("✅ Valid reading. Hold steady...");

              if (isMeasuringRef.current) {
                // Collect VALID BODY TEMP for averaging
                tempReadingsRef.current.push(currentTemp);
              }
            } else {
              // Temperature too low (ambient or bad positioning)
              setLiveTempValue("--.--");
              // Update status to guide user
              if (isMeasuringRef.current) {
                setStatusMessage("🌡️ Waiting for valid readings...");
              } else {
                setStatusMessage("🌡️ Waiting for valid readings...");
              }
            }

            // Passive update of status message
            if (!isMeasuringRef.current && !measurementComplete && currentTemp >= 35.0) {
              setStatusMessage("✅ Sensor ready. Click Start.");
            }
          }
        }

        // Handle progress signal from backend
        if (isMeasuringRef.current && data.measurement_active && data.live_data) {
          if (data.live_data.progress) setProgress(data.live_data.progress);
        }

      } catch (error) {
        console.warn("Poll temp error (silent)");
      } finally {
        if (isMountedRef.current && pollerRef.current) {
          pollerRef.current = setTimeout(poll, 100); // UNIFORM 100ms polling
        }
      }
    };

    // Start recursive polling
    pollerRef.current = setTimeout(poll, 100); // UNIFORM 100ms polling
  };

  const startMeasurement = async () => {
    if (isMeasuring || measurementComplete) return;

    try {
      setStatusMessage("Starting temperature measurement...");
      setIsMeasuring(true);
      setTempMeasuring(true);
      setMeasurementStep(2);
      setProgress(0);
      setTemperature("");

      // Clear data
      tempReadingsRef.current = [];

      const response = await sensorAPI.startTemperature();

      if (response.error) {
        setStatusMessage(`❌ ${response.error || 'Start failed'}`);
        setIsMeasuring(false);
        setTempMeasuring(false);
      } else {
        setStatusMessage("🔄 Measuring... Hold sensor steady");
        startCountdown(2); // 2 seconds valid averaging
      }
    } catch (error) {
      console.error("Start temp error:", error);
      setStatusMessage("❌ Connection Failed");
      setIsMeasuring(false);
      setTempMeasuring(false);
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

    // STOP POLLING
    stopMonitoring();
    stopCountdown();

    // CRITICAL: Explicitly shutdown sensor to prevent interference
    sensorAPI.shutdownTemperature().catch(e => console.error("Temp shutdown error:", e));
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
      clearTimeout(pollerRef.current);
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

    if (tempMeasuring) {
      return {
        text: "Scanning...",
        class: "active",
        description: "Detecting temperature..."
      };
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
                  <div className="instruction-icon">
                    <img src={step1Icon} alt="Position Sensor" className="step-icon-image" />
                  </div>
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
                  <div className="instruction-icon">
                    <img src={step2Icon} alt="Start Measurement" className="step-icon-image" />
                  </div>
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
                  <div className="instruction-icon">
                    <img src={step3Icon} alt="Complete" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">
                    {isLastStep('bodytemp', location.state?.checklist) ? 'Results Ready' : 'Complete'}
                  </h4>
                  <p className="instruction-text">
                    {isLastStep('bodytemp', location.state?.checklist)
                      ? "All measurements complete!"
                      : "Continue to next measurement"}
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