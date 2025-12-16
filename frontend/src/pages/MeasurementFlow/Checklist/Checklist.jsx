import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import "./Checklist.css";

// Import icons (using placeholders or existing icons if available)
// Assuming icons exist based on other files, but for now I'll use emojis or text if imports fail
// In a real scenario, I'd check the assets folder.
// I'll use text/emojis for the prototype as requested.

export default function Checklist() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Available processes
  const processes = [
    { id: 'bmi', name: 'BMI', route: '/measure/bmi', icon: '⚖️', description: 'Height & Weight' },
    { id: 'bodytemp', name: 'Body Temperature', route: '/measure/bodytemp', icon: '🌡️', description: 'Forehead Sensor' },
    { id: 'max30102', name: 'Pulse Oximeter', route: '/measure/max30102', icon: '❤️', description: 'Heart Rate & SpO2' },
    { id: 'bloodpressure', name: 'Blood Pressure', route: '/measure/bloodpressure', icon: '🩺', description: 'Systolic & Diastolic' }
  ];

  // State for selected items (default none selected as per request)
  const [selectedItems, setSelectedItems] = useState([]);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const toggleItem = (id) => {
    setSelectedItems(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  const handleStart = () => {
    if (selectedItems.length === 0) return;

    // Sort selected items based on the order in 'processes' array
    const sortedSelected = processes
      .filter(p => selectedItems.includes(p.id))
      .map(p => p.id);

    // Determine the first step
    const firstStepId = sortedSelected[0];
    const firstProcess = processes.find(p => p.id === firstStepId);

    // Prepare state to pass to the next page
    // We pass the 'checklist' (remaining steps) and the original user data
    const checklistData = {
      ...location.state, // Preserve user info
      checklist: sortedSelected, // The full list of selected steps
      currentStepIndex: 0 // Start at index 0
    };

    console.log("🚀 Starting prototype with checklist:", checklistData);
    navigate(firstProcess.route, { state: checklistData });
  };

  const handleBack = () => {
    navigate(-1);
  };

  const handleExit = () => setShowExitModal(true);

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  return (
    <div className="container-fluid d-flex justify-content-center align-items-center min-vh-100 p-0 checklist-container">
      <div className={`card border-0 shadow-lg p-4 p-md-5 mx-3 checklist-content page-transition`}>
        <button className="close-button" onClick={handleExit}>←</button>
        <div className="text-center mb-5">
          <h1 className="checklist-title">Measurement Checklist</h1>
          <p className="checklist-subtitle">Select the vital signs you want to measure for this session.</p>
        </div>

        <div className="row g-4 justify-content-center mb-5">
          {processes.map(process => (
            <div key={process.id} className="col-12 col-md-6">
              <div
                className={`checklist-item h-100 ${selectedItems.includes(process.id) ? 'selected' : ''}`}
                onClick={() => toggleItem(process.id)}
              >
                <div className="item-icon">{process.icon}</div>
                <div className="item-info">
                  <div className="item-name">{process.name}</div>
                  <div className="item-description">{process.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="d-flex flex-column gap-3 align-items-center">
          <button
            className="start-button"
            onClick={handleStart}
            disabled={selectedItems.length === 0}
          >
            Start Measurement ({selectedItems.length})
          </button>
        </div>
      </div>

      {/* Modern Exit Confirmation Popup Modal */}
      {showExitModal && (
        <div className="exit-modal-overlay" onClick={() => setShowExitModal(false)}>
          <motion.div
            className="exit-modal-content"
            initial={{ opacity: 0, scale: 0.8, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 50 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="exit-modal-icon">
              <span>🚪</span>
            </div>
            <h2 className="exit-modal-title">Exit Checklist?</h2>
            <p className="exit-modal-message">Do you want to go back to login and cancel the measurement?</p>
            <div className="exit-modal-buttons">
              <button
                className="exit-modal-button secondary"
                onClick={() => setShowExitModal(false)}
              >
                Cancel
              </button>
              <button
                className="exit-modal-button primary"
                onClick={confirmExit}
              >
                Yes, Exit
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div >
  );
}
