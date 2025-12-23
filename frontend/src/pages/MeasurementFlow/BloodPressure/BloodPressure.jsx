import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useInactivity } from "../../../components/InactivityWrapper/InactivityWrapper";
import "./BloodPressure.css";
import "../main-components-measurement.css";
import bpIcon from "../../../assets/icons/bp-icon.png";
import { cameraAPI, sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";
import { speak } from "../../../utils/speech";

export default function BloodPressure() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setIsInactivityEnabled } = useInactivity();
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

  useEffect(() => {
    // Reset inactivity setting on mount (timer enabled by default)
    setIsInactivityEnabled(true);

    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 BloodPressure received location.state:", location.state);

    // Call init
    initializeBloodPressureSensor();

    return () => {
      clearTimeout(timer);
      stopAllTimers();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync inactivity with measurement
  useEffect(() => {
    // If measuring/analyzing, DISABLE inactivity (enabled = false)
    // If NOT measuring, ENABLE inactivity (enabled = true)
    setIsInactivityEnabled(!isMeasuring && !isAnalyzing);
  }, [isMeasuring, isAnalyzing, setIsInactivityEnabled]);

  // Voice Instructions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (measurementStep === 1) {
        speak("Step 1. Ready. Click Start to begin measurement.");
      } else if (measurementStep === 2) {
        speak("Step 2. Measuring. Blood pressure measurement in progress.");
      } else if (measurementStep === 3) {
        speak("Step 3. AI Results. View complete AI analysis and results.");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [measurementStep]);

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

  const startMeasurement = async () => {
    // REFACTORED: No more simulation. Clicking start opens the camera.
    startCameraMode();
  };

  // --- HELPER FUNCTIONS (Defined before use) ---

  const getBloodPressureStatus = (sys, dia) => {
    if (!sys || !dia || sys === "--" || dia === "--") {
      return {
        text: "Not measured",
        class: "pending",
        description: "Blood pressure not measured yet"
      };
    }

    const systolicValue = parseInt(sys);
    const diastolicValue = parseInt(dia);

    if (systolicValue >= 180 || diastolicValue >= 120) {
      return {
        text: "Hypertensive Crisis",
        class: "error",
        description: "Your blood pressure requires immediate attention"
      };
    } else if (systolicValue >= 140 || diastolicValue >= 90) {
      return {
        text: "Hypertension Stage 2",
        class: "error",
        description: "Your blood pressure indicates severe hypertension"
      };
    } else if (systolicValue >= 130 || diastolicValue >= 80) {
      return {
        text: "Hypertension Stage 1",
        class: "warning",
        description: "Your blood pressure is elevated"
      };
    } else if (systolicValue >= 120) {
      return {
        text: "Elevated",
        class: "warning",
        description: "Your blood pressure is slightly elevated"
      };
    } else {
      return {
        text: "Normal",
        class: "complete",
        description: "Your blood pressure is within normal range"
      };
    }
  };

  const getCurrentDisplayValue = () => {
    if (measurementComplete && systolic && diastolic) {
      return `${systolic}/${diastolic}`;
    }
    return "--/--";
  };

  const getCurrentStatusInfo = () => {
    if (measurementComplete && systolic && diastolic) {
      return getBloodPressureStatus(systolic, diastolic);
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

  const startCameraMode = async () => {
    setIsCameraMode(true);
    setStatusMessage("Starting camera...");
    try {
      await cameraAPI.start();
      await cameraAPI.setMode('reading');
      setStatusMessage("Position the digital BP monitor in the frame");
    } catch (err) {
      console.error("Camera start error:", err);
      setStatusMessage("❌ Camera failed to start");
    }
  };

  const stopCameraMode = async () => {
    try {
      await cameraAPI.stop();
      // CRITICAL: Reset mode to 'feet' so we don't break compliance checks in other steps
      await cameraAPI.setMode('feet');
    } catch (e) { console.error(e) }

    setIsCameraMode(false);
    setStatusMessage("✅ Ready to scan");
  };

  const captureAndAnalyze = async () => {
    try {
      setIsAnalyzing(true);
      setStatusMessage("🧠 Cloud AI Reading Display...");

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

  const handleContinue = () => {
    if (!measurementComplete || !systolic || !diastolic) return;
    stopAllTimers();

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
    return "Scan Monitor with Camera";
  };

  const getButtonAction = () => {
    if (measurementStep === 3) return handleContinue;
    return startCameraMode;
  };

  const getButtonDisabled = () => {
    return false;
  };

  const handleBack = () => {
    if (measurementStep > 1) {
      stopAllTimers();
      setBpMeasuring(false);
      setMeasurementStep(1);
      setStatusMessage("✅ Blood pressure monitor ready - Click 'Start Measurement' to begin");
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

                {isCameraMode ? (
                  <div className="camera-interface w-100 d-flex flex-column align-items-center">
                    <div className="camera-frame-container shadow-sm" style={{
                      width: '100%', maxWidth: '400px', height: '300px',
                      background: '#000', position: 'relative',
                      borderRadius: '16px', overflow: 'hidden', border: '2px solid #333'
                    }}>
                      <div className="camera-feed-wrapper" style={{ width: '100%', height: '100%', position: 'relative' }}>
                        <img
                          src="http://localhost:5000/api/camera/video_feed"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          alt="Camera Stream"
                        />

                        {/* --- THE ALIGNMENT GRID --- */}
                        {/* This SVG acts as the template for the user to align the monitor */}
                        <div style={{
                          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                          pointerEvents: 'none' // Allow clicks to pass through
                        }}>
                          <svg width="100%" height="100%">
                            <defs>
                              <mask id="grid-mask">
                                {/* Visible parts */}
                                <rect width="100%" height="100%" fill="white" opacity="0.5" />
                                {/* Cut holes for the numbers */}
                                <rect x="20%" y="20%" width="60%" height="20%" rx="5" fill="black" /> {/* SYS */}
                                <rect x="25%" y="45%" width="50%" height="20%" rx="5" fill="black" /> {/* DIA */}
                                <rect x="35%" y="70%" width="30%" height="15%" rx="5" fill="black" /> {/* PULSE */}
                              </mask>
                            </defs>

                            {/* Darken area outside boxes */}
                            <rect width="100%" height="100%" fill="rgba(0,0,0,0.6)" mask="url(#grid-mask)" />

                            {/* Guide Lines & Labels - GREEN */}
                            <g stroke="#00ff00" strokeWidth="2" fill="none">
                              <rect x="20%" y="20%" width="60%" height="20%" rx="5" />
                              <rect x="25%" y="45%" width="50%" height="20%" rx="5" />
                            </g>

                            {/* Labels */}
                            <text x="50%" y="18%" textAnchor="middle" fill="#00ff00" fontSize="14" fontWeight="bold">SYS (Top)</text>
                            <text x="50%" y="43%" textAnchor="middle" fill="#00ff00" fontSize="14" fontWeight="bold">DIA (Middle)</text>
                          </svg>
                        </div>
                      </div>

                      {isAnalyzing && (
                        <div style={{
                          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                          background: 'rgba(0,0,0,0.8)', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column',
                          zIndex: 10
                        }}>
                          <div className="spinner mb-3"></div>
                          <span className="fw-bold">AI Reading Template...</span>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 w-100 d-flex justify-content-center gap-3">
                      <button className="btn btn-light border px-4 py-2 rounded-pill" onClick={stopCameraMode} disabled={isAnalyzing}>
                        Cancel
                      </button>
                      <button className="btn btn-primary px-4 py-2 rounded-pill d-flex align-items-center gap-2"
                        onClick={captureAndAnalyze} disabled={isAnalyzing}
                        style={{ backgroundColor: '#28a745', border: 'none' }}>
                        <span style={{ fontSize: '1.2rem' }}>📸</span> Capture Grid
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
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

                    <div className="text-center mt-3">
                      <span className={`measurement-status-badge ${statusInfo.class}`}>
                        {statusInfo.text}
                      </span>
                      <div className="instruction-text mt-2">
                        {statusInfo.description}
                      </div>
                    </div>

                    {bpMeasuring && (
                      <div className="text-info fw-bold mt-3">
                        🔄 Measuring Blood Pressure...
                      </div>
                    )}
                  </>
                )}
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
                    Click Start to begin measurement
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
                  <div className="instruction-icon">🤖</div>
                  <h4 className="instruction-title">AI Results</h4>
                  <p className="instruction-text">
                    View complete AI analysis and results
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-navigation mt-5 d-flex flex-column align-items-center gap-3">
          {!isCameraMode && (
            <button
              className="measurement-button"
              onClick={getButtonAction()}
              disabled={getButtonDisabled()}
            >
              {measurementStep === 2 && (
                <div className="spinner"></div>
              )}
              {getButtonText()}
            </button>
          )}

          {measurementStep === 1 && !isCameraMode && (
            <button
              className="btn btn-link text-muted text-decoration-none"
              onClick={startCameraMode}
              style={{ fontSize: '1rem' }}
            >
              📷 Use Camera to Read Monitor
            </button>
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
    </div>
  );
}