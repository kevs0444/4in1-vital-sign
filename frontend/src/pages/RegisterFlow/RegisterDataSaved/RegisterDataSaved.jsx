import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterDataSaved.css";

export default function RegisterDataSaved() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  
  // Get all collected data from previous steps
  const {
    userType = "rtu-students",
    personalInfo = {},
    idNumber = "",
    password = "",
    email = "",
    mobile = "",
    rfidCode = "",
    idRegistered = true,
    timestamp = new Date().toISOString()
  } = location.state || {};

  const { firstName = "", lastName = "", age = "", sex = "" } = personalInfo;

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

  // Check password strength
  const checkPasswordStrength = (password) => {
    if (!password) return "weak";
    if (password.length < 6) return "weak";
    if (password.length < 10) return "fair";
    return "strong";
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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

  const passwordStrength = checkPasswordStrength(password);
  const maskedPassword = "•".repeat(password.length);

  return (
    <div className="register-datasaved-container">
      <div className="register-datasaved-content">
        {/* Header - Success icon removed */}
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
                <span className="data-label">{userType === "rtu-employees" ? "Employee Number" : "Student Number"}</span>
                <span className="data-value highlight">{idNumber}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Email Address</span>
                <span className="data-value">{email}</span>
              </div>
              <div className="data-item">
                <span className="data-label">Mobile Number</span>
                <span className="data-value">{mobile}</span>
              </div>
              <div className="data-item">
                <span className="data-label">RFID Code</span>
                <span className="data-value">{rfidCode}</span>
              </div>
            </div>
          </div>

          {/* Security Information */}
          <div className="data-section security-section">
            <div className="section-header">
              <div className="section-icon">
                <span>🔒</span>
              </div>
              <h2 className="section-title">Security Information</h2>
            </div>
            <div className="data-grid">
              <div className="data-item">
                <span className="data-label">Password</span>
                <div className="password-display-container">
                  <span className={`data-value password-value ${!showPassword ? 'masked' : ''}`}>
                    {showPassword ? password : maskedPassword}
                  </span>
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={togglePasswordVisibility}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? "👁️" : "👁️‍🗨️"}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                {password && (
                  <div className="password-strength-indicator">
                    <div className="strength-bar">
                      <div className={`strength-fill ${passwordStrength}`}></div>
                    </div>
                    <div className={`strength-text ${passwordStrength}`}>
                      {passwordStrength.charAt(0).toUpperCase() + passwordStrength.slice(1)}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Security Notes */}
            <div className="security-note">
              <p>
                <span>✅</span>
                Your password meets the minimum security requirements
              </p>
            </div>
            <div className="security-warning">
              <p>
                <span>⚠️</span>
                Remember to keep your password secure and don't share it with anyone
              </p>
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