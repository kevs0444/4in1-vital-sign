import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterDataSaved.css";

export default function RegisterDataSaved() {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get all collected data from previous steps
  const {
    userType = "rtu-students",
    firstName = "",
    lastName = "",
    age = "",
    sex = "",
    email = "",
    mobile = "",
    idRegistered = true,
    timestamp = new Date().toISOString()
  } = location.state || {};

  // Format user type for display
  const formatUserType = (type) => {
    const types = {
      "rtu-employees": "RTU Employee",
      "rtu-students": "RTU Student"
    };
    return types[type] || type;
  };

  // Format sex for display
  const formatSex = (sex) => {
    return sex ? sex.charAt(0).toUpperCase() + sex.slice(1) : "";
  };

  // Format timestamp for display
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleProceedToLogin = () => {
    navigate("/login");
  };

  const handleProceedToDashboard = () => {
    // Navigate to appropriate dashboard based on user type
    if (userType === "rtu-employees") {
      navigate("/employee/dashboard");
    } else {
      navigate("/student/dashboard");
    }
  };

  return (
    <div className="register-datasaved-container">
      <div className="register-datasaved-content">
        {/* Success Icon */}
        <div className="success-icon-section">
          <div className="success-icon">
            <span>✓</span>
          </div>
        </div>

        {/* Header */}
        <div className="register-datasaved-header">
          <h1 className="register-datasaved-title">Registration Complete!</h1>
          <p className="register-datasaved-subtitle">
            Your information has been successfully saved and encrypted
          </p>
        </div>

        {/* Data Summary */}
        <div className="data-summary-container">
          {/* Role Information */}
          <div className="data-section role-section">
            <div className="section-header">
              <div className="section-icon">
                <span>👤</span>
              </div>
              <h2 className="section-title">Role Information</h2>
            </div>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">User Type</span>
                <span className="data-value highlight">{formatUserType(userType)}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Registration Status</span>
                <span className="data-value">
                  <span className="id-status-badge">
                    <span>✓</span>
                    Successfully Registered
                  </span>
                </span>
              </div>
              <div className="data-item">
                <span className="data-label">Registration Date</span>
                <span className="data-value">{formatTimestamp(timestamp)}</span>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="data-section personal-section">
            <div className="section-header">
              <div className="section-icon">
                <span>📝</span>
              </div>
              <h2 className="section-title">Personal Information</h2>
            </div>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Full Name</span>
                <span className="data-value highlight">{firstName} {lastName}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Age</span>
                <span className="data-value">{age} years old</span>
              </div>
              <div className="data-item">
                <span className="data-label">Biological Sex</span>
                <span className="data-value">{formatSex(sex)}</span>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="data-section account-section">
            <div className="section-header">
              <div className="section-icon">
                <span>🔐</span>
              </div>
              <h2 className="section-title">Account Information</h2>
            </div>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Email Address</span>
                <span className="data-value highlight">{email}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Mobile Number</span>
                <span className="data-value">{mobile}</span>
              </div>
              <div className="data-item">
                <span className="data-label">ID Registration</span>
                <span className="data-value">
                  {idRegistered ? (
                    <span className="id-status-badge">
                      <span>✓</span>
                      Successfully Linked
                    </span>
                  ) : (
                    "Not Registered"
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          <button 
            className="action-button primary"
            onClick={handleProceedToDashboard}
          >
            🚀 Proceed to Dashboard
          </button>
          <button 
            className="action-button secondary"
            onClick={handleProceedToLogin}
          >
            🔐 Proceed to Login
          </button>
        </div>

        {/* Security Footer */}
        <div className="security-footer">
          <p>
            <span>🔒</span>
            Your data is encrypted and secure. All information complies with RTU data protection policies.
          </p>
        </div>
      </div>
    </div>
  );
}