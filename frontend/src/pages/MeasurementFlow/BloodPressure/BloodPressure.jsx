import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./BloodPressure.css";
import "../main-components-measurement.css";
import bpIcon from "../../../assets/icons/bp-icon.png";
import { cameraAPI, sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";
import { isLocalDevice } from "../../../utils/network";
import { speak } from "../../../utils/speech";
import step3Icon from "../../../assets/icons/measurement-step3.png";

export default function BloodPressure() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled, signalActivity, setCustomTimeout } = useInactivity();

  // BLOCK REMOTE ACCESS
  useEffect(() => {
    if (!isLocalDevice()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing blood pressure monitor...");
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);

  // Camera State
  const [isCameraMode, setIsCameraMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Interactive state variables
  const [bpMeasuring, setBpMeasuring] = useState(false);
  const [bpComplete, setBpComplete] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(1); // Start at step 1: Ready for measurement

  const MAX_RETRIES = 3;

  const countdownRef = useRef(null);
  const progressIntervalRef = useRef(null);

  // Camera Config State - UPDATED based on user testing:
  // Index 0 = Weight Compliance Camera (Feet/Platform) ✅
  // Index 1 = Blood Pressure Camera (BP Monitor)
  // Index 2 = Wearables Compliance Camera (Body)
  const [cameraConfig, setCameraConfig] = useState({
    weight_index: 0,     // VERIFIED: Feet/Platform
    wearables_index: 2,  // Wearables camera (body)
    bp_index: 1          // BP Monitor camera
  });

  useEffect(() => {
    // Reset inactivity setting on mount (timer enabled by default)
    setIsInactivityEnabled(true);

    // EXTENDED TIMEOUT: 60s Warning, 90s Final (User Request)
    setCustomTimeout(60000, 90000);

    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 BloodPressure received location.state:", location.state);

    // Call init
    initializeBloodPressureSensor();

    // Explicit camera names for robust backend lookups
    // These must match the EXACT friendly names set in Windows Registry (including prefix)
    const CAMERA_NAMES = {
      weight: "0 - Weight Compliance Camera",
      wearables: "1 - Wearables Compliance Camera",
      bp: "2 - Blood Pressure Camera"
    };

    // Auto-start camera WATCHING mode when page loads (after fetching config)
    const initCamera = async () => {
      try {
        // We'll trust the names over the config indices initially, sending names to backend
        console.log("📷 Starting BP Camera with Name Lookup...");
        startLiveReading(null, CAMERA_NAMES.bp);
      } catch (e) {
        console.error("Config fetch failed", e);
        startLiveReading(2); // fallback
      }
    };

    initCamera();

    return () => {
      clearTimeout(timer);
      stopAllTimers();
      // RESET TIMEOUT to defaults
      setCustomTimeout(null, null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Polling for Real-Time BP
  const [isLiveReading, setIsLiveReading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true); // New Loading State
  const pollInterval = useRef(null);
  const detectionStartTimeRef = useRef(null); // For 2s delay logic

  const stopLiveReading = () => {
    setIsLiveReading(false);
    if (pollInterval.current) clearInterval(pollInterval.current);
    setStatusMessage("✅ Reading paused. Click Confirm to save.");
  };

  const confirmReading = () => {
    stopLiveReading();
    setMeasurementComplete(true);
    setBpComplete(true);
    setMeasurementStep(3);
    setStatusMessage("✅ Measurement Confirmed!");
    setTimeout(stopCameraMode, 1000);

    // Announce result
    const bpStatus = getBloodPressureStatus(systolic, diastolic);
    speak(`Blood pressure measurement complete. Your reading is ${systolic} over ${diastolic}. Status: ${bpStatus.text}.`);

    // Stop polling to be safe state cleanup
    if (pollInterval.current) clearInterval(pollInterval.current);
  };

  const retryMeasurement = async () => {
    // Close error modal
    setShowErrorModal(false);

    // Reset all states
    setSystolic("");
    setDiastolic("");
    setStatusTrend("Smart Scan");
    setMeasurementComplete(false);
    setBpComplete(false);
    setMeasurementStep(1);
    stableCountRef.current = 0;
    detectionStartTimeRef.current = null;
    lastReadingRef.current = { sys: null, dia: null };

    setStatusMessage("🔄 Resetting BP device...");

    try {
      // Call backend to turn off BP and reset state
      await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/reset_for_retry`, {
        method: 'POST'
      });
      console.log("✅ BP system reset");
    } catch (e) {
      console.error("Reset error:", e);
    }

    setStatusMessage("✅ Ready - Press the red button to try again");
    speak("Device reset. Please press the red button on the BP monitor to try again.");
  };

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (pollInterval.current) clearInterval(pollInterval.current);
      // Stop BP camera when leaving page
      fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/stop`, {
        method: 'POST'
      }).catch(() => { });
    }
  }, []);

  // Sync inactivity with measurement
  useEffect(() => {
    // We strictly control inactivity via signalActivity() in the poll loop
    // so we keep the timer ENABLED (true) so it CAN timeout if idle.
    setIsInactivityEnabled(true);
  }, [setIsInactivityEnabled]);
  useEffect(() => {
    // If measuring/analyzing, DISABLE inactivity (enabled = false)
    // If NOT measuring, ENABLE inactivity (enabled = true)
    setIsInactivityEnabled(!isMeasuring && !isAnalyzing);
  }, [isMeasuring, isAnalyzing, setIsInactivityEnabled]);

  // Voice Instructions
  useEffect(() => {
    // Suppress step instructions if error modal is open to prevent overriding error speech
    if (showErrorModal) return;

    const timer = setTimeout(() => {
      const isLast = isLastStep('bloodpressure', location.state?.checklist);
      if (measurementStep === 0) {
        speak("Blood Pressure Measurement. Get ready to measure your blood pressure.");
      } else if (measurementStep === 1) {
        speak("Step 1. Ready. Please push the red button to start measuring blood pressure.");
      } else if (measurementStep === 2) {
        speak("Step 2. Measuring. Blood pressure measurement in progress.");
      } else if (measurementStep === 3) {
        if (isLast) {
          speak("Step 3. Results Ready. All measurements complete.");
        } else {
          speak("Step 3. Measurement Complete. Continue to next step.");
        }
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [measurementStep, location.state?.checklist, showErrorModal]);

  const initializeBloodPressureSensor = async () => {
    try {
      setStatusMessage("🔄 Initializing...");

      // We no longer rely on hardware sensor simulation
      setStatusMessage("✅ Ready to scan - Click 'Scan Monitor' to begin");
      setMeasurementStep(1);

    } catch (error) {
      console.error("Blood pressure initialization error:", error);
      setStatusMessage("❌ Initialization error");
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

  const stopAllTimers = () => {
    stopCountdown();
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
  };

  const generateRandomBloodPressure = () => {
    // Generate realistic blood pressure values for a healthy young adult
    const baseSystolic = 110 + Math.floor(Math.random() * 15); // 110-125
    const baseDiastolic = 70 + Math.floor(Math.random() * 10); // 70-80

    return {
      systolic: baseSystolic,
      diastolic: baseDiastolic
    };
  };

  // Stability Checking Refs
  const stableCountRef = useRef(0);
  const lastReadingRef = useRef({ sys: null, dia: null });
  const hasSpokenErrorRef = useRef(false);
  const showErrorModalRef = useRef(false); // Fix for Stale Closure

  // Sync state to Ref
  useEffect(() => {
    showErrorModalRef.current = showErrorModal;
  }, [showErrorModal]);

  const startMeasurement = async () => {
    try {
      // 1. Start camera watching if not already
      if (!isLiveReading) {
        startLiveReading();
      }
      // 2. Trigger BP measurement via Arduino (simulates physical button press)
      console.log("🩺 Triggering BP measurement via screen button...");
      await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/trigger`, {
        method: 'POST'
      });
      setMeasurementStep(2);
      setStatusMessage("Measurement started - watch the BP monitor...");
    } catch (error) {
      console.error("BP trigger error:", error);
      setStatusMessage("Started - use physical button if needed");
    }
  };

  // --- HELPER FUNCTIONS (Defined before use) ---

  const getBloodPressureStatus = (sys, dia) => {
    if (!sys || !dia || sys === "--" || dia === "--") {
      return {
        text: "Measuring",
        class: "active",
        description: "Detecting blood pressure..."
      };
    }

    const systolicValue = parseInt(sys);
    const diastolicValue = parseInt(dia);

    if (isNaN(systolicValue) || isNaN(diastolicValue)) {
      return { text: "Invalid", class: "active", description: "Waiting for valid reading..." };
    }

    // BP Categories based on medical standards:
    // Hypertensive Crisis: Sys > 180 OR Dia > 120
    if (systolicValue > 180 || diastolicValue > 120) {
      return {
        text: "Hypertensive Crisis",
        class: "error",
        description: "⚠️ EMERGENCY: Seek immediate medical attention!"
      };
    }
    // Hypertension Stage 2: Sys >= 140 OR Dia >= 90
    if (systolicValue >= 140 || diastolicValue >= 90) {
      return {
        text: "Hypertension Stage 2",
        class: "error",
        description: "High blood pressure - Consult a doctor"
      };
    }
    // Hypertension Stage 1: Sys 130-139 OR Dia 80-89
    if (systolicValue >= 130 || diastolicValue >= 80) {
      return {
        text: "Hypertension Stage 1",
        class: "warning",
        description: "Blood pressure is elevated"
      };
    }
    // Elevated: Sys 120-129 AND Dia < 80
    if (systolicValue >= 120 && diastolicValue < 80) {
      return {
        text: "Elevated",
        class: "warning",
        description: "Blood pressure is slightly elevated"
      };
    }
    // Hypotension (Low): Sys < 90 OR Dia < 60
    if (systolicValue < 90 || diastolicValue < 60) {
      return {
        text: "Hypotension (Low)",
        class: "warning",
        description: "Blood pressure is lower than normal"
      };
    }
    // Normal: Sys < 120 AND Dia < 80
    return {
      text: "Normal",
      class: "complete",
      description: "Blood pressure is within normal range"
    };
  };

  const getCurrentDisplayValue = () => {
    // 1. Live Reading Mode (Prioritize real-time updates)
    if (isLiveReading) {
      // Pumping/Inflating (Single value detected)
      if (systolic && (!diastolic || diastolic === '--')) {
        return `${systolic}`;
      }
      // Full Reading
      if (systolic && diastolic) {
        return `${systolic}/${diastolic}`;
      }
    }

    // 2. Completed Result
    if (measurementComplete && systolic && diastolic) {
      return `${systolic}/${diastolic}`;
    }
    return "--/--";
  };

  // State for Status Trend
  const [statusTrend, setStatusTrend] = useState("Smart Scan");

  const getCurrentStatusInfo = () => {
    if (measurementComplete && systolic && diastolic) {
      return getBloodPressureStatus(systolic, diastolic);
    }

    // ERROR STATE
    if (statusTrend.includes("Error")) {
      return { text: 'Monitor Error ⚠️', class: 'danger', description: 'Please check the BP monitor.' };
    }

    // LIVE READING STATES
    if (isLiveReading) {
      if (isInitializing) {
        return { text: 'Initializing ⏳', class: 'warning', description: 'Starting AI & Camera...' };
      }
      if (statusTrend.includes("Inflating")) {
        return { text: 'Inflating ⬆️', class: 'warning', description: 'Pressure is rising...' };
      }
      if (statusTrend.includes("Deflating")) {
        return { text: 'Deflating ⬇️', class: 'primary', description: 'Measuring pressure...' };
      }

      // Removed "Stable" check to avoid "Holding" message at start.

      // Default
      return { text: 'Ready to Measure', class: 'active', description: 'Waiting for button press...' };
    }

    return {
      text: 'Ready',
      class: 'active',
      description: 'Ready for blood pressure measurement'
    };
  };

  // --- DERIVED STATE ---
  const statusInfo = getCurrentStatusInfo();
  const displayValue = getCurrentDisplayValue();
  const progressInfo = getProgressInfo('bloodpressure', location.state?.checklist);

  const startCameraMode = async (forceIndex = null, forceName = null) => {
    setIsCameraMode(true);
    setStatusMessage("Initializing Blood Pressure System...");

    // Explicit camera names for robust backend lookups (with prefixes)
    const CAMERA_NAMES = {
      weight: "0 - Weight Compliance Camera",
      wearables: "1 - Wearables Compliance Camera",
      bp: "2 - Blood Pressure Camera"
    };

    // Use provided index or state
    const camIndex = forceIndex !== null ? forceIndex : cameraConfig.bp_index;
    const camName = forceName || CAMERA_NAMES.bp;

    try {
      // Use dedicated BP sensor controller with explicit index param if needed, 
      // though backend controller usually handles it. Passing index updates the controller.
      await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/set_camera`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: camIndex,
          camera_name: camName
        })
      });

      await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          index: camIndex,
          camera_name: camName
        })
      });
      setStatusMessage("Please prepare the Blood Pressure Monitor");
    } catch (err) {
      console.error("BP Camera start error:", err);
      setStatusMessage("❌ Monitor Connection Failed");
    }
  };

  const stopCameraMode = async () => {
    try {
      await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/stop`, {
        method: 'POST'
      });
    } catch (e) { console.error(e) }

    setIsCameraMode(false);
  };

  const startLiveReading = async (forceIndex = null, forceName = null) => {
    // 1. Start BP Camera Backend if not running
    setIsInitializing(true); // START LOADING
    if (!isCameraMode) {
      await startCameraMode(forceIndex, forceName);
    }

    setIsLiveReading(true);
    setStatusMessage("⏳ Initializing AI & Camera...");

    // Reset Stability
    stableCountRef.current = 0;
    detectionStartTimeRef.current = null;
    lastReadingRef.current = { sys: null, dia: null };

    // Clear previous
    if (pollInterval.current) clearInterval(pollInterval.current);

    // Poll BP status from dedicated BP endpoint
    pollInterval.current = setInterval(async () => {
      try {
        const res = await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/status`);
        const data = await res.json();

        // New BP controller returns flat structure: { systolic, diastolic, trend, error, is_running }
        if (data && data.is_running) {
          if (isInitializing) {
            setIsInitializing(false);
            setStatusMessage("System Ready - Waiting for Input...");
          }
          const { systolic: newSys, diastolic: newDia, error, trend } = data;

          // PRIORITY: Check for active measurement (Inflating/Deflating/Starting)
          // If measuring, this takes priority over any stale error state
          const isMeasuring = trend && (trend.includes("Inflating") || trend.includes("Deflating") || trend.includes("Measuring") || trend.includes("Starting"));

          if (isMeasuring) {
            signalActivity();

            // AUTO-CLOSE ERROR MODAL when new measurement starts
            if (showErrorModalRef.current) {
              console.log("🔄 Measurement activity detected - closing error modal");
              setShowErrorModal(false);
              showErrorModalRef.current = false;
            }

            // AUTO-DETECT PHYSICAL INTERACTION
            // If user pressed physical button, advance UI to Step 2
            if (measurementStep === 1) {
              console.log("🚀 Physical Start Detected via Trend!");
              setMeasurementStep(2);
              setBpMeasuring(true);
            }

            // Update Trend State (only when measuring, not when error)
            setStatusTrend(trend);
          }
          // ERROR Detection - ONLY if NOT currently measuring
          else if (error && !isMeasuring) {
            // ONLY Show Modal if not already shown
            if (!showErrorModalRef.current) {
              setStatusTrend("Error ⚠️");
              setSystolic("--");
              setDiastolic("--");
              setStatusMessage("⚠️ Monitor Error - Press red button to retry");
              setShowErrorModal(true);

              // Prevent repeating speech
              if (!hasSpokenErrorRef.current) {
                speak("Error detected. Please check the cuff and press the red button to try again.");
                hasSpokenErrorRef.current = true;
              }

              // Reset states
              stableCountRef.current = 0;
              detectionStartTimeRef.current = null;
              lastReadingRef.current = { sys: null, dia: null };
              setMeasurementStep(1);
              setBpMeasuring(false);
              setBpComplete(false);
              setMeasurementComplete(false);
            }
            return;
          }
          // If NO error, initiate recovery
          else if (!error && showErrorModalRef.current) {
            console.log("✅ Error state cleared by backend - closing modal");
            setShowErrorModal(false);
            showErrorModalRef.current = false;
            setStatusMessage("✅ Monitor Ready - Press Button");
            hasSpokenErrorRef.current = false; // Reset speech flag
          }

          // 1. Update Display if valid (accept any detected number)
          // Filter out 888/88/8 patterns - these are monitor startup self-test displays
          const isStartupPattern = (val) => val && /^8+$/.test(val);

          if (newSys && newSys !== '--' && newSys.length >= 1 && !isStartupPattern(newSys)) {

            // --- QUICK DELAY LOGIC REMOVED FOR RESPONSIVENESS ---
            // We want instant feedback during inflation/deflation
            setStatusMessage("Reading...");

            // If Diastolic is empty/placeholder, it's PUMPING mode (Single Value)
            // Backend sends "--" for empty diastolic, so check for that too.
            if (!newDia || newDia === "" || newDia === "--") {
              setSystolic(newSys);
              setDiastolic("--"); // explicit placeholder

              // Reset stability because we are pumping, not done
              stableCountRef.current = 0;
              // Use backend trend for accurate status (Inflating or Deflating)
              setStatusMessage(`${trend || 'Measuring'}... ${newSys} mmHg`);

              lastReadingRef.current = { sys: newSys, dia: "" };
            }
            // If Diastolic is present, it's RESULT mode (Dual Value)
            else if (newDia.length >= 2) {
              setSystolic(newSys);
              setDiastolic(newDia);

              // Stability Check (Only if we have BOTH values)
              if (newSys === lastReadingRef.current.sys && newDia === lastReadingRef.current.dia) {
                stableCountRef.current += 1;
                // Stability: 2 checks = ~2 seconds (polling at 1Hz)
                setStatusMessage(`Verifying Result... ${Math.round((stableCountRef.current / 2) * 100)}%`);

                if (stableCountRef.current >= 2) {
                  setStatusMessage("✅ Result Confirmed!");
                  confirmReading();
                }
              } else {
                // Changing result
                stableCountRef.current = 0;
                setStatusMessage(`Reading: ${newSys}/${newDia}`);
              }

              lastReadingRef.current = { sys: newSys, dia: newDia };
            }
          } else if (!newSys || newSys === '--') {
            // Only reset if truly no data
            detectionStartTimeRef.current = null;
          }
        }
      } catch (err) {
        console.error("Polling error", err);
      }
    }, 500); // 500ms polling as requested
  };

  const captureAndAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setStatusMessage("Processing Measurement..."); // More realistic

      const response = await cameraAPI.analyzeBP();
      console.log("BP Analysis Result:", response);

      if (response && response.success && response.systolic && response.diastolic) {
        setSystolic(response.systolic.toString());
        setDiastolic(response.diastolic.toString());
        setMeasurementComplete(true);
        setBpComplete(true);
        setMeasurementStep(3);
        setStatusMessage("✅ Measurement Complete!");

        // Stop camera after success
        setTimeout(stopCameraMode, 1000);
      } else {
        setStatusMessage(`❌ Reading failed: ${response?.message || 'Try aligning again'}`);
      }
    } catch (e) {
      console.error(e);
      setStatusMessage("❌ Analysis error. Check connection.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleContinue = async () => {
    if (!measurementComplete || !systolic || !diastolic) return;
    stopAllTimers();

    // Turn OFF the BP Arduino when leaving the page
    console.log("🔌 Stopping BP camera and Arduino...");
    await stopCameraMode();

    const completeVitalSignsData = {
      ...location.state,
      systolic: systolic ? parseFloat(systolic) : null,
      diastolic: diastolic ? parseFloat(diastolic) : null,
      bloodPressure: `${systolic}/${diastolic}`,
      measurementTimestamp: new Date().toISOString()
    };

    const nextPath = getNextStepPath('bloodpressure', location.state?.checklist);
    navigate(nextPath, { state: completeVitalSignsData });
  };

  const getButtonText = () => {
    const isLast = isLastStep('bloodpressure', location.state?.checklist);
    if (measurementStep === 3) return isLast ? "Continue to Result" : "Continue to Next Step";
    // Camera is auto-watching, user uses physical button
    return "Waiting for BP Monitor...";
  };

  const getButtonAction = () => {
    if (measurementStep === 3) return handleContinue;
    return null; // No action needed - camera is auto-watching
  };

  const getButtonDisabled = () => {
    return false;
  };

  const handleBack = () => {
    if (measurementStep > 1) {
      stopAllTimers();
      setBpMeasuring(false);
      setMeasurementStep(1);
      setStatusMessage("✅ Blood pressure monitor ready - Press Physical Button to begin");
    } else {
      navigate(-1);
    }
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = async () => {
    try {
      // Stop BP camera
      await stopCameraMode();
      // Reset sensors
      await sensorAPI.reset();
    } catch (e) {
      console.error("Error cleaning up:", e);
    }
    setShowExitModal(false);
    navigate("/login");
  };

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container"
    >
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>
        {/* Progress bar for Step X of Y */}
        <div className="w-100 mb-4">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${progressInfo.percentage}%` }}></div>
          </div>
          <div className="d-flex justify-content-between align-items-center mt-2 px-1">
            <button className="measurement-back-arrow" onClick={handleExit}>←</button>
            <span className="measurement-progress-step mb-0">
              Step {progressInfo.currentStep} of {progressInfo.totalSteps} - Blood Pressure
            </span>
          </div>
        </div>

        <div className="text-center mb-4">
          <h1 className="measurement-title">Blood <span className="measurement-title-accent">Pressure</span></h1>
          <p className="measurement-subtitle">
            {statusMessage}
          </p>
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
            {/* Single Blood Pressure Display - Shows live reading and result */}
            <div className="col-12 col-md-8 col-lg-6">
              <div className={`measurement-card w-100 ${bpMeasuring ? 'active' : ''} ${bpComplete ? 'completed' : ''}`} style={{ minHeight: '320px' }}>

                <>
                  {/* STANDARD VIEW (ALWAYS VISIBLE) */}
                  <div className="measurement-icon" style={{ width: '80px', height: '80px', marginBottom: '20px' }}>
                    <img src={bpIcon} alt="Blood Pressure Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  </div>

                  <h3 className="instruction-title fs-3">
                    {measurementComplete ? "Blood Pressure Result" : "Blood Pressure"}
                  </h3>

                  <div className="measurement-value-container">
                    <span className="measurement-value" style={{ fontSize: '3.5rem' }}>
                      {displayValue}
                    </span>
                    <span className="measurement-unit">mmHg</span>
                  </div>

                  {/* Controls */}
                  <div className="mt-3 w-100 d-flex justify-content-center gap-3">
                    {!isLiveReading ? (
                      !measurementComplete && (
                        <div className="text-muted small">Initializing Smart Sensor...</div>
                      )
                    ) : (
                      <div className="d-flex flex-column align-items-center gap-2 w-100">
                        {/* Hidden 'Confirm' button - it now auto-confirms, but kept if manual override needed */}
                        {/* <button ... >Confirm</button> */}
                        <div className="text-muted small blink-text">Sensor Active - Reading...</div>
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="text-center mt-3">
                    <span className={`measurement-status-badge ${statusInfo.class}`}>
                      {statusInfo.text}
                    </span>
                    <div className="instruction-text mt-2">
                      {statusInfo.description}
                    </div>
                  </div>
                </>
              </div>
            </div>
          </div>

          {/* INSTRUCTION DISPLAY - Simplified workflow */}
          <div className="w-100 mt-4">
            <div className="row g-3 justify-content-center">
              {/* Step 1 Card - Ready for Measurement */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">1</div>
                  <div className="instruction-icon">🩺</div>
                  <h4 className="instruction-title">Ready</h4>
                  <p className="instruction-text">
                    Press Physical Button on BP monitor
                  </p>
                </div>
              </div>

              {/* Step 2 Card - Measurement in Progress */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon">📊</div>
                  <h4 className="instruction-title">Measuring</h4>
                  <p className="instruction-text">
                    Blood pressure measurement in progress
                  </p>
                  {bpMeasuring && countdown > 0 && (
                    <div className="text-danger fw-bold mt-2">
                      {countdown}s remaining
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 Card - Results Complete */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 3 ? 'completed' : ''}`}>
                  <div className="instruction-step-number">3</div>
                  <div className="instruction-icon">
                    <img src={step3Icon} alt="Complete" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">
                    {isLastStep('bloodpressure', location.state?.checklist) ? 'Results Ready' : 'Complete'}
                  </h4>
                  <p className="instruction-text">
                    {isLastStep('bloodpressure', location.state?.checklist)
                      ? "All measurements complete!"
                      : "Continue to next measurement"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-navigation mt-5 d-flex flex-column align-items-center gap-3">
          {measurementStep === 3 ? (
            <button
              className="measurement-button"
              onClick={handleContinue}
              disabled={!measurementComplete}
            >
              {getButtonText()}
            </button>
          ) : (
            <div className="text-center mt-3 p-4 rounded" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed #666' }}>
              <h4 className="mb-2">👉 Ready to Measure</h4>
              <p className="text-white mb-0" style={{ fontSize: '1.2rem' }}>
                Please press the <strong style={{ color: '#4facfe' }}>Physical Button</strong> on the BP Monitor to start.
              </p>
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

      {/* BP Monitor Error Popup Modal */}
      {showErrorModal && (
        <div className="exit-modal-overlay" onClick={() => setShowErrorModal(false)}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-modal-icon" style={{ background: 'linear-gradient(135deg, #ff4444, #cc0000)' }}>
              <span>⚠️</span>
            </div>
            <h2 className="exit-modal-title">Cuff Error Detected</h2>
            <p className="exit-modal-message">
              The blood pressure monitor detected an error. Please ensure the cuff is
              wrapped properly around your arm.
            </p>
            <p className="exit-modal-message" style={{ fontWeight: 'bold', marginTop: '10px', fontSize: '1.1rem' }}>
              👉 Click the physical button to start measurement again.
            </p>
            <div className="exit-modal-buttons">
              <button
                className="exit-modal-button secondary"
                onClick={retryMeasurement}
              >
                Reset System
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}