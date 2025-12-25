import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Modal, Button, Container, Form, Row, Col, Card } from "react-bootstrap";
import { motion } from "framer-motion";
import "./RegisterPersonalInfo.css";
import nameImage from "../../../assets/images/name.png";
import ageImage from "../../../assets/images/age.png";
import maleIcon from "../../../assets/icons/male-icon.png";
import femaleIcon from "../../../assets/icons/female-icon.png";
import { isLocalDevice } from "../../../utils/network";

const getDynamicApiUrl = () => {
  if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
  return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const API_BASE = getDynamicApiUrl();

export default function RegisterPersonalInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  // Initialize step from navigation state if available (e.g. coming back from TapID)
  const [currentStep, setCurrentStep] = useState(location.state?.step || 0); // 0: Name, 1: Age, 2: Sex
  const [formData, setFormData] = useState({
    firstName: location.state?.personalInfo?.firstName || "",
    lastName: location.state?.personalInfo?.lastName || "",
    age: location.state?.personalInfo?.age ? location.state.personalInfo.age.toString() : "",
    sex: location.state?.personalInfo?.sex || "",
    birthMonth: location.state?.personalInfo?.birthMonth || null,
    birthDay: location.state?.personalInfo?.birthDay || null,
    birthYear: location.state?.personalInfo?.birthYear || null
  });

  const [isShift, setIsShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeInput, setActiveInput] = useState("first");
  const [touchFeedback, setTouchFeedback] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ firstName: false, lastName: false });
  const [showExitModal, setShowExitModal] = useState(false);
  const [showAgeWarningModal, setShowAgeWarningModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateModalTitle, setDuplicateModalTitle] = useState("Already Registered");
  const [duplicateModalMessage, setDuplicateModalMessage] = useState("");
  const [showCursor, setShowCursor] = useState(true);

  // Blinking cursor effect
  useEffect(() => {
    const interval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);
    return () => clearInterval(interval);
  }, []);

  const getDisplayValue = (rawVal, inputName) => {
    // Show blinking cursor on ACTIVE inputs if not empty.
    // Enhanced backspace handling ensures this works on Remote (writable) inputs too.
    if (activeInput === inputName && showCursor && rawVal && rawVal.length > 0) {
      return rawVal + '|';
    }
    return rawVal;

  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage("");
    if (fieldErrors && fieldErrors[field]) {
      setFieldErrors(prev => ({ ...prev, [field]: false }));
    }
  };

  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  const getDaysInMonth = (month, year) => {
    if (!month) return 31;
    // Default to leap year (2000) if no year selected to be permissive with Feb 29
    const y = year || 2000;
    return new Date(y, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(formData.birthMonth, formData.birthYear);

  // Constants for dimensions (matched with CSS)
  const ITEM_HEIGHT = 92; // 77px + ~20% -> 92px

  const MONTHS_COUNT = 12;
  // DAYS_COUNT is now dynamic: daysInMonth

  // Infinite Scroll Logic - Downward Loop Only
  const handleInfiniteScroll = (ref, count) => {
    if (!ref.current) return;
    const scrollTop = ref.current.scrollTop;
    const totalHeight = count * ITEM_HEIGHT;

    // The scroll view contains 3 sets: [PRE][MAIN][POST]
    // Set 0: 0 to H
    // Set 1: H to 2H
    // Set 2: 2H to 3H

    // Only loop downwards: If we reach the start of Set 2 (2H), jump back to Set 1 (H)
    // This allows Set 0 (Top) to be naturally visible and prevents scrolling up past the start.
    if (scrollTop >= totalHeight * 2) {
      ref.current.scrollTop = scrollTop - totalHeight;
    }
  };

  // Initial Scroll Positioning
  useEffect(() => {
    if (currentStep === 1) {
      // Reset Month Scroll to Top
      if (monthScrollRef.current) {
        monthScrollRef.current.scrollTop = 0;
      }
      // Reset Day Scroll to Top
      if (dayScrollRef.current) {
        dayScrollRef.current.scrollTop = 0;
      }
      // Year Scroll
      if (yearScrollRef.current) {
        // Defaults to top (current year), which is fine
        yearScrollRef.current.scrollTop = 0;
      }
    }
  }, [currentStep]);

  const steps = [
    {
      title: (
        <span>
          What's your <span style={{ color: "var(--red-500)" }}>name?</span>
        </span>
      ),
      label: "Name",
      subtitle: "Great to have you here! Let's start with your name",
      image: nameImage
    },
    {
      title: (
        <span>
          How old <span style={{ color: "var(--red-500)" }}>are you?</span>
        </span>
      ),
      label: "Age",
      subtitle: "Select your birthday to calculate your age",
      image: ageImage
    },
    {
      title: (
        <span>
          What is your <span style={{ color: "var(--red-500)" }}>biological sex?</span>
        </span>
      ),
      label: "Sex",
      subtitle: "Required for accurate health assessments",
      image: null
    }
  ];

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
    const handleZoomTouchStart = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleZoomTouchMove = (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    const handleZoomTouchEnd = (e) => {
      if (e.touches.length > 0) {
        e.preventDefault();
      }
    };

    const preventZoom = (e) => {
      e.preventDefault();
    };

    document.addEventListener('touchstart', handleZoomTouchStart, { passive: false });
    document.addEventListener('touchmove', handleZoomTouchMove, { passive: false });
    document.addEventListener('touchend', handleZoomTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleZoomTouchStart);
      document.removeEventListener('touchmove', handleZoomTouchMove);
      document.removeEventListener('touchend', handleZoomTouchEnd);
      setErrorMessage("");
    };
  }, []);

  useEffect(() => {
    setErrorMessage(""); // Clear errors on step change
    setFieldErrors({ firstName: false, lastName: false });
    if (currentStep === 0) {
      setShowSymbols(false); // Ensure alphabet layout for name step
      setIsShift(true); // Auto-shift for first name
      setActiveInput("first"); // Ensure first name is active
    }
  }, [currentStep]);

  // Auto-detect age restriction when birthday is fully selected
  useEffect(() => {
    if (currentStep === 1 && formData.birthMonth && formData.birthDay && formData.birthYear) {
      const ageNumber = parseInt(formData.age, 10);
      // Logic update: Ask for guidance if 15 or below. 15+ is allowed.
      if (!isNaN(ageNumber) && ageNumber <= 15) {
        setShowAgeWarningModal(true);
      }
    }
  }, [currentStep, formData.birthMonth, formData.birthDay, formData.birthYear, formData.age]);

  // Smart Date Logic: Clamp day if it exceeds max days for the month
  useEffect(() => {
    if (formData.birthMonth && formData.birthDay) {
      const maxDays = getDaysInMonth(formData.birthMonth, formData.birthYear);
      if (formData.birthDay > maxDays) {
        setFormData(prev => ({ ...prev, birthDay: maxDays }));
      }
    }
  }, [formData.birthMonth, formData.birthYear, formData.birthDay]);

  const handleContinue = async () => {
    setErrorMessage("");
    if (currentStep === 0) {
      const firstNameValid = formData.firstName.trim().length > 0;
      const lastNameValid = formData.lastName.trim().length > 0;

      if (!firstNameValid || !lastNameValid) {
        setFieldErrors({
          firstName: !firstNameValid,
          lastName: !lastNameValid
        });
        setErrorMessage("Please enter both first name and last name");
        return;
      }
      if (!firstNameValid || !lastNameValid) {
        setFieldErrors({
          firstName: !firstNameValid,
          lastName: !lastNameValid
        });
        setErrorMessage("Please enter both first name and last name");
        return;
      }

      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!formData.age.trim()) {
        setErrorMessage("Please select your birthday to calculate age");
        return;
      }
      const ageNumber = parseInt(formData.age, 10);
      if (ageNumber <= 15) {
        setShowAgeWarningModal(true);
        return;
      }
      if (ageNumber > 99) {
        setErrorMessage("Please enter a valid age up to 99");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.sex) {
        setErrorMessage("Please select your biological sex");
        return;
      }

      // Check for duplicate personal info before proceeding
      console.log('🔍 Checking for duplicate personal info...');
      console.log('Data to check:', {
        firstname: formData.firstName.trim(),
        lastname: formData.lastName.trim(),
        age: parseInt(formData.age, 10),
        sex: formData.sex,
        birthMonth: formData.birthMonth,
        birthDay: formData.birthDay,
        birthYear: formData.birthYear
      });

      try {
        const checkResponse = await fetch(`${API_BASE}/register/check-personal-info`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            firstname: formData.firstName.trim(),
            lastname: formData.lastName.trim(),
            age: parseInt(formData.age, 10),
            sex: formData.sex,
            birthMonth: formData.birthMonth,
            birthDay: formData.birthDay,
            birthYear: formData.birthYear
          })
        });

        console.log('📡 Response status:', checkResponse.status);
        const checkResult = await checkResponse.json();
        console.log('📊 Check result:', checkResult);

        if (checkResult.exists) {
          console.log('❌ Duplicate found! Showing modal...');
          setDuplicateModalTitle("User Already Registered");
          setDuplicateModalMessage(checkResult.message || "A user with the same personal information already exists. If this is you, please login instead.");
          setShowDuplicateModal(true);
          return;
        }

        console.log('✅ No duplicate found, proceeding to next step...');
      } catch (error) {
        console.error('❌ Error checking personal info:', error);
        // Show an error message if the check fails completely
        console.warn('⚠️ Could not verify personal info uniqueness, proceeding anyway');
      }

      // FIXED: Pass personal info as an object
      navigate("/register/tapid", {
        state: {
          ...location.state,
          personalInfo: {
            firstName: formData.firstName.trim(),
            lastName: formData.lastName.trim(),
            age: parseInt(formData.age, 10),
            sex: formData.sex,
            birthMonth: formData.birthMonth,
            birthDay: formData.birthDay,
            birthYear: formData.birthYear
          }
        }
      });
    }
  };

  const handleBack = () => {
    setShowExitModal(true);
  };

  const handleBackOneStep = () => {
    setShowExitModal(false);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setErrorMessage("");
    } else {
      // Navigate back to Role Selection
      navigate("/register/role");
    }
  };



  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  const handleKeyboardPress = (key) => {
    // Restrict input for Name Step: Only letters allowed
    if (currentStep === 0) {
      // Block numbers and symbol switch
      if (/^[0-9]$/.test(key) || key === "Sym") {
        return;
      }
      // Block other symbols if they somehow appear (except valid controls)
      const validControls = ["Del", "Space", "↑", "ABC"];
      if (!validControls.includes(key) && !/^[a-zA-Z]$/.test(key)) {
        return;
      }
    }

    if (key === "↑") {
      setIsShift(!isShift);
      return;
    }

    if (key === "Sym" || key === "ABC") {
      setShowSymbols(!showSymbols);
      return;
    }

    const applyFormatting = (prev, char) => {
      // Smart Casing: Auto-capitalize if start of string or after space
      const isStartOrAfterSpace = prev.length === 0 || prev.slice(-1) === ' ';
      let nextChar = (isStartOrAfterSpace || isShift) ? char.toUpperCase() : char.toLowerCase();
      setIsShift(false);
      return prev + nextChar;
    };

    if (key === "Del") {
      let newVal;
      if (activeInput === "first") {
        newVal = formData.firstName.slice(0, -1);
        setFormData(prev => ({ ...prev, firstName: newVal }));
      } else {
        newVal = formData.lastName.slice(0, -1);
        setFormData(prev => ({ ...prev, lastName: newVal }));
      }
      // Smart Shift: Activate if field becomes empty or ends in space
      setIsShift(newVal.length === 0 || newVal.slice(-1) === ' ');
    } else if (key === "Space") {
      if (activeInput === "first") {
        setFormData(prev => ({ ...prev, firstName: prev.firstName + " " }));
      } else {
        setFormData(prev => ({ ...prev, lastName: prev.lastName + " " }));
      }
      setIsShift(true); // Auto-shift after space
    } else {
      if (activeInput === "first") {
        setFormData(prev => ({ ...prev, firstName: applyFormatting(prev.firstName, key) }));
        if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: false }));
      } else {
        setFormData(prev => ({ ...prev, lastName: applyFormatting(prev.lastName, key) }));
        if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: false }));
      }
    }

    // Clear error message on input
    if (errorMessage) setErrorMessage("");
  };

  // Birthday selection functions
  const handleBirthdaySelect = (type, value) => {
    setFormData(prev => {
      const newData = { ...prev, [type === 'month' ? 'birthMonth' : type === 'day' ? 'birthDay' : 'birthYear']: value };

      if (newData.birthMonth && newData.birthDay && newData.birthYear) {
        const age = calculateAgeFromBirthday(newData.birthYear, newData.birthMonth, newData.birthDay);
        newData.age = age.toString();
      }

      return newData;
    });
    // Clear error message on selection
    if (errorMessage) setErrorMessage("");
  };

  const calculateAgeFromBirthday = (year, month, day) => {
    const today = new Date();
    const birthDate = new Date(year, month - 1, day);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }

    return age;
  };

  const calculateAge = () => {
    if (formData.birthMonth && formData.birthDay && formData.birthYear) {
      return calculateAgeFromBirthday(formData.birthYear, formData.birthMonth, formData.birthDay);
    }
    return 0;
  };

  // Sex step functions - RENAMED
  const handleSexSelect = (sex) => {
    setFormData(prev => ({ ...prev, sex }));
    setTouchFeedback(sex);
    setTimeout(() => setTouchFeedback(null), 200);
    // Clear error message on selection
    if (errorMessage) setErrorMessage("");
  };

  const handleSexTouchStart = (item) => {
    setTouchFeedback(item);
  };

  const handleSexTouchEnd = () => {
    setTimeout(() => setTouchFeedback(null), 150);
  };

  const getButtonText = () => {
    if (currentStep === 2) return "Continue to Account Setup";
    return "Continue";
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName.trim() && formData.lastName.trim();
      case 1:
        // Allow if age > 15
        return formData.age && parseInt(formData.age, 10) > 15 && parseInt(formData.age, 10) <= 99;
      case 2:
        return formData.sex !== "";
      default:
        return false;
    }
  };

  // Updated alphabet keys without number row
  const alphabetKeys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
    ["Space"],
  ];

  const symbolKeys = [
    ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
    ["-", "_", "+", "=", "{", "}", "[", "]", "|"],
    [".", ",", "?", "!", "'", '"', ":", ";", "Del"],
    ["ABC", "~", "`", "\\", "/", "Space"],
  ];

  const keyboardKeys = showSymbols ? symbolKeys : alphabetKeys;

  /* =================================================================================
     REMOTE DEVICE UI (Laptop/Phone)
     ================================================================================= */
  if (!isLocalDevice()) {
    return (
      <Container fluid className="p-3 bg-light min-vh-100 d-flex flex-column" style={{ overflowY: 'auto' }}>
        <div className="w-100 bg-white p-4 rounded-4 shadow-sm" style={{ maxWidth: '500px', margin: '0 auto' }}>

          <div className="text-center mb-4">
            <h2 className="fw-bold text-dark">{steps[currentStep].title}</h2>
            <p className="text-muted">{steps[currentStep].subtitle}</p>
          </div>

          {errorMessage && (
            <div className="alert alert-danger mb-4 rounded-3 border-0 bg-danger bg-opacity-10 text-danger fw-bold">
              ⚠️ {errorMessage}
            </div>
          )}

          <Form onSubmit={(e) => { e.preventDefault(); handleContinue(); }}>

            {/* Step 0: Name */}
            {currentStep === 0 && (
              <>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">First Name</Form.Label>
                  <Form.Control
                    size="lg"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    placeholder="Enter First Name"
                    autoFocus
                    className="rounded-3"
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label className="fw-bold">Last Name</Form.Label>
                  <Form.Control
                    size="lg"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    placeholder="Enter Last Name"
                    className="rounded-3"
                  />
                </Form.Group>
              </>
            )}

            {/* Step 1: Birthday */}
            {currentStep === 1 && (
              <Form.Group className="mb-3">
                <Form.Label className="fw-bold">Date of Birth</Form.Label>
                <Form.Control
                  size="lg"
                  type="date"
                  value={formData.birthYear && formData.birthMonth && formData.birthDay
                    ? `${formData.birthYear}-${String(formData.birthMonth).padStart(2, '0')}-${String(formData.birthDay).padStart(2, '0')}`
                    : ''}
                  onChange={(e) => {
                    const dateVal = e.target.value;
                    if (dateVal) {
                      const [y, m, d] = dateVal.split('-');
                      const year = parseInt(y);
                      const month = parseInt(m);
                      const day = parseInt(d);
                      const calculatedAge = calculateAgeFromBirthday(year, month, day);

                      setFormData(prev => ({
                        ...prev,
                        birthYear: year,
                        birthMonth: month,
                        birthDay: day,
                        age: calculatedAge.toString()
                      }));
                    }
                  }}
                  className="rounded-3"
                />
                <Form.Text className="text-muted">
                  Your age will be automatically calculated.
                </Form.Text>
              </Form.Group>
            )}

            {/* Step 2: Sex */}
            {currentStep === 2 && (
              <Row className="g-3">
                <Col xs={6}>
                  <div
                    onClick={() => handleSexSelect('Male')}
                    className={`p-3 border-2 rounded-3 text-center cursor-pointer transition-all ${formData.sex === 'Male' ? 'border-primary bg-light' : 'border-light'}`}
                    style={{ cursor: 'pointer', borderStyle: 'solid' }}
                  >
                    <img src={maleIcon} alt="Male" style={{ width: 60, height: 60, marginBottom: 10 }} />
                    <div className="fw-bold">Male</div>
                  </div>
                </Col>
                <Col xs={6}>
                  <div
                    onClick={() => handleSexSelect('Female')}
                    className={`p-3 border-2 rounded-3 text-center cursor-pointer transition-all ${formData.sex === 'Female' ? 'border-primary bg-light' : 'border-light'}`}
                    style={{ cursor: 'pointer', borderStyle: 'solid' }}
                  >
                    <img src={femaleIcon} alt="Female" style={{ width: 60, height: 60, marginBottom: 10 }} />
                    <div className="fw-bold">Female</div>
                  </div>
                </Col>
              </Row>
            )}

            <div className="d-grid gap-2 mt-4 pt-2">
              <Button
                variant="danger"
                size="lg"
                type="submit"
                className="rounded-3 fw-bold"
              >
                {currentStep === 2 ? "Complete Setup" : "Next Step"}
              </Button>

              <Button
                variant="light"
                size="lg"
                type="button"
                onClick={handleBack}
                className="rounded-3 text-muted"
                disabled={currentStep === 0 && false /* Allow going back to previous page? handleBack handles it */}
              >
                Back
              </Button>
            </div>

            <div className="text-center mt-3 text-muted small">
              Step {currentStep + 1} of 3
            </div>

          </Form>
        </div>
      </Container>
    );
  }

  return (
    <div className={isLocalDevice() ? "register-personal-container" : "register-personal-container-remote"}>
      <div className={`register-personal-content ${currentStep === 0 ? 'name-step-mode' : ''}`}>
        {/* Progress Steps - Moved outside main area to prevent cropping */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={index} className={`progress-step ${currentStep === index ? 'active' : currentStep > index ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > index ? '✓' : index + 1}
              </div>
              <span className="step-label">{step.label}</span>
            </div>
          ))}
        </div>

        {/* Back Arrow Button */}
        <button className="close-button" onClick={handleBack}>
          ←
        </button>

        <div className="register-main-area">
          {/* Image */}
          {steps[currentStep].image && (
            <div className="register-image-section">
              <img
                src={steps[currentStep].image}
                alt={steps[currentStep].label}
                className="register-step-image"
              />
            </div>
          )}

          {/* Header */}
          <div className="register-personal-header">
            <h1 className="register-personal-title">{steps[currentStep].title}</h1>
            <p className="register-personal-subtitle">{steps[currentStep].subtitle}</p>
          </div>

          {/* Step Content */}
          <div className="form-container">
            {currentStep === 0 && (
              <div className="form-phase active">
                <div className="form-groups">
                  <div className="form-group">
                    <label htmlFor="firstName" className="form-label">
                      First Name
                    </label>
                    <input
                      ref={firstNameInputRef}
                      id="firstName"
                      type="text"
                      className={`form-input ${activeInput === 'first' ? 'active' : ''} ${fieldErrors.firstName ? 'error' : ''}`}
                      placeholder="Juan"
                      value={getDisplayValue(formData.firstName, 'first')}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\|/g, '');
                        // Smart Backspace for Remote
                        if (!isLocalDevice() && activeInput === 'first' && showCursor) {
                          if (val === formData.firstName && e.target.value.length < (formData.firstName.length + 1)) {
                            val = val.slice(0, -1);
                          }
                        }
                        setFormData(prev => ({ ...prev, firstName: val }));
                        // Clear error if valid
                        if (val.trim().length > 0 && fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: false }));
                      }}
                      onFocus={(e) => {
                        if (isLocalDevice()) {
                          e.preventDefault();
                          e.target.blur();
                        }
                        setActiveInput("first");
                        // Smart Shift: Activate if empty or ends in space
                        const val = formData.firstName;
                        setIsShift(val.length === 0 || val.slice(-1) === ' ');
                        if (fieldErrors.firstName) setFieldErrors(prev => ({ ...prev, firstName: false }));
                      }}
                      readOnly={isLocalDevice()}
                      inputMode={isLocalDevice() ? "none" : "text"}
                      autoComplete="off"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="lastName" className="form-label">
                      Last Name
                    </label>
                    <input
                      ref={lastNameInputRef}
                      id="lastName"
                      type="text"
                      className={`form-input ${activeInput === 'last' ? 'active' : ''} ${fieldErrors.lastName ? 'error' : ''}`}
                      placeholder="Dela Cruz"
                      value={getDisplayValue(formData.lastName, 'last')}
                      onChange={(e) => {
                        let val = e.target.value.replace(/\|/g, '');
                        // Smart Backspace for Remote
                        if (!isLocalDevice() && activeInput === 'last' && showCursor) {
                          if (val === formData.lastName && e.target.value.length < (formData.lastName.length + 1)) {
                            val = val.slice(0, -1);
                          }
                        }
                        setFormData(prev => ({ ...prev, lastName: val }));
                        // Clear error if valid
                        if (val.trim().length > 0 && fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: false }));
                      }}
                      onFocus={(e) => {
                        if (isLocalDevice()) {
                          e.preventDefault();
                          e.target.blur();
                        }
                        setActiveInput("last");
                        // Smart Shift: Activate if empty or ends in space
                        const val = formData.lastName;
                        setIsShift(val.length === 0 || val.slice(-1) === ' ');
                        if (fieldErrors.lastName) setFieldErrors(prev => ({ ...prev, lastName: false }));
                      }}
                      readOnly={isLocalDevice()}
                      inputMode={isLocalDevice() ? "none" : "text"}
                      autoComplete="off"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="form-phase active">
                <div className="form-groups">
                  <div className="form-group full-width">
                    <label className="form-label">Select Your Birthday</label>
                    <p className="scroll-instruction">Scroll to select</p>
                    <div className="birthday-selector">
                      <div className="birthday-inputs">
                        <div className="birthday-column">
                          <label className="birthday-label">Month</label>
                          <div
                            className="birthday-scroll month-scroll"
                            ref={monthScrollRef}
                            onScroll={() => handleInfiniteScroll(monthScrollRef, MONTHS_COUNT)}
                          >
                            {/* Render 3 sets of months for infinite effect */}
                            {[0, 1, 2].map((setIndex) => (
                              <React.Fragment key={`month-set-${setIndex}`}>
                                {Array.from({ length: 12 }, (_, i) => (
                                  <div
                                    key={`month-${setIndex}-${i}`}
                                    className={`birthday-option ${formData.birthMonth === i + 1 ? 'selected' : ''}`}
                                    onClick={() => handleBirthdaySelect('month', i + 1)}
                                  >
                                    {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                                  </div>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div className="birthday-column">
                          <label className="birthday-label">Day</label>
                          <div
                            className="birthday-scroll day-scroll"
                            ref={dayScrollRef}
                            onScroll={() => handleInfiniteScroll(dayScrollRef, daysInMonth)}
                          >
                            {/* Render 3 sets of days for infinite effect */}
                            {[0, 1, 2].map((setIndex) => (
                              <React.Fragment key={`day-set-${setIndex}`}>
                                {Array.from({ length: daysInMonth }, (_, i) => (
                                  <div
                                    key={`day-${setIndex}-${i}`}
                                    className={`birthday-option ${formData.birthDay === i + 1 ? 'selected' : ''}`}
                                    onClick={() => handleBirthdaySelect('day', i + 1)}
                                  >
                                    {i + 1}
                                  </div>
                                ))}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>

                        <div className="birthday-column">
                          <label className="birthday-label">Year</label>
                          <div className="birthday-scroll year-scroll" ref={yearScrollRef}>
                            {Array.from({ length: 100 }, (_, i) => {
                              // Minimum age 5 years: Start year is Current - 5
                              const year = (new Date().getFullYear() - 5) - i;
                              return (
                                <div
                                  key={year}
                                  className={`birthday-option ${formData.birthYear === year ? 'selected' : ''}`}
                                  onClick={() => handleBirthdaySelect('year', year)}
                                >
                                  {year}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="age-display-section">
                        <div className="age-result">
                          <span className="age-label">Your Age:</span>
                          <div className="age-value">
                            {calculateAge() > 0 ? calculateAge() : '--'}
                          </div>
                        </div>
                        {formData.birthMonth && formData.birthDay && formData.birthYear && (
                          <div className="birthday-confirmation">
                            <span className="birthday-text">
                              Born on {new Date(formData.birthYear, formData.birthMonth - 1, formData.birthDay).toLocaleDateString('en-US', {
                                month: 'long',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="form-phase active">
                <div className="form-groups">
                  <div className="form-group full-width">
                    <label className="form-label">Biological Sex</label>
                    <div className="sex-selection">
                      <div
                        className={`sex-option ${formData.sex === "male" ? "selected" : ""} ${touchFeedback === "male" ? "touch-feedback" : ""}`}
                        onClick={() => handleSexSelect("male")}
                        onTouchStart={() => handleSexTouchStart("male")}
                        onTouchEnd={handleSexTouchEnd}
                      >
                        <div className="role-card-icon">
                          <img src={maleIcon} alt="Male" />
                        </div>
                        <span>Male</span>
                      </div>
                      <div
                        className={`sex-option ${formData.sex === "female" ? "selected" : ""} ${touchFeedback === "female" ? "touch-feedback" : ""}`}
                        onClick={() => handleSexSelect("female")}
                        onTouchStart={() => handleSexTouchStart("female")}
                        onTouchEnd={handleSexTouchEnd}
                      >
                        <div className="role-card-icon">
                          <img src={femaleIcon} alt="Female" />
                        </div>
                        <span>Female</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="register-disclaimer">
                  <p>
                    We ask for your biological sex to provide accurate BMI calculations and health assessments.
                    This information will not be shared publicly.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="inline-error-message">
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Navigation Buttons - UPDATED STACKED LAYOUT */}
          <div className="form-navigation">
            <button
              className={`nav-button ${currentStep === 2 ? "submit-button" : "next-button"} ${!isStepValid() ? "disabled" : ""}`}
              onClick={handleContinue}
              disabled={!isStepValid()}
            >
              {getButtonText()}
              {isStepValid() && <span className="button-arrow">→</span>}
            </button>
          </div>
        </div>

        {/* Input Methods - Keyboard only for Name step and local device */}
        {currentStep === 0 && isLocalDevice() && (
          <div className="register-keyboard">
            {keyboardKeys.map((row, rowIndex) => (
              <div key={rowIndex} className="register-keyboard-row">
                {row.map((key) => (
                  <button
                    key={key}
                    className={`register-keyboard-key ${key === "↑" && isShift ? "active" : ""
                      } ${key === "Sym" && showSymbols ? "active" : ""
                      } ${key === "Del" ? "delete-key" : ""
                      } ${key === "Space" ? "space-key" : ""
                      } ${key === "↑" ? "shift-key" : ""
                      } ${key === "Sym" || key === "ABC" ? "symbols-key" : ""
                      }`}
                    onClick={() => handleKeyboardPress(key)}
                  >
                    {key === "↑" ? "SHIFT" :
                      key === "Del" ? "DELETE" :
                        key === "Space" ? "SPACE" :
                          key === "Sym" ? "SYMBOLS" :
                            key === "ABC" ? "ABC" : key}
                  </button>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Exit Confirmation Modal - Glassmorphism Style */}
      {showExitModal && (
        <div className="exit-modal-overlay">
          <motion.div
            className="exit-modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="exit-modal-icon">
              <span>⚠️</span>
            </div>
            <h2 className="exit-modal-title">Navigate Back?</h2>
            <p className="exit-modal-message">
              If you exit, your progress will not be saved. Do you want to go back to the previous step or exit completely?
            </p>
            <div className="exit-modal-buttons">
              <button className="exit-modal-button secondary" onClick={handleBackOneStep}>
                Go Back One Step
              </button>
              <button className="exit-modal-button primary" onClick={confirmExit}>
                Exit Registration
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Age Warning Modal */}
      <Modal
        show={showAgeWarningModal}
        onHide={() => setShowAgeWarningModal(false)}
        centered
        className="exit-modal"
      >
        <Modal.Header closeButton style={{ borderBottom: 'none', padding: '20px 25px 10px' }}>
          <Modal.Title style={{ fontWeight: '700', color: '#dc2626' }}>Age Restriction</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ padding: '10px 25px 20px', fontSize: '1.2rem', color: '#333' }}>
          <p>For users <strong>15 years old and below</strong>, please ask for guidance from our medical personnel before proceeding.</p>
        </Modal.Body>
        <Modal.Footer style={{ borderTop: 'none', padding: '0 25px 25px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <Button
            variant="secondary"
            onClick={() => {
              setShowAgeWarningModal(false);
              // Reset all birthday fields to default
              setFormData(prev => ({ ...prev, birthMonth: null, birthDay: null, birthYear: null, age: "" }));
            }}
            style={{
              backgroundColor: '#f1f3f5',
              border: 'none',
              color: '#333',
              fontWeight: '600',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '1rem',
              flex: 1
            }}
          >
            Retry
          </Button>
          <Button
            variant="danger"
            onClick={() => navigate('/login')}
            style={{
              backgroundColor: '#dc2626',
              border: 'none',
              fontWeight: '600',
              padding: '12px 20px',
              borderRadius: '12px',
              fontSize: '1rem',
              flex: 1
            }}
          >
            Understood
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Duplicate Personal Info Popup Modal - Modern Style */}
      {showDuplicateModal && (
        <div className="duplicate-rfid-overlay" onClick={() => setShowDuplicateModal(false)}>
          <motion.div
            className="duplicate-rfid-modal"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="duplicate-modal-icon">
              <span>⚠️</span>
            </div>
            <h2 className="duplicate-modal-title">{duplicateModalTitle}</h2>
            <p className="duplicate-modal-message">{duplicateModalMessage}</p>
            <div style={{ display: 'flex', gap: '12px', width: '100%', justifyContent: 'center' }}>
              <button
                className="duplicate-modal-button"
                style={{ flex: 1, maxWidth: '180px' }}
                onClick={() => setShowDuplicateModal(false)}
              >
                Try Again
              </button>
              <button
                className="duplicate-modal-button"
                style={{
                  flex: 1,
                  maxWidth: '180px',
                  background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
                  boxShadow: '0 8px 25px rgba(55, 65, 81, 0.4)'
                }}
                onClick={() => navigate('/login')}
              >
                Go to Login
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}