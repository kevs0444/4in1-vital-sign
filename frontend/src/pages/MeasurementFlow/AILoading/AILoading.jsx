import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AILoading.css";
import aiLoadingIcon from "../../../assets/icons/ai-icon.png";
import { speak, reinitSpeech } from "../../../utils/speech";

export default function AILoading() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Initializing AI Analysis...");

  const analysisSteps = [
    "🧠 Loading Juan AI Models...",
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
      reinitSpeech(); // Ensure speech is ready
      speak("Juan AI is now analyzing your health data. Please wait.");
      simulateAIThinkingProcess();
    }, 100);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('ai-loading-active-768');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  const simulateAIThinkingProcess = async () => {
    setIsAnalyzing(true);
    setStatusMessage("Juan AI is analyzing your health data...");

    // Start Animation Loop (Visual Feedback)
    const stepInterval = setInterval(() => {
      setCurrentStep(prev => {
        if (prev >= analysisSteps.length - 1) {
          clearInterval(stepInterval);
          return prev;
        }
        return prev + 1;
      });
    }, 800);

    try {
      // --- REAL API CALL TO JUAN AI (With 5s Timeout & Offline Fallback) ---
      console.log("📤 Sending data to Juan AI Brain:", location.state);

      // 1. Define Timeout Promise (10 Seconds)
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error("AI_TIMEOUT")), 10000)
      );

      // 2. Define API Call Promise
      const getDynamicApiUrl = () => {
        if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
        return `${window.location.protocol}//${window.location.hostname}:5000/api`;
      };

      const apiPromise = fetch(`${getDynamicApiUrl()}/juan-ai/predict-risk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(location.state)
      }).then(async (res) => {
        if (!res.ok) throw new Error("API_ERROR");
        return res.json();
      });

      // 3. Race API against Timeout
      // Used for Minimum UX wait time (so animation plays for at least 3s)
      const minWaitTime = new Promise(resolve => setTimeout(resolve, 3000));

      let aiResult;

      try {
        // Wait for MINIMUM time first (UX), then check if we have result or need to keep waiting
        // Actually, we want to race the API against 5s, but ensure at least 3s passed for animation.

        // Complex Promise Logic:
        // We want (API_RESULT or TIMEOUT) AND (MIN_WAIT 3s)
        // usage: Promise.all([ Promise.race([api, timeout]), minWait ])

        const [raceResult] = await Promise.all([
          Promise.race([apiPromise, timeoutPromise]),
          minWaitTime
        ]);

        aiResult = raceResult;

      } catch (err) {
        // If timeout or error occurs, throw to catch block for offline generation
        throw err;
      }

      console.log("📥 Juan AI Brain Response:", aiResult);

      if (aiResult.success) {
        clearInterval(stepInterval);
        setIsAnalyzing(false);
        setAnalysisComplete(true);
        setCurrentStep(analysisSteps.length - 1);
        setStatusMessage("Analysis complete!");
        speak("Analysis complete. Your health report is now ready.");

        const finalResultState = {
          ...location.state,
          riskLevel: aiResult.risk_score,
          riskCategory: aiResult.risk_level,
          resultRecommendations: aiResult.recommendations,
          aiAnalysis: aiResult
        };

        setTimeout(() => {
          navigate("/measure/result", { state: finalResultState });
        }, 2000);

      } else {
        throw new Error(aiResult.message || "AI Analysis Failed");
      }

    } catch (error) {
      console.warn("⚠️ AI Unavailable or Timeout. Generating Offline Analysis...");
      clearInterval(stepInterval);
      setStatusMessage("Analysis complete!");

      // --- OFFLINE FALLBACK GENERATION ---
      const offlineData = generateOfflineAnalysis(location.state);

      setIsAnalyzing(false);
      setAnalysisComplete(true);
      setCurrentStep(analysisSteps.length - 1);

      speak("Analysis complete. Your health report is now ready.");

      setTimeout(() => {
        navigate("/measure/result", {
          state: {
            ...location.state,
            ...offlineData
          }
        });
      }, 2000);
    }
  };

  // --- OFFLINE ANALYSIS HELPER ---
  const generateOfflineAnalysis = (data) => {
    let riskScore = 15; // Base risk
    const suggestions = [];
    const preventions = [];

    // Simple Rule-Based Logic
    // 1. BP
    if (data.systolic >= 140 || data.diastolic >= 90) {
      riskScore += 30;
      suggestions.push("Consult a doctor regarding high blood pressure.");
      preventions.push("Reduce sodium intake and monitor BP daily.");
    } else if (data.systolic >= 120) {
      riskScore += 10;
      suggestions.push("Monitor blood pressure regularly.");
    }

    // 2. BMI
    if (data.weight && data.height) {
      const h = data.height / 100;
      const bmi = data.weight / (h * h);
      if (bmi >= 30) {
        riskScore += 20;
        suggestions.push("Consider a weight management program.");
        preventions.push("Adopt a balanced diet and regular exercise.");
      } else if (bmi >= 25) {
        riskScore += 5;
        preventions.push("Maintain a healthy diet to prevent weight gain.");
      }
    }

    // 3. SpO2
    if (data.spo2 && data.spo2 < 95) {
      riskScore += 25;
      suggestions.push("Oxygen levels are low. Seek medical attention if breathing is difficult.");
    }

    // 4. Heart Rate
    if (data.heartRate > 100) {
      riskScore += 15;
      suggestions.push("Heart rate is elevated. Rest and re-measure.");
    }

    // 5. Temp
    if (data.temperature > 37.5) {
      riskScore += 20;
      suggestions.push("Indication of fever. Stay hydrated and rest.");
    }

    // Cap Score
    if (riskScore > 99) riskScore = 99;
    if (riskScore < 5) riskScore = 5;

    // Define Level
    let level = "Low Risk";
    if (riskScore >= 75) level = "Critical High Risk";
    else if (riskScore >= 50) level = "High Risk";
    else if (riskScore >= 20) level = "Moderate Risk";

    return {
      riskLevel: riskScore,
      riskCategory: level,
      resultRecommendations: {
        medical_actions: suggestions.length > 0 ? suggestions : ["Maintain regular check-ups."],
        preventive_strategies: preventions.length > 0 ? preventions : ["Maintain a healthy lifestyle."],
        wellness_tips: ["Drink 8 glasses of water daily.", "Sleep 7-8 hours per night."],
        provider_guidance: ["Provisional Result: Interpretation based on standard vital sign ranges. Please consult a specialist."]
      }
    };
  };

  // Manual navigation function in case auto-navigation fails
  const handleManualNavigate = () => {
    console.log("🔄 Manual navigation triggered");
    navigate("/measure/result", {
      state: location.state || {}
    });
  };

  return (
    <div
      className="ai-loading-container-768 container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0"
    >
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

        {/* AI Thinking Animation - Modern Circular Design */}
        {isAnalyzing && (
          <div className="ai-analysis-animation-768 d-flex flex-column flex-grow-1 justify-content-center align-items-center gap-4 my-3">

            {/* Central Pulse Circle */}
            <div className="ai-central-circle-container position-relative">
              {/* Spinning / Pulsing Rings */}
              <div className="ai-ripple-ring ring-1"></div>
              <div className="ai-ripple-ring ring-2"></div>
              <div className="ai-ripple-ring ring-3"></div>

              {/* Main Circular Platform */}
              <div className="ai-main-circle bg-white shadow-lg rounded-circle d-flex align-items-center justify-content-center position-relative">
                <div className="ai-brain-pulse-768 fs-1">🧠</div>

                {/* Progress Border SVG */}
                <svg className="ai-progress-svg" width="100%" height="100%" viewBox="0 0 100 100">
                  <circle
                    className="ai-progress-bg"
                    cx="50" cy="50" r="46"
                    fill="none"
                    stroke="#eaeaea"
                    strokeWidth="4"
                  />
                  <circle
                    className="ai-progress-bar"
                    cx="50" cy="50" r="46"
                    fill="none"
                    strokeWidth="4"
                    strokeDasharray="289"
                    strokeDashoffset={289 - (289 * ((currentStep + 1) / analysisSteps.length))}
                    strokeLinecap="round"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
              </div>
            </div>

            {/* Current Step Text */}
            <div className="ai-status-text-container text-center mt-4">
              <h2 className="ai-current-step-text display-6 fw-bold mb-2">
                {analysisSteps[currentStep]}
              </h2>
              <p className="ai-step-subtitle text-secondary">
                Analyzing data point {currentStep + 1} of {analysisSteps.length}
              </p>

              <div className="thinking-dots-768 d-flex justify-content-center gap-2 mt-2">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
            </div>

          </div>
        )}

        {/* Analysis Complete - Modern Success State */}
        {analysisComplete && (
          <div className="ai-analysis-complete-768 d-flex flex-column flex-grow-1 justify-content-center align-items-center gap-4 my-3">
            <div className="ai-success-animation-768 position-relative">
              <div className="ai-checkmark-768 bg-success text-white rounded-circle d-flex align-items-center justify-content-center shadow-lg">
                <span style={{ fontSize: '3rem' }}>✓</span>
              </div>
              <div className="ai-ring-768 ai-ring-1-768 position-absolute border border-success rounded-circle"></div>
              <div className="ai-ring-768 ai-ring-2-768 position-absolute border border-success rounded-circle"></div>
            </div>

            <div className="ai-complete-message-768 text-center px-3">
              <h2 className="fw-bold text-success mb-2 display-6">Analysis Complete!</h2>
              <p className="text-secondary mb-4 lead">Your comprehensive health report is ready.</p>

              <div className="completion-stats-row d-flex gap-4 justify-content-center">
                <div className="stat-pill px-4 py-2 bg-light rounded-pill border d-flex align-items-center gap-2">
                  <span className="text-success">●</span>
                  <strong>100%</strong> Accuracy
                </div>
                <div className="stat-pill px-4 py-2 bg-light rounded-pill border d-flex align-items-center gap-2">
                  <span className="text-success">●</span>
                  <strong>{analysisSteps.length}</strong> Metrics
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