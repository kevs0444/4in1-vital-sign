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
    respiratoryRate: "--"
  });
  const [progressSeconds, setProgressSeconds] = useState(30);
  const [progressPercent, setProgressPercent] = useState(0);

  const pollerRef = useRef(null);
  const countdownRef = useRef(null);
  const measurementTimeout = useRef(null);

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
    setStatusMessage("Initializing pulse oximeter...");
    setMeasurements({ heartRate: "--", spo2: "--.-", respiratoryRate: "--" });
    setProgressSeconds(30);
    setProgressPercent(0);
    
    try {
      const result = await sensorAPI.startMax30102();
      if (result.status === 'started') {
        setStatusMessage("Starting measurement...");
        startPolling();
        startCountdown();
      } else {
        setStatusMessage(result.message || "Failed to start measurement.");
        setIsMeasuring(false);
      }
    } catch (error) {
      setStatusMessage("❌ Connection Failed. Check backend.");
      setIsMeasuring(false);
    }
  };

  const startPolling = () => {
    stopPolling();
    
    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        console.log("MAX30102 status:", data);
        
        // Handle progress updates
        if (data.status && data.status.includes('HR_PROGRESS')) {
          const progressParts = data.status.split(':');
          if (progressParts.length >= 3) {
            const elapsed = parseInt(progressParts[1]);
            const total = parseInt(progressParts[2]);
            const progressPercent = (elapsed / total) * 100;
            setProgressPercent(progressPercent);
            setProgressSeconds(total - elapsed);
          }
        }
        
        // Update displayed values if they exist
        if (data.heart_rate !== null && data.heart_rate !== undefined) {
          setMeasurements(prev => ({ ...prev, heartRate: Math.round(data.heart_rate) }));
        }
        if (data.spo2 !== null && data.spo2 !== undefined) {
          setMeasurements(prev => ({ ...prev, spo2: data.spo2.toFixed(1) }));
        }
        if (data.respiratory_rate !== null && data.respiratory_rate !== undefined) {
          setMeasurements(prev => ({ ...prev, respiratoryRate: Math.round(data.respiratory_rate) }));
        }

        // Update status
        handleStatusUpdate(data.status);

        // Check if measurement is complete
        if (data.status === 'hr_measurement_complete') {
          setStatusMessage("Measurement Complete!");
          setMeasurementComplete(true);
          setIsMeasuring(false);
          setProgressPercent(100);
          stopPolling();
          stopCountdown();
        } else if (data.status === 'error' || data.status === 'hr_reading_failed') {
          setStatusMessage("❌ Measurement Failed. Please try again.");
          setIsMeasuring(false);
          stopPolling();
          stopCountdown();
        }

        // Direct result check
        if (data.heart_rate && data.spo2 && !measurementComplete) {
          console.log("HR result received:", data);
          setMeasurements({
            heartRate: Math.round(data.heart_rate),
            spo2: data.spo2.toFixed(1),
            respiratoryRate: Math.round(data.respiratory_rate || 16)
          });
          setMeasurementComplete(true);
          setIsMeasuring(false);
          setStatusMessage("Measurement Complete!");
          setProgressPercent(100);
          stopPolling();
          stopCountdown();
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        setStatusMessage("❌ Connection Error");
        setIsMeasuring(false);
        stopPolling();
        stopCountdown();
      }
    }, 1500);
  };

  const handleStatusUpdate = (status) => {
    switch (status) {
      case 'initializing':
        setStatusMessage("Initializing Pulse Oximeter...");
        break;
      case 'hr_measurement_started':
        setStatusMessage("Starting measurement...");
        break;
      case 'waiting_for_finger':
        setStatusMessage("👆 Place finger on sensor.");
        break;
      case 'finger_detected':
        setStatusMessage("✅ Finger Detected. Measuring...");
        break;
      case 'error':
      case 'finger_removed':
        setStatusMessage("❌ Finger removed. Please place finger back on sensor.");
        break;
      default:
        if (status && !status.includes('HR_PROGRESS')) {
          setStatusMessage(status);
        }
        break;
    }
  };

  const startCountdown = () => {
    setProgressSeconds(30);
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

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  };

  const stopPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    if (measurementTimeout.current) {
      clearTimeout(measurementTimeout.current);
      measurementTimeout.current = null;
    }
  };

  const handleContinue = () => {
    if (!measurementComplete) return;
    
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

  const handleRetry = () => {
    stopPolling();
    stopCountdown();
    setIsMeasuring(false);
    setMeasurementComplete(false);
    setMeasurements({ heartRate: "--", spo2: "--.-", respiratoryRate: "--" });
    setStatusMessage("Place finger on the sensor to begin.");
    setProgressSeconds(30);
    setProgressPercent(0);
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
            <div className={`finger-sensor ${isMeasuring ? 'active' : ''}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">👆</div>
            </div>
          </div>

          <div className="measurements-grid">
            <div className="measurement-card">
              <img src={heartRateIcon} alt="Heart Rate Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Heart Rate</h3>
                <div className={`measurement-value ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {measurements.heartRate} <span className="unit">BPM</span>
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
                <div className={`measurement-value ${getStatusColor('spo2', measurements.spo2)}`}>
                  {measurements.spo2} <span className="unit">%</span>
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
                <div className={`measurement-value ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {measurements.respiratoryRate} <span className="unit">/min</span>
                </div>
                <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="measurement-controls">
          {!measurementComplete ? (
            <button 
              className={`measure-button ${isMeasuring ? "measuring" : ""}`} 
              onClick={handleStartMeasurement} 
              disabled={isMeasuring}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring...
                </>
              ) : (
                "❤️ Start Measurement"
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ Measurement Complete</span>
              <button className="retry-button" onClick={handleRetry}>
                Measure Again
              </button>
            </div>
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