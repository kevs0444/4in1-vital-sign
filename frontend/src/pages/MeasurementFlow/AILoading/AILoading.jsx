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

  const analysisSteps = [
    "Analyzing Vital Signs",
    "Processing Health Patterns", 
    "Assessing Risk Factors",
    "Generating Insights",
    "Finalizing Report"
  ];

  useEffect(() => {
    // Get user data from location state
    if (location.state) {
      console.log("🧠 AI Loading page received RAW DATA:", location.state);
    } else {
      console.error("❌ No data received in AI Loading page!");
      // If no data, redirect back to max30102
      navigate("/max30102");
      return;
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
  }, [location.state, navigate]);

  const simulateAIThinkingProcess = () => {
    setIsAnalyzing(true);
    
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
      
      // Auto navigate to result page after 3 seconds
      setTimeout(() => {
        console.log("🧠 AI Thinking Complete - Navigating to Result with RAW DATA:", location.state);
        navigate("/result", { 
          state: location.state // Pass the original data directly
        });
      }, 3000);
    }, 5000);
  };

  return (
    <div className="ai-loading-container-768">
      <div className={`ai-loading-content-768 ${isVisible ? 'visible' : ''}`}>
        
        {/* Header with larger centered AI icon */}
        <div className="ai-loading-header-768">
          <div className="ai-loading-icon-768">
            <img src={aiLoadingIcon} alt="Juan AI Logo" />
          </div>
          <h1 className="ai-loading-title-768">
            {isAnalyzing ? "Juan AI is Thinking" : analysisComplete ? "Analysis Complete!" : "Juan AI Initializing"}
          </h1>
          <p className="ai-loading-subtitle-768">
            {isAnalyzing 
              ? "Juan AI is carefully analyzing your health data patterns..." 
              : analysisComplete 
                ? "Your comprehensive health assessment is ready"
                : "Starting Juan AI analysis engine..."
            }
          </p>
        </div>

        {/* AI Thinking Animation */}
        {isAnalyzing && (
          <div className="ai-analysis-animation-768">
            <div className="ai-progress-ring-768">
              <div className="ai-ring-background-768"></div>
              <div className="ai-ring-progress-768"></div>
              <div className="ai-ring-center-768">
                <div className="ai-brain-pulse-768">🧠</div>
              </div>
            </div>
            
            {/* Dynamic Analysis Steps */}
            <div className="ai-analysis-steps-768">
              {analysisSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`ai-analysis-step-768 ${index <= currentStep ? 'active' : ''} ${
                    index === currentStep ? 'current' : ''
                  }`}
                >
                  <span className="ai-step-check-768">
                    {index < currentStep ? '✓' : index === currentStep ? '⟳' : ''}
                  </span>
                  <span className="ai-step-text-768">{step}</span>
                  {index === currentStep && (
                    <div className="thinking-dots-768">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Thinking Status */}
            <div className="ai-thinking-status-768">
              <div className="thinking-text-768">
                Juan AI is analyzing {currentStep + 1}/{analysisSteps.length} steps...
              </div>
              <div className="progress-bar-768">
                <div 
                  className="progress-fill-768"
                  style={{ width: `${((currentStep + 1) / analysisSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Complete */}
        {analysisComplete && (
          <div className="ai-analysis-complete-768">
            <div className="ai-success-animation-768">
              <div className="ai-checkmark-768">✓</div>
              <div className="ai-ring-768 ai-ring-1-768"></div>
              <div className="ai-ring-768 ai-ring-2-768"></div>
              <div className="ai-ring-768 ai-ring-3-768"></div>
            </div>
            <div className="ai-complete-message-768">
              <h3>Juan AI Analysis Complete!</h3>
              <p>Your health data has been processed and insights are ready for review.</p>
              <div className="completion-stats-768">
                <div className="stat-item-768">
                  <strong>{analysisSteps.length}</strong>
                  <span>Analysis Steps</span>
                </div>
                <div className="stat-item-768">
                  <strong>100%</strong>
                  <span>Data Processed</span>
                </div>
                <div className="stat-item-768">
                  <strong>Juan AI</strong>
                  <span>Powered</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Navigation */}
        <div className="ai-auto-navigate-768">
          {analysisComplete && (
            <span className="ai-navigate-text-768">
              Preparing your comprehensive health results...
            </span>
          )}
        </div>

        {/* AI Processing Notice */}
        <div className="ai-processing-notice-768">
          <div className="ai-processing-icon-768">🤖</div>
          <div className="ai-processing-text-768">
            <strong>Juan AI Neural Network</strong>
            <span>Testing Phase - Advanced pattern recognition in progress</span>
          </div>
        </div>

        {/* Testing Phase Badge */}
        <div className="testing-badge-768">
          <span className="badge-icon-768">🔬</span>
          <span className="badge-text-768">Juan AI Capstone Testing Phase</span>
        </div>
      </div>
    </div>
  );
}