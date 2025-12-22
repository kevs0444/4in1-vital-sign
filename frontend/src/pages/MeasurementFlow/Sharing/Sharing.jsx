import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Sharing.css";

export default function Sharing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState(null);

  // States
  const [isSending, setIsSending] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [printSent, setPrintSent] = useState(false);
  const [autoRedirectTimer, setAutoRedirectTimer] = useState(30);

  // Modal Configuration
  const [modalConfig, setModalConfig] = useState({
    show: false,
    type: 'success', // or 'error'
    title: '',
    message: ''
  });

  useEffect(() => {
    if (location.state) {
      setUserData(location.state);
    } else {
      // Fallback if no state
      navigate("/measure/result");
    }
  }, [location.state, navigate]);

  const handleReturnHome = React.useCallback(() => {
    // Clear user data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userData');

    // Navigate to Standby (root)
    navigate("/", { replace: true, state: { reset: true } });
  }, [navigate]);

  // Auto-redirect countdown
  useEffect(() => {
    if (autoRedirectTimer > 0) {
      const timer = setTimeout(() => setAutoRedirectTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleReturnHome();
    }
  }, [autoRedirectTimer, handleReturnHome]);

  const closeModal = () => {
    setModalConfig({ ...modalConfig, show: false });
  };

  const handleSendEmail = async () => {
    // Rely solely on user_id or ID if available
    const userId = userData?.user_id || userData?.userId || userData?.id;

    if (!userId) {
      setModalConfig({
        show: true,
        type: 'error',
        title: 'Feature Unavailable',
        message: 'This feature is only available for registered users with an ID.'
      });
      return;
    }

    setIsSending(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/share/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "", // No manual email, rely on ID
          userData: userData
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        setAutoRedirectTimer(15);
        setModalConfig({
          show: true,
          type: 'success',
          title: 'Email Sent!',
          message: 'Your health report has been successfully sent to your registered email address.'
        });
      } else {
        const errorData = await response.json();
        setModalConfig({
          show: true,
          type: 'error',
          title: 'Sending Failed',
          message: errorData.message || 'Unable to send email. Please try again.'
        });
      }
    } catch (error) {
      console.error("Email network error:", error);
      setModalConfig({
        show: true,
        type: 'error',
        title: 'Connection Error',
        message: 'Network error. Could not connect to the server.'
      });
    } finally {
      setIsSending(false);
    }
  };

  // NEW: Backend "Silent" Print
  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/print/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok) {
        setPrintSent(true);
        // Do not block print button forever, let them print again if needed? 
        // User asked to "make the box of print receipt being checked". Usually implies a done state.
        // We will keep it checked.
        setModalConfig({
          show: true,
          type: 'success',
          title: 'Printing...',
          message: 'Receipt sent to printer successfully.'
        });
      } else {
        throw new Error(result.error || 'Printing failed');
      }

    } catch (error) {
      console.error("Print error:", error);
      setModalConfig({
        show: true,
        type: 'error',
        title: 'Print Error',
        message: 'Could not connect to printer. Please check backend.'
      });
    } finally {
      setIsPrinting(false);
    }
  };

  // Helper to format values
  const formatValue = (val, unit = "") => val ? `${val} ${unit}` : "--";

  if (!userData) return null;

  return (
    <div
      className="sharing-container"
    >
      {/* ================= PRINT RECEIPT SECTION (Visible only in Print) ================= */}
      <div className="print-receipt">
        <div className="receipt-header">
          <div className="receipt-title">Vital Sign Kiosk</div>
          <div className="receipt-subtitle">Health Measurement Report</div>
          <div className="receipt-date">{new Date().toLocaleString()}</div>
        </div>

        <div className="receipt-user-info">
          <div className="receipt-row">
            <span>Name:</span>
            <strong>{userData.firstName} {userData.lastName}</strong>
          </div>
          <div className="receipt-row">
            <span>ID:</span>
            <strong>{userData.schoolNumber || userData.user_id || "N/A"}</strong>
          </div>
          <div className="receipt-row">
            <span>Age/Sex:</span>
            <strong>{userData.age} / {userData.sex}</strong>
          </div>
        </div>

        <div className="receipt-vitals">
          <div className="receipt-section-title">Measurements</div>

          {/* BMI */}
          {(userData.weight || userData.height) && (
            <>
              <div className="vital-row">
                <span className="vital-label">Weight:</span>
                <span className="vital-value">{formatValue(userData.weight, "kg")}</span>
              </div>
              <div className="vital-row">
                <span className="vital-label">Height:</span>
                <span className="vital-value">{formatValue(userData.height, "cm")}</span>
              </div>
              <div className="vital-row">
                <span className="vital-label">BMI:</span>
                <span className="vital-value">{formatValue(userData.bmi)}</span>
              </div>
            </>
          )}

          {/* Blood Pressure */}
          {userData.systolic && (
            <div className="vital-row">
              <span className="vital-label">Blood Pressure:</span>
              <span className="vital-value">{userData.systolic}/{userData.diastolic} mmHg</span>
            </div>
          )}

          {/* Heart Rate & SpO2 */}
          {(userData.heartRate || userData.spo2) && (
            <>
              <div className="vital-row">
                <span className="vital-label">Heart Rate:</span>
                <span className="vital-value">{formatValue(userData.heartRate, "bpm")}</span>
              </div>
              <div className="vital-row">
                <span className="vital-label">SpO2:</span>
                <span className="vital-value">{formatValue(userData.spo2, "%")}</span>
              </div>
              {userData.respiratoryRate && (
                <div className="vital-row">
                  <span className="vital-label">Respiratory Rate:</span>
                  <span className="vital-value">{formatValue(userData.respiratoryRate, "/min")}</span>
                </div>
              )}
            </>
          )}

          {/* Temperature */}
          {userData.temperature && (
            <div className="vital-row">
              <span className="vital-label">Body Temp:</span>
              <span className="vital-value">{formatValue(userData.temperature, "°C")}</span>
            </div>
          )}
        </div>

        {/* AI Assessment Section for Visual Receipt */}
        {(userData.riskLevel !== undefined || (userData.suggestions && userData.suggestions.length > 0)) && (
          <div className="receipt-vitals" style={{ marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
            <div className="receipt-section-title">AI Assessment</div>

            {userData.riskLevel !== undefined && (
              <div className="receipt-row">
                <span>Risk Level:</span>
                <strong>{userData.riskCategory} ({userData.riskLevel}%)</strong>
              </div>
            )}

            {userData.suggestions && userData.suggestions[0] && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>SUGGESTED ACTIONS:</div>
                {userData.suggestions.map((s, i) => (
                  <div key={i} style={{ fontSize: '10px', paddingLeft: '5px' }}>- {s}</div>
                ))}
              </div>
            )}

            {userData.preventions && userData.preventions[0] && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>PREVENTIVE STRATEGY:</div>
                {userData.preventions.map((s, i) => (
                  <div key={i} style={{ fontSize: '10px', paddingLeft: '5px' }}>- {s}</div>
                ))}
              </div>
            )}

            {userData.wellnessTips && userData.wellnessTips[0] && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>WELLNESS TIPS:</div>
                {userData.wellnessTips.map((s, i) => (
                  <div key={i} style={{ fontSize: '10px', paddingLeft: '5px' }}>- {s}</div>
                ))}
              </div>
            )}

            {userData.providerGuidance && userData.providerGuidance[0] && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>GUIDANCE:</div>
                {userData.providerGuidance.map((s, i) => (
                  <div key={i} style={{ fontSize: '10px', paddingLeft: '5px' }}>{s}</div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="receipt-footer">
          <div className="receipt-disclaimer">
            * This is not a medical diagnosis. Consult a doctor for professional advice.
          </div>
          <div style={{ marginTop: '10px' }}>Powered by 4-in-1 Vital Sign Kiosk</div>
        </div>
      </div>
      {/* ================= END PRINT RECEIPT ================= */}

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="sharing-content"
      >
        {/* Header */}
        <div className="sharing-header">
          <h1 className="sharing-title">Measurement Complete</h1>
          <p className="sharing-subtitle">
            Your results have been recorded. <br />
            Returning to home in <span className="timer-badge">{autoRedirectTimer}s</span>
          </p>
        </div>

        {/* Card Section */}
        <div className="sharing-card-section">
          <div className="sharing-welcome-card">

            {/* Dynamic Modern Icon - Matched to Saving.jsx */}
            {/* Dynamic Modern Icon - Matched to Saving.jsx */}
            <div className="sharing-card-icon">
              <div className="success-icon-wrapper">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="success-svg">
                  <path d="M20 6L9 17L4 12" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>

            <div className="sharing-card-content">
              <h3 className="sharing-card-title">
                {emailSent ? "Report Sent Successfully" : printSent ? "Receipt Printed" : "All Measurements Done"}
              </h3>
              <p className="sharing-card-description">
                {emailSent || printSent
                  ? "Thank you for using our service. Your health data is secured."
                  : "Choose how you would like to receive your results below."}
              </p>
            </div>
          </div>
        </div>

        {/* Options Grid */}
        <div className="sharing-options-grid">
          {/* Email Option */}
          <button
            className={`action-card ${emailSent ? 'success' : ''}`}
            onClick={handleSendEmail}
            disabled={emailSent || isSending}
          >
            <div className="action-icon">
              {emailSent ? '✓' : '📧'}
            </div>
            <div className="action-details">
              <span className="action-title">{emailSent ? 'Email Sent' : 'Email Results'}</span>
              <span className="action-desc">Send to registered email</span>
            </div>
            {isSending && !isPrinting && <div className="card-spinner"></div>}
          </button>

          {/* Print Option */}
          <button
            className={`action-card ${printSent ? 'success' : isPrinting ? 'processing' : ''}`}
            onClick={handlePrint}
            disabled={printSent || isPrinting}
          >
            <div className="action-icon">
              {printSent ? '✓' : isPrinting ? '⏳' : '🖨️'}
            </div>
            <div className="action-details">
              <span className="action-title">{printSent ? 'Printed' : isPrinting ? 'Printing...' : 'Print Receipt'}</span>
              <span className="action-desc">{printSent ? 'Receipt sent to printer' : 'Get a physical copy'}</span>
            </div>
          </button>
        </div>

        {/* Finish Button */}
        <div className="sharing-footer-action">
          <button
            className="finish-button"
            onClick={handleReturnHome}
          >
            Finish Session
          </button>
        </div>
      </motion.div>

      {/* Modern Status Pop-out Modal */}
      <AnimatePresence>
        {modalConfig.show && (
          <div className="status-modal-overlay" onClick={closeModal}>
            <motion.div
              className={`status-modal-content ${modalConfig.type}`}
              initial={{ opacity: 0, scale: 0.8, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 50 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="status-modal-icon">
                <span>{modalConfig.type === 'success' ? '📨' : '⚠️'}</span>
              </div>
              <h2 className="status-modal-title">{modalConfig.title}</h2>
              <p className="status-modal-message">{modalConfig.message}</p>
              <button
                className="status-modal-button"
                onClick={closeModal}
              >
                {modalConfig.type === 'success' ? 'Great!' : 'Close'}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}