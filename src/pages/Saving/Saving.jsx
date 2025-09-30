import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Saving.css";
import savingIcon from "../../assets/icons/saving-icon.png"; // You'll add this icon

export default function Saving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveComplete, setSaveComplete] = useState(false);
  const [userData, setUserData] = useState({});

  useEffect(() => {
    // Get all collected data from location state
    if (location.state) {
      setUserData(location.state);
    }
    
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.state]);

  const simulateSaveProcess = () => {
    if (isSaving) return;
    
    setIsSaving(true);
    
    // Simulate saving process
    setTimeout(() => {
      setIsSaving(false);
      setSaveComplete(true);
      
      // Auto navigate after 2 seconds
      setTimeout(() => {
        navigate("/share", { state: userData });
      }, 2000);
    }, 3000);
  };

  const handleBack = () => {
    navigate("/bloodpressure");
  };

  const calculateBMI = () => {
    if (!userData.weight || !userData.height) return null;
    const heightInMeters = userData.height / 100;
    return (userData.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return { category: "Underweight", color: "#ffc107" };
    if (bmi < 25) return { category: "Normal", color: "#28a745" };
    if (bmi < 30) return { category: "Overweight", color: "#fd7e14" };
    return { category: "Obese", color: "#dc3545" };
  };

  const bmi = calculateBMI();
  const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : null;

  return (
    <div className="saving-container">
      <div className={`saving-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="saving-header">
          <div className="saving-icon">
            <img src={savingIcon} alt="Saving Data" />
          </div>
          <h1 className="saving-title">
            {isSaving ? "Saving Your Data" : saveComplete ? "Data Saved!" : "Review & Save"}
          </h1>
          <p className="saving-subtitle">
            {isSaving 
              ? "Securely storing your health information..." 
              : saveComplete 
                ? "All your vital signs have been successfully saved"
                : "Please review your measurements before saving"
            }
          </p>
        </div>

        {/* Data Summary */}
        {!isSaving && !saveComplete && (
          <div className="data-summary">
            <h2 className="summary-title">Your Health Summary</h2>
            
            {/* Personal Information */}
            <div className="summary-section">
              <h3 className="section-title">Personal Information</h3>
              <div className="info-grid">
                <div className="info-item">
                  <span className="info-label">Name:</span>
                  <span className="info-value">
                    {userData.firstName} {userData.lastName}
                  </span>
                </div>
                <div className="info-item">
                  <span className="info-label">Age:</span>
                  <span className="info-value">{userData.age} years</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Sex:</span>
                  <span className="info-value">
                    {userData.sex === 'male' ? 'Male' : 'Female'}
                  </span>
                </div>
              </div>
            </div>

            {/* Vital Signs */}
            <div className="summary-section">
              <h3 className="section-title">Vital Signs</h3>
              <div className="vitals-grid">
                {/* Weight & Height */}
                <div className="vital-card">
                  <div className="vital-icon">⚖️</div>
                  <div className="vital-info">
                    <span className="vital-label">Weight</span>
                    <span className="vital-value">{userData.weight} kg</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">📏</div>
                  <div className="vital-info">
                    <span className="vital-label">Height</span>
                    <span className="vital-value">{userData.height} cm</span>
                  </div>
                </div>

                {/* BMI */}
                {bmi && (
                  <div className="vital-card bmi-card">
                    <div className="vital-icon">📊</div>
                    <div className="vital-info">
                      <span className="vital-label">BMI</span>
                      <span 
                        className="vital-value"
                        style={{ color: bmiCategory?.color }}
                      >
                        {bmi}
                      </span>
                      <span 
                        className="bmi-category"
                        style={{ color: bmiCategory?.color }}
                      >
                        {bmiCategory?.category}
                      </span>
                    </div>
                  </div>
                )}

                {/* Body Temperature */}
                <div className="vital-card">
                  <div className="vital-icon">🌡️</div>
                  <div className="vital-info">
                    <span className="vital-label">Body Temp</span>
                    <span className="vital-value">{userData.bodyTemp}°C</span>
                  </div>
                </div>

                {/* MAX30102 Measurements */}
                <div className="vital-card">
                  <div className="vital-icon">❤️</div>
                  <div className="vital-info">
                    <span className="vital-label">Heart Rate</span>
                    <span className="vital-value">{userData.heartRate} BPM</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">🩸</div>
                  <div className="vital-info">
                    <span className="vital-label">Blood Oxygen</span>
                    <span className="vital-value">{userData.spo2}%</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">🌬️</div>
                  <div className="vital-info">
                    <span className="vital-label">Respiratory Rate</span>
                    <span className="vital-value">{userData.respiratoryRate}/min</span>
                  </div>
                </div>

                {/* Blood Pressure */}
                {userData.bloodPressure && (
                  <div className="vital-card">
                    <div className="vital-icon">🩺</div>
                    <div className="vital-info">
                      <span className="vital-label">Blood Pressure</span>
                      <span className="vital-value">{userData.bloodPressure}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Saving Animation */}
        {isSaving && (
          <div className="saving-animation">
            <div className="progress-ring">
              <div className="ring-background"></div>
              <div className="ring-progress"></div>
              <div className="ring-center">
                <div className="data-pulse"></div>
              </div>
            </div>
            <div className="saving-steps">
              <div className="saving-step active">
                <span className="step-check">✓</span>
                <span className="step-text">Encrypting data</span>
              </div>
              <div className="saving-step active">
                <span className="step-check">✓</span>
                <span className="step-text">Uploading to secure cloud</span>
              </div>
              <div className="saving-step">
                <span className="step-check"></span>
                <span className="step-text">Finalizing records</span>
              </div>
            </div>
          </div>
        )}

        {/* Save Complete */}
        {saveComplete && (
          <div className="save-complete">
            <div className="success-animation">
              <div className="checkmark">✓</div>
              <div className="success-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
                <div className="ring ring-3"></div>
              </div>
            </div>
            <div className="complete-message">
              <h3>All Data Secured!</h3>
              <p>Your health information has been safely stored and encrypted.</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="saving-actions">
          {!isSaving && !saveComplete && (
            <>
              <button 
                className="back-button"
                onClick={handleBack}
              >
                Back
              </button>
              
              <button 
                className="save-button"
                onClick={simulateSaveProcess}
              >
                Save All Data
              </button>
            </>
          )}
          
          {saveComplete && (
            <div className="auto-navigate">
              <span className="navigate-text">
                Redirecting to share options...
              </span>
            </div>
          )}
        </div>

        {/* Security Notice */}
        <div className="security-notice">
          <div className="security-icon">🔒</div>
          <div className="security-text">
            <strong>Your data is secure</strong>
            <span>All information is encrypted and protected</span>
          </div>
        </div>
      </div>
    </div>
  );
}