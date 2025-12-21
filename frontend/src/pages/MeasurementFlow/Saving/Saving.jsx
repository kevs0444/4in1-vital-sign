import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./Saving.css";

export default function Saving() {
  const navigate = useNavigate();
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Fast progress animation - 2s total duration
    const duration = 2000;
    const interval = 20;
    const steps = duration / interval;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(timer);
          setIsSaved(true);

          // Brief pause on success before navigating
          setTimeout(() => {
            navigate("/measure/sharing", { state: location.state });
          }, 800);

          return 100;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [navigate, location.state]);

  return (
    <div className="saving-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="saving-content"
      >
        {/* Header */}
        <div className="saving-header">
          <h1 className="saving-title">
            {isSaved ? "Health Data Saved" : "Saving Your Data"}
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