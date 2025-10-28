// Share.jsx - Custom Print Dialog UI
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Sharing.css"; // This should exist in the same directory
import shareIcon from "../../../assets/icons/share-icon.png";

export default function Share() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printComplete, setPrintComplete] = useState(false);
  const [userData, setUserData] = useState({});
  const [printerStatus, setPrinterStatus] = useState("checking");
  const [testLog, setTestLog] = useState([]);
  const [showPrintDialog, setShowPrintDialog] = useState(false);
  const [copies, setCopies] = useState(1);

  useEffect(() => {
    // Get all collected data from location state
    if (location.state) {
      setUserData(location.state);
    }
    
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
      // Show custom print dialog after animation
      setTimeout(() => setShowPrintDialog(true), 500);
    }, 100);

    // Check printer status
    checkPrinterStatus();

    return () => clearTimeout(timer);
  }, [location.state]);

  const addToLog = (message) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLog(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const checkPrinterStatus = async () => {
    addToLog("Checking printer status...");
    setPrinterStatus("checking");
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const isOnline = Math.random() > 0.1; // 90% chance online
      
      if (isOnline) {
        setPrinterStatus("online");
        addToLog("✓ Thermal printer detected: USB001");
        addToLog("✓ Printer is online and ready");
      } else {
        setPrinterStatus("offline");
        addToLog("✗ Thermal printer not detected");
      }
    } catch (error) {
      setPrinterStatus("offline");
      addToLog("✗ Error checking printer status");
    }
  };

  const calculateBMI = () => {
    if (!userData.weight || !userData.height) return null;
    const heightInMeters = userData.height / 100;
    return (userData.weight / (heightInMeters * heightInMeters)).toFixed(1);
  };

  const getBMICategory = (bmi) => {
    if (bmi < 18.5) return "Underweight";
    if (bmi < 25) return "Normal weight";
    if (bmi < 30) return "Overweight";
    return "Obese";
  };

  const generateReceiptContent = () => {
    const bmi = calculateBMI();
    const bmiCategory = bmi ? getBMICategory(parseFloat(bmi)) : "N/A";
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
 HEALTH REPORT
===============
${userData.firstName || 'Patient'} ${userData.lastName || ''}
Age: ${userData.age || '--'} | ${userData.sex === 'male' ? 'M' : 'F'}
${currentDate} ${currentTime}

VITAL SIGNS
-----------
Weight: ${userData.weight || '--'} kg
Height: ${userData.height || '--'} cm
BMI: ${bmi || '--'} (${bmiCategory})

Temp: ${userData.temperature || '--'}°C
Heart: ${userData.heartRate || '--'} BPM
Oxygen: ${userData.spo2 || '--'}%
Resp Rate: ${userData.respiratoryRate || '--'}/min

HEALTH SUMMARY
--------------
${generateHealthStatusSummary()}

Automated Health Check
Thank you for using our service!
`.trim();
  };

  const generateHealthStatusSummary = () => {
    const summaries = [];
    
    if (userData.heartRate) {
      if (userData.heartRate < 60) summaries.push("• Bradycardia");
      else if (userData.heartRate > 100) summaries.push("• Tachycardia");
      else summaries.push("• Normal HR");
    }
    
    if (userData.spo2) {
      if (userData.spo2 < 95) summaries.push("• Low Oxygen");
      else summaries.push("• Normal O2");
    }
    
    if (userData.temperature) {
      if (userData.temperature > 37.5) summaries.push("• Fever");
      else if (userData.temperature < 36.1) summaries.push("• Low Temp");
      else summaries.push("• Normal Temp");
    }
    
    const bmi = calculateBMI();
    if (bmi) {
      summaries.push(`• ${getBMICategory(parseFloat(bmi))}`);
    }
    
    return summaries.length > 0 ? summaries.join('\n') : "Complete measurements for analysis";
  };

  const handlePrint = async () => {
    if (printerStatus !== "online") {
      addToLog("⚠ Cannot print: Printer is offline");
      alert("Printer is offline. Please check connection and try again.");
      return;
    }

    setShowPrintDialog(false);
    setIsPrinting(true);
    addToLog(`Starting print job - ${copies} copies`);

    try {
      for (let i = 0; i < copies; i++) {
        addToLog(`Printing copy ${i + 1} of ${copies}...`);
        await simulatePrintProcess();
        
        if (i < copies - 1) {
          addToLog("✓ Copy completed, starting next...");
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      addToLog("✅ All copies printed successfully!");
      setIsPrinting(false);
      setPrintComplete(true);

    } catch (error) {
      console.error("Printing error:", error);
      addToLog("❌ Printing failed");
      setIsPrinting(false);
      setShowPrintDialog(true); // Re-open dialog on error
    }
  };

  const simulatePrintProcess = async () => {
    await new Promise(resolve => setTimeout(resolve, 800));
    addToLog("✓ Printer initialized");
    
    await new Promise(resolve => setTimeout(resolve, 800));
    addToLog("✓ Sending data to USB001...");
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    addToLog("✓ Printing completed");
    
    return true;
  };

  const handleBack = () => {
    navigate("/saving");
  };

  const handleReturnHome = () => {
    window.location.href = "http://localhost:3000";
  };

  const handleRetry = () => {
    setPrintComplete(false);
    setTestLog([]);
    setShowPrintDialog(true);
    checkPrinterStatus();
  };

  const incrementCopies = () => {
    if (copies < 5) setCopies(copies + 1);
  };

  const decrementCopies = () => {
    if (copies > 1) setCopies(copies - 1);
  };

  return (
    <div className="share-container">
      <div className={`share-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Header */}
        <div className="share-header">
          <div className="share-icon">
            <img src={shareIcon} alt="Receipt Printer" />
          </div>
          <h1 className="share-title">Print Health Report</h1>
          <p className="share-subtitle">
            {isPrinting ? "Printing in progress..." : 
             printComplete ? "Print completed successfully!" : 
             "Ready to print your health report"}
          </p>
        </div>

        {/* Printer Status */}
        <div className={`printer-status ${printerStatus !== 'online' ? 'offline' : ''}`}>
          <div className="printer-icon">
            {printerStatus === 'online' ? '🖨️ ✅' : 
             printerStatus === 'checking' ? '🖨️ ⏳' : '🖨️ ❌'}
          </div>
          <div className="printer-text">
            {printerStatus === 'online' && "Thermal Printer USB001: Ready"}
            {printerStatus === 'checking' && "Checking printer status..."}
            {printerStatus === 'offline' && "Printer Offline - Check Connection"}
          </div>
        </div>

        {/* Custom Print Dialog */}
        {showPrintDialog && !isPrinting && !printComplete && (
          <div className="print-dialog">
            <div className="dialog-header">
              <h3>Print Health Report</h3>
              <p>Configure your print settings</p>
            </div>

            <div className="dialog-content">
              {/* Printer Selection */}
              <div className="setting-group">
                <label className="setting-label">Printer</label>
                <div className="printer-selection">
                  <div className="printer-option active">
                    <span className="printer-name">USB001 Thermal Printer</span>
                    <span className="printer-status-badge online">Online</span>
                  </div>
                </div>
              </div>

              {/* Copies Selection */}
              <div className="setting-group">
                <label className="setting-label">Copies</label>
                <div className="copies-selector">
                  <button className="counter-btn" onClick={decrementCopies}>-</button>
                  <span className="copies-count">{copies}</span>
                  <button className="counter-btn" onClick={incrementCopies}>+</button>
                </div>
              </div>

              {/* Paper Settings */}
              <div className="setting-group">
                <label className="setting-label">Paper Settings</label>
                <div className="paper-settings">
                  <div className="paper-option">
                    <span className="paper-type">58mm Thermal Paper</span>
                    <span className="paper-size">Portrait</span>
                  </div>
                </div>
              </div>

              {/* Receipt Preview */}
              <div className="setting-group">
                <label className="setting-label">Preview</label>
                <div className="receipt-preview-small">
                  <div className="preview-content">
                    <pre>{generateReceiptContent().split('\n').slice(0, 8).join('\n')}...</pre>
                  </div>
                </div>
              </div>
            </div>

            <div className="dialog-actions">
              <button 
                className="dialog-btn secondary"
                onClick={handleBack}
              >
                Cancel
              </button>
              <button 
                className="dialog-btn primary"
                onClick={handlePrint}
                disabled={printerStatus !== "online"}
              >
                🖨️ Print Now
              </button>
            </div>
          </div>
        )}

        {/* Printing Animation */}
        {isPrinting && (
          <div className="printing-animation">
            <div className="printing-progress">
              <div className="progress-ring">
                <div className="ring-background"></div>
                <div className="ring-progress"></div>
              </div>
              <div className="printing-status">
                <span className="status-text">Printing {copies} {copies === 1 ? 'copy' : 'copies'}...</span>
                <span className="status-subtext">
                  Please wait while we print your health report
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Print Complete */}
        {printComplete && (
          <div className="print-complete">
            <div className="success-animation">
              <div className="success-icon">✅</div>
              <div className="success-rings">
                <div className="ring ring-1"></div>
                <div className="ring ring-2"></div>
              </div>
            </div>
            <div className="complete-message">
              <h3>Print Successful!</h3>
              <p>
                Your health report has been printed successfully. 
                {copies > 1 && ` ${copies} copies were printed.`}
              </p>
            </div>
          </div>
        )}

        {/* Test Results Log */}
        {(testLog.length > 0) && (
          <div className="test-results">
            <h4>Print Log</h4>
            <div className="test-log">
              <pre>{testLog.join('\n')}</pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {printComplete && (
            <>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                🖨️ Print Again
              </button>
              
              <button 
                className="return-home-button"
                onClick={handleReturnHome}
              >
                🏠 Return to Home
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}