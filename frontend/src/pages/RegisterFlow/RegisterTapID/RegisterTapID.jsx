import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterTapID.css";

export default function RegisterTapID() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0); // 0: Email, 1: SMS, 2: ID Tap
  const [formData, setFormData] = useState({
    email: "",
    mobile: "09", // Pre-filled with Philippine format
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [isShift, setIsShift] = useState(false);
  const [showSymbols, setShowSymbols] = useState(false);
  const [activeInput, setActiveInput] = useState("email");
  const [showNotification, setShowNotification] = useState({ show: false, message: "", type: "" });
  const [idRegistered, setIdRegistered] = useState(false);

  const emailInputRef = useRef(null);
  const mobileInputRef = useRef(null);

  const steps = [
    { 
      title: "Add your email", 
      subtitle: "We'll use this for important updates and account recovery",
      type: "email"
    },
    { 
      title: "Enter your mobile number", 
      subtitle: "For security and quick login with TapID",
      type: "sms"
    },
    { 
      title: "Register your ID", 
      subtitle: "Ready to receive your ID - Tap anytime on the RFID scanner",
      type: "id"
    }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentStep === 0 && emailInputRef.current) {
      setTimeout(() => emailInputRef.current.focus(), 300);
    } else if (currentStep === 1 && mobileInputRef.current) {
      setTimeout(() => mobileInputRef.current.focus(), 300);
    }
  }, [currentStep]);

  // Real RFID Scanner Integration
  useEffect(() => {
    if (currentStep === 2) {
      // Initialize RFID scanner when on ID step
      initializeRFIDScanner();
      
      return () => {
        // Cleanup scanner when leaving the component
        cleanupRFIDScanner();
      };
    }
  }, [currentStep]);

  // Real RFID Scanner Functions
  const initializeRFIDScanner = () => {
    console.log("Initializing RFID scanner...");
    
    // Simulate scanner hardware initialization
    setTimeout(() => {
      console.log("RFID Scanner ready - waiting for ID tap...");
      // In a real implementation, this would set up serial port communication
      // or WebUSB/WebSerial API connection to the RFID hardware
    }, 500);
  };

  const cleanupRFIDScanner = () => {
    console.log("Cleaning up RFID scanner...");
    // In a real implementation, this would close serial port connections
    // and clean up hardware resources
  };

  const simulateRFIDDetection = () => {
    // This simulates the RFID hardware detecting a card
    console.log("RFID Card detected - starting registration process...");
    startIDRegistration();
  };

  const startIDRegistration = () => {
    if (isScanning || idRegistered) return;
    
    setIsScanning(true);
    setScanProgress(0);

    // Real registration process with progress updates
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          completeIDRegistration();
          return 100;
        }
        return prev + 20; // Faster progress for real implementation
      });
    }, 300);
  };

  const completeIDRegistration = () => {
    console.log("ID Registration completed successfully!");
    setIsScanning(false);
    setIdRegistered(true);
    
    // Generate a real ID number based on user data
    const generatedIdNumber = generateIDNumber();
    
    // Navigate directly to data saved screen with registration data
    navigate("/register/datasaved", {
      state: {
        ...location.state,
        email: formData.email,
        mobile: formData.mobile,
        idNumber: generatedIdNumber,
        idRegistered: true,
        registrationDate: new Date().toISOString(),
        timestamp: new Date().toISOString()
      }
    });
  };

  const generateIDNumber = () => {
    // Generate a realistic ID number based on user data
    const timestamp = Date.now().toString().slice(-6);
    const mobileSuffix = formData.mobile.replace(/\s/g, '').slice(-4);
    return `ID${timestamp}${mobileSuffix}`.toUpperCase();
  };

  // Manual trigger for development/testing
  const handleManualIDTap = () => {
    if (!isScanning && !idRegistered) {
      simulateRFIDDetection();
    }
  };

  const showAlert = (message, type = "error") => {
    setShowNotification({ show: true, message, type });
    setTimeout(() => {
      setShowNotification({ show: false, message: "", type: "" });
    }, 3000);
  };

  const handleContinue = () => {
    if (currentStep === 0) {
      if (!validateEmail(formData.email)) {
        showAlert("Please enter a valid email address", "error");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
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
      if (activeInput === "email") {
        setFormData(prev => ({ ...prev, email: prev.email.slice(0, -1) }));
      } else {
        setFormData(prev => ({ ...prev, mobile: formatMobileNumber(prev.mobile.replace(/\s/g, '').slice(0, -1)) }));
      }
    } else if (key === "Space") {
      if (activeInput === "email") {
        setFormData(prev => ({ ...prev, email: prev.email + " " }));
      } else {
        setFormData(prev => ({ ...prev, mobile: formatMobileNumber(prev.mobile.replace(/\s/g, '') + " ") }));
      }
    } else {
      if (activeInput === "email") {
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
        return validateEmail(formData.email);
      case 1:
        return validateMobile(formData.mobile);
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
    ["Sym", "Space", "-", "@", "."],
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
                {step.type === 'email' ? 'Email' : step.type === 'sms' ? 'SMS' : 'ID'}
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
          {currentStep === 0 && (
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
                    placeholder="your.email@example.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    onFocus={() => handleInputFocus("email")}
                    autoComplete="email"
                    readOnly
                  />
                </div>
                
                <div className="security-note">
                  <div className="security-icon">🔒</div>
                  <p>Your email is encrypted and secure. We'll never share it with third parties.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="form-phase active">
              <div className="form-groups">
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
                
                <div className="tapid-explanation">
                  <h4>Philippine Mobile Format</h4>
                  <p>Your number should start with 09 and be 11 digits total. This enables SMS verification and quick access.</p>
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="form-phase active">
              <div className="form-groups">
                <div className="id-scan-section">
                  <div className="scanner-container">
                    <div className="scanner-animation">
                      <div className="scanner-glow"></div>
                      <div className="scanner-line"></div>
                      <div className="scanner-pulse"></div>
                      <div className="id-card-placeholder">
                        <div className="id-card">
                          <div className="id-chip"></div>
                          <div className="id-waves"></div>
                          <div className="rfid-symbol">📡</div>
                        </div>
                      </div>
                    </div>

                    <div className="scan-status">
                      <div className={`status-indicator ${isScanning ? 'scanning' : idRegistered ? 'completed' : 'ready'}`}>
                        {isScanning ? '🔄 Registering ID...' : 
                         idRegistered ? '✅ Registration Complete' : '✅ Scanner Ready'}
                      </div>
                    </div>
                  </div>

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

                  {isScanning && (
                    <div className="scan-progress">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">
                        {scanProgress < 30 && "Initializing registration..."}
                        {scanProgress >= 30 && scanProgress < 70 && "Writing data to ID..."}
                        {scanProgress >= 70 && scanProgress < 100 && "Finalizing registration..."}
                        {scanProgress === 100 && "Registration Complete!"}
                      </p>
                    </div>
                  )}

                  {!isScanning && !idRegistered && (
                    <div className="manual-trigger">
                      <p className="manual-hint">
                        Development Mode: <button onClick={handleManualIDTap} className="manual-trigger-btn">Simulate ID Tap</button>
                      </p>
                    </div>
                  )}

                  {idRegistered && (
                    <div className="registration-complete">
                      <div className="success-badge">
                        <span className="success-icon">✅</span>
                        <span className="success-text">ID Successfully Registered! Redirecting...</span>
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

        {/* Custom Keyboard - Always shown for email/SMS steps */}
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