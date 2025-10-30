import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BMI.css";
import weightIcon from "../../../assets/icons/weight-icon.png";
import heightIcon from "../../../assets/icons/height-icon.png";
import { sensorAPI } from "../../../utils/api";

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
  const [measurementStep, setMeasurementStep] = useState(0); // 0: not started, 1: weight, 2: height, 3: complete
  const [countdown, setCountdown] = useState(0);
  
  // New interactive state variables
  const [weightMeasuring, setWeightMeasuring] = useState(false);
  const [heightMeasuring, setHeightMeasuring] = useState(false);
  const [weightComplete, setWeightComplete] = useState(false);
  const [heightComplete, setHeightComplete] = useState(false);
  const [bmiComplete, setBmiComplete] = useState(false);
  const [liveWeightValue, setLiveWeightValue] = useState("");
  const [liveHeightValue, setLiveHeightValue] = useState("");

  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const countdownRef = useRef(null);
  const weightIntervalRef = useRef(null);
  const heightIntervalRef = useRef(null);
  const measurementStarted = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeSensors();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      stopCountdown();
      clearSimulatedMeasurements();
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
      
      setStatusMessage("Ready to measure BMI. Click the button to start.");
      
    } catch (error) {
      console.error("Sensor initialization error:", error);
      setStatusMessage("❌ Failed to initialize sensors");
      handleRetry();
    }
  };

  const startBMIMeasurement = async () => {
    if (measurementStep === 0) {
      // Start with weight measurement
      await startWeightMeasurement();
    } else if (measurementStep === 1 && weight) {
      // Move to height measurement
      await startHeightMeasurement();
    } else if (measurementStep === 2 && height) {
      // Measurements complete, navigate to next page
      handleContinue();
    }
  };

  const startCountdown = (seconds) => {
    setCountdown(seconds);
    countdownRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setCountdown(0);
  };

  const clearSimulatedMeasurements = () => {
    if (weightIntervalRef.current) {
      clearInterval(weightIntervalRef.current);
      weightIntervalRef.current = null;
    }
    if (heightIntervalRef.current) {
      clearInterval(heightIntervalRef.current);
      heightIntervalRef.current = null;
    }
  };

  const startWeightMeasurement = async () => {
    try {
      setCurrentMeasurement("weight");
      setIsMeasuring(true);
      setWeightMeasuring(true);
      setStatusMessage("Starting weight measurement...");
      setMeasurementStep(1);
      
      // Simulate live measurement updates
      clearSimulatedMeasurements();
      let simulatedWeight = 0;
      weightIntervalRef.current = setInterval(() => {
        simulatedWeight += Math.random() * 5;
        if (simulatedWeight > 70) {
          simulatedWeight = 70 + Math.random() * 20; // Final weight range 70-90kg
          clearInterval(weightIntervalRef.current);
        }
        setLiveWeightValue(simulatedWeight.toFixed(1));
      }, 200);
      
      const response = await sensorAPI.startWeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        clearInterval(weightIntervalRef.current);
        return;
      }
      
      setStatusMessage("Please step on the scale and stand still.");
      measurementStarted.current = true;
      startCountdown(10);
      startMonitoring("weight");
      
    } catch (error) {
      console.error("Start weight error:", error);
      setStatusMessage("❌ Failed to start weight measurement");
      handleRetry();
      clearInterval(weightIntervalRef.current);
    }
  };

  const startHeightMeasurement = async () => {
    try {
      setCurrentMeasurement("height");
      setIsMeasuring(true);
      setHeightMeasuring(true);
      setStatusMessage("Starting height measurement...");
      setMeasurementStep(2);
      
      // Simulate live measurement updates
      clearSimulatedMeasurements();
      let simulatedHeight = 150;
      heightIntervalRef.current = setInterval(() => {
        simulatedHeight += Math.random() * 2;
        if (simulatedHeight > 175) {
          simulatedHeight = 170 + Math.random() * 15; // Final height range 170-185cm
          clearInterval(heightIntervalRef.current);
        }
        setLiveHeightValue(simulatedHeight.toFixed(1));
      }, 200);
      
      const response = await sensorAPI.startHeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        clearInterval(heightIntervalRef.current);
        return;
      }
      
      setStatusMessage("Please stand under the height sensor.");
      measurementStarted.current = true;
      startCountdown(8);
      startMonitoring("height");
      
    } catch (error) {
      console.error("Start height error:", error);
      setStatusMessage("❌ Failed to start height measurement");
      handleRetry();
      clearInterval(heightIntervalRef.current);
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
          setWeightMeasuring(false);
          setWeightComplete(true);
          setLiveWeightValue(""); // Clear live value
          setStatusMessage("✅ Weight measurement complete! Click the button to measure height.");
          setIsMeasuring(false);
          setCurrentMeasurement("");
          setMeasurementStep(2);
          stopMonitoring();
          stopCountdown();
          clearSimulatedMeasurements();
          
          setTimeout(() => {
            sensorAPI.shutdownWeight();
          }, 1000);
        }
        
        if (type === "height" && data.height && data.height > 100 && data.height < 220 && !height) {
          setHeight(data.height.toFixed(1));
          setHeightMeasuring(false);
          setHeightComplete(true);
          setMeasurementComplete(true);
          setBmiComplete(true);
          setLiveHeightValue(""); // Clear live value
          setStatusMessage("✅ All measurements complete! Click the button to continue.");
          setIsMeasuring(false);
          setCurrentMeasurement("");
          setMeasurementStep(3);
          stopMonitoring();
          stopCountdown();
          clearSimulatedMeasurements();
          
          setTimeout(() => {
            sensorAPI.shutdownHeight();
          }, 1000);
        }

        // Handle error states
        if (data.status === 'error' || data.status.includes('failed') || data.status.includes('invalid')) {
          setStatusMessage(`❌ ${type} measurement failed, retrying...`);
          handleRetry();
          clearSimulatedMeasurements();
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
      clearSimulatedMeasurements();
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

  // ✅ CORRECTED: Navigation to BodyTemp with proper path
  const handleContinue = () => {
    if (!measurementComplete || !weight || !height) return;
    
    stopMonitoring();
    clearSimulatedMeasurements();
    
    // Prepare data to pass to BodyTemp
    const bmiData = {
      ...location.state, // User personal info from Starting page
      weight: parseFloat(weight),
      height: parseFloat(height),
      bmi: calculateBMI()
    };
    
    console.log("Navigating to BodyTemp with data:", bmiData);
    
    navigate("/measure/bodytemp", {
      state: bmiData
    });
  };

  const getButtonText = () => {
    if (isMeasuring) {
      return `Measuring ${currentMeasurement === "weight" ? "Weight" : "Height"}...`;
    }
    
    switch (measurementStep) {
      case 0:
        return "Start BMI Measurement";
      case 1:
        return weight ? "Start Height Measurement" : "Measuring Weight...";
      case 2:
        return height ? "Continue to Temperature" : "Measuring Height...";
      case 3:
        return "Continue to Temperature";
      default:
        return "Start BMI Measurement";
    }
  };

  const getButtonDisabled = () => {
    return isMeasuring || (measurementStep === 3 && (!weight || !height));
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="bmi-container">
      <div className={`bmi-content ${isVisible ? 'visible' : ''}`}>
        {/* Progress bar for Step 1 of 4 */}
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
          {/* 2 cards on top (weight & height), 1 card below (BMI result) */}
          <div className="bmi-cards-container">
            {/* Top Row - Weight and Height Cards */}
            <div className="bmi-cards-top-row">
              {/* Weight Card */}
              <div className={`measurement-card bmi-card ${
                weightMeasuring ? 'measuring-active' : 
                weightComplete ? 'measurement-complete' : ''
              }`}>
                <img src={weightIcon} alt="Weight Icon" className="measurement-icon"/>
                <div className="measurement-info">
                  <h3>Weight</h3>
                  <div className="measurement-value">
                    <span className={`value ${
                      weightMeasuring ? 'measuring-live' : ''
                    }`}>
                      {weightMeasuring ? (liveWeightValue || "00.0") : 
                       weight || "--.--"}
                    </span>
                    <span className="unit">kg</span>
                  </div>
                  <span className={`measurement-status ${
                    weightMeasuring ? "measuring" : 
                    weight ? "complete" : "default"
                  }`}>
                    {weightMeasuring ? "Measuring..." : 
                     weight ? "Measured" : "Waiting"}
                  </span>
                </div>
              </div>

              {/* Height Card */}
              <div className={`measurement-card bmi-card ${
                heightMeasuring ? 'measuring-active' : 
                heightComplete ? 'measurement-complete' : ''
              }`}>
                <img src={heightIcon} alt="Height Icon" className="measurement-icon"/>
                <div className="measurement-info">
                  <h3>Height</h3>
                  <div className="measurement-value">
                    <span className={`value ${
                      heightMeasuring ? 'measuring-live' : ''
                    }`}>
                      {heightMeasuring ? (liveHeightValue || "000.0") : 
                       height || "--.--"}
                    </span>
                    <span className="unit">cm</span>
                  </div>
                  <span className={`measurement-status ${
                    heightMeasuring ? "measuring" : 
                    height ? "complete" : "default"
                  }`}>
                    {heightMeasuring ? "Measuring..." : 
                     height ? "Measured" : "Waiting"}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row - BMI Result Card */}
            <div className="bmi-cards-bottom-row">
              <div className={`bmi-result-card ${
                bmiComplete ? 'has-result' : ''
              }`}>
                <div className="bmi-result-header">
                  <h3>BMI Result</h3>
                </div>
                <div className="bmi-result-content">
                  <div className="bmi-value-display">
                    <span className="bmi-value">
                      {bmi || "--.--"}
                    </span>
                    <span className="bmi-unit">kg/m²</span>
                  </div>
                  {bmi && (
                    <>
                      <div className={`bmi-category ${bmiCategory.class}`}>
                        {bmiCategory.category}
                      </div>
                      <div className="bmi-description">
                        {bmiCategory.description}
                      </div>
                    </>
                  )}
                  {!bmi && (
                    <div className="measurement-status default">
                      Pending
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* INSTRUCTION DISPLAY - Horizontal layout with 3 cards */}
          <div className="instruction-container">
            <div className="instruction-cards-horizontal">
              {/* Step 1 Card */}
              <div className={`instruction-card-step ${
                measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">1</div>
                <div className="step-icon">🚀</div>
                <h4 className="step-title">Start Measurement</h4>
                <p className="step-description">
                  Click the button to begin BMI measurement process
                </p>
                <div className={`step-status ${
                  measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 1 ? (measurementStep > 1 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>

              {/* Step 2 Card */}
              <div className={`instruction-card-step ${
                measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''
              }`}>
                <div className="step-number-circle">2</div>
                <div className="step-icon">⚖️</div>
                <h4 className="step-title">Stand Still</h4>
                <p className="step-description">
                  {isMeasuring && currentMeasurement === "weight" 
                    ? "On scale - wait for measurement"
                    : isMeasuring && currentMeasurement === "height"
                    ? "Under sensor - wait for measurement"
                    : "Follow instructions for each measurement"
                  }
                </p>
                {isMeasuring && countdown > 0 && (
                  <div className="countdown-mini">
                    <div className="countdown-mini-circle">
                      <span className="countdown-mini-number">{countdown}</span>
                    </div>
                    <span className="countdown-mini-text">seconds</span>
                  </div>
                )}
                <div className={`step-status ${
                  measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : 'pending'
                }`}>
                  {measurementStep >= 2 ? (measurementStep > 2 ? 'Completed' : 'Active') : 'Pending'}
                </div>
              </div>

              {/* Step 3 Card */}
              <div className={`instruction-card-step ${
                measurementStep >= 3 ? 'completed' : ''
              }`}>
                <div className="step-number-circle">3</div>
                <div className="step-icon">✅</div>
                <h4 className="step-title">Continue</h4>
                <p className="step-description">
                  {measurementComplete 
                    ? "BMI complete! Continue to next step" 
                    : "Click to proceed after measurements"
                  }
                </p>
                <div className={`step-status ${
                  measurementStep >= 3 ? 'completed' : 'pending'
                }`}>
                  {measurementStep >= 3 ? 'Completed' : 'Pending'}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={startBMIMeasurement} 
            disabled={getButtonDisabled()}
          >
            {isMeasuring && (
              <div className="spinner"></div>
            )}
            {getButtonText()}
            {measurementComplete && (
              <span style={{fontSize: '0.8rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
                Weight: {weight}kg • Height: {height}cm
              </span>
            )}
          </button>
          
          {/* Debug info */}
          <div style={{ 
            marginTop: '10px', 
            fontSize: '0.7rem', 
            color: '#666',
            textAlign: 'center',
            padding: '5px',
            background: '#f5f5f5',
            borderRadius: '5px',
            fontFamily: 'monospace'
          }}>
            Step: {measurementStep} | 
            Status: {measurementComplete ? '✅ COMPLETE' : '⏳ MEASURING'} | 
            Weight: {weight || '--'} | 
            Height: {height || '--'} |
            Path: /measure/bodytemp
          </div>
        </div>
      </div>
    </div>
  );
}