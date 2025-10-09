import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../assets/icons/respiratory-icon.png";

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState("");
  const [measurements, setMeasurements] = useState({
    heartRate: "",
    spo2: "",
    respiratoryRate: ""
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const simulateMax30102Measurement = () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    setMeasurementComplete(false);
    
    const measurementSequence = [
      { type: "heartRate", duration: 2000, label: "Heart Rate" },
      { type: "spo2", duration: 1500, label: "Blood Oxygen" },
      { type: "respiratoryRate", duration: 1800, label: "Respiratory Rate" }
    ];
    
    let currentIndex = 0;
    
    const performNextMeasurement = () => {
      if (currentIndex >= measurementSequence.length) {
        setIsMeasuring(false);
        setMeasurementComplete(true);
        setCurrentMeasurement("");
        return;
      }
      
      const current = measurementSequence[currentIndex];
      setCurrentMeasurement(current.label);
      
      setTimeout(() => {
        let newValue;
        switch (current.type) {
          case "heartRate":
            newValue = Math.floor(Math.random() * 60 + 60);
            break;
          case "spo2":
            newValue = (Math.random() * 5 + 95).toFixed(1);
            break;
          case "respiratoryRate":
            newValue = Math.floor(Math.random() * 10 + 12);
            break;
          default:
            newValue = "";
        }
        
        setMeasurements(prev => ({
          ...prev,
          [current.type]: newValue
        }));
        
        currentIndex++;
        performNextMeasurement();
      }, current.duration);
    };
    
    performNextMeasurement();
  };

  const handleContinue = () => {
    if (!measurementComplete) {
      alert("Please complete all measurements first");
      return;
    }
    
    navigate("/saving", {
      state: {
        ...location.state,
        heartRate: parseInt(measurements.heartRate),
        spo2: parseFloat(measurements.spo2),
        respiratoryRate: parseInt(measurements.respiratoryRate)
      }
    });
  };

  const handleRetry = () => {
    setMeasurements({
      heartRate: "",
      spo2: "",
      respiratoryRate: ""
    });
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setCurrentMeasurement("");
  };

  const getStatusColor = (type, value) => {
    if (!value) return "default";
    
    const numValue = parseFloat(value);
    
    switch (type) {
      case "heartRate":
        if (numValue < 60) return "low";
        if (numValue > 100) return "high";
        return "normal";
      case "spo2":
        if (numValue < 95) return "low";
        return "normal";
      case "respiratoryRate":
        if (numValue < 12) return "low";
        if (numValue > 20) return "high";
        return "normal";
      default:
        return "default";
    }
  };

  const getStatusText = (type, value) => {
    if (!value) return "Not measured";
    
    const status = getStatusColor(type, value);
    
    switch (status) {
      case "low":
        return type === "spo2" ? "Low Oxygen" : "Low";
      case "high":
        return type === "spo2" ? "Normal" : "High";
      case "normal":
        return "Normal";
      default:
        return "Not measured";
    }
  };

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '100%'}}></div>
          </div>
          <span className="progress-step">Step 4 of 4 - Vital Signs</span>
        </div>

        {/* Header */}
        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">Place finger on sensor for heart rate, SpO2, and respiratory rate</p>
        </div>

        {/* Display Section */}
        <div className="sensor-display-section">
          <div className="sensor-visual-area">
            <div className={`finger-sensor ${isMeasuring ? 'active' : ''}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">👆</div>
            </div>
            {isMeasuring && (
              <div className="measuring-progress">
                <div className="pulse-wave"></div>
                <span className="current-measurement">{currentMeasurement}</span>
              </div>
            )}
          </div>

          {/* Measurements Grid - 3 cards in a row */}
          <div className="measurements-grid">
            {/* Heart Rate */}
            <div className="measurement-card">
              <div className="measurement-icon">
                <img src={heartRateIcon} alt="Heart Rate" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Heart Rate</h3>
                <div className="measurement-value">
                  {measurements.heartRate ? (
                    <>
                      <span className="value">{measurements.heartRate}</span>
                      <span className="unit">BPM</span>
                    </>
                  ) : (
                    <span className="placeholder">--</span>
                  )}
                </div>
                <span className={`measurement-status ${getStatusColor('heartRate', measurements.heartRate)}`}>
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>

            {/* SpO2 */}
            <div className="measurement-card">
              <div className="measurement-icon">
                <img src={spo2Icon} alt="Blood Oxygen" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Blood Oxygen</h3>
                <div className="measurement-value">
                  {measurements.spo2 ? (
                    <>
                      <span className="value">{measurements.spo2}</span>
                      <span className="unit">%</span>
                    </>
                  ) : (
                    <span className="placeholder">--.-</span>
                  )}
                </div>
                <span className={`measurement-status ${getStatusColor('spo2', measurements.spo2)}`}>
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className="measurement-card">
              <div className="measurement-icon">
                <img src={respiratoryIcon} alt="Respiratory Rate" className="measurement-image" />
              </div>
              <div className="measurement-info">
                <h3 className="measurement-title">Respiratory Rate</h3>
                <div className="measurement-value">
                  {measurements.respiratoryRate ? (
                    <>
                      <span className="value">{measurements.respiratoryRate}</span>
                      <span className="unit">/min</span>
                    </>
                  ) : (
                    <span className="placeholder">--</span>
                  )}
                </div>
                <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                  {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Measurement Controls */}
        <div className="measurement-controls">
          {!measurementComplete ? (
            <button 
              className="measure-button"
              onClick={simulateMax30102Measurement}
              disabled={isMeasuring}
            >
              {isMeasuring ? (
                <>
                  <div className="spinner"></div>
                  Measuring {currentMeasurement}...
                </>
              ) : (
                <>
                  <div className="button-icon">❤️</div>
                  Start Measurement
                </>
              )}
            </button>
          ) : (
            <div className="measurement-complete">
              <span className="success-text">✓ All Measurements Complete</span>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                Measure Again
              </button>
            </div>
          )}
        </div>

        {/* Educational Content */}
        <div className="educational-content">
          <h3 className="education-title">About Pulse Oximeter</h3>
          <div className="education-points">
            <div className="education-card">
              <div className="card-icon">❤️</div>
              <div className="card-content">
                <h4>Heart Rate Monitoring</h4>
                <p>Measures beats per minute for cardiovascular health</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🩸</div>
              <div className="card-content">
                <h4>Blood Oxygen (SpO2)</h4>
                <p>Measures oxygen saturation in your blood</p>
              </div>
            </div>
            <div className="education-card">
              <div className="card-icon">🌬️</div>
              <div className="card-content">
                <h4>Respiratory Rate</h4>
                <p>Tracks breathing rate per minute</p>
              </div>
            </div>
          </div>
        </div>

        {/* Continue Button */}
        <div className="continue-button-container">
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!measurementComplete}
          >
            Save Data
          </button>
        </div>
      </div>
    </div>
  );
}