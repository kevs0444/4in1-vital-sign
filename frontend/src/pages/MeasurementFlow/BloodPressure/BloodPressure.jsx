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
  const [sensorAvailable, setSensorAvailable] = useState(false);
  
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
      
      // Try to detect sensor
      const sensorCheck = await sensorAPI.checkBloodPressureSensor();
      
      if (sensorCheck.error || !sensorCheck.sensor_detected) {
        // No sensor detected - use random data mode
        setSensorAvailable(false);
        setStatusMessage("⚠️ Using simulated data - Click 'Start Measurement' to begin");
        setMeasurementStep(1); // Ready for measurement
        return;
      }
      
      // Sensor detected - proceed with normal flow
      setSensorAvailable(true);
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
      // Fall back to random data mode
      setSensorAvailable(false);
      setStatusMessage("⚠️ Using simulated data - Click 'Start Measurement' to begin");
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

  const clearSimulatedMeasurements = () => {
    if (bpIntervalRef.current) {
      clearInterval(bpIntervalRef.current);
      bpIntervalRef.current = null;
    }
  };

  const startMonitoring = () => {
    if (!sensorAvailable) {
      // Skip monitoring if no sensor available
      return;
    }
    
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

  const generateRandomBloodPressure = () => {
    // Generate realistic blood pressure values
    const baseSystolic = 110 + Math.floor(Math.random() * 30); // 110-140
    const baseDiastolic = 70 + Math.floor(Math.random() * 15); // 70-85
    
    // Add some small random variation
    const systolic = baseSystolic + Math.floor(Math.random() * 5) - 2;
    const diastolic = baseDiastolic + Math.floor(Math.random() * 3) - 1;
    
    return {
      systolic: Math.max(90, Math.min(180, systolic)), // Keep within reasonable bounds
      diastolic: Math.max(60, Math.min(120, diastolic)) // Keep within reasonable bounds
    };
  };

  const startSimulatedMeasurement = () => {
    clearSimulatedMeasurements();
    
    if (!sensorAvailable) {
      // Simulate measurement with random data
      let progress = 0;
      const progressInterval = setInterval(() => {
        progress += 5;
        setProgress(progress);
        
        if (progress >= 100) {
          clearInterval(progressInterval);
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
      }, 300);
      
      return;
    }
    
    // Original sensor-based simulation
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
      
      if (sensorAvailable) {
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
      } else {
        // No sensor - use random data simulation
        setStatusMessage("Simulating blood pressure measurement...");
        startSimulatedMeasurement();
        startCountdown(8); // Shorter countdown for simulation
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
      setStatusMessage("❌ Maximum retries reached. Using simulated data.");
      setSensorAvailable(false); // Fall back to random data
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
    if (bpMeasuring && liveBpValue) {
      return liveBpValue;
    }
    if (measurementComplete && systolic && diastolic) {
      return `${systolic}/${diastolic}`;
    }
    return "--/--";
  };

  const getCurrentStatusInfo = () => {
    if (measurementComplete && systolic && diastolic) {
      return getBloodPressureStatus(systolic, diastolic);
    }
    
    const currentValue = getCurrentDisplayValue();
    if (currentValue !== "--/--") {
      return getBloodPressureStatus(currentValue.split('/')[0], currentValue.split('/')[1]);
    }
    
    return { 
      text: isReady ? 'Ready' : 'Initializing', 
      class: isReady ? 'ready' : 'default',
      description: isReady ? 'Ready for measurement' : 'Initializing blood pressure monitor'
    };
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
            {!sensorAvailable && (
              <span style={{display: 'block', fontSize: '0.7rem', color: '#ff6b35', marginTop: '5px'}}>
                🔄 Using simulated data for demonstration
              </span>
            )}
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
                    🔄 Measuring...
                  </div>
                )}
                
                {!sensorAvailable && !bpMeasuring && !measurementComplete && (
                  <div style={{
                    fontSize: '0.7rem',
                    color: '#ff6b35',
                    marginTop: '8px',
                    fontWeight: '600'
                  }}>
                    🔄 Simulation Mode
                  </div>
                )}
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
            Sensor: {sensorAvailable ? '✅ DETECTED' : '🔄 SIMULATION'} | 
            Status: {measurementComplete ? '✅ COMPLETE' : (bpMeasuring ? '⏳ MEASURING' : '🟢 READY')} | 
            BP: {systolic || '--'}/{diastolic || '--'} |
            Next: /measure/ai-loading
          </div>
        </div>
      </div>
    </div>
  );
}