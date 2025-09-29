import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Age.css";

export default function Age() {
  const navigate = useNavigate();
  const location = useLocation();
  const [birthDate, setBirthDate] = useState("");
  const [age, setAge] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let calculatedAge = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      calculatedAge--;
    }
    
    return calculatedAge;
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    setBirthDate(selectedDate);
    
    if (selectedDate) {
      const calculatedAge = calculateAge(selectedDate);
      setAge(calculatedAge);
    } else {
      setAge(null);
    }
  };

  const handleContinue = () => {
    if (!birthDate) {
      alert("Please enter your birth date");
      return;
    }
    
    const calculatedAge = calculateAge(birthDate);
    
    // Pass data to next page
    navigate("/sex", {
      state: {
        ...location.state,
        birthDate: birthDate,
        age: calculatedAge
      }
    });
  };

  const handleBack = () => {
    navigate("/name");
  };

  return (
    <div className="age-container">
      <div className={`age-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{width: '66%'}}></div>
          </div>
          <span className="progress-step">Step 2 of 3</span>
        </div>

        {/* Title */}
        <div className="age-header">
          <h1 className="age-title">When were you born?</h1>
          <p className="age-subtitle">Enter your birth date for personalized health insights</p>
        </div>

        {/* Date Input */}
        <div className="date-selection">
          <div className="date-input-container">
            <label htmlFor="birthDate" className="date-label">
              Select your birth date
            </label>
            <input
              type="date"
              id="birthDate"
              className="date-input"
              value={birthDate}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
              min="1900-01-01"
            />
          </div>

          {/* Dynamic Age Display */}
          {age !== null && (
            <div className="age-display">
              <div className="age-bubble">
                <span className="age-text">Your age is</span>
                <span className="age-number">{age}</span>
                <span className="age-years">years old</span>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="age-actions">
          <button 
            className="back-button"
            onClick={handleBack}
          >
            Back
          </button>
          
          <button 
            className="continue-button"
            onClick={handleContinue}
            disabled={!birthDate}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}