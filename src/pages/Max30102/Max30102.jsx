import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png"; // You'll add these icons
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
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const simulateMax30102Measurement = () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    setMeasurementComplete(false);
    
    // Simulate sequential measurements
    const measurementSequence = [
      { type: "heartRate", duration: 3000, label: "Heart Rate" },
      { type: "spo2", duration: 2000, label: "Blood Oxygen" },
      { type: "respiratoryRate", duration: 2500, label: "Respiratory Rate" }
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
        // Generate realistic measurements
        let newValue;
        switch (current.type) {
          case "heartRate":
            newValue = Math.floor(Math.random() * 60 + 60); // 60-120 BPM
            break;
          case "spo2":
            newValue = (Math.random() * 5 + 95).toFixed(1); // 95-100%
            break;
          case "respiratoryRate":
            newValue = Math.floor(Math.random() * 10 + 12); // 12-22 breaths/min
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
    
    // Pass data to next page - Skip Blood Pressure, go directly to Saving
    navigate("/saving", {
      state: {
        ...location.state,
        heartRate: parseInt(measurements.heartRate),
        spo2: parseFloat(measurements.spo2),
        respiratoryRate: parseInt(measurements.respiratoryRate)
      }
    });
  };

  const handleBack = () => {
    navigate("/bodytemp");
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

        {/* Title */}
        <div className="max30102-header">
          <h1 className="max30102-title">MAX30102 Sensor</h1>
          <p className="max30102-subtitle">Place finger on sensor for heart rate, SpO2, and respiratory rate</p>
        </div>

        {/* Sensor Display */}
        <div className="sensor-display-section">
          <div className="sensor-visualization">
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

          {/* Measurements Display */}
          <div className="measurements-grid">
            {/* Heart Rate */}
            <div className={`measurement-card ${getStatusColor('heartRate', measurements.heartRate)}`}>
              <div className="measurement-icon">
                <img src={heartRateIcon} alt="Heart Rate" />
              </div>
              <div className="measurement-info">
                <h3>Heart Rate</h3>
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
                <span className="measurement-status">
                  {getStatusText('heartRate', measurements.heartRate)}
                </span>
              </div>
            </div>

            {/* SpO2 */}
            <div className={`measurement-card ${getStatusColor('spo2', measurements.spo2)}`}>
              <div className="measurement-icon">
                <img src={spo2Icon} alt="Blood Oxygen" />
              </div>
              <div className="measurement-info">
                <h3>Blood Oxygen</h3>
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
                <span className="measurement-status">
                  {getStatusText('spo2', measurements.spo2)}
                </span>
              </div>
            </div>

            {/* Respiratory Rate */}
            <div className={`measurement-card ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
              <div className="measurement-icon">
                <img src={respiratoryIcon} alt="Respiratory Rate" />
              </div>
              <div className="measurement-info">
                <h3>Respiratory Rate</h3>
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
                <span className="measurement-status">
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
                'Start MAX30102 Measurement'
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
          <h3 className="education-title">About MAX30102 Sensor</h3>
          <div className="education-points">
            <div className="education-point">
              <span className="point-icon">❤️</span>
              <div className="point-text">
                <strong>Heart Rate Monitoring</strong>
                <span>Measures beats per minute for cardiovascular health</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">🩸</span>
              <div className="point-text">
                <strong>Blood Oxygen (SpO2)</strong>
                <span>Measures oxygen saturation in your blood</span>
              </div>
            </div>
            <div className="education-point">
              <span className="point-icon">🌬️</span>
              <div className="point-text">
                <strong>Respiratory Rate</strong>
                <span>Tracks breathing rate per minute</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max30102-actions">
          <button 
            className="back-button"
            onClick={handleBack}
          >
            Back
          </button>
          
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!measurementComplete}
          >
            Continue to Save Data
          </button>
        </div>
      </div>
    </div>
  );
}