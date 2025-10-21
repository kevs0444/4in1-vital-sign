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
  const [statusMessage, setStatusMessage] = useState("Place finger on the sensor to begin.");
  const [measurements, setMeasurements] = useState({
    heartRate: "--",
    spo2: "--.-",
    respiratoryRate: "--" // Now it will be updated
  });
  const [progressSeconds, setProgressSeconds] = useState(60);

  const pollerRef = useRef(null);
  const countdownRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(timer);
      stopPolling();
    };
  }, []);

  const handleStartMeasurement = async () => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    setMeasurementComplete(false);
    setStatusMessage("Initializing sensor...");
    setMeasurements({ heartRate: "--", spo2: "--.-", respiratoryRate: "--" });
    
    const result = await sensorAPI.startMax30102();
    if (result.status === 'started') {
      startPolling();
      startCountdown();
    } else {
      setStatusMessage(result.message || "Failed to start. Check connection.");
      setIsMeasuring(false);
    }
  };
  
  const startPolling = () => {
    stopPolling();
    pollerRef.current = setInterval(async () => {
      const data = await sensorAPI.getMax30102Status();
      
      // Update displayed values if they exist
      if (data.heart_rate) setMeasurements(prev => ({ ...prev, heartRate: Math.round(data.heart_rate) }));
      if (data.spo2) setMeasurements(prev => ({ ...prev, spo2: data.spo2.toFixed(1) }));
      // CORRECTED: Update respiratory rate from API data
      if (data.respiratory_rate) setMeasurements(prev => ({ ...prev, respiratoryRate: Math.round(data.respiratory_rate) }));

      handleStatusUpdate(data.status);

      if (data.status === 'completed') {
        setStatusMessage("Measurement Complete!");
        setMeasurementComplete(true);
        setIsMeasuring(false);
        stopPolling();
      }
    }, 1500);
  };
  
  const handleStatusUpdate = (status) => {
    switch (status) {
      case 'initializing': setStatusMessage("Initializing Sensor..."); break;
      case 'waiting for finger': setStatusMessage("👆 Place finger on sensor."); break;
      case 'finger detected': setStatusMessage("✅ Finger Detected. Measuring..."); break;
      case 'measuring': setStatusMessage("💓 Measuring Vitals... Keep still."); break;
      case 'error':
        setStatusMessage("❌ Sensor Error. Please try again.");
        setIsMeasuring(false);
        stopPolling();
        break;
      default: break;
    }
  };

  const startCountdown = () => {
    setProgressSeconds(60);
    countdownRef.current = setInterval(() => {
      setProgressSeconds(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const stopPolling = () => {
    if (pollerRef.current) clearInterval(pollerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  };

  const handleContinue = () => {
    if (!measurementComplete) return;
    const finalData = {
      ...location.state,
      heartRate: parseFloat(measurements.heartRate),
      spo2: parseFloat(measurements.spo2),
      // CORRECTED: Pass the final respiratory rate
      respiratoryRate: parseInt(measurements.respiratoryRate),
      measurementTimestamp: new Date().toISOString()
    };
    navigate("/ai-loading", { state: finalData });
  };
  
  const handleRetry = () => {
    stopPolling();
    setIsMeasuring(false);
    setMeasurementComplete(false);
    setMeasurements({ heartRate: "--", spo2: "--.-", respiratoryRate: "--" });
    setStatusMessage("Place finger on the sensor to begin.");
    setProgressSeconds(60);
  };

  const getStatusColor = (type, value) => {
    if (value === '--' || value === '--.-') return "default";
    const num = parseFloat(value);
    switch (type) {
      case "heartRate": return (num < 60 || num > 100) ? "high" : "normal";
      case "spo2": return num < 95 ? "low" : "normal";
      // CORRECTED: Added status color for RR
      case "respiratoryRate": return (num < 12 || num > 20) ? "high" : "normal";
      default: return "normal";
    }
  };

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        <div className="progress-container">
          <div className="progress-bar"><div className="progress-fill" style={{ width: "100%" }}></div></div>
          <span className="progress-step">Step 4 of 4 - Vital Signs</span>
        </div>

        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">{statusMessage}</p>
        </div>

        <div className="sensor-display-section">
          <div className="sensor-visual-area">
             <div className={`finger-sensor ${isMeasuring ? 'active' : ''}`}>
                <div className="sensor-light"></div>
                <div className="finger-placeholder">👆</div>
              </div>
              {isMeasuring && (
                <div className="measuring-progress">
                  <span className="progress-text">{progressSeconds > 0 ? `${progressSeconds}s remaining` : "Finalizing..."}</span>
                </div>
              )}
          </div>

          <div className="measurements-grid">
            <div className="measurement-card">
              <img src={heartRateIcon} alt="Heart Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Heart Rate</h3>
                <div className={`measurement-value ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {measurements.heartRate} <span className="unit">BPM</span>
                </div>
              </div>
            </div>
            <div className="measurement-card">
              <img src={spo2Icon} alt="SpO2 Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Blood Oxygen</h3>
                <div className={`measurement-value ${getStatusColor('spo2', measurements.spo2)}`}>
                  {measurements.spo2} <span className="unit">%</span>
                </div>
              </div>
            </div>
            <div className="measurement-card">
              <img src={respiratoryIcon} alt="Respiratory Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Respiratory Rate</h3>
                <div className={`measurement-value ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {measurements.respiratoryRate} <span className="unit">/min</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-controls">
          {!measurementComplete ? (
            <button className="measure-button" onClick={handleStartMeasurement} disabled={isMeasuring}>
              {isMeasuring ? (<><div className="spinner"></div>Measuring...</>) : "❤️ Start Measurement"}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Measurement Complete</span>
              <button className="retry-button" onClick={handleRetry}>Measure Again</button>
            </div>
          )}
        </div>
        
        <div className="continue-button-container">
          <button className="continue-button" onClick={handleContinue} disabled={!measurementComplete}>
            View AI Results
          </button>
        </div>
      </div>
    </div>
  );
}