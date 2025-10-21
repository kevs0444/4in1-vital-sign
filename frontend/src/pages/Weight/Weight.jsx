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
  const [statusMessage, setStatusMessage] = useState("Press Start to Begin");
  const [progress, setProgress] = useState(0);

  const pollerId = useRef(null);
  const measurementTimeout = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(timer);
      if (pollerId.current) clearInterval(pollerId.current);
      if (measurementTimeout.current) clearTimeout(measurementTimeout.current);
    };
  }, []);

  const pollWeightStatus = () => {
    pollerId.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getWeightStatus();
        console.log("Weight status:", data);
        
        // Handle progress updates
        if (data.status && data.status.includes('AVERAGING_PROGRESS')) {
          const progressParts = data.status.split(':');
          if (progressParts.length >= 3) {
            const elapsed = parseInt(progressParts[1]);
            const total = parseInt(progressParts[2]);
            const progressPercent = (elapsed / total) * 100;
            setProgress(progressPercent);
            setStatusMessage(`Averaging... ${elapsed}/${total}s`);
          }
        }
        
        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing Weight Sensor...");
            break;
          case 'weight_measurement_started':
            setStatusMessage("Please step on the scale.");
            break;
          case 'waiting_for_user_weight':
            setStatusMessage("Waiting for weight detection...");
            break;
          case 'weight_detected':
            setStatusMessage("Weight Detected! Please hold still.");
            setProgress(25);
            break;
          case 'stabilizing':
            setStatusMessage("Stabilizing...");
            setProgress(50);
            break;
          case 'weight_averaging':
            setStatusMessage("Averaging Weight... Do not move.");
            setProgress(75);
            break;
          case 'weight_measurement_complete':
            setStatusMessage("Weight Measurement Complete!");
            setProgress(100);
            if (data.weight) {
              setWeight(data.weight.toFixed(1));
              setMeasurementComplete(true);
              setIsMeasuring(false);
              clearInterval(pollerId.current);
            }
            break;
          case 'error':
            setStatusMessage("❌ Measurement Error! Please try again.");
            setIsMeasuring(false);
            clearInterval(pollerId.current);
            break;
          default:
            if (data.status && !data.status.includes('AVERAGING')) {
              setStatusMessage(data.status);
            }
            break;
        }

        // Direct result check
        if (data.weight && data.weight > 0 && !measurementComplete) {
          console.log("Weight result received:", data.weight);
          setWeight(data.weight.toFixed(1));
          setMeasurementComplete(true);
          setIsMeasuring(false);
          setStatusMessage("Weight Measurement Complete!");
          setProgress(100);
          clearInterval(pollerId.current);
        }

      } catch (error) {
        console.error("Error polling weight status:", error);
        setStatusMessage("❌ Connection Error");
        setIsMeasuring(false);
        clearInterval(pollerId.current);
      }
    }, 800); // Poll every 800ms
  };

  const handleStartMeasurement = async () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    setMeasurementComplete(false);
    setWeight("");
    setStatusMessage("Starting weight measurement...");
    setProgress(0);

    try {
      const result = await sensorAPI.startWeight();
      console.log("Start weight result:", result);
      
      if (result.status === 'started') {
        setStatusMessage("Initializing sensor...");
        
        // Start polling
        setTimeout(() => {
          pollWeightStatus();
        }, 500);
        
        // Safety timeout - if no result after 30 seconds, show error
        measurementTimeout.current = setTimeout(() => {
          if (isMeasuring && !measurementComplete) {
            console.log("Measurement timeout reached");
            setStatusMessage("❌ Measurement timeout. Please try again.");
            setIsMeasuring(false);
            if (pollerId.current) clearInterval(pollerId.current);
          }
        }, 30000);
        
      } else {
        setStatusMessage(result.message || "Failed to start measurement.");
        setIsMeasuring(false);
      }
    } catch (error) {
      console.error("Start measurement error:", error);
      setStatusMessage("❌ Connection Failed. Check backend.");
      setIsMeasuring(false);
    }
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

  const handleRetry = () => {
    if (pollerId.current) clearInterval(pollerId.current);
    if (measurementTimeout.current) clearTimeout(measurementTimeout.current);
    setWeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setStatusMessage("Press Start to Begin");
    setProgress(0);
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
                <>⚖️ Start Measurement</>
              )}
            </button>
          ) : (
            <div className="measurement-complete">
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
            Continue to Height
          </button>
        </div>
      </div>
    </div>
  );
}