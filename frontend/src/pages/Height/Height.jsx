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

  const convertToFeetInches = (cm) => {
    if (!cm || cm === "--.--") return "--'--\"";
    const totalInches = parseFloat(cm) / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const pollHeightStatus = () => {
    pollerId.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getHeightStatus();
        console.log("Height status:", data);
        
        // Handle progress updates
        if (data.status && data.status.includes('HEIGHT_PROGRESS')) {
          const progressParts = data.status.split(':');
          if (progressParts.length >= 3) {
            const elapsed = parseInt(progressParts[1]);
            const total = parseInt(progressParts[2]);
            const progressPercent = (elapsed / total) * 100;
            setProgress(progressPercent);
            setStatusMessage(`Measuring height... ${elapsed}/${total}s`);
          }
        }
        
        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing Height Sensor...");
            break;
          case 'height_measurement_started':
            setStatusMessage("Starting height measurement...");
            break;
          case 'height_measuring':
            setStatusMessage("Measuring height... Please stand still.");
            break;
          case 'height_measurement_complete':
            setStatusMessage("Height Measurement Complete!");
            setProgress(100);
            if (data.height) {
              setHeight(data.height.toFixed(1));
              setMeasurementComplete(true);
              setIsMeasuring(false);
              clearInterval(pollerId.current);
            }
            break;
          case 'error':
          case 'height_reading_failed':
            setStatusMessage("❌ Height Measurement Failed! Please try again.");
            setIsMeasuring(false);
            clearInterval(pollerId.current);
            break;
          default:
            if (data.status && !data.status.includes('HEIGHT_PROGRESS')) {
              setStatusMessage(data.status);
            }
            break;
        }

        // Direct result check - this is the most important part
        if (data.height && data.height > 0 && !measurementComplete) {
          console.log("Height result received:", data.height);
          setHeight(data.height.toFixed(1));
          setMeasurementComplete(true);
          setIsMeasuring(false);
          setStatusMessage("Height Measurement Complete!");
          setProgress(100);
          clearInterval(pollerId.current);
        }

        // If measurement is no longer active but we don't have result
        if (!data.measurement_active && isMeasuring && !measurementComplete) {
          console.log("Height measurement stopped without result");
          setStatusMessage("❌ Measurement stopped. Please try again.");
          setIsMeasuring(false);
          clearInterval(pollerId.current);
        }

      } catch (error) {
        console.error("Error polling height status:", error);
        setStatusMessage("❌ Connection Error");
        setIsMeasuring(false);
        clearInterval(pollerId.current);
      }
    }, 800);
  };

  const handleStartMeasurement = async () => {
    if (isMeasuring) return;
    
    setIsMeasuring(true);
    setMeasurementComplete(false);
    setHeight("");
    setStatusMessage("Starting height measurement...");
    setProgress(0);

    try {
      const result = await sensorAPI.startHeight();
      console.log("Start height result:", result);
      
      if (result.status === 'started') {
        setStatusMessage("Initializing sensor...");
        
        // Start polling
        setTimeout(() => {
          pollHeightStatus();
        }, 500);
        
        // Safety timeout
        measurementTimeout.current = setTimeout(() => {
          if (isMeasuring && !measurementComplete) {
            console.log("Height measurement timeout reached");
            setStatusMessage("❌ Measurement timeout. Please try again.");
            setIsMeasuring(false);
            if (pollerId.current) clearInterval(pollerId.current);
          }
        }, 15000); // 15 seconds timeout for height
        
      } else {
        setStatusMessage(result.message || "Failed to start measurement.");
        setIsMeasuring(false);
      }
    } catch (error) {
      console.error("Start height measurement error:", error);
      setStatusMessage("❌ Connection Failed. Check backend.");
      setIsMeasuring(false);
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !height) {
      alert("Please complete the height measurement first.");
      return;
    }
    
    navigate("/bodytemp", { 
      state: { 
        ...location.state, 
        weight: location.state?.weight,
        height: parseFloat(height) 
      } 
    });
  };

  const handleRetry = () => {
    if (pollerId.current) clearInterval(pollerId.current);
    if (measurementTimeout.current) clearTimeout(measurementTimeout.current);
    setHeight("");
    setMeasurementComplete(false);
    setIsMeasuring(false);
    setStatusMessage("Press Start to Begin");
    setProgress(0);
  };

  const getHeightStatus = (height) => {
    if (!height || height === "--.--") return { text: "Not measured", class: "default" };
    const heightValue = parseFloat(height);
    if (heightValue < 100) return { text: "Very Short", class: "low" };
    if (heightValue > 200) return { text: "Very Tall", class: "high" };
    return { text: "Normal", class: "normal" };
  };

  const statusInfo = getHeightStatus(height);

  return (
    <div className="height-container">
      <div className={`height-content ${isVisible ? "visible" : ""} ${measurementComplete ? "result-mode" : ""}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "50%" }}></div>
          </div>
          <span className="progress-step">Step 2 of 4 - Vital Signs</span>
        </div>

        <div className="height-header">
          <h1 className="height-title">Height Measurement</h1>
          <p className="height-subtitle">{statusMessage}</p>
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

        <div className="height-display-section">
          <div className="height-visual-area">
            <div className="height-icon-container">
              <img src={heightIcon} alt="Height" className="height-icon" />
              <div className={`sensor-indicator ${isMeasuring ? "active" : ""}`}>
                <div className="indicator-dot"></div>
              </div>
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
                  <div className="success-text">✓ Measurement Complete</div>
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
                <>📏 Start Measurement</>
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
            Continue to Temperature
          </button>
        </div>
      </div>
    </div>
  );
}