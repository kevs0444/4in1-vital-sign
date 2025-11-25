import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Checklist.css";

// Import icons (using placeholders or existing icons if available)
// Assuming icons exist based on other files, but for now I'll use emojis or text if imports fail
// In a real scenario, I'd check the assets folder.
// I'll use text/emojis for the prototype as requested.

export default function Checklist() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);

  // Available processes
  const processes = [
    { id: 'bmi', name: 'BMI', route: '/measure/bmi', icon: '⚖️', description: 'Height & Weight' },
    { id: 'bodytemp', name: 'Body Temperature', route: '/measure/bodytemp', icon: '🌡️', description: 'Forehead Sensor' },
    { id: 'max30102', name: 'Pulse Oximeter', route: '/measure/max30102', icon: '❤️', description: 'Heart Rate & SpO2' },
    { id: 'bloodpressure', name: 'Blood Pressure', route: '/measure/bloodpressure', icon: '🩺', description: 'Systolic & Diastolic' }
  ];

  // State for selected items (default all selected)
  const [selectedItems, setSelectedItems] = useState(
    processes.map(p => p.id)
  );

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

  return (
    <div className="checklist-container">
      <div className={`checklist-content ${isVisible ? 'visible' : ''}`}>
        
        <div className="checklist-header">
          <h1 className="checklist-title">Measurement Checklist</h1>
          <p className="checklist-subtitle">Select the vital signs you want to measure for this session.</p>
        </div>

        <div className="checklist-grid">
          {processes.map(process => (
            <div 
              key={process.id} 
              className={`checklist-item ${selectedItems.includes(process.id) ? 'selected' : ''}`}
              onClick={() => toggleItem(process.id)}
            >
              <div className="item-icon">{process.icon}</div>
              <div className="item-name">{process.name}</div>
              <div className="item-description">{process.description}</div>
            </div>
          ))}
        </div>

        <div className="button-container">
          <button 
            className="start-button" 
            onClick={handleStart}
            disabled={selectedItems.length === 0}
          >
            Start Measurement ({selectedItems.length})
          </button>
        </div>

      </div>
    </div>
  );
}
