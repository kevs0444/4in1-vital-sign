import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./BMI.css";
import "../main-components-measurement.css";
import weightIcon from "../../../assets/icons/weight-icon.png";
import heightIcon from "../../../assets/icons/height-icon.png";
import completedIcon from "../../../assets/icons/measurement-step3.png";
import bmiJuanWeight from "../../../assets/icons/bmi-juan-weight.png";
import bmiJuanHeight from "../../../assets/icons/bmi-juan-height.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo } from "../../../utils/checklistNavigation";
import { speak } from "../../../utils/speech";
import { isLocalDevice } from "../../../utils/network";
import { getBMICategory as getBMICategoryUtil } from "../../../utils/healthStatus";

// ============================================================
// BMI Measurement Component - V2 with Dynamic UI
// ============================================================

const PHASE = {
  IDLE: 'idle',
  CALIBRATING: 'calibrating',
  WEIGHT: 'weight',
  WEIGHT_COMPLETE: 'weight_complete',
  HEIGHT: 'height',
  COMPLETE: 'complete'
};

const WEIGHT_DURATION_MS = 2000;
const HEIGHT_DURATION_MS = 2000;
const TRANSITION_DELAY_MS = 1000;
const POLL_INTERVAL_MS = 100; // UNIFORM 100ms polling (matches all sensors)

const WEIGHT_TOLERANCE = 0.5;
const HEIGHT_TOLERANCE = 2.0;
const MIN_VALID_WEIGHT = 5.0;
const MIN_VALID_HEIGHT = 61; // Approx 2ft (User Request)
const MAX_RETRIES = 3;

