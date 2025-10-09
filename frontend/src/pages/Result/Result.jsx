import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import AILoading from "../AILoading/AILoading";
import "./Result.css";

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState({});
  const [riskLevel, setRiskLevel] = useState(0);
  const [riskCategory, setRiskCategory] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [preventions, setPreventions] = useState([]);
  const [isVisible, setIsVisible] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(true);

  useEffect(() => {
    if (location.state) {
      console.log("📍 Location state received:", location.state);
      setUserData(location.state);
      
      // Simulate AI analysis with delay
      setTimeout(() => {
        analyzeHealthData(location.state);
        setIsAnalyzing(false);
      }, 3000);
    }
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.state]);

  const analyzeHealthData = (data) => {
    let riskScore = 0;
    const calculatedSuggestions = [];
    const calculatedPreventions = [];

    // BMI Analysis
    const bmi = calculateBMI(data);
    if (bmi) {
      if (bmi < 18.5) {
        riskScore += 15;
        calculatedSuggestions.push("Consider nutritional counseling for healthy weight gain");
        calculatedPreventions.push("Focus on balanced nutrition with adequate calories");
      } else if (bmi >= 25 && bmi < 30) {
        riskScore += 20;
        calculatedSuggestions.push("Monitor weight trends and maintain active lifestyle");
        calculatedPreventions.push("Combine cardio and strength training exercises");
      } else if (bmi >= 30) {
        riskScore += 35;
        calculatedSuggestions.push("Consult healthcare provider for comprehensive weight management");
        calculatedPreventions.push("Consider working with dietitian for personalized plan");
      }
    }

    // Body Temperature Analysis
    const temperature = data.temperature || data.bodyTemp;
    if (temperature) {
      if (temperature < 36.0) {
        riskScore += 20;
        calculatedSuggestions.push("Low body temperature detected - monitor for hypothermia symptoms");
        calculatedPreventions.push("Keep warm and monitor temperature regularly");
      } else if (temperature > 37.5) {
        riskScore += 25;
        calculatedSuggestions.push("Elevated temperature detected - monitor for fever symptoms");
        calculatedPreventions.push("Stay hydrated and rest adequately");
      }
    }

    // Heart Rate Analysis
    if (data.heartRate) {
      if (data.heartRate < 60) {
        riskScore += 25;
        calculatedSuggestions.push("Low heart rate detected - consider cardiology consultation if symptomatic");
        calculatedPreventions.push("Monitor for dizziness or fatigue during activities");
      } else if (data.heartRate > 100) {
        riskScore += 30;
        calculatedSuggestions.push("Elevated heart rate detected - assess stress and activity levels");
        calculatedPreventions.push("Practice relaxation techniques and limit stimulants");
      }
    }

    // Blood Oxygen Analysis
    if (data.spo2) {
      if (data.spo2 < 95 && data.spo2 >= 92) {
        riskScore += 35;
        calculatedSuggestions.push("Mildly low oxygen saturation - monitor during physical activity");
        calculatedPreventions.push("Practice deep breathing exercises regularly");
      } else if (data.spo2 < 92) {
        riskScore += 60;
        calculatedSuggestions.push("Significantly low oxygen level - urgent medical evaluation recommended");
        calculatedPreventions.push("Avoid strenuous activities and seek immediate care if symptoms worsen");
      }
    }

    // Respiratory Rate Analysis
    if (data.respiratoryRate) {
      if (data.respiratoryRate < 12) {
        riskScore += 20;
        calculatedSuggestions.push("Low respiratory rate detected - monitor for breathing difficulties");
        calculatedPreventions.push("Practice paced breathing exercises");
      } else if (data.respiratoryRate > 20) {
        riskScore += 25;
        calculatedSuggestions.push("Elevated respiratory rate - assess for anxiety or respiratory issues");
        calculatedPreventions.push("Focus on slow, deep breathing techniques");
      }
    }

    // Age and Demographic Factors
    if (data.age > 50) {
      riskScore += 10;
      calculatedSuggestions.push("Regular health screenings recommended for age group");
      calculatedPreventions.push("Maintain active lifestyle and balanced nutrition");
    }
    if (data.age > 65) {
      riskScore += 15;
      calculatedSuggestions.push("Comprehensive geriatric assessment may be beneficial");
      calculatedPreventions.push("Focus on fall prevention and mobility maintenance");
    }

    // Simulate AI Pattern Recognition
    const hasMultipleRiskFactors = calculatedSuggestions.length > 2;
    if (hasMultipleRiskFactors) {
      riskScore += 15;
      calculatedSuggestions.push("Multiple risk factors detected - comprehensive health evaluation advised");
      calculatedPreventions.push("Coordinate care with primary healthcare provider");
    }

    // Cap risk score and add some random variation
    riskScore = Math.min(riskScore, 100);
    const aiConfidenceVariation = Math.random() * 10 - 5;
    riskScore = Math.max(0, Math.min(100, riskScore + aiConfidenceVariation));

    // Determine risk category
    let category = "";
    if (riskScore < 20) {
      category = "Low Risk";
      if (calculatedSuggestions.length === 0) {
        calculatedSuggestions.push("Maintain current healthy lifestyle habits");
        calculatedPreventions.push("Continue regular health monitoring and preventive care");
      }
    } else if (riskScore < 50) {
      category = "Moderate Risk";
    } else if (riskScore < 75) {
      category = "High Risk";
    } else {
      category = "Critical Risk";
    }

    setRiskLevel(Math.round(riskScore));
    setRiskCategory(category);
    setSuggestions(calculatedSuggestions);
    setPreventions(calculatedPreventions);
  };

  const calculateBMI = (data) => {
    if (!data.weight || !data.height) return null;
    const heightInMeters = data.height / 100;
    return (data.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getRiskGradient = (level) => {
    if (level < 20) return "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
    if (level < 50) return "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
    if (level < 75) return "linear-gradient(135deg, #ef4444 0%, #f87171 100%)";
    return "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
  };

  const getDoctorRecommendation = () => {
    if (riskLevel < 20) {
      return "Routine health maintenance recommended. Schedule annual check-up within 6 months.";
    } else if (riskLevel < 50) {
      return "Consult primary care physician for comprehensive evaluation within 2-4 weeks.";
    } else if (riskLevel < 75) {
      return "Urgent medical consultation advised. Schedule appointment within 1-2 weeks.";
    } else {
      return "Immediate medical attention recommended. Consider emergency evaluation if symptoms present.";
    }
  };

  const getImprovementTips = () => {
    const tips = [];
    
    const bmi = calculateBMI(userData);
    if (bmi >= 25) {
      tips.push("Aim for 150 minutes of moderate-intensity exercise weekly");
      tips.push("Incorporate fiber-rich foods and lean proteins in daily meals");
      tips.push("Monitor portion sizes and maintain food diary for awareness");
    }
    
    if (userData.heartRate && (userData.heartRate < 60 || userData.heartRate > 100)) {
      tips.push("Practice mindfulness meditation for 10 minutes daily");
      tips.push("Gradually increase physical activity to improve cardiovascular fitness");
      tips.push("Limit caffeine intake to 200mg daily and avoid before bedtime");
    }
    
    if (userData.spo2 && userData.spo2 < 95) {
      tips.push("Perform diaphragmatic breathing exercises morning and evening");
      tips.push("Ensure proper ventilation in living and sleeping areas");
      tips.push("Consider indoor air quality assessment if symptoms persist");
    }
    
    // General wellness tips
    tips.push("Maintain consistent sleep schedule of 7-9 hours nightly");
    tips.push("Stay hydrated with 2-3 liters of water daily based on activity level");
    tips.push("Incorporate stress-reduction activities like walking or yoga");
    tips.push("Schedule regular health screenings based on age and risk factors");
    
    return tips.slice(0, 6);
  };

  const getTemperatureValue = () => {
    return userData.temperature || userData.bodyTemp || 'N/A';
  };

  const handleNewMeasurement = () => {
    navigate("/");
  };

  return (
    <div className="result-container">
      <div className={`result-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="result-header">
          <h1 className="result-title">Health Assessment Results</h1>
          <p className="result-subtitle">
            AI-Powered Analysis of Your Vital Signs
          </p>
        </div>

        {/* AI Analysis Loading */}
        {isAnalyzing && <AILoading />}

        {!isAnalyzing && (
          <>
            {/* Patient Summary */}
            <div className="patient-summary">
              <div className="summary-header">
                <h2>Patient Information</h2>
                <div className="summary-avatar">👤</div>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">Name:</span>
                  <span className="value">
                    {userData.firstName || 'N/A'} {userData.lastName || 'N/A'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Age:</span>
                  <span className="value">{userData.age || 'N/A'} years</span>
                </div>
                <div className="summary-item">
                  <span className="label">Sex:</span>
                  <span className="value">
                    {userData.sex === 'male' ? 'Male' : userData.sex === 'female' ? 'Female' : 'N/A'}
                  </span>
                </div>
                <div className="summary-item">
                  <span className="label">Weight:</span>
                  <span className="value">{userData.weight || 'N/A'} kg</span>
                </div>
                <div className="summary-item">
                  <span className="label">Height:</span>
                  <span className="value">{userData.height || 'N/A'} cm</span>
                </div>
                <div className="summary-item">
                  <span className="label">BMI:</span>
                  <span className="value">{calculateBMI(userData) || 'N/A'}</span>
                </div>
              </div>
            </div>

            {/* Comprehensive Risk Score */}
            <div className="risk-assessment" style={{background: getRiskGradient(riskLevel)}}>
              <div className="ai-badge">
                <span className="ai-icon">🤖</span>
                AI-Powered Assessment
              </div>
              <h2>Comprehensive Risk Score</h2>
              <div className="risk-meter">
                <div className="risk-score" style={{ color: 'white' }}>
                  {riskLevel}%
                </div>
                <div className="risk-category" style={{ color: 'white' }}>
                  {riskCategory}
                </div>
                <div className="risk-bar">
                  <div 
                    className="risk-progress" 
                    style={{ 
                      width: `${riskLevel}%`,
                      backgroundColor: 'rgba(255,255,255,0.3)'
                    }}
                  ></div>
                </div>
                <div className="risk-labels">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>
            </div>

            {/* Health Category Classification */}
            <div className="category-section">
              <h2>Health Category Classification</h2>
              <div className="category-cards">
                <div className="category-card">
                  <div className="category-icon">🌡️</div>
                  <h3>Temperature</h3>
                  <span className="category-status">
                    {getTemperatureValue() === 'N/A' ? 'Not Measured' : 
                     parseFloat(getTemperatureValue()) > 37.5 ? 'Elevated' :
                     parseFloat(getTemperatureValue()) < 36.0 ? 'Low' : 'Normal'}
                  </span>
                </div>
                <div className="category-card">
                  <div className="category-icon">💓</div>
                  <h3>Heart Rate</h3>
                  <span className="category-status">
                    {!userData.heartRate ? 'Not Measured' :
                     userData.heartRate > 100 ? 'High' :
                     userData.heartRate < 60 ? 'Low' : 'Normal'}
                  </span>
                </div>
                <div className="category-card">
                  <div className="category-icon">🫁</div>
                  <h3>Blood Oxygen</h3>
                  <span className="category-status">
                    {!userData.spo2 ? 'Not Measured' :
                     userData.spo2 < 95 ? 'Low' : 'Normal'}
                  </span>
                </div>
                <div className="category-card">
                  <div className="category-icon">🌬️</div>
                  <h3>Respiratory Rate</h3>
                  <span className="category-status">
                    {!userData.respiratoryRate ? 'Not Measured' :
                     userData.respiratoryRate > 20 ? 'High' :
                     userData.respiratoryRate < 12 ? 'Low' : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Medical Action Recommendations */}
            <div className="recommendations-section">
              <div className="recommendation-column">
                <div className="recommendation-header">
                  <div className="recommendation-icon">🩺</div>
                  <h3>Medical Action Recommendations</h3>
                </div>
                <div className="suggestions-list">
                  {suggestions.length > 0 ? (
                    suggestions.map((suggestion, index) => (
                      <div key={index} className="suggestion-item">
                        <span className="bullet">•</span>
                        {suggestion}
                      </div>
                    ))
                  ) : (
                    <div className="suggestion-item">
                      <span className="bullet">•</span>
                      Vital signs within optimal ranges - maintain current health practices
                    </div>
                  )}
                </div>
              </div>

              <div className="recommendation-column">
                <div className="recommendation-header">
                  <div className="recommendation-icon">🛡️</div>
                  <h3>Preventive Strategy Plans</h3>
                </div>
                <div className="suggestions-list">
                  {preventions.map((prevention, index) => (
                    <div key={index} className="suggestion-item">
                      <span className="bullet">•</span>
                      {prevention}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Healthcare Provider Guidance */}
            <div className="doctor-recommendation">
              <div className="recommendation-header">
                <div className="recommendation-icon">👨‍⚕️</div>
                <h3>Healthcare Provider Guidance</h3>
              </div>
              <div className="recommendation-card">
                <div className="recommendation-icon-large">🏥</div>
                <div className="recommendation-text">
                  {getDoctorRecommendation()}
                </div>
              </div>
            </div>

            {/* Wellness Improvement Tips */}
            <div className="improvement-tips">
              <div className="recommendation-header">
                <div className="recommendation-icon">💪</div>
                <h3>Wellness Improvement Tips</h3>
              </div>
              <div className="tips-grid">
                {getImprovementTips().map((tip, index) => (
                  <div key={index} className="tip-card">
                    <div className="tip-number">{index + 1}</div>
                    <div className="tip-text">{tip}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="result-actions">
              <button 
                className="new-measurement-btn"
                onClick={handleNewMeasurement}
              >
                Take New Measurement
              </button>
            </div>

            {/* Disclaimer */}
            <div className="disclaimer">
              <div className="disclaimer-icon">⚠️</div>
              <div className="disclaimer-text">
                <strong>AI Analysis Disclaimer:</strong> This assessment is generated by our AI engine based on provided vital signs. 
                It is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. 
                Always consult qualified healthcare providers for medical concerns.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}