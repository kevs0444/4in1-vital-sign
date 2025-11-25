import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BloodPressure.css";
import "../main-components-measurement.css";
import bpIcon from "../../../assets/icons/bp-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";

export default function BloodPressure() {
  const navigate = useNavigate();
  const location = useLocation();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing blood pressure monitor...");
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);

  // Interactive state variables
  const [bpMeasuring, setBpMeasuring] = useState(false);
  const [bpComplete, setBpComplete] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(1); // Start at step 1: Ready for measurement

  const MAX_RETRIES = 3;

  const countdownRef = useRef(null);
  const progressIntervalRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 BloodPressure received location.state:", location.state);
    initializeBloodPressureSensor();

    return () => {
      clearTimeout(timer);
      stopAllTimers();
    };
  }, []);

  const initializeBloodPressureSensor = async () => {
    try {
      setStatusMessage("🔄 Initializing blood pressure monitor...");

      // Always use simulation mode for now
      setStatusMessage("✅ Blood pressure monitor ready - Click 'Start Measurement' to begin");
      setMeasurementStep(1); // Ready for measurement

    } catch (error) {
      console.error("Blood pressure initialization error:", error);
      setStatusMessage("✅ Using simulation mode - Click 'Start Measurement' to begin");
      setMeasurementStep(1); // Ready for measurement
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
    try {
      setStatusMessage("Starting blood pressure measurement...");
      setBpMeasuring(true);
      setMeasurementStep(2); // Move to step 2: Measuring
      setProgress(0);

      // Clear any previous measurement
      setSystolic("");
      setDiastolic("");

      // Simulate measurement with progress
      startCountdown(8); // 8 seconds countdown for simulation

      let progressValue = 0;
      progressIntervalRef.current = setInterval(() => {
        progressValue += 12.5; // 8 steps to 100%
        setProgress(progressValue);

        if (progressValue >= 100) {
          clearInterval(progressIntervalRef.current);
          // Generate final random blood pressure
          const bp = generateRandomBloodPressure();
          setSystolic(bp.systolic.toString());
          setDiastolic(bp.diastolic.toString());
          setMeasurementComplete(true);
          setBpComplete(true);
          setBpMeasuring(false);
          setMeasurementStep(3); // Move to step 3: Results complete
          setStatusMessage("✅ Blood Pressure Measurement Complete!");
          stopCountdown();
        }
      }, 1000);

    } catch (error) {
      console.error("Start blood pressure error:", error);
      setStatusMessage("❌ Failed to start measurement");
      setBpMeasuring(false);
      setMeasurementStep(1); // Return to ready state
      handleRetry();
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);

      setTimeout(() => {
        initializeBloodPressureSensor();
      }, 2000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please try again.");
      stopAllTimers();
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !systolic || !diastolic) return;

    stopAllTimers();

    // Prepare complete data to pass to AI Results
    const completeVitalSignsData = {
      ...location.state, // This includes all previous data
      systolic: systolic ? parseFloat(systolic) : null,
      diastolic: diastolic ? parseFloat(diastolic) : null,
      bloodPressure: `${systolic}/${diastolic}`,
      measurementTimestamp: new Date().toISOString()
    };

    console.log("🚀 BloodPressure complete - navigating to next step with data:", completeVitalSignsData);

    // Navigate to next step or results
    const nextPath = getNextStepPath('bloodpressure', location.state?.checklist);
    navigate(nextPath, {
      state: completeVitalSignsData
    });
  };

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

  const getButtonText = () => {
    const isLast = isLastStep('bloodpressure', location.state?.checklist);

    switch (measurementStep) {
      case 1:
        return "Start BP Measurement";
      case 2:
        return `Measuring... ${countdown}s`;
      case 3:
        return isLast ? "Continue to Result" : "Continue to Next Step";
      default:
        return "Start BP Measurement";
    }
  };

  const getButtonAction = () => {
    switch (measurementStep) {
      case 1:
        return startMeasurement;
      case 2:
        return () => { }; // No action during measurement
      case 3:
        return handleContinue;
      default:
        return startMeasurement;
    }
  };

  const getButtonDisabled = () => {
    return measurementStep === 2; // Disable only during measurement
  };

  const statusInfo = getCurrentStatusInfo();
  const displayValue = getCurrentDisplayValue();
  const progressInfo = getProgressInfo('bloodpressure', location.state?.checklist);

  return (
    <div className="measurement-container">
      <div className={`measurement-content ${isVisible ? 'visible' : ''}`}>

        {/* Progress bar for Step X of Y */}
        <div className="measurement-progress-container">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${progressInfo.percentage}%` }}></div>
          </div>
          <span className="measurement-progress-step">
            Step {progressInfo.currentStep} of {progressInfo.totalSteps} - Blood Pressure
          </span>
        </div>

        <div className="measurement-header">
          <h1 className="measurement-title">Blood <span className="measurement-title-accent">Pressure</span></h1>
          <p className="measurement-subtitle">
            {statusMessage}
          </p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="measurement-progress-container" style={{ width: '50%', margin: '0 auto' }}>
              <div className="measurement-progress-bar">
                <div
                  className="measurement-progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="measurement-progress-step" style={{ textAlign: 'center' }}>{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="measurement-display-section">
          {/* Single Blood Pressure Display - Shows live reading and result */}
          <div className={`measurement-card ${bpMeasuring ? 'active' : ''} ${bpComplete ? 'completed' : ''}`} style={{ minWidth: '320px', minHeight: '320px' }}>
            <div className="measurement-icon" style={{ width: '80px', height: '80px', marginBottom: '20px' }}>
              <img src={bpIcon} alt="Blood Pressure Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>

            <h3 className="instruction-title" style={{ fontSize: '1.5rem' }}>
              {measurementComplete ? "Blood Pressure Result" : "Blood Pressure"}
            </h3>

            <div className="measurement-value-container">
              <span className="measurement-value" style={{ fontSize: '3.5rem' }}>
                {displayValue}
              </span>
              <span className="measurement-unit">mmHg</span>
            </div>

            <div className="measurement-status-badge-container" style={{ marginTop: '15px', textAlign: 'center' }}>
              <span className={`measurement-status-badge ${statusInfo.class}`}>
                {statusInfo.text}
              </span>
              <div className="instruction-text" style={{ marginTop: '10px' }}>
                {statusInfo.description}
              </div>
            </div>

            {bpMeasuring && (
              <div style={{ color: '#17a2b8', fontWeight: 'bold', marginTop: '15px' }}>
                🔄 Measuring Blood Pressure...
              </div>
            )}
          </div>

          {/* INSTRUCTION DISPLAY - Simplified workflow */}
          <div className="measurement-instruction-container">
            <div className="instruction-cards">
              {/* Step 1 Card - Ready for Measurement */}
              <div className={`instruction-card ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                <div className="instruction-step-number">1</div>
                <div className="instruction-icon">🩺</div>
                <h4 className="instruction-title">Ready</h4>
                <p className="instruction-text">
                  Click Start to begin measurement
                </p>
              </div>

              {/* Step 2 Card - Measurement in Progress */}
              <div className={`instruction-card ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                <div className="instruction-step-number">2</div>
                <div className="instruction-icon">📊</div>
                <h4 className="instruction-title">Measuring</h4>
                <p className="instruction-text">
                  Blood pressure measurement in progress
                </p>
                {bpMeasuring && countdown > 0 && (
                  <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '5px' }}>
                    {countdown}s remaining
                  </div>
                )}
              </div>

              {/* Step 3 Card - Results Complete */}
              <div className={`instruction-card ${measurementStep >= 3 ? 'completed' : ''}`}>
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

        <div className="measurement-action-container">
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
        </div>
      </div>
    </div>
  );
}