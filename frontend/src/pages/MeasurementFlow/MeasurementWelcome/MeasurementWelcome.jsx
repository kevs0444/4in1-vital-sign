import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "react-bootstrap";
import { motion } from "framer-motion";
import "./MeasurementWelcome.css";
import logo from "../../../assets/images/welcome.png";

export default function MeasurementWelcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: "",
    schoolNumber: "",
    role: ""
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
    if (location.state) {
      console.log("📥 Received user data in MeasurementWelcome:", location.state);
      setUserData(location.state);
    } else {
      // If no data passed, try to get from localStorage
      try {
        const storedUser = localStorage.getItem('userData');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          console.log("📥 Retrieved user data from localStorage:", user);
          setUserData({
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            age: user.age || "",
            sex: user.sex || "",
            schoolNumber: user.schoolNumber || "",
            role: user.role || ""
          });
        }
      } catch (error) {
        console.error("❌ Error retrieving user data:", error);
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [location.state]);

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

  const handleShowTerms = () => setShowTerms(true);
  const handleCloseTerms = () => setShowTerms(false);

  const handleBack = () => {
    navigate("/login");
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 welcome-container">
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 welcome-content page-transition`}>
        <button className="close-button" onClick={handleExit}>←</button>
        {/* Logo */}
        <div className="d-flex justify-content-center mb-4 welcome-logo">
          <div className="logo-main-circle">
            <img
              src={logo}
              alt="4 in Juan Logo"
              className="juan-logo"
            />
          </div>
        </div>

        {/* Welcome Message */}
        <div className="text-center mb-5 welcome-message">
          <h1 className="main-title mb-3">
            Welcome, {userData.firstName || "User"}!
          </h1>
          <p className="motto mb-4 fs-5">
            Ready to check your vital signs with{" "}
            <span className="every-juan fw-bold">
              4 in <span className="juan-red text-danger">Juan</span>
            </span>
          </p>

          <div className="welcome-subtitle text-muted">
            <p className="mb-1">Before we begin, please review and accept our Terms and Conditions</p>
            <p>to ensure accurate monitoring and personalized health insights.</p>
          </div>
        </div>

        {/* Terms and Conditions & Button Container */}
        <div className="action-section text-center">
          {/* Terms and Conditions */}
          <div className="d-flex justify-content-center mb-4 terms-section">
            <div className="form-check terms-checkbox d-flex align-items-center gap-2">
              <input
                type="checkbox"
                id="termsCheckbox"
                className="form-check-input mt-0"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="termsCheckbox" className="form-check-label terms-checkbox-label ms-2 cursor-pointer">
                I agree to the{" "}
                <Button
                  variant="link"
                  className="terms-link p-0 text-decoration-underline fw-bold"
                  onClick={handleShowTerms}
                >
                  Terms and Conditions
                </Button>
              </label>
            </div>
          </div>

          {/* Action Button */}
          <div className="button-section d-flex flex-column gap-3 align-items-center">
            <Button
              className="continue-button btn-danger rounded-pill px-5 py-3 fw-bold shadow"
              onClick={handleContinue}
              disabled={!acceptedTerms}
              size="lg"
              style={{ minWidth: '300px' }}
            >
              OK, Let's Start
            </Button>
          </div>
        </div>
      </div>

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
            <h2 className="exit-modal-title">Exit Measurement?</h2>
            <p className="exit-modal-message">Do you want to go back to login and cancel the measurement?</p>
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

              <h5>1. Acceptance of Terms</h5>
              <p className="text-justify">By using the 4 in Juan Vital Sign Kiosk, you agree to these Terms and Conditions. If you do not agree, please do not use this service.</p>

              <h5>2. Health Information Collection</h5>
              <p className="text-justify">This kiosk collects the following health information:</p>
              <ul>
                <li className="text-justify">Personal identification (name, age, sex)</li>
                <li className="text-justify">4 Vital Signs: Body Temperature, Heart Rate, Respiratory Rate, Blood Pressure</li>
                <li className="text-justify">Additional measurements (weight, height)</li>
                <li className="text-justify">BMI calculation and health risk assessment</li>
              </ul>

              <h5>3. Data Privacy and Security</h5>
              <p className="text-justify">Your health information is stored securely and used only for providing health assessments, generating insights, and improving services. We do not share your information without consent.</p>

              <h5>4. Medical Disclaimer</h5>
              <p className="text-justify">The 4 in Juan Vital Kiosk provides health screening only. It is not a substitute for professional medical advice. Always consult healthcare providers for medical concerns.</p>

              <h5>5. User Responsibilities</h5>
              <p className="text-justify">You agree to provide accurate information, use the kiosk as intended, and keep your health information confidential.</p>

              <h5>6. Consent</h5>
              <p className="text-justify">By accepting these terms, you consent to the processing of your health data for the purposes outlined above.</p>

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