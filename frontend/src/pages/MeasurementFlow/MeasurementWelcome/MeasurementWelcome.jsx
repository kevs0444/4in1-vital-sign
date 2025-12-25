import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./MeasurementWelcome.css";
import welcomeImg from "../../../assets/images/welcome.png";
import dashboard3d from "../../../assets/icons/dashboard-3d.png";
import measure3d from "../../../assets/icons/measure-3d.png";
import { speak, reinitSpeech } from "../../../utils/speech";
import { isLocalDevice } from "../../../utils/network";

export default function MeasurementWelcome() {
  const navigate = useNavigate();
  const location = useLocation();
  // eslint-disable-next-line no-unused-vars
  const [isVisible, setIsVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  // eslint-disable-next-line no-unused-vars
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showSelection, setShowSelection] = useState(false); // New state for selection view
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: "",
    schoolNumber: "",
    role: "",
    user_id: "",
    email: ""
  });

  // Add viewport meta tag to prevent zooming
  useEffect(() => {
    // Create or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';

    // Prevent zooming via touch gestures
    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  useEffect(() => {
    // Get user data from location state (passed from Login)
    let userName = "";
    if (location.state) {
      console.log("📥 Received user data in MeasurementWelcome:", location.state);
      setUserData(location.state);
      userName = location.state.firstName || "";
      // ENABLE SELECTION FOR ALL ROLES
      setShowSelection(true);
    } else {
      // If no data passed, try to get from localStorage
      try {
        const storedUser = localStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log("📥 Retrieved user data from localStorage:", user);
          userName = user.firstName || "";
          setUserData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            age: user.age || "",
            sex: user.sex || "",
            schoolNumber: user.schoolNumber || "",
            role: user.role || "",
            user_id: user.user_id || user.id || "",
            email: user.email || ""
          });
          // ENABLE SELECTION FOR ALL ROLES
          setShowSelection(true);
        }
      } catch (error) {
        console.error("❌ Error retrieving user data:", error);
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      reinitSpeech();
      if (userName) {
        speak(`Hello ${userName}. Please choose to start measurement or view your dashboard.`);
      } else {
        speak("Please choose to start measurement or view your dashboard.");
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [location.state]);

  // eslint-disable-next-line no-unused-vars
  const checkRole = (role) => {
    // Role check disabled - showing selection for everyone
    if (role) {
      setShowSelection(true);
    }
  };

  // Prevent zooming functions
  const handleTouchStart = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
    }
  };

  const preventZoom = (e) => {
    e.preventDefault();
  };

  const handleContinue = () => {
    console.log("🚀 Navigating to Starting with user data:", userData);
    navigate("/measure/starting", {
      state: userData
    });
  };

  const handleDashboard = () => {
    console.log("🚀 Navigating to Dashboard");
    navigate("/admin/dashboard", {
      state: { user: userData }
    });
  };

  const handleStartMeasure = () => {
    // Direct navigation, skipping the confirmation screen
    console.log("🚀 Starting measurement flow immediately...");
    navigate("/measure/starting", {
      state: userData
    });
  };

  // eslint-disable-next-line no-unused-vars
  const handleShowTerms = () => setShowTerms(true);
  const handleCloseTerms = () => setShowTerms(false);



  const handleExit = () => setShowExitModal(true);

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  /* =================================================================================
     REMOTE DEVICE UI (Portal Style - No Measurement)
     ================================================================================= */
  if (!isLocalDevice()) {
    return (
      <div style={{
        background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', sans-serif"
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-4 shadow-lg p-4 p-md-5 w-100 text-center"
          style={{ maxWidth: '500px' }}
        >
          <div className="mb-4 d-flex justify-content-center">
            <img src={welcomeImg} alt="Welcome" style={{ width: '120px', height: 'auto' }} />
          </div>

          <h2 className="fw-bold text-dark mb-2">Welcome, {userData.firstName || 'User'}!</h2>
          <p className="text-muted mb-4">You are logged into the 4-in-Juan Portal.</p>

          <div className="d-grid gap-3">
            <button
              onClick={handleDashboard}
              className="btn btn-primary btn-lg py-3 shadow-sm border-0"
              style={{ background: 'linear-gradient(90deg, #0d6efd 0%, #0a58ca 100%)' }}
            >
              <div className="d-flex align-items-center justify-content-center gap-2">
                <img src={dashboard3d} style={{ width: '24px' }} alt="" />
                View Dashboard
              </div>
            </button>

            <button
              onClick={() => setShowExitModal(true)}
              className="btn btn-outline-danger btn-lg py-2"
            >
              Log Out
            </button>
          </div>

          <div className="mt-4 pt-4 border-top text-muted small">
            <p className="mb-0">Vital Sign Kiosk Portal</p>
            <p className="mb-0" style={{ fontSize: '0.8rem' }}>Measurements can only be taken at the physical kiosk.</p>
          </div>

        </motion.div>

        {/* Exit/Logout Modal for Remote */}
        {showExitModal && (
          <div className="exit-modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setShowExitModal(false)}>
            <motion.div
              className="bg-white p-4 rounded-4 shadow"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '350px', width: '90%' }}
            >
              <h4 className="fw-bold mb-3">Log Out?</h4>
              <p className="text-muted mb-4">Are you sure you want to sign out directly?</p>
              <div className="d-grid gap-2">
                <button className="btn btn-danger" onClick={confirmExit}>Yes, Log Out</button>
                <button className="btn btn-light" onClick={() => setShowExitModal(false)}>Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  }

  // =================================================================================
  // KIOSK DEVICE UI (Original)
  // =================================================================================
  return (
    <div
      className="register-container"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="register-content"
      >
        {/* Back Arrow Button */}
        <button className="close-button" onClick={handleExit}>
          ←
        </button>

        {/* Header */}
        <div className="register-header">
          <h1 className="register-title">
            Welcome, <span className="juan-red">{userData.firstName || "User"}</span>!
          </h1>
          <p className="register-subtitle">
            {showSelection ? "How would you like to proceed?" : (
              <>
                Ready to check your vital signs with{" "}
                <span className="juan-nowrap">
                  4 in <span className="juan-red">Juan</span>
                </span>
              </>
            )}
          </p>
        </div>

        {/* Card Section - Always Visible */}
        <div className="register-card-section">
          <div className="register-welcome-card">
            <div className="register-card-icon">
              <img
                src={welcomeImg}
                alt="4 in Juan Logo"
                className="register-icon-image"
              />
            </div>
            <div className="register-card-content">
              <h3 className="register-card-title">
                {showSelection ? "Select an Option" : "Let's Get Started!"}
              </h3>
              <p className="register-card-description">
                {showSelection
                  ? "Please choose where you would like to go."
                  : "Press continue to begin your health measurement session."
                }
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Controls Section */}
        {showSelection ? (
          <div className="selection-container">
            <div className="selection-card" onClick={handleDashboard}>
              <div className="selection-icon-wrapper">
                <img src={dashboard3d} alt="Dashboard" className="selection-icon-image" />
              </div>
              <h3 className="selection-title">Dashboard</h3>
              <p className="selection-desc">Manage records & analytics.</p>
            </div>

            <div className="selection-card" onClick={isLocalDevice() ? handleStartMeasure : null} style={{ opacity: isLocalDevice() ? 1 : 0.5, cursor: isLocalDevice() ? 'pointer' : 'not-allowed' }}>
              <div className="selection-icon-wrapper">
                <img src={measure3d} alt="Measure" className="selection-icon-image" />
              </div>
              <h3 className="selection-title">Measure</h3>
              <p className="selection-desc">{isLocalDevice() ? "New measurement session." : "Available on Kiosk only."}</p>
            </div>
          </div>
        ) : (
          /* Controls */
          <div className="register-controls">
            {/* Action Buttons */}
            <div className="button-section">
              <button
                className={`continue-button ${!isLocalDevice() ? 'disabled' : ''}`}
                onClick={handleContinue}
                disabled={!isLocalDevice()}
                style={{ opacity: isLocalDevice() ? 1 : 0.5, cursor: isLocalDevice() ? 'pointer' : 'not-allowed' }}
              >
                {isLocalDevice() ? "OK, Let's Start" : "Kiosk Only"}
              </button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Modern Exit Confirmation Popup Modal */}
      {showExitModal && (
        <div className="exit-modal-overlay" onClick={() => setShowExitModal(false)}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-modal-icon">
              <span>🚪</span>
            </div>
            <h2 className="exit-modal-title">{showSelection ? "Log Out?" : "Exit Measurement?"}</h2>
            <p className="exit-modal-message">
              {showSelection ? "Do you want to log out and return to the login screen?" : "Do you want to go back to login and cancel the measurement?"}
            </p>
            <div className="exit-modal-buttons">
              <button
                className="exit-modal-button secondary"
                onClick={() => setShowExitModal(false)}
              >
                Cancel
              </button>
              <button
                className="exit-modal-button primary"
                onClick={confirmExit}
              >
                Yes, Exit
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Modern Terms and Conditions Popup Modal */}
      {showTerms && (
        <div className="terms-modal-overlay" onClick={handleCloseTerms}>
          <motion.div
            className="terms-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="terms-modal-icon">
              <span>📋</span>
            </div>
            <h2 className="terms-modal-title">Terms and Conditions</h2>

            <div className="terms-scroll-content">
              <h4>4 in Juan Vital Kiosk - Terms of Use</h4>
              <p className="text-justify"><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

              <h5>1. Welcome to Better Health</h5>
              <p className="text-justify">We are delighted to assist you in monitoring your vital signs. By proceeding, you agree to the use of this kiosk for personal health screening purposes.</p>

              <h5>2. What We Measure</h5>
              <p className="text-justify">To provide you with a comprehensive health snapshot, we collect:</p>
              <ul>
                <li className="text-justify">Basic identification (Name, Age, Sex) for personalized results.</li>
                <li className="text-justify">Vital Signs: Body Temperature, Heart Rate, Respiratory Rate, and Blood Pressure.</li>
                <li className="text-justify">Body Metrics: Weight and Height for BMI calculation.</li>
              </ul>

              <h5>3. Privacy & Safety</h5>
              <p className="text-justify">Your privacy is our priority. All data collected is securely processed and is used solely to generate your immediate health report. We do not share your personal information with third parties without your explicit consent.</p>

              <h5>4. Important Medical Notice</h5>
              <p className="text-justify">Please note that this kiosk provides a preliminary screening and is <strong>not</strong> a diagnostic tool. The results are for informational purposes only. If you have any health concerns, please consult a qualified healthcare professional.</p>

              <h5>5. User Agreement</h5>
              <p className="text-justify">By using this service, you confirm that:
                <br />• You will provide accurate information.
                <br />• You will follow the on-screen instructions for accurate readings.
              </p>

              <h5>6. Your Consent</h5>
              <p className="text-justify">By clicking "I Agree", you consent to the collection and processing of your vital sign measurements as described above.</p>

              <div className="text-center mt-4">
                <p className="text-justify"><strong>By clicking "I Agree", you acknowledge that you have read, understood, and accept these Terms and Conditions.</strong></p>
              </div>
            </div>

            <div className="terms-modal-buttons">
              <button
                className="terms-modal-button secondary"
                onClick={handleCloseTerms}
              >
                Close
              </button>
              <button
                className="terms-modal-button primary"
                onClick={() => {
                  setAcceptedTerms(true);
                  handleCloseTerms();
                }}
              >
                I Agree
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}