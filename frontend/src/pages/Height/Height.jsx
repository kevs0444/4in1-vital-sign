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
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const pollerId = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    startMeasurementProcess();

    return () => {
      clearTimeout(timer);
      if (pollerId.current) clearInterval(pollerId.current);
    };
  }, []);

  const startMeasurementProcess = async () => {
    try {
      setStatusMessage("Starting height measurement...");
      const response = await sensorAPI.startHeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Please stand under the sensor.");
      pollHeightStatus();
      
    } catch (error) {
      console.error("Start height error:", error);
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
      setStatusMessage("❌ Maximum retries reached. Please check the sensor.");
    }
  };

  const convertToFeetInches = (cm) => {
    if (!cm || cm === "--.--") return "--'--\"";
    const totalInches = parseFloat(cm) / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  const pollHeightStatus = () => {
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 3;

    pollerId.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getHeightStatus();
        console.log("Height status:", data);
        
        consecutiveErrors = 0; // Reset error counter
        
        setIsMeasuring(data.measurement_active);

        // Handle progress updates
        if (data.status && data.status.includes('height_progress')) {
          const progressParts = data.status.split(':');
          const progressValues = progressParts[1].split('/');
          if (progressValues.length === 2) {
            const elapsed = parseInt(progressValues[0]);
            const total = parseInt(progressValues[1]);
            const progressPercent = (elapsed / total) * 100;
            setProgress(progressPercent);
            setStatusMessage(`Measuring... Please stand still (${total - elapsed}s)`);
          }
        }
        
        // Handle status messages
        switch (data.status) {
          case 'initializing':
            setStatusMessage("Initializing sensor...");
            break;
          case 'height_measurement_started':
            setStatusMessage("Please stand under the sensor.");
            setProgress(0);
            break;
          case 'height_measurement_complete':
            if (data.height && data.height > 100 && data.height < 220) {
              // Valid height received
              setHeight(data.height.toFixed(1));
              setMeasurementComplete(true);
              setStatusMessage("✅ Height Measurement Complete!");
              setProgress(100);
              clearInterval(pollerId.current);
              
              setTimeout(() => {
                sensorAPI.shutdownHeight();
              }, 1000);
            } else {
              // Invalid height, retry
              setStatusMessage("❌ Invalid height reading, retrying...");
              handleRetry();
            }
            break;
          case 'error':
          case 'height_reading_failed':
          case 'height_reading_out_of_range':
            setStatusMessage("❌ Measurement failed, retrying...");
            setIsMeasuring(false);
            clearInterval(pollerId.current);
            handleRetry();
            break;
          default:
            if (data.measurement_active && !data.status.includes('height_progress')) {
              setStatusMessage("Waiting for user detection...");
              setProgress(0);
            }
            break;
        }

        // Check for height result directly
        if (data.height && data.height > 100 && data.height < 220 && !measurementComplete) {
          setHeight(data.height.toFixed(1));
          setMeasurementComplete(true);
          setStatusMessage("✅ Height Measurement Complete!");
          setProgress(100);
          clearInterval(pollerId.current);
          
          setTimeout(() => {
            sensorAPI.shutdownHeight();
          }, 1000);
        }

      } catch (error) {
        console.error("Error polling height status:", error);
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
    if (!measurementComplete || !height) {
      alert("Please complete the height measurement first.");
      return;
    }
    
    if (pollerId.current) {
      clearInterval(pollerId.current);
    }
    
    navigate("/bodytemp", { 
      state: { 
        ...location.state, 
        weight: location.state?.weight,
        height: parseFloat(height) 
      } 
    });
  };

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
              ) : measurementComplete && height ? (
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
          {!isMeasuring && !measurementComplete && statusMessage.includes("Waiting") && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>Waiting for user...</span>
            </div>
          )}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete || !height}
          >
            Continue to Temperature
          </button>
        </div>
      </div>
    </div>
  );
}