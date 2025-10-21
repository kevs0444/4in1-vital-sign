// Share.jsx - Focused on Receipt Testing
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Share.css";
import shareIcon from "../../assets/icons/share-icon.png";

export default function Share() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [printComplete, setPrintComplete] = useState(false);
  const [userData, setUserData] = useState({});
  const [printerStatus, setPrinterStatus] = useState("checking");
  const [testLog, setTestLog] = useState([]);

  useEffect(() => {
    // Get all collected data from location state
    if (location.state) {
      setUserData(location.state);
    }
    
    // Animation trigger
    const timer = setTimeout(() => {
      setIsVisible(true);
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
      // Simulate printer detection
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // For testing, we'll randomly set printer status
      const isOnline = Math.random() > 0.3; // 70% chance online
      
      if (isOnline) {
        setPrinterStatus("online");
        addToLog("✓ Thermal printer detected: FlashLabel 58MM");
        addToLog("✓ Printer is online and ready");
      } else {
        setPrinterStatus("offline");
        addToLog("✗ Thermal printer not detected");
        addToLog("⚠ Please check printer connection");
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
    const currentDate = new Date().toLocaleDateString();
    const currentTime = new Date().toLocaleTimeString();

    return `
================================
    VITAL SIGN HEALTH REPORT
================================

Patient: ${userData.firstName || 'Test'} ${userData.lastName || 'User'}
Age: ${userData.age || '--'} years | Sex: ${userData.sex === 'male' ? 'M' : 'F'}
Date: ${currentDate}
Time: ${currentTime}

--------------------------------
         VITAL SIGNS
--------------------------------
Weight: ${userData.weight || '--'} kg
Height: ${userData.height || '--'} cm
BMI: ${bmi || '--'} (${bmiCategory})

Temperature: ${userData.temperature || '--'} °C
Heart Rate: ${userData.heartRate || '--'} BPM
Blood Oxygen: ${userData.spo2 || '--'} %
Respiratory Rate: ${userData.respiratoryRate || '--'}/min

--------------------------------
    HEALTH STATUS SUMMARY
--------------------------------
${generateHealthStatusSummary()}

================================
   FOUR-IN-ONE VITAL SENSOR
    Automated Health Check
================================

Thank you for using our service!
For medical advice, please consult
a healthcare professional.

`.trim();
  };

  const generateHealthStatusSummary = () => {
    const summaries = [];
    
    if (userData.heartRate) {
      if (userData.heartRate < 60) summaries.push("• Heart rate: Low (Bradycardia)");
      else if (userData.heartRate > 100) summaries.push("• Heart rate: High (Tachycardia)");
      else summaries.push("• Heart rate: Normal");
    }
    
    if (userData.spo2) {
      if (userData.spo2 < 95) summaries.push("• Oxygen: Low (Hypoxemia)");
      else summaries.push("• Oxygen: Normal");
    }
    
    if (userData.temperature) {
      if (userData.temperature > 37.5) summaries.push("• Temperature: Fever");
      else if (userData.temperature < 36.1) summaries.push("• Temperature: Low");
      else summaries.push("• Temperature: Normal");
    }
    
    const bmi = calculateBMI();
    if (bmi) {
      summaries.push(`• BMI: ${getBMICategory(parseFloat(bmi))}`);
    }
    
    return summaries.length > 0 ? summaries.join('\n') : "• Complete measurements for analysis";
  };

  const testPrint = async () => {
    addToLog("Starting test print...");
    
    try {
      // Simulate test print process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addToLog("✓ Test print command sent");
      addToLog("✓ Printer responded successfully");
      addToLog("✓ Test print completed");
      
    } catch (error) {
      addToLog("✗ Test print failed");
      addToLog(`Error: ${error.message}`);
    }
  };

  const simulatePrintReceipt = async () => {
    if (printerStatus !== "online") {
      addToLog("⚠ Cannot print: Printer is offline");
      alert("Printer is offline. Please check connection and try again.");
      return;
    }

    setIsPrinting(true);
    addToLog("Starting receipt printing...");
    
    try {
      const receiptContent = generateReceiptContent();
      addToLog("✓ Receipt content generated");
      addToLog("✓ Sending to thermal printer...");
      
      // Simulate printing process steps
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToLog("✓ Printer initialized");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToLog("✓ Printing header...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToLog("✓ Printing vital signs data...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToLog("✓ Printing health summary...");
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      addToLog("✓ Receipt printed successfully!");
      
      setIsPrinting(false);
      setPrintComplete(true);
      
    } catch (error) {
      console.error("Printing error:", error);
      addToLog("✗ Printing failed");
      addToLog(`Error: ${error.message}`);
      setIsPrinting(false);
      alert("Printing failed. Please try again.");
    }
  };

  const handleBack = () => {
    navigate("/saving");
  };

  const handleReturnHome = () => {
    // Redirect to localhost:3000 for testing
    window.location.href = "http://localhost:3000";
  };

  const handleRetry = () => {
    setPrintComplete(false);
    setTestLog([]);
    checkPrinterStatus();
  };

  const getStatusMessage = () => {
    if (isPrinting) return "Printing in progress...";
    if (printComplete) return "Receipt printed successfully!";
    return "Thermal Receipt Printer Test";
  };

  return (
    <div className="share-container">
      <div className={`share-content ${isVisible ? 'visible' : ''}`}>
        
        {/* Testing Phase Banner */}
        <div className="testing-banner">
          <div className="banner-icon">🧪</div>
          <div className="banner-text">TESTING PHASE - Thermal Printer Integration</div>
        </div>

        {/* Header */}
        <div className="share-header">
          <div className="share-icon">
            <img src={shareIcon} alt="Receipt Printer" />
          </div>
          <h1 className="share-title">
            {isPrinting ? "Printing..." : 
             printComplete ? "Success!" : "Receipt Printer"}
          </h1>
          <p className="share-subtitle">
            {getStatusMessage()}
          </p>
        </div>

        {/* Printer Status */}
        <div className={`printer-status ${printerStatus !== 'online' ? 'offline' : ''}`}>
          <div className="printer-icon">
            {printerStatus === 'online' ? '🖨️ ✅' : 
             printerStatus === 'checking' ? '🖨️ ⏳' : '🖨️ ❌'}
          </div>
          <div className="printer-text">
            {printerStatus === 'online' && "Thermal Printer: ONLINE"}
            {printerStatus === 'checking' && "Checking printer status..."}
            {printerStatus === 'offline' && "Thermal Printer: OFFLINE"}
          </div>
        </div>

        {/* Receipt Preview */}
        <div className="receipt-preview">
          <div className="receipt-preview-content">
            <h4>Receipt Preview (58MM Thermal)</h4>
            <div className="receipt-content">
              <pre>{generateReceiptContent()}</pre>
            </div>
            <p className="receipt-notice">
              This preview shows how the receipt will appear on 58MM thermal paper
            </p>
          </div>
        </div>

        {/* Printing Animation */}
        {isPrinting && (
          <div className="printing-animation">
            <div className="printing-progress">
              <div className="progress-ring">
                <div className="ring-background"></div>
                <div className="ring-progress"></div>
              </div>
              <div className="printing-status">
                <span className="status-text">Printing Receipt...</span>
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
                Your health report has been printed on thermal paper.
                Please collect your receipt.
              </p>
            </div>
          </div>
        )}

        {/* Test Results Log */}
        {(testLog.length > 0) && (
          <div className="test-results">
            <h4>Printer Test Log</h4>
            <div className="test-log">
              <pre>{testLog.join('\n')}</pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="action-buttons">
          {!isPrinting && !printComplete && (
            <>
              <button 
                className="back-button"
                onClick={handleBack}
              >
                ← Back
              </button>
              
              <button 
                className="test-button"
                onClick={testPrint}
                disabled={printerStatus === "checking"}
              >
                Test Printer
              </button>
              
              <button 
                className="print-button"
                onClick={simulatePrintReceipt}
                disabled={printerStatus !== "online"}
              >
                🖨️ Print Receipt
              </button>

              <button 
                className="return-home-button"
                onClick={handleReturnHome}
              >
                Return to Home
              </button>
            </>
          )}
          
          {printComplete && (
            <>
              <button 
                className="retry-button"
                onClick={handleRetry}
              >
                Print Another
              </button>
              
              <button 
                className="return-home-button"
                onClick={handleReturnHome}
              >
                ✅ Return to Home
              </button>
            </>
          )}
        </div>

        {/* Testing Instructions */}
        <div className="system-notice">
          <div className="system-icon">💡</div>
          <div className="system-text">
            <strong>Testing Instructions</strong>
            <span>1. Click "Test Printer" to check connection • 2. Click "Print Receipt" to generate thermal print • 3. Use "Return to Home" to go back to localhost:3000</span>
          </div>
        </div>
      </div>
    </div>
  );
}