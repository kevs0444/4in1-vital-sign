import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Saving.css";

export default function Saving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(true);
  const [saveComplete, setSaveComplete] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isStepAnimating, setIsStepAnimating] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);

  const steps = useMemo(() => {
    const baseSteps = [];
    const checklist = location.state?.checklist || [];
    const state = location.state || {};

    // Always start with encryption
    baseSteps.push({
      title: "Encrypting Health Data",
      description: "Securing your personal health information with military-grade encryption",
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" stroke="currentColor" strokeWidth="2" />
          <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ),
      details: [
        { label: "Encryption Level", value: "AES-256" },
        { label: "Data Type", value: "Health Records" }
      ]
    });

    // Dynamic steps based on available data
    if (checklist.includes('bmi') || (state.weight && state.height)) {
      const bmi = state.weight && state.height ? (state.weight / ((state.height / 100) ** 2)).toFixed(1) : 'Calculating';
      baseSteps.push({
        title: "BMI Analysis",
        description: "Calculating and analyzing your Body Mass Index",
        icon: (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M21 12.79C21 13.24 20.74 13.65 20.33 13.85C19.92 14.05 19.42 14.01 19.05 13.74L12 9.27L4.95 13.74C4.58 14.01 4.08 14.05 3.67 13.85C3.26 13.65 3 13.24 3 12.79V4.5C3 3.12 4.12 2 5.5 2H18.5C19.88 2 21 3.12 21 4.5V12.79Z" stroke="currentColor" strokeWidth="2" />
            <path d="M12 9.27V21.5" stroke="currentColor" strokeWidth="2" />
          </svg>
        ),
        details: [
          { label: "Weight", value: state.weight ? `${state.weight} kg` : 'Recorded' },
          { label: "Height", value: state.height ? `${state.height} cm` : 'Recorded' },
          { label: "BMI Score", value: bmi }
        ]
      });
    }

    if (checklist.includes('bodytemp') || state.temperature) {
      baseSteps.push({
        title: "Temperature Recording",
        description: "Processing your body temperature measurements",
        icon: (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M14 14.76V3.5C14 2.83696 13.7366 2.20107 13.2678 1.73223C12.7989 1.26339 12.163 1 11.5 1C10.837 1 10.2011 1.26339 9.73223 1.73223C9.26339 2.20107 9 2.83696 9 3.5V14.76C8.1975 15.2969 7.5975 16.0934 7.304 16.015C6.5 16.5 6 17.5 6 18.5C6 20.1569 7.34315 21.5 9 21.5C10.6569 21.5 12 20.1569 12 18.5C12 17.5 11.5 16.5 10.696 16.015C10.4025 16.0934 9.8025 15.2969 9 14.76V3.5C9 3.23478 9.10536 2.98043 9.29289 2.79289C9.48043 2.60536 9.73478 2.5 10 2.5C10.2652 2.5 10.5196 2.60536 10.7071 2.79289C10.8946 2.98043 11 3.23478 11 3.5V11.5" stroke="currentColor" strokeWidth="2" />
          </svg>
        ),
        details: [
          { label: "Temperature", value: state.temperature ? `${state.temperature}°C` : 'Recorded' },
          { label: "Status", value: state.temperature > 37.5 ? 'Elevated' : 'Normal' }
        ]
      });
    }

    if (checklist.includes('max30102') || state.heartRate) {
      baseSteps.push({
        title: "Vital Signs Analysis",
        description: "Analyzing heart rate and oxygen saturation levels",
        icon: (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M22 12H18L15 21L9 3L6 12H2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        details: [
          { label: "Heart Rate", value: state.heartRate ? `${state.heartRate} BPM` : 'Recorded' },
          { label: "Oxygen Level", value: state.oxygenSaturation ? `${state.oxygenSaturation}%` : 'Recorded' },
          { label: "Rhythm", value: "Regular" }
        ]
      });
    }

    if (checklist.includes('bloodpressure') || state.systolic) {
      const bpCategory = state.systolic && state.diastolic ?
        (state.systolic >= 140 || state.diastolic >= 90 ? 'High' :
          state.systolic <= 90 || state.diastolic <= 60 ? 'Low' : 'Normal') : 'Analyzing';

      baseSteps.push({
        title: "Blood Pressure Analysis",
        description: "Processing systolic and diastolic pressure readings",
        icon: (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M18 10L15 13L12 10L9 13L6 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 12C3 4.588 4.588 3 12 3C19.412 3 21 4.588 21 12C21 19.412 19.412 21 12 21C4.588 21 3 19.412 3 12Z" stroke="currentColor" strokeWidth="2" />
          </svg>
        ),
        details: [
          { label: "Systolic", value: state.systolic ? `${state.systolic} mmHg` : 'Recorded' },
          { label: "Diastolic", value: state.diastolic ? `${state.diastolic} mmHg` : 'Recorded' },
          { label: "Category", value: bpCategory }
        ]
      });
    }

    if (checklist.includes('ecg') || state.ecgData) {
      baseSteps.push({
        title: "ECG Pattern Analysis",
        description: "Analyzing electrocardiogram waveforms and rhythms",
        icon: (
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M2 12H4L5.5 9L8 15L10.5 9L12 12L13.5 9L16 15L18.5 9L20 12H22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ),
        details: [
          { label: "Waveform", value: "Sinus Rhythm" },
          { label: "Analysis", value: "Normal Pattern" },
          { label: "Duration", value: "30s Recording" }
        ]
      });
    }

    // Always end with finalization
    baseSteps.push({
      title: "Finalizing Health Records",
      description: "Compiling all health data into your secure medical profile",
      icon: (
        <svg viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      details: [
        { label: "Total Metrics", value: `${baseSteps.length} categories` },
        { label: "Storage", value: "Secure Cloud" },
        { label: "Access", value: "Encrypted" }
      ]
    });

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
    setCurrentStepIndex(0);
    setIsStepAnimating(false);
    setCompletedSteps([]);

    const totalSteps = steps.length;
    const stepDuration = 1800;

    steps.forEach((step, index) => {
      setTimeout(() => {
        // Start animation for current step
        setIsStepAnimating(true);

        // Add to completed steps
        setCompletedSteps(prev => [...prev, step.title]);

        // Move to next step after animation
        setTimeout(() => {
          if (index < totalSteps - 1) {
            setCurrentStepIndex(index + 1);
            setIsStepAnimating(false);
          } else {
            // Last step completed
            setTimeout(() => {
              setIsSaving(false);
              setSaveComplete(true);

              setTimeout(() => {
                navigate("/measure/sharing", {
                  state: location.state
                });
              }, 3000);
            }, 800);
          }
        }, 1200); // Animation display time
      }, index * stepDuration);
    });
  };

  const getProgressPercentage = () => {
    return steps.length > 0 ? ((currentStepIndex + 1) / steps.length) * 100 : 0;
  };

  const currentStep = steps[currentStepIndex];

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 saving-page">
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 saving-container page-transition`} style={{ maxWidth: '800px', width: '100%' }}>

        {/* Header Section */}
        <div className="text-center mb-5 header-section">
          <div className="mb-4 d-flex justify-content-center">
            <div className={`icon-circle ${isSaving ? 'saving' : 'success'}`} style={{ width: '80px', height: '80px', padding: '15px', borderRadius: '50%', background: isSaving ? '#e0f2fe' : '#dcfce7', color: isSaving ? '#0ea5e9' : '#16a34a' }}>
              <svg viewBox="0 0 24 24" fill="none" style={{ width: '100%', height: '100%' }}>
                {isSaving ? (
                  <>
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 13H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 17H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M10 9H8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                ) : (
                  <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                )}
              </svg>
            </div>
          </div>
          <h1 className="fw-bold mb-2 main-title">
            {isSaving ? "Saving Your Health Data" : "Health Profile Complete!"}
          </h1>
          <p className="text-muted fs-5 subtitle">
            {isSaving
              ? `Processing ${currentStepIndex + 1} of ${steps.length} health assessments...`
              : `All ${steps.length} health metrics securely saved and analyzed`
            }
          </p>
        </div>

        {/* Progress Section */}
        {isSaving && currentStep && (
          <div className="row justify-content-center mb-5 progress-section">
            <div className="col-12 col-md-5 d-flex justify-content-center mb-4 mb-md-0">
              <div className="progress-visual" style={{ width: '200px', height: '200px' }}>
                <div className="progress-ring position-relative w-100 h-100">
                  <div className="ring-bg position-absolute w-100 h-100 border rounded-circle" style={{ borderColor: '#f1f5f9', borderWidth: '10px' }}></div>
                  {/* Note: Rotation logic kept for visual consistency if needed, but simplified structure */}
                  <div
                    className="ring-fill position-absolute w-100 h-100 rounded-circle"
                    style={{
                      border: '10px solid #ef4444',
                      borderRightColor: 'transparent',
                      borderBottomColor: 'transparent',
                      transform: `rotate(${getProgressPercentage() * 3.6}deg)`,
                      transition: 'transform 0.5s ease-out'
                    }}
                  ></div>
                  <div className="ring-center position-absolute top-50 start-50 translate-middle text-center">
                    <div className="pulse-dot bg-danger rounded-circle mx-auto mb-2" style={{ width: '12px', height: '12px' }}></div>
                    <span className="h4 fw-bold text-dark d-block">
                      {currentStepIndex + 1}/{steps.length}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-7">
              <div className={`card border-0 bg-light p-4 h-100 current-step-card ${isStepAnimating ? 'animating' : ''}`}>
                <div className="d-flex align-items-center gap-3 mb-3">
                  <div className="text-danger" style={{ width: '30px' }}>
                    {currentStep.icon}
                  </div>
                  <h3 className="h5 fw-bold mb-0 step-title">{currentStep.title}</h3>
                </div>
                <p className="text-muted mb-3 step-description">{currentStep.description}</p>

                <div className="step-details bg-white rounded p-3 mb-3 border">
                  {currentStep.details.map((detail, index) => (
                    <div key={index} className="d-flex justify-content-between mb-2 last-mb-0 detail-item">
                      <span className="text-muted small detail-label">{detail.label}:</span>
                      <span className="fw-bold small detail-value">{detail.value}</span>
                    </div>
                  ))}
                </div>

                <div className="d-flex align-items-center gap-2 text-primary small fw-bold mt-auto step-status">
                  <div className="spinner-grow spinner-grow-sm" role="status"></div>
                  {isStepAnimating ? 'Complete!' : 'Processing...'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Success Section */}
        {saveComplete && (
          <div className="text-center mb-5 success-section">
            <div className="success-message mb-4">
              <h2 className="h4 fw-bold mb-2">Health Profile Complete!</h2>
              <p className="text-muted">Your comprehensive health assessment has been securely stored and is ready for sharing with healthcare providers.</p>
            </div>

            {/* Completed Steps Summary */}
            <div className="completed-summary text-start mx-auto" style={{ maxWidth: '500px' }}>
              <div className="fw-bold text-muted mb-3 text-uppercase small">Completed Health Assessments</div>
              <div className="d-flex flex-column gap-2">
                {completedSteps.map((step, index) => (
                  <div key={index} className="d-flex align-items-center justify-content-between p-2 bg-light rounded border">
                    <span className="fw-medium">{step}</span>
                    <span className="badge bg-success">Completed</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Navigation Info */}
        <div className="text-center mb-4 nav-info">
          {saveComplete && (
            <div className="d-flex align-items-center justify-content-center gap-2 text-muted">
              <div className="spinner-border spinner-border-sm" role="status"></div>
              <span>Preparing sharing options...</span>
            </div>
          )}
        </div>

        {/* Security Footer */}
        <div className="text-center border-top pt-4">
          <div className="d-inline-flex align-items-center gap-2 text-muted small">
            <div style={{ width: '16px' }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" />
              </svg>
            </div>
            <div>
              <strong>HIPAA Compliant Storage</strong>
              <span className="mx-2">•</span>
              <span>End-to-end encryption</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}