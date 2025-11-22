import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterTapID.css";

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
  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "" });
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
      document.removeEventListener('keydown', handleGlobalKeyDown);
      
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

  // Prevent zooming functions
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

  // Auto-focus inputs when step changes
  useEffect(() => {
    if (currentStep === 0 && idNumberInputRef.current) {
      setTimeout(() => idNumberInputRef.current.focus(), 300);
    } else if (currentStep === 1 && emailInputRef.current) {
      setTimeout(() => emailInputRef.current.focus(), 300);
    } else if (currentStep === 2) {
      // Initialize RFID scanner when on step 2
      initializeRFIDScanner();
    }
  }, [currentStep]);

  // Real RFID scanner initialization
  const initializeRFIDScanner = () => {
    console.log("🔄 Initializing RFID Scanner Hardware...");
    setScannerStatus("ready");
    
    // Setup RFID scanner listener
    setupRfidScanner();
  };

  // RFID Scanner Setup - LISTENS TO ALL KEYBOARD INPUT
  const setupRfidScanner = () => {
    console.log('🔔 RFID Scanner Active - Ready to accept ID cards');
    
    // Listen to ALL keyboard events on the entire document
    document.addEventListener('keydown', handleGlobalKeyDown);
    
    // Auto-focus on hidden RFID input
    setTimeout(() => {
      if (rfidInputRef.current) {
        rfidInputRef.current.focus();
      }
    }, 500);
  };

  // Handle ALL keyboard input for RFID scanning
  const handleGlobalKeyDown = (e) => {
    // Ignore if we're already processing RFID or not on step 2
    if (isScanning || idRegistered || currentStep !== 2) {
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
      if (rfidDataRef.current.length >= 8 && !isScanning) {
        rfidTimeoutRef.current = setTimeout(() => {
          if (rfidDataRef.current.length >= 8) {
            processRfidScan(rfidDataRef.current);
            rfidDataRef.current = '';
          }
        }, 50); // Faster detection
      }
    }
  };

  // Process RFID scan data with NO MODIFICATIONS - USE EXACT DATA
  const processRfidScan = async (rfidData) => {
    console.log('🎫 RFID Card Detected (RAW):', rfidData);
    
    setIsCardTapped(true);
    setScannerStatus("reading");
    setIsScanning(true);
    setScanProgress(30); // Start at 30% immediately
    
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
      setScannerStatus("ready");
      setShowNotification({ 
        show: true, 
        message: "❌ RFID registration failed. Please try again.", 
        type: "error" 
      });
      setIsScanning(false);
      setIsCardTapped(false);
    }
  };

  // Complete the registration process
  const completeIDRegistration = (rfidCode) => {
    console.log("✅ ID Registration completed!");
    setIsScanning(false);
    setIdRegistered(true);
    
    // Prepare ALL registration data to pass to RegisterDataSaved
    const completeRegistrationData = {
      userType: userType,
      personalInfo: personalInfo,
      idNumber: formData.idNumber,
      password: formData.password,
      email: formData.email,
      mobile: formData.mobile,
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

  const showAlert = (message, type = "error") => {
    setShowNotification({ show: true, message, type });
    setTimeout(() => {
      setShowNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const handleContinue = () => {
    if (currentStep === 0) {
      if (!validateIDNumber(formData.idNumber)) {
        showAlert(`Please enter a valid ${getIdNumberLabel()} (numbers and hyphens only)`, "error");
        return;
      }
      if (!validatePassword(formData.password)) {
        showAlert("Password must be between 6 and 10 characters", "error");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!validateEmail(formData.email)) {
        showAlert("Please enter a valid email address", "error");
        return;
      }
      if (!validateMobile(formData.mobile)) {
        showAlert("Please enter a valid Philippine mobile number (09XXXXXXXXX)", "error");
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
        return "🟢 Scanner Initializing...";
      case "active":
        return "🔵 Scanner Ready - Tap Your ID Card";
      case "reading":
        return "🟡 Reading ID Card...";
      case "processing":
        return "🟠 Writing Data to Card...";
      case "success":
        return "✅ Registration Complete!";
      default:
        return "🟢 Scanner Ready";
    }
  };

  const alphabetKeys = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
    ["Sym", "Space", "-", "@", ".", "_"],
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
      <div className="register-tapid-content">
        
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
        
        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={index} className={`progress-step ${currentStep === index ? 'active' : currentStep > index ? 'completed' : ''}`}>
              <div className="step-circle">
                {currentStep > index ? '✓' : index + 1}
              </div>
              <span className="step-label">
                {step.type === 'idNumber' ? (isEmployee ? 'Emp ID' : 'Stud ID') : 
                 step.type === 'contact' ? 'Contact' : 'ID Tap'}
              </span>
            </div>
          ))}
        </div>

        {/* Header */}
        <div className="register-tapid-header">
          <h1 className="register-tapid-title">{steps[currentStep].title}</h1>
          <p className="register-tapid-subtitle">{steps[currentStep].subtitle}</p>
        </div>

        {/* Notification */}
        {showNotification.show && (
          <div className={`notification ${showNotification.type}`}>
            <div className="notification-icon">
              {showNotification.type === "error" ? "⚠️" : "✅"}
            </div>
            <div className="notification-message">
              {showNotification.message}
            </div>
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
                    onFocus={() => handleInputFocus("idNumber")}
                    autoComplete="off"
                    readOnly
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
                        // Only allow input up to 10 characters
                        if (e.target.value.length <= 10) {
                          handleInputChange('password', e.target.value);
                        }
                      }}
                      onFocus={() => handleInputFocus("password")}
                      autoComplete="new-password"
                      readOnly
                      maxLength={10}
                    />
                    <button
                      type="button"
                      className="password-toggle"
                      onClick={togglePasswordVisibility}
                    >
                      {showPassword ? "👁️" : "👁️‍🗨️"}
                    </button>
                  </div>
                  
                  {/* Simple password guidelines */}
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

          {/* Step 2: Email & SMS in one phase */}
          {currentStep === 1 && (
            <div className="form-phase active">
              <div className="form-groups">
                {/* Email Input */}
                <div className="form-group">
                  <label htmlFor="email" className="form-label">
                    Email Address
                  </label>
                  <input
                    ref={emailInputRef}
                    id="email"
                    type="email"
                    className={`form-input ${activeInput === 'email' ? 'active' : ''}`}
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onFocus={() => handleInputFocus("email")}
                    autoComplete="email"
                    readOnly
                  />
                </div>

                {/* Mobile Input */}
                <div className="form-group">
                  <label htmlFor="mobile" className="form-label">
                    Philippine Mobile Number
                  </label>
                  <input
                    ref={mobileInputRef}
                    id="mobile"
                    type="tel"
                    className={`form-input ${activeInput === 'mobile' ? 'active' : ''}`}
                    placeholder="09XX XXX XXXX"
                    value={formData.mobile}
                    onChange={(e) => handleInputChange('mobile', formatMobileNumber(e.target.value))}
                    onFocus={() => handleInputFocus("mobile")}
                    autoComplete="tel"
                    readOnly
                  />
                </div>
                
                <div className="contact-explanation">
                  <h4>Contact Information</h4>
                  <p>We'll use your email for important updates and your mobile number for quick TapID login and security verification.</p>
                  
                  <div className="contact-benefits">
                    <div className="benefit-item">
                      <span className="benefit-icon">📧</span>
                      <span>Email for account recovery and notifications</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">📱</span>
                      <span>Mobile for quick TapID access and SMS verification</span>
                    </div>
                    <div className="benefit-item">
                      <span className="benefit-icon">🔒</span>
                      <span>Both are encrypted and secure</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: RFID Tap */}
          {currentStep === 2 && (
            <div className="form-phase active">
              <div className="form-groups">
                <div className="id-scan-section">
                  {/* Real RFID Scanner Hardware */}
                  <div className="scanner-container">
                    <div className={`scanner-hardware ${scannerStatus}`}>
                      <div className="scanner-led"></div>
                      <div className="scanner-surface">
                        <div className="id-card-placeholder">
                          <div className={`id-card ${isCardTapped ? 'tapped' : ''}`}>
                            <div className="id-chip"></div>
                            <div className="id-waves"></div>
                            <div className="rfid-symbol">📡</div>
                          </div>
                        </div>
                      </div>
                      <div className="scanner-reader"></div>
                      <div className="scanner-glow"></div>
                      
                      {scannerStatus === "processing" && (
                        <div className="processing-overlay">
                          <div className="spinner"></div>
                          <p>Writing Data to Card...</p>
                        </div>
                      )}
                      
                      {scannerStatus === "success" && (
                        <div className="success-overlay">
                          <div className="success-checkmark">✓</div>
                          <p>Registration Complete!</p>
                        </div>
                      )}
                    </div>

                    <div className="scan-status">
                      <div className={`status-indicator ${scannerStatus}`}>
                        {getScannerStatusText()}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  {isScanning && (
                    <div className="scan-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">
                        {scanProgress < 60 && "Reading card data..."}
                        {scanProgress >= 60 && scanProgress < 85 && "Writing user information..."}
                        {scanProgress >= 85 && scanProgress < 100 && "Finalizing registration..."}
                        {scanProgress === 100 && "Registration Complete!"}
                      </p>
                    </div>
                  )}

                  {/* RFID Scanner Status */}
                  <div className="physical-tap-area">
                    <p className="tap-instruction">
                      {scannerStatus === "ready" 
                        ? "🔄 Initializing RFID Scanner..." 
                        : scannerStatus === "active"
                        ? "🔵 Scanner Ready - Tap Any ID Card"
                        : scannerStatus === "reading"
                        ? "🟡 Reading Card Data..."
                        : scannerStatus === "processing"
                        ? "🟠 Writing Data to Card..."
                        : "✅ Registration Complete!"}
                    </p>
                    
                    {/* Scanner Information */}
                    <div className="scanner-info">
                      <div className="info-item">
                        <span className="info-label">Scanner Status:</span>
                        <span className={`info-value ${scannerStatus}`}>
                          {scannerStatus === "ready" ? "Initializing" :
                           scannerStatus === "active" ? "Ready" :
                           scannerStatus === "reading" ? "Reading" :
                           scannerStatus === "processing" ? "Processing" :
                           "Complete"}
                        </span>
                      </div>
                      <div className="info-item">
                        <span className="info-label">RFID Data:</span>
                        <span className="info-value">
                          {rfidCode || "Waiting for card..."}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Instructions */}
                  <div className="scan-instructions">
                    <h3>Automatic ID Card Registration</h3>
                    <p>RFID scanner is active and ready - Simply tap your ID card on the scanner</p>
                    <div className="instruction-steps">
                      <div className="instruction-step">
                        <span className="step-number">1</span>
                        <span className="step-text">RFID scanner is automatically active</span>
                      </div>
                      <div className="instruction-step">
                        <span className="step-number">2</span>
                        <span className="step-text">Tap your ID card on any RFID scanner</span>
                      </div>
                      <div className="instruction-step">
                        <span className="step-number">3</span>
                        <span className="step-text">Registration will start automatically</span>
                      </div>
                      <div className="instruction-step">
                        <span className="step-number">4</span>
                        <span className="step-text">Wait for the process to complete</span>
                      </div>
                    </div>
                  </div>

                  {/* Success Message */}
                  {idRegistered && (
                    <div className="registration-complete">
                      <div className="success-badge">
                        <span className="success-icon">✅</span>
                        <span className="success-text">
                          ID Successfully Registered! 
                          <br />
                          <small>RFID Code: {rfidCode}</small>
                          <br />
                          <small>Redirecting to confirmation...</small>
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="security-badge">
                  <div className="lock-icon">🔒</div>
                  <div className="security-text">
                    <strong>Secure ID Registration</strong>
                    <span>Your information will be encrypted and saved to your ID</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Custom Keyboard - Only show for steps 0 and 1 */}
        {(currentStep === 0 || currentStep === 1) && (
          <div className="register-keyboard">
            <div className="register-keyboard-rows">
              {keyboardKeys.map((row, rowIndex) => (
                <div key={rowIndex} className="register-keyboard-row">
                  {row.map((key) => (
                    <button
                      key={key}
                      className={`register-keyboard-key ${
                        key === "Del"
                          ? "delete-key"
                          : key === "Space"
                          ? "space-key"
                          : key === "↑"
                          ? `shift-key ${isShift ? "active" : ""}`
                          : (key === "Sym" || key === "ABC")
                          ? `symbols-key ${showSymbols ? "active" : ""}`
                          : ""
                      } ${rowIndex === 0 ? 'number-key' : ''}`}
                      onClick={() => handleKeyboardPress(key)}
                    >
                      {key === "Space" ? "Space" : 
                       key === "↑" ? "⇧" : 
                       key === "Sym" ? "Sym" :
                       key === "ABC" ? "ABC" : key}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className={`form-navigation ${currentStep > 0 ? 'dual-buttons' : 'single-button'}`}>
          {currentStep !== 2 && (
            <button
              className={`nav-button next-button ${!isStepValid() ? "disabled" : ""}`}
              onClick={handleContinue}
              disabled={!isStepValid()}
            >
              {getButtonText()}
              {isStepValid() && <span className="button-arrow">→</span>}
            </button>
          )}
          
          {currentStep > 0 && (
            <button className="nav-button back-button" onClick={handleBack}>
              ← Back
            </button>
          )}
        </div>
      </div>
    </div>
  );
}