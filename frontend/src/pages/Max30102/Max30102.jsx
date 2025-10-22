import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import "./Max30102.css";
import heartRateIcon from "../../assets/icons/heart-rate-icon.png";
import spo2Icon from "../../assets/icons/spo2-icon.png";
import respiratoryIcon from "../../assets/icons/respiratory-icon.png";
import { sensorAPI } from "../../utils/api";

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

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
  
  // Combined chart data for all three measurements
  const [chartData, setChartData] = useState({
    labels: Array.from({length: 12}, (_, i) => `${(i + 1) * 5}s`), // 5s, 10s, 15s...60s
    datasets: [
      {
        label: 'Heart Rate (BPM)',
        data: Array(12).fill(null),
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#dc3545',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y',
      },
      {
        label: 'SpO₂ (%)',
        data: Array(12).fill(null),
        borderColor: '#2196F3',
        backgroundColor: 'rgba(33, 150, 243, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#2196F3',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y1',
      },
      {
        label: 'Respiratory Rate',
        data: Array(12).fill(null),
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderWidth: 3,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: '#28a745',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        yAxisID: 'y2',
      }
    ]
  });

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
        
        // Update current measurements
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
    }, 1500);
  };

  const startMeasurement = async () => {
    try {
      setStatusMessage("🎬 Starting 60-second vital signs monitoring...");
      
      // Reset chart data
      setChartData(prev => ({
        ...prev,
        datasets: prev.datasets.map(dataset => ({
          ...dataset,
          data: Array(12).fill(null)
        }))
      }));
      
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

  // Listen for combined vital signs data
  useEffect(() => {
    const handleSerialData = (event) => {
      if (event.detail && event.detail.data && event.detail.data.includes('DATA:VITAL_SIGNS:')) {
        const dataString = event.detail.data.replace('DATA:VITAL_SIGNS:', '');
        const [hr, spo2, rr, timeIndex, elapsed] = dataString.split(':').map(Number);
        
        const dataPointIndex = Math.floor(timeIndex / 5) - 1;
        
        if (dataPointIndex >= 0 && dataPointIndex < 12) {
          setChartData(prev => {
            const newDatasets = [...prev.datasets];
            newDatasets[0].data[dataPointIndex] = hr > 0 ? hr : null;
            newDatasets[1].data[dataPointIndex] = spo2 > 0 ? spo2 : null;
            newDatasets[2].data[dataPointIndex] = rr > 0 ? rr : null;
            
            return {
              ...prev,
              datasets: newDatasets
            };
          });
          
          console.log(`Updated chart at ${timeIndex}s: HR=${hr}, SpO2=${spo2}, RR=${rr}`);
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
      measurementTimestamp: new Date().toISOString()
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

  // Combined chart configuration
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15,
          font: {
            size: 11,
            weight: '600'
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          size: 12,
        },
        bodyFont: {
          size: 11,
        },
        padding: 10,
      },
      title: {
        display: true,
        text: '60-Second Vital Signs Monitoring',
        font: {
          size: 14,
          weight: 'bold'
        },
        padding: 10
      }
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Time (seconds)',
          font: {
            size: 11,
            weight: '600'
          }
        },
        grid: {
          display: true,
          color: 'rgba(0, 0, 0, 0.05)',
        },
        ticks: {
          maxTicksLimit: 12,
          font: {
            size: 9,
          },
        },
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Heart Rate (BPM)',
          font: {
            size: 11,
            weight: '600'
          }
        },
        min: 40,
        max: 120,
        grid: {
          color: 'rgba(220, 53, 69, 0.1)',
        },
        ticks: {
          font: {
            size: 9,
          },
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'SpO₂ (%)',
          font: {
            size: 11,
            weight: '600'
          }
        },
        min: 90,
        max: 100,
        grid: {
          drawOnChartArea: false,
        },
        ticks: {
          font: {
            size: 9,
          },
        },
      },
      y2: {
        type: 'linear',
        display: false, // Hide respiratory rate axis since it overlaps
        min: 10,
        max: 22,
      },
    },
  };

  const MAX_RETRIES = 3;

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

          {/* Combined Chart Display */}
          {isMeasuring && (
            <div className="charts-container">
              <h4>60-Second Vital Signs Trend</h4>
              <div className="charts-grid">
                <div className="chart-item">
                  <div className="chart-wrapper">
                    <Line data={chartData} options={chartOptions} />
                  </div>
                </div>
              </div>
            </div>
          )}

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