export default function BMI() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled } = useInactivity();

  useEffect(() => {
    if (!isLocalDevice()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  // ============================================================
  // STATE
  // ============================================================
  const [currentPhase, setCurrentPhase] = useState(PHASE.CALIBRATING);
  const [savedWeight, setSavedWeight] = useState(null);
  const [savedHeight, setSavedHeight] = useState(null);
  const [liveWeight, setLiveWeight] = useState(null);
  const [liveHeight, setLiveHeight] = useState(null);

  const [statusMessage, setStatusMessage] = useState("System preparing...");
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showUnstableModal, setShowUnstableModal] = useState(false);
  const [unstableMsg, setUnstableMsg] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Countdown State
  const [countdown, setCountdown] = useState(null);

  const isMountedRef = useRef(true);
  const isInitializedRef = useRef(false); // Prevent double-init
  const isStartingWeightRef = useRef(false); // Guard against overlapping weight start
  const isStartingHeightRef = useRef(false); // Guard against overlapping height start
  const savedWeightRef = useRef(null);
  const savedHeightRef = useRef(null);

  // Stability tracking
  const stableStartTimeRef = useRef(null);
  const lastStableValueRef = useRef(null);

  // Sync refs for async access
  useEffect(() => { savedWeightRef.current = savedWeight; }, [savedWeight]);
  useEffect(() => { savedHeightRef.current = savedHeight; }, [savedHeight]);

  // Helper
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // ============================================================
  // STABILITY CHECK LOGIC
  // ============================================================


  // Reset stability when phase changes
  useEffect(() => {
    stableStartTimeRef.current = null;
    lastStableValueRef.current = null;
    setProgress(0);
    setElapsedSeconds(0);
  }, [currentPhase]);

  // ============================================================
  // ACTIONS (Start/Stop Steps)
  // ============================================================

  const startWeightMeasurement = useCallback(async () => {
    // GUARD: Prevent overlapping calls
    if (isStartingWeightRef.current) {
      console.log("⚠️ startWeightMeasurement already in progress, skipping.");
      return;
    }
    if (savedWeightRef.current) return;

    isStartingWeightRef.current = true;

    try {
      const res = await sensorAPI.startWeight();
      if (res.error) {
        if (retryCount < MAX_RETRIES) {
          setRetryCount(c => c + 1);
          isStartingWeightRef.current = false; // Reset for retry
          await sleep(1000);
          startWeightMeasurement();
          return;
        }
        console.warn("⚠️ Start Weight API failed/timed out. Proceeding to poll status...");
      }
      // Success -> Enter Phase
      setRetryCount(0);
      setCurrentPhase(PHASE.WEIGHT);
      setStatusMessage("Step on the scale and stand still...");
    } catch (e) {
      console.error("Start weight exception:", e);
    } finally {
      isStartingWeightRef.current = false;
    }
  }, [retryCount]);

  const startHeightMeasurement = useCallback(async () => {
    // GUARD: Prevent overlapping calls
    if (isStartingHeightRef.current) {
      console.log("⚠️ startHeightMeasurement already in progress, skipping.");
      return;
    }
    if (!savedWeightRef.current) return;
    if (savedHeightRef.current) return;

    isStartingHeightRef.current = true;

    try {
      const res = await sensorAPI.startHeight();
      if (res.error) {
        if (retryCount < MAX_RETRIES) {
          setRetryCount(c => c + 1);
          isStartingHeightRef.current = false; // Reset for retry
          await sleep(1000);
          startHeightMeasurement();
          return;
        }
        console.warn("⚠️ Start Height API failed/timed out. Proceeding to poll status...");
      }
      setRetryCount(0);
      setCurrentPhase(PHASE.HEIGHT);
      setStatusMessage("Initializing height sensor...");
    } catch (e) {
      console.error("Start height exception:", e);
    } finally {
      isStartingHeightRef.current = false;
    }
  }, [retryCount]);

  // ============================================================
  // POLLING LOGIC
  // ============================================================

  // ============================================================
  // POLLING LOGIC - FIXED TIME AVERAGING
  // ============================================================

  const weightReadingsRef = useRef([]);
  const heightReadingsRef = useRef([]);

  /* Recursive Poller Logic is now handled by runPoller */

  // Refs for change detection
  const lastLiveWeightRef = useRef(null);
  const lastLiveHeightRef = useRef(null);

  // Sync ref for unstable modal
  const showUnstableModalRef = useRef(false);
  useEffect(() => { showUnstableModalRef.current = showUnstableModal; }, [showUnstableModal]);

  const triggerInstabilityWarning = (msg, isVoice = true) => {
    // LOCK: Don't trigger if already showing (checked via Ref for immediate feedback)
    if (showUnstableModalRef.current) return;

    setUnstableMsg(msg);
    setShowUnstableModal(true); // Triggers re-render

    if (isVoice) {
      speak(msg);
    }

    // Reset readings to force restart of measurement
    weightReadingsRef.current = [];
    heightReadingsRef.current = [];
    setElapsedSeconds(0);
    setProgress(0);
  };

  const handleUnstableContinue = () => {
    setShowUnstableModal(false);
    // Reset readings
    weightReadingsRef.current = [];
    heightReadingsRef.current = [];
    setElapsedSeconds(0);
    setProgress(0);
  };

  const pollWeight = useCallback(async () => {
    if (!isMountedRef.current || savedWeightRef.current) return;
    // Early exit if modal is active (debounce)
    if (showUnstableModalRef.current) {
      // Optionally checking for stability to auto-clear could happen here,
      // but let's keep it simple to avoid flipping states
      // We'll check ONCE per poll if we want to auto-clear
    }

    try {
      const data = await sensorAPI.getWeightStatus();
      if (savedWeightRef.current) return;

      const val = data.live_data?.current || 0;

      // Update live weight only if not saved
      if (!savedWeightRef.current) setLiveWeight(val);

      // AUTO-CLEAR MODAL: If user steps back on (and weight is stable/valid), clear the warning
      if (showUnstableModalRef.current) {
        if (val >= MIN_VALID_WEIGHT) {
          // We can check if it holds for a moment, or just clear immediately
          console.log("User returned to platform - clearing warning");
          setShowUnstableModal(false);
        }
        // If modal is showing, do not proceed to normal measurement logic
        return;
      }

      // INSTABILITY CHECK: Sudden Drop/Spike
      if (val >= MIN_VALID_WEIGHT) {
        // Only check instability if we have started collecting ample samples (wait longer for step-on transient)
        // INCREASED BUFFER: > 10 samples (1.0 second) to allow initial stepping on stabilization
        if (weightReadingsRef.current.length > 10) {
          const avg = weightReadingsRef.current.reduce((a, b) => a + b, 0) / weightReadingsRef.current.length;

          // INCREASED TOLERANCE: > 3.0kg deviation (was 2.0kg) to reduce false positives
          if (Math.abs(val - avg) > 3.0) {
            triggerInstabilityWarning("Unstable weight. Please stand still.");
            return;
          }
        }

        weightReadingsRef.current.push(val);

        const currentElapsed = weightReadingsRef.current.length * (POLL_INTERVAL_MS / 1000);
        setElapsedSeconds(currentElapsed);

        const totalDuration = WEIGHT_DURATION_MS / 1000;
        const pct = Math.min(100, (currentElapsed / totalDuration) * 100);
        setProgress(pct);

        const remaining = Math.max(0, Math.ceil(totalDuration - currentElapsed));
        setStatusMessage(`Scanning... ${remaining}s`);

        if (currentElapsed >= totalDuration) {
          const sum = weightReadingsRef.current.reduce((a, b) => a + b, 0);
          const avg = sum / weightReadingsRef.current.length;
          const final = avg.toFixed(1);

          // LOCK immediately to prevent race conditions
          savedWeightRef.current = final;

          setLiveWeight(parseFloat(final));
          setSavedWeight(final);
          setCurrentPhase(PHASE.WEIGHT_COMPLETE);
          setStatusMessage("Weight captured. Preparing height...");

          // Stop sensor explicitly - Fire and Forget to prevent blocking
          sensorAPI.shutdownWeight().catch(e => console.error("Stop weight error", e));

          setTimeout(() => {
            if (isMountedRef.current) startHeightMeasurement();
          }, TRANSITION_DELAY_MS);
        }
      } else {
        if (weightReadingsRef.current.length > 0) {
          // Started measuring but dropped below min valid weight -> User likely stepped off
          // Only trigger if we had a decent amount of data
          if (weightReadingsRef.current.length > 5) {
            triggerInstabilityWarning("Please go back to the platform.");
          }
          setStatusMessage("Step on the scale...");
          weightReadingsRef.current = [];
          setElapsedSeconds(0);
          setProgress(0);
        } else {
          setStatusMessage("Step on the scale...");
        }
      }
      lastLiveWeightRef.current = val;
    } catch (e) { console.error("Poll weight error:", e); }
  }, [startHeightMeasurement]); // Removed showUnstableModal form dependency to reduce re-creation

  const pollHeight = useCallback(async () => {
    if (!isMountedRef.current || savedHeightRef.current) return;

    // Check ref for modal
    if (showUnstableModalRef.current) {
      // Auto-clear logic for height
      try {
        const data = await sensorAPI.getHeightStatus();
        const val = data.live_data?.current || 0;
        if (val >= MIN_VALID_HEIGHT) {
          console.log("User returned to height sensor - clearing warning");
          setShowUnstableModal(false);
        }
      } catch (e) { }
      return;
    }

    try {
      const data = await sensorAPI.getHeightStatus();
      if (savedHeightRef.current) return;

      const val = data.live_data?.current || 0;

      if (!savedHeightRef.current) setLiveHeight(val);

      // INSTABILITY CHECK: Sudden Drop
      if (lastLiveHeightRef.current !== null && val > 0) {
        // Check for large drops (e.g., > 30cm drop instantly)
        if (lastLiveHeightRef.current > MIN_VALID_HEIGHT) {
          const diff = lastLiveHeightRef.current - val;
          if (diff > 30) { // Dropped more than ~1ft
            triggerInstabilityWarning("Height unstable. please stand still");
            lastLiveHeightRef.current = val;
            return;
          }
        }
      }

      if (val >= MIN_VALID_HEIGHT) {
        heightReadingsRef.current.push(val);

        const currentElapsed = heightReadingsRef.current.length * (POLL_INTERVAL_MS / 1000);
        setElapsedSeconds(currentElapsed);

        const totalDuration = HEIGHT_DURATION_MS / 1000;
        const pct = Math.min(100, (currentElapsed / totalDuration) * 100);
        setProgress(pct);

        const remaining = Math.max(0, Math.ceil(totalDuration - currentElapsed));
        setStatusMessage(`Scanning... ${remaining}s`);

        if (currentElapsed >= totalDuration) {
          const lastValue = heightReadingsRef.current[heightReadingsRef.current.length - 1];
          const final = lastValue.toFixed(1);

          // LOCK immediately
          savedHeightRef.current = final;

          setLiveHeight(parseFloat(final));
          setSavedHeight(final);
          setCurrentPhase(PHASE.COMPLETE);
          setStatusMessage("Measurements Complete!");

          // Stop sensor explicitly
          sensorAPI.shutdownHeight().catch(e => console.error("Stop height error", e));
        }
      } else {
        if (heightReadingsRef.current.length > 0) {
          // Was valid, now below min (2ft) -> User likely left platform
          if (heightReadingsRef.current.length > 5) {
            triggerInstabilityWarning("User left platform. Please return.");
          }
          setStatusMessage("Stand under sensor...");
          heightReadingsRef.current = [];
          setElapsedSeconds(0);
          setProgress(0);
        } else {
          if (val > 0) setStatusMessage("Stand under sensor...");
          else setStatusMessage("Scanning for height...");
        }
      }
      lastLiveHeightRef.current = val;
    } catch (e) { console.error("Poll height error:", e); }
  }, []);

  // ============================================================
  // POLLING ENGINE
  // ============================================================
  // ============================================================
  // POLLING ENGINE - RECURSIVE TIMEOUT
  // ============================================================

  // Use a Ref to track if a poll is currently in progress to prevent overlaps
  const isPollingRef = useRef(false);
  const pollTimerRef = useRef(null);

  const runPoller = useCallback(async () => {
    if (!isMountedRef.current || isPollingRef.current) return;

    isPollingRef.current = true;

    try {
      if (currentPhase === PHASE.WEIGHT && !savedWeightRef.current) {
        await pollWeight();
      } else if (currentPhase === PHASE.HEIGHT && !savedHeightRef.current) {
        await pollHeight();
      }
    } catch (e) {
      console.error("Poller error:", e);
    } finally {
      isPollingRef.current = false;
      // Schedule next tick if still needed
      if (isMountedRef.current &&
        ((currentPhase === PHASE.WEIGHT && !savedWeightRef.current) ||
          (currentPhase === PHASE.HEIGHT && !savedHeightRef.current))) {
        pollTimerRef.current = setTimeout(runPoller, POLL_INTERVAL_MS);
      }
    }
  }, [currentPhase, pollWeight, pollHeight]);

  // Start/Stop Poller based on Phase
  useEffect(() => {
    if ((currentPhase === PHASE.WEIGHT && !savedWeight) ||
      (currentPhase === PHASE.HEIGHT && !savedHeight)) {
      // Kick off
      runPoller();
    }

    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, [currentPhase, savedWeight, savedHeight, runPoller]);


  // ============================================================
  // INIT & HELPERS
  // ============================================================
  const waitForSystemReady = useCallback(async () => {
    let attempts = 0;
    let startedWeight = false; // Local flag to prevent multiple starts
    const interval = setInterval(async () => {
      if (!isMountedRef.current) { clearInterval(interval); return; }
      if (startedWeight) return; // Already started, skip

      try {
        const status = await sensorAPI.getSystemStatus();
        // FIXED: Check for weight_ready OR auto_tare to prevent deadlock if initial tare msg missed
        if (status && (status.auto_tare_completed || status.weight_ready)) {
          clearInterval(interval);
          startedWeight = true;
          startWeightMeasurement();
        } else {
          attempts++;
          if (attempts > 60) { // 12s timeout
            clearInterval(interval);
            startedWeight = true;
            startWeightMeasurement(); // Force start anyway
          }
        }
      } catch (e) { console.error("Sys check error:", e); }
    }, 200); // Slower polling to reduce spam (was 100ms)

    return interval; // Return for cleanup
  }, [startWeightMeasurement]);

  const systemCheckIntervalRef = useRef(null);

  useEffect(() => {
    // Prevent double-init
    if (isInitializedRef.current) {
      console.log("⚠️ BMI already initialized, skipping duplicate init");
      return;
    }
    isInitializedRef.current = true;
    isMountedRef.current = true;
    isStartingWeightRef.current = false;
    isStartingHeightRef.current = false;

    setIsInactivityEnabled(true);

    const init = async () => {
      setCurrentPhase(PHASE.CALIBRATING);
      setStatusMessage("Calibrating sensors... Ensure scale is empty.");
      setSavedWeight(null);
      setSavedHeight(null);
      savedWeightRef.current = null;
      savedHeightRef.current = null;
      // Longer delay to let system settle after clearance cleanup
      await sleep(1500);
      systemCheckIntervalRef.current = waitForSystemReady();
    };
    init();

    return () => {
      console.log("🧹 BMI cleanup - stopping all sensors");
      isMountedRef.current = false;
      isInitializedRef.current = false;
      isStartingWeightRef.current = false;
      isStartingHeightRef.current = false;

      if (systemCheckIntervalRef.current) {
        clearInterval(systemCheckIntervalRef.current);
        systemCheckIntervalRef.current = null;
      }

      sensorAPI.shutdownWeight().catch(e => console.error("Cleanup weight error", e));
      sensorAPI.shutdownHeight().catch(e => console.error("Cleanup height error", e));
    };
  }, [setIsInactivityEnabled, waitForSystemReady]);

  // Inactivity Control
  useEffect(() => {
    // If modal is showing (user stuck/unstable/left), ENABLE inactivity so it can timeout
    if (showUnstableModal) {
      setIsInactivityEnabled(true);
      return;
    }

    const isActive = [PHASE.WEIGHT, PHASE.HEIGHT, PHASE.CALIBRATING].includes(currentPhase);
    // If we have weight, we are "active" (unless modal is showing)
    const hasWeight = liveWeight && liveWeight > MIN_VALID_WEIGHT;

    // Disable inactivity ONLY if active AND stable (no modal)
    setIsInactivityEnabled(!(isActive || hasWeight));
  }, [currentPhase, liveWeight, setIsInactivityEnabled, showUnstableModal]);

  // Voice
  useEffect(() => {
    const t = setTimeout(() => {
      if (currentPhase === PHASE.WEIGHT) speak("Step 1. Stand on the scale and hold still for 3 seconds.");
      if (currentPhase === PHASE.HEIGHT) speak("Step 2. Stand under the height sensor for 2 seconds.");
      if (currentPhase === PHASE.COMPLETE) speak("Measurement complete. BMI calculated.");
    }, 500);
    return () => clearTimeout(t);
  }, [currentPhase]);

  // Calculations / Navigation
  const calculateBMI = useCallback(() => {
    if (!savedWeight || !savedHeight) return null;
    const h = parseFloat(savedHeight) / 100;
    return (parseFloat(savedWeight) / (h * h)).toFixed(1);
  }, [savedWeight, savedHeight]);

  const handleContinue = useCallback(() => {
    const data = { ...location.state, weight: parseFloat(savedWeight), height: parseFloat(savedHeight), bmi: calculateBMI() };
    navigate(getNextStepPath('bmi', location.state?.checklist), { state: data });
  }, [location.state, savedWeight, savedHeight, calculateBMI, navigate]);

  // Auto-Continue Timer Logic
  useEffect(() => {
    if (currentPhase === PHASE.COMPLETE && countdown === null) {
      setCountdown(5);
    }

    if (countdown !== null && countdown > 0) {
      const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      handleContinue();
    }
  }, [currentPhase, countdown, handleContinue]);

  const handleExit = () => { setShowExitModal(true); };
  const confirmExit = async () => {
    // Shutdown sensors before leaving page
    try {
      await sensorAPI.shutdownWeight();
      await sensorAPI.shutdownHeight();
    } catch (e) {
      console.error("Exit cleanup error:", e);
    }
    navigate("/login", { state: { cancelled: true } });
  };

  // UPDATED: Show any non-zero reading for visual feedback, even if below validation threshold
  const DISPLAY_THRESHOLD_WEIGHT = 0.1;
  const DISPLAY_THRESHOLD_HEIGHT = 91.44; // 3 feet in cm

  const formattedWeight = savedWeight || (liveWeight && liveWeight >= DISPLAY_THRESHOLD_WEIGHT ? liveWeight.toFixed(1) : "--.--");
  const formattedHeight = savedHeight || (liveHeight && liveHeight >= DISPLAY_THRESHOLD_HEIGHT ? liveHeight.toFixed(1) : "--.--");
  const bmi = calculateBMI();

  const getBMICategory = (val) => {
    // Adapter for centralized utility
    const status = getBMICategoryUtil(val);

    let cssClass = '';
    if (status.label === 'Normal') cssClass = 'complete';
    else if (status.label === 'Overweight' || status.label === 'Underweight') cssClass = 'warning';
    else if (status.label === 'Obese') cssClass = 'error';
    else cssClass = 'pending'; // Fallback

    return {
      class: cssClass,
      category: status.label,
      description: status.description
    };
  };
  const cat = getBMICategory(bmi);
  const info = getProgressInfo('bmi', location.state?.checklist);
  const isMeasuring = currentPhase === PHASE.WEIGHT || currentPhase === PHASE.HEIGHT;

  const getButtonText = () => {
    if (currentPhase === PHASE.COMPLETE) {
      return countdown !== null && countdown > 0 ? `Continue (${countdown})` : "Continue";
    }
    if (currentPhase === PHASE.WEIGHT) return "Scanning Weight...";
    if (currentPhase === PHASE.HEIGHT) return "Scanning Height...";
    if (currentPhase === PHASE.CALIBRATING) return "Calibrating...";
    return "Processing...";
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container">
      <div className="card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content visible">

        {/* Progress Header */}
        <div className="w-100 mb-4">
          <div className="measurement-progress-bar"><div className="measurement-progress-fill" style={{ width: `${info.percentage}%` }}></div></div>
          <div className="d-flex justify-content-between mt-2 px-1">
            <button className="measurement-back-arrow" onClick={handleExit}>←</button>
            <span className="measurement-progress-step">Step {info.currentStep} of {info.totalSteps} - BMI</span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="measurement-title">Body Mass <span className="measurement-title-accent">Index</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>
          {isMeasuring && progress > 0 && <div className="w-50 mx-auto mt-2"><div className="measurement-progress-bar"><div className="measurement-progress-fill" style={{ width: `${progress}%` }} /></div></div>}
        </div>

        <div className="row g-4 justify-content-center mb-4 w-100">
          {/* WEIGHT CARD */}
          <div className="col-12 col-md-6">
            <div className={`measurement-card h-100 ${currentPhase === PHASE.WEIGHT ? 'active' : ''} ${savedWeight ? 'completed' : ''}`}>
              <img src={weightIcon} alt="Weight" className="mb-3" style={{ height: 60 }} />
              <h3>Weight</h3>
              <div className="measurement-value-container"><span className="measurement-value">{formattedWeight}</span> kg</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '-5px', marginBottom: '10px' }}>
                {formattedWeight !== "--.--" ? `${(parseFloat(formattedWeight) * 2.20462).toFixed(1)} lbs` : "-- lbs"}
              </div>
              <div className={`measurement-status-badge ${savedWeight ? 'complete' : (currentPhase === PHASE.WEIGHT && liveWeight > 5 ? 'active' : 'pending')}`}>
                {savedWeight ? "Measured" : (currentPhase === PHASE.WEIGHT ? "Scanning..." : "Pending")}
              </div>
            </div>
          </div>

          {/* HEIGHT CARD */}
          <div className="col-12 col-md-6">
            <div className={`measurement-card h-100 ${currentPhase === PHASE.HEIGHT ? 'active' : ''} ${savedHeight ? 'completed' : ''}`}>
              <img src={heightIcon} alt="Height" className="mb-3" style={{ height: 60 }} />
              <h3>Height</h3>
              <div className="measurement-value-container"><span className="measurement-value">{formattedHeight}</span> cm</div>
              <div style={{ fontSize: '0.9rem', color: '#6c757d', marginTop: '-5px', marginBottom: '10px' }}>
                {formattedHeight !== "--.--" ? (() => {
                  const cm = parseFloat(formattedHeight);
                  const feet = Math.floor(cm * 0.0328084);
                  const inches = Math.round((cm * 0.0328084 - feet) * 12);
                  return `${feet}' ${inches}"`;
                })() : "--' --\""}
              </div>
              <div className={`measurement-status-badge ${savedHeight ? 'complete' : (currentPhase === PHASE.HEIGHT && liveWeight > 50 ? 'active' : 'pending')}`}>
                {savedHeight ? "Measured" : (currentPhase === PHASE.HEIGHT ? "Scanning..." : "Pending")}
              </div>
            </div>
          </div>

          {/* BMI RESULT */}
          <div className="col-12">
            <div className={`measurement-card ${bmi ? 'completed' : ''}`}>
              <h3>BMI Result</h3>
              <div className="measurement-value-container"><span className="measurement-value">{bmi || "--.--"}</span> kg/m²</div>
              {bmi ? <><div className={`measurement-status-badge ${cat.class} mb-2`}>{cat.category}</div><div>{cat.description}</div></> : <div className="measurement-status-badge pending">Pending</div>}
            </div>
          </div>
        </div>

        {/* INSTRUCTIONS */}
        <div className="row g-3 justify-content-center w-100 mt-2">
          {[1, 2, 3].map(step => (
            <div key={step} className="col-12 col-md-4">
              <div className={`instruction-card h-100 ${(currentPhase === PHASE.HEIGHT && step <= 1) || (currentPhase === PHASE.COMPLETE) ? 'completed' : ((step === 1 && currentPhase === PHASE.WEIGHT) || (step === 2 && currentPhase === PHASE.HEIGHT) ? 'active' : '')}`}>
                <div className="instruction-step-number">{step}</div>
                <img
                  src={step === 1 ? bmiJuanWeight : step === 2 ? bmiJuanHeight : completedIcon}
                  alt={`Step ${step}`}
                  className="mb-3 instruction-icon"
                  style={{ height: '80px', objectFit: 'contain' }}
                />
                <h4>{step === 1 ? "Measure Weight" : step === 2 ? "Measure Height" : "Complete"}</h4>
                <p className="small">{step === 1 ? "Stand still 3s" : step === 2 ? "Stand under sensor" : currentPhase === PHASE.COMPLETE ? "Done" : "Wait..."}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="measurement-navigation mt-5">
          <button className="measurement-button" disabled={!bmi} onClick={handleContinue}>
            {isMeasuring && <div className="spinner me-2"></div>}
            {getButtonText()}
          </button>
        </div>

      </div>

      {showExitModal && (
        <div className="exit-modal-overlay" onClick={() => setShowExitModal(false)}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
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

      {showUnstableModal && (
        <div className="exit-modal-overlay" style={{ background: 'rgba(0,0,0,0.3)' }}>
          <motion.div
            className="exit-modal-content"
            style={{ borderTop: '4px solid #f59e0b' }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <div className="exit-modal-icon" style={{ background: '#fef3c7', color: '#f59e0b' }}><span>⚠️</span></div>
            <h2 className="exit-modal-title">Measurement Interrupted</h2>
            <p className="exit-modal-message" style={{ fontSize: '1.2rem', fontWeight: '500' }}>
              {unstableMsg}
            </p>
            <div className="exit-modal-buttons mt-4">
              <button className="exit-modal-button secondary" onClick={() => { setShowUnstableModal(false); handleExit(); }}>Cancel</button>
              <button className="exit-modal-button primary" onClick={handleUnstableContinue}>Continue</button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}