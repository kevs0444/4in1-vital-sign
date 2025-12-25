import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./Starting.css";
import logo from "../../../assets/images/logo.png";
import { speak, reinitSpeech } from "../../../utils/speech";
import { isLocalDevice } from "../../../utils/network";

export default function Starting() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: "",
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

  // RESTRICT ACCESS TO LOCAL DEVICE ONLY
  useEffect(() => {
    if (!isLocalDevice()) {
      alert("Measurements can only be performed on the main Kiosk device.");
      navigate("/admin/dashboard", { replace: true, state: { user: userData } });
    }
  }, [navigate, userData]);

  useEffect(() => {
    // Get user data from location state (passed from MeasurementWelcome)
    if (location.state) {
      console.log("📥 Received user data in Starting:", location.state);
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
            role: user.role || "",
            user_id: user.user_id || user.id || "",
            email: user.email || ""
          });
        }
      } catch (error) {
        console.error("❌ Error retrieving user data:", error);
      }
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
      reinitSpeech();
      speak("Getting ready to start your health measurement. Tap the Start button to continue.");
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

  // ✅ Fixed navigation path to match routes.js
  const handleStartMeasurements = () => {
    console.log("🚀 Starting navigation to Checklist with data:", userData);

    navigate("/measure/checklist", {
      state: userData
    });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  // Format the display name
  const getDisplayName = () => {
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    return "User";
  };

  // Format age display
  const getAgeDisplay = () => {
    if (userData.age) {
      return `${userData.age} years old`;
    }
    return "Age not specified";
  };

  // Format sex display
  const getSexDisplay = () => {
    if (userData.sex) {
      return userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1);
    }
    return "Not specified";
  };

  // Format role display
  const getRoleDisplay = () => {
    if (userData.role) {
      return userData.role.charAt(0).toUpperCase() + userData.role.slice(1);
    }
    return "Not specified";
  };

  return (
    <div
      className="starting-container container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 bg-white"
    >
      <div className={`starting-content card border-0 shadow-lg p-4 p-md-5 mx-3 ${isVisible ? 'visible' : ''}`}>
        <button className="close-button" onClick={handleExit}>←</button>

        {/* Logo - Centered with text-center */}
        <div className="starting-logo d-flex justify-content-center mb-4">
          <div className="logo-main-circle">
            <img
              src={logo}
              alt="VitalSign AI Logo"
              className="logo-image img-fluid rounded-circle"
            />
          </div>
        </div>

        {/* Title */}
        <div className="starting-header text-center mb-4">
          <h1 className="starting-title display-4 fw-bold mb-2 text-dark">
            Ready to <span style={{ color: "var(--red-500)" }}>Begin!</span>
          </h1>
          <p className="starting-subtitle lead text-secondary">Let's start gathering your vital signs</p>
        </div>

        {/* Personal Info Summary - Clean visual without boxes */}
        <div className="personal-info-summary w-100 mb-4 px-md-5">
          <div className="info-grid d-flex flex-wrap justify-content-center gap-4">
            <div className="info-item-clean">
              <span className="info-label">Name</span>
              <span className="info-value">{getDisplayName()}</span>
            </div>
            <div className="info-item-clean">
              <span className="info-label">Age</span>
              <span className="info-value">{getAgeDisplay()}</span>
            </div>
            <div className="info-item-clean">
              <span className="info-label">Sex</span>
              <span className="info-value">{getSexDisplay()}</span>
            </div>
            {userData.role && (
              <div className="info-item-clean">
                <span className="info-label">Role</span>
                <span className="info-value">{getRoleDisplay()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Measurement Instructions - Orientation Guidelines */}
        <div className="measurement-instructions mb-5 w-100 px-md-5">
          <div className="instructions-list d-flex flex-column gap-3 align-items-center">
            <div className="instruction-item-clean">
              <span className="instruction-icon">🧘</span>
              <div className="d-flex flex-column text-start">
                <span className="instruction-text fw-bold">Relax & Stay Still</span>
                <span className="instruction-subtext text-secondary">Breathe normally and keep calm during the process</span>
              </div>
            </div>
            <div className="instruction-item-clean">
              <span className="instruction-icon">👋</span>
              <div className="d-flex flex-column text-start">
                <span className="instruction-text fw-bold">Ask for Assistance</span>
                <span className="instruction-subtext text-secondary">Our medical staff is here to help if you need anything</span>
              </div>
            </div>
            <div className="instruction-item-clean">
              <span className="instruction-icon">🧥</span>
              <div className="d-flex flex-column text-start">
                <span className="instruction-text fw-bold">Remove Accessories</span>
                <span className="instruction-subtext text-secondary">Please remove watch, cap, shoes, id lace, and other accessories</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="starting-actions text-center mt-2 d-flex flex-column gap-3 w-100 align-items-center">
          <button
            className="start-button"
            onClick={handleStartMeasurements}
          >
            Start Measurements
          </button>
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
    </div>
  );
}