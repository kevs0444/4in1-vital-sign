import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Height.css";
import heightIcon from "../../assets/icons/height-icon.png";
import { sensorAPI } from "../../utils/api";

export default function Height() {
  const navigate = useNavigate();
  const location = useLocation();
  const [height, setHeight] = useState("");
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

  const convertToFeetInches = (cm) => {
    if (!cm) return "--'--\"";
    const totalInches = parseFloat(cm) / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const pollHeightStatus = () => {
    pollerId.current = setInterval(async () => {
      const data = await sensorAPI.getHeightStatus();
      switch (data.status) {
        case 'initializing_height_sensor':
          setStatusMessage("Initializing Sensor...");
          break;
        case 'height_measurement_started':
        case 'measuring':
          setStatusMessage("Measuring... Please stand still.");
          break;
        case 'completed':
          if (data.height) {
            setHeight(data.height.toFixed(1));
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
    }, 1000);
  };

  const handleStartMeasurement = async () => {
    if (isMeasuring) return;
    setIsMeasuring(true);
    setMeasurementComplete(false);
    setHeight("");
    setStatusMessage("Sending start command...");

    const result = await sensorAPI.startHeight();
    if (result.status === 'started') {
      pollHeightStatus();
    } else {
      setStatusMessage(result.error || "Failed to start. Check connection.");
      setIsMeasuring(false);
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !height) {
      alert("Please complete the height measurement first.");
      return;
    }
    navigate("/bodytemp", { state: { ...location.state, height: parseFloat(height) } });
  };
  
  const handleRetry = () => {
    setHeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setStatusMessage("Press Start to Begin");
  };

  // ... (JSX remains the same)
  return (
    <div className="height-container">
        <div className={`height-content ${isVisible ? "visible" : ""} ${measurementComplete ? "result-mode" : ""}`}>
            <div className="progress-container">
                <div className="progress-bar"><div className="progress-fill" style={{ width: "50%" }}></div></div>
                <span className="progress-step">Step 2 of 4 - Vital Signs</span>
            </div>

            <div className="height-header">
                <h1 className="height-title">Height Measurement</h1>
                <p className="height-subtitle">{statusMessage}</p>
            </div>

            <div className="height-display-section">
                <div className="height-visual-area">
                    <div className="height-icon-container">
                        <img src={heightIcon} alt="Height" className="height-icon" />
                        <div className={`sensor-indicator ${isMeasuring ? "active" : ""}`}><div className="indicator-dot"></div></div>
                    </div>
                    <div className="height-value-display">
                        {isMeasuring && !measurementComplete ? (
                            <div className="measuring-animation">
                                <div className="pulse-dot"></div>
                                <span className="measuring-text">Measuring...</span>
                            </div>
                        ) : measurementComplete ? (
                            <div className="height-result">
                                <span className="height-number">{height}</span>
                                <span className="height-unit">cm</span>
                                <div className="height-conversion">{convertToFeetInches(height)}</div>
                            </div>
                        ) : (
                            <div className="height-placeholder">
                                <span className="height-number">--.--</span>
                                <span className="height-unit">cm</span>
                                <div className="height-conversion">--'--"</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="measurement-controls">
                {!measurementComplete ? (
                    <button className="measure-button" onClick={handleStartMeasurement} disabled={isMeasuring}>
                        {isMeasuring ? (<><div className="spinner"></div>In Progress...</>) : (<>📏 Start Measurement</>)}
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
                    Continue to Temperature
                </button>
            </div>
        </div>
    </div>
  );
}