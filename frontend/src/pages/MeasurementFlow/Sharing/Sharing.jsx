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
  const printFrameRef = useRef(null);

  useEffect(() => {
    console.log("📍 Sharing page received data:", location.state);

    if (location.state) {
      setUserData(location.state);
      console.log("✅ Complete health data loaded in Sharing:", location.state);

      // Auto-start printing when component loads
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

  const directPrint = () => {
    console.log("🖨️ Starting direct print...");
    setIsPrinting(true);

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.left = '-9999px';
    printFrame.style.top = '-9999px';
    printFrame.style.width = '75mm';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';

    document.body.appendChild(printFrame);
    printFrameRef.current = printFrame;

    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Health Assessment Receipt - ${userData?.firstName || 'Patient'}</title>
          <style>
            @page {
              margin: 0;
              padding: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 3mm;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.3;
              background: white;
              color: black;
              width: 74mm;
              font-weight: bold;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 12px 0 8px 0;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
            }
            .patient-info {
              margin: 10px 0;
              padding: 8px;
              border: 2px solid #000;
            }
            .vital-signs {
              margin: 10px 0;
            }
            .vital-item {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 13px;
            }
            .risk-assessment {
              text-align: center;
              margin: 12px 0;
              padding: 10px;
              border: 3px solid #000;
              font-size: 15px;
            }
            .recommendations {
              margin: 10px 0;
              font-size: 12px;
            }
            .recommendation-item {
              margin: 5px 0;
              padding-left: 5px;
            }
            .footer {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px solid #000;
              font-size: 10px;
              text-align: center;
              line-height: 1.2;
            }
            .divider {
              border-bottom: 2px dashed #000;
              margin: 10px 0;
            }
            .important {
              font-weight: bold;
              font-size: 15px;
            }
            .normal-range {
              font-size: 10px;
              color: #666;
            }
          </style>
        </head>
        <body>
          <div class="receipt-content">
            ${generateReceiptContent()}
          </div>
        </body>
      </html>
    `;

    printFrame.contentDocument.open();
    printFrame.contentDocument.write(receiptHTML);
    printFrame.contentDocument.close();

    printFrame.onload = () => {
      try {
        setTimeout(() => {
          printFrame.contentWindow.print();
          setTimeout(() => {
            document.body.removeChild(printFrame);
            setIsPrinting(false);
            setPrintComplete(true);
          }, 1000);
        }, 500);
      } catch (error) {
        console.error('Print failed:', error);
        fallbackPrint();
      }
    };
  };

  const fallbackPrint = () => {
    const printWindow = window.open('', '_blank');
    const receiptHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Health Assessment Receipt - ${userData?.firstName || 'Patient'}</title>
          <style>
            @page {
              margin: 0;
              padding: 0;
              size: 80mm auto;
            }
            body {
              margin: 0;
              padding: 3mm;
              font-family: 'Courier New', monospace;
              font-size: 14px;
              line-height: 1.3;
              background: white;
              color: black;
              width: 74mm;
              font-weight: bold;
            }
            .receipt-header {
              text-align: center;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .section-title {
              font-size: 16px;
              font-weight: bold;
              text-align: center;
              margin: 12px 0 8px 0;
              border-bottom: 1px solid #000;
              padding-bottom: 4px;
            }
            .patient-info {
              margin: 10px 0;
              padding: 8px;
              border: 2px solid #000;
            }
            .vital-signs {
              margin: 10px 0;
            }
            .vital-item {
              display: flex;
              justify-content: space-between;
              margin: 6px 0;
              font-size: 13px;
            }
            .risk-assessment {
              text-align: center;
              margin: 12px 0;
              padding: 10px;
              border: 3px solid #000;
              font-size: 15px;
            }
            .recommendations {
              margin: 10px 0;
              font-size: 12px;
            }
            .recommendation-item {
              margin: 5px 0;
              padding-left: 5px;
            }
            .footer {
              margin-top: 15px;
              padding-top: 10px;
              border-top: 2px solid #000;
              font-size: 10px;
              text-align: center;
              line-height: 1.2;
            }
            .divider {
              border-bottom: 2px dashed #000;
              margin: 10px 0;
            }
            .important {
              font-weight: bold;
              font-size: 15px;
            }
            .normal-range {
              font-size: 10px;
              color: #666;
            }
          </style>
          <script>
            window.onload = function() {
              setTimeout(() => {
                window.print();
                setTimeout(() => {
                  window.close();
                }, 500);
              }, 100);
            };
          </script>
        </head>
        <body>
          <div class="receipt-content">
            ${generateReceiptContent()}
          </div>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(receiptHTML);
    printWindow.document.close();

    setIsPrinting(false);
    setPrintComplete(true);
  };

  const startAutoPrint = () => {
    console.log("🖨️ Starting auto-print...");
    console.log("📊 Printing health data:", userData);
    setIsPrinting(true);

    setTimeout(() => {
      directPrint();
    }, 500);
  };

  const generateReceiptContent = () => {
    if (!userData) return "Loading health data...";

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
  <div><strong>Name:</strong> ${userData.firstName || 'N/A'} ${userData.lastName || ''}</div>
  <div><strong>Age:</strong> ${userData.age || 'N/A'} years</div>
  <div><strong>Gender:</strong> ${userData.sex === 'male' ? 'Male' : 'Female'}</div>
  <div><strong>BMI:</strong> ${userData.bmi || 'N/A'} (${userData.bmiCategory || 'N/A'})</div>
</div>

<div class="divider"></div>

<div class="section-title">VITAL SIGNS MEASUREMENT</div>
<div class="vital-signs">
  ${(userData.checklist?.includes('bodytemp') || userData.temperature) ? `
  <div class="vital-item">
    <span>Body Temperature:</span>
    <span>${userData.temperature || 'N/A'}°C</span>
  </div>
  <div class="normal-range">Status: ${userData.temperatureStatus || 'N/A'}</div>
  ` : ''}
  
  ${(userData.checklist?.includes('max30102') || userData.heartRate) ? `
  <div class="vital-item">
    <span>Heart Rate:</span>
    <span>${userData.heartRate || 'N/A'} BPM</span>
  </div>
  <div class="normal-range">Status: ${userData.heartRateStatus || 'N/A'}</div>
  
  <div class="vital-item">
    <span>Blood Oxygen:</span>
    <span>${userData.spo2 || 'N/A'}%</span>
  </div>
  <div class="normal-range">Status: ${userData.spo2Status || 'N/A'}</div>
  
  <div class="vital-item">
    <span>Respiratory Rate:</span>
    <span>${userData.respiratoryRate || 'N/A'}/min</span>
  </div>
  <div class="normal-range">Status: ${userData.respiratoryStatus || 'N/A'}</div>
  ` : ''}
  
  ${(userData.checklist?.includes('bloodpressure') || userData.systolic) ? `
  <div class="vital-item">
    <span>Blood Pressure:</span>
    <span>${userData.systolic || 'N/A'}/${userData.diastolic || 'N/A'} mmHg</span>
  </div>
  <div class="normal-range">Status: ${userData.bloodPressureStatus || 'N/A'}</div>
  ` : ''}
  
  ${(userData.checklist?.includes('bmi') || userData.weight) ? `
  <div class="vital-item">
    <span>Weight:</span>
    <span>${userData.weight || 'N/A'} kg</span>
  </div>
  
  <div class="vital-item">
    <span>Height:</span>
    <span>${userData.height || 'N/A'} cm</span>
  </div>
  ` : ''}
</div>

<div class="divider"></div>

<div class="section-title">AI RISK ASSESSMENT</div>
<div class="risk-assessment">
  <div class="important">RISK LEVEL: ${userData.riskLevel || 0}%</div>
  <div class="important">CATEGORY: ${userData.riskCategory || 'N/A'}</div>
</div>

<div class="divider"></div>

<div class="section-title">MEDICAL RECOMMENDATIONS</div>
<div class="recommendations">
  ${userData.suggestions && userData.suggestions.length > 0
        ? userData.suggestions.map((suggestion, index) =>
          `<div class="recommendation-item">${index + 1}. ${suggestion}</div>`
        ).join('')
        : '<div>No specific recommendations at this time</div>'
      }
</div>

<div class="divider"></div>

<div class="section-title">PREVENTIVE STRATEGIES</div>
<div class="recommendations">
  ${userData.preventions && userData.preventions.length > 0
        ? userData.preventions.map((prevention, index) =>
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

  const handleReturnHome = () => {
    navigate("/");
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
              Age: {userData.age} • {userData.sex === 'male' ? 'Male' : 'Female'} • Risk Level: {userData.riskLevel}%
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
                🏠 Return to Home
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

        {/* Debug Console */}
        <div className="debug-console">
          <div className="console-header">Receipt Information</div>
          <div className="console-content">
            <div>🖨️ Printer: Thermal POS58 (Large Font)</div>
            <div>👤 Patient: {userData.firstName} {userData.lastName}</div>
            <div>📊 Risk Level: {userData.riskLevel}% ({userData.riskCategory})</div>
            <div>📋 Measurements: Complete Health Assessment</div>
            <div>📄 Pages: Thermal Receipt Format</div>
            <div>⏱️ Status: {isPrinting ? "PRINTING" : printComplete ? "COMPLETED" : "READY"}</div>
          </div>
        </div>

      </div>
    </div>
  );
}