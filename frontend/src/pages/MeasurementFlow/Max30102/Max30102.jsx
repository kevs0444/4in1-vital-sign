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
import { speak, stopSpeaking, SPEECH_MESSAGES } from "../../../utils/speech";
import step3Icon from "../../../assets/icons/measurement-step3.png";
import step1Icon from "../../../assets/icons/max30102-step1.png";
import step2Icon from "../../../assets/icons/max30102-step2.png";
import oximeterImage from "../../../assets/icons/oximeter-3d.png";
import { getHeartRateStatus, getSPO2Status, getRespiratoryStatus } from "../../../utils/healthStatus";

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
  const [secondsRemaining, setSecondsRemaining] = useState(MEASUREMENT_DURATION); // Countdown for measurement
  const [autoContinueCountdown, setAutoContinueCountdown] = useState(null); // Countdown for auto-continue
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
  const measurementCompleteRef = useRef(false); // Instantly blocks finger-removed after completion
  const noFingerCounterRef = useRef(0); // Debounce counter for finger removal

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
      measurementCompleteRef.current = false; // Reset for fresh measurement
      try {
        setStatusMessage("🔄 Powering up pulse oximeter...");
        const result = await sensorAPI.prepareMax30102();

        if (result.error || result.status === 'error') {
          console.warn(`⚠️ Prepare Warning: ${result.error || result.message}. Proceeding to check status...`);
          // Do NOT return. Proceed to polling, as backend might be active despite timeout.
        }

        setStatusMessage("✅ Ready! Place your left index finger on the sensor");
        setStep(2); // Move to Waiting for Finger
        startPolling();

      } catch (error) {
        console.error("Init Error (Ignored):", error);
        // Proceed anyway - the polling loop is the real truth
        setStep(2);
        startPolling();
      }
    };

    init();

    return () => {
      isMountedRef.current = false;
      stopPolling();
      stopTimer();
      stopSpeaking(); // <--- ADDED: Stop speech on exit
      sensorAPI.shutdownMax30102().catch(e => console.error("Cleanup error:", e));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== POLLING LOOP (CORE LOGIC) ==========
  const startPolling = () => {
    if (pollingIntervalRef.current) return;

    pollingIntervalRef.current = setInterval(async () => {
      const currentStep = stepRef.current;

      // 🛡️ CRITICAL: If complete, IGNORE EVERYTHING.
      // This ensures "finger pop out" after 30s doesn't trigger a reset.
      if (currentStep === 4 || measurementCompleteRef.current) return;

      try {
        const response = await sensorAPI.getMax30102Status();

        // DEBUG LOGGING - Essential for debugging "Why is it not reacting?"
        console.log("Max30102 Poll:", response);

        // 🛡️ GUARD: Check for actual API error (not live_data.status)
        // The flattened response includes 'status' from live_data which can be 'idle'/'measuring'/etc.
        // API errors come as response.error or when response is null/undefined OR status === 'error'
        if (!response || response.error || response.status === 'error') {
          console.warn("⚠️ API Error/Timeout - Skipping Poll:", response?.message || response?.error || "Unknown error");
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

        // DEBUG: Trace exact reason for decision
        console.log(`🔍 Finger Logic: Backend=${response.finger_detected}, LiveData=${data.finger_detected} => FINAL=${isFinger}`);

        if (isFinger) {
          console.log("👉 Finger Detected (IsFinger=True). Step:", currentStep);
        }

        setFingerDetected(isFinger);

        // --- UNIFIED STATE LOGIC ---
        const hasData = hr > 0;

        // COMBINED RULE: If Finger Detected (Backend Flag) -> MEASURING
        if (isFinger) { // Strict Backend Logic: Only start if Backend says "Finger Detected"
          // ALWAYS dismiss the interrupted modal when finger is detected
          setShowInterruptedModal(false);

          if (currentStep !== 3) {
            console.log("🚀 Backend Finger Detected -> Starting Measurement");
            setStep(3);
            startTimer();
            setStatusMessage("📊 Measuring...");
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

          // Reset counter if finger is detected
          noFingerCounterRef.current = 0;

        } else if (currentStep === 3 && !isFinger && !measurementCompleteRef.current) {
          // DELAYED: Require 0.5 SECONDS (10 polls @ 50ms) of "no finger" before triggering reset
          // Faster response while still preventing instant glitches
          noFingerCounterRef.current++;

          console.log(`⚠️ No Finger Count: ${noFingerCounterRef.current}/10`);

          if (noFingerCounterRef.current >= 10) {
            console.log("✋ Backend Finger Removed (0.5s confirmed) -> Resetting UI");
            setStatusMessage("✋ Finger removed! Resetting...");

            // Trigger Feedback
            speak(SPEECH_MESSAGES.MAX30102.FINGER_REMOVED);
            setShowInterruptedModal(true);

            setStep(2);
            resetMeasurementState();
            noFingerCounterRef.current = 0;
          }
        } else {
          // Waiting phase (step 2) or any other case - DO NOT signal activity
          // This allows inactivity timer to count down if user is just staring at 'Waiting for Finger'
        }
        // NOTE: When step === 4 (complete), we ignore finger removed events

      } catch (err) {
        console.error("Poll Error:", err);
      }
    }, 50); // FAST: 50ms polling (was 100ms)
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
          stopSpeaking(); // Silence any measuring prompts

          // 🛡️ SUPER LOCK: Set ref immediately to block any parallel polling
          measurementCompleteRef.current = true;
          stepRef.current = 4;

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
    measurementCompleteRef.current = false; // ALLOW new events

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

    // Re-prepare not needed - sensor stays active
    // try {
    //   await sensorAPI.prepareMax30102();
    // } catch (e) { console.error("Retry reset error:", e); }
  };

  // ========== COMPLETION ==========
  const completeMeasurement = async () => {
    // 🛡️ LOCK STATE IMMEDIATELY
    measurementCompleteRef.current = true;
    setStep(4);
    stopPolling(); // Stop data collection immediately
    stopTimer();   // Ensure timer is dead
    stopSpeaking(); // Ensure silence before final announcement

    console.log("🏁 Completion Triggered - SENSOR LOCKED");
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

    // Start Auto-Continue Timer
    setAutoContinueCountdown(5);
  };

  // ========== NAVIGATION ==========
  const handleContinue = (hr, spo2, rr) => {
    stopSpeaking(); // Ensure we stop talking before leaving
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

  // Auto-Continue Logic
  useEffect(() => {
    if (autoContinueCountdown !== null && autoContinueCountdown > 0) {
      const timer = setTimeout(() => setAutoContinueCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (autoContinueCountdown === 0) {
      // Auto-continue when countdown hits 0
      handleContinue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoContinueCountdown]);


  const handleExit = () => setShowExitModal(true);
  const confirmExit = async () => {
    stopSpeaking();
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
    if (value === '--' || value === 'N/A') return "pending";

    let status = null;
    if (type === "heartRate") status = getHeartRateStatus(value);
    else if (type === "spo2") status = getSPO2Status(value);
    else if (type === "respiratoryRate") status = getRespiratoryStatus(value);

    if (!status) return "pending";

    // Map Utility Labels to Component Classes
    // Critical -> error
    // Elevated/Slight Fever -> warning
    // Low -> pending (Blue, as per previous design) OR warning. 
    //        Previous design used 'pending' for Low HR/RR. I will maintain this.
    //        SpO2 Low (90-94) is 'Warning' in utility (Yellow/Orange), previously 'warning'.

    if (status.label === "Critical" || status.label === "Hypertensive Crisis") return "error";
    if (status.label === "Elevated" || status.label === "Slight fever" || status.label === "Hypertension Stage 1" || status.label === "Hypertension Stage 2") return "warning";

    // SpO2 Low is 'Low' label but previously mapped to warning
    if (type === "spo2" && status.label === "Low") return "warning";

    if (status.label === "Low" || status.label === "Hypotension" || status.label === "Underweight") return "pending"; // Blueish

    if (status.label === "Normal") return "complete";

    return "complete";
  };

  const getStatusText = (type, value) => {
    if (value === '--' || value === 'N/A') return "Pending";

    let status = null;
    if (type === "heartRate") status = getHeartRateStatus(value);
    else if (type === "spo2") status = getSPO2Status(value);
    else if (type === "respiratoryRate") status = getRespiratoryStatus(value);

    return status ? status.label : "Normal";
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
      if (step === 1) {
        speak("Pulse Oximeter.");
      } else if (step === 2) {
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

  const getButtonText = () => {
    if (step === 4) {
      return autoContinueCountdown !== null && autoContinueCountdown > 0
        ? `Continue (${autoContinueCountdown})`
        : "Continue";
    }
    if (step === 3) return "Measuring...";
    if (step === 2) return "Waiting for Finger...";
    return "Initializing...";
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
            <div className="exit-modal-icon"><span>🚪</span></div>
            <h2 className="exit-modal-title">Exit Measurement?</h2>
            <p className="exit-modal-message">Do you want to go back to login and cancel the measurement?</p>
            <div className="exit-modal-buttons">
              <button className="exit-modal-button secondary" onClick={() => { setShowExitModal(false); setAutoContinueCountdown(5); }}>Cancel</button>
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
              <button className="exit-modal-button primary" onClick={() => {
                resetMeasurementState();
                setShowInterruptedModal(false);
              }}>Okay, Retry</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}