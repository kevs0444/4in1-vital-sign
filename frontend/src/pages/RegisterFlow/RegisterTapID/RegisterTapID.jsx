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

  const idNumberInputRef = useRef(null);
  const passwordInputRef = useRef(null);
  const emailInputRef = useRef(null);
  const mobileInputRef = useRef(null);
  const scanTimeoutRef = useRef(null);

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
      subtitle: "Ready to receive your ID - Tap anytime on the RFID scanner",
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

  // Prevent zooming functions - RENAMED
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
    }
  }, [currentStep]);

  // Simulate RFID scanner ready state
  useEffect(() => {
    if (currentStep === 2) {
      console.log("🔄 RFID Scanner UI Ready - Waiting for tap...");
      setScannerStatus("ready");
      
      const statusInterval = setInterval(() => {
        setScannerStatus(prev => prev === "ready" ? "waiting" : "ready");
      }, 2000);

      return () => {
        clearInterval(statusInterval);
        if (scanTimeoutRef.current) clearTimeout(scanTimeoutRef.current);
      };
    }
  }, [currentStep]);

  // Enhanced RFID simulation
  const simulateRFIDDetection = () => {
    if (isScanning || idRegistered) return;

    console.log("🎯 Simulating RFID card detection...");
    
    const generatedRFID = `RFID${Date.now().toString().slice(-8)}`;
    setRfidCode(generatedRFID);
    
    setScannerStatus("detecting");
    setIsScanning(true);
    
    // Step 1: Card detection (1 second)
    setTimeout(() => {
      setScannerStatus("processing");
      setScanProgress(20);
      
      // Step 2: Reading card data (1.5 seconds)
      setTimeout(() => {
        setScanProgress(50);
        
        // Step 3: Writing user data (2 seconds)
        setTimeout(() => {
          setScanProgress(80);
          
          // Step 4: Finalizing (1 second)
          setTimeout(() => {
            setScanProgress(100);
            setScannerStatus("complete");
            
            // Complete registration after brief success display
            setTimeout(() => {
              completeIDRegistration(generatedRFID);
            }, 1000);
            
          }, 1000);
        }, 2000);
      }, 1500);
    }, 1000);
  };

  // Complete the registration process
  const completeIDRegistration = (rfidCode) => {
    console.log("✅ ID Registration completed!");
    setIsScanning(false);
    setIdRegistered(true);
    
    // Navigate to data saved screen with all registration data
    setTimeout(() => {
      navigate("/register/saved", {
        state: {
          userType: userType,
          personalInfo: personalInfo,
          idNumber: formData.idNumber,
          password: formData.password,
          email: formData.email,
          mobile: formData.mobile,
          rfidCode: rfidCode,
          idRegistered: true,
          registrationDate: new Date().toISOString(),
          timestamp: new Date().toISOString()
        }
      });
    }, 2000);
  };

  // Auto-simulate RFID after 5 seconds on ID step (for demo purposes)
  useEffect(() => {
    if (currentStep === 2 && !isScanning && !idRegistered) {
      const autoSimulate = setTimeout(() => {
        console.log("🔄 Auto-simulating RFID detection for demo...");
        simulateRFIDDetection();
      }, 5000);

      return () => clearTimeout(autoSimulate);
    }
  }, [currentStep, isScanning, idRegistered]);

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
        return "🟢 Scanner Ready - Tap your ID";
      case "waiting":
        return "🔵 Scanner Active - Waiting for ID";
      case "detecting":
        return "🟡 Detecting ID Card...";
      case "processing":
        return "🟠 Processing Registration...";
      case "complete":
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
                  {/* Enhanced Scanner Animation */}
                  <div className="scanner-container">
                    <div className={`scanner-animation ${scannerStatus}`}>
                      <div className="scanner-glow"></div>
                      <div className="scanner-line"></div>
                      <div className="scanner-pulse"></div>
                      <div className="scanner-waves"></div>
                      <div className="id-card-placeholder">
                        <div className="id-card">
                          <div className="id-chip"></div>
                          <div className="id-waves"></div>
                          <div className="rfid-symbol">📡</div>
                        </div>
                      </div>
                      {scannerStatus === "processing" && (
                        <div className="processing-overlay">
                          <div className="spinner"></div>
                          <p>Writing Data...</p>
                        </div>
                      )}
                      {scannerStatus === "complete" && (
                        <div className="success-overlay">
                          <div className="success-checkmark">✓</div>
                          <p>Success!</p>
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
                        {scanProgress < 20 && "Initializing scanner..."}
                        {scanProgress >= 20 && scanProgress < 50 && "Reading ID data..."}
                        {scanProgress >= 50 && scanProgress < 80 && "Writing user information..."}
                        {scanProgress >= 80 && scanProgress < 100 && "Finalizing registration..."}
                        {scanProgress === 100 && "Registration Complete!"}
                      </p>
                    </div>
                  )}

                  {/* Instructions */}
                  <div className="scan-instructions">
                    <h3>Tap Your ID Card on RFID Scanner</h3>
                    <p>Place your ID card on the RFID scanner to automatically save your information</p>
                    <div className="instruction-steps">
                      <div className="instruction-step">
                        <span className="step-number">1</span>
                        <span className="step-text">RFID Scanner is active and ready</span>
                      </div>
                      <div className="instruction-step">
                        <span className="step-number">2</span>
                        <span className="step-text">Tap your ID card on the scanner surface</span>
                      </div>
                      <div className="instruction-step">
                        <span className="step-number">3</span>
                        <span className="step-text">Registration will start automatically</span>
                      </div>
                    </div>
                  </div>

                  {/* Manual Trigger for Testing */}
                  {!isScanning && !idRegistered && (
                    <div className="manual-trigger">
                      <p className="manual-hint">
                        Demo Mode: The system will auto-simulate in 5 seconds or 
                        <button onClick={simulateRFIDDetection} className="manual-trigger-btn">
                          Simulate ID Tap Now
                        </button>
                      </p>
                    </div>
                  )}

                  {/* Success Message */}
                  {idRegistered && (
                    <div className="registration-complete">
                      <div className="success-badge">
                        <span className="success-icon">✅</span>
                        <span className="success-text">
                          ID Successfully Registered! 
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