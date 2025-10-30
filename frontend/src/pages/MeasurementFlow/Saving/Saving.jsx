import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Saving.css";
import savingIcon from "../../../assets/icons/saving-icon.png";

export default function Saving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(true);
  const [saveComplete, setSaveComplete] = useState(false);
  const [userData, setUserData] = useState({});
  const [riskData, setRiskData] = useState({});

  useEffect(() => {
    if (location.state) {
      console.log("📍 Saving page received data:", location.state);
      setUserData(location.state.userData || {});
      setRiskData({
        riskLevel: location.state.riskLevel,
        riskCategory: location.state.riskCategory,
        suggestions: location.state.suggestions || [],
        preventions: location.state.preventions || []
      });
    }
    
    const timer = setTimeout(() => {
      setIsVisible(true);
      simulateSaveProcess();
    }, 100);

    return () => clearTimeout(timer);
  }, [location.state]);

  const simulateSaveProcess = () => {
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveComplete(true);
      
      setTimeout(() => {
        // ✅ CORRECTED: Fixed navigation path to match routes.js
        navigate("/measure/sharing", { 
          state: {
            userData: userData,
            riskData: riskData
          }
        });
      }, 2000);
    }, 3000);
  };

  return (
    <div className="saving-container">
      <div className={`saving-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="saving-header">
          <div className="saving-icon">
            <img src={savingIcon} alt="Saving Data" />
          </div>
          <h1 className="saving-title">
            {isSaving ? "Saving Your Data" : saveComplete ? "Data Saved!" : "Saving Data"}
          </h1>
          <p className="saving-subtitle">
            {isSaving 
              ? "Securely storing your health information..." 
              : saveComplete 
                ? "All your health data has been successfully saved"
                : "Processing your health data..."
            }
          </p>
        </div>

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
                <span className="step-text">Encrypting health data</span>
              </div>
              <div className="saving-step active">
                <span className="step-check">✓</span>
                <span className="step-text">Storing risk assessment</span>
              </div>
              <div className="saving-step active">
                <span className="step-check">✓</span>
                <span className="step-text">Saving AI recommendations</span>
              </div>
              <div className="saving-step">
                <span className="step-check"></span>
                <span className="step-text">Finalizing health records</span>
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
              <h3>Complete Health Profile Saved!</h3>
              <p>Your health assessment, risk analysis, and recommendations have been securely stored.</p>
            </div>
          </div>
        )}

        {/* Auto Navigation */}
        <div className="saving-actions">
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
            <strong>Your health data is secure</strong>
            <span>All information is encrypted and protected by healthcare privacy standards</span>
          </div>
        </div>

        {/* Debug info */}
        <div style={{ 
          marginTop: '20px', 
          fontSize: '0.7rem', 
          color: '#666',
          textAlign: 'center',
          padding: '5px',
          background: '#f5f5f5',
          borderRadius: '5px',
          fontFamily: 'monospace'
        }}>
          Status: {saveComplete ? '✅ COMPLETE' : '⏳ SAVING'} | 
          Next: /measure/sharing
        </div>
      </div>
    </div>
  );
}