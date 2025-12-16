import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
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
  const [showExitModal, setShowExitModal] = useState(false);

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



  const handleBack = () => {
    if (measurementStep > 0) {
      clearSimulatedMeasurements();
    } else {
      navigate(-1);
    }
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
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
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 measurement-container">
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 measurement-content ${isVisible ? 'visible' : ''}`}>
        <button className="close-button" onClick={handleExit}>←</button>

        {/* Progress bar for Step X of Y */}
        <div className="w-100 mb-4">
          <div className="measurement-progress-bar">
            <div className="measurement-progress-fill" style={{ width: `${progressInfo.percentage}%` }}></div>
          </div>
          <span className="measurement-progress-step">Step {progressInfo.currentStep} of {progressInfo.totalSteps} - BMI</span>
        </div>

        <div className="text-center mb-4">
          <h1 className="measurement-title">Body Mass Index <span className="measurement-title-accent">(BMI)</span></h1>
          <p className="measurement-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator text-warning fw-bold">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="w-50 mx-auto mt-2">
              <div className="measurement-progress-bar">
                <div
                  className="measurement-progress-fill"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="measurement-progress-step text-center d-block">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="w-100">
          <div className="row g-4 justify-content-center mb-4">
            {/* Weight Card */}
            <div className="col-12 col-md-6">
              <div className={`measurement-card h-100 ${weightMeasuring ? 'active' : ''} ${weightComplete ? 'completed' : ''}`}>
                <div className="measurement-icon">
                  <img src={weightIcon} alt="Weight Icon" />
                </div>
                <h3 className="instruction-title">Weight</h3>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {getWeightDisplayValue()}
                  </span>
                  <span className="measurement-unit">kg</span>
                </div>
                <div className="text-muted small mb-3">
                  {weight ? `${kgToLbs(weight)} lbs` :
                    (liveWeightData.current ? `${kgToLbs(liveWeightData.current.toFixed(1))} lbs` : "--.-- lbs")}
                </div>
                <span className={`measurement-status-badge ${weightMeasuring ? "active" : weight ? "complete" : "pending"}`}>
                  {getWeightStatusText()}
                </span>
              </div>
            </div>

            {/* Height Card */}
            <div className="col-12 col-md-6">
              <div className={`measurement-card h-100 ${heightMeasuring ? 'active' : ''} ${heightComplete ? 'completed' : ''}`}>
                <div className="measurement-icon">
                  <img src={heightIcon} alt="Height Icon" />
                </div>
                <h3 className="instruction-title">Height</h3>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {getHeightDisplayValue()}
                  </span>
                  <span className="measurement-unit">cm</span>
                </div>
                <div className="text-muted small mb-3">
                  {height ? `${cmToFeet(height)}` :
                    (liveHeightData.current ? `${cmToFeet(liveHeightData.current.toFixed(1))}` : "--'--\"")}
                </div>
                <span className={`measurement-status-badge ${heightMeasuring ? "active" : height ? "complete" : "pending"}`}>
                  {getHeightStatusText()}
                </span>
              </div>
            </div>

            {/* BMI Result Card - Full Width on small screens, centered */}
            <div className="col-12">
              <div className={`measurement-card ${bmiComplete ? 'completed' : ''}`}>
                <h3 className="instruction-title fs-3">BMI Result</h3>
                <div className="measurement-value-container">
                  <span className="measurement-value">
                    {bmi || "--.--"}
                  </span>
                  <span className="measurement-unit">kg/m²</span>
                </div>
                {bmi && (
                  <>
                    <div className={`measurement-status-badge ${bmiCategory.class} mb-3`}>
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
          <div className="w-100 mt-4">
            <div className="row g-3 justify-content-center">
              {/* Step 1 Card */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 1 ? (measurementStep > 1 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">1</div>
                  <div className="instruction-icon">⚖️</div>
                  <h4 className="instruction-title">Measure Weight</h4>
                  <p className="instruction-text">
                    Stand still for 3 seconds
                  </p>
                </div>
              </div>

              {/* Step 2 Card */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 2 ? (measurementStep > 2 ? 'completed' : 'active') : ''}`}>
                  <div className="instruction-step-number">2</div>
                  <div className="instruction-icon">📏</div>
                  <h4 className="instruction-title">Measure Height</h4>
                  <p className="instruction-text">
                    Stand still under height sensor for 2 seconds
                  </p>
                  {isMeasuring && countdown > 0 && (
                    <div className="text-danger fw-bold mt-2">
                      {countdown}s
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 Card */}
              <div className="col-12 col-md-4">
                <div className={`instruction-card h-100 ${measurementStep >= 3 ? 'completed' : ''}`}>
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
        </div>

        {/* ACTION BUTTON */}
        <div className="measurement-navigation mt-5">
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

      <Modal show={showExitModal} onHide={() => setShowExitModal(false)} centered className="exit-modal">
        <Modal.Header closeButton>
          <Modal.Title>Exit Measurement?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Do you want to go back or cancel the measurement?</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExitModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmExit}>Exit Measurement</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}