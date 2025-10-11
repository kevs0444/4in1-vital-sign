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
  const [isAnalyzing, setIsAnalyzing] = useState(false); // Changed to false since AILoading is separate
  const [expandedSections, setExpandedSections] = useState({
    recommendations: false,
    prevention: false,
    wellness: false,
    guidance: false
  });

  // Function to get risk class
  const getRiskClass = (level) => {
    if (level < 20) return 'low-risk';
    if (level < 50) return 'moderate-risk';
    if (level < 75) return 'high-risk';
    return 'critical-risk';
  };

  useEffect(() => {
    console.log("📍 Location state received in Result:", location.state);
    
    if (location.state) {
      console.log("✅ Setting user data in Result:", location.state);
      setUserData(location.state);
      
      // Start analysis immediately since AILoading already happened
      console.log("🔍 Starting analysis with data:", location.state);
      analyzeHealthData(location.state);
      
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 100);

      return () => clearTimeout(timer);
    } else {
      console.error("❌ No data received in Result page!");
      // If no data, redirect back
      navigate("/max30102");
    }
  }, [location.state, navigate]);

  // Effect to update HTML class for scrollbar colors
  useEffect(() => {
    if (riskLevel > 0) {
      const riskClass = getRiskClass(riskLevel);
      document.documentElement.classList.add(riskClass);
    }
    
    // Cleanup function to remove class when component unmounts
    return () => {
      document.documentElement.classList.remove('low-risk', 'moderate-risk', 'high-risk', 'critical-risk');
    };
  }, [riskLevel]);

  const analyzeHealthData = (data) => {
    console.log("🔍 Analyzing health data:", data);
    let riskScore = 0;
    const calculatedSuggestions = [];
    const calculatedPreventions = [];

    // BMI Analysis
    const bmi = calculateBMI(data);
    console.log("📊 BMI calculated:", bmi);
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
    console.log("🌡️ Temperature:", temperature);
    if (temperature && temperature !== 'N/A') {
      const tempNum = parseFloat(temperature);
      if (!isNaN(tempNum)) {
        if (tempNum < 36.0) {
          riskScore += 20;
          calculatedSuggestions.push("Low body temperature detected - monitor for hypothermia symptoms");
          calculatedPreventions.push("Keep warm and monitor temperature regularly");
        } else if (tempNum > 37.5) {
          riskScore += 25;
          calculatedSuggestions.push("Elevated temperature detected - monitor for fever symptoms");
          calculatedPreventions.push("Stay hydrated and rest adequately");
        }
      }
    }

    // Heart Rate Analysis
    if (data.heartRate && data.heartRate !== 'N/A') {
      console.log("💓 Heart Rate:", data.heartRate);
      const hrNum = parseFloat(data.heartRate);
      if (!isNaN(hrNum)) {
        if (hrNum < 60) {
          riskScore += 25;
          calculatedSuggestions.push("Low heart rate detected - consider cardiology consultation if symptomatic");
          calculatedPreventions.push("Monitor for dizziness or fatigue during activities");
        } else if (hrNum > 100) {
          riskScore += 30;
          calculatedSuggestions.push("Elevated heart rate detected - assess stress and activity levels");
          calculatedPreventions.push("Practice relaxation techniques and limit stimulants");
        }
      }
    }

    // Blood Oxygen Analysis
    if (data.spo2 && data.spo2 !== 'N/A') {
      console.log("🫁 SPO2:", data.spo2);
      const spo2Num = parseFloat(data.spo2);
      if (!isNaN(spo2Num)) {
        if (spo2Num < 95 && spo2Num >= 92) {
          riskScore += 35;
          calculatedSuggestions.push("Mildly low oxygen saturation - monitor during physical activity");
          calculatedPreventions.push("Practice deep breathing exercises regularly");
        } else if (spo2Num < 92) {
          riskScore += 60;
          calculatedSuggestions.push("Significantly low oxygen level - urgent medical evaluation recommended");
          calculatedPreventions.push("Avoid strenuous activities and seek immediate care if symptoms worsen");
        }
      }
    }

    // Respiratory Rate Analysis
    if (data.respiratoryRate && data.respiratoryRate !== 'N/A') {
      console.log("🌬️ Respiratory Rate:", data.respiratoryRate);
      const rrNum = parseFloat(data.respiratoryRate);
      if (!isNaN(rrNum)) {
        if (rrNum < 12) {
          riskScore += 20;
          calculatedSuggestions.push("Low respiratory rate detected - monitor for breathing difficulties");
          calculatedPreventions.push("Practice paced breathing exercises");
        } else if (rrNum > 20) {
          riskScore += 25;
          calculatedSuggestions.push("Elevated respiratory rate - assess for anxiety or respiratory issues");
          calculatedPreventions.push("Focus on slow, deep breathing techniques");
        }
      }
    }

    // Age and Demographic Factors
    if (data.age && data.age > 50) {
      riskScore += 10;
      calculatedSuggestions.push("Regular health screenings recommended for age group");
      calculatedPreventions.push("Maintain active lifestyle and balanced nutrition");
    }
    if (data.age && data.age > 65) {
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

    console.log("🎯 Final Risk Score:", Math.round(riskScore));
    console.log("📋 Suggestions:", calculatedSuggestions);
    
    setRiskLevel(Math.round(riskScore));
    setRiskCategory(category);
    setSuggestions(calculatedSuggestions);
    setPreventions(calculatedPreventions);
  };

  const calculateBMI = (data) => {
    if (!data.weight || !data.height || data.weight === 'N/A' || data.height === 'N/A') return null;
    const heightInMeters = data.height / 100;
    const bmi = (data.weight / (heightInMeters * heightInMeters)).toFixed(1);
    return parseFloat(bmi);
  };

  const getRiskGradient = (level) => {
    if (level < 20) return "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
    if (level < 50) return "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
    if (level < 75) return "linear-gradient(135deg, #ef4444 0%, #f87171 100%)";
    return "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
  };

  const getRiskColor = (level) => {
    if (level < 20) return "#10b981";
    if (level < 50) return "#f59e0b";
    if (level < 75) return "#ef4444";
    return "#dc2626";
  };

  const getRiskGlow = (level) => {
    if (level < 20) return "0 0 40px rgba(16, 185, 129, 0.4)";
    if (level < 50) return "0 0 40px rgba(245, 158, 11, 0.4)";
    if (level < 75) return "0 0 40px rgba(239, 68, 68, 0.4)";
    return "0 0 50px rgba(220, 38, 38, 0.6)";
  };

  const getBMICategory = (bmi) => {
    if (!bmi) return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    if (bmi < 18.5) return { status: 'Underweight', color: '#3b82f6', range: '< 18.5' };
    if (bmi < 25) return { status: 'Normal', color: '#10b981', range: '18.5 - 24.9' };
    if (bmi < 30) return { status: 'Overweight', color: '#f59e0b', range: '25 - 29.9' };
    return { status: 'Obese', color: '#ef4444', range: '≥ 30' };
  };

  const getTemperatureStatus = (temp) => {
    if (!temp || temp === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const tempNum = parseFloat(temp);
    if (isNaN(tempNum)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    if (tempNum < 36.0) return { status: 'Low', color: '#3b82f6', range: '< 36.0°C' };
    if (tempNum > 37.5) return { status: 'Elevated', color: '#ef4444', range: '> 37.5°C' };
    return { status: 'Normal', color: '#10b981', range: '36.0 - 37.5°C' };
  };

  const getHeartRateStatus = (hr) => {
    if (!hr || hr === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const hrNum = parseFloat(hr);
    if (isNaN(hrNum)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    if (hrNum < 60) return { status: 'Low', color: '#3b82f6', range: '< 60 BPM' };
    if (hrNum > 100) return { status: 'High', color: '#ef4444', range: '> 100 BPM' };
    return { status: 'Normal', color: '#10b981', range: '60 - 100 BPM' };
  };

  const getSPO2Status = (spo2) => {
    if (!spo2 || spo2 === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const spo2Num = parseFloat(spo2);
    if (isNaN(spo2Num)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    if (spo2Num < 92) return { status: 'Critical', color: '#dc2626', range: '< 92%' };
    if (spo2Num < 95) return { status: 'Low', color: '#f59e0b', range: '92 - 94%' };
    return { status: 'Normal', color: '#10b981', range: '≥ 95%' };
  };

  const getRespiratoryStatus = (rr) => {
    if (!rr || rr === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const rrNum = parseFloat(rr);
    if (isNaN(rrNum)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    if (rrNum < 12) return { status: 'Low', color: '#3b82f6', range: '< 12 BPM' };
    if (rrNum > 20) return { status: 'High', color: '#ef4444', range: '> 20 BPM' };
    return { status: 'Normal', color: '#10b981', range: '12 - 20 BPM' };
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

  const handleSaveResults = () => {
    console.log("💾 Saving results and navigating to Saving page...");
    navigate("/saving", { state: { 
      userData, 
      riskLevel, 
      riskCategory, 
      suggestions, 
      preventions 
    }});
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const bmiData = getBMICategory(calculateBMI(userData));
  const tempData = getTemperatureStatus(getTemperatureValue());
  const hrData = getHeartRateStatus(userData.heartRate);
  const spo2Data = getSPO2Status(userData.spo2);
  const respData = getRespiratoryStatus(userData.respiratoryRate);

  return (
    <div className="result-container" style={{background: getRiskGradient(riskLevel)}}>
      <div 
        className={`result-content ${isVisible ? 'visible' : ''}`}
        style={{boxShadow: getRiskGlow(riskLevel)}}
      >
        
        {/* Header */}
        <div className="result-header">
          <div className="ai-powered-badge">
            <span className="ai-icon">🤖</span>
            AI-Powered Health Assessment
          </div>
          <h1 className="result-title">Health Assessment Complete</h1>
          <p className="result-subtitle">
            Comprehensive analysis of your vital signs using advanced AI algorithms
          </p>
        </div>

        {/* AI Result Score */}
        <div className="risk-score-section">
          <div className="risk-score-card" style={{background: getRiskGradient(riskLevel)}}>
            <div className="risk-score-main">
              <div className="risk-number">{riskLevel}%</div>
              <div className="risk-category">{riskCategory}</div>
            </div>
            <div className="risk-meter">
              <div className="risk-bar">
                <div 
                  className="risk-progress" 
                  style={{ 
                    width: `${riskLevel}%`,
                    backgroundColor: 'rgba(255,255,255,0.9)'
                  }}
                ></div>
              </div>
              <div className="risk-labels">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Risk Ranges Subtitle - Organized Layout */}
          <div className="risk-ranges-subtitle">
            <h3>Risk Level Interpretation</h3>
            <div className="risk-ranges-mini">
              {/* Low Risk */}
              <div className="risk-range-mini-card low-risk">
                <div className="mini-risk-header">
                  <div className="mini-risk-color"></div>
                  <span className="mini-risk-label">Low Risk</span>
                </div>
                <span className="mini-risk-value">0-19%</span>
              </div>
              
              {/* Moderate Risk */}
              <div className="risk-range-mini-card moderate-risk">
                <div className="mini-risk-header">
                  <div className="mini-risk-color"></div>
                  <span className="mini-risk-label">Moderate Risk</span>
                </div>
                <span className="mini-risk-value">20-49%</span>
              </div>
              
              {/* High Risk */}
              <div className="risk-range-mini-card high-risk">
                <div className="mini-risk-header">
                  <div className="mini-risk-color"></div>
                  <span className="mini-risk-label">High Risk</span>
                </div>
                <span className="mini-risk-value">50-74%</span>
              </div>
              
              {/* Critical Risk */}
              <div className="risk-range-mini-card critical-risk">
                <div className="mini-risk-header">
                  <div className="mini-risk-color"></div>
                  <span className="mini-risk-label">Critical Risk</span>
                </div>
                <span className="mini-risk-value">75-100%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information with BMI */}
        <div className="personal-info-section">
          <h2 className="section-title">Personal Information</h2>
          <div className="personal-info-card">
            <div className="personal-info-left">
              <div className="user-avatar">👤</div>
              <div className="user-details">
                <h3 className="user-name">
                  {userData.firstName || 'N/A'} {userData.lastName || 'N/A'}
                </h3>
                <div className="user-meta">
                  <span className="user-age">{userData.age || 'N/A'} years old</span>
                  <span className="user-sex">{userData.sex === 'male' ? 'Male' : userData.sex === 'female' ? 'Female' : 'N/A'}</span>
                </div>
              </div>
            </div>
            <div className="personal-info-right">
              <div className="bmi-display">
                <div className="bmi-header">
                  <div className="bmi-icon">⚖️</div>
                  <h4>Body Mass Index</h4>
                </div>
                <div className="bmi-value">{calculateBMI(userData) || 'N/A'}</div>
                <div className="bmi-status" style={{ color: bmiData.color }}>
                  {bmiData.status}
                </div>
                <div className="bmi-range">Healthy Range: 18.5 - 24.9</div>
              </div>
            </div>
          </div>
        </div>

        {/* Health Assessment - Main 4 Vital Signs */}
        <div className="health-assessment-section">
          <h2 className="section-title">4 Vital Signs Assessment</h2>
          <div className="vital-signs-grid">
            <div className="vital-sign-card">
              <div className="vital-sign-header">
                <div className="vital-sign-icon">🌡️</div>
                <h3>Body Temperature</h3>
              </div>
              <div className="vital-sign-value">{getTemperatureValue()}°C</div>
              <div className="vital-sign-status" style={{ color: tempData.color }}>
                {tempData.status}
              </div>
              <div className="vital-sign-range">Normal: 36.0 - 37.5°C</div>
            </div>

            <div className="vital-sign-card">
              <div className="vital-sign-header">
                <div className="vital-sign-icon">💓</div>
                <h3>Heart Rate</h3>
              </div>
              <div className="vital-sign-value">{userData.heartRate || 'N/A'} BPM</div>
              <div className="vital-sign-status" style={{ color: hrData.color }}>
                {hrData.status}
              </div>
              <div className="vital-sign-range">Normal: 60 - 100 BPM</div>
            </div>

            <div className="vital-sign-card">
              <div className="vital-sign-header">
                <div className="vital-sign-icon">🫁</div>
                <h3>Oxygen Level</h3>
              </div>
              <div className="vital-sign-value">{userData.spo2 || 'N/A'}%</div>
              <div className="vital-sign-status" style={{ color: spo2Data.color }}>
                {spo2Data.status}
              </div>
              <div className="vital-sign-range">Normal: ≥ 95%</div>
            </div>

            <div className="vital-sign-card">
              <div className="vital-sign-header">
                <div className="vital-sign-icon">🌬️</div>
                <h3>Respiratory Rate</h3>
              </div>
              <div className="vital-sign-value">{userData.respiratoryRate || 'N/A'} BPM</div>
              <div className="vital-sign-status" style={{ color: respData.color }}>
                {respData.status}
              </div>
              <div className="vital-sign-range">Normal: 12 - 20 BPM</div>
            </div>
          </div>
        </div>

        {/* Sub Features - Collapsible Sections */}
        <div className="sub-features-section">
          <h2 className="section-title">AI Recommendations & Guidance</h2>
          
          {/* Medical Action Recommendations */}
          <div className={`sub-feature-card ${expandedSections.recommendations ? 'expanded' : ''}`}>
            <div 
              className="sub-feature-header"
              onClick={() => toggleSection('recommendations')}
            >
              <div className="sub-feature-title">
                <span className="sub-feature-icon">🩺</span>
                Medical Action Recommendations
              </div>
              <div className="sub-feature-toggle">
                {expandedSections.recommendations ? '−' : '+'}
              </div>
            </div>
            {expandedSections.recommendations && (
              <div className="sub-feature-content">
                <div className="recommendations-list">
                  {suggestions.map((suggestion, index) => (
                    <div key={index} className="recommendation-item">
                      <div className="rec-number">{index + 1}</div>
                      <div className="rec-text">{suggestion}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Preventive Strategy Plans */}
          <div className={`sub-feature-card ${expandedSections.prevention ? 'expanded' : ''}`}>
            <div 
              className="sub-feature-header"
              onClick={() => toggleSection('prevention')}
            >
              <div className="sub-feature-title">
                <span className="sub-feature-icon">🛡️</span>
                Preventive Strategy Plans
              </div>
              <div className="sub-feature-toggle">
                {expandedSections.prevention ? '−' : '+'}
              </div>
            </div>
            {expandedSections.prevention && (
              <div className="sub-feature-content">
                <div className="prevention-list">
                  {preventions.map((prevention, index) => (
                    <div key={index} className="prevention-item">
                      <div className="prev-icon">🛡️</div>
                      <div className="prev-text">{prevention}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Wellness Improvement Tips */}
          <div className={`sub-feature-card ${expandedSections.wellness ? 'expanded' : ''}`}>
            <div 
              className="sub-feature-header"
              onClick={() => toggleSection('wellness')}
            >
              <div className="sub-feature-title">
                <span className="sub-feature-icon">💪</span>
                Wellness Improvement Tips
              </div>
              <div className="sub-feature-toggle">
                {expandedSections.wellness ? '−' : '+'}
              </div>
            </div>
            {expandedSections.wellness && (
              <div className="sub-feature-content">
                <div className="wellness-list">
                  {getImprovementTips().map((tip, index) => (
                    <div key={index} className="wellness-item">
                      <div className="wellness-number">{index + 1}</div>
                      <div className="wellness-text">{tip}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Healthcare Provider Guidance */}
          <div className={`sub-feature-card ${expandedSections.guidance ? 'expanded' : ''}`}>
            <div 
              className="sub-feature-header"
              onClick={() => toggleSection('guidance')}
            >
              <div className="sub-feature-title">
                <span className="sub-feature-icon">👨‍⚕️</span>
                Healthcare Provider Guidance
              </div>
              <div className="sub-feature-toggle">
                {expandedSections.guidance ? '−' : '+'}
              </div>
            </div>
            {expandedSections.guidance && (
              <div className="sub-feature-content">
                <div className="guidance-content">
                  <div className="guidance-card">
                    <div className="guidance-icon">🏥</div>
                    <div className="guidance-text">
                      {getDoctorRecommendation()}
                    </div>
                    <div className="guidance-urgency" style={{ color: getRiskColor(riskLevel) }}>
                      {riskLevel >= 75 ? 'HIGH URGENCY' : riskLevel >= 50 ? 'MODERATE URGENCY' : 'ROUTINE CARE'}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Save Button - Larger and More Emphasized */}
        <div className="result-actions">
          <button 
            className="save-results-btn"
            onClick={handleSaveResults}
          >
            <span className="button-icon">💾</span>
            Save Results & Continue
          </button>
        </div>

        {/* AI Disclaimer */}
        <div className="disclaimer">
          <div className="disclaimer-icon">⚠️</div>
          <div className="disclaimer-text">
            <strong>AI Analysis Disclaimer:</strong> This assessment is generated by our AI engine based on provided vital signs. 
            It is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. 
            Always consult qualified healthcare providers for medical concerns.
          </div>
        </div>
      </div>
    </div>
  );
}