import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Result.css";
import { speak, reinitSpeech } from "../../../utils/speech";

export default function Result() {
  const navigate = useNavigate();
  const location = useLocation();
  const [userData, setUserData] = useState({});
  const [riskLevel, setRiskLevel] = useState(0);
  const [riskCategory, setRiskCategory] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [preventions, setPreventions] = useState([]);
  const [wellnessTips, setWellnessTips] = useState([]);
  const [providerGuidance, setProviderGuidance] = useState([]);
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
    } else {
      console.log("❌ No data received - trying to get from session storage");

      // Try to get data from session storage as fallback
      const storedData = sessionStorage.getItem('vitalSignsData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        console.log("📦 Using data from session storage:", parsedData);
        setUserData(parsedData);
        analyzeHealthData(parsedData);
      } else {
        console.warn("⚠️ No measurement data available - user will see empty values");
        // Don't use fake sample data - show real state (empty)
        setUserData({});
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Voice announcement when results are ready
  useEffect(() => {
    if (riskLevel > 0 && riskCategory) {
      reinitSpeech();
      // Announce results are ready without revealing percentage for privacy
      setTimeout(() => {
        speak("Your health assessment results are now ready. Please review the screen for your personalized recommendations.");
      }, 500);
    }
  }, [riskLevel, riskCategory]);

  const analyzeHealthData = (data) => {
    console.log("🔍 Analyzing health data:", data);

    // --- 1. CHECK FOR JUAN AI BRAIN DATA ---
    if (data.aiAnalysis && data.aiAnalysis.success) {
      console.log("🧠 Using Juan AI Brain Results!");
      const ai = data.aiAnalysis;

      setRiskLevel(Math.round(ai.risk_score));
      setRiskCategory(ai.risk_level);

      // Parse the AI recommendations (which come as strings) into arrays for the UI
      // We wrap them in arrays because our UI expects lists
      setSuggestions([ai.recommendations.medical_action]);
      setPreventions([ai.recommendations.preventive_strategy]);
      setWellnessTips([ai.recommendations.wellness_tips]);
      setProviderGuidance([ai.recommendations.provider_guidance]);

      return;
    }

    // --- 2. FALLBACK: LOCAL LOGIC (If AI Server Failed) ---
    console.log("⚠️ No AI Data found. Using Local Fallback Logic.");

    let riskScore = 0;
    const calculatedSuggestions = [];
    const calculatedPreventions = [];
    // We will calculate wellness tips using the old helper function for fallback
    const calculatedWellness = getImprovementTips(data);
    const calculatedGuidance = [];

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
    const temperature = data.temperature;
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

    // Blood Pressure Analysis
    if (data.systolic && data.diastolic) {
      console.log("🩸 Blood Pressure:", `${data.systolic}/${data.diastolic}`);
      const systolicNum = parseFloat(data.systolic);
      const diastolicNum = parseFloat(data.diastolic);

      if (!isNaN(systolicNum) && !isNaN(diastolicNum)) {
        if (systolicNum >= 180 || diastolicNum >= 120) {
          riskScore += 60;
          calculatedSuggestions.push("Hypertensive crisis detected - seek immediate medical attention");
          calculatedPreventions.push("Emergency evaluation required for blood pressure management");
        } else if (systolicNum >= 140 || diastolicNum >= 90) {
          riskScore += 40;
          calculatedSuggestions.push("Stage 2 hypertension - consult healthcare provider urgently");
          calculatedPreventions.push("Monitor blood pressure regularly and follow medical advice");
        } else if (systolicNum >= 130 || diastolicNum >= 80) {
          riskScore += 30;
          calculatedSuggestions.push("Stage 1 hypertension - lifestyle modifications recommended");
          calculatedPreventions.push("Reduce sodium intake to less than 2,300mg daily");
        } else if (systolicNum >= 120) {
          riskScore += 15;
          calculatedSuggestions.push("Elevated blood pressure - monitor regularly");
          calculatedPreventions.push("Maintain healthy diet and exercise routine");
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

    // Age and Demographic Factors (Fallback)
    if (data.age && data.age > 50) {
      riskScore += 10;
      calculatedSuggestions.push("Regular health screenings recommended for age group");
      calculatedPreventions.push("Maintain active lifestyle and balanced nutrition");
    }

    // Cap risk score
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

    console.log("🎯 Final Risk Score (Fallback):", Math.round(riskScore));

    setRiskLevel(Math.round(riskScore));
    setRiskCategory(category);
    setSuggestions(calculatedSuggestions);
    setPreventions(calculatedPreventions);
    setWellnessTips(calculatedWellness);

    // Fallback Guidance Logic
    if (riskScore < 20) calculatedGuidance.push("Routine health maintenance recommended. Schedule annual check-up within 6 months.");
    else if (riskScore < 50) calculatedGuidance.push("Consult primary care physician for comprehensive evaluation within 2-4 weeks.");
    else if (riskScore < 75) calculatedGuidance.push("Urgent medical consultation advised. Schedule appointment within 1-2 weeks.");
    else calculatedGuidance.push("Immediate medical attention recommended. Consider emergency evaluation if symptoms present.");

    setProviderGuidance(calculatedGuidance);
  };

  // Modified helper to accept data argument
  const getImprovementTips = (currentData) => {
    // If no data passed, use state data
    const dataToUse = currentData || userData;
    const tips = [];

    // Check if dataToUse is valid before accessing properties
    if (!dataToUse) return tips;

    const bmi = calculateBMI(dataToUse);
    if (bmi >= 25) {
      tips.push("Aim for 150 minutes of moderate-intensity exercise weekly");
      tips.push("Incorporate fiber-rich foods and lean proteins in daily meals");
      tips.push("Monitor portion sizes and maintain food diary for awareness");
    }

    if (dataToUse.heartRate && (dataToUse.heartRate < 60 || dataToUse.heartRate > 100)) {
      tips.push("Practice mindfulness meditation for 10 minutes daily");
      tips.push("Gradually increase physical activity to improve cardiovascular fitness");
      tips.push("Limit caffeine intake to 200mg daily and avoid before bedtime");
    }

    if (dataToUse.spo2 && dataToUse.spo2 < 95) {
      tips.push("Perform diaphragmatic breathing exercises morning and evening");
      tips.push("Ensure proper ventilation in living and sleeping areas");
      tips.push("Consider indoor air quality assessment if symptoms persist");
    }

    if (dataToUse.systolic && dataToUse.diastolic) {
      const bpStatus = getBloodPressureStatus(dataToUse.systolic, dataToUse.diastolic);
      if (bpStatus.status !== 'Normal') {
        tips.push("Reduce sodium intake to less than 2,300mg daily");
        tips.push("Incorporate potassium-rich foods like bananas and leafy greens");
        tips.push("Practice stress management techniques like deep breathing");
      }
    }

    // General wellness tips
    tips.push("Maintain consistent sleep schedule of 7-9 hours nightly");
    tips.push("Stay hydrated with 2-3 liters of water daily based on activity level");
    tips.push("Incorporate stress-reduction activities like walking or yoga");
    tips.push("Schedule regular health screenings based on age and risk factors");

    return tips.slice(0, 6);
  };

  const getRiskGradient = (level) => {
    if (level < 20) return "linear-gradient(135deg, #10b981 0%, #34d399 100%)";
    if (level < 50) return "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)";
    if (level < 75) return "linear-gradient(135deg, #ef4444 0%, #f87171 100%)";
    return "linear-gradient(135deg, #dc2626 0%, #ef4444 100%)";
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
    // Categories: 35.0-37.2 Normal, 37.3-38.0 Slight fever, Above 38.0 Critical
    if (tempNum < 35.0) return { status: 'Low', color: '#3b82f6', range: '< 35.0°C' };
    if (tempNum <= 37.2) return { status: 'Normal', color: '#10b981', range: '35.0 - 37.2°C' };
    if (tempNum <= 38.0) return { status: 'Slight Fever', color: '#f59e0b', range: '37.3 - 38.0°C' };
    return { status: 'Critical', color: '#dc2626', range: '> 38.0°C' };
  };

  const getHeartRateStatus = (hr) => {
    if (!hr || hr === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const hrNum = parseFloat(hr);
    if (isNaN(hrNum)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    // Categories: Below 60 Low, 60-100 Normal, 101-120 Elevated, Above 120 Critical
    if (hrNum < 60) return { status: 'Low', color: '#3b82f6', range: '< 60 BPM' };
    if (hrNum <= 100) return { status: 'Normal', color: '#10b981', range: '60 - 100 BPM' };
    if (hrNum <= 120) return { status: 'Elevated', color: '#f59e0b', range: '101 - 120 BPM' };
    return { status: 'Critical', color: '#dc2626', range: '> 120 BPM' };
  };

  const getSPO2Status = (spo2) => {
    if (!spo2 || spo2 === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const spo2Num = parseFloat(spo2);
    if (isNaN(spo2Num)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    // Categories: 89 below Critical, 90-94 Low (Needs monitoring), 95-100 Normal
    if (spo2Num < 90) return { status: 'Critical', color: '#dc2626', range: '< 90%' };
    if (spo2Num < 95) return { status: 'Low', color: '#f59e0b', range: '90 - 94%' };
    return { status: 'Normal', color: '#10b981', range: '95 - 100%' };
  };

  const getRespiratoryStatus = (rr) => {
    if (!rr || rr === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const rrNum = parseFloat(rr);
    if (isNaN(rrNum)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };
    // Categories: Below 12 Low, 12-20 Normal, 21-24 Elevated, Above 24 Critical
    if (rrNum < 12) return { status: 'Low', color: '#3b82f6', range: '< 12/min' };
    if (rrNum <= 20) return { status: 'Normal', color: '#10b981', range: '12 - 20/min' };
    if (rrNum <= 24) return { status: 'Elevated', color: '#f59e0b', range: '21 - 24/min' };
    return { status: 'Critical', color: '#dc2626', range: '> 24/min' };
  };

  const getBloodPressureStatus = (sys, dia) => {
    if (!sys || !dia || sys === '--' || dia === '--') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const systolicValue = parseFloat(sys);
    const diastolicValue = parseFloat(dia);

    if (isNaN(systolicValue) || isNaN(diastolicValue)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };

    // BP Categories based on medical standards:
    // Hypertensive Crisis: Sys > 180 OR Dia > 120
    if (systolicValue > 180 || diastolicValue > 120) {
      return { status: 'Hypertensive Crisis', color: '#7f1d1d', range: '> 180/120 mmHg' };
    }
    // Hypertension Stage 2: Sys >= 140 OR Dia >= 90
    if (systolicValue >= 140 || diastolicValue >= 90) {
      return { status: 'Hypertension Stage 2', color: '#dc2626', range: '≥ 140/90 mmHg' };
    }
    // Hypertension Stage 1: Sys 130-139 OR Dia 80-89
    if (systolicValue >= 130 || diastolicValue >= 80) {
      return { status: 'Hypertension Stage 1', color: '#f59e0b', range: '130-139/80-89 mmHg' };
    }
    // Elevated: Sys 120-129 AND Dia < 80
    if (systolicValue >= 120 && diastolicValue < 80) {
      return { status: 'Elevated', color: '#fbbf24', range: '120-129/<80 mmHg' };
    }
    // Hypotension (Low): Sys < 90 OR Dia < 60
    if (systolicValue < 90 || diastolicValue < 60) {
      return { status: 'Hypotension (Low)', color: '#3b82f6', range: '< 90/60 mmHg' };
    }
    // Normal: Sys < 120 AND Dia < 80
    return { status: 'Normal', color: '#10b981', range: '< 120/80 mmHg' };
  };



  const calculateBMI = (data) => {
    // If BMI is already calculated and passed, use it
    if (data.bmi && data.bmi !== 'N/A') {
      return parseFloat(data.bmi);
    }

    // Otherwise calculate from weight and height
    if (!data.weight || !data.height || data.weight === 'N/A' || data.height === 'N/A') return null;
    const heightInMeters = data.height / 100;
    const bmi = (data.weight / (heightInMeters * heightInMeters)).toFixed(1);
    return parseFloat(bmi);
  };

  const handleSaveResults = () => {
    console.log("💾 Saving results and navigating to Sharing page...");

    // Prepare complete data to pass directly to Sharing
    const completeData = {
      // Original user data
      ...userData,

      // Analysis results
      riskLevel,
      riskCategory,
      suggestions,
      preventions,
      wellnessTips,
      providerGuidance,

      // Ensure all measurement fields are included
      bmi: calculateBMI(userData),
      bloodPressure: userData.systolic && userData.diastolic ?
        `${userData.systolic}/${userData.diastolic}` : 'N/A',

      // Add calculated fields for print
      bmiCategory: getBMICategory(calculateBMI(userData)).status,
      temperatureStatus: getTemperatureStatus(userData.temperature).status,
      heartRateStatus: getHeartRateStatus(userData.heartRate).status,
      spo2Status: getSPO2Status(userData.spo2).status,
      respiratoryStatus: getRespiratoryStatus(userData.respiratoryRate).status,
      bloodPressureStatus: getBloodPressureStatus(userData.systolic, userData.diastolic).status
    };

    console.log("📤 Passing complete data to Saving:", completeData);

    // Navigate to Saving page first
    navigate("/measure/saving", {
      state: completeData
    });
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const bmiData = getBMICategory(calculateBMI(userData));
  const tempData = getTemperatureStatus(userData.temperature);
  const hrData = getHeartRateStatus(userData.heartRate);
  const respData = getRespiratoryStatus(userData.respiratoryRate);
  const bpData = getBloodPressureStatus(userData.systolic, userData.diastolic);

  const shouldShowMeasurement = (type) => {
    // If checklist exists, use it
    if (userData.checklist && Array.isArray(userData.checklist)) {
      // Handle special case for max30102 which covers heart rate, spo2, respiratory
      if (type === 'heartrate' || type === 'spo2' || type === 'respiratory') {
        return userData.checklist.includes('max30102');
      }
      return userData.checklist.includes(type);
    }

    // Fallback: check if data exists
    switch (type) {
      case 'bmi': return !!userData.weight && !!userData.height;
      case 'bodytemp': return !!userData.temperature && userData.temperature !== 'N/A';
      case 'max30102':
      case 'heartrate':
      case 'spo2':
      case 'respiratory':
        return !!userData.heartRate && userData.heartRate !== 'N/A';
      case 'bloodpressure': return !!userData.systolic && !!userData.diastolic;
      default: return true;
    }
  };

  return (
    <div
      className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 result-container"
      style={{ background: getRiskGradient(riskLevel) }}
    >
      <div
        className={`card border-0 shadow-lg p-4 p-md-5 mx-3 result-content page-transition`}
        style={{ boxShadow: getRiskGlow(riskLevel) }}
      >

        {/* Header */}
        <div className="text-center mb-5 result-header">
          <div className="badge bg-white text-dark shadow-sm px-3 py-2 rounded-pill mb-3 d-inline-flex align-items-center gap-2">
            <span className="fs-5">🤖</span>
            <span className="fw-bold">AI-Powered Health Assessment</span>
          </div>
          <h1 className="fw-bold mb-2">Health Assessment Complete</h1>
          <p className="text-muted fs-5">
            Comprehensive analysis of your vital signs using advanced AI algorithms
          </p>
        </div>

        {/* AI Result Score */}
        <div className="mb-5 risk-score-section">
          <div className="card border-0 text-white mb-4 risk-score-card" style={{ background: getRiskGradient(riskLevel) }}>
            <div className="card-body p-4 text-center">
              <div className="display-1 fw-bold mb-1">{riskLevel}%</div>
              <div className="h3 mb-4">{riskCategory}</div>

              <div className="risk-meter mb-2 position-relative" style={{ height: '30px', background: 'rgba(0,0,0,0.2)', borderRadius: '15px' }}>
                <div
                  className="position-absolute top-0 start-0 h-100 bg-white"
                  style={{
                    width: `${riskLevel}%`,
                    borderRadius: '15px',
                    transition: 'width 1s ease-out'
                  }}
                ></div>
              </div>
              <div className="d-flex justify-content-between text-white-50 small fw-bold px-1">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
                <span>75%</span>
                <span>100%</span>
              </div>
            </div>
          </div>

          {/* Risk Ranges Subtitle */}
          <div className="text-center">
            <h3 className="h5 fw-bold text-muted mb-3">Risk Level Interpretation</h3>
            <div className="row g-2 justify-content-center">
              <div className="col-6 col-md-3">
                <div className="p-2 rounded bg-light border d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 12, height: 12, background: '#10b981' }}></span>
                    <span className="small fw-bold">Low</span>
                  </div>
                  <span className="small text-muted">0-19%</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 rounded bg-light border d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 12, height: 12, background: '#f59e0b' }}></span>
                    <span className="small fw-bold">Moderate</span>
                  </div>
                  <span className="small text-muted">20-49%</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 rounded bg-light border d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 12, height: 12, background: '#ef4444' }}></span>
                    <span className="small fw-bold">High</span>
                  </div>
                  <span className="small text-muted">50-74%</span>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="p-2 rounded bg-light border d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-2">
                    <span className="d-inline-block rounded-circle" style={{ width: 12, height: 12, background: '#dc2626' }}></span>
                    <span className="small fw-bold">Critical</span>
                  </div>
                  <span className="small text-muted">75-100%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Information with BMI */}
        <div className="mb-5 personal-info-section">
          <h2 className="h4 fw-bold mb-3 border-bottom pb-2">Personal Information</h2>
          <div className="card border-0 bg-light p-3">
            <div className="row align-items-center">
              <div className="col-12 col-md-6 d-flex align-items-center gap-3 mb-3 mb-md-0">
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 60, height: 60, fontSize: '1.5rem' }}>
                  👤
                </div>
                <div>
                  <h3 className="h5 fw-bold mb-1">
                    {userData.firstName ?? '--'} {userData.middleName ? userData.middleName + ' ' : ''}
                    {userData.lastName ?? ''} {userData.suffix ?? ''}
                  </h3>
                  <div className="text-muted small">
                    <span className="me-3">{userData.age ?? '--'} years old</span>
                    <span>{userData.sex ? userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1).toLowerCase() : 'N/A'}</span>
                  </div>
                </div>
              </div>

              {shouldShowMeasurement('bmi') && (
                <div className="col-12 col-md-6 border-start-md ps-md-4">
                  <div className="d-flex align-items-center justify-content-between mb-2">
                    <div className="d-flex align-items-center gap-2">
                      <span className="fs-5">⚖️</span>
                      <h4 className="h6 fw-bold mb-0">Body Mass Index</h4>
                    </div>
                    <span className="badge bg-white border text-dark">{calculateBMI(userData) ?? 'N/A'}</span>
                  </div>
                  <div className="d-flex align-items-center justify-content-between">
                    <span className="fw-bold" style={{ color: bmiData.color }}>{bmiData.status}</span>
                    <span className="small text-muted">Range: 18.5 - 24.9</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Health Assessment - Updated Vital Signs */}
        <div className="mb-5 health-assessment-section">
          <h2 className="h4 fw-bold mb-3 border-bottom pb-2">Vital Signs Assessment</h2>
          <div className="row g-3">
            {/* Body Temperature */}
            {shouldShowMeasurement('bodytemp') && (
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 bg-light p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fs-4">🌡️</span>
                    <h3 className="h6 fw-bold mb-0">Temperature</h3>
                  </div>
                  <div className="display-6 fw-bold mb-1">{userData.temperature ?? '--'}°C</div>
                  <div className="fw-bold mb-1" style={{ color: tempData.color }}>
                    {tempData.status}
                  </div>
                  <div className="small text-muted">Normal: 36.0 - 37.5°C</div>
                </div>
              </div>
            )}

            {/* Heart Rate */}
            {(shouldShowMeasurement('max30102') || shouldShowMeasurement('heartrate')) && (
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 bg-light p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fs-4">💓</span>
                    <h3 className="h6 fw-bold mb-0">Heart Rate</h3>
                  </div>
                  <div className="display-6 fw-bold mb-1">{userData.heartRate ?? '--'} <span className="fs-6 text-muted">BPM</span></div>
                  <div className="fw-bold mb-1" style={{ color: hrData.color }}>
                    {hrData.status}
                  </div>
                  <div className="small text-muted">Normal: 60 - 100 BPM</div>
                </div>
              </div>
            )}

            {/* Respiratory Rate with SPO2 */}
            {(shouldShowMeasurement('max30102') || shouldShowMeasurement('spo2')) && (
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 bg-light p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fs-4">🌬️</span>
                    <div className="w-100">
                      <h3 className="h6 fw-bold mb-0 d-flex justify-content-between">
                        Respiratory
                      </h3>
                    </div>
                  </div>
                  <div className="display-6 fw-bold mb-1">{userData.respiratoryRate ?? '--'} <span className="fs-6 text-muted">/min</span></div>

                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold" style={{ color: respData.color }}>{respData.status}</span>
                    <span className="badge bg-white border text-dark">SpO2: {userData.spo2 ?? '--'}%</span>
                  </div>
                  <div className="small text-muted">Normal: 12 - 20 BPM</div>
                </div>
              </div>
            )}

            {/* Blood Pressure */}
            {shouldShowMeasurement('bloodpressure') && (
              <div className="col-12 col-md-6 col-lg-3">
                <div className="card h-100 border-0 bg-light p-3">
                  <div className="d-flex align-items-center gap-2 mb-2">
                    <span className="fs-4">🩸</span>
                    <h3 className="h6 fw-bold mb-0">Blood Pressure</h3>
                  </div>
                  <div className="display-6 fw-bold mb-1">
                    {userData.systolic && userData.diastolic ?
                      `${userData.systolic}/${userData.diastolic}` : '--/--'}
                  </div>
                  <div className="fw-bold mb-1" style={{ color: bpData.color }}>
                    {bpData.status}
                  </div>
                  <div className="small text-muted">Normal: &lt;120/&lt;80</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sub Features - Collapsible Sections */}
        <div className="mb-5 sub-features-section">
          <h2 className="h4 fw-bold mb-3 border-bottom pb-2">AI Recommendations & Guidance</h2>
          <div className="d-flex flex-column gap-3">

            {/* Medical Action Recommendations */}
            <div className={`card border-0 shadow-sm ${expandedSections.recommendations ? 'bg-light' : ''}`}>
              <div
                className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('recommendations')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-4">🩺</span>
                  <span className="fw-bold">Medical Action Recommendations</span>
                </div>
                <span className="fs-4 text-muted">{expandedSections.recommendations ? '−' : '+'}</span>
              </div>
              {expandedSections.recommendations && (
                <div className="card-body pt-0">
                  <div className="ps-4 ms-2 border-start border-3 border-danger">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="mb-2 d-flex gap-2">
                        <span className="fw-bold text-danger">{index + 1}.</span>
                        <span>{suggestion}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preventive Strategy Plans */}
            <div className={`card border-0 shadow-sm ${expandedSections.prevention ? 'bg-light' : ''}`}>
              <div
                className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('prevention')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-4">🛡️</span>
                  <span className="fw-bold">Preventive Strategy Plans</span>
                </div>
                <span className="fs-4 text-muted">{expandedSections.prevention ? '−' : '+'}</span>
              </div>
              {expandedSections.prevention && (
                <div className="card-body pt-0">
                  <div className="ps-4 ms-2 border-start border-3 border-success">
                    {preventions.map((prevention, index) => (
                      <div key={index} className="mb-2 d-flex gap-2">
                        <span className="text-success">🛡️</span>
                        <span>{prevention}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wellness Improvement Tips */}
            <div className={`card border-0 shadow-sm ${expandedSections.wellness ? 'bg-light' : ''}`}>
              <div
                className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('wellness')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-4">💪</span>
                  <span className="fw-bold">Wellness Improvement Tips</span>
                </div>
                <span className="fs-4 text-muted">{expandedSections.wellness ? '−' : '+'}</span>
              </div>
              {expandedSections.wellness && (
                <div className="card-body pt-0">
                  <div className="ps-4 ms-2 border-start border-3 border-warning">
                    {wellnessTips.map((tip, index) => (
                      <div key={index} className="mb-2 d-flex gap-2">
                        <span className="fw-bold text-warning">{index + 1}.</span>
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Healthcare Provider Guidance */}
            <div className={`card border-0 shadow-sm ${expandedSections.guidance ? 'bg-light' : ''}`}>
              <div
                className="card-header bg-white border-0 py-3 d-flex align-items-center justify-content-between cursor-pointer"
                onClick={() => toggleSection('guidance')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <span className="fs-4">👨‍⚕️</span>
                  <span className="fw-bold">Healthcare Provider Guidance</span>
                </div>
                <span className="fs-4 text-muted">{expandedSections.guidance ? '−' : '+'}</span>
              </div>
              {expandedSections.guidance && (
                <div className="card-body pt-0">
                  <div className="p-3 bg-white rounded border d-flex gap-3 align-items-start">
                    <span className="fs-1">🏥</span>
                    <div>
                      <h4 className="h6 fw-bold mb-1">Standard Medical Protocol</h4>
                      <p className="mb-0 small text-muted">
                        {providerGuidance.length > 0 ? providerGuidance[0] : "Please consult a healthcare professional for a detailed assessment."}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="d-flex gap-3 justify-content-center w-100">
          <button
            className="continue-button"
            onClick={handleSaveResults}
            style={{ maxWidth: '500px' }}
          >
            Save & Share Results
          </button>
        </div>

      </div>
    </div>
  );
}