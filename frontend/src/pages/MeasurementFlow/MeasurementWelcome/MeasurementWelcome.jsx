import React, { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form } from "react-bootstrap";
import { motion } from "framer-motion";
import "./MeasurementWelcome.css";
import logo from "../../../assets/images/welcome.png";

export default function MeasurementWelcome() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
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

  // Format the display name
  const getDisplayName = () => {
    if (userData.firstName && userData.lastName) {
      return `${userData.firstName} ${userData.lastName}`;
    }
    return "User";
  };

  return (
    <Container fluid className="welcome-container d-flex align-items-center justify-content-center min-vh-100">
      <Row className="justify-content-center w-100">
        <Col xs={12} md={10} lg={8} xl={7} className="text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="welcome-content"
          >
            {/* Logo */}
            <div className="welcome-logo mb-3">
              <div className="logo-main-circle">
                <img 
                  src={logo} 
                  alt="4 in Juan Logo" 
                  className="juan-logo"
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div className="welcome-message mb-3">
              <h1 className="main-title mb-2">
                Welcome, {userData.firstName || "User"}!
              </h1>
              <p className="motto mb-3">
                Ready to check your vital signs with{" "}
                <span className="every-juan">
                  4 in <span className="juan-red">Juan</span>
                </span>
              </p>
              
              {/* User Info Display */}
              <div className="user-info-display mb-3">
                <div className="user-info-card">
                  <h4 className="user-info-title">Your Information</h4>
                  <div className="user-info-grid">
                    <div className="user-info-item">
                      <span className="user-info-label">Name:</span>
                      <span className="user-info-value">{getDisplayName()}</span>
                    </div>
                    <div className="user-info-item">
                      <span className="user-info-label">Age:</span>
                      <span className="user-info-value">{userData.age ? `${userData.age} years old` : "Not specified"}</span>
                    </div>
                    <div className="user-info-item">
                      <span className="user-info-label">Sex:</span>
                      <span className="user-info-value">
                        {userData.sex ? userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1) : "Not specified"}
                      </span>
                    </div>
                    {userData.schoolNumber && (
                      <div className="user-info-item">
                        <span className="user-info-label">School Number:</span>
                        <span className="user-info-value">{userData.schoolNumber}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="welcome-subtitle text-muted">
                <p className="mb-1">Before we begin, please review and accept our Terms and Conditions</p>
                <p>to ensure accurate monitoring and personalized health insights.</p>
              </div>
            </div>

            {/* Terms and Conditions & Button Container */}
            <div className="action-section">
              {/* Terms and Conditions */}
              <div className="terms-section mb-4">
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

              {/* Action Button */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="button-section"
              >
                <Button
                  className="continue-button"
                  onClick={handleContinue}
                  disabled={!acceptedTerms}
                  size="lg"
                >
                  OK, Let's Start
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </Col>
      </Row>

      {/* Terms and Conditions Modal */}
      <Modal 
        show={showTerms} 
        onHide={handleCloseTerms} 
        size="lg" 
        centered
        className="terms-modal"
      >
        <Modal.Header closeButton className="terms-modal-header">
          <Modal.Title>Terms and Conditions</Modal.Title>
        </Modal.Header>
        <Modal.Body className="terms-content">
          <div className="terms-scroll">
            <h4>4 in Juan Vital Kiosk - Terms of Use</h4>
            <p className="text-justify"><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

            <h5>1. Acceptance of Terms</h5>
            <p className="text-justify">By using the 4 in Juan Vital Sign Kiosk, you agree to these Terms and Conditions. If you do not agree, please do not use this service.</p>

            <h5>2. Health Information Collection</h5>
            <p className="text-justify">This kiosk collects the following health information:</p>
            <ul>
              <li className="text-justify">Personal identification (name, age, sex)</li>
              <li className="text-justify">4 Vital Signs:
                <ul>
                  <li className="text-justify">Body Temperature</li>
                  <li className="text-justify">Heart Rate (BPM)</li>
                  <li className="text-justify">Respiratory Rate</li>
                  <li className="text-justify">Blood Pressure</li>
                </ul>
              </li>
              <li className="text-justify">Additional measurements (weight, height)</li>
              <li className="text-justify">BMI calculation and health risk assessment</li>
            </ul>

            <h5>3. Data Privacy and Security</h5>
            <p className="text-justify">Your health information is stored securely and used only for:</p>
            <ul>
              <li className="text-justify">Providing immediate health assessments</li>
              <li className="text-justify">Generating personalized health insights</li>
              <li className="text-justify">Improving our services (anonymized data only)</li>
            </ul>
            <p className="text-justify">We do not share your personal health information with third parties without your explicit consent.</p>

            <h5>4. Medical Disclaimer</h5>
            <p className="text-justify">The 4 in Juan Vital Kiosk provides health screening and information only. It is not a substitute for professional medical advice, diagnosis, or treatment.</p>
            <p className="text-justify"><strong>Important:</strong> Always seek the advice of qualified healthcare providers with any questions you may have regarding medical conditions.</p>

            <h5>5. User Responsibilities</h5>
            <p className="text-justify">You agree to:</p>
            <ul>
              <li className="text-justify">Provide accurate information</li>
              <li className="text-justify">Use the kiosk as intended</li>
              <li className="text-justify">Consult healthcare professionals for medical concerns</li>
              <li className="text-justify">Keep your health information confidential</li>
            </ul>

            <h5>6. Limitation of Liability</h5>
            <p className="text-justify">The 4 in Juan Vital Sign Kiosk and its operators are not liable for:</p>
            <ul>
              <li className="text-justify">Any health decisions made based on the information provided</li>
              <li className="text-justify">Technical errors or interruptions in service</li>
              <li className="text-justify">Inaccurate readings due to user error or equipment malfunction</li>
            </ul>

            <h5>7. Consent for Data Processing</h5>
            <p className="text-justify">By accepting these terms, you consent to the processing of your health data for the purposes outlined above.</p>

            <h5>8. Changes to Terms</h5>
            <p className="text-justify">We may update these terms periodically. Continued use of the kiosk constitutes acceptance of updated terms.</p>

            <h5>9. Contact Information</h5>
            <p className="text-justify">For questions about these terms or your data, please contact our support team.</p>

            <div className="text-center mt-4">
              <p className="text-justify"><strong>By clicking "I Agree", you acknowledge that you have read, understood, and accept these Terms and Conditions.</strong></p>
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer className="terms-modal-footer">
          <Button variant="outline-secondary" onClick={handleCloseTerms}>
            Close
          </Button>
          <Button 
            variant="danger" 
            onClick={() => {
              setAcceptedTerms(true);
              handleCloseTerms();
            }}
          >
            I Agree
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}