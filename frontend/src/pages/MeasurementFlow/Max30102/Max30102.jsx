import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../../assets/icons/respiratory-icon.png";
import { sensorAPI } from "../../../utils/api";

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [sensorReady, setSensorReady] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(0);
  const [countdown, setCountdown] = useState(30);
  const [irValue, setIrValue] = useState(0);
  const [measurementStarted, setMeasurementStarted] = useState(false);
  const [showFingerRemovedAlert, setShowFingerRemovedAlert] = useState(false);
  
  const pollerRef = useRef(null);
  const fingerCheckRef = useRef(null);
  const initializationRef = useRef(false);
  const progressTimerRef = useRef(null);
  const fingerRemovedAlertRef = useRef(null);
  const previousFingerStateRef = useRef(false);
  const totalMeasurementTime = 30;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeMax30102Sensor();

    return () => {
      clearTimeout(timer);
      stopAllTimers();
      clearFingerRemovedAlert();
    };
  }, []);

  // Update progress percentage when seconds change
  useEffect(() => {
    const percent = Math.min(100, Math.round((progressSeconds / totalMeasurementTime) * 100));
    setProgressPercent(percent);
    
    // Update countdown (remaining time)
    const remaining = Math.max(0, totalMeasurementTime - progressSeconds);
    setCountdown(remaining);
    
    // Auto-complete when time is up
    if (progressSeconds >= totalMeasurementTime && isMeasuring && !measurementComplete) {
      completeMeasurement();
    }
  }, [progressSeconds, isMeasuring, measurementComplete]);

  const startProgressTimer = () => {
    stopProgressTimer();
    
    progressTimerRef.current = setInterval(() => {
      setProgressSeconds(prev => {
        const newSeconds = prev + 1;
        if (newSeconds >= totalMeasurementTime) {
          completeMeasurement();
          return totalMeasurementTime;
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
    }
    
    fingerRemovedAlertRef.current = setTimeout(() => {
      setShowFingerRemovedAlert(false);
    }, 5000); // Show for 5 seconds
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
      setMeasurementStep(1);
      
      const prepareResult = await sensorAPI.prepareMax30102();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("✅ Pulse oximeter ready. Place finger to start automatic measurement...");
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
          previousFingerState: previousFingerStateRef.current,
          isMeasuring,
          measurementComplete 
        });

        // Check if finger was JUST REMOVED (was detected, now not detected) during measurement
        if (previousFingerStateRef.current && !newFingerDetected && isMeasuring && !measurementComplete) {
          console.log("Finger removed during measurement - stopping timer and showing alert");
          showFingerRemovedNotification();
          setStatusMessage("❌ Finger removed! Please reinsert finger to continue measurement.");
          pauseMeasurement(); // STOP COUNTING BUT DON'T RESET YET
        }
        
        // Check if finger was JUST INSERTED (was not detected, now detected) AND sensor is ready
        if (!previousFingerStateRef.current && newFingerDetected && newSensorReady) {
          if (isMeasuring && !measurementComplete) {
            // Finger was reinserted after removal - RESET TO 0 and start over
            console.log("Finger reinserted during measurement - resetting to 0 and starting over");
            resetAndStartMeasurement();
          } else if (!isMeasuring && !measurementComplete) {
            // First time finger insertion - start measurement
            console.log("Finger detected for the first time - starting measurement");
            startMeasurement();
          }
        }
        
        // Update previous state
        previousFingerStateRef.current = newFingerDetected;
        
        setFingerDetected(newFingerDetected);
        setSensorReady(newSensorReady);
        
        if (data.ir_value !== undefined) {
          setIrValue(data.ir_value);
        }
        
      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000); // Check every second

    startMainPolling();
  };

  const startMeasurement = () => {
    console.log("Starting measurement for the first time");
    setStatusMessage("✅ Finger detected! Automatic measurement starting...");
    setMeasurementStep(3);
    setIsMeasuring(true);
    setMeasurementStarted(true);
    setProgressSeconds(0); // Start from 0
    setProgressPercent(0);
    setCountdown(30);
    startProgressTimer();
    clearFingerRemovedAlert();
  };

  const pauseMeasurement = () => {
    console.log("Pausing measurement due to finger removal");
    stopProgressTimer(); // STOP COUNTING but keep current progress
    setIsMeasuring(false);
    // Don't reset progressSeconds here - keep it where it was
  };

  const resetAndStartMeasurement = () => {
    console.log("Resetting measurement to 0 and starting over");
    stopProgressTimer();
    setProgressSeconds(0); // RESET TO 0
    setProgressPercent(0); // RESET PROGRESS TO 0%
    setCountdown(30); // RESET COUNTDOWN TO 30
    setStatusMessage("✅ Finger detected! Measurement restarting from beginning...");
    setIsMeasuring(true);
    startProgressTimer(); // START COUNTING FROM 0
    clearFingerRemovedAlert();
  };

  const completeMeasurement = () => {
    console.log("Measurement completed successfully");
    stopProgressTimer();
    setIsMeasuring(false);
    setMeasurementComplete(true);
    setMeasurementStep(4);
    setStatusMessage("✅ Measurement Complete! Final results ready.");
    setProgressPercent(100);
    setProgressSeconds(totalMeasurementTime);
    setCountdown(0);
    
    // Update with final mock data (replace with actual API data)
    setMeasurements({
      heartRate: "72",
      spo2: "98",
      respiratoryRate: "16"
    });
    
    stopAllTimers();
    clearFingerRemovedAlert();
  };

  const startMainPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        // Update measurements from API data if available
        if (data.heart_rate && data.heart_rate > 0) {
          updateCurrentMeasurement('heartRate', data.heart_rate);
        }
        if (data.spo2 && data.spo2 > 0) {
          updateCurrentMeasurement('spo2', data.spo2);
        }
        if (data.respiratory_rate && data.respiratory_rate > 0) {
          updateCurrentMeasurement('respiratoryRate', data.respiratory_rate);
        }

        // Check for API-based completion
        if (data.final_result_shown && !measurementComplete) {
          completeMeasurement();
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        if (isMeasuring) {
          setStatusMessage("⚠️ Connection issue, retrying...");
        }
      }
    }, 2000);
  };

  const updateCurrentMeasurement = (type, value) => {
    setMeasurements(prev => ({
      ...prev,
      [type]: Math.round(value).toString()
    }));
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

  const handleContinue = () => {
    if (!measurementComplete) return;
    
    stopAllTimers();
    clearFingerRemovedAlert();
    
    const vitalSignsData = {
      ...location.state,
      weight: location.state?.weight,
      height: location.state?.height,
      temperature: location.state?.temperature,
      heartRate: parseInt(measurements.heartRate) || 75,
      spo2: parseInt(measurements.spo2) || 98,
      respiratoryRate: parseInt(measurements.respiratoryRate) || 16,
      measurementTimestamp: new Date().toISOString()
    };
    
    navigate("/measure/bloodpressure", { state: vitalSignsData });
  };

  const getStatusColor = (type, value) => {
    if (value === '--' || value === '--') return "default";
    const num = parseInt(value);
    
    switch (type) {
      case "heartRate":
        if (num < 60) return "low";
        if (num > 100) return "high";
        return "normal";
      case "spo2":
        if (num < 95) return "low";
        return "normal";
      case "respiratoryRate":
        if (num < 12) return "low";
        if (num > 20) return "high";
        return "normal";
      default:
        return "normal";
    }
  };

  const getStatusText = (type, value) => {
    if (value === '--' || value === '--') return "Ready";
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
      return (
        <>
          <span>Continue to Blood Pressure</span>
          <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Results ready!</span>
        </>
      );
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

  const getCardStatus = () => {
    if (measurementComplete) return "complete";
    if (isMeasuring) return "measuring";
    return "ready";
  };

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Finger Removed Alert */}
        {showFingerRemovedAlert && (
          <div className="finger-removed-alert">
            <div className="alert-content">
              <span className="alert-icon">⚠️</span>
              <span className="alert-text">Finger removed! Please reinsert to continue measurement.</span>
              <button 
                className="alert-close" 
                onClick={clearFingerRemovedAlert}
              >
                ×
              </button>
            </div>
          </div>
        )}
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `75%` }}></div>
          </div>
          <span className="progress-step">Step 3 of 4 - Vital Signs</span>
        </div>

        {/* Header Section */}
        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">{statusMessage}</p>
          
          {isMeasuring && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {Math.round(progressPercent)}% - {progressSeconds}/{totalMeasurementTime}s
                {countdown > 0 && ` (${countdown}s left)`}
              </span>
            </div>
          )}
        </div>

        {/* Main Content Area */}
        <div className="sensor-display-section">
          
          {/* Finger Sensor Display */}
          <div className="finger-sensor-container">
            <div className={`finger-sensor ${getSensorState()}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">
                {fingerDetected ? "👆" : "👇"}
              </div>
              <div className="sensor-status-text">
                {getSensorState() === 'initializing' && 'Initializing...'}
                {getSensorState() === 'ready' && (fingerDetected ? 'Finger Detected - Ready' : 'Ready - Insert Finger')}
                {getSensorState() === 'active' && `Measuring... ${progressSeconds}s`}
                {getSensorState() === 'complete' && 'Complete'}
              </div>
            </div>
          </div>

          {/* Vital Signs Cards */}
          <div className="vital-signs-cards-container">
            {/* Heart Rate Card */}
            <div className={`measurement-card vital-sign-card ${
              getCardStatus() === 'measuring' ? 'measuring-active' : 
              getCardStatus() === 'complete' ? 'measurement-complete' : ''
            } ${getStatusColor('heartRate', measurements.heartRate)}`}>
              <div className="measurement-icon">
                <img src={heartRateIcon} alt="Heart Rate" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">HR</h3>
                <p className="measurement-subtitle">Heart Rate</p>
                <div className="measurement-value">
                  <span className="value">
                    {measurements.heartRate}
                  </span>
                  <span className="unit">BPM</span>
                </div>
                <span className={`measurement-status ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>

            {/* SpO2 Card */}
            <div className={`measurement-card vital-sign-card ${
              getCardStatus() === 'measuring' ? 'measuring-active' : 
              getCardStatus() === 'complete' ? 'measurement-complete' : ''
            } ${getStatusColor('spo2', measurements.spo2)}`}>
              <div className="measurement-icon">
                <img src={spo2Icon} alt="Blood Oxygen" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">SpO₂</h3>
                <p className="measurement-subtitle">Blood Oxygen</p>
                <div className="measurement-value">
                  <span className="value">
                    {measurements.spo2}
                  </span>
                  <span className="unit">%</span>
                </div>
                <span className={`measurement-status ${getStatusColor('spo2', measurements.spo2)}`}>
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>

            {/* Respiratory Rate Card */}
            <div className={`measurement-card vital-sign-card ${
              getCardStatus() === 'measuring' ? 'measuring-active' : 
              getCardStatus() === 'complete' ? 'measurement-complete' : ''
            } ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
              <div className="measurement-icon">
                <img src={respiratoryIcon} alt="Respiratory Rate" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">RR</h3>
                <p className="measurement-subtitle">Respiratory Rate</p>
                <div className="measurement-value">
                  <span className="value">
                    {measurements.respiratoryRate}
                  </span>
                  <span className="unit">/min</span>
                </div>
                <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>

          {/* Instruction Steps */}
          <div className="instruction-container">
            <div className="instruction-cards-horizontal">
              <div className={`instruction-card-step ${
                measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">1</div>
                <div className="step-icon">👆</div>
                <h4 className="step-title">Insert Finger</h4>
                <p className="step-description">
                  Place your finger fully inside the pulse oximeter device
                </p>
                <div className={`step-status ${
                  measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 1 ? (measurementStep > 1 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>

              <div className={`instruction-card-step ${
                measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">2</div>
                <div className="step-icon">✋</div>
                <h4 className="step-title">Hold Steady</h4>
                <p className="step-description">
                  Keep your finger completely still for accurate readings
                </p>
                {isMeasuring && countdown > 0 && (
                  <div className="countdown-mini">
                    <div className="countdown-mini-circle">
                      <span className="countdown-mini-number">{countdown}</span>
                    </div>
                    <span className="countdown-mini-text">seconds left</span>
                  </div>
                )}
                <div className={`step-status ${
                  measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 2 ? (measurementStep > 2 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>

              <div className={`instruction-card-step ${
                measurementStep >= 3 ? (measurementStep > 3 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">3</div>
                <div className="step-icon">⏱️</div>
                <h4 className="step-title">Wait for Results</h4>
                <p className="step-description">
                  {measurementComplete 
                    ? "Measurement complete! Results are ready" 
                    : "30-second automatic measurement"
                  }
                </p>
                <div className={`step-status ${
                  measurementStep >= 3 ? (measurementStep > 3 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 3 ? (measurementStep > 3 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Button Section */}
        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete}
          >
            {getButtonText()}
          </button>
          
          {isMeasuring && (
            <div className="measurement-warning">
              ⚠️ Important: Keep your finger completely still for accurate results
            </div>
          )}
        </div>
      </div>
    </div>
  );
}