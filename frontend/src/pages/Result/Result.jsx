import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
      console.log("Location state:", location.state); // Debug log
      setUserData(location.state);
      
      // Simulate AI analysis with delay
      setTimeout(() => {
        analyzeHealthData(location.state);
        setIsAnalyzing(false);
      }, 2000);
    }
    
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.state]);

  const analyzeHealthData = (data) => {
    let riskScore = 0;
    const calculatedSuggestions = [];
    const calculatedPreventions = []

    // Simulate AI thinking process with realistic analysis
    console.log("🤖 AI Analysis Started...");
    console.log("📊 Processing vital signs data...");

    // BMI Analysis
    const bmi = calculateBMI(data);
    if (bmi) {
      console.log(`📈 Analyzing BMI: ${bmi}`);
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
    if (data.bodyTemp) {
      console.log(`🌡️ Analyzing Temperature: ${data.bodyTemp}°C`);
      if (data.bodyTemp < 36.0) {
        riskScore += 20;
        calculatedSuggestions.push("Low body temperature detected - monitor for hypothermia symptoms");
        calculatedPreventions.push("Keep warm and monitor temperature regularly");
      } else if (data.bodyTemp > 37.5) {
        riskScore += 25;
        calculatedSuggestions.push("Elevated temperature detected - monitor for fever symptoms");
        calculatedPreventions.push("Stay hydrated and rest adequately");
      }
    }

    // Heart Rate Analysis
    if (data.heartRate) {
      console.log(`💓 Analyzing Heart Rate: ${data.heartRate} BPM`);
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
      console.log(`🫁 Analyzing Blood Oxygen: ${data.spo2}%`);
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
      console.log(`🌬️ Analyzing Respiratory Rate: ${data.respiratoryRate}/min`);
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

    // Age and Demographic Factors (Simulated AI Learning)
    console.log(`👤 Analyzing demographic factors: Age ${data.age}, ${data.sex}`);
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

    // Cap risk score and add some random variation to simulate AI uncertainty
    riskScore = Math.min(riskScore, 100);
    const aiConfidenceVariation = Math.random() * 10 - 5; // ±5% variation
    riskScore = Math.max(0, Math.min(100, riskScore + aiConfidenceVariation));

    // Determine risk category with AI-style classification
    let category = "";
    if (riskScore < 20) {
      category = "Low Risk";
      // Ensure some suggestions even for low risk
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

    console.log(`🎯 AI Assessment Complete: ${riskScore}% Risk - ${category}`);

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

  const getRiskColor = (level) => {
    if (level < 20) return "#4CAF50"; // Green
    if (level < 50) return "#FF9800"; // Orange
    if (level < 75) return "#F44336"; // Red
    return "#D32F2F"; // Dark Red
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
    
    // AI-generated improvement strategies based on risk factors
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
    
    // General wellness tips from AI knowledge base
    tips.push("Maintain consistent sleep schedule of 7-9 hours nightly");
    tips.push("Stay hydrated with 2-3 liters of water daily based on activity level");
    tips.push("Incorporate stress-reduction activities like walking or yoga");
    tips.push("Schedule regular health screenings based on age and risk factors");
    
    return tips.slice(0, 6); // Return top 6 most relevant tips
  };

  const handleNewMeasurement = () => {
    navigate("/");
  };

  const handleViewHistory = () => {
    navigate("/history");
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
        {isAnalyzing && (
          <div className="ai-analysis-loading">
            <div className="ai-loader">
              <div className="ai-brain">🧠</div>
              <div className="loading-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
            <div className="analysis-text">
              <h3>AI Analysis in Progress</h3>
              <p>Our AI engine is analyzing your vital signs and health data...</p>
              <div className="analysis-steps">
                <div className="step">✓ Data Validation</div>
                <div className="step">✓ Pattern Recognition</div>
                <div className="step active">Risk Assessment</div>
                <div className="step">Generating Recommendations</div>
              </div>
            </div>
          </div>
        )}

        {!isAnalyzing && (
          <>
            {/* Patient Summary */}
            <div className="patient-summary">
              <h2>Patient Information</h2>
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
              </div>
            </div>

            {/* Risk Assessment */}
            <div className="risk-assessment">
              <div className="ai-badge">
                <span className="ai-icon">🤖</span>
                AI-Powered Assessment
              </div>
              <h2>Health Risk Analysis</h2>
              <div className="risk-meter">
                <div className="risk-score" style={{ color: getRiskColor(riskLevel) }}>
                  {riskLevel}%
                </div>
                <div className="risk-category" style={{ color: getRiskColor(riskLevel) }}>
                  {riskCategory}
                </div>
                <div className="risk-bar">
                  <div 
                    className="risk-progress" 
                    style={{ 
                      width: `${riskLevel}%`,
                      backgroundColor: getRiskColor(riskLevel)
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

            {/* Vital Signs Overview */}
            <div className="vitals-overview">
              <h2>Vital Signs Analysis</h2>
              <div className="vitals-grid">
                <div className="vital-card">
                  <div className="vital-icon">⚖️</div>
                  <div className="vital-info">
                    <h3>BMI</h3>
                    <span className="vital-value">{calculateBMI(userData) || 'N/A'}</span>
                    <span className="vital-unit">kg/m²</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">🌡️</div>
                  <div className="vital-info">
                    <h3>Temperature</h3>
                    <span className="vital-value">{userData.bodyTemp || 'N/A'}</span>
                    <span className="vital-unit">°C</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">💓</div>
                  <div className="vital-info">
                    <h3>Heart Rate</h3>
                    <span className="vital-value">{userData.heartRate || 'N/A'}</span>
                    <span className="vital-unit">BPM</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">🫁</div>
                  <div className="vital-info">
                    <h3>Blood Oxygen</h3>
                    <span className="vital-value">{userData.spo2 || 'N/A'}</span>
                    <span className="vital-unit">%</span>
                  </div>
                </div>
                <div className="vital-card">
                  <div className="vital-icon">🌬️</div>
                  <div className="vital-info">
                    <h3>Respiratory Rate</h3>
                    <span className="vital-value">{userData.respiratoryRate || 'N/A'}</span>
                    <span className="vital-unit">/min</span>
                  </div>
                </div>
              </div>
            </div>

            {/* AI Recommendations */}
            <div className="recommendations-section">
              <div className="recommendation-column">
                <h3>🩺 AI Medical Insights</h3>
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
                <h3>🛡️ Preventive Strategies</h3>
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

            {/* Doctor Recommendation */}
            <div className="doctor-recommendation">
              <h3>👨‍⚕️ AI Care Recommendation</h3>
              <div className="recommendation-card">
                <div className="recommendation-icon">🏥</div>
                <div className="recommendation-text">
                  {getDoctorRecommendation()}
                </div>
              </div>
            </div>

            {/* Improvement Tips */}
            <div className="improvement-tips">
              <h3>💪 AI-Generated Wellness Plan</h3>
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
              <button 
                className="view-history-btn"
                onClick={handleViewHistory}
              >
                View History
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