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
    sex: "",
    birthMonth: null,
    birthDay: null,
    birthYear: null
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isShift, setIsShift] = useState(false);
  const [activeInput, setActiveInput] = useState("first");
  const [touchFeedback, setTouchFeedback] = useState(null);
  
  const firstNameInputRef = useRef(null);
  const lastNameInputRef = useRef(null);
  const monthScrollRef = useRef(null);
  const dayScrollRef = useRef(null);
  const yearScrollRef = useRef(null);

  const steps = [
    { title: "What's your name?", subtitle: "Great to have you here! Let's start with your name", image: nameImage },
    { title: "How old are you?", subtitle: "Select your birthday to calculate your age", image: ageImage },
    { title: "What is your biological sex?", subtitle: "Required for accurate health assessments", image: null }
  ];

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (currentStep === 0) {
      setTimeout(() => {
        if (firstNameInputRef.current) firstNameInputRef.current.focus();
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
        alert("Please select your birthday to calculate age");
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
      
      // FIXED: Navigate to /register/tapid instead of /starting
      navigate("/register/tapid", {
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
    } else {
      navigate(-1); // Go back to previous page (RegisterRole)
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

  const getButtonText = () => {
    if (currentStep === 2) return "Continue to Account Setup";
    return "Continue";
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 0:
        return formData.firstName.trim() && formData.lastName.trim();
      case 1:
        return formData.age && parseInt(formData.age, 10) >= 1 && parseInt(formData.age, 10) <= 99;
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
            <div key={index} className={`progress-step ${currentStep === index ? 'active' : currentStep > index ? 'completed' : ''}`}>
              <div className="step-circle">
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
                  <label className="form-label">Select Your Birthday</label>
                  <div className="birthday-selector">
                    <div className="birthday-inputs">
                      <div className="birthday-column">
                        <label className="birthday-label">Month</label>
                        <div className="birthday-scroll month-scroll" ref={monthScrollRef}>
                          {Array.from({ length: 12 }, (_, i) => (
                            <div
                              key={i}
                              className={`birthday-option ${formData.birthMonth === i + 1 ? 'selected' : ''}`}
                              onClick={() => handleBirthdaySelect('month', i + 1)}
                            >
                              {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="birthday-column">
                        <label className="birthday-label">Day</label>
                        <div className="birthday-scroll day-scroll" ref={dayScrollRef}>
                          {Array.from({ length: 31 }, (_, i) => (
                            <div
                              key={i}
                              className={`birthday-option ${formData.birthDay === i + 1 ? 'selected' : ''}`}
                              onClick={() => handleBirthdaySelect('day', i + 1)}
                            >
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="birthday-column">
                        <label className="birthday-label">Year</label>
                        <div className="birthday-scroll year-scroll" ref={yearScrollRef}>
                          {Array.from({ length: 100 }, (_, i) => {
                            const year = new Date().getFullYear() - i;
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
                      onTouchStart={() => handleTouchStart("male")}
                      onTouchEnd={handleTouchEnd}
                    >
                      <div className="role-card-icon">
                        <img src={maleIcon} alt="Male" />
                      </div>
                      <span>Male</span>
                    </div>
                    <div
                      className={`sex-option ${formData.sex === "female" ? "selected" : ""} ${touchFeedback === "female" ? "touch-feedback" : ""}`}
                      onClick={() => handleSexSelect("female")}
                      onTouchStart={() => handleTouchStart("female")}
                      onTouchEnd={handleTouchEnd}
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

        {/* Navigation Buttons - UPDATED STACKED LAYOUT */}
        <div className={`form-navigation ${currentStep > 0 ? 'dual-buttons' : 'single-button'}`}>
          <button
            className={`nav-button ${currentStep === 2 ? "submit-button" : "next-button"} ${!isStepValid() ? "disabled" : ""}`}
            onClick={handleContinue}
            disabled={!isStepValid()}
          >
            {getButtonText()}
            {isStepValid() && <span className="button-arrow">→</span>}
          </button>
          
          {currentStep > 0 && (
            <button className="nav-button back-button" onClick={handleBack}>
              ← Back
            </button>
          )}
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
                  >
                    {key === "Space" ? "Space" : key}
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