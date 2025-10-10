import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./AILoading.css";
import aiLoadingIcon from "../../assets/icons/ai-icon.png";

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
    }
    
    // Prevent body scrolling when component mounts
    document.body.classList.add('ai-loading-active');
    
    // Animation trigger and start analysis process
    const timer = setTimeout(() => {
      setIsVisible(true);
      simulateAIThinkingProcess();
    }, 100);

    return () => {
      clearTimeout(timer);
      document.body.classList.remove('ai-loading-active');
    };
  }, [location.state]);

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
    }, 600);

    // Complete the analysis after 4 seconds
    setTimeout(() => {
      clearInterval(stepInterval);
      setIsAnalyzing(false);
      setAnalysisComplete(true);
      setCurrentStep(analysisSteps.length - 1);
      
      // Auto navigate to result page after 2 seconds
      setTimeout(() => {
        console.log("🧠 AI Thinking Complete - Navigating to Result with RAW DATA:", location.state);
        navigate("/result", { 
          state: location.state // Pass the original data directly
        });
      }, 2000);
    }, 4000);
  };

  return (
    <div className="ai-loading-container">
      <div className={`ai-loading-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="ai-loading-header">
          <div className="ai-loading-icon">
            <img src={aiLoadingIcon} alt="AI Thinking" />
          </div>
          <h1 className="ai-loading-title">
            {isAnalyzing ? "AI Analysis in Progress" : analysisComplete ? "Analysis Complete!" : "AI Initializing"}
          </h1>
          <p className="ai-loading-subtitle">
            {isAnalyzing 
              ? "Our AI is carefully analyzing your health data patterns..." 
              : analysisComplete 
                ? "Your comprehensive health assessment is ready"
                : "Starting AI analysis engine..."
            }
          </p>
        </div>

        {/* AI Thinking Animation */}
        {isAnalyzing && (
          <div className="ai-analysis-animation">
            <div className="ai-progress-ring">
              <div className="ai-ring-background"></div>
              <div className="ai-ring-progress"></div>
              <div className="ai-ring-center">
                <div className="ai-brain-pulse">🧠</div>
              </div>
            </div>
            
            {/* Dynamic Analysis Steps */}
            <div className="ai-analysis-steps">
              {analysisSteps.map((step, index) => (
                <div 
                  key={index}
                  className={`ai-analysis-step ${index <= currentStep ? 'active' : ''} ${
                    index === currentStep ? 'current' : ''
                  }`}
                >
                  <span className="ai-step-check">
                    {index < currentStep ? '✓' : index === currentStep ? '⟳' : ''}
                  </span>
                  <span className="ai-step-text">{step}</span>
                  {index === currentStep && (
                    <div className="thinking-dots">
                      <span>.</span>
                      <span>.</span>
                      <span>.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* AI Thinking Status */}
            <div className="ai-thinking-status">
              <div className="thinking-text">
                AI is analyzing {currentStep + 1}/{analysisSteps.length} steps...
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${((currentStep + 1) / analysisSteps.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Analysis Complete */}
        {analysisComplete && (
          <div className="ai-analysis-complete">
            <div className="ai-success-animation">
              <div className="ai-checkmark">✓</div>
              <div className="ai-success-rings">
                <div className="ai-ring ai-ring-1"></div>
                <div className="ai-ring ai-ring-2"></div>
                <div className="ai-ring ai-ring-3"></div>
              </div>
            </div>
            <div className="ai-complete-message">
              <h3>AI Analysis Complete!</h3>
              <p>Your health data has been processed and insights are ready for review.</p>
              <div className="completion-stats">
                <div className="stat-item">
                  <strong>{analysisSteps.length}</strong>
                  <span>Analysis Steps</span>
                </div>
                <div className="stat-item">
                  <strong>100%</strong>
                  <span>Data Processed</span>
                </div>
                <div className="stat-item">
                  <strong>AI</strong>
                  <span>Powered</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auto Navigation */}
        <div className="ai-auto-navigate">
          {analysisComplete && (
            <span className="ai-navigate-text">
              Preparing your comprehensive health results...
            </span>
          )}
        </div>

        {/* AI Processing Notice */}
        <div className="ai-processing-notice">
          <div className="ai-processing-icon">🤖</div>
          <div className="ai-processing-text">
            <strong>AI Neural Network Processing</strong>
            <span>Testing Phase - Advanced pattern recognition in progress</span>
          </div>
        </div>

        {/* Testing Phase Badge */}
        <div className="testing-badge">
          <span className="badge-icon">🔬</span>
          <span className="badge-text">Capstone Testing Phase</span>
        </div>
      </div>
    </div>
  );
}