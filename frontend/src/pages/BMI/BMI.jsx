import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BMI.css";
import weightIcon from "../../assets/icons/weight-icon.png";
import heightIcon from "../../assets/icons/height-icon.png";
import { sensorAPI } from "../../utils/api";

export default function BMI() {
  const navigate = useNavigate();
  const location = useLocation();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [currentMeasurement, setCurrentMeasurement] = useState(""); // "weight" or "height"
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const measurementStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeSensors();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
    };
  }, []);

  const initializeSensors = async () => {
    try {
      setStatusMessage("Initializing measurement sensors...");
      
      // Initialize both weight and height sensors
      const [weightResult, heightResult] = await Promise.all([
        sensorAPI.prepareWeight(),
        sensorAPI.prepareHeight()
      ]);
      
      if (weightResult.error || heightResult.error) {
        setStatusMessage("❌ Sensor initialization failed");
        handleRetry();
        return;
      }
      
      setStatusMessage("Sensors ready. Start with weight measurement.");
      
    } catch (error) {
      console.error("Sensor initialization error:", error);
      setStatusMessage("❌ Failed to initialize sensors");
      handleRetry();
    }
  };

  const startWeightMeasurement = async () => {
    try {
      setCurrentMeasurement("weight");
      setIsMeasuring(true);
      setStatusMessage("Starting weight measurement...");
      
      const response = await sensorAPI.startWeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Please step on the scale and stand still.");
      measurementStarted.current = true;
      startMonitoring("weight");
      
    } catch (error) {
      console.error("Start weight error:", error);
      setStatusMessage("❌ Failed to start weight measurement");
      handleRetry();
    }
  };

  const startHeightMeasurement = async () => {
    try {
      setCurrentMeasurement("height");
      setIsMeasuring(true);
      setStatusMessage("Starting height measurement...");
      
      const response = await sensorAPI.startHeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Please stand under the height sensor.");
      measurementStarted.current = true;
      startMonitoring("height");
      
    } catch (error) {
      console.error("Start height error:", error);
      setStatusMessage("❌ Failed to start height measurement");
      handleRetry();
    }
  };

  const startMonitoring = (type) => {
    stopMonitoring();
    
    pollerRef.current = setInterval(async () => {
      try {
        const data = type === "weight" 
          ? await sensorAPI.getWeightStatus()
          : await sensorAPI.getHeightStatus();
        
        console.log(`${type} status:`, data);
        
        setIsMeasuring(data.measurement_active);

        // Handle progress updates
        if (data.status && (data.status.includes('progress') || data.status.includes('averaging'))) {
          const progressParts = data.status.split(':');
          if (progressParts.length > 1) {
            const progressValues = progressParts[1].split('/');
            if (progressValues.length === 2) {
              const elapsed = parseInt(progressValues[0]);
              const total = parseInt(progressValues[1]);
              const progressPercent = (elapsed / total) * 100;
              setProgress(progressPercent);
              setStatusMessage(`Measuring ${type}... ${total - elapsed}s`);
            }
          }
        }
        
        // Handle measurement completion
        if (type === "weight" && data.weight && data.weight > 0 && !weight) {
          setWeight(data.weight.toFixed(1));
          setStatusMessage("✅ Weight measurement complete! Ready for height.");
          setIsMeasuring(false);
          setCurrentMeasurement("");
          stopMonitoring();
          
          setTimeout(() => {
            sensorAPI.shutdownWeight();
          }, 1000);
        }
        
        if (type === "height" && data.height && data.height > 100 && data.height < 220 && !height) {
          setHeight(data.height.toFixed(1));
          setMeasurementComplete(true);
          setStatusMessage("✅ All measurements complete!");
          setIsMeasuring(false);
          setCurrentMeasurement("");
          stopMonitoring();
          
          setTimeout(() => {
            sensorAPI.shutdownHeight();
          }, 1000);
        }

        // Handle error states
        if (data.status === 'error' || data.status.includes('failed') || data.status.includes('invalid')) {
          setStatusMessage(`❌ ${type} measurement failed, retrying...`);
          handleRetry();
        }

      } catch (error) {
        console.error(`Error polling ${type} status:`, error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        if (currentMeasurement === "weight") {
          startWeightMeasurement();
        } else if (currentMeasurement === "height") {
          startHeightMeasurement();
        } else {
          initializeSensors();
        }
      }, 2000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the sensors.");
    }
  };

  const stopMonitoring = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  };

  const calculateBMI = () => {
    if (!weight || !height) return null;
    
    const heightInMeters = parseFloat(height) / 100;
    const bmi = parseFloat(weight) / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return { category: "", description: "", class: "" };
    
    const bmiValue = parseFloat(bmi);
    
    if (bmiValue < 18.5) {
      return {
        category: "Underweight",
        description: "Consider consulting a healthcare provider",
        class: "underweight"
      };
    } else if (bmiValue < 25) {
      return {
        category: "Normal",
        description: "Healthy weight range",
        class: "normal"
      };
    } else if (bmiValue < 30) {
      return {
        category: "Overweight",
        description: "Consider lifestyle adjustments",
        class: "overweight"
      };
    } else {
      return {
        category: "Obese",
        description: "Consult a healthcare provider",
        class: "obese"
      };
    }
  };

  const handleContinue = () => {
    if (!measurementComplete || !weight || !height) return;
    
    stopMonitoring();
    
    navigate("/bodytemp", {
      state: { 
        ...location.state, 
        weight: parseFloat(weight),
        height: parseFloat(height)
      },
    });
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="bmi-container">
      <div className={`bmi-content ${isVisible ? 'visible' : ''}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `25%` }}></div>
          </div>
          <span className="progress-step">Step 1 of 4 - BMI</span>
        </div>

        <div className="bmi-header">
          <h1 className="bmi-title">Body Mass Index (BMI)</h1>
          <p className="bmi-subtitle">{statusMessage}</p>
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

        <div className="sensor-display-section">
          {/* Measurement Cards */}
          <div className="bmi-cards-container">
            {/* Weight Card */}
            <div className="measurement-card bmi-card">
              <img src={weightIcon} alt="Weight Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Weight</h3>
                <div className="measurement-value">
                  <span className="value">
                    {weight || "--.--"}
                  </span>
                  <span className="unit">kg</span>
                </div>
                <span className={`measurement-status ${
                  currentMeasurement === "weight" ? "measuring" : 
                  weight ? "complete" : "default"
                }`}>
                  {currentMeasurement === "weight" ? "Measuring..." : 
                   weight ? "Measured" : "Waiting"}
                </span>
              </div>
            </div>

            {/* Height Card */}
            <div className="measurement-card bmi-card">
              <img src={heightIcon} alt="Height Icon" className="measurement-icon"/>
              <div className="measurement-info">
                <h3>Height</h3>
                <div className="measurement-value">
                  <span className="value">
                    {height || "--.--"}
                  </span>
                  <span className="unit">cm</span>
                </div>
                <span className={`measurement-status ${
                  currentMeasurement === "height" ? "measuring" : 
                  height ? "complete" : "default"
                }`}>
                  {currentMeasurement === "height" ? "Measuring..." : 
                   height ? "Measured" : "Waiting"}
                </span>
              </div>
            </div>
          </div>

          {/* BMI Result Card */}
          {bmi && (
            <div className="bmi-result-card">
              <div className="bmi-result-header">
                <h3>BMI Result</h3>
              </div>
              <div className="bmi-result-content">
                <div className="bmi-value-display">
                  <span className="bmi-value">{bmi}</span>
                  <span className="bmi-unit">kg/m²</span>
                </div>
                <div className={`bmi-category ${bmiCategory.class}`}>
                  {bmiCategory.category}
                </div>
                <div className="bmi-description">
                  {bmiCategory.description}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="measurement-controls">
          {!isMeasuring && !measurementComplete && (
            <div className="measurement-buttons">
              {!weight ? (
                <button 
                  className="measure-button" 
                  onClick={startWeightMeasurement}
                  disabled={isMeasuring}
                >
                  {isMeasuring && currentMeasurement === "weight" ? (
                    <>
                      <div className="spinner"></div>
                      Measuring Weight...
                    </>
                  ) : (
                    "Start Weight Measurement"
                  )}
                </button>
              ) : !height ? (
                <button 
                  className="measure-button" 
                  onClick={startHeightMeasurement}
                  disabled={isMeasuring}
                >
                  {isMeasuring && currentMeasurement === "height" ? (
                    <>
                      <div className="spinner"></div>
                      Measuring Height...
                    </>
                  ) : (
                    "Start Height Measurement"
                  )}
                </button>
              ) : null}
            </div>
          )}
          
          {measurementComplete && (
            <span className="success-text">✓ BMI Measurement Complete</span>
          )}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete || !weight || !height}
          >
            Continue to Temperature
          </button>
        </div>
      </div>
    </div>
  );
}