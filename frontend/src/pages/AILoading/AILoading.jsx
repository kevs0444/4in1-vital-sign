import React from "react";
import "./AILoading.css";

export default function AILoading() {
  return (
    <div className="ai-analysis-loading">
      <div className="ai-loader">
        <div className="ai-brain">🧠</div>
        <div className="loading-dots">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
      <div className="analysis-text">
        <h3>AI Analysis in Progress</h3>
        <p>Our AI engine is analyzing your vital signs and health data...</p>
        <div className="analysis-steps">
          <div className="step">✓ Data Validation</div>
          <div className="step">✓ Pattern Recognition</div>
          <div className="step active">Risk Assessment</div>
          <div className="step">Generating Recommendations</div>
        </div>
      </div>
    </div>
  );
}