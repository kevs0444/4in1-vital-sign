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
  const [liveReading, setLiveReading] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  
  // New interactive state variables
  const [bpMeasuring, setBpMeasuring] = useState(false);
  const [bpComplete, setBpComplete] = useState(false);
  const [liveBpValue, setLiveBpValue] = useState("");
  const [measurementStep, setMeasurementStep] = useState(1); // Start at step 1: Ready for measurement

  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const bpIntervalRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeBloodPressureSensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      clearSimulatedMeasurements();
      stopCountdown();
    };
  }, []);

  const initializeBloodPressureSensor = async () => {
    try {
      setStatusMessage("Powering up blood pressure monitor...");
      const prepareResult = await sensorAPI.prepareBloodPressure();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("✅ Blood pressure monitor ready - Click 'Start Measurement' to begin");
      setMeasurementStep(1); // Ready for measurement
      startMonitoring();
      
    } catch (error) {
      console.error("Blood pressure initialization error:", error);
      setStatusMessage("❌ Failed to initialize blood pressure monitor");
      handleRetry();
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

  const clearSimulatedMeasurements = () => {
    if (bpIntervalRef.current) {
      clearInterval(bpIntervalRef.current);
      bpIntervalRef.current = null;
    }
  };

  const startMonitoring = () => {
    stopMonitoring();
    
    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getBloodPressureStatus();
        console.log("Blood pressure status:", data);
        
        setIsMeasuring(data.measurement_active);
        setIsReady(data.is_ready_for_measurement);
        
        // Update live reading during measurement
        if (data.live_pressure !== null && data.live_pressure !== undefined && bpMeasuring) {
          setLiveReading(data.live_pressure.toFixed(0));
          setLiveBpValue(data.live_pressure.toFixed(0));
        }

        // Handle progress during active measurement
        if (data.status && data.status.includes('bp_progress')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = parseInt(progressParts[2]);
          const progressPercent = (elapsed / total) * 100;
          setProgress(progressPercent);
          setStatusMessage(`Measuring blood pressure... ${total - elapsed}s`);
        }
        
        // Handle final result - AUTOMATICALLY from backend
        if (data.systolic !== null && data.systolic !== undefined && 
            data.diastolic !== null && data.diastolic !== undefined) {
          if (data.systolic >= 60 && data.systolic <= 250 && 
              data.diastolic >= 40 && data.diastolic <= 150) {
            // Valid blood pressure received - AUTOMATIC RESULT
            setSystolic(data.systolic.toFixed(0));
            setDiastolic(data.diastolic.toFixed(0));
            setMeasurementComplete(true);
            setBpComplete(true);
            setBpMeasuring(false);
            setMeasurementStep(3); // Move to step 3: Results complete
            setStatusMessage("✅ Blood Pressure Measurement Complete!");
            setProgress(100);
            stopMonitoring();
            clearSimulatedMeasurements();
            stopCountdown();
          } else {
            // Invalid blood pressure, retry
            setStatusMessage("❌ Invalid blood pressure reading, retrying...");
            handleRetry();
          }
        }

        // Handle status messages
        switch (data.status) {
          case 'bp_measurement_started':
            setStatusMessage("Blood pressure measurement in progress...");
            setBpMeasuring(true);
            setMeasurementStep(2); // Move to step 2: Measuring
            startSimulatedMeasurement();
            startCountdown(15); // Longer countdown for BP measurement
            break;
          case 'bp_measurement_complete':
            // Handled above with data.systolic/diastolic check
            break;
          case 'error':
          case 'bp_reading_invalid':
            setStatusMessage("❌ Measurement failed, retrying...");
            handleRetry();
            break;
          default:
            // Show sensor status
            if (data.sensor_prepared && !data.measurement_active && !measurementComplete) {
              if (!data.live_pressure && measurementStep === 1) {
                setStatusMessage("✅ Monitor ready - Click 'Start Measurement' to begin");
              }
            }
            break;
        }

      } catch (error) {
        console.error("Error polling blood pressure status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const startSimulatedMeasurement = () => {
    clearSimulatedMeasurements();
    let simulatedSystolic = 120;
    let simulatedDiastolic = 80;
    bpIntervalRef.current = setInterval(() => {
      simulatedSystolic += (Math.random() - 0.5) * 2;
      simulatedDiastolic += (Math.random() - 0.5) * 1.5;
      
      // Keep within reasonable bounds
      if (simulatedSystolic > 140) simulatedSystolic = 140 - Math.random() * 5;
      if (simulatedSystolic < 100) simulatedSystolic = 100 + Math.random() * 5;
      if (simulatedDiastolic > 90) simulatedDiastolic = 90 - Math.random() * 3;
      if (simulatedDiastolic < 60) simulatedDiastolic = 60 + Math.random() * 3;
      
      setLiveBpValue(`${Math.round(simulatedSystolic)}/${Math.round(simulatedDiastolic)}`);
    }, 500);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("Starting blood pressure measurement...");
      setBpMeasuring(true);
      setMeasurementStep(2); // Move to step 2: Measuring
      const response = await sensorAPI.startBloodPressure();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        setBpMeasuring(false);
        setMeasurementStep(1); // Return to ready state
        handleRetry();
      } else {
        setStatusMessage("Blood pressure measurement started...");
        startSimulatedMeasurement();
        startCountdown(15);
      }
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
      setStatusMessage("❌ Maximum retries reached. Please check the monitor.");
      clearSimulatedMeasurements();
      stopCountdown();
    }
  };

  const stopMonitoring = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !systolic || !diastolic) return;
    
    stopMonitoring();
    clearSimulatedMeasurements();
    stopCountdown();
    
    // Prepare complete data to pass to AI Results
    const completeVitalSignsData = {
      ...location.state, // This includes all previous data (BMI, temperature, pulse oximeter)
      weight: location.state?.weight,
      height: location.state?.height,
      temperature: location.state?.temperature,
      heartRate: location.state?.heartRate,
      spo2: location.state?.spo2,
      respiratoryRate: location.state?.respiratoryRate,
      systolic: systolic ? parseFloat(systolic) : null,
      diastolic: diastolic ? parseFloat(diastolic) : null,
      bloodPressure: `${systolic}/${diastolic}`,
      measurementTimestamp: new Date().toISOString()
    };
    
    console.log("🚀 Continuing to AI Results with complete data:", completeVitalSignsData);
    
    // ✅ FIXED: Ensure correct navigation path
    navigate("/measure/ai-loading", { 
      state: completeVitalSignsData 
    });
  };

  const getBloodPressureStatus = (sys, dia) => {
    if (!sys || !dia || sys === "--" || dia === "--") {
      return { text: "Not measured", class: "default" };
    }
    
    const systolicValue = parseInt(sys);
    const diastolicValue = parseInt(dia);
    
    if (systolicValue >= 180 || diastolicValue >= 120) {
      return { text: "Hypertensive Crisis", class: "fever" };
    } else if (systolicValue >= 140 || diastolicValue >= 90) {
      return { text: "Hypertension Stage 2", class: "fever" };
    } else if (systolicValue >= 130 || diastolicValue >= 80) {
      return { text: "Hypertension Stage 1", class: "low" };
    } else if (systolicValue >= 120) {
      return { text: "Elevated", class: "low" };
    } else {
      return { text: "Normal", class: "normal" };
    }
  };

  const getButtonText = () => {
    switch (measurementStep) {
      case 1:
        return "Start Measurement";
      case 2:
        return "Measuring Blood Pressure...";
      case 3:
        return "Go to AI Results";
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

  const statusInfo = getBloodPressureStatus(systolic, diastolic);

  return (
    <div className="bloodpressure-container">
      <div className={`bloodpressure-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress bar for Step 4 of 4 */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `100%` }}></div>
          </div>
          <span className="progress-step">Step 4 of 4 - Blood Pressure</span>
        </div>

        <div className="bloodpressure-header">
          <h1 className="bloodpressure-title">Blood Pressure Measurement</h1>
          <p className="bloodpressure-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          {/* Single Blood Pressure Card */}
          <div className="bloodpressure-card-container">
            <div className={`measurement-card bloodpressure-card ${
              bpMeasuring ? 'measuring-active' : 
              bpComplete ? 'measurement-complete' : ''
            }`}>
              <div className="measurement-icon">
                <img src={bpIcon} alt="Blood Pressure Icon" className="measurement-image"/>
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Blood Pressure</h3>
                <div className="measurement-value">
                  <span className={`value ${
                    bpMeasuring ? 'measuring-live' : ''
                  }`}>
                    {bpMeasuring ? (liveBpValue || "000/00") : 
                     (systolic && diastolic ? `${systolic}/${diastolic}` : "--/--")}
                  </span>
                  <span className="unit">mmHg</span>
                </div>
                <span className={`measurement-status ${statusInfo.class}`}>
                  {statusInfo.text}
                </span>
                {bpMeasuring && (
                  <div className="live-indicator">Live Reading</div>
                )}
              </div>
            </div>
          </div>

          {/* Blood Pressure Result Card - Automatically shown when results are available */}
          {measurementComplete && systolic && diastolic && (
            <div className="bloodpressure-card-container">
              <div className="bp-result-card has-result">
                <div className="bp-result-header">
                  <h3>Blood Pressure Result</h3>
                </div>
                <div className="bp-result-content">
                  <div className="bp-value-display">
                    <span className="bp-value">
                      {systolic}/{diastolic}
                    </span>
                    <span className="bp-unit">mmHg</span>
                  </div>
                  {systolic && diastolic && (
                    <>
                      <div className={`bp-category ${statusInfo.class}`}>
                        {statusInfo.text}
                      </div>
                      <div className="bp-description">
                        {statusInfo.text === "Normal" 
                          ? "Your blood pressure is within normal range" 
                          : statusInfo.text.includes("Elevated")
                          ? "Your blood pressure is slightly elevated"
                          : statusInfo.text.includes("Hypertension")
                          ? "Your blood pressure indicates hypertension"
                          : "Your blood pressure requires immediate attention"
                        }
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* INSTRUCTION DISPLAY - Simplified workflow */}
          <div className="instruction-container">
            <div className="instruction-cards-horizontal">
              {/* Step 1 Card - Ready for Measurement */}
              <div className={`instruction-card-step ${
                measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">1</div>
                <div className="step-icon">🩺</div>
                <h4 className="step-title">Ready</h4>
                <p className="step-description">
                  Click Start to begin blood pressure measurement
                </p>
                <div className={`step-status ${
                  measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 1 ? (measurementStep > 1 ? 'Completed' : 'Ready') : 'Pending'}
                </div>
              </div>

              {/* Step 2 Card - Measurement in Progress */}
              <div className={`instruction-card-step ${
                measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">2</div>
                <div className="step-icon">📊</div>
                <h4 className="step-title">Measuring</h4>
                <p className="step-description">
                  Blood pressure measurement in progress
                </p>
                {bpMeasuring && countdown > 0 && (
                  <div className="countdown-mini">
                    <div className="countdown-mini-circle">
                      <span className="countdown-mini-number">{countdown}</span>
                    </div>
                    <span className="countdown-mini-text">seconds remaining</span>
                  </div>
                )}
                <div className={`step-status ${
                  measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 2 ? (measurementStep > 2 ? 'Completed' : 'Measuring') : 'Pending'}
                </div>
              </div>

              {/* Step 3 Card - Results Complete */}
              <div className={`instruction-card-step ${
                measurementStep >= 3 ? 'completed' : ''
              }`}>
                <div className="step-number-circle">3</div>
                <div className="step-icon">🤖</div>
                <h4 className="step-title">AI Results</h4>
                <p className="step-description">
                  View complete AI analysis and results
                </p>
                <div className={`step-status ${
                  measurementStep >= 3 ? 'completed' : 'pending'
                }`}>
                  {measurementStep >= 3 ? 'Ready' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="continue-button-container">
          <button 
            className={`continue-button ${
              measurementStep === 1 ? 'measurement-action' : 
              measurementStep === 2 ? 'measuring-action' : 
              'ai-results-action'
            }`}
            onClick={getButtonAction()} 
            disabled={getButtonDisabled()}
          >
            {measurementStep === 2 && (
              <div className="spinner"></div>
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
            Status: {measurementComplete ? '✅ COMPLETE' : (bpMeasuring ? '⏳ MEASURING' : '🟢 READY')} | 
            BP: {systolic || '--'}/{diastolic || '--'} |
            Next: /measure/ai-loading
          </div>
        </div>
      </div>
    </div>
  );
}