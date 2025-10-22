import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../assets/icons/respiratory-icon.png";
import { sensorAPI } from "../../utils/api";

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
  const [progressSeconds, setProgressSeconds] = useState(60);
  const [progressPercent, setProgressPercent] = useState(0);
  const [liveSamples, setLiveSamples] = useState([]);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;
  const [sensorReady, setSensorReady] = useState(false);

  const pollerRef = useRef(null);
  const fingerCheckRef = useRef(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeMax30102Sensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      if (fingerCheckRef.current) clearInterval(fingerCheckRef.current);
    };
  }, []);

  const initializeMax30102Sensor = async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      setStatusMessage("🔄 Powering up pulse oximeter...");
      
      // First, prepare the sensor
      const prepareResult = await sensorAPI.prepareMax30102();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      // Wait a bit for sensor to fully power up
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatusMessage("✅ Pulse oximeter ready. Place finger on sensor...");
      setSensorReady(true);
      
      // Start monitoring for finger detection
      startFingerMonitoring();
      
    } catch (error) {
      console.error("MAX30102 initialization error:", error);
      setStatusMessage("❌ Failed to initialize pulse oximeter");
      handleRetry();
    }
  };

  const startFingerMonitoring = () => {
    stopMonitoring();
    
    // Start finger detection monitoring
    fingerCheckRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        setFingerDetected(data.finger_detected);
        setSensorReady(data.sensor_prepared || false);
        
        // Auto-start measurement when finger is detected and sensor is ready
        if (data.finger_detected && data.sensor_prepared && !data.measurement_active && !measurementComplete) {
          setStatusMessage("✅ Finger detected. Starting measurement...");
          clearInterval(fingerCheckRef.current);
          setTimeout(() => {
            startMeasurement();
          }, 1000);
        }
        
        // Update status based on finger detection
        if (!data.measurement_active && !measurementComplete) {
          if (data.finger_detected) {
            setStatusMessage("✅ Finger detected. Starting measurement...");
          } else if (data.sensor_prepared) {
            setStatusMessage("👆 Place finger on the sensor to begin...");
          } else {
            setStatusMessage("🔄 Sensor initializing...");
          }
        }
        
      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);

    // Start main status polling
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
        setLiveSamples(data.live_samples || []);
        setSensorReady(data.sensor_prepared || false);
        
        // Update progress
        if (data.status && data.status.includes('hr_progress')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = parseInt(progressParts[2]);
          const progressPercent = (elapsed / total) * 100;
          setProgressPercent(progressPercent);
          setProgressSeconds(total - elapsed);
          setStatusMessage(`📊 Measuring... ${total - elapsed}s remaining`);
        }
        
        // Update measurements from live data
        if (data.heart_rate !== null && data.heart_rate !== undefined && data.heart_rate !== "--") {
          setMeasurements(prev => ({ ...prev, heartRate: Math.round(data.heart_rate) }));
        }
        if (data.spo2 !== null && data.spo2 !== undefined && data.spo2 !== "--.-") {
          setMeasurements(prev => ({ ...prev, spo2: data.spo2.toFixed(1) }));
        }
        if (data.respiratory_rate !== null && data.respiratory_rate !== undefined && data.respiratory_rate !== "--") {
          setMeasurements(prev => ({ ...prev, respiratoryRate: Math.round(data.respiratory_rate) }));
        }

        // Handle completion
        if (data.status === 'hr_measurement_complete') {
          if (data.heart_rate && data.heart_rate > 40 && data.spo2 && data.spo2 > 70) {
            // Valid measurement received
            setMeasurementComplete(true);
            setStatusMessage("✅ Measurement Complete!");
            setProgressPercent(100);
            stopMonitoring();
          } else {
            // Invalid measurement, retry
            setStatusMessage("❌ Invalid readings, retrying...");
            handleRetry();
          }
        } else if (data.status === 'error' || data.status === 'hr_reading_failed') {
          setStatusMessage("❌ Measurement failed, retrying...");
          handleRetry();
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1500);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("🎬 Starting pulse oximeter measurement...");
      const response = await sensorAPI.startMax30102();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        if (!response.error.includes("Finger not detected")) {
          handleRetry();
        } else {
          // If finger not detected, go back to finger monitoring
          startFingerMonitoring();
        }
      } else {
        setStatusMessage("📊 Measurement started. Keep finger steady...");
      }
    } catch (error) {
      console.error("Start MAX30102 error:", error);
      setStatusMessage("❌ Failed to start measurement");
      handleRetry();
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      initializationRef.current = false;
      
      setTimeout(() => {
        initializeMax30102Sensor();
      }, 3000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the sensor.");
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
  };

  const handleContinue = () => {
    if (!measurementComplete) return;
    
    stopMonitoring();
    
    const finalData = {
      ...location.state,
      weight: location.state?.weight,
      height: location.state?.height,
      temperature: location.state?.temperature,
      heartRate: parseFloat(measurements.heartRate),
      spo2: parseFloat(measurements.spo2),
      respiratoryRate: parseInt(measurements.respiratoryRate),
      measurementTimestamp: new Date().toISOString()
    };
    
    navigate("/ai-loading", { state: finalData });
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

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "100%" }}></div>
          </div>
          <span className="progress-step">Step 4 of 4 - Vital Signs</span>
        </div>

        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {!sensorReady && (
            <div className="sensor-status">
              🔄 Sensor Initializing...
            </div>
          )}
          {isMeasuring && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {progressSeconds > 0 ? `${progressSeconds}s remaining` : "Finalizing..."}
              </span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          <div className="sensor-visual-area">
            <div className={`finger-sensor ${fingerDetected ? 'active' : ''} ${sensorReady ? 'ready' : 'initializing'}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">
                {fingerDetected ? "👆" : "👇"}
              </div>
              <div className="finger-status">
                {!sensorReady && "Initializing..."}
                {sensorReady && !fingerDetected && "Place Finger"}
                {sensorReady && fingerDetected && "Finger Detected"}
              </div>
            </div>
          </div>

          {/* Live Samples Display - Only show during measurement */}
          {isMeasuring && liveSamples.length > 0 && (
            <div className="live-samples-container">
              <h4>Live Data Samples</h4>
              <div className="samples-grid">
                {liveSamples.slice(-6).map((sample, index) => (
                  <div key={index} className="sample-item">
                    <span className="sample-index">#{liveSamples.length - 6 + index + 1}</span>
                    <span className="sample-hr">HR: {Math.round(sample.hr)}</span>
                    <span className="sample-spo2">SpO₂: {sample.spo2.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="measurements-grid">
            <div className="measurement-card">
              <img src={heartRateIcon} alt="Heart Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Heart Rate</h3>
                <div className="measurement-value">
                  {measurements.heartRate === "--" ? (
                    <span className="placeholder">--</span>
                  ) : (
                    <span className="value">{measurements.heartRate}</span>
                  )}
                  <span className="unit">BPM</span>
                </div>
                <span className={`measurement-status ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>
            
            <div className="measurement-card">
              <img src={spo2Icon} alt="SpO2 Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Blood Oxygen</h3>
                <div className="measurement-value">
                  {measurements.spo2 === "--.-" ? (
                    <span className="placeholder">--.-</span>
                  ) : (
                    <span className="value">{measurements.spo2}</span>
                  )}
                  <span className="unit">%</span>
                </div>
                <span className={`measurement-status ${getStatusColor('spo2', measurements.spo2)}`}>
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>
            
            <div className="measurement-card">
              <img src={respiratoryIcon} alt="Respiratory Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Respiratory Rate</h3>
                <div className="measurement-value">
                  {measurements.respiratoryRate === "--" ? (
                    <span className="placeholder">--</span>
                  ) : (
                    <span className="value">{measurements.respiratoryRate}</span>
                  )}
                  <span className="unit">/min</span>
                </div>
                <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-controls">
          {!sensorReady && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>Initializing pulse oximeter...</span>
            </div>
          )}
          {sensorReady && !fingerDetected && !isMeasuring && !measurementComplete && (
            <div className="waiting-prompt">
              <div className="finger-pulse"></div>
              <span>Place finger on sensor to begin measurement</span>
            </div>
          )}
          {sensorReady && fingerDetected && !isMeasuring && !measurementComplete && (
            <div className="ready-prompt">
              <div className="checkmark">✓</div>
              <span>Finger detected! Starting measurement...</span>
            </div>
          )}
          {isMeasuring && (
            <div className="measuring-prompt">
              <div className="pulse-animation"></div>
              <span>Measuring... Keep finger steady</span>
            </div>
          )}
          {measurementComplete && (
            <span className="success-text">✅ Measurement Complete</span>
          )}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete}
          >
            View AI Results
          </button>
        </div>
      </div>
    </div>
  );
}