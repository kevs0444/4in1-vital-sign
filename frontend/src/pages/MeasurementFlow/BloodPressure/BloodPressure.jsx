import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BloodPressure.css";
import bpIcon from "../../../assets/icons/bp-icon.png";
import { sensorAPI } from "../../../utils/api";

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
    
    console.log("🚀 BloodPressure complete - navigating to AI Loading with data:", completeVitalSignsData);
    
    // Navigate to AI Loading
    navigate("/measure/ai-loading", { 
      state: completeVitalSignsData 
    });
  };

  const getBloodPressureStatus = (sys, dia) => {
    if (!sys || !dia || sys === "--" || dia === "--") {
      return { 
        text: "Not measured", 
        class: "default",
        description: "Blood pressure not measured yet"
      };
    }
    
    const systolicValue = parseInt(sys);
    const diastolicValue = parseInt(dia);
    
    if (systolicValue >= 180 || diastolicValue >= 120) {
      return { 
        text: "Hypertensive Crisis", 
        class: "critical",
        description: "Your blood pressure requires immediate attention"
      };
    } else if (systolicValue >= 140 || diastolicValue >= 90) {
      return { 
        text: "Hypertension Stage 2", 
        class: "critical",
        description: "Your blood pressure indicates severe hypertension"
      };
    } else if (systolicValue >= 130 || diastolicValue >= 80) {
      return { 
        text: "Hypertension Stage 1", 
        class: "elevated",
        description: "Your blood pressure is elevated"
      };
    } else if (systolicValue >= 120) {
      return { 
        text: "Elevated", 
        class: "elevated",
        description: "Your blood pressure is slightly elevated"
      };
    } else {
      return { 
        text: "Normal", 
        class: "normal",
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
      class: 'ready',
      description: 'Ready for blood pressure measurement'
    };
  };

  const getButtonText = () => {
    switch (measurementStep) {
      case 1:
        return "Start Measurement";
      case 2:
        return `Measuring... ${countdown}s`;
      case 3:
        return "Continue to AI Results";
      default:
        return "Start Measurement";
    }
  };

  const getButtonAction = () => {
    switch (measurementStep) {
      case 1:
        return startMeasurement;
      case 2:
        return () => {}; // No action during measurement
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

  return (
    <div className="bp-container">
      <div className={`bp-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress bar for Step 4 of 4 */}
        <div className="bp-progress-container">
          <div className="bp-progress-bar">
            <div className="bp-progress-fill" style={{ width: `100%` }}></div>
          </div>
          <span className="bp-progress-step">Step 4 of 4 - Blood Pressure</span>
        </div>

        <div className="bp-header">
          <h1 className="bp-title">Blood Pressure Measurement</h1>
          <p className="bp-subtitle">
            {statusMessage}
            <span style={{display: 'block', fontSize: '0.7rem', color: '#ff6b35', marginTop: '5px'}}>
              🔄 Simulation Mode - Using test data for demonstration
            </span>
          </p>
          {retryCount > 0 && (
            <div className="bp-retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="bp-measurement-progress">
              <div className="bp-progress-bar-horizontal">
                <div 
                  className="bp-progress-fill-horizontal" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="bp-progress-text">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="bp-sensor-display-section">
          {/* Single Blood Pressure Display - Shows live reading and result */}
          <div className="bp-display-container">
            <div className={`bp-display ${
              bpMeasuring ? 'measuring-active' : 
              bpComplete ? 'measurement-complete' : ''
            } ${statusInfo.class}`}>
              <div className="bp-icon">
                <img src={bpIcon} alt="Blood Pressure Icon" className="bp-image"/>
              </div>
              
              <div className="bp-display-content">
                <h3 className="bp-display-title">
                  {measurementComplete ? "Blood Pressure Result" : "Blood Pressure"}
                </h3>
                
                <div className="bp-value-display">
                  <span className={`bp-display-value ${
                    bpMeasuring ? 'measuring-live' : ''
                  }`}>
                    {displayValue}
                  </span>
                  <span className="bp-display-unit">mmHg</span>
                </div>
                
                <div className="bp-status-info">
                  <span className={`bp-status ${statusInfo.class}`}>
                    {statusInfo.text}
                  </span>
                  <div className="bp-description">
                    {statusInfo.description}
                  </div>
                </div>
                
                {bpMeasuring && (
                  <div className="bp-live-reading-indicator">
                    🔄 Measuring Blood Pressure...
                  </div>
                )}
                
                <div style={{
                  fontSize: '0.7rem',
                  color: '#ff6b35',
                  marginTop: '8px',
                  fontWeight: '600'
                }}>
                  🔄 Simulation Mode - Test Data
                </div>
              </div>
            </div>
          </div>

          {/* INSTRUCTION DISPLAY - Simplified workflow */}
          <div className="bp-instruction-container">
            <div className="bp-instruction-cards-horizontal">
              {/* Step 1 Card - Ready for Measurement */}
              <div className={`bp-instruction-card-step ${
                measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''
              }`}>
                <div className="bp-step-number-circle">1</div>
                <div className="bp-step-icon">🩺</div>
                <h4 className="bp-step-title">Ready</h4>
                <p className="bp-step-description">
                  Click Start to begin measurement
                </p>
                <div className={`bp-step-status ${
                  measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 1 ? (measurementStep > 1 ? 'Completed' : 'Ready') : 'Pending'}
                </div>
              </div>

              {/* Step 2 Card - Measurement in Progress */}
              <div className={`bp-instruction-card-step ${
                measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''
              }`}>
                <div className="bp-step-number-circle">2</div>
                <div className="bp-step-icon">📊</div>
                <h4 className="bp-step-title">Measuring</h4>
                <p className="bp-step-description">
                  Blood pressure measurement in progress
                </p>
                {bpMeasuring && countdown > 0 && (
                  <div className="bp-countdown-mini">
                    <div className="bp-countdown-mini-circle">
                      <span className="bp-countdown-mini-number">{countdown}</span>
                    </div>
                    <span className="bp-countdown-mini-text">seconds remaining</span>
                  </div>
                )}
                <div className={`bp-step-status ${
                  measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 2 ? (measurementStep > 2 ? 'Completed' : 'Measuring') : 'Pending'}
                </div>
              </div>

              {/* Step 3 Card - Results Complete */}
              <div className={`bp-instruction-card-step ${
                measurementStep >= 3 ? 'completed' : ''
              }`}>
                <div className="bp-step-number-circle">3</div>
                <div className="bp-step-icon">🤖</div>
                <h4 className="bp-step-title">AI Results</h4>
                <p className="bp-step-description">
                  View complete AI analysis and results
                </p>
                <div className={`bp-step-status ${
                  measurementStep >= 3 ? 'completed' : 'pending'
                }`}>
                  {measurementStep >= 3 ? 'Ready' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="bp-continue-button-container">
          <button 
            className={`bp-continue-button ${
              measurementStep === 1 ? 'measurement-action' : 
              measurementStep === 2 ? 'measuring-action' : 
              'ai-results-action'
            }`}
            onClick={getButtonAction()} 
            disabled={getButtonDisabled()}
          >
            {measurementStep === 2 && (
              <div className="bp-spinner"></div>
            )}
            {getButtonText()}
            {measurementComplete && (
              <span style={{fontSize: '0.8rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
                BP: {systolic}/{diastolic} mmHg
              </span>
            )}
          </button>
          
          {/* Debug info */}
          <div style={{ 
            marginTop: '10px', 
            fontSize: '0.7rem', 
            color: '#666',
            textAlign: 'center',
            padding: '5px',
            background: '#f5f5f5',
            borderRadius: '5px',
            fontFamily: 'monospace'
          }}>
            Step: {measurementStep} | 
            Mode: 🔄 SIMULATION | 
            Status: {measurementComplete ? '✅ COMPLETE' : (bpMeasuring ? '⏳ MEASURING' : '🟢 READY')} | 
            BP: {systolic || '--'}/{diastolic || '--'} |
            Next: /measure/ai-loading
          </div>
        </div>
      </div>
    </div>
  );
}