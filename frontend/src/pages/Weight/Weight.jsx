import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Weight.css";
import weightIcon from "../../assets/icons/weight-icon.png";
import { sensorAPI } from "../../utils/api";

export default function Weight() {
  const navigate = useNavigate();
  const location = useLocation();
  const [weight, setWeight] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false); // Tracks if backend is busy
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Press Start to Begin");
  const [progress, setProgress] = useState(0);

  const pollerId = useRef(null);
  const measurementTimeout = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    // Automatically start the measurement process when the page loads.
    sensorAPI.startWeight().then(() => {
      setStatusMessage("Please step on the scale and stand still.");
      pollWeightStatus();
    });

    return () => {
      clearTimeout(timer);
      if (pollerId.current) clearInterval(pollerId.current);
      if (measurementTimeout.current) clearTimeout(measurementTimeout.current);
      sensorAPI.shutdownWeight();
    };
  }, []);

  // This effect handles the auto-start logic based on backend status
  useEffect(() => {}, [isMeasuring, measurementComplete]);

  const pollWeightStatus = () => {
    pollerId.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getWeightStatus();
        console.log("Weight status:", data);
        
        setIsMeasuring(data.measurement_active);
        // Handle progress updates
        if (data.status && data.status.includes('weight_stabilizing')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = parseInt(progressParts[2]);
          // Calculate progress for the first 3 seconds (0% to 60%)
          const progressPercent = (elapsed / total) * 60;
          setProgress(progressPercent);
          setStatusMessage(`Stand straight, do not move... ${3 - elapsed}s`);
        } else if (data.status && data.status.includes('weight_averaging')) {
          const progressParts = data.status.split(':');
          if (progressParts.length >= 3) {
            const elapsed = parseInt(progressParts[1]);
            const total = parseInt(progressParts[2]);
            // Calculate progress for the last 2 seconds (60% to 100%)
            const progressPercent = 60 + ((elapsed / total) * 40);
            setProgress(progressPercent);
            setStatusMessage(`Averaging weight... ${2 - elapsed}s`);
          }
        }
        
        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing sensor...");
            break;
          case 'weight_measurement_started':
            setStatusMessage("Measurement started...");
            break;
          case 'waiting_for_user_weight':
            setStatusMessage("Waiting for weight detection...");
            break;
          case 'weight_measurement_complete':
            setStatusMessage("Weight Measurement Complete!");
            setProgress(100);
            if (data.weight) {
              setWeight(data.weight.toFixed(1));
              setMeasurementComplete(true);
              clearInterval(pollerId.current);
            }
            break;
          case 'error':
            setStatusMessage("❌ Measurement Error! Please try again.");
            setIsMeasuring(false);
            clearInterval(pollerId.current);
            break;
          default:
            // For idle states, guide the user
            if (!data.measurement_active && !measurementComplete) {
              if (!data.sensor_ready) {
                setStatusMessage("Calibrating scale, please wait...");
              } else {
                setStatusMessage("Please step on the scale and stand still.");
              }
            }
            break;
        }

        // Direct result check
        if (data.weight && data.weight > 0 && !measurementComplete) {
          console.log("Weight result received:", data.weight);
          setWeight(data.weight.toFixed(1));
          setMeasurementComplete(true);
          setStatusMessage("Weight Measurement Complete!");
          setProgress(100);
          clearInterval(pollerId.current);
        }

      } catch (error) {
        console.error("Error polling weight status:", error);
        setStatusMessage("❌ Connection Error. Please check backend.");
        clearInterval(pollerId.current);
      }
    }, 800); // Poll every 800ms
  };

  const handleContinue = () => {
    if (!measurementComplete || !weight) {
      alert("Please complete the weight measurement first.");
      return;
    }
    
    navigate("/height", { 
      state: { 
        ...location.state, 
        weight: parseFloat(weight) 
      } 
    });
  };

  return (
    <div className="weight-container">
      <div className={`weight-content ${isVisible ? "visible" : ""} ${measurementComplete ? "result-mode" : ""}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "25%" }}></div>
          </div>
          <span className="progress-step">Step 1 of 4 - Vital Signs</span>
        </div>

        <div className="weight-header">
          <h1 className="weight-title">Weight Measurement</h1>
          <p className="weight-subtitle">{statusMessage}</p>
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

        <div className="weight-display-section">
          <div className="weight-visual-area">
            <div className="weight-icon-container">
              <img src={weightIcon} alt="Weight" className="weight-icon" />
              <div className={`scale-platform ${isMeasuring ? "active" : ""}`}></div>
            </div>
            <div className="weight-value-display">
              {isMeasuring && !measurementComplete ? (
                <div className="measuring-animation">
                  <div className="pulse-dot"></div>
                  <span className="measuring-text">Measuring...</span>
                </div>
              ) : measurementComplete ? (
                <div className="weight-result">
                  <span className="weight-number">{weight}</span>
                  <span className="weight-unit">kg</span>
                  <div className="success-text">✓ Measurement Complete</div>
                </div>
              ) : (
                <div className="weight-placeholder">
                  <span className="weight-number">--.--</span>
                  <span className="weight-unit">kg</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="measurement-controls">
          {!isMeasuring && !measurementComplete && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>Waiting for user to step on scale...</span>
            </div>
          )}
          {/* The "Measure Again" button has been removed to enforce a one-time measurement per phase. */}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete}
          >
            Continue to Height
          </button>
        </div>
      </div>
    </div>
  );
}