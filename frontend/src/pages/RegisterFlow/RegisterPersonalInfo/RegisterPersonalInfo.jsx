import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./RegisterPersonalInfo.css";
import nameImage from "../../../assets/images/name.png";
import ageImage from "../../../assets/images/age.png";
import maleIcon from "../../../assets/icons/male-icon.png";
import femaleIcon from "../../../assets/icons/female-icon.png";

export default function RegisterPersonalInfo() {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentStep, setCurrentStep] = useState(0); // 0: Name, 1: Age, 2: Sex
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    age: "",
    sex: ""
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [activeInput, setActiveInput] = useState("first");
  const [touchFeedback, setTouchFeedback] = useState(null);
  
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const ageDisplayRef = useRef(null);

  const steps = [
    { title: "What's your name?", subtitle: "Great to have you here! Let's start with your name", image: nameImage },
    { title: "How old are you?", subtitle: "Let us know your age to personalize your experience", image: ageImage },
    { title: "What is your biological sex?", subtitle: "Required for accurate health assessment", image: null }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Auto-focus appropriate inputs when step changes
    if (currentStep === 0) {
      setTimeout(() => {
        if (firstNameInputRef.current) firstNameInputRef.current.focus();
      }, 300);
    } else if (currentStep === 1) {
      setTimeout(() => {
        if (ageDisplayRef.current) ageDisplayRef.current.focus();
      }, 300);
    }
  }, [currentStep]);

  const handleContinue = () => {
    if (currentStep === 0) {
      if (!formData.firstName.trim() || !formData.lastName.trim()) {
        alert("Please enter both first name and last name");
        return;
      }
      setCurrentStep(1);
    } else if (currentStep === 1) {
      if (!formData.age.trim()) {
        alert("Please enter your age");
        return;
      }
      const ageNumber = parseInt(formData.age, 10);
      if (ageNumber < 1 || ageNumber > 99) {
        alert("Please enter a valid age (1–99)");
        return;
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      if (!formData.sex) {
        alert("Please select your biological sex");
        return;
      }
      
      // All data collected, navigate to next page
      navigate("/starting", {
        state: {
          ...location.state,
          firstName: formData.firstName.trim(),
          lastName: formData.lastName.trim(),
          age: parseInt(formData.age, 10),
          sex: formData.sex
        }
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Name step functions
  const handleKeyboardPress = (key) => {
    if (key === "↑") {
      setIsShift(true);
      return;
    }

    const applyFormatting = (prev, char) => {
      let nextChar = isShift ? char.toUpperCase() : char.toLowerCase();
      setIsShift(false);
      const newText = prev + nextChar;
      return newText.charAt(0).toUpperCase() + newText.slice(1);
    };

    if (key === "Del") {
      if (activeInput === "first") {
        setFormData(prev => ({ ...prev, firstName: prev.firstName.slice(0, -1) }));
      } else {
        setFormData(prev => ({ ...prev, lastName: prev.lastName.slice(0, -1) }));
      }
    } else if (key === "Space") {
      if (activeInput === "first") {
        setFormData(prev => ({ ...prev, firstName: prev.firstName + " " }));
      } else {
        setFormData(prev => ({ ...prev, lastName: prev.lastName + " " }));
      }
    } else {
      if (activeInput === "first") {
        setFormData(prev => ({ ...prev, firstName: applyFormatting(prev.firstName, key) }));
      } else {
        setFormData(prev => ({ ...prev, lastName: applyFormatting(prev.lastName, key) }));
      }
    }
  };

  // Age step functions
  const handleNumberClick = (num) => {
    if (formData.age.length < 2) {
      const newAge = (formData.age + num).replace(/^0+(?=\d)/, "");
      setFormData(prev => ({ ...prev, age: newAge }));
    }
  };

  const handleDelete = () => {
    setFormData(prev => ({ ...prev, age: prev.age.slice(0, -1) }));
  };

  const handleClear = () => {
    setFormData(prev => ({ ...prev, age: "" }));
  };

  // Sex step functions
  const handleSexSelect = (sex) => {
    setFormData(prev => ({ ...prev, sex }));
    setTouchFeedback(sex);
    setTimeout(() => setTouchFeedback(null), 200);
  };

  const handleTouchStart = (item) => {
    setTouchFeedback(item);
  };

  const handleTouchEnd = () => {
    setTimeout(() => setTouchFeedback(null), 150);
  };

  const getProgressWidth = () => {
    return `${((currentStep + 1) / 3) * 100}%`;
  };

  const getButtonText = () => {
    if (currentStep === 2) return "Complete Registration";
    return "Continue";
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName.trim() && formData.lastName.trim();
      case 1:
        return formData.age.trim() && parseInt(formData.age, 10) >= 1 && parseInt(formData.age, 10) <= 99;
      case 2:
        return formData.sex !== "";
      default:
        return false;
    }
  };

  const keyboardKeys = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
    ["Space"],
  ];

  return (
    <div className="register-personal-container">
      <div className="register-personal-content">
        {/* Progress Steps */}
        <div className="progress-steps">
          {steps.map((step, index) => (
            <div key={index} className="progress-step">
              <div className={`step-circle ${currentStep === index ? 'active' : currentStep > index ? 'completed' : ''}`}>
                {currentStep > index ? '✓' : index + 1}
              </div>
              <span className="step-label">{step.title.split('?')[0]}</span>
            </div>
          ))}
        </div>

        {/* Image */}
        {steps[currentStep].image && (
          <div className="register-image-section">
            <img 
              src={steps[currentStep].image} 
              alt={steps[currentStep].title} 
              className="register-logo" 
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
                    className="form-input"
                    placeholder="Juan"
                    value={formData.firstName}
                    onFocus={() => setActiveInput("first")}
                    readOnly
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
                    className="form-input"
                    placeholder="Dela Cruz"
                    value={formData.lastName}
                    onFocus={() => setActiveInput("last")}
                    readOnly
                  />
                </div>
              </div>
            </div>
          )}

          {currentStep === 1 && (
            <div className="form-phase active">
              <div className="form-groups">
                <div className="form-group full-width">
                  <label className="form-label">Your Age</label>
                  <div className="dob-group">
                    <div
                      ref={ageDisplayRef}
                      className="age-display"
                      tabIndex={0}
                    >
                      {formData.age || "21"}
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
                      onTouchStart={() => handleTouchStart("male")}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="role-card-icon" style={{ width: '80px', height: '80px', marginBottom: '15px' }}>
                        <img src={maleIcon} alt="Male" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <span>Male</span>
                    </div>
                    <div
                      className={`sex-option ${formData.sex === "female" ? "selected" : ""} ${touchFeedback === "female" ? "touch-feedback" : ""}`}
                      onClick={() => handleSexSelect("female")}
                      onTouchStart={() => handleTouchStart("female")}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="role-card-icon" style={{ width: '80px', height: '80px', marginBottom: '15px' }}>
                        <img src={femaleIcon} alt="Female" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                      </div>
                      <span>Female</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="register-disclaimer">
                <p style={{ fontSize: '1.1rem', color: '#666', textAlign: 'center', padding: '0 20px' }}>
                  We ask for your biological sex to provide accurate BMI calculations and health assessments. 
                  This information will not be shared publicly.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="form-navigation">
          {currentStep > 0 && (
            <button className="nav-button back-button" onClick={handleBack}>
              ← Back
            </button>
          )}
          <button
            className={`nav-button ${currentStep === 2 ? "submit-button" : "next-button"} ${!isStepValid() ? "disabled" : ""}`}
            onClick={handleContinue}
            disabled={!isStepValid()}
            onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
            onTouchEnd={(e) => e.currentTarget.style.transform = ''}
          >
            {getButtonText()}
            {isStepValid() && <span style={{ fontSize: '1.5rem' }}>→</span>}
          </button>
        </div>
      </div>

      {/* Input Methods */}
      {currentStep === 0 && (
        <div className="register-keyboard">
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
                      : ""
                  }`}
                  onClick={() => handleKeyboardPress(key)}
                  onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onTouchEnd={(e) => e.currentTarget.style.transform = ''}
                >
                  {key === "Space" ? "Space" : key}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      {currentStep === 1 && (
        <div className="register-numpad">
          <div className="register-numpad-grid">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className="register-numpad-btn"
                onClick={() => handleNumberClick(num)}
                onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onTouchEnd={(e) => e.currentTarget.style.transform = ''}
              >
                {num}
              </button>
            ))}
            <button className="register-numpad-btn clear" onClick={handleClear}>
              C
            </button>
            <button className="register-numpad-btn" onClick={() => handleNumberClick(0)}>
              0
            </button>
            <button className="register-numpad-btn delete" onClick={handleDelete}>
              ⌫
            </button>
          </div>
        </div>
      )}
    </div>
  );
}