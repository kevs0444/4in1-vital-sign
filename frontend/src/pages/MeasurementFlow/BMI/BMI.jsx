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
  
  // Interactive state variables
  const [weightMeasuring, setWeightMeasuring] = useState(false);
  const [heightMeasuring, setHeightMeasuring] = useState(false);
  const [weightComplete, setWeightComplete] = useState(false);
  const [heightComplete, setHeightComplete] = useState(false);
  const [bmiComplete, setBmiComplete] = useState(false);
  
  // Live measurement data
  const [liveWeightData, setLiveWeightData] = useState({
    current: null,
    progress: 0,
    status: 'idle',
    elapsed: 0,
    total: 3
  });
  const [liveHeightData, setLiveHeightData] = useState({
    current: null,
    progress: 0,
    status: 'idle',
    elapsed: 0,
    total: 2
  });

  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const countdownRef = useRef(null);
  const weightIntervalRef = useRef(null);
  const heightIntervalRef = useRef(null);
  const measurementStarted = useRef(false);

  // Add viewport meta tag to prevent zooming
  useEffect(() => {
    // Create or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';
    
    // Prevent zooming via touch gestures
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });
    
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    console.log("📍 BMI received location.state:", location.state);
    initializeSensors();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      stopCountdown();
      clearSimulatedMeasurements();
    };
  }, []);

  // Prevent zooming functions
  const handleTouchStart = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
    }
  };

  const preventZoom = (e) => {
    e.preventDefault();
  };

  // Add conversion functions
  const kgToLbs = (kg) => {
    if (!kg) return "";
    return (parseFloat(kg) * 2.20462).toFixed(1);
  };

  const cmToFeet = (cm) => {
    if (!cm) return "";
    const feet = parseFloat(cm) / 30.48;
    const wholeFeet = Math.floor(feet);
    const inches = Math.round((feet - wholeFeet) * 12);
    return `${wholeFeet}'${inches}"`;
  };

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
    } else if (measurementStep === 3) {
      // All measurements complete, proceed to BodyTemp
      navigateToBodyTemp();
    }
  };

  const navigateToBodyTemp = () => {
    // Prepare data to pass to next page - MERGE existing data with new BMI data
    const measurementData = {
      ...location.state, // User personal info from Starting page
      weight: parseFloat(weight),
      height: parseFloat(height),
      bmi: calculateBMI()
    };
    
    console.log("🚀 BMI complete - navigating to BodyTemp with data:", measurementData);
    
    // Navigate to Body Temperature measurement
    navigate('/measure/bodytemp', { state: measurementData });
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
      
      // CLEAR PREVIOUS DATA - This ensures fresh measurement each time
      setWeight("");
      setWeightComplete(false);
      setLiveWeightData({
        current: null,
        progress: 0,
        status: 'detecting',
        elapsed: 0,
        total: 3  // 3 seconds for weight
      });
      
      // Start actual sensor measurement
      const response = await sensorAPI.startWeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Please step on the scale and stand still for 3 seconds");
      measurementStarted.current = true;
      startCountdown(3); // 3 seconds for weight
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
      setHeightMeasuring(true);
      setStatusMessage("Starting height measurement...");
      setMeasurementStep(2);
      
      // CLEAR PREVIOUS DATA - This ensures fresh measurement each time
      setHeight("");
      setHeightComplete(false);
      setLiveHeightData({
        current: null,
        progress: 0,
        status: 'detecting',
        elapsed: 0,
        total: 2  // 2 seconds for height
      });
      
      // Start actual sensor measurement
      const response = await sensorAPI.startHeight();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Please stand under the height sensor for 2 seconds");
      measurementStarted.current = true;
      startCountdown(2); // 2 seconds for height
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
        
        // Update live data
        if (data.live_data) {
          if (type === "weight") {
            setLiveWeightData(data.live_data);
            
            // Update progress
            if (data.live_data.progress > 0) {
              setProgress(data.live_data.progress);
            }
            
            // Update status message based on live data
            if (data.live_data.status === 'detecting') {
              setStatusMessage("Step on scale and stand still for 3 seconds");
            } else if (data.live_data.status === 'measuring') {
              setStatusMessage(`Measuring weight... ${data.live_data.elapsed}/${data.live_data.total}s`);
            }
            
          } else if (type === "height") {
            setLiveHeightData(data.live_data);
            
            // Update progress
            if (data.live_data.progress > 0) {
              setProgress(data.live_data.progress);
            }
            
            // Update status message based on live data
            if (data.live_data.status === 'detecting') {
              setStatusMessage("Stand under sensor for 2 seconds");
            } else if (data.live_data.status === 'measuring') {
              setStatusMessage(`Measuring height... ${data.live_data.elapsed}/${data.live_data.total}s`);
            }
          }
        }
        
        setIsMeasuring(data.measurement_active);

        // Handle measurement completion - SIMPLIFIED
        if (type === "weight" && data.weight && data.weight > 0 && !weight) {
          setWeight(data.weight.toFixed(1));
          setWeightMeasuring(false);
          setWeightComplete(true);
          setStatusMessage("✅ Weight measurement complete! Starting height measurement...");
          setIsMeasuring(false);
          setCurrentMeasurement("");
          setMeasurementStep(2);
          stopMonitoring();
          stopCountdown();
          
          // AUTOMATICALLY START HEIGHT MEASUREMENT AFTER WEIGHT
          setTimeout(() => {
            sensorAPI.shutdownWeight();
            // Start height measurement after a short delay
            setTimeout(() => {
              startHeightMeasurement();
            }, 1000);
          }, 1000);
        }
        
        if (type === "height" && data.height && data.height > 100 && data.height < 220 && !height) {
          setHeight(data.height.toFixed(1));
          setHeightMeasuring(false);
          setHeightComplete(true);
          setMeasurementComplete(true);
          setBmiComplete(true);
          setStatusMessage("✅ All measurements complete! Click the button to continue to Body Temperature.");
          setIsMeasuring(false);
          setCurrentMeasurement("");
          setMeasurementStep(3);
          stopMonitoring();
          stopCountdown();
          
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
    }, 500);
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
    
    // Prepare data to pass to next page
    const bmiData = {
      ...location.state, // User personal info from Starting page
      weight: parseFloat(weight),
      height: parseFloat(height),
      bmi: calculateBMI()
    };
    
    console.log("🚀 BMI complete - continuing to BodyTemp with data:", bmiData);
    setStatusMessage("✅ BMI measurement complete! Click the button to continue to Body Temperature.");
    setMeasurementStep(3);
    
    // Actually navigate to BodyTemp
    navigate('/measure/bodytemp', { state: bmiData });
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
        return height ? "Continue to Next Step" : "Measuring Height...";
      case 3:
        return "Continue to Body Temperature";
      default:
        return "Start BMI Measurement";
    }
  };

  const getButtonDisabled = () => {
    return isMeasuring || (measurementStep === 3 && (!weight || !height));
  };

  // Get display value for weight (live data or final result)
  const getWeightDisplayValue = () => {
    if (weight) return weight; // Final result
    if (liveWeightData.current && weightMeasuring) {
      return liveWeightData.current.toFixed(1); // Live data
    }
    return "--.--";
  };

  // Get display value for height (live data or final result)
  const getHeightDisplayValue = () => {
    if (height) return height; // Final result
    if (liveHeightData.current && heightMeasuring) {
      return liveHeightData.current.toFixed(1); // Live data
    }
    return "--.--";
  };

  // Get status text for weight
  const getWeightStatusText = () => {
    if (weight) return "Measured";
    if (weightMeasuring) {
      switch (liveWeightData.status) {
        case 'detecting': return "Detecting...";
        case 'measuring': return `Measuring... ${liveWeightData.elapsed}/${liveWeightData.total}s`;
        default: return "Measuring...";
      }
    }
    return "Pending";
  };

  // Get status text for height
  const getHeightStatusText = () => {
    if (height) return "Measured";
    if (heightMeasuring) {
      switch (liveHeightData.status) {
        case 'detecting': return "Detecting...";
        case 'measuring': return `Measuring... ${liveHeightData.elapsed}/${liveHeightData.total}s`;
        default: return "Measuring...";
      }
    }
    return "Pending";
  };

  const bmi = calculateBMI();
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="bmi-container">
      <div className={`bmi-content ${isVisible ? 'visible' : ''}`}>
        {/* Progress bar for Step 1 of 4 */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill red-progress" style={{ width: `25%` }}></div>
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
                  className="progress-fill-horizontal red-progress"
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
                      weightMeasuring && liveWeightData.current ? 'measuring-live' : ''
                    }`}>
                      {getWeightDisplayValue()}
                    </span>
                    <span className="unit">kg</span>
                  </div>
                  <div className="height-feet-display">
                    {weight ? `${kgToLbs(weight)} lbs` : 
                     (liveWeightData.current ? `${kgToLbs(liveWeightData.current.toFixed(1))} lbs` : "--.-- lbs")}
                  </div>
                  <span className={`measurement-status ${
                    weightMeasuring ? "measuring" : 
                    weight ? "complete" : "default"
                  }`}>
                    {getWeightStatusText()}
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
                      heightMeasuring && liveHeightData.current ? 'measuring-live' : ''
                    }`}>
                      {getHeightDisplayValue()}
                    </span>
                    <span className="unit">cm</span>
                  </div>
                  <div className="height-feet-display">
                    {height ? `${cmToFeet(height)}` : 
                     (liveHeightData.current ? `${cmToFeet(liveHeightData.current.toFixed(1))}` : "--'--\"")}
                  </div>
                  <span className={`measurement-status ${
                    heightMeasuring ? "measuring" : 
                    height ? "complete" : "default"
                  }`}>
                    {getHeightStatusText()}
                  </span>
                </div>
              </div>
            </div>

            {/* Bottom Row - BMI Result Card */}
            <div className="bmi-cards-bottom-row">
              <div className={`bmi-result-card ${
                bmiComplete ? `has-result ${bmiCategory.class}` : ''
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
                <div className="step-icon">⚖️</div>
                <h4 className="step-title">Measure Weight</h4>
                <p className="step-description">
                  Stand still for 3 seconds
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
                <div className="step-icon">📏</div>
                <h4 className="step-title">Measure Height</h4>
                <p className="step-description">
                  Stand still under height sensor for 2 seconds
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
                <h4 className="step-title">Complete</h4>
                <p className="step-description">
                  {measurementComplete 
                    ? "BMI calculated! Continue to Body Temperature" 
                    : "BMI will be calculated automatically"
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
          </button>
        </div>
      </div>
    </div>
  );
}