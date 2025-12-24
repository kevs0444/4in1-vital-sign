import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

import { motion } from "framer-motion";
import { Visibility, VisibilityOff } from '@mui/icons-material';
import "./RegisterTapID.css";
import "./TapIDCardStyles.css";
import tapIdImage from "../../../assets/icons/tap-id-icon.png";

export default function RegisterTapID() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    idNumber: "",
    password: "",
    email: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isShift, setIsShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeInput, setActiveInput] = useState("idNumber");
  const [errorMessage, setErrorMessage] = useState("");
  const [idRegistered, setIdRegistered] = useState(false);
  const [scannerStatus, setScannerStatus] = useState("ready");
  // const [rfidCode, setRfidCode] = useState("");
  // const [isCardTapped, setIsCardTapped] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateRfidMessage, setDuplicateRfidMessage] = useState("");
  const [duplicateModalTitle, setDuplicateModalTitle] = useState("Already Registered");
  const [showNoIdModal, setShowNoIdModal] = useState(false);

  const idNumberInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const rfidInputRef = useRef(null);
  const rfidDataRef = useRef('');
  const rfidTimeoutRef = useRef(null);

  // Use a ref to track state for the event listener to avoid stale closures
  const stateRef = useRef({
    isScanning,
    idRegistered,
    currentStep,
    formData,
    userType: location.state?.userType || "rtu-students",
    personalInfo: location.state?.personalInfo || {}
  });

  // Update state ref whenever relevant state changes
  useEffect(() => {
    stateRef.current = {
      isScanning,
      idRegistered,
      currentStep,
      formData,
      userType: location.state?.userType || "rtu-students",
      personalInfo: location.state?.personalInfo || {}
    };
  }, [isScanning, idRegistered, currentStep, formData, location.state]);

  const userType = location.state?.userType || "rtu-students";

  const getRoleSettings = (type) => {
    switch (type) {
      case 'nurse':
      case 'doctor':
        return {
          title: "Enter ID / License Number",
          subtitle: "Your official medical license or identification number",
          label: "ID / License Number",
          placeholder: "e.g., 1234-5678",
          shortLabel: "ID/Lic",
          securityNote: "Your ID or license number will be used for professional verification.",
          hint: "Numbers and hyphens only",
          duplicateTitle: "ID Number Already Registered",
          duplicateMessage: "This ID number is already registered. Please use a different number."
        };
      case 'rtu-employees':
        return {
          title: "Enter Employee Number",
          subtitle: "Your official RTU employee identification number",
          label: "Employee Number",
          placeholder: "e.g., 2023-001",
          shortLabel: "Emp ID",
          securityNote: "Your employee number will be used for official identification and record keeping.",
          hint: "Numbers and hyphens only (e.g., 2023-001)",
          duplicateTitle: "Employee Number Already Registered",
          duplicateMessage: "This employee number is already registered. Please use a different number or contact support."
        };
      case 'rtu-students':
      default:
        return {
          title: "Enter Student Number",
          subtitle: "Your official RTU student identification number",
          label: "Student Number",
          placeholder: "e.g., 2022-200901",
          shortLabel: "Stud ID",
          securityNote: "Your student number will be used for official identification and academic records.",
          hint: "Numbers and hyphens only (e.g., 2022-200901)",
          duplicateTitle: "Student Number Already Registered",
          duplicateMessage: "This student number is already registered. Please use a different number or contact support."
        };
    }
  };

  const roleSettings = getRoleSettings(userType);

  const steps = [
    {
      title: roleSettings.title,
      subtitle: roleSettings.subtitle,
      type: "idNumber"
    },
    {
      title: "Contact Information",
      subtitle: "We'll use these for important updates and account recovery",
      type: "contact"
    },
    {
      title: "Register your ID",
      subtitle: "RFID scanner is active - Tap your ID card anytime",
      type: "id"
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
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);

      if (rfidTimeoutRef.current) {
        clearTimeout(rfidTimeoutRef.current);
      }
    };
  }, []);

  // Get placeholder based on user type
  const getIdNumberPlaceholder = () => {
    return roleSettings.placeholder;
  };

  // Get input label based on user type
  const getIdNumberLabel = () => {
    return roleSettings.label;
  };

  // Auto-focus email input when reaching contact step
  useEffect(() => {
    setErrorMessage(""); // Clear errors on step change

    // Auto-focus email input when on contact info step (step 1)
    if (currentStep === 1) {
      setActiveInput("email"); // Set email as active input for virtual keyboard
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (emailInputRef.current) {
          emailInputRef.current.focus();
        }
      }, 100);
    }
  }, [currentStep]);

  // Process RFID scan data
  const processRfidScan = async (rfidData) => {
    console.log('🎫 RFID Card Detected (RAW):', rfidData);

    // setIsCardTapped(true);
    setScannerStatus("reading");
    setIsScanning(true);
    setScanProgress(20); // Start at 20%
    setErrorMessage(""); // Clear previous errors

    try {
      // Step 1: Card detection and reading (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      setScanProgress(40);

      // USE EXACT RFID DATA - NO MODIFICATIONS, NO PREFIX, NO SLICING
      const generatedRFID = rfidData; // Use the exact data from scanner


      // Step 2: Check if RFID already exists in database
      setScannerStatus("processing");
      console.log('🔍 Checking for duplicate RFID:', generatedRFID);

      try {
        const checkResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/login/check-rfid/${encodeURIComponent(generatedRFID)}`);
        const checkResult = await checkResponse.json();

        if (checkResult.exists) {
          // RFID already registered - show popup modal and reset
          console.log('❌ RFID already registered:', generatedRFID);
          setScannerStatus("error");
          setDuplicateModalTitle("ID Card Already Registered");
          setDuplicateRfidMessage("This ID card is already registered to another user. Please use a different ID card.");
          setShowDuplicateModal(true);
          setIsScanning(false);
          // setIsCardTapped(false);
          setScanProgress(0);
          return; // Stop the registration process
        }

        console.log('✅ RFID is unique, proceeding with registration');
      } catch (checkError) {
        console.error('Error checking RFID:', checkError);
        // If check fails, proceed anyway but log warning
        console.warn('⚠️ Could not verify RFID uniqueness, proceeding with registration');
      }

      setScanProgress(70);

      // Step 3: Verification and finalization (400ms)
      await new Promise(resolve => setTimeout(resolve, 400));
      setScanProgress(100);
      setScannerStatus("success");

      completeIDRegistration(generatedRFID);

    } catch (err) {
      console.error('RFID registration error:', err);
      setScannerStatus("error");
      setErrorMessage("RFID registration failed. Please try again.");
      setIsScanning(false);
      // setIsCardTapped(false);
    }
  };

  // Complete the registration process
  // Complete the registration process
  const completeIDRegistration = (rfidCode) => {
    console.log("✅ ID Registration completed!");
    setIsScanning(false);

    const currentState = stateRef.current;

    // Normalize userType for backend (e.g., 'rtu-employees' -> 'employee')
    let normalizedUserType = currentState.userType;
    if (currentState.userType === 'rtu-employees') normalizedUserType = 'employee';
    if (currentState.userType === 'rtu-students') normalizedUserType = 'student';

    // Prepare ALL registration data to pass to RegisterDataSaved
    const completeRegistrationData = {
      userType: normalizedUserType,
      personalInfo: currentState.personalInfo,
      idNumber: currentState.formData.idNumber,
      password: currentState.formData.password,
      email: currentState.formData.email,
      rfidCode: rfidCode, // EXACT RFID DATA - NO MODIFICATIONS
      registrationDate: new Date().toISOString()
    };

    console.log('📦 Passing complete data to RegisterDataSaved:', completeRegistrationData);

    if (rfidCode) {
      // ✅ RFID CASE: Trigger Success Animation (Green UI)
      setIdRegistered(true);

      // Wait for animation to play before navigating
      setTimeout(() => {
        navigate("/register/saved", {
          state: completeRegistrationData
        });
      }, 1500);
    } else {
      // ⏩ NO RFID CASE: Skip Animation, Navigate Immediately
      navigate("/register/saved", {
        state: completeRegistrationData
      });
    }
  };

  // Handle ALL keyboard input for RFID scanning - STABLE CALLBACK
  const handleGlobalKeyDown = useCallback((e) => {
    const currentState = stateRef.current;

    // Ignore if we're already processing RFID or not on step 2
    if (currentState.isScanning || currentState.idRegistered || currentState.currentStep !== 2) {
      return;
    }

    // RFID scanners typically send numbers/letters followed by Enter
    if (e.key === 'Enter') {
      // Process the accumulated RFID data when Enter is pressed
      if (rfidDataRef.current.length >= 5) { // Minimum RFID length
        processRfidScan(rfidDataRef.current);
        rfidDataRef.current = ''; // Reset buffer
        e.preventDefault();
        return;
      }
    } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
      // Accumulate alphanumeric characters (RFID data)
      rfidDataRef.current += e.key;

      // Auto-detect RFID after certain length (some scanners don't send Enter)
      if (rfidDataRef.current.length >= 8 && !currentState.isScanning) {
        rfidTimeoutRef.current = setTimeout(() => {
          if (rfidDataRef.current.length >= 8) {
            processRfidScan(rfidDataRef.current);
            rfidDataRef.current = '';
          }
        }, 50); // Faster detection
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array because we use stateRef

  // Manage RFID Scanner Listener
  useEffect(() => {
    if (currentStep === 2) {
      console.log('🔔 RFID Scanner Active - Ready to accept ID cards');
      document.addEventListener('keydown', handleGlobalKeyDown);

      // Auto-focus removed to prevent keyboard popup

      return () => {
        console.log('🔕 RFID Scanner Deactivated');
        document.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }
  }, [currentStep, handleGlobalKeyDown]);

  const handleContinue = async () => {
    setErrorMessage("");

    if (currentStep === 0) {
      if (!validateIDNumber(formData.idNumber)) {
        setErrorMessage(`Please enter a valid ${getIdNumberLabel()} (numbers and hyphens only)`);
        return;
      }
      if (!validatePassword(formData.password)) {
        setErrorMessage("Password must be between 6 and 10 characters");
        return;
      }

      // Check for duplicate student/employee number
      try {
        const checkResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/register/check-school-number/${encodeURIComponent(formData.idNumber)}`);
        const checkResult = await checkResponse.json();

        if (checkResult.exists) {
          setDuplicateModalTitle(roleSettings.duplicateTitle);
          setDuplicateRfidMessage(roleSettings.duplicateMessage);
          setShowDuplicateModal(true);
          return;
        }
      } catch (error) {
        console.warn('Could not verify school number uniqueness:', error);
      }

      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!validateEmail(formData.email)) {
        setErrorMessage("Please enter a valid email address");
        return;
      }

      // Check for duplicate email
      try {
        const emailResponse = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/register/check-email/${encodeURIComponent(formData.email)}`);
        const emailResult = await emailResponse.json();

        if (emailResult.exists) {
          setDuplicateModalTitle("Email Already Registered");
          setDuplicateRfidMessage("This email address is already registered. Please use a different email or login with your existing account.");
          setShowDuplicateModal(true);
          return;
        }
      } catch (error) {
        console.warn('Could not verify email uniqueness:', error);
      }



      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    setShowExitModal(true);
  };

  const handleBackOneStep = () => {
    setShowExitModal(false);
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      const currentState = stateRef.current;
      navigate("/register/personal-info", {
        state: {
          step: 2,
          personalInfo: currentState.personalInfo,
          userType: currentState.userType
        }
      });
    }
  };



  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  const handleSkipRfid = () => {
    // Show confirmation modal instead of proceeding immediately
    setShowNoIdModal(true);
  };

  const confirmSkipRfid = () => {
    console.log('⏩ User confirmed skipping RFID registration');
    setShowNoIdModal(false);
    completeIDRegistration(null);
  };

  const validateIDNumber = (idNumber) => {
    // Allow only numbers and hyphens, minimum 3 characters
    const idRegex = /^[0-9-]+$/;
    return idRegex.test(idNumber) && idNumber.trim().length >= 3;
  };

  const validatePassword = (password) => {
    return password.length >= 6 && password.length <= 10;
  };

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage(""); // Clear error on input
  };

  const handleDomainSelect = (domain) => {
    const [username] = formData.email.split('@');
    setFormData(prev => ({ ...prev, email: username + '@' + domain }));
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  };

  const calculatePasswordStrength = (password) => {
    if (!password) return { score: 0, label: "Enter password", color: "#e2e8f0" };

    let score = 0;
    if (password.length > 6) score += 1;
    if (password.length >= 8) score += 1;
    if (/[A-Z]/.test(password)) score += 1;
    if (/[0-9]/.test(password)) score += 1;
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
    if (score <= 4) return { score: 2, label: "Medium", color: "#f59e0b" };
    return { score: 3, label: "Strong", color: "#22c55e" };
  };

  const passwordStrength = calculatePasswordStrength(formData.password);

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleKeyboardPress = (key) => {
    if (key === "↑") {
      setIsShift(!isShift);
      return;
    }

    if (key === "Sym" || key === "ABC") {
      setShowSymbols(!showSymbols);
      return;
    }

    const applyFormatting = (prev, char) => {
      let nextChar = isShift ? char.toUpperCase() : char.toLowerCase();
      setIsShift(false);
      return prev + nextChar;
    };

    if (key === "Del") {
      if (activeInput === "idNumber") {
        setFormData(prev => ({ ...prev, idNumber: prev.idNumber.slice(0, -1) }));
      } else if (activeInput === "password") {
        setFormData(prev => ({ ...prev, password: prev.password.slice(0, -1) }));
      } else if (activeInput === "email") {
        setFormData(prev => ({ ...prev, email: prev.email.slice(0, -1) }));
      } else {
        // Mobile removed
      }
    } else if (key === "Space") {
      if (activeInput === "idNumber") {
        // Don't allow spaces in ID number
        return;
      } else if (activeInput === "password") {
        // Only allow space if password is less than 10 characters
        if (formData.password.length < 10) {
          setFormData(prev => ({ ...prev, password: prev.password + " " }));
        }
      } else if (activeInput === "email") {
        setFormData(prev => ({ ...prev, email: prev.email + " " }));
      } else {
        // Mobile removed
      }
    } else {
      if (activeInput === "idNumber") {
        // Only allow numbers and hyphens for ID number
        if (/^[0-9-]$/.test(key)) {
          setFormData(prev => ({ ...prev, idNumber: prev.idNumber + key }));
        }
      } else if (activeInput === "password") {
        // Only allow input if password is less than 10 characters
        if (formData.password.length < 10) {
          setFormData(prev => ({ ...prev, password: applyFormatting(prev.password, key) }));
        }
      } else if (activeInput === "email") {
        setFormData(prev => ({ ...prev, email: applyFormatting(prev.email, key) }));
      } else {
        // Mobile removed
      }
    }
  };

  const handleInputFocus = (inputType) => {
    setActiveInput(inputType);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return validateIDNumber(formData.idNumber) && validatePassword(formData.password);
      case 1:
        return validateEmail(formData.email);
      case 2:
        return true;
      default:
        return false;
    }
  };

  const getButtonText = () => {
    if (currentStep === 2) return "Waiting for ID Tap...";
    return "Continue";
  };



  const alphabetKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
    ["Sym", "Space", currentStep === 1 ? "@" : "-"]
  ];

  const symbolKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
    ["-", "_", "+", "=", "{", "}", "[", "]", "|"],
    [".", ",", "?", "!", "'", '"', ":", ";", "Del"],
    ["ABC", "~", "Space", "`", "\\", "/"],
  ];

  const keyboardKeys = showSymbols ? symbolKeys : alphabetKeys;

  return (
    <div className="register-tapid-container">
      {/* HIDDEN RFID INPUT - CAPTURES ALL SCANNER INPUT */}
      <input
        ref={rfidInputRef}
        type="text"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '1px',
          height: '1px',
          opacity: 0,
          border: 'none',
          background: 'transparent',
          pointerEvents: 'none'
        }}
        autoComplete="off"
      // autoFocus removed
      />

      {/* Main Content Area - WRAPPED */}
      <div className={`register-tapid-content ${currentStep < 2 ? 'keyboard-visible-mode' : ''}`}>

        {/* Progress Steps - INSIDE MAIN AREA */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={index} className={`progress-step ${currentStep === index ? 'active' : currentStep > index ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > index ? '✓' : index + 4}
              </div>
              <span className="step-label">
                {step.type === 'idNumber' ? roleSettings.shortLabel :
                  step.type === 'contact' ? 'Contact' : 'ID Tap'}
              </span>
            </div>
          ))}
        </div>

        {/* Back Arrow Button */}
        <button className="close-button" onClick={handleBack}>
          ←
        </button>

        <div className="register-main-area">
          {/* Header - Only for Step 0 and 1 */}
          {currentStep !== 2 && (
            <div className="register-tapid-header">
              <h1 className="register-tapid-title">{steps[currentStep].title}</h1>
              <p className="register-tapid-subtitle">{steps[currentStep].subtitle}</p>
            </div>
          )}

          {/* Inline Error Message */}
          {errorMessage && (
            <div className="inline-error-message" style={{
              color: '#dc2626',
              backgroundColor: '#fef2f2',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '15px',
              textAlign: 'center',
              fontWeight: '500',
              border: '1px solid #fecaca'
            }}>
              ⚠️ {errorMessage}
            </div>
          )}

          {/* Step Content */}
          <div className="form-container">
            {/* Step 1: Student/Employee Number & Password */}
            {currentStep === 0 && (
              <div className="form-phase active">
                <div className="form-groups">
                  <div className="form-group">
                    <label htmlFor="idNumber" className="form-label">
                      {getIdNumberLabel()}
                    </label>
                    <input
                      ref={idNumberInputRef}
                      id="idNumber"
                      type="text"
                      className={`form-input ${activeInput === 'idNumber' ? 'active' : ''}`}
                      placeholder={getIdNumberPlaceholder()}
                      value={formData.idNumber}
                      onChange={(e) => handleInputChange('idNumber', e.target.value)}
                      onFocus={() => {
                        if (idNumberInputRef.current) idNumberInputRef.current.blur();
                        handleInputFocus("idNumber");
                      }}
                      autoComplete="off"
                      readOnly
                      inputMode="none"
                    />
                    <div className="input-hint">
                      {roleSettings.hint}
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Create Password
                    </label>
                    <div className="password-input-wrapper">
                      <input
                        ref={passwordInputRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className={`form-input ${activeInput === 'password' ? 'active' : ''} ${formData.password.length >= 10 ? 'max-length' : ''}`}
                        placeholder="Minimum 6 characters"
                        value={formData.password}
                        onChange={(e) => {
                          if (e.target.value.length <= 10) {
                            handleInputChange('password', e.target.value);
                          }
                        }}
                        onFocus={() => {
                          if (passwordInputRef.current) passwordInputRef.current.blur();
                          handleInputFocus("password");
                        }}
                        autoComplete="off"
                        readOnly
                        maxLength={10}
                        inputMode="none"
                      />
                      <button
                        type="button"
                        className="password-toggle-btn"
                        onClick={togglePasswordVisibility}
                        tabIndex="-1"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </button>
                    </div>

                    {/* Password Strength Meter */}
                    {formData.password.length > 0 && (
                      <div className="password-strength-container">
                        <div className="strength-bars">
                          {[1, 2, 3].map((level) => (
                            <div
                              key={level}
                              className="strength-bar"
                              style={{
                                backgroundColor: level <= passwordStrength.score ? passwordStrength.color : '#e2e8f0'
                              }}
                            />
                          ))}
                        </div>
                        <span className="strength-label" style={{ color: passwordStrength.color }}>
                          {passwordStrength.label}
                        </span>
                      </div>
                    )}

                    <div className="password-guidelines">
                      <span className="guideline-text">
                        {formData.password.length > 0
                          ? `${formData.password.length}/10 characters${formData.password.length < 6 ? ' (Minimum 6)' : ''}`
                          : 'Minimum of 6 characters'}
                      </span>
                    </div>
                  </div>

                  <div className="security-note">
                    <div className="security-icon">🎓</div>
                    <p>
                      {roleSettings.securityNote}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Email & SMS */}
            {currentStep === 1 && (
              <div className="form-phase active">
                <div className="form-groups">
                  <div className="form-group">
                    <label htmlFor="email" className="form-label">
                      Email Address
                    </label>
                    <input
                      ref={emailInputRef}
                      id="email"
                      type="email"
                      className={`form-input ${activeInput === 'email' ? 'active' : ''}`}
                      placeholder="juandelacruz@gmail.com"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      onFocus={() => {
                        if (emailInputRef.current) emailInputRef.current.blur();
                        handleInputFocus("email");
                      }}
                      autoComplete="off"
                      readOnly
                      inputMode="none"
                    />
                    {activeInput === 'email' && formData.email.includes('@') && (
                      <div className="email-suggestions">
                        {["gmail.com", "rtu.edu.ph", "yahoo.com", "outlook.com", "icloud.com"].map((domain) => (
                          <button
                            key={domain}
                            type="button"
                            className="email-suggestion-chip"
                            onClick={() => handleDomainSelect(domain)}
                          >
                            {domain}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>



                  <div className="security-note">
                    <div className="security-icon">🔒</div>
                    <p>
                      We'll use these details to send you important health updates and account recovery information.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="form-phase active">

                <div className="tap-id-card-container">

                  {/* Large Icon - EMPHASIZED */}
                  <div className="tap-id-image-wrapper" style={{ background: '#ffffff' }}>
                    <img src={tapIdImage} alt="Tap ID" className="tap-id-main-image" style={{ background: '#ffffff' }} />
                  </div>

                  {/* Title & Subtitle */}
                  <div className="tap-id-text-content">
                    <h1 className="tap-id-title">{steps[currentStep].title}</h1>
                    <p className="tap-id-subtitle">{steps[currentStep].subtitle}</p>
                  </div>

                  {/* Enhanced Animation Wrapper */}
                  <div className="modern-rfid-wrapper">
                    <div className="scanner-stage">

                      {/* Floating Particles */}
                      <div className="particles-container">
                        {[...Array(8)].map((_, i) => (
                          <motion.div
                            key={i}
                            className="floating-particle"
                            animate={{
                              y: [0, -150],
                              opacity: [0, 1, 0],
                              scale: [1, 1.5, 1],
                            }}
                            transition={{
                              duration: 3 + Math.random() * 2,
                              repeat: Infinity,
                              delay: Math.random() * 3,
                              ease: "easeOut"
                            }}
                            style={{
                              left: `${10 + Math.random() * 80}%`,
                              background: i % 2 === 0 ? '#dc2626' : '#f87171'
                            }}
                          />
                        ))}
                      </div>

                      {/* The Scanner Device */}
                      <div className={`modern-scanner-device ${isScanning ? 'active' : ''} ${idRegistered ? 'success' : ''}`}>
                        <div className="scanner-surface">
                          <div className="scanner-emitter">
                            <div className="emitter-light"></div>
                          </div>
                        </div>
                      </div>

                      {/* The Enhanced Virtual ID Card - RED THEME */}
                      <motion.div
                        className={`virtual-id-card ${idRegistered ? 'registered' : ''}`}
                        initial={{ y: -40, rotateX: 20, scale: 0.85 }}
                        animate={
                          isScanning
                            ? {
                              y: 0,
                              rotateX: 0,
                              scale: 1,
                              boxShadow: '0 30px 60px rgba(220, 38, 38, 0.5), 0 0 0 3px rgba(220, 38, 38, 0.4)'
                            }
                            : idRegistered
                              ? {
                                y: -25,
                                rotateX: 0,
                                scale: 1.15,
                                rotateY: 360,
                                boxShadow: '0 35px 70px rgba(34, 197, 94, 0.5), 0 0 0 3px rgba(34, 197, 94, 0.4)'
                              }
                              : {
                                y: -40,
                                rotateX: 20,
                                scale: 0.85,
                                boxShadow: '0 25px 50px rgba(220, 38, 38, 0.4)'
                              }
                        }
                        transition={
                          idRegistered
                            ? { duration: 1.5, ease: "backOut" }
                            : { duration: 0.8, ease: "easeInOut" }
                        }
                        whileHover={!isScanning && !idRegistered ? { y: -35, scale: 0.9 } : {}}
                      >
                        <div className="card-content">
                          <div className="card-header-bar"></div>
                          <div className="card-chip"></div>
                          <div className="card-body-elements">
                            <div className="card-photo-box">
                              <div className="photo-placeholder">
                                <div className="id-scan-line"></div>
                                <div className="id-placeholder-lines">
                                  <div className="id-p-line l1"></div>
                                  <div className="id-p-line l2"></div>
                                  <div className="id-p-line l3"></div>
                                </div>
                              </div>
                            </div>
                            <div className="card-lines-group">
                              <div className="card-line w-100"></div>
                              <div className="card-line w-75"></div>
                              <div className="card-line w-85"></div>
                              <div className="card-line w-60"></div>
                              <div className="card-line w-50"></div>
                            </div>
                          </div>
                          <div style={{
                            position: 'absolute',
                            bottom: '20px',
                            right: '20px',
                            color: 'white',
                            fontSize: '0.8rem',
                            opacity: 0.9,
                            fontWeight: '700',
                            textShadow: '0 1px 2px rgba(0,0,0,0.3)'
                          }}>
                            RTU ID
                          </div>
                          {isScanning && (
                            <motion.div
                              className="scan-laser-beam"
                              animate={{ top: ["0%", "100%"] }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                          )}
                          {idRegistered && (
                            <motion.div
                              className="card-success-badge"
                              initial={{ scale: 0, rotate: -180 }}
                              animate={{ scale: 1, rotate: 0 }}
                              transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 15 }}
                            >
                              ✓
                            </motion.div>
                          )}
                        </div>
                        <motion.div
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'linear-gradient(135deg, transparent 40%, rgba(255,255,255,0.2) 50%, transparent 60%)',
                            opacity: 0,
                          }}
                          animate={{ opacity: [0, 0.5, 0] }}
                          transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                        />
                      </motion.div>
                    </div>

                    {/* Enhanced Status Display */}
                    <div className="modern-status-display">
                      <motion.div
                        key={scannerStatus}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        className="status-content"
                      >
                        <h2 className={`status-title ${scannerStatus}`}>
                          {idRegistered
                            ? "🎉 Registration Complete!"
                            : isScanning
                              ? "🔍 Scanning ID Card..."
                              : "📱 Ready for Tap"}
                        </h2>
                        <p className="status-description">
                          {idRegistered
                            ? "Your ID has been successfully registered and linked to your account."
                            : isScanning
                              ? "Please keep your card steady. Writing data to card..."
                              : "Place your RFID card on the scanner to begin registration process."}
                        </p>
                      </motion.div>

                      {/* Enhanced Progress Bar */}
                      {isScanning && (
                        <div className="modern-progress-wrapper">
                          <div className="progress-value">
                            {scanProgress}% Complete
                          </div>
                          <div className="modern-progress-track">
                            <motion.div
                              className="modern-progress-bar"
                              initial={{ width: 0 }}
                              animate={{ width: `${scanProgress}%` }}
                              transition={{
                                type: "spring",
                                stiffness: 50,
                                damping: 15
                              }}
                            />
                          </div>
                          {/* Messages removed to shorten */}
                          <div style={{
                            fontSize: '1rem',
                            color: '#6b7280',
                            marginTop: '10px',
                            fontWeight: '500'
                          }}>
                            {scanProgress < 30 && "🔍 Detecting card..."}
                            {scanProgress >= 30 && scanProgress < 70 && "📖 Reading card data..."}
                            {scanProgress >= 70 && scanProgress < 100 && "💾 Writing user data..."}
                            {scanProgress === 100 && "✅ Finalizing registration..."}
                          </div>
                        </div>
                      )}

                      {/* Tap Instructions */}
                      {!isScanning && !idRegistered && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.8 }}
                            style={{
                              marginTop: '25px',
                              padding: '18px',
                              background: 'linear-gradient(135deg, #fef2f2, #fecaca)',
                              borderRadius: '14px',
                              border: '2px dashed #f87171'
                            }}
                          >
                            <p style={{
                              margin: 0,
                              color: '#dc2626',
                              fontSize: '1.1rem',
                              fontWeight: '600'
                            }}>
                              💡 <strong>Pro Tip:</strong> Tap your ID card firmly on the scanner for fastest registration
                            </p>
                          </motion.div>

                          {/* No RFID Option - Added here */}
                          <div className="no-rfid-option-container">
                            <button className="no-rfid-link-button" onClick={handleSkipRfid}>
                              I don't have an ID card
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="form-navigation dual-buttons">
            {currentStep < 2 && (
              <button
                className={`nav-button next-button ${!isStepValid() ? "disabled" : ""}`}
                onClick={handleContinue}
                disabled={!isStepValid()}
              >
                {getButtonText()}
                <span className="button-arrow">→</span>
              </button>
            )}
          </div>
        </div>

        {/* Keyboard */}
        {currentStep < 2 && (
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
                      } ${!isNaN(key) && key !== " " ? "number-key" : ""
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

      {/* No RFID Confirmation Modal */}
      {showNoIdModal && (
        <div className="exit-modal-overlay">
          <motion.div
            className="exit-modal-content"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
          >
            <div className="exit-modal-icon">
              <span>❓</span>
            </div>
            <h2 className="exit-modal-title">No School ID?</h2>
            <p className="exit-modal-message">
              Are you sure you want to proceed without registering an RFID card?
              <br /><br />
              Registration without an ID means you won't be able to use the quick-tap feature to log in.
            </p>
            <div className="exit-modal-buttons">
              <button
                className="exit-modal-button secondary"
                onClick={() => setShowNoIdModal(false)}
              >
                Cancel
              </button>
              <button
                className="exit-modal-button primary"
                onClick={confirmSkipRfid}
              >
                Yes, Proceed
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Duplicate RFID Popup Modal - Modern Style */}
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
            <p className="duplicate-modal-message">{duplicateRfidMessage}</p>
            <button
              className="duplicate-modal-button"
              onClick={() => {
                setShowDuplicateModal(false);
                setScannerStatus("ready");
              }}
            >
              {currentStep === 2 ? "Try Another Card" : "Try Different Info"}
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}