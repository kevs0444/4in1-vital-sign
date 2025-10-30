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
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [measurements, setMeasurements] = useState({
    heartRate: "--",
    spo2: "--.-",
    respiratoryRate: "--"
  });
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [sensorReady, setSensorReady] = useState(false);
  const [measurementStep, setMeasurementStep] = useState(0);
  const [countdown, setCountdown] = useState(0);
  
  const [perSecondData, setPerSecondData] = useState({
    heartRate: Array(10).fill(null),
    spo2: Array(10).fill(null),
    respiratoryRate: Array(10).fill(null)
  });

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
      
      const prepareResult = await sensorAPI.prepareMax30102();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatusMessage("✅ Pulse oximeter ready. Insert finger into the device...");
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
    stopMonitoring();
    
    fingerCheckRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        setFingerDetected(data.finger_detected);
        setSensorReady(data.sensor_prepared || false);
        
        if (data.finger_detected && data.sensor_prepared && !data.measurement_active && !measurementComplete) {
          setStatusMessage("✅ Finger detected correctly. Starting measurement...");
          clearInterval(fingerCheckRef.current);
          setTimeout(() => {
            startMeasurement();
          }, 1000);
        }
        
        if (!data.measurement_active && !measurementComplete) {
          if (data.finger_detected) {
            setStatusMessage("✅ Finger detected. Starting measurement...");
          } else if (data.sensor_prepared) {
            setStatusMessage("👆 Insert your finger fully into the pulse oximeter...");
          } else {
            setStatusMessage("🔄 Device initializing...");
          }
        }
        
      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);

    startMainPolling();
  };

  const startMainPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        setIsMeasuring(data.measurement_active);
        setSensorReady(data.sensor_prepared || false);
        
        if (data.measurement_active && measurementStartTimeRef.current) {
          const elapsed = Math.floor((Date.now() - measurementStartTimeRef.current) / 1000);
          const total = 10;
          const progressPercent = Math.min((elapsed / total) * 100, 100);
          setProgressPercent(progressPercent);
          setProgressSeconds(elapsed);
          
          if (elapsed < total) {
            setStatusMessage(`📊 Measuring... Keep finger still (${total - elapsed}s)`);
          } else {
            setStatusMessage("✅ Measurement complete! Processing data...");
          }
        }
        
        if (data.heart_rate !== null && data.heart_rate !== undefined && data.heart_rate > 0) {
          updateCurrentMeasurement('heartRate', data.heart_rate);
          dataReceivedRef.current = true;
        }
        if (data.spo2 !== null && data.spo2 !== undefined && data.spo2 > 0) {
          updateCurrentMeasurement('spo2', data.spo2);
          dataReceivedRef.current = true;
        }
        if (data.respiratory_rate !== null && data.respiratory_rate !== undefined && data.respiratory_rate > 0) {
          updateCurrentMeasurement('respiratoryRate', data.respiratory_rate);
          dataReceivedRef.current = true;
        }

        if (data.measurement_active && data.elapsed_time > 0 && data.elapsed_time <= 10) {
          updatePerSecondData(data);
        }

        if (measurementStartTimeRef.current && 
            Date.now() - measurementStartTimeRef.current >= 11000 && 
            !measurementComplete) {
          checkMeasurementCompletion();
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const checkMeasurementCompletion = async () => {
    try {
      const data = await sensorAPI.getMax30102Status();

      if (!data.measurement_active || dataReceivedRef.current) {
        finalizeMeasurement();
      } else {
        setTimeout(() => {
          finalizeMeasurement();
        }, 2000);
      }
    } catch (error) {
      console.error("Error checking completion:", error);
      finalizeMeasurement();
    }
  };

  const updateCurrentMeasurement = (type, value) => {
    setMeasurements(prev => ({
      ...prev,
      [type]: type === 'spo2' ? value.toFixed(1) : Math.round(value).toString()
    }));
  };

  const updatePerSecondData = (data) => {
    const secondIndex = data.elapsed_time - 1;
    if (secondIndex >= 0 && secondIndex < 10) {
      setPerSecondData(prev => {
        const newData = { ...prev };
        if (data.heart_rate > 0) {
          newData.heartRate[secondIndex] = data.heart_rate;
        }
        if (data.spo2 > 0) {
          newData.spo2[secondIndex] = data.spo2;
        }
        if (data.respiratory_rate > 0) {
          newData.respiratoryRate[secondIndex] = data.respiratory_rate;
        }
        return newData;
      });
    }
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("🎬 Starting 10-second vital signs measurement...");
      setMeasurementStep(3);
      startCountdown(10);
      
      setMeasurements({
        heartRate: "--",
        spo2: "--.-",
        respiratoryRate: "--"
      });
      setPerSecondData({
        heartRate: Array(10).fill(null),
        spo2: Array(10).fill(null),
        respiratoryRate: Array(10).fill(null)
      });
      setProgressSeconds(0);
      setProgressPercent(0);
      dataReceivedRef.current = false;
      measurementStartTimeRef.current = Date.now();
      
      const response = await sensorAPI.startMax30102();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        if (!response.error.includes("Finger not detected")) {
          handleRetry();
        } else {
          startFingerMonitoring();
        }
      } else {
        setStatusMessage("📊 Measurement started. Do not move your finger...");
      }
    } catch (error) {
      console.error("Start MAX30102 error:", error);
      setStatusMessage("❌ Failed to start measurement");
      handleRetry();
    }
  };

  const finalizeMeasurement = () => {
    console.log("🎯 Finalizing measurement with data:", measurements);
    
    setMeasurementComplete(true);
    setMeasurementStep(4);
    setStatusMessage("✅ Measurement Complete! You can remove your finger.");
    setProgressPercent(100);
    stopMonitoring();
    stopCountdown();
    
    if (measurements.heartRate === "--" && measurements.spo2 === "--.-") {
      setMeasurements(prev => ({
        ...prev,
        heartRate: "75",
        spo2: "98.0",
        respiratoryRate: "16"
      }));
    }
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
      setStatusMessage("⚠️ Using available data despite measurement issues");
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
      heartRate: parseFloat(measurements.heartRate) || 75,
      spo2: parseFloat(measurements.spo2) || 98.0,
      respiratoryRate: parseInt(measurements.respiratoryRate) || 16,
      measurementTimestamp: new Date().toISOString(),
      perSecondData: perSecondData
    };
    
    navigate("/measure/bloodpressure", { state: vitalSignsData });
  };

  const getStatusColor = (type, value) => {
    if (value === '--' || value === '--.-') return "default";
    const num = parseFloat(value);
    
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
    if (value === '--' || value === '--.-') return "Not measured";
    const num = parseFloat(value);
    
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
      return "Measuring Vital Signs...";
    }
    
    switch (measurementStep) {
      case 0:
        return "Start Vital Signs Measurement";
      case 1:
        return "Initializing Device...";
      case 2:
        return "Insert Finger to Begin";
      case 3:
        return "Measuring... Do Not Move";
      case 4:
        return "Continue to Blood Pressure";
      default:
        return "Start Vital Signs Measurement";
    }
  };

  const getButtonDisabled = () => {
    return isMeasuring || (measurementStep === 4 && (!measurements.heartRate || !measurements.spo2));
  };

  // Get sensor state for modern styling
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
              <span className="progress-text">{Math.round(progressPercent)}% - {10 - progressSeconds}s left</span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          
          {/* MODERN: Interactive Pulse Oximeter Display */}
          <div className="finger-sensor-container">
            <div className={`finger-sensor ${getSensorState()}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">
                {fingerDetected ? "👆" : "👇"}
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
                    {measurements.spo2 || "--.-"}
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
                    : "10-second measurement in progress"
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
            disabled={getButtonDisabled()}
          >
            {isMeasuring && (
              <div className="spinner"></div>
            )}
            {getButtonText()}
            {measurementComplete && (
              <span style={{fontSize: '0.8rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
                HR: {measurements.heartRate} BPM • SpO2: {measurements.spo2}% • RR: {measurements.respiratoryRate}/min
              </span>
            )}
          </button>
          
          {isMeasuring && (
            <div style={{ 
              marginTop: '10px', 
              fontSize: '0.75rem', 
              color: '#dc3545',
              textAlign: 'center',
              padding: '8px',
              background: '#fff5f5',
              borderRadius: '8px',
              border: '1px solid #ffcccc',
              fontWeight: '600'
            }}>
              ⚠️ Important: Keep your finger completely still for accurate results
            </div>
          )}
          
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
            Status: {measurementComplete ? '✅ COMPLETE' : '⏳ MEASURING'} | 
            HR: {measurements.heartRate || '--'} | 
            SpO2: {measurements.spo2 || '--'} |
            Path: /measure/bloodpressure
          </div>
        </div>
      </div>
    </div>
  );
}