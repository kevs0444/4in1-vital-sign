import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BMI.css";
import "../main-components-measurement.css";
import weightIcon from "../../../assets/icons/weight-icon.png";
import heightIcon from "../../../assets/icons/height-icon.png";
import { sensorAPI } from "../../../utils/api";
import { getNextStepPath, getProgressInfo, isLastStep } from "../../../utils/checklistNavigation";

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

  const initializeSensors = async () => {
    setStatusMessage("Initializing sensors...");
    // Start with weight measurement
    startWeightMeasurement();
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

  const clearSimulatedMeasurements = async () => {
    if (weightIntervalRef.current) {
      clearInterval(weightIntervalRef.current);
      weightIntervalRef.current = null;
    }
    if (heightIntervalRef.current) {
      clearInterval(heightIntervalRef.current);
      heightIntervalRef.current = null;
    }
    setWeight("");
    setHeight("");
    setWeightComplete(false);
    setHeightComplete(false);
    setBmiComplete(false);
    setIsMeasuring(false);
    setWeightMeasuring(false);
    setHeightMeasuring(false);
    setCurrentMeasurement("");
    setMeasurementStep(0);
    setStatusMessage("Initializing...");
    setProgress(0);
    setRetryCount(0);
    setLiveWeightData({ current: null, progress: 0, status: 'idle', elapsed: 0, total: 3 });
    setLiveHeightData({ current: null, progress: 0, status: 'idle', elapsed: 0, total: 2 });
    measurementStarted.current = false;
  };

  const startWeightMeasurement = async () => {
    try {
      setCurrentMeasurement("weight");
      setIsMeasuring(true);
      setWeightMeasuring(true);
      setStatusMessage("Starting weight measurement...");
      setMeasurementStep(1);

      // CLEAR PREVIOUS DATA
      setWeight("");
      setWeightComplete(false);
      setLiveWeightData({
        current: null,
        progress: 0,
        status: 'detecting',
        elapsed: 0,
        total: 3
      });

      const response = await sensorAPI.startWeight();

      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }

      setStatusMessage("Please step on the scale and stand still for 3 seconds");
      measurementStarted.current = true;
      startCountdown(3);
      startMonitoring("weight");

    } catch (error) {
      console.error("Start weight error:", error);
      setStatusMessage("❌ Failed to start weight measurement");
      handleRetry();
    }
  };

  const startHeightMeasurement = async () => {
    try {
      // Ensure weight sensor is shut down before starting height
      await sensorAPI.shutdownWeight();

      setCurrentMeasurement("height");
      setIsMeasuring(true);
      setHeightMeasuring(true);
      setStatusMessage("Starting height measurement...");
      setMeasurementStep(2);

      // CLEAR PREVIOUS DATA
      setHeight("");
      setHeightComplete(false);
      setLiveHeightData({
        current: null,
        progress: 0,
        status: 'detecting',
        elapsed: 0,
        total: 2
      });

      const response = await sensorAPI.startHeight();

      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
        return;
      }

      setStatusMessage("Please stand under the height sensor for 2 seconds");
      measurementStarted.current = true;
      startCountdown(2);
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

        // Handle measurement completion - WEIGHT
        if (type === "weight") {
          const isWeightComplete = (data.weight && data.weight > 0) ||
            (data.live_data && data.live_data.status === 'complete' && data.weight);

          if (isWeightComplete && !weight) {
            const finalWeight = data.weight.toFixed(1);
            setWeight(finalWeight);
            setWeightMeasuring(false);
            setWeightComplete(true);
            setStatusMessage("✅ Weight measurement complete! Starting height measurement...");
            setIsMeasuring(false);

            // Transition to Height
            setCurrentMeasurement("height");
            setMeasurementStep(2);
            stopMonitoring();
            stopCountdown();

            // Start Height Measurement after a short delay
            setTimeout(() => {
              startHeightMeasurement();
            }, 2000);
          }
        }

        // Handle measurement completion - HEIGHT
        if (type === "height") {
          const isHeightComplete = (data.height && data.height > 0) ||
            (data.live_data && data.live_data.status === 'complete' && data.height);

          if (isHeightComplete && !height) {
            const finalHeight = data.height.toFixed(1);
            setHeight(finalHeight);
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

  const kgToLbs = (kg) => {
    if (!kg) return "--";
    return (parseFloat(kg) * 2.20462).toFixed(1);
  };

  const cmToFeet = (cm) => {
    if (!cm) return "--'--\"";
    const realFeet = ((cm * 0.393700) / 12);
    const feet = Math.floor(realFeet);
    const inches = Math.round((realFeet - feet) * 12);
    return `${feet}'${inches}"`;
  };

  const startBMIMeasurement = () => {
    if (measurementStep === 0) {
      startWeightMeasurement();
    } else if (measurementStep === 1 && weight) {
      startHeightMeasurement();
    } else if (measurementStep === 2 && height) {
      handleContinue();
    } else if (measurementStep === 3) {
      handleContinue();
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
        class: "warning"
      };
    } else if (bmiValue < 25) {
      return {
        category: "Normal",
        description: "Healthy weight range",
        class: "complete" // Using 'complete' class for success/green
      };
    } else if (bmiValue < 30) {
      return {
        category: "Overweight",
        description: "Consider lifestyle adjustments",
        class: "warning"
      };
    } else {
      return {
        category: "Obese",
        description: "Consult a healthcare provider",
        class: "error"
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

    console.log("🚀 BMI complete - continuing to next step with data:", bmiData);
    setStatusMessage("✅ BMI measurement complete! Click the button to continue.");
    setMeasurementStep(3);

    // Determine next step dynamically
    const nextPath = getNextStepPath('bmi', location.state?.checklist);
    navigate(nextPath, { state: bmiData });
  };

  const getButtonText = () => {
    if (isMeasuring) {
      return `Measuring ${currentMeasurement === "weight" ? "Weight" : "Height"}...`;
    }

    const isLast = isLastStep('bmi', location.state?.checklist);

    switch (measurementStep) {
      case 0:
        return "Start BMI Measurement";
      case 1:
        return weight ? "Start Height Measurement" : "Measuring Weight...";
      case 2:
        return height ? (isLast ? "Continue to Result" : "Continue to Next Step") : "Measuring Height...";
      case 3:
        return isLast ? "Continue to Result" : "Continue to Next Step";
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
  const progressInfo = getProgressInfo('bmi', location.state?.checklist);

  return (
    <div className="measurement-container">
      <div className={`measurement-content ${isVisible ? 'visible' : ''}`}>
        {/* Progress bar for Step X of Y */}
        <div className="measurement-progress-container">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${progressInfo.percentage}%` }}></div>
          </div>
          <span className="measurement-progress-step">Step {progressInfo.currentStep} of {progressInfo.totalSteps} - BMI</span>
        </div>

        <div className="measurement-header">
          <h1 className="measurement-title">Body Mass Index <span className="measurement-title-accent">(BMI)</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="measurement-progress-container" style={{ width: '50%', margin: '0 auto' }}>
              <div className="measurement-progress-bar">
                <div
                  className="measurement-progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="measurement-progress-step" style={{ textAlign: 'center' }}>{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="measurement-display-section">
          {/* 2 cards on top (weight & height), 1 card below (BMI result) */}
          <div className="measurement-grid-2-1">
            {/* Top Row - Weight and Height Cards */}
            <div className="measurement-row">
              {/* Weight Card */}
              <div className={`measurement-card ${weightMeasuring ? 'active' : ''} ${weightComplete ? 'completed' : ''}`}>
                <div className="measurement-icon" style={{ width: '60px', height: '60px', marginBottom: '15px' }}>
                  <img src={weightIcon} alt="Weight Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Weight</h3>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {getWeightDisplayValue()}
                  </span>
                  <span className="measurement-unit">kg</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  {weight ? `${kgToLbs(weight)} lbs` :
                    (liveWeightData.current ? `${kgToLbs(liveWeightData.current.toFixed(1))} lbs` : "--.-- lbs")}
                </div>
                <span className={`measurement-status-badge ${weightMeasuring ? "active" : weight ? "complete" : "pending"}`}>
                  {getWeightStatusText()}
                </span>
              </div>

              {/* Height Card */}
              <div className={`measurement-card ${heightMeasuring ? 'active' : ''} ${heightComplete ? 'completed' : ''}`}>
                <div className="measurement-icon" style={{ width: '60px', height: '60px', marginBottom: '15px' }}>
                  <img src={heightIcon} alt="Height Icon" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>
                <h3 className="instruction-title">Height</h3>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {getHeightDisplayValue()}
                  </span>
                  <span className="measurement-unit">cm</span>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: '10px' }}>
                  {height ? `${cmToFeet(height)}` :
                    (liveHeightData.current ? `${cmToFeet(liveHeightData.current.toFixed(1))}` : "--'--\"")}
                </div>
                <span className={`measurement-status-badge ${heightMeasuring ? "active" : height ? "complete" : "pending"}`}>
                  {getHeightStatusText()}
                </span>
              </div>
            </div>

            {/* Bottom Row - BMI Result Card */}
            <div className="measurement-row">
              <div className={`measurement-card ${bmiComplete ? 'completed' : ''}`} style={{ minWidth: '300px' }}>
                <h3 className="instruction-title" style={{ fontSize: '1.5rem' }}>BMI Result</h3>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {bmi || "--.--"}
                  </span>
                  <span className="measurement-unit">kg/m²</span>
                </div>
                {bmi && (
                  <>
                    <div className={`measurement-status-badge ${bmiCategory.class}`} style={{ marginBottom: '10px' }}>
                      {bmiCategory.category}
                    </div>
                    <div className="instruction-text">
                      {bmiCategory.description}
                    </div>
                  </>
                )}
                {!bmi && (
                  <div className="measurement-status-badge pending">
                    Pending
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* INSTRUCTION DISPLAY */}
          <div className="measurement-instruction-container">
            <div className="instruction-cards">
              {/* Step 1 Card */}
              <div className={`instruction-card ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                <div className="instruction-step-number">1</div>
                <div className="instruction-icon">⚖️</div>
                <h4 className="instruction-title">Measure Weight</h4>
                <p className="instruction-text">
                  Stand still for 3 seconds
                </p>
              </div>

              {/* Step 2 Card */}
              <div className={`instruction-card ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                <div className="instruction-step-number">2</div>
                <div className="instruction-icon">📏</div>
                <h4 className="instruction-title">Measure Height</h4>
                <p className="instruction-text">
                  Stand still under height sensor for 2 seconds
                </p>
                {isMeasuring && countdown > 0 && (
                  <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '5px' }}>
                    {countdown}s
                  </div>
                )}
              </div>

              {/* Step 3 Card */}
              <div className={`instruction-card ${measurementStep >= 3 ? 'completed' : ''}`}>
                <div className="instruction-step-number">3</div>
                <div className="instruction-icon">✅</div>
                <h4 className="instruction-title">Complete</h4>
                <p className="instruction-text">
                  {measurementComplete
                    ? "BMI calculated! Continue to Body Temperature"
                    : "BMI will be calculated automatically"
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* UPDATED BUTTON SECTION */}
        <div className="measurement-action-container">
          <button
            className="measurement-button"
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