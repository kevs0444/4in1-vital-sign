import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sharing.css";

export default function Sharing() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [userData, setUserData] = useState(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printComplete, setPrintComplete] = useState(false);
  const [receiptContent, setReceiptContent] = useState("");
  const printFrameRef = useRef(null);

  useEffect(() => {
    console.log("📍 Sharing page received data:", location.state);

    if (location.state) {
      setUserData(location.state);
      console.log("✅ Complete health data loaded in Sharing:", location.state);
      console.log("🔍 DEBUG - Sex value:", location.state.sex, "Type:", typeof location.state.sex);

      // Generate receipt content immediately when data is available
      const content = generateReceiptContent(location.state);
      setReceiptContent(content);

      // Auto-start printing when component loads and content is ready
      setTimeout(() => {
        startAutoPrint();
      }, 1000);
    } else {
      console.log("❌ No data received from Result page");
      navigate("/measure/result");
      return;
    }

    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => clearTimeout(timer);
  }, [location.state, navigate]);

  // Generate receipt content function (moved outside for reuse)
  const generateReceiptContent = (data) => {
    if (!data) return "Loading health data...";

    const currentDate = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    const currentTime = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });

    return `
<div class="receipt-header">
  <div class="important">JUAN AI</div>
  <div>AI-Powered Health Assessment</div>
  <div>${currentDate} ${currentTime}</div>
</div>

<div class="section-title">PATIENT INFORMATION</div>
<div class="patient-info">
  <div><strong>Name:</strong> ${data.firstName || 'N/A'} ${data.lastName || ''}</div>
  <div><strong>Age:</strong> ${data.age || 'N/A'} years</div>
  <div><strong>Gender:</strong> ${data.sex ? data.sex.charAt(0).toUpperCase() + data.sex.slice(1).toLowerCase() : 'N/A'}</div>
  <div><strong>BMI:</strong> ${data.bmi || 'N/A'} (${data.bmiCategory || 'N/A'})</div>
</div>

<div class="divider"></div>

<div class="section-title">VITAL SIGNS MEASUREMENT</div>
<div class="vital-signs">
  ${(data.checklist?.includes('bodytemp') || data.temperature) ? `
  <div class="vital-item">
    <span>Body Temperature:</span>
    <span>${data.temperature || 'N/A'}°C</span>
  </div>
  <div class="normal-range">Status: ${data.temperatureStatus || 'N/A'}</div>
  ` : ''}
  
  ${(data.checklist?.includes('max30102') || data.heartRate) ? `
  <div class="vital-item">
    <span>Heart Rate:</span>
    <span>${data.heartRate || 'N/A'} BPM</span>
  </div>
  <div class="normal-range">Status: ${data.heartRateStatus || 'N/A'}</div>
  
  <div class="vital-item">
    <span>Blood Oxygen:</span>
    <span>${data.spo2 || 'N/A'}%</span>
  </div>
  <div class="normal-range">Status: ${data.spo2Status || 'N/A'}</div>
  
  <div class="vital-item">
    <span>Respiratory Rate:</span>
    <span>${data.respiratoryRate || 'N/A'}/min</span>
  </div>
  <div class="normal-range">Status: ${data.respiratoryStatus || 'N/A'}</div>
  ` : ''}
  
  ${(data.checklist?.includes('bloodpressure') || data.systolic) ? `
  <div class="vital-item">
    <span>Blood Pressure:</span>
    <span>${data.systolic || 'N/A'}/${data.diastolic || 'N/A'} mmHg</span>
  </div>
  <div class="normal-range">Status: ${data.bloodPressureStatus || 'N/A'}</div>
  ` : ''}
  
  ${(data.checklist?.includes('bmi') || data.weight) ? `
  <div class="vital-item">
    <span>Weight:</span>
    <span>${data.weight || 'N/A'} kg</span>
  </div>
  
  <div class="vital-item">
    <span>Height:</span>
    <span>${data.height || 'N/A'} cm</span>
  </div>
  ` : ''}
</div>

<div class="divider"></div>

<div class="section-title">AI RISK ASSESSMENT</div>
<div class="risk-assessment">
  <div class="important">RISK LEVEL: ${data.riskLevel || 0}%</div>
  <div class="important">CATEGORY: ${data.riskCategory || 'N/A'}</div>
</div>

<div class="divider"></div>

<div class="section-title">MEDICAL RECOMMENDATIONS</div>
<div class="recommendations">
  ${data.suggestions && data.suggestions.length > 0
        ? data.suggestions.map((suggestion, index) =>
          `<div class="recommendation-item">${index + 1}. ${suggestion}</div>`
        ).join('')
        : '<div>No specific recommendations at this time</div>'
      }
</div>

<div class="divider"></div>

<div class="section-title">PREVENTIVE STRATEGIES</div>
<div class="recommendations">
  ${data.preventions && data.preventions.length > 0
        ? data.preventions.map((prevention, index) =>
          `<div class="recommendation-item">${index + 1}. ${prevention}</div>`
        ).join('')
        : '<div>Maintain regular health monitoring</div>'
      }
</div>

<div class="footer">
  <div class="important">*** IMPORTANT DISCLAIMER ***</div>
  <div>This AI health assessment is for informational</div>
  <div>purposes only and should not replace professional</div>
  <div>medical advice, diagnosis, or treatment.</div>
  <div>Always consult qualified healthcare providers</div>
  <div>for medical concerns and emergencies.</div>
  <div style="margin-top: 8px;">Generated by HealthGuard AI System</div>
  <div>Report ID: HG${Date.now().toString().slice(-6)}</div>
</div>
    `.trim();
  };

  const directPrint = async () => {
    console.log("🖨️ Starting direct print via Backend...");
    console.log("📊 Printing health data:", userData);

    setIsPrinting(true);

    try {
      const response = await fetch('http://localhost:5000/api/print/receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (response.ok) {
        console.log("✅ Print command sent successfully");
        setPrintComplete(true);
      } else {
        throw new Error(result.error || 'Print failed');
      }
    } catch (error) {
      console.error('Print failed:', error);
      // Fallback to browser print if backend fails, but user specifically requested no dialog.
      // We will just notify the user.
      alert("Printing failed: " + error.message + ". Please check if the printer is connected and the backend is running. If this persists, please contact support.");
    } finally {
      setIsPrinting(false);
    }
  };

  // Fallback print removed as we want to enforce no-dialog printing via backend

  const startAutoPrint = () => {
    console.log("🖨️ Starting auto-print...");

    if (!userData) {
      console.log("⏳ User data not ready, waiting...");
      setTimeout(startAutoPrint, 500);
      return;
    }

    console.log("✅ Data ready, starting print...");
    directPrint();
  };

  const clearAllUserData = () => {
    console.log('🧹 Clearing all user data and resetting system...');

    localStorage.removeItem('currentUser');
    localStorage.removeItem('userData');
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('userData');

    if (window.reduxStore) {
      window.reduxStore.dispatch({ type: 'RESET_USER_DATA' });
    }

    if (window.currentUserData) {
      window.currentUserData = null;
    }

    console.log('✅ All user data cleared - system ready for next user');
  };

  const handleReturnHome = () => {
    console.log('🏠 Returning to home - clearing all user data and resetting system');

    clearAllUserData();

    setTimeout(() => {
      navigate("/", {
        replace: true,
        state: {
          fromSharing: true,
          reset: true
        }
      });
    }, 100);
  };

  const handlePrintAgain = () => {
    setPrintComplete(false);
    startAutoPrint();
  };

  if (!userData) {
    return (
      <div className="share-container">
        <div className="share-content visible">
          <div className="share-header">
            <div className="share-icon">
              <div className="ready-icon">⚠️</div>
            </div>
            <h1 className="share-title">Loading Data...</h1>
            <p className="share-subtitle">Please wait while we load your health information</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="share-container">
      <div className={`share-content ${isVisible ? 'visible' : ''}`}>

        {/* Header */}
        <div className="share-header">
          <div className="share-icon">
            {isPrinting ? (
              <div className="printing-animation">
                <div className="printer-icon">🖨️</div>
                <div className="paper"></div>
              </div>
            ) : printComplete ? (
              <div className="success-icon">✅</div>
            ) : (
              <div className="ready-icon">🖨️</div>
            )}
          </div>

          <h1 className="share-title">
            {isPrinting ? "Printing Receipt..." :
              printComplete ? "Print Complete!" :
                "Printing Health Receipt"}
          </h1>

          <p className="share-subtitle">
            {isPrinting ? "Sending to thermal printer..." :
              printComplete ? "Your health receipt has been printed" :
                "Auto-printing your health assessment"}
          </p>
        </div>

        {/* Patient Info */}
        <div className="patient-info">
          <div className="patient-card">
            <div className="patient-name">
              {userData.firstName} {userData.lastName}
            </div>
            <div className="patient-details">
              Age: {userData?.age || 'N/A'} • {userData?.sex ? userData.sex.charAt(0).toUpperCase() + userData.sex.slice(1).toLowerCase() : 'N/A'} • Risk Level: {userData?.riskLevel || 'N/A'}%
            </div>
          </div>
        </div>

        {/* Status Info */}
        <div className="status-info">
          <div className="printer-status">
            <strong>Thermal Printer Ready</strong>
            <span>POS58 • Large Font Size • Auto-print</span>
          </div>

          {isPrinting && (
            <div className="print-progress">
              <div className="progress-bar">
                <div className="progress-fill"></div>
              </div>
              <span>Printing health receipt for {userData.firstName}...</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="action-buttons">
          {printComplete ? (
            <>
              <button
                className="print-again-btn"
                onClick={handlePrintAgain}
              >
                🖨️ Print Another Copy
              </button>

              <button
                className="home-btn"
                onClick={handleReturnHome}
              >
                🏠 Return to Home (New User)
              </button>
            </>
          ) : isPrinting ? (
            <div className="printing-message">
              <div className="spinner"></div>
              <span>Please wait while we print your receipt...</span>
            </div>
          ) : (
            <button
              className="print-again-btn"
              onClick={startAutoPrint}
            >
              🖨️ Print Now
            </button>
          )}
        </div>



      </div>
    </div>
  );
}