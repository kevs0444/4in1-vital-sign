import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AILoading.css";
import aiLoadingIcon from "../../../assets/icons/ai-icon.png";

export default function AILoading() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing AI Analysis...");

  const analysisSteps = [
    "Analyzing Vital Signs",
    "Processing Health Patterns",
    "Assessing Risk Factors",
    "Generating Insights",
    "Finalizing Report"
  ];

  useEffect(() => {
    // Get user data from location state
    console.log("🧠 AI Loading page received location.state:", location.state);

    if (location.state) {
      console.log("✅ Data received in AI Loading:", {
        hasWeight: !!location.state.weight,
        hasHeight: !!location.state.height,
        hasTemperature: !!location.state.temperature,
        hasHeartRate: !!location.state.heartRate,
        hasSpo2: !!location.state.spo2,
        hasBloodPressure: !!location.state.bloodPressure,
        hasSystolic: !!location.state.systolic,
        hasDiastolic: !!location.state.diastolic,
        hasPersonalInfo: !!location.state.firstName,
        fullData: location.state
      });

      // Store in session storage as backup
      sessionStorage.setItem('vitalSignsData', JSON.stringify(location.state));
      setStatusMessage("Juan AI is analyzing your health data...");
    } else {
      console.log("🔄 No data in location.state, checking session storage");
      const storedData = sessionStorage.getItem('vitalSignsData');
      if (storedData) {
        console.log("📦 Using data from session storage");
        // If no location state but we have stored data, use it
        setTimeout(() => {
          navigate("/measure/result", {
            state: JSON.parse(storedData)
          });
        }, 2000);
        return;
      } else {
        console.error("❌ No data received in AI Loading page!");
        setStatusMessage("No data received. Please start over.");
        return;
      }
    }

    // Prevent body scrolling when component mounts with unique class
    document.body.classList.add('ai-loading-active-768');

    // Animation trigger and start analysis process
    const timer = setTimeout(() => {
      setIsVisible(true);
      simulateAIThinkingProcess();
    }, 100);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('ai-loading-active-768');
    };
  }, [location.state]);

  const simulateAIThinkingProcess = () => {
    setIsAnalyzing(true);
    setStatusMessage("Juan AI is analyzing your health data...");

    // Simulate AI thinking steps
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= analysisSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800); // Slightly slower for better animation

    // Complete the analysis after 5 seconds
    setTimeout(() => {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      setCurrentStep(analysisSteps.length - 1);
      setStatusMessage("Analysis complete! Redirecting to results...");

      // Auto navigate to result page after 3 seconds
      setTimeout(() => {
        console.log("🧠 AI Thinking Complete - Navigating to Result with data:", location.state);
        // ✅ FIXED: Navigate to result with the received data
        navigate("/measure/result", {
          state: location.state // Pass the original data directly
        });
      }, 3000);
    }, 5000);
  };

  // Manual navigation function in case auto-navigation fails
  const handleManualNavigate = () => {
    console.log("🔄 Manual navigation triggered");
    navigate("/measure/result", {
      state: location.state || {}
    });
  };

  return (
    <div className="ai-loading-container-768 container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0">
      <div className={`ai-loading-content-768 card border-0 shadow-lg p-4 p-md-5 mx-3 ${isVisible ? 'visible' : ''}`} style={{ maxWidth: '680px', borderRadius: '1.7rem' }}>

        {/* Header with larger centered AI icon */}
        <div className="ai-loading-header-768 text-center mb-3">
          <div className="ai-loading-icon-768 d-flex justify-content-center mb-4">
            <img src={aiLoadingIcon} alt="Juan AI Logo" className="img-fluid rounded-circle p-3" style={{ width: '160px', height: '160px', objectFit: 'contain' }} />
          </div>
          <h1 className="ai-loading-title-768 display-5 fw-bold mb-2">
            {isAnalyzing ? "Juan AI is Thinking" : analysisComplete ? "Analysis Complete!" : "Juan AI Initializing"}
          </h1>
          <p className="ai-loading-subtitle-768 lead text-secondary px-2">
            {isAnalyzing
              ? "Juan AI is carefully analyzing your health data patterns..."
              : analysisComplete
                ? "Your comprehensive health assessment is ready"
                : "Starting Juan AI analysis engine..."
            }
          </p>
        </div>

        {/* Status Message Display */}
        <div className="ai-status-message-768 alert alert-light border shadow-sm text-center py-3 my-2 rounded-4">
          <strong>Status:</strong> {statusMessage}
        </div>

        {/* AI Thinking Animation */}
        {isAnalyzing && (
          <div className="ai-analysis-animation-768 d-flex flex-column flex-grow-1 justify-content-around gap-3 my-3">
            <div className="ai-progress-ring-768 mx-auto position-relative" style={{ width: '140px', height: '140px' }}>
              <div className="ai-ring-background-768 position-absolute w-100 h-100 rounded-circle border border-5"></div>
              <div className="ai-ring-progress-768 position-absolute w-100 h-100 rounded-circle border border-5"></div>
              <div className="ai-ring-center-768 position-absolute top-50 start-50 translate-middle bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: '85px', height: '85px' }}>
                <div className="ai-brain-pulse-768 fs-1">🧠</div>
              </div>
            </div>

            {/* Dynamic Analysis Steps */}
            <div className="ai-analysis-steps-768 d-flex flex-column align-items-center gap-2 my-2 w-100">
              {analysisSteps.map((step, index) => (
                <div
                  key={index}
                  className={`ai-analysis-step-768 d-flex align-items-center gap-3 p-3 rounded-4 w-100 border ${index <= currentStep ? 'active border-success bg-white shadow-sm' : 'bg-light border-transparent'}`}
                  style={{ maxWidth: '320px', transition: 'all 0.3s' }}
                >
                  <span className={`ai-step-check-768 d-flex align-items-center justify-content-center rounded-circle text-white fw-bold ${index < currentStep ? 'bg-success' : 'bg-secondary'}`} style={{ width: '28px', height: '28px', minWidth: '28px' }}>
                    {index < currentStep ? '✓' : index === currentStep ? '⟳' : ''}
                  </span>
                  <span className="ai-step-text-768 flex-grow-1 text-start fw-semibold text-dark">{step}</span>
                  {index === currentStep && (
                    <div className="thinking-dots-768 d-flex gap-1 text-success fw-bold fs-5">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Thinking Status */}
            <div className="ai-thinking-status-768 px-3">
              <div className="thinking-text-768 text-secondary fw-medium mb-2 text-center">
                Juan AI is analyzing {currentStep + 1}/{analysisSteps.length} steps...
              </div>
              <div className="progress rounded-pill" style={{ height: '8px' }}>
                <div
                  className="progress-bar bg-success progress-bar-striped progress-bar-animated"
                  role="progressbar"
                  style={{ width: `${((currentStep + 1) / analysisSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Complete */}
        {analysisComplete && (
          <div className="ai-analysis-complete-768 d-flex flex-column flex-grow-1 justify-content-around gap-4 my-3">
            <div className="ai-success-animation-768 position-relative mx-auto" style={{ width: '150px', height: '150px' }}>
              <div className="ai-checkmark-768 position-absolute top-50 start-50 translate-middle bg-success text-white rounded-circle d-flex align-items-center justify-content-center shadow" style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}>✓</div>
              <div className="ai-ring-768 ai-ring-1-768 position-absolute border border-success rounded-circle"></div>
              <div className="ai-ring-768 ai-ring-2-768 position-absolute border border-success rounded-circle"></div>
              <div className="ai-ring-768 ai-ring-3-768 position-absolute border border-success rounded-circle"></div>
            </div>
            <div className="ai-complete-message-768 text-center px-2">
              <h3 className="fw-bold text-success mb-2">Juan AI Analysis Complete!</h3>
              <p className="text-secondary mb-0 lead">Your health data has been processed and insights are ready for review.</p>
              <div className="completion-stats-768 d-flex justify-content-center gap-4 mt-3">
                <div className="stat-item-768 d-flex flex-column align-items-center">
                  <strong className="text-success fs-4">{analysisSteps.length}</strong>
                  <span className="text-secondary small">Analysis Steps</span>
                </div>
                <div className="stat-item-768 d-flex flex-column align-items-center">
                  <strong className="text-success fs-4">100%</strong>
                  <span className="text-secondary small">Data Processed</span>
                </div>
                <div className="stat-item-768 d-flex flex-column align-items-center">
                  <strong className="text-success fs-4">Juan AI</strong>
                  <span className="text-secondary small">Powered</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Navigation */}
        <div className="ai-auto-navigate-768 text-center mt-auto">
          {analysisComplete && (
            <div>
              <span className="ai-navigate-text-768 text-secondary fw-medium">
                Preparing your comprehensive health results...
              </span>
              <br />
              <button
                onClick={handleManualNavigate}
                className="btn btn-success mt-3 rounded-3 px-4 py-2"
              >
                Click here if not automatically redirected
              </button>
            </div>
          )}
        </div>

        {/* AI Processing Notice */}
        <div className="ai-processing-notice-768 d-flex align-items-center justify-content-center gap-2 mt-4 opacity-75">
          <div className="ai-processing-icon-768 fs-5">🤖</div>
          <div className="ai-processing-text-768 d-flex flex-column text-start small text-secondary">
            <strong className="text-dark">Juan AI Neural Network</strong>
            <span>Advanced pattern recognition in progress</span>
          </div>
        </div>

        {/* Documentation Badge */}
        <div className="documentation-badge-768 d-none">
          <span className="badge-icon-768">📚</span>
          <span className="badge-text-768">Juan AI Health Analysis System</span>
        </div>

        {/* Manual navigation button for debugging */}
        {!isAnalyzing && !analysisComplete && (
          <div className="ai-manual-nav-768 text-center mt-3">
            <button
              onClick={handleManualNavigate}
              className="btn btn-outline-secondary"
            >
              Manual Navigate to Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
}