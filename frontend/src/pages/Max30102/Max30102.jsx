import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../assets/icons/respiratory-icon.png";
import { sensorAPI } from "../../utils/api";

export default function Max30102() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isMeasuring, setIsMeasuring] = useState(false);
  const [measurementComplete, setMeasurementComplete] = useState(false);
  const [fingerDetected, setFingerDetected] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Initializing...");
  const [measurements, setMeasurements] = useState({
    heartRate: "--",
    spo2: "--.-",
    respiratoryRate: "--"
  });
  const [progressSeconds, setProgressSeconds] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [sensorReady, setSensorReady] = useState(false);
  
  // 5-second average data for 60 seconds (12 blocks)
  const [fiveSecondAverages, setFiveSecondAverages] = useState(
    Array(12).fill().map(() => ({
      heartRate: null,
      spo2: null,
      respiratoryRate: null,
      timeIndex: 0
    }))
  );

  const pollerRef = useRef(null);
  const fingerCheckRef = useRef(null);
  const initializationRef = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    initializeMax30102Sensor();

    return () => {
      clearTimeout(timer);
      stopMonitoring();
      if (fingerCheckRef.current) clearInterval(fingerCheckRef.current);
    };
  }, []);

  const initializeMax30102Sensor = async () => {
    if (initializationRef.current) return;
    initializationRef.current = true;

    try {
      setStatusMessage("🔄 Powering up pulse oximeter...");
      
      const prepareResult = await sensorAPI.prepareMax30102();
      
      if (prepareResult.error) {
        setStatusMessage(`❌ ${prepareResult.error}`);
        handleRetry();
        return;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setStatusMessage("✅ Pulse oximeter ready. Place finger on sensor...");
      setSensorReady(true);
      
      startFingerMonitoring();
      
    } catch (error) {
      console.error("MAX30102 initialization error:", error);
      setStatusMessage("❌ Failed to initialize pulse oximeter");
      handleRetry();
    }
  };

  const startFingerMonitoring = () => {
    stopMonitoring();
    
    fingerCheckRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        setFingerDetected(data.finger_detected);
        setSensorReady(data.sensor_prepared || false);
        
        if (data.finger_detected && data.sensor_prepared && !data.measurement_active && !measurementComplete) {
          setStatusMessage("✅ Finger detected. Starting measurement...");
          clearInterval(fingerCheckRef.current);
          setTimeout(() => {
            startMeasurement();
          }, 1000);
        }
        
        if (!data.measurement_active && !measurementComplete) {
          if (data.finger_detected) {
            setStatusMessage("✅ Finger detected. Starting measurement...");
          } else if (data.sensor_prepared) {
            setStatusMessage("👆 Place finger on the sensor to begin...");
          } else {
            setStatusMessage("🔄 Sensor initializing...");
          }
        }
        
      } catch (error) {
        console.error("Error checking finger status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);

    startMainPolling();
  };

  const startMainPolling = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
    }

    pollerRef.current = setInterval(async () => {
      try {
        const data = await sensorAPI.getMax30102Status();
        
        setIsMeasuring(data.measurement_active);
        setSensorReady(data.sensor_prepared || false);
        
        // Update progress for 60-second measurement
        if (data.status && data.status.includes('hr_progress')) {
          const progressParts = data.status.split(':');
          const elapsed = parseInt(progressParts[1]);
          const total = 60;
          const progressPercent = (elapsed / total) * 100;
          setProgressPercent(progressPercent);
          setProgressSeconds(elapsed);
          setStatusMessage(`📊 Measuring... ${60 - elapsed}s remaining`);
        }
        
        // Update current measurements in real-time
        if (data.heart_rate !== null && data.heart_rate !== undefined && data.heart_rate > 0) {
          setMeasurements(prev => ({ ...prev, heartRate: Math.round(data.heart_rate) }));
        }
        if (data.spo2 !== null && data.spo2 !== undefined && data.spo2 > 0) {
          setMeasurements(prev => ({ ...prev, spo2: data.spo2.toFixed(1) }));
        }
        if (data.respiratory_rate !== null && data.respiratory_rate !== undefined && data.respiratory_rate > 0) {
          setMeasurements(prev => ({ ...prev, respiratoryRate: Math.round(data.respiratory_rate) }));
        }

        // Handle completion
        if (data.status === 'hr_measurement_complete') {
          if (data.heart_rate && data.heart_rate > 40 && data.spo2 && data.spo2 > 70) {
            setMeasurementComplete(true);
            setStatusMessage("✅ 60-Second Measurement Complete!");
            setProgressPercent(100);
            stopMonitoring();
          } else {
            setStatusMessage("❌ Invalid readings, retrying...");
            handleRetry();
          }
        } else if (data.status === 'error' || data.status === 'hr_reading_failed') {
          setStatusMessage("❌ Measurement failed, retrying...");
          handleRetry();
        }

      } catch (error) {
        console.error("Error polling MAX30102 status:", error);
        setStatusMessage("⚠️ Connection issue, retrying...");
      }
    }, 1000);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("🎬 Starting 60-second vital signs monitoring...");
      
      // Reset 5-second averages
      setFiveSecondAverages(
        Array(12).fill().map(() => ({
          heartRate: null,
          spo2: null,
          respiratoryRate: null,
          timeIndex: 0
        }))
      );
      
      // Reset measurements
      setMeasurements({
        heartRate: "--",
        spo2: "--.-",
        respiratoryRate: "--"
      });
      
      const response = await sensorAPI.startMax30102();
      
      if (response.error) {
        setStatusMessage(`❌ ${response.error}`);
        if (!response.error.includes("Finger not detected")) {
          handleRetry();
        } else {
          startFingerMonitoring();
        }
      } else {
        setStatusMessage("📊 60-second measurement started. Keep finger steady...");
      }
    } catch (error) {
      console.error("Start MAX30102 error:", error);
      setStatusMessage("❌ Failed to start measurement");
      handleRetry();
    }
  };

  // Listen for real-time vital signs data and 5-second averages
  useEffect(() => {
    const handleSerialData = (event) => {
      if (event.detail && event.detail.data) {
        const data = event.detail.data;
        
        // Handle real-time data
        if (data.includes('DATA:VITAL_SIGNS:')) {
          const dataString = data.replace('DATA:VITAL_SIGNS:', '');
          const parts = dataString.split(':');
          const hr = parseFloat(parts[0]);
          const spo2 = parseFloat(parts[1]);
          const rr = parseFloat(parts[2]);
          const timeIndex = parseInt(parts[3]);
          
          // Update current measurements display
          if (hr > 0) {
            setMeasurements(prev => ({ ...prev, heartRate: Math.round(hr) }));
          }
          if (spo2 > 0) {
            setMeasurements(prev => ({ ...prev, spo2: spo2.toFixed(1) }));
          }
          if (rr > 0) {
            setMeasurements(prev => ({ ...prev, respiratoryRate: Math.round(rr) }));
          }
          
          console.log(`Real-time update at ${timeIndex}s: HR=${hr}, SpO2=${spo2}, RR=${rr}`);
        }
        
        // Handle 5-second average data
        else if (data.includes('DATA:5SEC_AVERAGE:')) {
          const dataString = data.replace('DATA:5SEC_AVERAGE:', '');
          const parts = dataString.split(':');
          const hr = parseFloat(parts[0]);
          const spo2 = parseFloat(parts[1]);
          const rr = parseFloat(parts[2]);
          const timeIndex = parseInt(parts[3]);
          
          // Update 5-second averages (12 blocks for 60 seconds)
          const blockIndex = Math.floor(timeIndex / 5) - 1;
          
          if (blockIndex >= 0 && blockIndex < 12) {
            setFiveSecondAverages(prev => {
              const newAverages = [...prev];
              newAverages[blockIndex] = {
                heartRate: hr > 0 ? hr : null,
                spo2: spo2 > 0 ? spo2 : null,
                respiratoryRate: rr > 0 ? rr : null,
                timeIndex: timeIndex
              };
              return newAverages;
            });
            
            console.log(`5-second average at ${timeIndex}s: HR=${hr}, SpO2=${spo2}, RR=${rr}`);
          }
        }
      }
    };

    window.addEventListener('serialData', handleSerialData);
    return () => window.removeEventListener('serialData', handleSerialData);
  }, []);

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1);
      setStatusMessage(`🔄 Retrying... (${retryCount + 1}/${MAX_RETRIES})`);
      initializationRef.current = false;
      
      setTimeout(() => {
        initializeMax30102Sensor();
      }, 3000);
    } else {
      setStatusMessage("❌ Maximum retries reached. Please check the sensor.");
    }
  };

  const stopMonitoring = () => {
    if (pollerRef.current) {
      clearInterval(pollerRef.current);
      pollerRef.current = null;
    }
    if (fingerCheckRef.current) {
      clearInterval(fingerCheckRef.current);
      fingerCheckRef.current = null;
    }
  };

  const handleContinue = () => {
    if (!measurementComplete) return;
    
    stopMonitoring();
    
    const finalData = {
      ...location.state,
      weight: location.state?.weight,
      height: location.state?.height,
      temperature: location.state?.temperature,
      heartRate: parseFloat(measurements.heartRate),
      spo2: parseFloat(measurements.spo2),
      respiratoryRate: parseInt(measurements.respiratoryRate),
      measurementTimestamp: new Date().toISOString(),
      // Include 5-second averages for detailed analysis
      fiveSecondAverages: fiveSecondAverages
    };
    
    navigate("/ai-loading", { state: finalData });
  };

  const getStatusColor = (type, value) => {
    if (value === '--' || value === '--.-') return "default";
    const num = parseFloat(value);
    
    switch (type) {
      case "heartRate":
        if (num < 60) return "low";
        if (num > 100) return "high";
        return "normal";
      case "spo2":
        if (num < 95) return "low";
        return "normal";
      case "respiratoryRate":
        if (num < 12) return "low";
        if (num > 20) return "high";
        return "normal";
      default:
        return "normal";
    }
  };

  const getStatusText = (type, value) => {
    if (value === '--' || value === '--.-') return "Not measured";
    const num = parseFloat(value);
    
    switch (type) {
      case "heartRate":
        if (num < 60) return "Bradycardia";
        if (num > 100) return "Tachycardia";
        return "Normal";
      case "spo2":
        if (num < 95) return "Low Oxygen";
        return "Normal";
      case "respiratoryRate":
        if (num < 12) return "Slow Breathing";
        if (num > 20) return "Rapid Breathing";
        return "Normal";
      default:
        return "Normal";
    }
  };

  // Calculate 60-second summary statistics from 5-second averages
  const getSummaryStats = () => {
    const validAverages = fiveSecondAverages.filter(avg => 
      avg.heartRate !== null && avg.heartRate > 0 && 
      avg.spo2 !== null && avg.spo2 > 0
    );

    if (validAverages.length === 0) {
      return {
        avgHR: "--",
        avgSpO2: "--.-",
        avgRR: "--",
        minHR: "--",
        maxHR: "--",
        dataPoints: 0
      };
    }

    const hrValues = validAverages.map(avg => avg.heartRate).filter(hr => hr > 0);
    const spo2Values = validAverages.map(avg => avg.spo2).filter(spo2 => spo2 > 0);
    const rrValues = validAverages.map(avg => avg.respiratoryRate).filter(rr => rr > 0);

    const avgHR = hrValues.length > 0 ? hrValues.reduce((a, b) => a + b, 0) / hrValues.length : 0;
    const avgSpO2 = spo2Values.length > 0 ? spo2Values.reduce((a, b) => a + b, 0) / spo2Values.length : 0;
    const avgRR = rrValues.length > 0 ? rrValues.reduce((a, b) => a + b, 0) / rrValues.length : 0;

    const minHR = hrValues.length > 0 ? Math.min(...hrValues) : 0;
    const maxHR = hrValues.length > 0 ? Math.max(...hrValues) : 0;

    return {
      avgHR: avgHR > 0 ? avgHR.toFixed(1) : "--",
      avgSpO2: avgSpO2 > 0 ? avgSpO2.toFixed(1) : "--.-",
      avgRR: avgRR > 0 ? avgRR.toFixed(1) : "--",
      minHR: minHR > 0 ? minHR.toFixed(0) : "--",
      maxHR: maxHR > 0 ? maxHR.toFixed(0) : "--",
      dataPoints: validAverages.length
    };
  };

  const MAX_RETRIES = 3;
  const summaryStats = getSummaryStats();

  return (
    <div className="max30102-container">
      <div className={`max30102-content ${isVisible ? 'visible' : ''}`}>
        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: "100%" }}></div>
          </div>
          <span className="progress-step">Step 4 of 4 - Vital Signs</span>
        </div>

        <div className="max30102-header">
          <h1 className="max30102-title">Pulse Oximeter</h1>
          <p className="max30102-subtitle">{statusMessage}</p>
          {retryCount > 0 && (
            <div className="retry-indicator">
              Retry attempt: {retryCount}/{MAX_RETRIES}
            </div>
          )}
          {!sensorReady && (
            <div className="sensor-status">
              🔄 Sensor Initializing...
            </div>
          )}
          {isMeasuring && (
            <div className="measurement-progress">
              <div className="progress-bar-horizontal">
                <div 
                  className="progress-fill-horizontal" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <span className="progress-text">
                {progressSeconds > 0 ? `${60 - progressSeconds}s remaining` : "60-second measurement"}
              </span>
            </div>
          )}
        </div>

        <div className="sensor-display-section">
          <div className="sensor-visual-area">
            <div className={`finger-sensor ${fingerDetected ? 'active' : ''} ${sensorReady ? 'ready' : 'initializing'}`}>
              <div className="sensor-light"></div>
              <div className="finger-placeholder">
                {fingerDetected ? "👆" : "👇"}
              </div>
              <div className="finger-status">
                {!sensorReady && "Initializing..."}
                {sensorReady && !fingerDetected && "Place Finger"}
                {sensorReady && fingerDetected && "Finger Detected"}
              </div>
            </div>
          </div>

          {/* Real-time Measurements Display */}
          <div className="real-time-measurements">
            <div className="measurements-grid">
              <div className="measurement-card">
                <img src={heartRateIcon} alt="Heart Rate Icon" className="measurement-icon"/>
                <div className="measurement-info">
                  <h3>Heart Rate</h3>
                  <div className="measurement-value">
                    {measurements.heartRate === "--" ? (
                      <span className="placeholder">--</span>
                    ) : (
                      <span className="value">{measurements.heartRate}</span>
                    )}
                    <span className="unit">BPM</span>
                  </div>
                  <span className={`measurement-status ${getStatusColor('heartRate', measurements.heartRate)}`}>
                    {getStatusText('heartRate', measurements.heartRate)}
                  </span>
                </div>
              </div>
              
              <div className="measurement-card">
                <img src={spo2Icon} alt="SpO2 Icon" className="measurement-icon"/>
                <div className="measurement-info">
                  <h3>Blood Oxygen</h3>
                  <div className="measurement-value">
                    {measurements.spo2 === "--.-" ? (
                      <span className="placeholder">--.-</span>
                    ) : (
                      <span className="value">{measurements.spo2}</span>
                    )}
                    <span className="unit">%</span>
                  </div>
                  <span className={`measurement-status ${getStatusColor('spo2', measurements.spo2)}`}>
                    {getStatusText('spo2', measurements.spo2)}
                  </span>
                </div>
              </div>
              
              <div className="measurement-card">
                <img src={respiratoryIcon} alt="Respiratory Rate Icon" className="measurement-icon"/>
                <div className="measurement-info">
                  <h3>Respiratory Rate</h3>
                  <div className="measurement-value">
                    {measurements.respiratoryRate === "--" ? (
                      <span className="placeholder">--</span>
                    ) : (
                      <span className="value">{measurements.respiratoryRate}</span>
                    )}
                    <span className="unit">/min</span>
                  </div>
                  <span className={`measurement-status ${getStatusColor('respiratoryRate', measurements.respiratoryRate)}`}>
                    {getStatusText('respiratoryRate', measurements.respiratoryRate)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 60-Second Summary with 5-Second Averages */}
          {isMeasuring && (
            <div className="summary-section">
              <h4>60-Second Summary (5-Second Averages)</h4>
              <div className="averages-grid">
                {fiveSecondAverages.map((average, index) => (
                  <div key={index} className="average-item">
                    <div className="average-time">{(index + 1) * 5}s</div>
                    <div className="average-values">
                      <span className="average-hr">
                        {average.heartRate ? average.heartRate.toFixed(0) : "--"} BPM
                      </span>
                      <span className="average-spo2">
                        {average.spo2 ? average.spo2.toFixed(1) : "--.-"}%
                      </span>
                      <span className="average-rr">
                        {average.respiratoryRate ? average.respiratoryRate.toFixed(0) : "--"} RR
                      </span>
                    </div>
                    <div className={`average-status ${average.heartRate && average.spo2 ? 'valid' : 'invalid'}`}>
                      {average.heartRate && average.spo2 ? "✓" : "✗"}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="summary-stats">
                <div className="stat-item">
                  <span className="stat-label">Avg Heart Rate:</span>
                  <span className="stat-value">{summaryStats.avgHR} BPM</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg SpO2:</span>
                  <span className="stat-value">{summaryStats.avgSpO2}%</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Avg Resp Rate:</span>
                  <span className="stat-value">{summaryStats.avgRR} /min</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">HR Range:</span>
                  <span className="stat-value">{summaryStats.minHR}-{summaryStats.maxHR} BPM</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Valid Data Points:</span>
                  <span className="stat-value">{summaryStats.dataPoints}/12</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">Time Elapsed:</span>
                  <span className="stat-value">{progressSeconds}/60s</span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="measurement-controls">
          {!sensorReady && (
            <div className="waiting-prompt">
              <div className="spinner"></div>
              <span>Initializing pulse oximeter...</span>
            </div>
          )}
          {sensorReady && !fingerDetected && !isMeasuring && !measurementComplete && (
            <div className="waiting-prompt">
              <div className="finger-pulse"></div>
              <span>Place finger on sensor to begin 60-second measurement</span>
            </div>
          )}
          {sensorReady && fingerDetected && !isMeasuring && !measurementComplete && (
            <div className="ready-prompt">
              <div className="checkmark">✓</div>
              <span>Finger detected! Starting 60-second measurement...</span>
            </div>
          )}
          {isMeasuring && (
            <div className="measuring-prompt">
              <div className="pulse-animation"></div>
              <span>60-second measurement in progress... Keep finger steady</span>
            </div>
          )}
          {measurementComplete && (
            <span className="success-text">✅ 60-Second Measurement Complete</span>
          )}
        </div>

        <div className="continue-button-container">
          <button 
            className="continue-button" 
            onClick={handleContinue} 
            disabled={!measurementComplete}
          >
            View AI Results
          </button>
        </div>
      </div>
    </div>
  );
}