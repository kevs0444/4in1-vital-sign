import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Container, Row, Col, Button, Modal, Form } from "react-bootstrap";
import { motion } from "framer-motion";
import "./RegisterWelcome.css";
import logo from "../../../assets/images/welcome.png";

export default function RegisterWelcome() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const handleContinue = () => {
    navigate("/register/role");
  };

  const handleBack = () => {
    navigate("/login");
  };

  const handleShowTerms = () => setShowTerms(true);
  const handleCloseTerms = () => setShowTerms(false);

  return (
    <Container fluid className="register-container d-flex align-items-center justify-content-center min-vh-100">
      <Row className="justify-content-center w-100">
        <Col xs={12} md={10} lg={8} xl={7} className="text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="register-content"
          >
            {/* Logo */}
            <div className="register-logo mb-3">
              <div className="logo-main-circle">
                <img 
                  src={logo} 
                  alt="4 in Juan Logo" 
                  className="juan-logo"
                />
              </div>
            </div>

            {/* Welcome Message */}
            <div className="register-message mb-3">
              <h1 className="main-title mb-2">
                4 in <span className="juan-red">Juan</span> Registration
              </h1>
              <p className="motto mb-3">
                Creating health profiles for{" "}
                <span className="juan-nowrap">
                  every<span className="juan-red">Juan</span>
                </span>
              </p>
              <div className="register-subtitle text-muted">
                <p className="mb-1">Welcome to the 4 in Juan registration process!</p>
                <p>We'll guide you through creating your personal health profile</p>
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

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="button-section"
              >
                <Button
                  className="back-button"
                  onClick={handleBack}
                  size="lg"
                >
                  Back to Login
                </Button>
                <Button
                  className="continue-button"
                  onClick={handleContinue}
                  disabled={!acceptedTerms}
                  size="lg"
                >
                  Start Registration
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
          <Modal.Title>Registration Terms and Conditions</Modal.Title>
        </Modal.Header>
        <Modal.Body className="terms-content">
          <div className="terms-scroll">
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