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
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const pollerId = useRef(null);
  const measurementStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    startMeasurementProcess();

    return () => {
      clearTimeout(timer);
      if (pollerId.current) clearInterval(pollerId.current);
      // Don't shutdown immediately - let the system handle retries
    };
  }, []);

  const startMeasurementProcess = async () => {
    try {
      setStatusMessage("Starting weight measurement...");
      const response = await sensorAPI.startWeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Please step on the scale and stand still.");
      measurementStarted.current = true;
      pollWeightStatus();
      
    } catch (error) {
      console.error("Start weight error:", error);
      setStatusMessage("❌ Failed to start measurement");
      handleRetry();
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying measurement... (${retryCount + 1}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        startMeasurementProcess();
      }, 2000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the scale.");
    }
  };

  const pollWeightStatus = () => {
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    pollerId.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getWeightStatus();
        console.log("Weight status:", data);
        
        consecutiveErrors = 0; // Reset error counter
        
        setIsMeasuring(data.measurement_active);

        // Handle progress updates
        if (data.status && data.status.includes('averaging_progress')) {
          const progressParts = data.status.split(':');
          const progressValues = progressParts[1].split('/');
          if (progressValues.length === 2) {
            const elapsed = parseInt(progressValues[0]);
            const total = parseInt(progressValues[1]);
            const progressPercent = (elapsed / total) * 100;
            setProgress(progressPercent);
            setStatusMessage(`Averaging weight... ${total - elapsed}s remaining`);
          }
        } else if (data.status && data.status.includes('weight_stabilizing')) {
          setStatusMessage("Weight detected, stabilizing...");
          setProgress(30);
        }
        
        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing sensor...");
            break;
          case 'weight_measurement_started':
            setStatusMessage("Waiting for weight detection...");
            setProgress(0);
            break;
          case 'weight_measurement_complete':
            if (data.weight && data.weight > 0) {
              // Valid measurement received
              setWeight(data.weight.toFixed(1));
              setMeasurementComplete(true);
              setStatusMessage("✅ Weight Measurement Complete!");
              setProgress(100);
              clearInterval(pollerId.current);
              
              // Small delay before shutdown to ensure data is saved
              setTimeout(() => {
                sensorAPI.shutdownWeight();
              }, 1000);
            } else {
              // Invalid measurement, retry
              setStatusMessage("❌ Invalid weight reading, retrying...");
              handleRetry();
            }
            break;
          case 'error':
          case 'weight_unstable':
          case 'weight_reading_failed':
            setStatusMessage("❌ Measurement failed, retrying...");
            setIsMeasuring(false);
            clearInterval(pollerId.current);
            handleRetry();
            break;
          default:
            if (data.measurement_active && !data.status.includes('progress')) {
              setStatusMessage("Waiting for stable weight...");
            }
            break;
        }

        // Check for weight result directly
        if (data.weight && data.weight > 0 && !measurementComplete) {
          setWeight(data.weight.toFixed(1));
          setMeasurementComplete(true);
          setStatusMessage("✅ Weight Measurement Complete!");
          setProgress(100);
          clearInterval(pollerId.current);
          
          setTimeout(() => {
            sensorAPI.shutdownWeight();
          }, 1000);
        }

      } catch (error) {
        console.error("Error polling weight status:", error);
        consecutiveErrors++;
        
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          setStatusMessage("❌ Connection issues, retrying...");
          clearInterval(pollerId.current);
          handleRetry();
        } else {
          setStatusMessage("⚠️ Temporary connection issue...");
        }
      }
    }, 1000);
  };

  const handleContinue = () => {
    if (!measurementComplete || !weight) {
      alert("Please complete the weight measurement first.");
      return;
    }
    
    if (pollerId.current) {
      clearInterval(pollerId.current);
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
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
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
          {!isMeasuring && !measurementComplete && statusMessage.includes("Waiting") && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>Step on scale to begin measurement</span>
            </div>
          )}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete || !weight}
          >
            Continue to Height
          </button>
        </div>
      </div>
    </div>
  );
}