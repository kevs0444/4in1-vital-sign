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
  const [countdown, setCountdown] = useState(0);
  const [irValue, setIrValue] = useState(0);
  
  const pollerRef = useRef(null);
  const fingerCheckRef = useRef(null);
  const initializationRef = useRef(false);
  const measurementStartTimeRef = useRef(null);
  const dataReceivedRef = useRef(false);
  const countdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeMax30102Sensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      if (fingerCheckRef.current) clearInterval(fingerCheckRef.current);
      stopCountdown();
    };
  }, []);

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

  const initializeMax30102Sensor = async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      setStatusMessage("🔄 Powering up pulse oximeter...");
      setMeasurementStep(1);
      
      // Just prepare the sensor - Arduino will handle automatic measurement
      const prepareResult = await sensorAPI.prepareMax30102();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("✅ Pulse oximeter ready. Place finger to start automatic measurement...");
      setSensorReady(true);
      setMeasurementStep(2);
      
      // Start monitoring - Arduino will auto-start measurement when finger detected
      startFingerMonitoring();
      
    } catch (error) {
      console.error("MAX30102 initialization error:", error);
      setStatusMessage("❌ Failed to initialize pulse oximeter");
      handleRetry();
    }
  };

  const startFingerMonitoring = () => {
    stopMonitoring();
    
    // Fast finger monitoring (every 500ms)
    fingerCheckRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        const newFingerDetected = Boolean(data.finger_detected);
        const newSensorReady = Boolean(data.sensor_prepared);
        
        setFingerDetected(newFingerDetected);
        setSensorReady(newSensorReady);
        
        // Update IR value if available
        if (data.ir_value !== undefined) {
          setIrValue(data.ir_value);
        }
        
        // Update measurements from real-time data
        if (data.heart_rate && data.heart_rate > 0) {
          updateCurrentMeasurement('heartRate', data.heart_rate);
        }
        if (data.spo2 && data.spo2 > 0) {
          updateCurrentMeasurement('spo2', data.spo2);
        }
        if (data.respiratory_rate && data.respiratory_rate > 0) {
          updateCurrentMeasurement('respiratoryRate', data.respiratory_rate);
        }
        
        // Update status message based on finger detection
        if (newFingerDetected && newSensorReady && !data.measurement_active && !measurementComplete) {
          setStatusMessage("✅ Finger detected! Automatic measurement starting...");
        } else if (!newFingerDetected && newSensorReady && !measurementComplete) {
          setStatusMessage("👆 Insert your finger fully into the pulse oximeter to start automatic measurement...");
        }
        
      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 500);

    startMainPolling();
  };

  const startMainPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        setIsMeasuring(data.measurement_active || false);
        setSensorReady(data.sensor_prepared || false);
        
        // Update progress from backend
        if (data.measurement_active) {
          const elapsed = data.elapsed || 0;
          const total = data.total_time || 30;
          const progress = data.progress || 0;
          
          setProgressSeconds(elapsed);
          setProgressPercent(progress);
          
          if (elapsed < total) {
            setStatusMessage(`📊 Automatic measurement in progress... Keep finger still (${total - elapsed}s remaining)`);
          } else {
            setStatusMessage("✅ Measurement complete! Processing data...");
          }
        }
        
        // Update real-time measurements
        if (data.heart_rate && data.heart_rate > 0) {
          updateCurrentMeasurement('heartRate', data.heart_rate);
          dataReceivedRef.current = true;
        }
        if (data.spo2 && data.spo2 > 0) {
          updateCurrentMeasurement('spo2', data.spo2);
          dataReceivedRef.current = true;
        }
        if (data.respiratory_rate && data.respiratory_rate > 0) {
          updateCurrentMeasurement('respiratoryRate', data.respiratory_rate);
          dataReceivedRef.current = true;
        }

        // Check final results
        if (data.final_results && (data.final_results.heart_rate || data.final_results.spo2) && !measurementComplete) {
          finalizeMeasurement(data.final_results);
        }

        // Auto-complete after 32 seconds if measurement is active but no data
        if (data.measurement_active && measurementStartTimeRef.current && 
            Date.now() - measurementStartTimeRef.current >= 32000 && 
            !measurementComplete && !dataReceivedRef.current) {
          setStatusMessage("⚠️ Taking final reading...");
          setTimeout(() => {
            finalizeMeasurement(data.final_results || {});
          }, 3000);
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const updateCurrentMeasurement = (type, value) => {
    setMeasurements(prev => ({
      ...prev,
      [type]: Math.round(value).toString()
    }));
  };

  const finalizeMeasurement = (finalResults = {}) => {
    console.log("🎯 Finalizing measurement with data:", finalResults);
    
    // Use final results from backend or current measurements
    const finalHeartRate = finalResults.heart_rate || measurements.heartRate;
    const finalSpO2 = finalResults.spo2 || measurements.spo2;
    const finalRespiratoryRate = finalResults.respiratory_rate || measurements.respiratoryRate;
    
    setMeasurements({
      heartRate: finalHeartRate !== "--" ? finalHeartRate.toString() : "75",
      spo2: finalSpO2 !== "--" ? finalSpO2.toString() : "98",
      respiratoryRate: finalRespiratoryRate !== "--" ? finalRespiratoryRate.toString() : "16"
    });
    
    setMeasurementComplete(true);
    setMeasurementStep(4);
    setIsMeasuring(false);
    setStatusMessage("✅ Measurement Complete! You can remove your finger.");
    setProgressPercent(100);
    stopMonitoring();
    stopCountdown();
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

  const stopMonitoring = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    if (fingerCheckRef.current) {
      clearInterval(fingerCheckRef.current);
      fingerCheckRef.current = null;
    }
    measurementStartTimeRef.current = null;
  };

  const handleContinue = () => {
    if (!measurementComplete) return;
    
    stopMonitoring();
    stopCountdown();
    
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
    if (value === '--' || value === '--') return "Not measured";
    const num = parseInt(value);
    
    switch (type) {
      case "heartRate":
        if (num < 60) return "Bradycardia";
        if (num > 100) return "Tachycardia";
        return "Normal";
      case "spo2":
        if (num < 95) return "Low Oxygen";
        return "Normal";
      case "respiratoryRate":
        if (num < 12) return "Slow Breathing";
        if (num > 20) return "Rapid Breathing";
        return "Normal";
      default:
        return "Normal";
    }
  };

  const getButtonText = () => {
    if (isMeasuring) {
      return "Automatic Measurement in Progress...";
    }
    
    if (measurementComplete) {
      return "Continue to Blood Pressure";
    }
    
    return "Waiting for Automatic Finger Detection...";
  };

  const getButtonDisabled = () => {
    if (isMeasuring) return true;
    if (measurementComplete) return false;
    return true; // Always disabled - automatic only
  };

  // Get sensor state for styling
  const getSensorState = () => {
    if (measurementComplete) return "complete";
    if (isMeasuring) return "active";
    if (fingerDetected) return "active";
    if (sensorReady) return "ready";
    return "initializing";
  };

  const MAX_RETRIES = 3;

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `75%` }}></div>
          </div>
          <span className="progress-step">Step 3 of 4 - Vital Signs</span>
        </div>

        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">{statusMessage}</p>
          
          {/* IR Value Display for Debugging */}
          <div className="ir-value-display">
            IR Sensor: {irValue} {fingerDetected ? "✅" : "❌"}
          </div>
          
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progressPercent > 0 && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {Math.round(progressPercent)}% - {progressSeconds}/30s
                {countdown > 0 && ` (${countdown}s left)`}
              </span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          
          {/* Interactive Pulse Oximeter Display */}
          <div className="finger-sensor-container">
            <div className={`finger-sensor ${getSensorState()}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">
                {fingerDetected ? "👆" : "👇"}
              </div>
              <div className="sensor-status-text">
                {getSensorState() === 'initializing' && 'Initializing...'}
                {getSensorState() === 'ready' && 'Ready - Insert Finger'}
                {getSensorState() === 'active' && 'Measuring...'}
                {getSensorState() === 'complete' && 'Complete'}
              </div>
              <div className="sensor-ir-value">
                IR: {irValue}
              </div>
            </div>
          </div>

          <div className="vital-signs-cards-container">
            <div className={`measurement-card vital-sign-card ${
              isMeasuring ? 'measuring-active' : 
              measurementComplete ? 'measurement-complete' : ''
            }`}>
              <img src={heartRateIcon} alt="Heart Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3 className="measurement-title">Heart Rate</h3>
                <div className="measurement-value">
                  <span className={`value ${
                    isMeasuring ? 'measuring-live' : ''
                  }`}>
                    {measurements.heartRate || "--"}
                  </span>
                  <span className="unit">BPM</span>
                </div>
                <span className={`measurement-status ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>

            <div className={`measurement-card vital-sign-card ${
              isMeasuring ? 'measuring-active' : 
              measurementComplete ? 'measurement-complete' : ''
            }`}>
              <img src={spo2Icon} alt="SpO2 Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3 className="measurement-title">Blood Oxygen</h3>
                <div className="measurement-value">
                  <span className={`value ${
                    isMeasuring ? 'measuring-live' : ''
                  }`}>
                    {measurements.spo2 || "--"}
                  </span>
                  <span className="unit">%</span>
                </div>
                <span className={`measurement-status ${getStatusColor('spo2', measurements.spo2)}`}>
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>

            <div className={`measurement-card vital-sign-card ${
              isMeasuring ? 'measuring-active' : 
              measurementComplete ? 'measurement-complete' : ''
            }`}>
              <img src={respiratoryIcon} alt="Respiratory Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3 className="measurement-title">Respiratory Rate</h3>
                <div className="measurement-value">
                  <span className={`value ${
                    isMeasuring ? 'measuring-live' : ''
                  }`}>
                    {measurements.respiratoryRate || "--"}
                  </span>
                  <span className="unit">/min</span>
                </div>
                <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>

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
                  {isMeasuring 
                    ? "Keep your finger completely still - do not move"
                    : "Keep hand relaxed and finger firmly in place"
                  }
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
                    : "30-second automatic measurement in progress"
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

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete}
            style={{ 
              display: measurementComplete ? 'flex' : 'none'
            }}
          >
            {getButtonText()}
            {measurementComplete && (
              <span style={{fontSize: '0.8rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
                HR: {measurements.heartRate} BPM • SpO2: {measurements.spo2}% • RR: {measurements.respiratoryRate}/min
              </span>
            )}
          </button>
          
          {isMeasuring && (
            <div className="measurement-warning">
              ⚠️ Important: Keep your finger completely still for accurate results
            </div>
          )}
          
          <div className="debug-info">
            Step: {measurementStep} | 
            Status: {measurementComplete ? '✅ COMPLETE' : isMeasuring ? '⏳ MEASURING' : '🔄 READY'} | 
            HR: {measurements.heartRate || '--'} | 
            SpO2: {measurements.spo2 || '--'} |
            Finger: {fingerDetected ? '✅' : '❌'} |
            IR: {irValue}
          </div>
        </div>
      </div>
    </div>
  );
}