import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./Max30102.css";
import "../main-components-measurement.css";
import heartRateIcon from "../../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../../assets/icons/respiratory-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";
import { isLocalDevice } from "../../../utils/network";
import { speak } from "../../../utils/speech";
import step3Icon from "../../../assets/icons/measurement-step3.png";
import step1Icon from "../../../assets/icons/max30102-step1.png";
import step2Icon from "../../../assets/icons/max30102-step2.png";
import oximeterImage from "../../../assets/icons/oximeter-3d.png";

// ============================================================================
// SIMPLE STATE MACHINE APPROACH - NO COMPLEX PAUSE/RESUME
// ============================================================================
const STATES = {
  INITIALIZING: 'INITIALIZING',
  WAITING_FOR_FINGER: 'WAITING_FOR_FINGER',
  MEASURING: 'MEASURING',
  COMPLETED: 'COMPLETED'
};

const MEASUREMENT_DURATION = 30; // seconds

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled, signalActivity } = useInactivity();

  // Block remote access
  useEffect(() => {
    if (!isLocalDevice()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // ========== SIMPLE STATE ==========
  const [state, setState] = useState(STATES.INITIALIZING);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing pulse oximeter...");
  const [fingerDetected, setFingerDetected] = useState(false); // Track finger detection
  const [isVisible, setIsVisible] = useState(false);

  // Live readings (displayed during measurement)
  const [liveReadings, setLiveReadings] = useState({
    heartRate: "--",
    spo2: "--",
    respiratoryRate: "--",
    pi: "--",
    signalQuality: "--"
  });

  // Final results (stored at completion)
  const [finalResults, setFinalResults] = useState({
    heartRate: null,
    spo2: null,
    respiratoryRate: null
  });

  const [showExitModal, setShowExitModal] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(1);

  // ========== REFS ==========
  const timerIntervalRef = useRef(null);
  const pollingIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const heartRateBuffer = useRef([]);
  const spo2Buffer = useRef([]);
  const respiratoryBuffer = useRef([]);

  // ========== INITIALIZATION ==========
  useEffect(() => {
    const init = async () => {
      setIsVisible(true);

      try {
        setStatusMessage("🔄 Powering up pulse oximeter...");
        const result = await sensorAPI.prepareMax30102();

        if (result.error || result.status === 'error') {
          setStatusMessage(`❌ ${result.error || result.message || 'Initialization failed'}`);
          return;
        }

        setStatusMessage("✅ Ready! Place your left index finger on the sensor");
        setState(STATES.WAITING_FOR_FINGER);
        setMeasurementStep(2);
        startPolling(); // Start checking for finger

      } catch (error) {
        console.error("Initialization error:", error);
        setStatusMessage("❌ Failed to initialize sensor");
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      stopAllIntervals();
      sensorAPI.shutdownMax30102().catch(e => console.error("Cleanup error:", e));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== TIMER MANAGEMENT ==========
  const startTimer = () => {
    console.log("⏱️ Starting 30-second timer");
    setSecondsElapsed(0);
    heartRateBuffer.current = [];
    spo2Buffer.current = [];
    respiratoryBuffer.current = [];

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    timerIntervalRef.current = setInterval(() => {
      setSecondsElapsed(prev => {
        const newValue = prev + 1;

        if (newValue >= MEASUREMENT_DURATION) {
          console.log("✅ Timer reached 30s - completing measurement");
          clearInterval(timerIntervalRef.current);
          timerIntervalRef.current = null;
          completeMeasurement();
          return MEASUREMENT_DURATION;
        }

        return newValue;
      });
    }, 1000);
  };

  const stopAllIntervals = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // ========== POLLING FOR FINGER & DATA ==========
  const startPolling = () => {
    if (pollingIntervalRef.current) return; // Already polling

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();

        // Always update finger detection status for visual feedback
        const isFingerNow = Boolean(data.finger_detected);
        setFingerDetected(isFingerNow);

        // If measurement is complete, stop polling
        if (state === STATES.COMPLETED) {
          stopAllIntervals();
          return;
        }

        // Waiting for finger
        if (state === STATES.WAITING_FOR_FINGER) {
          if (data.finger_detected && data.sensor_prepared) {
            console.log("👆 Finger detected - starting measurement");
            setStatusMessage("📊 Finger detected! Measuring...");
            setState(STATES.MEASURING);
            setMeasurementStep(3);
            startTimer();
          } else if (data.finger_detected) {
            setStatusMessage("👆 Finger detected - sensor preparing...");
          } else {
            setStatusMessage("✅ Ready! Place your left index finger on the sensor");
          }
          return;
        }

        // During measurement - collect data
        if (state === STATES.MEASURING) {
          signalActivity(); // Prevent inactivity timeout

          // API returns data directly, not nested in live_data
          const hr = data.heart_rate;
          const spo2Val = data.spo2;
          const rr = data.respiratory_rate;
          const pi = data.pi;
          const quality = data.signal_quality;

          console.log("📊 Live data received:", { hr, spo2Val, rr, pi, quality });

          // Update live display
          setLiveReadings({
            heartRate: hr && hr > 0 ? Math.round(hr).toString() : "--",
            spo2: spo2Val && spo2Val > 0 ? Math.round(spo2Val).toString() : "--",
            respiratoryRate: rr && rr > 0 ? Math.round(rr).toString() : "--",
            pi: pi ? parseFloat(pi).toFixed(2) : "--",
            signalQuality: quality || "--"
          });

          // Collect valid readings for averaging
          if (hr && hr >= 40 && hr <= 180) heartRateBuffer.current.push(hr);
          if (spo2Val && spo2Val >= 80 && spo2Val <= 104) spo2Buffer.current.push(spo2Val);
          if (rr && rr >= 5 && rr <= 60) respiratoryBuffer.current.push(rr);
        }

      } catch (error) {
        console.error("Polling error:", error);
      }
    }, 100); // UNIFORM 100ms polling (matches all sensors)
  };

  // ========== MEASUREMENT COMPLETION ==========
  const completeMeasurement = async () => {
    if (state === STATES.COMPLETED) return; // Already complete

    console.log("🏁 Completing measurement");
    setState(STATES.COMPLETED);
    setMeasurementStep(4);
    stopAllIntervals();

    // Calculate final results from collected buffers
    const avgHR = heartRateBuffer.current.length > 0
      ? Math.round(heartRateBuffer.current.reduce((a, b) => a + b, 0) / heartRateBuffer.current.length)
      : null;

    const avgSpO2 = spo2Buffer.current.length > 0
      ? Math.round(spo2Buffer.current.reduce((a, b) => a + b, 0) / spo2Buffer.current.length)
      : null;

    const avgRR = respiratoryBuffer.current.length > 0
      ? Math.round(respiratoryBuffer.current.reduce((a, b) => a + b, 0) / respiratoryBuffer.current.length)
      : null;

    setFinalResults({
      heartRate: avgHR,
      spo2: avgSpO2,
      respiratoryRate: avgRR
    });

    // Update display with final values
    setLiveReadings({
      heartRate: avgHR ? avgHR.toString() : "--",
      spo2: avgSpO2 ? avgSpO2.toString() : "--",
      respiratoryRate: avgRR ? avgRR.toString() : "--",
      pi: liveReadings.pi,
      signalQuality: liveReadings.signalQuality
    });

    setStatusMessage("✅ Measurement complete!");

    // Stop sensor
    try {
      await sensorAPI.stopMax30102();
      await sensorAPI.shutdownMax30102();
    } catch (error) {
      console.error("Shutdown error:", error);
    }

    // Auto-proceed after 2 seconds
    setTimeout(() => {
      if (isMountedRef.current) {
        handleContinue();
      }
    }, 2000);
  };

  // ========== NAVIGATION ==========
  const handleContinue = () => {
    if (state !== STATES.COMPLETED) return;

    stopAllIntervals();

    const vitalSignsData = {
      ...location.state,
      measurementTimestamp: new Date().toISOString()
    };

    if (finalResults.heartRate) vitalSignsData.heartRate = finalResults.heartRate;
    if (finalResults.spo2) vitalSignsData.spo2 = finalResults.spo2;
    if (finalResults.respiratoryRate) vitalSignsData.respiratoryRate = finalResults.respiratoryRate;

    console.log("📤 Navigating with data:", vitalSignsData);

    const nextPath = getNextStepPath('max30102', location.state?.checklist);
    navigate(nextPath, { state: vitalSignsData });
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = async () => {
    try {
      await sensorAPI.reset();
    } catch (e) {
      console.error("Reset error:", e);
    }
    setShowExitModal(false);
    navigate("/login");
  };

  // ========== VOICE INSTRUCTIONS ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      const isLast = isLastStep('max30102', location.state?.checklist);
      if (measurementStep === 2) {
        speak("Step 1. Insert Finger. Place your left index finger on the pulse oximeter.");
      } else if (measurementStep === 3) {
        speak("Step 2. Hold Steady. Keep your finger completely still for accurate readings.");
      } else if (measurementStep === 4) {
        if (isLast) {
          speak("Step 3. Results Ready. All measurements complete.");
        } else {
          speak("Step 3. Measurement Complete. Continue to next step.");
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [measurementStep, location.state?.checklist]);

  // ========== INACTIVITY MANAGEMENT ==========
  useEffect(() => {
    const shouldDisableInactivity = state === STATES.MEASURING || state === STATES.COMPLETED;
    setIsInactivityEnabled(!shouldDisableInactivity);
  }, [state, setIsInactivityEnabled]);

  // ========== UI HELPERS ==========
  const getProgress = () => {
    if (state !== STATES.MEASURING && state !== STATES.COMPLETED) return 0;
    return Math.min(100, Math.round((secondsElapsed / MEASUREMENT_DURATION) * 100));
  };

  const getRemainingTime = () => {
    if (state !== STATES.MEASURING && state !== STATES.COMPLETED) return 30;
    return Math.max(0, MEASUREMENT_DURATION - secondsElapsed);
  };

  const getButtonText = () => {
    if (state === STATES.COMPLETED) return "Continue";
    if (state === STATES.MEASURING) return `Measuring... ${getRemainingTime()}s remaining`;
    if (state === STATES.WAITING_FOR_FINGER) return "Waiting for Finger Detection...";
    return "Initializing...";
  };

  const getStatusColor = (type, value) => {
    if (value === '--') return "pending";
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
    if (value === '--') return "Pending";
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

  const getSensorState = () => {
    if (state === STATES.COMPLETED) return "complete";
    if (state === STATES.MEASURING) return "active";
    if (state === STATES.WAITING_FOR_FINGER) return "ready";
    return "initializing";
  };

  // ========== RENDER ==========
  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container max30102-page">
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>

        {/* Progress bar */}
        <div className="w-100 mb-4">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${getProgressInfo('max30102', location.state?.checklist).percentage}%` }}></div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2 px-1">
            <button className="measurement-back-arrow" onClick={handleExit}>←</button>
            <span className="measurement-progress-step mb-0">
              Step {getProgressInfo('max30102', location.state?.checklist).currentStep} of {getProgressInfo('max30102', location.state?.checklist).totalSteps} - Pulse Oximeter
            </span>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-4">
          <h1 className="measurement-title">Pulse <span className="measurement-title-accent">Oximeter</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>

          {state === STATES.MEASURING && (
            <div className="w-50 mx-auto mt-2">
              <div className="measurement-progress-bar">
                <div className="measurement-progress-fill" style={{ width: `${getProgress()}%` }}></div>
              </div>
              <span className="measurement-progress-step text-center d-block">
                {getProgress()}% - {getRemainingTime()}s remaining
              </span>
            </div>
          )}
        </div>

        <div className="w-100">
          {/* Oximeter Display */}
          <div className="d-flex justify-content-center mb-4">
            <div className={`oximeter-display ${getSensorState()}`}>
              <img src={oximeterImage} alt="Pulse Oximeter" className="oximeter-image" />
            </div>
          </div>

          {/* Vital Signs Cards */}
          <div className="row g-4 justify-content-center mb-4">
            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 status-${getStatusColor('heartRate', liveReadings.heartRate)}`}>
                <div className="measurement-icon">
                  <img src={heartRateIcon} alt="Heart Rate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Heart Rate</h3>
                <p className="instruction-text text-center w-100">BPM</p>
                <div className="measurement-value-container">
                  <span className="measurement-value">{liveReadings.heartRate}</span>
                  <span className="measurement-unit">BPM</span>
                </div>
                <span className={`measurement-status-badge ${getStatusColor('heartRate', liveReadings.heartRate)}`}>
                  {getStatusText('heartRate', liveReadings.heartRate)}
                </span>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 status-${getStatusColor('spo2', liveReadings.spo2)}`}>
                <div className="measurement-icon">
                  <img src={spo2Icon} alt="Blood Oxygen" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Blood Oxygen</h3>
                <p className="instruction-text text-center w-100">SpO₂</p>
                <div className="measurement-value-container">
                  <span className="measurement-value">{liveReadings.spo2}</span>
                  <span className="measurement-unit">%</span>
                </div>
                <span className={`measurement-status-badge ${getStatusColor('spo2', liveReadings.spo2)}`}>
                  {getStatusText('spo2', liveReadings.spo2)}
                </span>
              </div>
            </div>

            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 status-${getStatusColor('respiratoryRate', liveReadings.respiratoryRate)}`}>
                <div className="measurement-icon">
                  <img src={respiratoryIcon} alt="Respiratory Rate" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Respiratory Rate</h3>
                <p className="instruction-text text-center w-100">Breaths per minute</p>
                <div className="measurement-value-container">
                  <span className="measurement-value">{liveReadings.respiratoryRate}</span>
                  <span className="measurement-unit">/min</span>
                </div>
                <span className={`measurement-status-badge ${getStatusColor('respiratoryRate', liveReadings.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', liveReadings.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>

          {/* PI Indicator */}
          <div className="row justify-content-center mb-3">
            <div className="col-auto">
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 16px',
                background: 'rgba(156, 39, 176, 0.1)',
                borderRadius: '20px',
                fontSize: '0.9rem'
              }}>
                <span style={{ color: '#666' }}>PI:</span>
                <span style={{ fontWeight: '600', color: '#9c27b0' }}>
                  {liveReadings.pi}%
                </span>
                <span style={{
                  background: liveReadings.signalQuality === 'EXCELLENT' ? '#4caf50' :
                    liveReadings.signalQuality === 'GOOD' ? '#8bc34a' :
                      liveReadings.signalQuality === 'FAIR' ? '#ff9800' :
                        liveReadings.signalQuality === 'WEAK' ? '#ff5722' : '#9e9e9e',
                  color: 'white',
                  padding: '2px 8px',
                  borderRadius: '10px',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {liveReadings.signalQuality !== '--' ? liveReadings.signalQuality : '...'}
                </span>
              </div>
            </div>
          </div>

          {/* Instruction Steps */}
          <div className="w-100 mt-4">
            <div className="row g-3 justify-content-center">
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">1</div>
                  <div className="instruction-icon">
                    <img src={step1Icon} alt="Insert Finger" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">Left Index Finger</h4>
                  <p className="instruction-text">Place your left index finger on the pulse oximeter</p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 3 ? (measurementStep > 3 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon">
                    <img src={step2Icon} alt="Hold Steady" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">Hold Steady</h4>
                  <p className="instruction-text">Keep your finger completely still for accurate readings</p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 4 ? 'completed' : ''}`}>
                  <div className="instruction-step-number">3</div>
                  <div className="instruction-icon">
                    <img src={step3Icon} alt="Complete" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">
                    {isLastStep('max30102', location.state?.checklist) ? 'Results Ready' : 'Complete'}
                  </h4>
                  <p className="instruction-text">
                    {isLastStep('max30102', location.state?.checklist)
                      ? "All measurements complete!"
                      : "Continue to next measurement"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="measurement-navigation mt-5">
          <button
            className="measurement-button"
            onClick={handleContinue}
            disabled={state !== STATES.COMPLETED}
          >
            {getButtonText()}
          </button>
        </div>
      </div>

      {/* Exit Modal */}
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
              <button className="exit-modal-button secondary" onClick={() => setShowExitModal(false)}>
                Cancel
              </button>
              <button className="exit-modal-button primary" onClick={confirmExit}>
                Yes, Exit
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}