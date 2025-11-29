import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./RegisterTapID.css";
import logo from "../../../assets/images/logo.png";

export default function RegisterTapID() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    idNumber: "",
    password: "",
    email: "",
    mobile: "09",
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
  const [rfidCode, setRfidCode] = useState("");
  const [isCardTapped, setIsCardTapped] = useState(false);

  const idNumberInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const mobileInputRef = useRef(null);
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
  const personalInfo = location.state?.personalInfo || {};
  const isEmployee = userType === "rtu-employees";

  const steps = [
    {
      title: isEmployee ? "Enter Employee Number" : "Enter Student Number",
      subtitle: isEmployee
        ? "Your official RTU employee identification number"
        : "Your official RTU student identification number",
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
    return isEmployee ? "e.g., 2023-001" : "e.g., 2022-200901";
  };

  // Get input label based on user type
  const getIdNumberLabel = () => {
    return isEmployee ? "Employee Number" : "Student Number";
  };

  // Auto-focus inputs when step changes
  useEffect(() => {
    setErrorMessage(""); // Clear errors on step change
    if (currentStep === 0 && idNumberInputRef.current) {
      setTimeout(() => idNumberInputRef.current.focus(), 300);
    } else if (currentStep === 1 && emailInputRef.current) {
      setTimeout(() => emailInputRef.current.focus(), 300);
    }
  }, [currentStep]);

  // Process RFID scan data
  const processRfidScan = async (rfidData) => {
    console.log('🎫 RFID Card Detected (RAW):', rfidData);

    setIsCardTapped(true);
    setScannerStatus("reading");
    setIsScanning(true);
    setScanProgress(30); // Start at 30% immediately
    setErrorMessage(""); // Clear previous errors

    try {
      // FAST Step 1: Card detection and reading (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      setScanProgress(60);

      // USE EXACT RFID DATA - NO MODIFICATIONS, NO PREFIX, NO SLICING
      const generatedRFID = rfidData; // Use the exact data from scanner
      setRfidCode(generatedRFID);

      // FAST Step 2: Writing user data to card (400ms)
      setScannerStatus("processing");
      await new Promise(resolve => setTimeout(resolve, 400));
      setScanProgress(85);

      // FAST Step 3: Verification and finalization (300ms)
      await new Promise(resolve => setTimeout(resolve, 300));
      setScanProgress(100);
      setScannerStatus("success");

      completeIDRegistration(generatedRFID);

    } catch (err) {
      console.error('RFID registration error:', err);
      setScannerStatus("error");
      setErrorMessage("RFID registration failed. Please try again.");
      setIsScanning(false);
      setIsCardTapped(false);
    }
  };

  // Complete the registration process
  const completeIDRegistration = (rfidCode) => {
    console.log("✅ ID Registration completed!");
    setIsScanning(false);
    setIdRegistered(true);

    const currentState = stateRef.current;

    // Prepare ALL registration data to pass to RegisterDataSaved
    const completeRegistrationData = {
      userType: currentState.userType,
      personalInfo: currentState.personalInfo,
      idNumber: currentState.formData.idNumber,
      password: currentState.formData.password,
      email: currentState.formData.email,
      mobile: currentState.formData.mobile,
      rfidCode: rfidCode, // EXACT RFID DATA - NO MODIFICATIONS
      registrationDate: new Date().toISOString()
    };

    console.log('📦 Passing complete data to RegisterDataSaved:', completeRegistrationData);

    // Navigate to data saved screen with ALL registration data
    setTimeout(() => {
      navigate("/register/saved", {
        state: completeRegistrationData
      });
    }, 1500); // Faster redirect
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
  }, []); // Empty dependency array because we use stateRef

  // Manage RFID Scanner Listener
  useEffect(() => {
    if (currentStep === 2) {
      console.log('🔔 RFID Scanner Active - Ready to accept ID cards');
      document.addEventListener('keydown', handleGlobalKeyDown);

      // Auto-focus on hidden RFID input
      setTimeout(() => {
        if (rfidInputRef.current) {
          rfidInputRef.current.focus();
        }
      }, 500);

      return () => {
        console.log('🔕 RFID Scanner Deactivated');
        document.removeEventListener('keydown', handleGlobalKeyDown);
      };
    }
  }, [currentStep, handleGlobalKeyDown]);

  const handleContinue = () => {
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
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!validateEmail(formData.email)) {
        setErrorMessage("Please enter a valid email address");
        return;
      }
      if (!validateMobile(formData.mobile)) {
        setErrorMessage("Please enter a valid Philippine mobile number (09XXXXXXXXX)");
        return;
      }
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigate(-1);
    }
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

  const validateMobile = (mobile) => {
    const mobileRegex = /^09\d{9}$/;
    return mobileRegex.test(mobile.replace(/\s/g, ''));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errorMessage) setErrorMessage(""); // Clear error on input
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const formatMobileNumber = (value) => {
    let cleaned = value.replace(/\D/g, '');

    if (!cleaned.startsWith('09')) {
      cleaned = '09' + cleaned.replace(/^09/, '');
    }

    cleaned = cleaned.slice(0, 11);

    if (cleaned.length > 4) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return cleaned;
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
        setFormData(prev => ({ ...prev, mobile: formatMobileNumber(prev.mobile.replace(/\s/g, '').slice(0, -1)) }));
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
        setFormData(prev => ({ ...prev, mobile: formatMobileNumber(prev.mobile.replace(/\s/g, '') + " ") }));
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
        setFormData(prev => ({
          ...prev,
          mobile: formatMobileNumber(applyFormatting(prev.mobile.replace(/\s/g, ''), key))
        }));
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
        return validateEmail(formData.email) && validateMobile(formData.mobile);
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

  const getScannerStatusText = () => {
    switch (scannerStatus) {
      case "ready":
        return "Scanner Ready - Tap Your ID Card";
      case "active":
        return "Scanner Ready - Tap Your ID Card";
      case "reading":
        return "Reading ID Card...";
      case "processing":
        return "Writing Data to Card...";
      case "success":
        return "Registration Complete!";
      case "error":
        return "Scan Failed - Try Again";
      default:
        return "Scanner Ready";
    }
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
    ["ABC", "~", "`", "\\", "/", "Space"],
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
        autoFocus
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
                {step.type === 'idNumber' ? (isEmployee ? 'Emp ID' : 'Stud ID') :
                  step.type === 'contact' ? 'Contact' : 'ID Tap'}
              </span>
            </div>
          ))}
        </div>

        <div className="register-main-area">
          {/* Image Section - Only show when keyboard is NOT present (Step 2) */}
          {currentStep === 2 && (
            <div className="register-image-section">
              <img
                src={logo}
                alt="Registration Step"
                className="register-step-image"
              />
            </div>
          )}

          {/* Header */}
          <div className="register-tapid-header">
            <h1 className="register-tapid-title">{steps[currentStep].title}</h1>
            <p className="register-tapid-subtitle">{steps[currentStep].subtitle}</p>
          </div>

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
                      Numbers and hyphens only (e.g., {isEmployee ? "2023-001" : "2022-200901"})
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="password" className="form-label">
                      Create Password
                    </label>
                    <div className="password-input-container">
                      <input
                        ref={passwordInputRef}
                        id="password"
                        type={showPassword ? "text" : "password"}
                        className={`form-input ${activeInput === 'password' ? 'active' : ''} ${formData.password.length >= 10 ? 'max-length' : ''}`}
                        placeholder="Enter 6-10 characters"
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
                        className="password-toggle"
                        onClick={togglePasswordVisibility}
                      >
                        {showPassword ? "👁️" : "👁️‍🗨️"}
                      </button>
                    </div>
                    <div className="password-guidelines">
                      <span className="guideline-text">
                        {formData.password.length > 0 ? `${formData.password.length}/10 characters` : '6-10 characters'}
                      </span>
                    </div>
                  </div>

                  <div className="security-note">
                    <div className="security-icon">🎓</div>
                    <p>
                      {isEmployee
                        ? "Your employee number will be used for official identification and record keeping."
                        : "Your student number will be used for official identification and academic records."
                      }
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
                      placeholder="juan.delacruz@rtu.edu.ph"
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
                  </div>

                  <div className="form-group">
                    <label htmlFor="mobile" className="form-label">
                      Mobile Number
                    </label>
                    <input
                      ref={mobileInputRef}
                      id="mobile"
                      type="tel"
                      className={`form-input ${activeInput === 'mobile' ? 'active' : ''}`}
                      placeholder="0912 345 6789"
                      value={formData.mobile}
                      onChange={(e) => handleInputChange('mobile', e.target.value)}
                      onFocus={() => {
                        if (mobileInputRef.current) mobileInputRef.current.blur();
                        handleInputFocus("mobile");
                      }}
                      autoComplete="off"
                      readOnly
                      inputMode="none"
                    />
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

            {/* Step 3: RFID Registration */}
            {currentStep === 2 && (
              <div className="form-phase active">
                <div className="rfid-registration-section">
                  <motion.div
                    className="rfid-scanner-container"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                  >
                    {/* Scanner Visual */}
                    <div className={`rfid-scanner-visual ${isScanning ? 'scanning' : ''} ${idRegistered ? 'success' : ''}`}>
                      <motion.div
                        className="scanner-ring ring-1"
                        animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      />
                      <motion.div
                        className="scanner-ring ring-2"
                        animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0, 0.3] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
                      />
                      <div className="scanner-core">
                        <motion.div
                          animate={isScanning ? { rotate: 360 } : { rotate: 0 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <div className="scanner-icon">
                            {idRegistered ? "✅" : "📡"}
                          </div>
                        </motion.div>
                      </div>
                      {isScanning && (
                        <motion.div
                          className="scanner-beam"
                          initial={{ top: "0%" }}
                          animate={{ top: "100%" }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                        />
                      )}
                    </div>

                    {/* Status Text */}
                    <motion.div
                      className="rfid-status-text"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                    >
                      <h3>{getScannerStatusText()}</h3>
                      <p>
                        {idRegistered
                          ? "Your ID has been successfully registered!"
                          : "Place your ID card near the scanner to register it."}
                      </p>
                    </motion.div>

                    {/* Progress Bar */}
                    {isScanning && (
                      <motion.div
                        className="scan-progress-container-modern"
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "100%" }}
                      >
                        <div className="progress-label">
                          <span>Processing...</span>
                          <span>{scanProgress}%</span>
                        </div>
                        <div className="progress-track">
                          <motion.div
                            className="progress-fill"
                            initial={{ width: 0 }}
                            animate={{ width: `${scanProgress}%` }}
                            transition={{ type: "spring", stiffness: 50 }}
                          />
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className={`form-navigation ${currentStep > 0 ? 'dual-buttons' : 'single-button'}`}>
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

            {currentStep > 0 && !idRegistered && (
              <button className="nav-button back-button" onClick={handleBack}>
                ← Back
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
    </div>
  );
}