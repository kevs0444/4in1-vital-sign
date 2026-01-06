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
import { speak, SPEECH_MESSAGES } from "../../../utils/speech";
import step3Icon from "../../../assets/icons/measurement-step3.png";
import step1Icon from "../../../assets/icons/max30102-step1.png";
import step2Icon from "../../../assets/icons/max30102-step2.png";
import oximeterImage from "../../../assets/icons/oximeter-3d.png";

// ============================================================================
// LOGIC: UNIFIED "FINGER INSERTED -> START"
// ============================================================================
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

  // ========== STATE ==========
  // 1: Initializing
  // 2: Waiting for Finger
  // 3: Measuring
  // 4: Completed
  const [step, setStep] = useState(1);
  const [statusMessage, setStatusMessage] = useState("Initializing pulse oximeter...");
  const [secondsRemaining, setSecondsRemaining] = useState(MEASUREMENT_DURATION); // Countdown
  const [isVisible, setIsVisible] = useState(false);
  const [fingerDetected, setFingerDetected] = useState(false);

  // Live readings
  const [liveReadings, setLiveReadings] = useState({
    heartRate: "--",
    spo2: "--",
    respiratoryRate: "--",
    pi: "--",
    signalQuality: "--"
  });

  // Final results
  const [finalResults, setFinalResults] = useState({
    heartRate: null,
    spo2: null,
    respiratoryRate: null
  });

  const [showExitModal, setShowExitModal] = useState(false);
  const [showInterruptedModal, setShowInterruptedModal] = useState(false);

  // ========== REFS ==========
  const pollingIntervalRef = useRef(null);
  const timerIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const stepRef = useRef(step); // Track latest step for interval

  useEffect(() => {
    stepRef.current = step;
  }, [step]);

  // Data buffers
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
        setStep(2); // Move to Waiting for Finger
        startPolling();

      } catch (error) {
        console.error("Init Error:", error);
        setStatusMessage("❌ Failed to initialize sensor");
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      stopPolling();
      stopTimer();
      sensorAPI.shutdownMax30102().catch(e => console.error("Cleanup error:", e));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== POLLING LOOP (CORE LOGIC) ==========
  const startPolling = () => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(async () => {
      const currentStep = stepRef.current;
      if (currentStep === 4) return; // Stop polling if complete

      try {
        const response = await sensorAPI.getMax30102Status();

        // DEBUG LOGGING - Essential for debugging "Why is it not reacting?"
        console.log("Max30102 Poll:", response);

        // 🛡️ GUARD: Only return if response is completely invalid or represents an API error
        // api.js returns { status: 'error', ... } on failure, which must be caught here.
        if (!response || response.error || response.status === 'error') {
          console.warn("⚠️ Valid packet dropped (Guard Clause Hit)");
          return;
        }

        // Backend flattens live_data to top-level, so check both structures
        const data = response.live_data || response;

        const hr = data.heart_rate;
        const spo2 = data.spo2;
        const rr = data.respiratory_rate;
        const pi = data.pi;
        const quality = data.signal_quality;

        // CHECK BOTH TOP-LEVEL AND NESTED FLAGS
        // The top-level flag comes from the Manager's boolean state, which is set immediately on "FINGER_DETECTED".
        // We trust this flag even if 'data' is empty.
        const isFinger = response.finger_detected === true || data.finger_detected === true;

        if (isFinger) {
          console.log("👉 Finger Detected (IsFinger=True). Step:", currentStep);
        }

        setFingerDetected(isFinger);

        // --- UNIFIED STATE LOGIC ---
        const hasData = hr > 0;

        // COMBINED RULE: If Finger Detected (Backend Flag) -> MEASURING
        if (isFinger) { // Strict Backend Logic: Only start if Backend says "Finger Detected"
          if (currentStep !== 3) {
            console.log("🚀 Backend Finger Detected -> Starting Measurement");
            setStep(3);
            startTimer();
            setStatusMessage("📊 Measuring...");
            setShowInterruptedModal(false); // Auto-dismiss error modal
          }

          // Debug what we are receiving
          console.log(`📡 Max30102 Data: HR=${hr}, SpO2=${spo2}, RR=${rr}`);

          // Relaxed 'hasData': If we are measuring (isFinger=true), we show whatever data we have
          // This ensures we don't show "--" if values are present but 0
          const hasData = true;

          // Update Display
          setLiveReadings({
            heartRate: (hr !== undefined && hr !== null) ? Math.round(hr).toString() : "--",
            spo2: (spo2 > 0) ? Math.round(spo2).toString() : "--", // SpO2 often starts at 0, keep as is
            respiratoryRate: (rr > 0) ? Math.round(rr).toString() : "--",
            pi: pi ? parseFloat(pi).toFixed(2) : "--",
            signalQuality: quality || "--"
          });

          // Buffer Data
          if (hr >= 40 && hr <= 180) heartRateBuffer.current.push(hr);
          if (spo2 >= 80 && spo2 <= 104) spo2Buffer.current.push(spo2);
          if (rr >= 5 && rr <= 60) respiratoryBuffer.current.push(rr);

          signalActivity();

          // Buffer Data
          if (hr >= 40 && hr <= 180) heartRateBuffer.current.push(hr);
          if (spo2 >= 80 && spo2 <= 104) spo2Buffer.current.push(spo2);
          if (rr >= 5 && rr <= 60) respiratoryBuffer.current.push(rr);

          signalActivity();

        } else if (currentStep === 3 && !isFinger) {
          // Rule: Backend says "Finger Removed" -> IMMEDIATE Reset
          console.log("✋ Backend Finger Removed -> Resetting Immediately");
          setStatusMessage("✋ Finger removed! Resetting...");

          // Trigger Feedback
          speak(SPEECH_MESSAGES.MAX30102.FINGER_REMOVED);
          setShowInterruptedModal(true);

          setStep(2);
          resetMeasurementState();
        }

      } catch (err) {
        console.error("Poll Error:", err);
      }
    }, 100);
  };

  const stopPolling = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  };

  // ========== TIMER LOGIC ==========
  const startTimer = () => {
    if (timerIntervalRef.current) return;

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        const next = prev - 1;
        if (next <= 0) {
          stopTimer(); // Stop counting
          stopPolling(); // Stop data collection
          completeMeasurement(); // Finish
          return 0;
        }
        return next;
      });
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
  };

  const resetMeasurementState = async () => {
    stopTimer();
    setSecondsRemaining(MEASUREMENT_DURATION);
    heartRateBuffer.current = [];
    spo2Buffer.current = [];
    respiratoryBuffer.current = [];
    setLiveReadings({
      heartRate: "--",
      spo2: "--",
      respiratoryRate: "--",
      pi: "--",
      signalQuality: "--"
    });

    // Remove backend reset to keep sensor active for re-insertion
    // The backend manager auto-clears data on FINGER_REMOVED event anyway.
  };

  // ========== COMPLETION ==========
  const completeMeasurement = async () => {
    console.log("🏁 Completion Triggered");
    setStep(4);
    setStatusMessage("✅ Measurement complete!");

    const avgHR = heartRateBuffer.current.length > 0
      ? Math.round(heartRateBuffer.current.reduce((a, b) => a + b, 0) / heartRateBuffer.current.length)
      : (parseInt(liveReadings.heartRate) || null);

    const avgSpO2 = spo2Buffer.current.length > 0
      ? Math.round(spo2Buffer.current.reduce((a, b) => a + b, 0) / spo2Buffer.current.length)
      : (parseInt(liveReadings.spo2) || null);

    const avgRR = respiratoryBuffer.current.length > 0
      ? Math.round(respiratoryBuffer.current.reduce((a, b) => a + b, 0) / respiratoryBuffer.current.length)
      : (parseInt(liveReadings.respiratoryRate) || null);

    setFinalResults({ heartRate: avgHR, spo2: avgSpO2, respiratoryRate: avgRR });

    setLiveReadings(prev => ({
      ...prev,
      heartRate: avgHR ? avgHR.toString() : "--",
      spo2: avgSpO2 ? avgSpO2.toString() : "--",
      respiratoryRate: avgRR ? avgRR.toString() : "--"
    }));

    try {
      await sensorAPI.shutdownMax30102();
    } catch (e) { console.error(e); }

    setTimeout(() => {
      if (isMountedRef.current) handleContinue(avgHR, avgSpO2, avgRR);
    }, 2000);
  };

  // ========== NAVIGATION ==========
  const handleContinue = (hr, spo2, rr) => {
    const results = {
      heartRate: hr || finalResults.heartRate,
      spo2: spo2 || finalResults.spo2,
      respiratoryRate: rr || finalResults.respiratoryRate
    };

    const vitalSignsData = {
      ...location.state,
      measurementTimestamp: new Date().toISOString(),
      ...results
    };

    console.log("📤 Saving:", vitalSignsData);
    const nextPath = getNextStepPath('max30102', location.state?.checklist);
    navigate(nextPath, { state: vitalSignsData });
  };

  const handleExit = () => setShowExitModal(true);
  const confirmExit = async () => {
    try { await sensorAPI.reset(); } catch (e) { }
    setShowExitModal(false);
    navigate("/login");
  };

  // ========== UI HELPERS ==========
  const getProgress = () => {
    return Math.min(100, Math.round(((MEASUREMENT_DURATION - secondsRemaining) / MEASUREMENT_DURATION) * 100));
  };

  const getRemainingTime = () => secondsRemaining;

  const getStatusColor = (type, value) => {
    if (value === '--') return "pending";
    const num = parseInt(value);
    switch (type) {
      case "heartRate": return (num < 60) ? "warning" : (num > 100 ? "error" : "complete");
      case "spo2": return (num < 95) ? "warning" : "complete";
      case "respiratoryRate": return (num < 12) ? "warning" : (num > 20 ? "error" : "complete");
      default: return "complete";
    }
  };

  const getStatusText = (type, value) => {
    if (value === '--') return "Pending";
    const num = parseInt(value);
    switch (type) {
      case "heartRate": return (num < 60) ? "Low" : (num > 100 ? "High" : "Normal");
      case "spo2": return (num < 95) ? "Low" : "Normal";
      case "respiratoryRate": return (num < 12) ? "Low" : (num > 20 ? "High" : "Normal");
      default: return "Normal";
    }
  };

  const getSensorState = () => {
    if (step === 4) return "complete";
    if (step === 3) return "active";
    if (step === 2) return "ready";
    return "initializing";
  };

  // ========== VOICE INSTRUCTIONS ==========
  useEffect(() => {
    const timer = setTimeout(() => {
      const isLast = isLastStep('max30102', location.state?.checklist);
      if (step === 2) {
        speak(SPEECH_MESSAGES.MAX30102.INSERT_FINGER);
      } else if (step === 3 && secondsRemaining === MEASUREMENT_DURATION) {
        speak(SPEECH_MESSAGES.MAX30102.HOLD_STEADY);
      } else if (step === 4) {
        if (isLast) speak(SPEECH_MESSAGES.MAX30102.RESULTS_READY);
        else speak(SPEECH_MESSAGES.MAX30102.COMPLETE);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [step, secondsRemaining, location.state?.checklist]);

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

          {step === 3 && (
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
                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 16px',
                background: 'rgba(156, 39, 176, 0.1)', borderRadius: '20px', fontSize: '0.9rem'
              }}>
                <span style={{ color: '#666' }}>PI:</span>
                <span style={{ fontWeight: '600', color: '#9c27b0' }}>{liveReadings.pi}%</span>
                <span style={{
                  background: liveReadings.signalQuality === 'EXCELLENT' ? '#4caf50' :
                    liveReadings.signalQuality === 'GOOD' ? '#8bc34a' :
                      liveReadings.signalQuality === 'FAIR' ? '#ff9800' :
                        liveReadings.signalQuality === 'WEAK' ? '#ff5722' : '#9e9e9e',
                  color: 'white', padding: '2px 8px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: '500'
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
                <div className={`instruction-card h-100 ${step >= 2 ? (step > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">1</div>
                  <div className="instruction-icon"><img src={step1Icon} alt="Insert Finger" className="step-icon-image" /></div>
                  <h4 className="instruction-title">Left Index Finger</h4>
                  <p className="instruction-text">Place your left index finger on the pulse oximeter</p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${step >= 3 ? (step > 3 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon"><img src={step2Icon} alt="Hold Steady" className="step-icon-image" /></div>
                  <h4 className="instruction-title">Hold Steady</h4>
                  <p className="instruction-text">Keep your finger completely still for accurate readings</p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${step >= 4 ? 'completed' : ''}`}>
                  <div className="instruction-step-number">3</div>
                  <div className="instruction-icon"><img src={step3Icon} alt="Complete" className="step-icon-image" /></div>
                  <h4 className="instruction-title">
                    {isLastStep('max30102', location.state?.checklist) ? 'Results Ready' : 'Complete'}
                  </h4>
                  <p className="instruction-text">
                    {isLastStep('max30102', location.state?.checklist) ? "All measurements complete!" : "Continue to next measurement"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="measurement-navigation mt-5">
          <button className="measurement-button" onClick={() => handleContinue()} disabled={step !== 4}>
            {step === 4 ? "Continue" : (step === 3 ? "Measuring..." : (step === 2 ? "Waiting for Finger..." : "Initializing..."))}
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
            <div className="exit-modal-icon"><span>🚪</span></div>
            <h2 className="exit-modal-title">Exit Measurement?</h2>
            <p className="exit-modal-message">Do you want to go back to login and cancel the measurement?</p>
            <div className="exit-modal-buttons">
              <button className="exit-modal-button secondary" onClick={() => setShowExitModal(false)}>Cancel</button>
              <button className="exit-modal-button primary" onClick={confirmExit}>Yes, Exit</button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Interrupted Modal */}
      {showInterruptedModal && (
        <div className="exit-modal-overlay" onClick={() => setShowInterruptedModal(false)}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-modal-icon" style={{ background: '#ffebee', color: '#f44336' }}><span>✋</span></div>
            <h2 className="exit-modal-title">Finger Removed</h2>
            <p className="exit-modal-message">The measurement was interrupted. Please place your finger back on the sensor to restart.</p>
            <div className="exit-modal-buttons">
              <button className="exit-modal-button primary" onClick={() => setShowInterruptedModal(false)}>Okay, Retry</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}