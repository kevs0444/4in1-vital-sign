import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Modal } from "react-bootstrap";
import { motion } from "framer-motion";
import "./RegisterWelcome.css";
import logo from "../../../assets/images/welcome.png";
import { speak, stopSpeaking } from "../../../utils/speech";

export default function RegisterWelcome() {
  const navigate = useNavigate();
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const hasSpokenRef = useRef(false);

  // Add viewport meta tag to prevent zooming
  useEffect(() => {
    // Speak welcome message
    if (!hasSpokenRef.current) {
      speak("Welcome to 4 in Juan Registration. Please review the terms and click Start Registration to begin.");
      hasSpokenRef.current = true;
    }

    // Create or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';

    // Prevent zooming via touch gestures
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

    document.addEventListener('touchstart', handleTouchStart, { passive: false });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });

    return () => {
      stopSpeaking();
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  const handleContinue = () => {
    navigate("/register/role");
  };

  const handleBack = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  const handleShowTerms = () => setShowTerms(true);
  const handleCloseTerms = () => setShowTerms(false);

  return (
    <div className="register-container">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="register-content"
      >
        {/* Back Arrow Button */}
        <button className="close-button" onClick={handleBack}>
          ←
        </button>

        {/* Header - Matches RegisterRole structure */}
        <div className="register-header">
          <h1 className="register-title">
            4 in <span className="juan-red">Juan</span> Registration
          </h1>
          <p className="register-subtitle">
            Creating health profiles for{" "}
            <span className="juan-nowrap">
              every<span className="juan-red">Juan</span>
            </span>
          </p>
        </div>

        {/* Card Section - Matches RegisterRole structure */}
        <div className="register-card-section">
          <div className="register-welcome-card">
            <div className="register-card-icon">
              <img
                src={logo}
                alt="4 in Juan Logo"
                className="register-icon-image"
              />
            </div>
            <div className="register-card-content">
              <h3 className="register-card-title">Welcome!</h3>
              <p className="register-card-description">
                We'll guide you through creating your personal health profile to ensure accurate monitoring and personalized health insights.
              </p>
            </div>
          </div>
        </div>

        {/* Controls - Matches RegisterRole structure */}
        <div className="register-controls">
          {/* Terms and Conditions */}
          <div className="terms-section">
            <div className="terms-checkbox">
              <input
                type="checkbox"
                id="termsCheckbox"
                className="terms-checkbox-input"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
              />
              <label htmlFor="termsCheckbox" className="terms-checkbox-label">
                I agree to the{" "}
                <Button
                  variant="link"
                  className="terms-link"
                  onClick={handleShowTerms}
                >
                  Terms and Conditions
                </Button>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="button-section">
            <button
              className="continue-button"
              onClick={handleContinue}
              disabled={!acceptedTerms}
            >
              Start Registration
            </button>
          </div>
        </div>
      </motion.div>



      {/* Modern Exit Confirmation Popup Modal */}
      {
        showExitModal && (
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
              <h2 className="exit-modal-title">Exit Registration?</h2>
              <p className="exit-modal-message">Do you want to go back to login? Your progress will not be saved.</p>
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
        )
      }

      {/* Modern Terms and Conditions Popup Modal */}
      {
        showTerms && (
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
              <h2 className="terms-modal-title">Registration Terms and Conditions</h2>

              <div className="terms-scroll-content">
                <h4>4 in Juan Vital Kiosk - Registration Terms</h4>
                <p className="text-justify"><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

                <h5>1. Acceptance of Registration Terms</h5>
                <p className="text-justify">By proceeding with registration for the 4 in Juan Vital Sign Kiosk, you agree to these Registration Terms and Conditions. If you do not agree, please do not register.</p>

                <h5>2. Personal Information Collection</h5>
                <p className="text-justify">During registration, we collect the following personal information:</p>
                <ul>
                  <li className="text-justify">Personal identification details (full name, age, gender)</li>
                  <li className="text-justify">Contact information (email, phone number - optional)</li>
                  <li className="text-justify">Role/affiliation (student, employee, nurse, doctor, admin)</li>
                  <li className="text-justify">ID number (student ID, employee ID, etc.)</li>
                  <li className="text-justify">Demographic information for health assessment</li>
                </ul>

                <h5>3. Data Privacy and Security</h5>
                <p className="text-justify">Your personal information is stored securely and used for:</p>
                <ul>
                  <li className="text-justify">Creating and maintaining your health profile</li>
                  <li className="text-justify">Providing personalized health insights and recommendations</li>
                  <li className="text-justify">Tracking your health progress over time</li>
                  <li className="text-justify">Ensuring accurate health monitoring and assessment</li>
                </ul>
                <p className="text-justify">We implement industry-standard security measures to protect your data and do not share your personal information with third parties without your explicit consent.</p>

                <h5>4. Profile Accuracy and Updates</h5>
                <p className="text-justify">You are responsible for:</p>
                <ul>
                  <li className="text-justify">Providing accurate and complete information during registration</li>
                  <li className="text-justify">Keeping your profile information up to date</li>
                  <li className="text-justify">Informing us of any changes to your personal information</li>
                </ul>

                <h5>5. Account Security</h5>
                <p className="text-justify">You are responsible for:</p>
                <ul>
                  <li className="text-justify">Keeping your login credentials confidential</li>
                  <li className="text-justify">Not sharing your account with others</li>
                  <li className="text-justify">Reporting any unauthorized access immediately</li>
                </ul>

                <h5>6. Health Data Collection Consent</h5>
                <p className="text-justify">By registering, you consent to the collection and processing of your health data including:</p>
                <ul>
                  <li className="text-justify">Vital signs (temperature, heart rate, respiratory rate, blood pressure)</li>
                  <li className="text-justify">Physical measurements (height, weight, BMI)</li>
                  <li className="text-justify">Health risk assessments and recommendations</li>
                </ul>

                <h5>7. Medical Disclaimer</h5>
                <p className="text-justify">The 4 in Juan Vital Kiosk provides health screening and information only. It is not a substitute for professional medical advice, diagnosis, or treatment.</p>
                <p className="text-justify"><strong>Important:</strong> Always consult qualified healthcare professionals for medical concerns and before making health decisions.</p>

                <h5>8. Data Retention and Deletion</h5>
                <p className="text-justify">You may request deletion of your profile and associated data by contacting our support team. Some data may be retained for legal or operational requirements.</p>

                <h5>9. Changes to Registration Terms</h5>
                <p className="text-justify">We may update these registration terms periodically. Continued use of your registered account constitutes acceptance of updated terms.</p>

                <h5>10. Contact Information</h5>
                <p className="text-justify">For questions about registration, your data, or to request account deletion, please contact our support team.</p>

                <div className="text-center mt-4">
                  <p className="text-justify"><strong>By clicking "I Agree", you acknowledge that you have read, understood, and accept these Registration Terms and Conditions, and consent to the collection and processing of your personal and health information.</strong></p>
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
        )
      }
    </div >
  );
}