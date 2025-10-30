import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./BloodPressure.css";
import bpIcon from "../../../assets/icons/bp-icon.png";
import { sensorAPI } from "../../../utils/api";

export default function BloodPressure() {
  const navigate = useNavigate();
  const location = useLocation();
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [liveReading, setLiveReading] = useState("");
  const [isReady, setIsReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const MAX_RETRIES = 3;

  const pollerRef = useRef(null);
  const autoStartRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeBloodPressureSensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      if (autoStartRef.current) clearTimeout(autoStartRef.current);
    };
  }, []);

  const initializeBloodPressureSensor = async () => {
    try {
      setStatusMessage("Powering up blood pressure sensor...");
      const prepareResult = await sensorAPI.prepareBloodPressure();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      setStatusMessage("Blood pressure sensor ready. Please sit still...");
      startMonitoring();
      
    } catch (error) {
      console.error("Blood pressure initialization error:", error);
      setStatusMessage("❌ Failed to initialize blood pressure sensor");
      handleRetry();
    }
  };

  const startMonitoring = () => {
    stopMonitoring();
    
    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getBloodPressureStatus();
        console.log("Blood pressure status:", data);
        
        setIsMeasuring(data.measurement_active);
        setIsReady(data.is_ready_for_measurement);
        
        // Update live reading
        if (data.live_pressure !== null && data.live_pressure !== undefined) {
          setLiveReading(data.live_pressure.toFixed(0));
          
          // Auto-start measurement when pressure is valid and not already measuring
          if (data.live_pressure >= data.ready_threshold && 
              !data.measurement_active && 
              !measurementComplete) {
            setStatusMessage(`✅ Valid pressure detected. Starting measurement...`);
            
            // Clear any existing auto-start timeout
            if (autoStartRef.current) clearTimeout(autoStartRef.current);
            
            // Start measurement after short delay
            autoStartRef.current = setTimeout(() => {
              startMeasurement();
            }, 1000);
          } else if (data.live_pressure < data.ready_threshold && !data.measurement_active) {
            setStatusMessage(`Calibrating... Please remain still`);
          }
        }

        // Handle progress during active measurement
        if (data.status && data.status.includes('bp_progress')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = parseInt(progressParts[2]);
          const progressPercent = (elapsed / total) * 100;
          setProgress(progressPercent);
          setStatusMessage(`Measuring blood pressure... ${total - elapsed}s`);
        }
        
        // Handle final result
        if (data.systolic !== null && data.systolic !== undefined && 
            data.diastolic !== null && data.diastolic !== undefined) {
          if (data.systolic >= 60 && data.systolic <= 250 && 
              data.diastolic >= 40 && data.diastolic <= 150) {
            // Valid blood pressure received
            setSystolic(data.systolic.toFixed(0));
            setDiastolic(data.diastolic.toFixed(0));
            setMeasurementComplete(true);
            setStatusMessage("✅ Blood Pressure Measurement Complete!");
            setProgress(100);
            stopMonitoring();
          } else {
            // Invalid blood pressure, retry
            setStatusMessage("❌ Invalid blood pressure reading, retrying...");
            handleRetry();
          }
        }

        // Handle status messages
        switch (data.status) {
          case 'bp_measurement_started':
            setStatusMessage("Measuring blood pressure...");
            break;
          case 'bp_measurement_complete':
            // Handled above with data.systolic/diastolic check
            break;
          case 'error':
          case 'bp_reading_invalid':
            setStatusMessage("❌ Measurement failed, retrying...");
            handleRetry();
            break;
          default:
            // Show sensor status
            if (data.sensor_prepared && !data.measurement_active && !measurementComplete) {
              if (!data.live_pressure) {
                setStatusMessage("Sensor active, waiting for reading...");
              }
            }
            break;
        }

      } catch (error) {
        console.error("Error polling blood pressure status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("Starting blood pressure measurement...");
      const response = await sensorAPI.startBloodPressure();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        handleRetry();
      } else {
        setStatusMessage("Blood pressure measurement started...");
      }
    } catch (error) {
      console.error("Start blood pressure error:", error);
      setStatusMessage("❌ Failed to start measurement");
      handleRetry();
    }
  };

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      
      setTimeout(() => {
        initializeBloodPressureSensor();
      }, 2000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the sensor.");
    }
  };

  const stopMonitoring = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
  };

  // ✅ CORRECTED: Navigation to AILoading with proper path
  const handleContinue = () => {
    stopMonitoring();
    
    // Prepare complete data to pass to AILoading
    const completeVitalSignsData = {
      ...location.state, // This includes all previous data (BMI, temperature, pulse oximeter)
      weight: location.state?.weight,
      height: location.state?.height,
      temperature: location.state?.temperature,
      heartRate: location.state?.heartRate,
      spo2: location.state?.spo2,
      respiratoryRate: location.state?.respiratoryRate,
      systolic: systolic ? parseFloat(systolic) : 120, // Default values for testing
      diastolic: diastolic ? parseFloat(diastolic) : 80, // Default values for testing
      measurementTimestamp: new Date().toISOString()
    };
    
    console.log("🚀 Continuing to AI Loading with complete data:", completeVitalSignsData);
    
    // ✅ Navigate to AILoading component
    navigate("/measure/ai-loading", { 
      state: completeVitalSignsData 
    });
  };

  // ✅ NEW: Manual test button handler
  const handleTestNavigation = () => {
    console.log("🧪 Testing navigation to AILoading...");
    
    // Create test data with all required fields
    const testData = {
      ...location.state,
      weight: location.state?.weight || 70,
      height: location.state?.height || 170,
      temperature: location.state?.temperature || 36.5,
      heartRate: location.state?.heartRate || 75,
      spo2: location.state?.spo2 || 98.0,
      respiratoryRate: location.state?.respiratoryRate || 16,
      systolic: 120,
      diastolic: 80,
      measurementTimestamp: new Date().toISOString()
    };
    
    console.log("🧪 Test data for AILoading:", testData);
    
    navigate("/measure/ai-loading", { 
      state: testData 
    });
  };

  const getBloodPressureStatus = (sys, dia) => {
    if (!sys || !dia || sys === "--" || dia === "--") {
      return { text: "Not measured", class: "default", category: "No measurement" };
    }
    
    const systolicValue = parseInt(sys);
    const diastolicValue = parseInt(dia);
    
    if (systolicValue >= 180 || diastolicValue >= 120) {
      return { text: "Hypertensive Crisis", class: "hypertensive-crisis", category: "Seek emergency care" };
    } else if (systolicValue >= 140 || diastolicValue >= 90) {
      return { text: "Hypertension Stage 2", class: "hypertension-stage2", category: "High blood pressure" };
    } else if (systolicValue >= 130 || diastolicValue >= 80) {
      return { text: "Hypertension Stage 1", class: "hypertension-stage1", category: "Elevated" };
    } else if (systolicValue >= 120) {
      return { text: "Elevated", class: "elevated", category: "Monitor regularly" };
    } else {
      return { text: "Normal", class: "normal", category: "Healthy range" };
    }
  };

  const statusInfo = getBloodPressureStatus(systolic, diastolic);

  return (
    <div className="bloodpressure-container">
      <div className={`bloodpressure-content ${isVisible ? 'visible' : ''}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `100%` }}></div>
          </div>
          <span className="progress-step">Step 4 of 4 - Vital Signs</span>
        </div>

        <div className="bloodpressure-header">
          <h1 className="bloodpressure-title">Blood Pressure</h1>
          <p className="bloodpressure-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {isMeasuring && progress > 0 && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <span className="progress-text">{Math.round(progress)}%</span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          {/* Single BP Icon Display */}
          <div className="bp-icon-container">
            <img src={bpIcon} alt="Blood Pressure Icon" className="bp-main-icon"/>
            <div className="bp-icon-label">Blood Pressure Monitor</div>
          </div>

          <div className="bp-cards-container">
            {/* Systolic Card */}
            <div className="measurement-card bp-card">
              <div className="measurement-info">
                <h3>Systolic</h3>
                <div className="measurement-value">
                  <span className="value">
                    {isMeasuring && liveReading ? liveReading : systolic || "--"}
                  </span>
                  <span className="unit">mmHg</span>
                </div>
                <span className="measurement-status default">
                  {systolic ? "Measured" : "Waiting"}
                </span>
              </div>
            </div>

            {/* Diastolic Card */}
            <div className="measurement-card bp-card">
              <div className="measurement-info">
                <h3>Diastolic</h3>
                <div className="measurement-value">
                  <span className="value">
                    {diastolic || "--"}
                  </span>
                  <span className="unit">mmHg</span>
                </div>
                <span className="measurement-status default">
                  {diastolic ? "Measured" : "Waiting"}
                </span>
              </div>
            </div>
          </div>

          {/* Blood Pressure Status Overview */}
          {measurementComplete && (
            <div className="bp-status-overview">
              <div className="bp-overall-status">
                Overall: <span className={`measurement-status ${statusInfo.class}`}>
                  {statusInfo.text}
                </span>
              </div>
              <div className="bp-category-info">
                {statusInfo.category}
              </div>
            </div>
          )}
        </div>

        <div className="measurement-controls">
          {!isMeasuring && !measurementComplete && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>
                {liveReading && liveReading < 50 
                  ? `Applying pressure... (${liveReading}mmHg)` 
                  : "Preparing blood pressure cuff..."}
              </span>
            </div>
          )}
          {measurementComplete && (
            <span className="success-text">✓ Blood Pressure Measured</span>
          )}
        </div>

        <div className="continue-button-container">
          {/* Main Continue Button */}
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete || !systolic || !diastolic}
          >
            <span className="button-icon">🤖</span>
            View Complete AI Results
            <span style={{fontSize: '0.8rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
              BP: {systolic || '--'}/{diastolic || '--'} mmHg
            </span>
          </button>

          {/* ✅ NEW: Test Navigation Button - Always Enabled */}
          <button 
            className="test-button" 
            onClick={handleTestNavigation}
            style={{
              marginTop: '15px',
              backgroundColor: '#8B5CF6',
              color: 'white',
              border: 'none',
              padding: '12px 24px',
              borderRadius: '12px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              width: '100%',
              boxShadow: '0 4px 12px rgba(139, 92, 246, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.target.style.backgroundColor = '#7C3AED'}
            onMouseOut={(e) => e.target.style.backgroundColor = '#8B5CF6'}
          >
            <span className="button-icon">🧪</span>
            Test Navigation to AI Loading
            <span style={{fontSize: '0.7rem', display: 'block', marginTop: '5px', opacity: 0.9}}>
              Click to test if navigation works
            </span>
          </button>
          
          {/* Debug info */}
          <div style={{ 
            marginTop: '10px', 
            fontSize: '0.7rem', 
            color: '#666',
            textAlign: 'center',
            padding: '5px',
            background: '#f5f5f5',
            borderRadius: '5px',
            fontFamily: 'monospace'
          }}>
            Status: {measurementComplete ? '✅ COMPLETE' : '⏳ MEASURING'} | 
            Next: /measure/ai-loading |
            Test Button: 🟢 ENABLED
          </div>
        </div>
      </div>
    </div>
  );
}