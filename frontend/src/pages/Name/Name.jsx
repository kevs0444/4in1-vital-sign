import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Container, Row, Col, Button, Form } from "react-bootstrap";
import { motion } from "framer-motion";
import "./Name.css";
import nameImage from "../../assets/images/name.png";

export default function Name() {
  const navigate = useNavigate();
  const location = useLocation();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const formRef = useRef(null);
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-focus on first name input
    setTimeout(() => {
      if (firstNameInputRef.current) {
        firstNameInputRef.current.focus();
      }
    }, 500);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const handleFirstNameChange = (e) => setFirstName(capitalize(e.target.value));
  const handleLastNameChange = (e) => setLastName(capitalize(e.target.value));

  const handleContinue = () => {
    if (!firstName.trim() || !lastName.trim()) {
      alert("Please enter both first name and last name");
      return;
    }
    navigate("/age", {
      state: { ...location.state, firstName: firstName.trim(), lastName: lastName.trim() },
    });
  };

  const handleBack = () => navigate("/welcome");

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleContinue();
    }
  };

  return (
    <Container fluid className="name-container" role="main">
      <Row className="justify-content-center w-100">
        <Col xs={12} md={10} lg={8} xl={7} className="text-center">
          <motion.div
            ref={formRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: isVisible ? 1 : 0 }}
            transition={{ duration: 0.5 }}
            className="name-content"
            aria-live="polite"
          >
            {/* Progress Bar */}
            <div className="progress-container" role="region" aria-label="Progress Indicator">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: "33%" }}></div>
              </div>
              <span className="progress-step">Step 1 of 3</span>
            </div>

            {/* Image Section - Made larger */}
            <div className="name-image" role="img" aria-label="Name Page Illustration">
              <img
                src={nameImage}
                alt="Name Page Illustration"
                className="vital-sign-logo"
              />
            </div>

            {/* Header Section */}
            <div className="name-header">
              <h1 className="name-title">What's your name?</h1>
              <p className="name-subtitle" id="name-subtitle">
                First things first - tell us your name!
              </p>
            </div>

            {/* Form Section */}
            <div className="name-form" role="form">
              <Row className="name-input-group">
                <Col xs={12} md={12} className="mb-3">
                  <Form.Group controlId="firstName" aria-describedby="name-subtitle">
                    <Form.Label className="input-label" htmlFor="firstNameInput">First Name</Form.Label>
                    <Form.Control
                      ref={firstNameInputRef}
                      id="firstNameInput"
                      type="text"
                      className="name-input"
                      placeholder="Juan"
                      value={firstName}
                      onChange={handleFirstNameChange}
                      onKeyPress={handleKeyPress}
                      required
                      inputMode="text"
                      autoComplete="given-name"
                      aria-label="First Name Input"
                      tabIndex="0"
                    />
                  </Form.Group>
                </Col>
                <Col xs={12} md={12} className="mb-3">
                  <Form.Group controlId="lastName" aria-describedby="name-subtitle">
                    <Form.Label className="input-label" htmlFor="lastNameInput">Last Name</Form.Label>
                    <Form.Control
                      ref={lastNameInputRef}
                      id="lastNameInput"
                      type="text"
                      className="name-input"
                      placeholder="Dela Cruz"
                      value={lastName}
                      onChange={handleLastNameChange}
                      onKeyPress={handleKeyPress}
                      required
                      inputMode="text"
                      autoComplete="family-name"
                      aria-label="Last Name Input"
                      tabIndex="0"
                    />
                  </Form.Group>
                </Col>
              </Row>
            </div>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="name-actions"
              role="navigation"
            >
              <div className="buttons-container">
                <Button
                  className="back-button"
                  onClick={handleBack}
                  variant="outline-danger"
                  size="lg"
                  aria-label="Go Back"
                  tabIndex="0"
                >
                  Back
                </Button>
                <Button
                  className="continue-button"
                  onClick={handleContinue}
                  disabled={!firstName.trim() || !lastName.trim()}
                  variant="danger"
                  size="lg"
                  aria-label="Continue to Next Step"
                  tabIndex="0"
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          </motion.div>
        </Col>
      </Row>
      {/* 5% space between container and keyboard */}
      <div className="keyboard-space" aria-hidden="true"></div>
    </Container>
  );
}