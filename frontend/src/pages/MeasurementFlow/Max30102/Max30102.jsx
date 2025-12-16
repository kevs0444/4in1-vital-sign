import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./Max30102.css";
import "../main-components-measurement.css";
import heartRateIcon from "../../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../../assets/icons/respiratory-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing pulse oximeter...");
  const [measurements, setMeasurements] = useState({
    heartRate: "--",
    spo2: "--",
    respiratoryRate: "--"
  });
  // Arrays to store all readings for averaging
  const [heartRateReadings, setHeartRateReadings] = useState([]);
  const [spo2Readings, setSpo2Readings] = useState([]);
  const [respiratoryRateReadings, setRespiratoryRateReadings] = useState([]);

  const [progressSeconds, setProgressSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [sensorReady, setSensorReady] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [irValue, setIrValue] = useState(0);
  const [measurementStarted, setMeasurementStarted] = useState(false);
  const [showFingerRemovedAlert, setShowFingerRemovedAlert] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const pollerRef = useRef(null);
  const fingerCheckRef = useRef(null);
  const initializationRef = useRef(false);
  const progressTimerRef = useRef(null);
  const fingerRemovedAlertRef = useRef(null);
  const previousFingerStateRef = useRef(false);
  const totalMeasurementTime = 30;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 Max30102 received location.state:", location.state);
    initializeMax30102Sensor();

    return () => {
      clearTimeout(timer);
      stopAllTimers();
      clearFingerRemovedAlert();
      // Removed shutdown on unmount to prevent premature shutdown in Strict Mode
      // sensorAPI.shutdownMax30102().catch(err => console.error("Error shutting down MAX30102 on unmount:", err));
    };
  }, []);

  // Update progress percentage when seconds change
  useEffect(() => {
    const percent = Math.min(100, Math.round((progressSeconds / totalMeasurementTime) * 100));
    setProgressPercent(percent);

    // Update countdown (remaining time)
    const remaining = Math.max(0, totalMeasurementTime - progressSeconds);
    setCountdown(remaining);

    // Auto-complete when time is up
    if (progressSeconds >= totalMeasurementTime && isMeasuring && !measurementComplete) {
      completeMeasurement();
    }
  }, [progressSeconds, isMeasuring, measurementComplete]);

  const startProgressTimer = () => {
    stopProgressTimer();

    progressTimerRef.current = setInterval(() => {
      setProgressSeconds(prev => {
        const newSeconds = prev + 1;
        if (newSeconds >= totalMeasurementTime) {
          completeMeasurement();
          return totalMeasurementTime;
        }
        return newSeconds;
      });
    }, 1000);
  };

  const stopProgressTimer = () => {
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
  };

  const showFingerRemovedNotification = () => {
    setShowFingerRemovedAlert(true);

    if (fingerRemovedAlertRef.current) {
      clearTimeout(fingerRemovedAlertRef.current);
    }

    fingerRemovedAlertRef.current = setTimeout(() => {
      setShowFingerRemovedAlert(false);
    }, 5000); // Show for 5 seconds
  };

  const clearFingerRemovedAlert = () => {
    if (fingerRemovedAlertRef.current) {
      clearTimeout(fingerRemovedAlertRef.current);
      fingerRemovedAlertRef.current = null;
    }
    setShowFingerRemovedAlert(false);
  };

  const initializeMax30102Sensor = async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      setStatusMessage("🔄 Powering up pulse oximeter...");
      setMeasurementStep(1);

      const prepareResult = await sensorAPI.prepareMax30102();

      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }

      setStatusMessage("✅ Pulse oximeter ready. Place finger to start automatic measurement...");
      setSensorReady(true);
      setMeasurementStep(2);

      startFingerMonitoring();

    } catch (error) {
      console.error("MAX30102 initialization error:", error);
      setStatusMessage("❌ Failed to initialize pulse oximeter");
      handleRetry();
    }
  };

  const startFingerMonitoring = () => {
    stopAllTimers();

    fingerCheckRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();

        const newFingerDetected = Boolean(data.finger_detected);
        const newSensorReady = Boolean(data.sensor_prepared);

        console.log("Finger check:", {
          newFingerDetected,
          previousFingerState: previousFingerStateRef.current,
          isMeasuring,
          measurementComplete
        });

        // Check if finger was JUST REMOVED (was detected, now not detected) during measurement
        if (previousFingerStateRef.current && !newFingerDetected && isMeasuring && !measurementComplete) {
          console.log("Finger removed during measurement - stopping timer and showing alert");
          showFingerRemovedNotification();
          setStatusMessage("❌ Finger removed! Please reinsert finger to continue measurement.");
          pauseMeasurement(); // STOP COUNTING BUT DON'T RESET YET
        }

        // Check if finger was JUST INSERTED (was not detected, now detected) AND sensor is ready
        if (!previousFingerStateRef.current && newFingerDetected && newSensorReady) {
          if (isMeasuring && !measurementComplete) {
            // Finger was reinserted after removal - RESET TO 0 and start over
            console.log("Finger reinserted during measurement - resetting to 0 and starting over");
            resetAndStartMeasurement();
          } else if (!isMeasuring && !measurementComplete) {
            // First time finger insertion - start measurement
            console.log("Finger detected for the first time - starting measurement");
            startMeasurement();
          }
        }

        // Update previous state
        previousFingerStateRef.current = newFingerDetected;

        setFingerDetected(newFingerDetected);
        setSensorReady(newSensorReady);

        if (data.ir_value !== undefined) {
          setIrValue(data.ir_value);
        }

      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000); // Check every second

    startMainPolling();
  };

  const startMeasurement = () => {
    console.log("Starting measurement for the first time");
    setStatusMessage("✅ Finger detected! Automatic measurement starting...");
    setMeasurementStep(3);
    setIsMeasuring(true);
    setMeasurementStarted(true);
    setProgressSeconds(0); // Start from 0
    setProgressPercent(0);
    setCountdown(30);
    // Clear previous readings
    setHeartRateReadings([]);
    setSpo2Readings([]);
    setRespiratoryRateReadings([]);
    startProgressTimer();
    clearFingerRemovedAlert();
  };

  const pauseMeasurement = () => {
    console.log("Pausing measurement due to finger removal");
    stopProgressTimer(); // STOP COUNTING but keep current progress
    setIsMeasuring(false);
    // Don't reset progressSeconds here - keep it where it was
  };

  const resetAndStartMeasurement = () => {
    console.log("Resetting measurement to 0 and starting over");
    stopProgressTimer();
    setProgressSeconds(0); // RESET TO 0
    setProgressPercent(0); // RESET PROGRESS TO 0%
    setCountdown(30); // RESET COUNTDOWN TO 30
    setStatusMessage("✅ Finger detected! Measurement restarting from beginning...");
    setIsMeasuring(true);
    startProgressTimer(); // START COUNTING FROM 0
    clearFingerRemovedAlert();
  };

  const completeMeasurement = () => {
    console.log("🏁 Measurement completion triggered");
    console.log(`📊 Collected readings - HR: ${heartRateReadings.length}, SpO2: ${spo2Readings.length}, RR: ${respiratoryRateReadings.length}`);

    stopProgressTimer();
    setIsMeasuring(false);
    setMeasurementComplete(true);
    setMeasurementStep(4);
    setProgressPercent(100);
    setProgressSeconds(totalMeasurementTime);
    setCountdown(0);

    // Calculate averages from all collected readings
    let avgHeartRate = "--";
    let avgSpo2 = "--";
    let avgRespiratoryRate = "--";

    // Filter out invalid readings (0 or negative values) before averaging
    const validHeartRateReadings = heartRateReadings.filter(val => val > 0 && val < 200);
    const validSpo2Readings = spo2Readings.filter(val => val > 0 && val <= 100);
    const validRespiratoryRateReadings = respiratoryRateReadings.filter(val => val > 0 && val < 60);

    if (validHeartRateReadings.length > 0) {
      avgHeartRate = Math.round(validHeartRateReadings.reduce((a, b) => a + b, 0) / validHeartRateReadings.length).toString();
      console.log(`✅ Heart Rate Average: ${avgHeartRate} BPM (from ${validHeartRateReadings.length} valid readings)`);
    } else {
      console.warn("⚠️ No valid heart rate readings collected");
    }

    if (validSpo2Readings.length > 0) {
      avgSpo2 = Math.round(validSpo2Readings.reduce((a, b) => a + b, 0) / validSpo2Readings.length).toString();
      console.log(`✅ SpO2 Average: ${avgSpo2}% (from ${validSpo2Readings.length} valid readings)`);
    } else {
      console.warn("⚠️ No valid SpO2 readings collected");
    }

    if (validRespiratoryRateReadings.length > 0) {
      avgRespiratoryRate = Math.round(validRespiratoryRateReadings.reduce((a, b) => a + b, 0) / validRespiratoryRateReadings.length).toString();
      console.log(`✅ Respiratory Rate Average: ${avgRespiratoryRate}/min (from ${validRespiratoryRateReadings.length} valid readings)`);
    } else {
      console.warn("⚠️ No valid respiratory rate readings collected");
    }

    // Update with averaged results
    setMeasurements({
      heartRate: avgHeartRate,
      spo2: avgSpo2,
      respiratoryRate: avgRespiratoryRate
    });

    // Show appropriate status message
    const hasValidData = avgHeartRate !== "--" || avgSpo2 !== "--" || avgRespiratoryRate !== "--";
    if (hasValidData) {
      setStatusMessage("✅ Measurement Complete! Final averaged results ready.");
      console.log("✅ Measurement completed successfully with valid averaged data");
    } else {
      setStatusMessage("⚠️ Measurement completed but insufficient data. Please try again.");
      console.warn("⚠️ Measurement completed but no valid readings were collected");
    }

    stopAllTimers();
    clearFingerRemovedAlert();
  };

  const startMainPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();

        // Update measurements from API data if available and store for averaging
        // Only update if we have valid, non-zero readings from Arduino
        if (data.heart_rate && data.heart_rate > 0 && !isNaN(data.heart_rate)) {
          updateCurrentMeasurement('heartRate', data.heart_rate);
          // Store reading for averaging only during active measurement
          if (isMeasuring) {
            setHeartRateReadings(prev => [...prev, data.heart_rate]);
          }
        }

        if (data.spo2 && data.spo2 > 0 && !isNaN(data.spo2)) {
          updateCurrentMeasurement('spo2', data.spo2);
          // Store reading for averaging only during active measurement
          if (isMeasuring) {
            setSpo2Readings(prev => [...prev, data.spo2]);
          }
        }

        if (data.respiratory_rate && data.respiratory_rate > 0 && !isNaN(data.respiratory_rate)) {
          updateCurrentMeasurement('respiratoryRate', data.respiratory_rate);
          // Store reading for averaging only during active measurement
          if (isMeasuring) {
            setRespiratoryRateReadings(prev => [...prev, data.respiratory_rate]);
          }
        }

        // Check for API-based completion
        if (data.final_result_shown && !measurementComplete) {
          completeMeasurement();
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        if (isMeasuring) {
          setStatusMessage("⚠️ Connection issue, retrying...");
        }
      }
    }, 500); // Reduced to 500ms for better live data responsiveness
  };

  const updateCurrentMeasurement = (type, value) => {
    setMeasurements(prev => ({
      ...prev,
      [type]: Math.round(value).toString()
    }));
  };

  const handleRetry = () => {
    const MAX_RETRIES = 3;
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      initializationRef.current = false;

      setTimeout(() => {
        initializeMax30102Sensor();
      }, 3000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the device.");
      setMeasurementComplete(true);
    }
  };

  const stopAllTimers = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    if (fingerCheckRef.current) {
      clearInterval(fingerCheckRef.current);
      fingerCheckRef.current = null;
    }
    stopProgressTimer();
  };

  const handleContinue = async () => {
    if (!measurementComplete) return;

    stopAllTimers();
    clearFingerRemovedAlert();

    // Shutdown sensor before navigating away
    try {
      console.log("🔌 Shutting down MAX30102 sensor...");
      await sensorAPI.shutdownMax30102();
    } catch (error) {
      console.error("Error shutting down MAX30102:", error);
    }

    // Only include measurements that have actual values
    const vitalSignsData = {
      ...location.state, // This includes all previous data
      measurementTimestamp: new Date().toISOString()
    };

    // Only add measurements if they have real values (not "--")
    if (measurements.heartRate !== "--") {
      vitalSignsData.heartRate = parseInt(measurements.heartRate);
    }
    if (measurements.spo2 !== "--") {
      vitalSignsData.spo2 = parseInt(measurements.spo2);
    }
    if (measurements.respiratoryRate !== "--") {
      vitalSignsData.respiratoryRate = parseInt(measurements.respiratoryRate);
    }

    console.log("🚀 Max30102 complete - navigating to next step with data:", vitalSignsData);

    const nextPath = getNextStepPath('max30102', location.state?.checklist);
    navigate(nextPath, { state: vitalSignsData });
  };

  const getStatusColor = (type, value) => {
    if (value === '--' || value === '--') return "pending";
    const num = parseInt(value);

    switch (type) {
      case "heartRate":
        if (num < 60) return "warning";
        if (num > 100) return "error";
        return "complete";
      case "spo2":
        if (num < 95) return "warning";
        return "complete";
      case "respiratoryRate":
        if (num < 12) return "warning";
        if (num > 20) return "error";
        return "complete";
      default:
        return "complete";
    }
  };

  const getStatusText = (type, value) => {
    if (value === '--' || value === '--') return "Pending";
    const num = parseInt(value);

    switch (type) {
      case "heartRate":
        if (num < 60) return "Low";
        if (num > 100) return "High";
        return "Normal";
      case "spo2":
        if (num < 95) return "Low";
        return "Normal";
      case "respiratoryRate":
        if (num < 12) return "Low";
        if (num > 20) return "High";
        return "Normal";
      default:
        return "Normal";
    }
  };

  const getButtonText = () => {
    if (measurementComplete) {
      const isLast = isLastStep('max30102', location.state?.checklist);
      return isLast ? "Continue to Result" : "Continue to Next Step";
    }

    if (isMeasuring) {
      return `Measuring... ${countdown}s remaining`;
    }

    if (fingerDetected && !isMeasuring && !measurementComplete) {
      return "Ready to Measure - Keep Finger Steady";
    }

    return "Waiting for Finger Detection...";
  };

  const getSensorState = () => {
    if (measurementComplete) return "complete";
    if (isMeasuring) return "active";
    if (fingerDetected) return "ready";
    if (sensorReady) return "initializing";
    return "initializing";
  };

  const getCardStatus = () => {
    if (measurementComplete) return "complete";
    if (isMeasuring) return "measuring";
    return "ready";
  };

  const handleBack = () => {
    if (measurementStep > 2) {
      stopAllTimers();
      setMeasurementStep(2);
      setIsMeasuring(false);
      setStatusMessage("✅ Pulse oximeter ready. Place finger to start automatic measurement...");
    } else {
      navigate(-1);
    }
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container max30102-page">
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>
        <button className="close-button" onClick={handleExit}>←</button>

        {/* Finger Removed Alert */}
        {showFingerRemovedAlert && (
          <div className="finger-removed-alert">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">Finger removed! Please reinsert to continue measurement.</span>
              <button
                className="alert-close"
                onClick={clearFingerRemovedAlert}
              >
                ×
              </button>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        <div className="w-100 mb-4">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${getProgressInfo('max30102', location.state?.checklist).percentage}%` }}></div>
          </div>
          <span className="measurement-progress-step">
            Step {getProgressInfo('max30102', location.state?.checklist).currentStep} of {getProgressInfo('max30102', location.state?.checklist).totalSteps} - Vital Signs
          </span>
        </div>

        {/* Header Section */}
        <div className="text-center mb-4">
          <h1 className="measurement-title">Pulse <span className="measurement-title-accent">Oximeter</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>

          {isMeasuring && (
            <div className="w-50 mx-auto mt-2">
              <div className="measurement-progress-bar">
                <div
                  className="measurement-progress-fill"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="measurement-progress-step text-center d-block">
                {Math.round(progressPercent)}% - {progressSeconds}/{totalMeasurementTime}s
                {countdown > 0 && ` (${countdown}s left)`}
              </span>
            </div>
          )}
        </div>

        <div className="w-100">

          {/* Finger Sensor Display */}
          <div className="d-flex justify-content-center mb-5">
            <div className={`finger-sensor ${getSensorState()}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">
                {fingerDetected ? "👆" : "👇"}
              </div>
              <div className="sensor-status-text">
                {getSensorState() === 'initializing' && 'Initializing...'}
                {getSensorState() === 'ready' && (fingerDetected ? 'Finger Detected - Ready' : 'Ready - Insert Finger')}
                {getSensorState() === 'active' && `Measuring... ${progressSeconds}s`}
                {getSensorState() === 'complete' && 'Complete'}
              </div>
            </div>
          </div>

          {/* Vital Signs Cards - Much Larger and Optimized Layout */}
          <div className="row g-4 justify-content-center mb-4">
            {/* Heart Rate Card */}
            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 ${getCardStatus() === 'measuring' ? 'active' : ''} ${getCardStatus() === 'complete' ? 'completed' : ''}`}>
                <div className="measurement-icon">
                  <img src={heartRateIcon} alt="Heart Rate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Heart Rate</h3>
                <p className="instruction-text text-center w-100">
                  BPM
                </p>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {measurements.heartRate}
                  </span>
                  <span className="measurement-unit">BPM</span>
                </div>
                <span className={`measurement-status-badge ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>

            {/* SpO2 Card */}
            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 ${getCardStatus() === 'measuring' ? 'active' : ''} ${getCardStatus() === 'complete' ? 'completed' : ''}`}>
                <div className="measurement-icon">
                  <img src={spo2Icon} alt="Blood Oxygen" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Blood Oxygen</h3>
                <p className="instruction-text text-center w-100">
                  SpO₂
                </p>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {measurements.spo2}
                  </span>
                  <span className="measurement-unit">%</span>
                </div>
                <span className={`measurement-status-badge ${getStatusColor('spo2', measurements.spo2)}`}>
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>

            {/* Respiratory Rate Card */}
            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 ${getCardStatus() === 'measuring' ? 'active' : ''} ${getCardStatus() === 'complete' ? 'completed' : ''}`}>
                <div className="measurement-icon">
                  <img src={respiratoryIcon} alt="Respiratory Rate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Respiratory Rate</h3>
                <p className="instruction-text text-center w-100">
                  Breaths per minute
                </p>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {measurements.respiratoryRate}
                  </span>
                  <span className="measurement-unit">/min</span>
                </div>
                <span className={`measurement-status-badge ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Instruction Steps */}
          <div className="w-100 mt-4">
            <div className="row g-3 justify-content-center">
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">1</div>
                  <div className="instruction-icon">👆</div>
                  <h4 className="instruction-title">Insert Finger</h4>
                  <p className="instruction-text">
                    Place your finger fully inside the pulse oximeter device
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon">✋</div>
                  <h4 className="instruction-title">Hold Steady</h4>
                  <p className="instruction-text">
                    Keep your finger completely still for accurate readings
                  </p>
                  {isMeasuring && countdown > 0 && (
                    <div className="text-danger fw-bold mt-2">
                      {countdown}s left
                    </div>
                  )}
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 3 ? (measurementStep > 3 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">3</div>
                  <div className="instruction-icon">⏱️</div>
                  <h4 className="instruction-title">Wait for Results</h4>
                  <p className="instruction-text">
                    {measurementComplete
                      ? "Measurement complete! Results are ready"
                      : "30-second automatic measurement"
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Button Section */}
        <div className="measurement-navigation mt-5">
          <button
            className="measurement-button"
            onClick={handleContinue}
            disabled={!measurementComplete}
          >
            {getButtonText()}
          </button>

          {isMeasuring && (
            <div className="mt-3 text-warning fw-bold">
              ⚠️ Important: Keep your finger completely still for accurate results
            </div>
          )}
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
    </div >
  );
}