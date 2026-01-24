import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Result.css";
import { speak } from "../../../utils/speech";
import {
  getHeartRateStatus as getHeartRateStatusUtil,
  getSPO2Status as getSPO2StatusUtil,
  getRespiratoryStatus as getRespiratoryStatusUtil,
  getBloodPressureStatus as getBloodPressureStatusUtil
} from "../../../utils/healthStatus";

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

  const getRiskGradient = (level) => {
    if (level < 20) return "linear-gradient(135deg, #10b981 0%, #34d399 100%)"; // Green (Normal)
    if (level < 50) return "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"; // Orange/Yellow (Moderate)
    if (level < 75) return "linear-gradient(135deg, #f97316 0%, #fb923c 100%)"; // Dark Orange (High)
    return "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)"; // Red (Critical)
  };

  const getRiskGlow = (level) => {
    if (level < 20) return "0 0 40px rgba(16, 185, 129, 0.4)";
    if (level < 50) return "0 0 40px rgba(245, 158, 11, 0.4)";
    if (level < 75) return "0 0 40px rgba(249, 115, 22, 0.4)";
    return "0 0 50px rgba(220, 38, 38, 0.6)";
  };

  // --- UPDATED VITAL SIGN STATUS HELPERS (Strict User Thresholds) ---

  const getBMICategory = (bmi) => {
    if (!bmi) return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    if (bmi < 18.5) return { status: 'Underweight', color: '#3b82f6', range: '< 18.5' };
    if (bmi < 25) return { status: 'Normal', color: '#10b981', range: '18.5 - 24.9' };
    if (bmi < 30) return { status: 'Overweight', color: '#f59e0b', range: '25.0 - 29.9' };
    return { status: 'Obese', color: '#dc2626', range: '≥ 30.0' };
  };

  const getTemperatureStatus = (temp) => {
    if (!temp || temp === 'N/A') return { status: 'Not Measured', color: '#6b7280', range: 'N/A' };
    const tempNum = parseFloat(temp);
    if (isNaN(tempNum)) return { status: 'Invalid', color: '#6b7280', range: 'N/A' };

    // <35.0 = Low/Hypothermia (Critical)
    if (tempNum < 35.0) return { status: 'Hypothermia', color: '#dc2626', range: '< 35.0°C' };
    // 35.0 - 37.2 = Normal
    if (tempNum <= 37.2) return { status: 'Normal', color: '#10b981', range: '35.0 - 37.2°C' };
    // 37.3 - 38.0 = Slight Fever
    if (tempNum <= 38.0) return { status: 'Slight Fever', color: '#f59e0b', range: '37.3 - 38.0°C' };
    // >38.0 = Critical
    return { status: 'Critical Fever', color: '#dc2626', range: '> 38.0°C' };
  };

  const getHeartRateStatus = (hr) => {
    const s = getHeartRateStatusUtil(hr);
    return { status: s.label, color: s.color, range: s.range, description: s.description };
  };

  const getSPO2Status = (spo2) => {
    const s = getSPO2StatusUtil(spo2);
    return { status: s.label, color: s.color, range: s.range, description: s.description };
  };

  const getRespiratoryStatus = (rr) => {
    const s = getRespiratoryStatusUtil(rr);
    return { status: s.label, color: s.color, range: s.range, description: s.description };
  };

  const getBloodPressureStatus = (sys, dia) => {
    const s = getBloodPressureStatusUtil(sys, dia);
    return { status: s.label, color: s.color, range: s.range, description: s.description };
  };

  useEffect(() => {
    // 1. Try to get data from Navigation State (Primary)
    let data = location.state;

    // 2. Fallback: Try Session Storage
    if (!data) {
      const stored = sessionStorage.getItem('vitalSignsData');
      if (stored) {
        try {
          data = JSON.parse(stored);
        } catch (e) {
          console.error("Failed to parse stored vital signs", e);
        }
      }
    }

    if (data) {
      console.log("📊 Result Page Received Data:", data);
      setUserData(data);

      // Extract AI Results
      if (data.riskLevel !== undefined) setRiskLevel(data.riskLevel);
      if (data.riskCategory) setRiskCategory(data.riskCategory);

      // Extract Recommendations (if present from AI)
      if (data.resultRecommendations) {
        const recs = data.resultRecommendations;
        if (recs.medical_actions) setSuggestions(recs.medical_actions);
        if (recs.preventive_strategies) setPreventions(recs.preventive_strategies);
        if (recs.wellness_tips) setWellnessTips(recs.wellness_tips);
        if (recs.provider_guidance) setProviderGuidance(recs.provider_guidance);
      }

      speak("Here are your health assessment results.");
    } else {
      console.warn("⚠️ No data found for Result page.");
    }
  }, [location.state]);

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

      // --- EXPERT DATASET PARAMETERS (Explicitly Requested) ---
      age: userData.age,
      // Calculate Age Group for consistency (0:18-24, 1:25-39, 2:40-59, 3:60+)
      age_group: (() => {
        const a = parseInt(userData.age || 30);
        if (a >= 60) return 3;
        if (a >= 40) return 2;
        if (a >= 25) return 1;
        return 0;
      })(),
      gender: userData.sex || 'Male',
      bmi: calculateBMI(userData),
      temp: parseFloat(userData.temperature || 0),
      spo2: parseFloat(userData.spo2 || 0),
      hr: parseFloat(userData.heartRate || 0),
      systolic: parseFloat(userData.systolic || 0),
      diastolic: parseFloat(userData.diastolic || 0),
      rr: parseFloat(userData.respiratoryRate || 0),
      risk_score: riskLevel,
      // Ensure "Normal" is saved as "Low Risk" per requirement
      risk_label: (riskCategory === 'Normal' || riskCategory === 'Low') ? 'Low Risk' : riskCategory,
      riskCategory: (riskCategory === 'Normal' || riskCategory === 'Low') ? 'Low Risk' : riskCategory,

      // Legacy/UI specific fields
      bloodPressure: userData.systolic && userData.diastolic ?
        `${userData.systolic}/${userData.diastolic}` : 'N/A',

      // UI Status Helpers
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
      className="container-fluid d-flex justify-content-center min-vh-100 p-0 result-container py-5"
      style={{ background: getRiskGradient(riskLevel), overflowY: 'auto' }}
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

              <h2 className="display-1 fw-bold mb-0 risk-score-value">{riskLevel}%</h2>
              <h3 className="h2 mb-3 risk-score-label">{riskCategory}</h3>

              {/* Active Parameters Count */}
              {userData.aiAnalysis?.confidence_metrics && (
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginBottom: '20px' }}>
                  <small>
                    Analysis based on {userData.aiAnalysis.confidence_metrics.total_parameters_used ||
                      (userData.aiAnalysis.confidence_metrics.active_sensors_count + 3)} parameters
                    {userData.aiAnalysis.confidence_metrics.max_parameters &&
                      ` of ${userData.aiAnalysis.confidence_metrics.max_parameters}`
                    }
                  </small>
                </div>
              )}

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
            <div className="card border-0 shadow-sm overflow-hidden">
              <div
                className="card-header bg-white border-0 py-4 d-flex align-items-center justify-content-between cursor-pointer transition-all hover-bg-light"
                onClick={() => toggleSection('recommendations')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-box bg-danger bg-opacity-10 text-danger rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    <span className="fs-4">🩺</span>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Medical Actions</h5>
                    <small className="text-muted">Immediate steps</small>
                  </div>
                </div>
                <span className={`transition-transform fs-4 text-muted ${expandedSections.recommendations ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {expandedSections.recommendations && (
                <div className="card-body bg-white pt-2 pb-4 px-4">
                  <div className="d-flex flex-column gap-2">
                    {suggestions.map((suggestion, index) => (
                      <div key={index} className="p-3 rounded-3 bg-light d-flex align-items-start gap-3">
                        <span className="fw-bold text-danger fs-5 mt-1">{index + 1}.</span>
                        <p className="mb-0 text-dark fw-medium">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Preventive Strategy Plans */}
            <div className="card border-0 shadow-sm overflow-hidden">
              <div
                className="card-header bg-white border-0 py-4 d-flex align-items-center justify-content-between cursor-pointer transition-all hover-bg-light"
                onClick={() => toggleSection('prevention')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-box bg-success bg-opacity-10 text-success rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    <span className="fs-4">🛡️</span>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Preventive Strategy</h5>
                    <small className="text-muted">Long-term care</small>
                  </div>
                </div>
                <span className={`transition-transform fs-4 text-muted ${expandedSections.prevention ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {expandedSections.prevention && (
                <div className="card-body bg-white pt-2 pb-4 px-4">
                  <div className="d-flex flex-column gap-2">
                    {preventions.map((prevention, index) => (
                      <div key={index} className="p-3 rounded-3 bg-light d-flex align-items-start gap-3">
                        <div className="mt-1 text-success">
                          <span className="fs-5">✓</span>
                        </div>
                        <p className="mb-0 text-dark fw-medium">{prevention}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Wellness Improvement Tips */}
            <div className="card border-0 shadow-sm overflow-hidden">
              <div
                className="card-header bg-white border-0 py-4 d-flex align-items-center justify-content-between cursor-pointer transition-all hover-bg-light"
                onClick={() => toggleSection('wellness')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-box bg-warning bg-opacity-10 text-warning rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    <span className="fs-4">💪</span>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Wellness Tips</h5>
                    <small className="text-muted">Daily habits</small>
                  </div>
                </div>
                <span className={`transition-transform fs-4 text-muted ${expandedSections.wellness ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {expandedSections.wellness && (
                <div className="card-body bg-white pt-2 pb-4 px-4">
                  <div className="d-flex flex-column gap-2">
                    {wellnessTips.map((tip, index) => (
                      <div key={index} className="p-3 rounded-3 bg-light d-flex align-items-start gap-3">
                        <span className="fw-bold text-warning fs-5 mt-1">{index + 1}.</span>
                        <p className="mb-0 text-dark fw-medium">{tip}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Healthcare Provider Guidance */}
            <div className="card border-0 shadow-sm overflow-hidden">
              <div
                className="card-header bg-white border-0 py-4 d-flex align-items-center justify-content-between cursor-pointer transition-all hover-bg-light"
                onClick={() => toggleSection('guidance')}
                style={{ cursor: 'pointer' }}
              >
                <div className="d-flex align-items-center gap-3">
                  <div className="icon-box bg-primary bg-opacity-10 text-primary rounded-circle p-2 d-flex align-items-center justify-content-center" style={{ width: 48, height: 48 }}>
                    <span className="fs-4">👨‍⚕️</span>
                  </div>
                  <div>
                    <h5 className="fw-bold mb-0 text-dark">Provider Guidance</h5>
                    <small className="text-muted">Medical protocol</small>
                  </div>
                </div>
                <span className={`transition-transform fs-4 text-muted ${expandedSections.guidance ? 'rotate-180' : ''}`}>▼</span>
              </div>

              {expandedSections.guidance && (
                <div className="card-body bg-white pt-2 pb-4 px-4">
                  <div className="p-4 rounded-3 bg-light motion-safe-animate-slide-up">
                    <div className="d-flex gap-3 align-items-start">
                      <span className="fs-2 text-primary">🏥</span>
                      <div className="w-100">
                        <h6 className="fw-bold text-dark mb-2">Standard Medical Protocol</h6>
                        <p className="mb-0 text-secondary text-wrap text-break">
                          {providerGuidance.length > 0 ? providerGuidance[0] : "Please consult a healthcare professional for a detailed assessment."}
                        </p>
                      </div>
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