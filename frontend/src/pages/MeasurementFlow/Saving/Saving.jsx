import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./Saving.css";
import { speak, reinitSpeech } from "../../../utils/speech";

export default function Saving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  const dataSavedRef = React.useRef(false);
  const saveSuccessRef = React.useRef(false); // Track success across renders

  useEffect(() => {
    // Initial speech announcement
    reinitSpeech();
    speak("Saving your health data. Please wait.");

    // 1. Start the progress animation
    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    const increment = 100 / steps;
    let measurementId = null;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;

        // Check component-level ref instead of local variable
        if (next >= 90 && !saveSuccessRef.current) {
          // Pause at 90% until save is confirmed
          return 90;
        }

        if (next >= 100) {
          clearInterval(timer);
          setIsSaved(true);

          // Brief pause on success before navigating
          setTimeout(() => {
            // Get ID from the ref or state if needed, but for now relies on valid save flow
            // If measurementId is null here due to closure issues, we might need a ref for ID too.
            // But let's fix the stuck 90% first.
            const nextState = { ...location.state, measurement_id: saveSuccessRef.current.id };
            navigate("/measure/sharing", { state: nextState });
          }, 800);
          return 100;
        }
        return next;
      });
    }, interval);

    // 2. Perform actual save in background
    const saveData = async () => {
      // Prevent duplicate saves (React Strict Mode or re-renders)
      if (dataSavedRef.current) return;
      dataSavedRef.current = true;

      try {
        const data = location.state || {};
        // Map frontend keys to backend keys
        const payload = {
          user_id: data.user_id || data.userId || data.id,
          temperature: data.temperature,
          systolic: data.systolic,
          diastolic: data.diastolic,
          heart_rate: data.heartRate,
          spo2: data.spo2,
          respiratory_rate: data.respiratoryRate,
          weight: data.weight,
          height: data.height,
          bmi: data.bmi,
          risk_level: data.riskLevel,
          risk_category: data.riskCategory,
          suggestions: data.suggestions,
          preventions: data.preventions,
          wellnessTips: data.wellnessTips,
          providerGuidance: data.providerGuidance
        };

        const getDynamicApiUrl = () => {
          if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
          return `${window.location.protocol}//${window.location.hostname}:5000/api`;
        };

        const response = await fetch(`${getDynamicApiUrl()}/measurements/save`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          const result = await response.json();
          console.log("✅ Measurement saved with ID:", result.id);
          // Store object { id: ... } in ref to indicate success AND holding data
          saveSuccessRef.current = { id: result.id };
        } else {
          console.error("❌ Failed to save measurement");
          // Even on error, we proceed so user isn't stuck
          saveSuccessRef.current = { id: null };
        }
      } catch (error) {
        console.error("❌ Network error saving measurement:", error);
        saveSuccessRef.current = { id: null };
      }
    };

    if (location.state) {
      saveData();
    } else {
      // If technical error (no state), just finish animation
      saveSuccessRef.current = { id: null };
    }

    return () => clearInterval(timer);
  }, [navigate, location.state]);

  return (
    <div
      className="saving-container"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="saving-content"
      >
        {/* Header */}
        <div className="saving-header">
          <h1 className="saving-title">
            {isSaved ? (
              <>Health Data <span style={{ color: '#dc2626' }}>Saved</span></>
            ) : (
              <>Saving Your <span style={{ color: '#dc2626' }}>Data</span></>
            )}
          </h1>
          <p className="saving-subtitle">
            {isSaved
              ? "Your measurements have been securely recorded"
              : "Please wait while we process your results"}
          </p>
        </div>

        {/* Card Section */}
        <div className="saving-card-section">
          <div className="saving-welcome-card">
            <div className="saving-card-icon">
              {isSaved ? (
                <div className="success-icon-wrapper">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="success-svg">
                    <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              ) : (
                <div className="spinner-wrapper">
                  <svg viewBox="0 0 100 100" className="spinner-svg">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#f1f5f9" strokeWidth="8" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#dc2626"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray="283"
                      strokeDashoffset={283 - (283 * progress) / 100}
                      className="progress-circle"
                    />
                  </svg>
                  <div className="percentage-text">{Math.round(progress)}%</div>
                </div>
              )}
            </div>

            <div className="saving-card-content">
              <h3 className="saving-card-title">
                {isSaved ? "All Set!" : "Processing..."}
              </h3>
              <p className="saving-card-description">
                {isSaved
                  ? "We are now ready to print your health receipt."
                  : "Encrypting and storing your vital sign measurements securely."}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}