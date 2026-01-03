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

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled, signalActivity } = useInactivity();

  // BLOCK REMOTE ACCESS
  useEffect(() => {
    if (!isLocalDevice()) {
      navigate('/login', { replace: true });
    }
  }, [navigate]);

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
  // Arrays to store all readings for averaging
  // REPLACED BY REFS for performance and data integrity
  // eslint-disable-next-line no-unused-vars
  // eslint-disable-next-line no-unused-vars
  const [respiratoryRateReadings, setRespiratoryRateReadings] = useState([]);

  // REFS to store readings - survives re-renders and closures
  const heartRateReadingsRef = useRef([]);
  const spo2ReadingsRef = useRef([]);
  const respiratoryRateReadingsRef = useRef([]);

  const [progressSeconds, setProgressSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [sensorReady, setSensorReady] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(0);
  const [countdown, setCountdown] = useState(30);
  // Removed unused irValue state
  // const [irValue, setIrValue] = useState(0);

  const [showFingerRemovedAlert, setShowFingerRemovedAlert] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  const pollerRef = useRef(null);
  const fingerCheckRef = useRef(null);
  const initializationRef = useRef(false);
  const progressTimerRef = useRef(null);
  const fingerRemovedAlertRef = useRef(null);
  const previousFingerStateRef = useRef(false);
  // Ref to store final measurements for reliable access when navigating
  const finalMeasurementsRef = useRef({
    heartRate: null,
    spo2: null,
    respiratoryRate: null
  });
  // Refs to track measurement state for use inside intervals (avoid stale closures)
  const isMeasuringRef = useRef(false);
  const measurementCompleteRef = useRef(false);
  const isStoppingRef = useRef(false); // Fix race conditions for stop commands
  const totalMeasurementTime = 30;


  // Sync inactivity timer with measurement status
  useEffect(() => {
    // UPDATED LOGIC:
    // Disable inactivity if:
    // - Finger is detected (user is interacting with sensor)
    // - Measuring is active (isMeasuring = true)
    // - Measurement is complete (showing results)
    // Enable inactivity ONLY when:
    // - Waiting for finger AND no finger detected (user walked away)
    const isUserInteracting = fingerDetected || isMeasuring || measurementComplete;
    const shouldEnableInactivity = !isUserInteracting;

    console.log(`[InactivityLogic] Finger:${fingerDetected} Measuring:${isMeasuring} Complete:${measurementComplete} -> InactivityEnabled: ${shouldEnableInactivity}`);

    setIsInactivityEnabled(shouldEnableInactivity);
  }, [isMeasuring, fingerDetected, measurementComplete, setIsInactivityEnabled]);

  // Reset measurements on mount
  useEffect(() => {
    // Clear any previous data when entering the page
    setMeasurements({
      heartRate: "--",
      spo2: "--",
      respiratoryRate: "--"
    });

    // REFS for readings
    heartRateReadingsRef.current = [];
    spo2ReadingsRef.current = [];
    respiratoryRateReadingsRef.current = [];
    setRespiratoryRateReadings([]);
  }, []);

  // Update progress percentage when seconds change
  useEffect(() => {
    const percent = Math.min(100, Math.round((progressSeconds / totalMeasurementTime) * 100));
    setProgressPercent(percent);

    // Update countdown (remaining time)
    const remaining = Math.max(0, totalMeasurementTime - progressSeconds);
    setCountdown(remaining);
  }, [progressSeconds]);

  // Voice Instructions based on Step
  useEffect(() => {
    const timer = setTimeout(() => {
      const isLast = isLastStep('max30102', location.state?.checklist);
      if (measurementStep === 1) {
        speak("Pulse Oximeter Measurement. Get ready to measure heart rate and blood oxygen.");
      } else if (measurementStep === 2) {
        // Only speak if not already handled by initialization
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

  // Voice for Finger Removed
  useEffect(() => {
    if (showFingerRemovedAlert) {
      speak("Finger Removed. Please reinsert your finger to continue.");
    }
  }, [showFingerRemovedAlert]);

  // FRONTEND CONTROLLED: Local timer for reliable countdown - auto-completes at 30s
  const startProgressTimer = () => {
    stopProgressTimer();

    progressTimerRef.current = setInterval(() => {
      setProgressSeconds(prev => {
        const newSeconds = prev + 1;

        // FRONTEND TRIGGERS COMPLETION at 30 seconds
        if (newSeconds >= totalMeasurementTime) {
          // IMMEDIATELY stop the timer to prevent multiple calls
          clearInterval(progressTimerRef.current);
          progressTimerRef.current = null;

          // Auto-complete the measurement (only if not already complete)
          if (!measurementCompleteRef.current) {
            console.log("⏱️ Frontend timer reached 30s - triggering completion");
            setTimeout(() => completeMeasurement(), 100);
          }
          return totalMeasurementTime; // Lock at 30
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
      fingerRemovedAlertRef.current = null;
    }
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
      // setMeasurementStep(1); // Deferred until after prepare call starts/succeeds

      const prepareResult = await sensorAPI.prepareMax30102();

      if (prepareResult.error || prepareResult.status === 'error') {
        setStatusMessage(`❌ ${prepareResult.error || prepareResult.message || 'Initialization failed'}`);
        handleRetry();
        return;
      }

      setStatusMessage("✅ Pulse oximeter ready. Place finger to start automatic measurement...");

      // Safe speech call only after successful initialization
      setTimeout(() => speak("Pulse oximeter ready. Place finger on sensor."), 500);

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
          fingerStatus: data.finger_status, // NEW: Backend-provided finger status
          irValue: data.ir_value, // IR value for debugging
          previousFingerState: previousFingerStateRef.current,
          isMeasuring,
          measurementComplete
        });

        // Check if finger was JUST REMOVED (was detected, now not detected) during measurement
        if (previousFingerStateRef.current && !newFingerDetected && isMeasuringRef.current && !measurementCompleteRef.current) {
          console.log("Finger removed during measurement - stopping timer and showing alert");
          showFingerRemovedNotification();
          setStatusMessage("❌ Finger removed! Please reinsert finger to RESTART measurement.");
          invalidateMeasurement(); // INVALIDATE AND RESET EVERYTHING
        }

        // Check if finger was JUST INSERTED (was not detected, now detected) AND sensor is ready
        if (!previousFingerStateRef.current && newFingerDetected && newSensorReady) {
          // NEW: Signal activity to InactivityWrapper - finger insertion counts as user activity!
          signalActivity();

          if (isMeasuringRef.current && !measurementCompleteRef.current) {
            // Finger was reinserted after removal - RESET TO 0 and start over
            console.log("Finger reinserted during measurement - resetting to 0 and starting over");
            resetAndStartMeasurement();
          } else if (!isMeasuringRef.current && !measurementCompleteRef.current) {
            // First time finger insertion - start measurement
            console.log("Finger detected for the first time - starting measurement");
            startMeasurement();
          }
        }

        // FAILSAFE: If backend says "Not Measuring" but frontend thinks "Measuring", sync up!
        // This handles cases where backend detected finger removal but frontend logic missed the edge trigger
        if (isMeasuringRef.current && measurementCompleteRef.current === false && data.measurement_started === false) {
          console.log("SYNC CHECK: Backend says measurement stopped. Invalidating...");
          // Only invalidate if we didn't just complete it (race condition check)
          invalidateMeasurement();
        }

        // Update previous state
        previousFingerStateRef.current = newFingerDetected;

        setFingerDetected(newFingerDetected);
        setSensorReady(newSensorReady);

      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 200); // Poll check every 200ms for faster response

    startMainPolling();
  };

  const startMeasurement = () => {
    console.log("Starting measurement for the first time");
    setStatusMessage("✅ Finger detected! Automatic measurement starting...");
    setMeasurementStep(3);
    setIsMeasuring(true);
    isMeasuringRef.current = true; // Update ref for polling interval

    setProgressSeconds(0); // Start from 0
    setProgressPercent(0);
    setCountdown(30);
    // Clear previous readings (both state and refs)
    setRespiratoryRateReadings([]);
    heartRateReadingsRef.current = [];
    spo2ReadingsRef.current = [];
    respiratoryRateReadingsRef.current = [];
    startProgressTimer();
    clearFingerRemovedAlert();
  };

  const invalidateMeasurement = () => {
    console.log("Invalidating measurement due to finger removal");
    stopProgressTimer();
    setIsMeasuring(false);
    isMeasuringRef.current = false; // Update ref

    // Reset Progress
    setProgressSeconds(0);
    setProgressPercent(0);
    setCountdown(30);

    // Clear Reading History (both state and refs)
    setRespiratoryRateReadings([]);
    heartRateReadingsRef.current = [];
    spo2ReadingsRef.current = [];
    respiratoryRateReadingsRef.current = [];

    // Reset Display Values
    setMeasurements({
      heartRate: "--",
      spo2: "--",
      respiratoryRate: "--"
    });

    // Reset Final Meas Ref
    finalMeasurementsRef.current = {
      heartRate: null,
      spo2: null,
      respiratoryRate: null
    };

    // Reset UI Step to "Ready" (Step 2) so it prompts for finger again
    setMeasurementStep(2);
  };

  const resetAndStartMeasurement = () => {
    console.log("Resetting measurement to 0 and starting over");
    stopProgressTimer();
    setProgressSeconds(0); // RESET TO 0
    setProgressPercent(0); // RESET PROGRESS TO 0%
    setCountdown(30); // RESET COUNTDOWN TO 30

    // CRITICAL: Clear ALL previous readings to prevent old data from mixing!
    setRespiratoryRateReadings([]);
    heartRateReadingsRef.current = [];
    spo2ReadingsRef.current = [];
    respiratoryRateReadingsRef.current = [];

    // Also reset displayed values to "--"
    setMeasurements({
      heartRate: "--",
      spo2: "--",
      respiratoryRate: "--"
    });

    setStatusMessage("✅ Finger detected! Measurement restarting from beginning...");
    setIsMeasuring(true);
    isMeasuringRef.current = true; // Update ref
    startProgressTimer(); // START COUNTING FROM 0
    clearFingerRemovedAlert();
  };

  const completeMeasurement = async () => {
    console.log("🏁 Measurement completion triggered");

    // 1. STOP TIMERS IMMEDIATELY
    stopProgressTimer();
    setIsMeasuring(false);
    isMeasuringRef.current = false; // Update ref

    // 2. CALCULATE RESULTS IMMEDIATELY (Move calculation to top)
    // USE REFS for readings (survives closures/re-renders)
    const hrReadings = heartRateReadingsRef.current;
    const spo2ReadingsData = spo2ReadingsRef.current;
    const rrReadings = respiratoryRateReadingsRef.current;

    console.log(`📊 Collected readings - HR: ${hrReadings.length}, SpO2: ${spo2ReadingsData.length}, RR: ${rrReadings.length}`);

    // Calculate averages from all collected readings (from refs)
    let avgHeartRate = "--";
    let avgSpo2 = "--";
    let avgRespiratoryRate = "--";

    // DEBUG: Log all readings
    console.log("DEBUG RAW READINGS FROM REFS:", { HR: hrReadings, SpO2: spo2ReadingsData, RR: rrReadings });

    // Filter out invalid readings (0 or negative values) before averaging
    const validHeartRateReadings = hrReadings.filter(val => val > 0 && val < 200);
    const validSpo2Readings = spo2ReadingsData.filter(val => val > 0 && val <= 100);
    const validRespiratoryRateReadings = rrReadings.filter(val => val > 0 && val < 60);

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

    // Determine final values
    let finalHeartRate = "--";
    let finalSpo2 = "--";
    let finalRespiratoryRate = "--";

    if (avgHeartRate !== "--") finalHeartRate = avgHeartRate;
    if (avgSpo2 !== "--") finalSpo2 = avgSpo2;
    if (avgRespiratoryRate !== "--") finalRespiratoryRate = avgRespiratoryRate;

    // Emergency Fallback: If absolutely NO valid data was collected
    if (finalHeartRate === "--" && validHeartRateReadings.length === 0 && hrReadings.length > 0) {
      finalHeartRate = hrReadings[hrReadings.length - 1].toString();
    }
    if (finalSpo2 === "--" && validSpo2Readings.length === 0 && spo2ReadingsData.length > 0) {
      finalSpo2 = spo2ReadingsData[spo2ReadingsData.length - 1].toString();
    }

    // 3. STORE FINAL RESULTS IN REFS (Critical for handleContinue)
    finalMeasurementsRef.current = {
      heartRate: finalHeartRate !== "--" ? parseInt(finalHeartRate) : null,
      spo2: finalSpo2 !== "--" ? parseInt(finalSpo2) : null,
      respiratoryRate: finalRespiratoryRate !== "--" ? parseInt(finalRespiratoryRate) : null
    };
    console.log("📌 Stored final measurements in ref:", finalMeasurementsRef.current);

    // 4. UPDATE UI STATE IMMEDIATELY (User sees results instantly)
    setMeasurements({
      heartRate: finalHeartRate,
      spo2: finalSpo2,
      respiratoryRate: finalRespiratoryRate
    });

    setMeasurementStep(4);
    setProgressPercent(100);
    setProgressSeconds(totalMeasurementTime);
    setCountdown(0);

    // Status Message
    const hasAnyData = finalHeartRate !== "--" || finalSpo2 !== "--" || finalRespiratoryRate !== "--";
    if (hasAnyData) {
      setStatusMessage("✅ Measurement Complete! Results ready.");
    } else {
      setStatusMessage("✅ Measurement Complete.");
    }

    // 5. ENABLE BUTTON (Now that data is ready)
    setMeasurementComplete(true);
    measurementCompleteRef.current = true; // Update ref

    // 6. STOP SENSOR IN BACKGROUND (Don't block UI)
    // Check if we are already stopping to prevent duplicate calls
    if (isStoppingRef.current) return;
    isStoppingRef.current = true;

    try {
      console.log("⏹️ Sending stop command to Arduino (Background)...");
      // Use no-await or catch to prevent blocking if this hangs
      sensorAPI.stopMax30102().then(() => {
        console.log("✅ Arduino MAX30102 stopped successfully");
        // Optional: Shutdown power after stop
        return sensorAPI.shutdownMax30102();
      }).then(() => {
        console.log("✅ MAX30102 sensor powered down");
      }).catch(err => {
        console.error("Background stop/shutdown error:", err);
      }).finally(() => {
        isStoppingRef.current = false;
      });
    } catch (error) {
      console.error("Error triggering background stop:", error);
      isStoppingRef.current = false;
    }

    clearFingerRemovedAlert();
  };

  const startMainPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();

        // SIMPLIFIED: Frontend controls timing, just collect live data from Arduino
        // Ensure values are whole numbers (integers)
        const liveHR = data.heart_rate ? Math.round(data.heart_rate) : data.heart_rate;
        const liveSpo2 = data.spo2 ? Math.round(data.spo2) : data.spo2;
        const liveRR = data.respiratory_rate ? Math.round(data.respiratory_rate) : data.respiratory_rate;

        // ONLY update UI and collect readings if we are actively measuring!
        if (isMeasuringRef.current) {
          // SIGNAL ACTIVITY to prevent timeout during measurement
          signalActivity();

          if (liveHR && liveHR > 0 && !isNaN(liveHR)) {
            updateCurrentMeasurement('heartRate', liveHR);
            // setHeartRateReadings(prev => [...prev, liveHR]); // PERFORMANCE: Removed state update to prevent re-renders
            heartRateReadingsRef.current.push(liveHR); // Store in ref!
          }
          if (liveSpo2 && liveSpo2 > 0 && !isNaN(liveSpo2)) {
            updateCurrentMeasurement('spo2', liveSpo2);
            // setSpo2Readings(prev => [...prev, liveSpo2]); // PERFORMANCE: Removed state update
            spo2ReadingsRef.current.push(liveSpo2); // Store in ref!
          }
          if (liveRR && liveRR > 0 && !isNaN(liveRR)) {
            updateCurrentMeasurement('respiratoryRate', liveRR);
            // setRespiratoryRateReadings(prev => [...prev, liveRR]); // PERFORMANCE: Removed state update
            respiratoryRateReadingsRef.current.push(liveRR); // Store in ref!
          }
        }

        // NOTE: NO backend completion check here - Frontend timer triggers completion!

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        if (isMeasuringRef.current) {
          setStatusMessage("⚠️ Connection issue, retrying...");
        }
      }
    }, 500); // Poll every 500ms to match Arduino's ~1s data rate
  };

  const updateCurrentMeasurement = (type, value) => {
    // CRITICAL: Prevent updating if measurement was just invalidated (race condition fix)
    if (!isMeasuringRef.current) return;

    const newVal = Math.round(value).toString();

    // Optimize: Only update state if value changed to prevent glitches/re-renders
    setMeasurements(prev => {
      // Double check inside updater for safety - if we reset to "--", don't overwrite!
      if (!isMeasuringRef.current) return prev;

      if (prev[type] === newVal) return prev;
      return {
        ...prev,
        [type]: newVal
      };
    });
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

    // FIXED: Read from ref instead of state to avoid stale closure issue
    // React state updates are async, so measurements state may still have old values
    const finalVals = finalMeasurementsRef.current;
    console.log("📖 Reading final measurements from ref:", finalVals);

    // Only add measurements if they have real values
    if (finalVals.heartRate !== null && !isNaN(finalVals.heartRate)) {
      vitalSignsData.heartRate = finalVals.heartRate;
    }
    if (finalVals.spo2 !== null && !isNaN(finalVals.spo2)) {
      vitalSignsData.spo2 = finalVals.spo2;
    }
    if (finalVals.respiratoryRate !== null && !isNaN(finalVals.respiratoryRate)) {
      vitalSignsData.respiratoryRate = finalVals.respiratoryRate;
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
      return "Continue";
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

  // eslint-disable-next-line no-unused-vars
  const getCardStatus = () => {
    if (measurementComplete) return "complete";
    if (isMeasuring) return "measuring";
    return "ready";
  };

  // eslint-disable-next-line no-unused-vars
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

  const confirmExit = async () => {
    try {
      await sensorAPI.reset();
    } catch (e) {
      console.error("Error resetting sensors:", e);
    }
    setShowExitModal(false);
    navigate("/login");
  };

  // Initialize sensors ONCE - Moved to end to ensure functions are defined
  useEffect(() => {
    // Reset inactivity setting on mount (timer enabled by default)
    setIsInactivityEnabled(true);

    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 Max30102 received location.state:", location.state);

    initializeMax30102Sensor();

    return () => {
      clearTimeout(timer);
      stopAllTimers();
      clearFingerRemovedAlert();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container max30102-page"
    >
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>




        {/* Progress bar for Step X of Y */}
        {/* Progress bar for Step X of Y */}
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
                {Math.round(progressPercent)}% - {countdown}s remaining
              </span>
            </div>
          )}
        </div>

        <div className="w-100">

          {/* Pulse Oximeter Display */}
          <div className="d-flex justify-content-center mb-4">
            <div className={`oximeter-display ${getSensorState()}`}>
              <img
                src={oximeterImage}
                alt="Pulse Oximeter"
                className="oximeter-image"
              />
            </div>
          </div>

          {/* Vital Signs Cards - Much Larger and Optimized Layout */}
          <div className="row g-4 justify-content-center mb-4">
            {/* Heart Rate Card */}
            <div className="col-12 col-md-4">
              <div className={`measurement-card h-100 status-${getStatusColor('heartRate', measurements.heartRate)}`}>
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
              <div className={`measurement-card h-100 status-${getStatusColor('spo2', measurements.spo2)}`}>
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
              <div className={`measurement-card h-100 status-${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
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
                  <div className="instruction-icon">
                    <img src={step1Icon} alt="Insert Finger" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">Left Index Finger</h4>
                  <p className="instruction-text">
                    Place your left index finger on the pulse oximeter
                  </p>
                </div>
              </div>

              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon">
                    <img src={step2Icon} alt="Hold Steady" className="step-icon-image" />
                  </div>
                  <h4 className="instruction-title">Hold Steady</h4>
                  <p className="instruction-text">
                    Keep your finger completely still for accurate readings
                  </p>
                  {/* Timer removed to prevent duplication */}
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

        {/* Button Section */}
        <div className="measurement-navigation mt-5">
          <button
            className="measurement-button"
            onClick={handleContinue}
            disabled={!measurementComplete}
          >
            {getButtonText()}
          </button>
        </div>
      </div>

      {/* Finger Removed Modal - Moved to root level for proper overlay */}
      {showFingerRemovedAlert && (
        <div className="exit-modal-overlay" onClick={clearFingerRemovedAlert}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-modal-icon" style={{ background: 'linear-gradient(135deg, #ff9f43, #ff6b6b)' }}>
              <span>⚠️</span>
            </div>
            <h2 className="exit-modal-title">Finger Removed</h2>
            <p className="exit-modal-message">Please reinsert your finger to continue the measurement.</p>
            <div className="exit-modal-buttons">
              <button
                className="exit-modal-button secondary"
                onClick={clearFingerRemovedAlert}
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modern Exit Confirmation Popup Modal */}
      {
        showExitModal && (
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
        )
      }
    </div >
  );
}