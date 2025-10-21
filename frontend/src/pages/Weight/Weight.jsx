import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Weight.css";
import weightIcon from "../../assets/icons/weight-icon.png";
import { sensorAPI } from "../../utils/api"; // Assuming api.js is in utils

export default function Weight() {
  const navigate = useNavigate();
  const location = useLocation();
  const [weight, setWeight] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Press Start to Begin");

  const pollerId = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => {
      clearTimeout(timer);
      if (pollerId.current) clearInterval(pollerId.current);
    };
  }, []);

  const pollWeightStatus = () => {
    pollerId.current = setInterval(async () => {
      const data = await sensorAPI.getWeightStatus();

      // Update UI based on the detailed status from the backend
      switch (data.status) {
        case 'initializing_weight_sensor':
          setStatusMessage("Initializing Sensor...");
          break;
        case 'weight_measurement_started':
          setStatusMessage("Please step on the scale.");
          break;
        case 'detected':
          setStatusMessage("Weight Detected! Please hold still.");
          break;
        case 'stabilizing':
          setStatusMessage("Stabilizing...");
          break;
        case 'weight_averaging':
          setStatusMessage("Averaging Weight... Do not move.");
          break;
        case 'completed':
          if (data.weight) {
            setWeight(data.weight.toFixed(1));
            setStatusMessage("Measurement Complete!");
            setMeasurementComplete(true);
          }
          setIsMeasuring(false);
          clearInterval(pollerId.current);
          break;
        case 'error':
          setStatusMessage("Error! Please try again.");
          setIsMeasuring(false);
          clearInterval(pollerId.current);
          break;
        default:
          break;
      }
    }, 1000); // Poll every second
  };

  const handleStartMeasurement = async () => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    setMeasurementComplete(false);
    setWeight("");
    setStatusMessage("Sending start command...");

    const result = await sensorAPI.startWeight();
    if (result.status === 'started') {
      pollWeightStatus();
    } else {
      setStatusMessage(result.error || "Failed to start. Check connection.");
      setIsMeasuring(false);
    }
  };
  
  const handleContinue = () => {
    if (!measurementComplete || !weight) {
      alert("Please complete the weight measurement first.");
      return;
    }
    navigate("/height", { state: { ...location.state, weight: parseFloat(weight) } });
  };

  const handleRetry = () => {
    setWeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setStatusMessage("Press Start to Begin");
  };

  // ... (JSX remains the same, but the buttons and text will be more responsive)
  return (
    <div className="weight-container">
        <div className={`weight-content ${isVisible ? "visible" : ""} ${measurementComplete ? "result-mode" : ""}`}>
            <div className="progress-container">
                <div className="progress-bar"><div className="progress-fill" style={{ width: "25%" }}></div></div>
                <span className="progress-step">Step 1 of 4 - Vital Signs</span>
            </div>

            <div className="weight-header">
                <h1 className="weight-title">Weight Measurement</h1>
                <p className="weight-subtitle">{statusMessage}</p>
            </div>

            <div className="weight-display-section">
                <div className="weight-visual-area">
                    <div className="weight-icon-container">
                        <img src={weightIcon} alt="Weight" className="weight-icon" />
                        <div className="scale-platform"></div>
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
                    <button className="measure-button" onClick={handleStartMeasurement} disabled={isMeasuring}>
                        {isMeasuring ? (<><div className="spinner"></div>In Progress...</>) : (<>⚖️ Start Measurement</>)}
                    </button>
                ) : (
                    <div className="measurement-complete">
                        <span className="success-text">✓ {statusMessage}</span>
                        <button className="retry-button" onClick={handleRetry}>Measure Again</button>
                    </div>
                )}
            </div>
            
            <div className="continue-button-container">
                <button className="continue-button" onClick={handleContinue} disabled={!measurementComplete}>
                    Continue to Height
                </button>
            </div>
        </div>
    </div>
  );
}