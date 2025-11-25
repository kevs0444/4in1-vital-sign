import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Saving.css";

export default function Saving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(true);
  const [saveComplete, setSaveComplete] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);

  const steps = useMemo(() => {
    const baseSteps = ["Encrypting health data"];
    const checklist = location.state?.checklist || [];

    if (checklist.includes('bmi') || (location.state?.weight && location.state?.height)) {
      baseSteps.push("Saving BMI calculations");
    }
    if (checklist.includes('bodytemp') || location.state?.temperature) {
      baseSteps.push("Recording temperature data");
    }
    if (checklist.includes('max30102') || location.state?.heartRate) {
      baseSteps.push("Processing vital signs");
    }
    if (checklist.includes('bloodpressure') || location.state?.systolic) {
      baseSteps.push("Archiving blood pressure logs");
    }

    baseSteps.push("Finalizing health records");
    return baseSteps;
  }, [location.state]);

  useEffect(() => {
    if (location.state) {
      console.log("📍 Saving page received data:", location.state);
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      simulateSaveProcess();
    }, 100);

    return () => clearTimeout(timer);
  }, [location.state]);

  const simulateSaveProcess = () => {
    setIsSaving(true);
    setCompletedSteps([]);

    steps.forEach((step, index) => {
      setTimeout(() => {
        setCompletedSteps(prev => [...prev, step]);

        if (index === steps.length - 1) {
          setTimeout(() => {
            setIsSaving(false);
            setSaveComplete(true);

            setTimeout(() => {
              navigate("/measure/sharing", {
                state: location.state
              });
            }, 2000);
          }, 500);
        }
      }, (index + 1) * 800);
    });
  };

  const isStepCompleted = (step) => {
    return completedSteps.includes(step);
  };

  return (
    <div className="saving-page">
      <div className={`saving-container ${isVisible ? 'visible' : ''}`}>

        {/* Header Section */}
        <div className="header-section">
          <div className="main-icon">
            <div className="icon-circle saving">
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </div>
          <h1 className="main-title">
            {isSaving ? "Saving Your Data" : "Data Saved!"}
          </h1>
          <p className="subtitle">
            {isSaving
              ? "Securely storing your health information..."
              : "All your health data has been successfully saved"
            }
          </p>
        </div>

        {/* Progress Section */}
        {isSaving && (
          <div className="progress-section">
            <div className="progress-visual">
              <div className="progress-ring">
                <div className="ring-bg"></div>
                <div
                  className="ring-fill"
                  style={{
                    transform: `rotate(${(completedSteps.length / steps.length) * 360}deg)`
                  }}
                ></div>
                <div className="ring-center">
                  <div className="pulse-dot"></div>
                  <span className="progress-count">
                    {completedSteps.length}/{steps.length}
                  </span>
                </div>
              </div>
            </div>

            <div className="steps-container">
              {steps.map((step, index) => (
                <StepItem
                  key={index}
                  step={step}
                  isCompleted={isStepCompleted(step)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Success Section */}
        {saveComplete && (
          <div className="success-section">
            <div className="success-visual">
              <div className="success-icon">
                <div className="icon-circle success">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div className="success-ripple ripple-1"></div>
                <div className="success-ripple ripple-2"></div>
                <div className="success-ripple ripple-3"></div>
              </div>
            </div>
            <div className="success-message">
              <h2>Complete Health Profile Saved!</h2>
              <p>Your health assessment, risk analysis, and recommendations have been securely stored.</p>
            </div>
          </div>
        )}

        {/* Navigation Info */}
        <div className="nav-info">
          {saveComplete && (
            <div className="redirect-message">
              <div className="loading-indicator">
                <div className="dot"></div>
                <div className="dot"></div>
                <div className="dot"></div>
              </div>
              <span>Redirecting to share options...</span>
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="security-footer">
          <div className="security-badge">
            <div className="lock-icon">
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <div className="security-text">
              <strong>Your health data is secure</strong>
              <span>Encrypted & protected by healthcare privacy standards</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Separate component for perfect step alignment
const StepItem = ({ step, isCompleted }) => {
  return (
    <div className={`step-item ${isCompleted ? 'completed' : ''}`}>
      <div className="step-indicator">
        <div className="step-dot"></div>
      </div>
      <span className="step-label">{step}</span>
      <div className="step-status">
        {isCompleted ? 'Completed' : 'In progress'}
      </div>
    </div>
  );
};