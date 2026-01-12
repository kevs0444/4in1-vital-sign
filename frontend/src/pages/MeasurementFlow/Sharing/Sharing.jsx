import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import "./Sharing.css";
import { speak, reinitSpeech, stopSpeaking } from "../../../utils/speech";
import { getShareStatsFiltered } from "../../../utils/api";
import {
  getBMICategory as getBMICategoryUtil,
  getTemperatureStatus as getTemperatureStatusUtil,
  getHeartRateStatus as getHeartRateStatusUtil,
  getSPO2Status as getSPO2StatusUtil,
  getRespiratoryStatus as getRespiratoryStatusUtil,
  getBloodPressureStatus as getBloodPressureStatusUtil
} from "../../../utils/healthStatus";

const getDynamicApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
  return '/api'; // Use relative path to leverage Proxy
};

const API_BASE = getDynamicApiUrl();

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

  const [showSkipModal, setShowSkipModal] = useState(false);
  const [isPaperEmpty, setIsPaperEmpty] = useState(false);

  useEffect(() => {
    const checkPaper = async () => {
      try {
        const response = await getShareStatsFiltered({});
        if (response && response.success && response.stats) {
          if ((response.stats.paper_remaining ?? 100) <= 0) {
            setIsPaperEmpty(true);
          }
        }
      } catch (e) {
        console.error("Failed to check paper status", e);
      }
    };
    checkPaper();
  }, []);

  useEffect(() => {
    if (location.state) {
      setUserData(location.state);
      reinitSpeech();
      speak("Your measurement is complete. You can now email your results or print a receipt.");
    } else {
      // Fallback if no state
      navigate("/measure/result");
    }

    // Cleanup speech on unmount
    return () => {
      stopSpeaking();
    };
  }, [location.state, navigate]);

  const handleReturnHome = React.useCallback((force = false) => {
    // Check if user skipped options (unless forced)
    if (!force && !emailSent && !printSent) {
      setShowSkipModal(true);
      return;
    }

    // Clear user data
    localStorage.removeItem('currentUser');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userData');

    // Navigate to Standby (root)
    navigate("/", { replace: true, state: { reset: true } });
  }, [navigate, emailSent, printSent]);

  // Auto-redirect countdown
  useEffect(() => {
    if (autoRedirectTimer > 0) {
      const timer = setTimeout(() => setAutoRedirectTimer(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      handleReturnHome(true);
    }
  }, [autoRedirectTimer, handleReturnHome]);

  // --- UPDATED RISK HELPERS (5 TIERS) ---
  const getRiskClass = (level) => {
    if (level < 20) return 'normal-risk';
    if (level < 40) return 'mild-risk';
    if (level < 60) return 'moderate-risk';
    if (level < 80) return 'high-risk';
    return 'critical-risk';
  };

  const getRiskGradient = (level) => {
    if (level < 20) return "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
    if (level < 40) return "linear-gradient(135deg, #a3e635 0%, #bef264 100%)";
    if (level < 60) return "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
    if (level < 80) return "linear-gradient(135deg, #f97316 0%, #fb923c 100%)";
    return "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
  };

  const getRiskGlow = (level) => {
    if (level < 20) return "0 0 40px rgba(16, 185, 129, 0.4)";
    if (level < 40) return "0 0 40px rgba(163, 230, 53, 0.4)";
    if (level < 60) return "0 0 40px rgba(245, 158, 11, 0.4)";
    if (level < 80) return "0 0 40px rgba(249, 115, 22, 0.4)";
    return "0 0 50px rgba(220, 38, 38, 0.6)";
  };

  // --- STRICT VITAL STATUS HELPERS (Centralized) ---
  // Using imported utilities locally imported via separate chunk
  // For now I assume they are imported as imported in Result.jsx

  const getBMICategory = (bmi) => {
    const s = getBMICategoryUtil(bmi);
    return { status: s.label, color: s.color };
  };

  const getTemperatureStatus = (temp) => {
    const s = getTemperatureStatusUtil(temp);
    return { status: s.label, color: s.color };
  };

  const getHeartRateStatus = (hr) => {
    const s = getHeartRateStatusUtil(hr);
    return { status: s.label, color: s.color };
  };

  const getSPO2Status = (spo2) => {
    const s = getSPO2StatusUtil(spo2);
    return { status: s.label, color: s.color };
  };

  const getRespiratoryStatus = (rr) => {
    const s = getRespiratoryStatusUtil(rr);
    return { status: s.label, color: s.color };
  };

  const getBloodPressureStatus = (sys, dia) => {
    const s = getBloodPressureStatusUtil(sys, dia);
    return { status: s.label, color: s.color };
  };

  const confirmSkip = () => {
    setShowSkipModal(false);
    handleReturnHome(true);
  };

  const closeModal = () => {
    setModalConfig({ ...modalConfig, show: false });
  };

  const updateShareStatus = async (type) => {
    const measurementId = userData?.measurement_id;
    if (!measurementId) return;

    try {
      await fetch(`${API_BASE}/measurements/${measurementId}/share-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: type, status: true })
      });
    } catch (e) {
      console.error(`Failed to update ${type} status:`, e);
    }
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
      const response = await fetch(`${API_BASE}/share/email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: "", // No manual email, rely on ID
          userData: userData
        }),
      });

      if (response.ok) {
        setEmailSent(true);
        updateShareStatus('email'); // Update backend status
        setAutoRedirectTimer(15);
        setModalConfig({
          show: true,
          type: 'success',
          title: 'Email Sent!',
          message: 'Your health report has been successfully sent to your registered email address.'
        });
        speak("Email sent");
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
      const response = await fetch(`${API_BASE}/print/receipt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok) {
        setPrintSent(true);
        updateShareStatus('print'); // Update backend status
        // Do not block print button forever, let them print again if needed? 
        // User asked to "make the box of print receipt being checked". Usually implies a done state.
        // We will keep it checked.
        setModalConfig({
          show: true,
          type: 'success',
          title: 'Printing...',
          message: 'Receipt sent to printer successfully.'
        });
        speak("Receipt has been printed");
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
          <div className="receipt-id" style={{ fontSize: '12px', marginTop: '4px' }}>
            ID: {userData.measurement_id || userData.id || "N/A"}
          </div>
        </div>

        <div className="receipt-user-info">
          <div className="receipt-row">
            <span>Name:</span>
            <strong>{userData.firstName} {userData.middleName ? userData.middleName + ' ' : ''}{userData.lastName} {userData.suffix || ''}</strong>
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

          {/* 1. BMI Group */}
          {(userData.weight || userData.height) && (
            <>
              {userData.weight && (
                <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="vital-label">Weight:</span>
                  <span className="vital-value">{formatValue(userData.weight, "kg")}</span>
                </div>
              )}
              {userData.height && (
                <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="vital-label">Height:</span>
                  <span className="vital-value">{formatValue(userData.height, "cm")}</span>
                </div>
              )}
              {userData.bmi && (
                <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                  <span className="vital-label">BMI:</span>
                  <span className="vital-value">
                    {formatValue(userData.bmi)} ({userData.bmiCategory || 'N/A'})
                  </span>
                </div>
              )}
            </>
          )}

          {/* 2. Body Temp */}
          {userData.temperature && (
            <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span className="vital-label">Body Temp:</span>
              <span className="vital-value">
                {formatValue(userData.temperature, "°C")} ({userData.temperatureStatus || 'N/A'})
              </span>
            </div>
          )}

          {/* 3. Heart Rate */}
          {userData.heartRate && (
            <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span className="vital-label">Heart Rate:</span>
              <span className="vital-value">
                {formatValue(userData.heartRate, "bpm")} ({userData.heartRateStatus || 'N/A'})
              </span>
            </div>
          )}

          {/* 4. SpO2 */}
          {userData.spo2 && (
            <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span className="vital-label">SpO2:</span>
              <span className="vital-value">
                {formatValue(userData.spo2, "%")} ({userData.spo2Status || 'N/A'})
              </span>
            </div>
          )}

          {/* 5. Respiratory Rate */}
          {userData.respiratoryRate && (
            <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span className="vital-label">Respiratory Rate:</span>
              <span className="vital-value">
                {formatValue(userData.respiratoryRate, "/min")} ({userData.respiratoryStatus || 'N/A'})
              </span>
            </div>
          )}

          {/* 6. Blood Pressure */}
          {userData.systolic && (
            <div className="vital-row" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
              <span className="vital-label">Blood Pressure:</span>
              <span className="vital-value">
                {userData.systolic}/{userData.diastolic} mmHg ({userData.bloodPressureStatus || 'N/A'})
              </span>
            </div>
          )}
        </div>

        {/* AI Assessment Section - HORIZONTAL LAYOUT */}
        {(userData.riskLevel !== undefined || (userData.suggestions && userData.suggestions.length > 0)) && (
          <div className="receipt-vitals" style={{ marginTop: '10px', borderTop: '1px dashed #000', paddingTop: '10px' }}>
            <div className="receipt-section-title">AI Assessment</div>

            {userData.riskLevel !== undefined && (
              <div className="receipt-row" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Risk Level:</span>
                <strong>{userData.riskCategory} ({userData.riskLevel}%)</strong>
              </div>
            )}

            {/* Suggestions (Horizontal) */}
            {userData.suggestions && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>SUGGESTIONS:</div>
                <div style={{ fontSize: '10px' }}>
                  {Array.isArray(userData.suggestions) ? userData.suggestions.join(', ') : userData.suggestions}
                </div>
              </div>
            )}

            {/* Preventions (Horizontal) */}
            {userData.preventions && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>PREVENTION:</div>
                <div style={{ fontSize: '10px' }}>
                  {Array.isArray(userData.preventions) ? userData.preventions.join(', ') : userData.preventions}
                </div>
              </div>
            )}

            {/* Wellness Tips (Horizontal) */}
            {userData.wellnessTips && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>WELLNESS TIPS:</div>
                <div style={{ fontSize: '10px' }}>
                  {Array.isArray(userData.wellnessTips) ? userData.wellnessTips.join(', ') : userData.wellnessTips}
                </div>
              </div>
            )}

            {/* Guidance (Horizontal) */}
            {userData.providerGuidance && (
              <div style={{ marginTop: '5px' }}>
                <div style={{ fontWeight: 'bold', fontSize: '10px' }}>FOR PROVIDER:</div>
                <div style={{ fontSize: '10px' }}>
                  {Array.isArray(userData.providerGuidance) ? userData.providerGuidance.join(', ') : userData.providerGuidance}
                </div>
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
          <h1 className="sharing-title">Measurement <span style={{ color: '#dc2626' }}>Complete</span></h1>
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
            disabled={printSent || isPrinting || isPaperEmpty}
            style={isPaperEmpty ? { opacity: 0.6, cursor: 'not-allowed', borderColor: '#ef4444' } : {}}
          >
            <div className="action-icon">
              {printSent ? '✓' : isPaperEmpty ? '⚠️' : isPrinting ? '⏳' : '🖨️'}
            </div>
            <div className="action-details">
              <span className="action-title" style={isPaperEmpty ? { color: '#ef4444' } : {}}>
                {printSent ? 'Printed' : isPaperEmpty ? 'Out of Paper' : isPrinting ? 'Printing...' : 'Print Receipt'}
              </span>
              <span className="action-desc" style={isPaperEmpty ? { color: '#ef4444' } : {}}>
                {printSent ? 'Receipt sent to printer' : isPaperEmpty ? 'Printer unavailable' : 'Get a physical copy'}
              </span>
            </div>
          </button>
        </div>

        {/* Finish Button */}
        <div className="sharing-footer-action">
          <button
            className="start-button"
            onClick={() => handleReturnHome(false)}
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

      {/* Skip Confirmation Modal (Glassmorphism) */}
      {showSkipModal && (
        <div className="status-modal-overlay" onClick={() => setShowSkipModal(false)}>
          <motion.div
            className="status-modal-content warning"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)'
            }}
          >
            <div className="status-modal-icon">
              <span>⚠️</span>
            </div>
            <h2 className="status-modal-title">No Option Selected</h2>
            <p className="status-modal-message">
              You haven't selected to email or print your results. Are you sure you want to finish without saving a copy?
            </p>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px', width: '100%' }}>
              <button
                className="status-modal-button"
                style={{
                  background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
                  color: '#1e293b',
                  boxShadow: '0 6px 20px rgba(148, 163, 184, 0.4)',
                  flex: 1
                }}
                onClick={() => setShowSkipModal(false)}
              >
                Go Back
              </button>
              <button
                className="status-modal-button"
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  boxShadow: '0 6px 20px rgba(239, 68, 68, 0.5)',
                  flex: 1
                }}
                onClick={confirmSkip}
              >
                Finish Anyway
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}