import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Modal, Button } from "react-bootstrap";
import "./RegisterRole.css";
import employeeIcon from "../../../assets/icons/employee-icon.png";
import studentIcon from "../../../assets/icons/student-icon.png";

export default function RegisterRole() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [touchFeedback, setTouchFeedback] = useState(null);
  const [showExitModal, setShowExitModal] = useState(false);

  // Add viewport meta tag to prevent zooming
  useEffect(() => {
    // Create or update viewport meta tag
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, shrink-to-fit=no';

    // Prevent zooming via touch gestures
    document.addEventListener('touchstart', handleGlobalTouchStart, { passive: false });
    document.addEventListener('touchmove', handleGlobalTouchMove, { passive: false });
    document.addEventListener('touchend', handleGlobalTouchEnd, { passive: false });
    document.addEventListener('gesturestart', preventZoom, { passive: false });
    document.addEventListener('gesturechange', preventZoom, { passive: false });
    document.addEventListener('gestureend', preventZoom, { passive: false });

    return () => {
      document.removeEventListener('touchstart', handleGlobalTouchStart);
      document.removeEventListener('touchmove', handleGlobalTouchMove);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
      document.removeEventListener('gesturestart', preventZoom);
      document.removeEventListener('gesturechange', preventZoom);
      document.removeEventListener('gestureend', preventZoom);
    };
  }, []);

  // Prevent zooming functions
  const handleGlobalTouchStart = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleGlobalTouchMove = (e) => {
    if (e.touches.length > 1) {
      e.preventDefault();
    }
  };

  const handleGlobalTouchEnd = (e) => {
    if (e.touches.length > 0) {
      e.preventDefault();
    }
  };

  const preventZoom = (e) => {
    e.preventDefault();
  };

  const roles = [
    {
      id: "rtu-employees",
      title: "RTU Employees",
      description: "Faculty, staff, and professors of Rizal Technological University",
      icon: employeeIcon,
      color: "#16a34a",
      route: "/register/personal-info"
    },
    {
      id: "rtu-students",
      title: "RTU Students",
      description: "Currently enrolled students of Rizal Technological University",
      icon: studentIcon,
      color: "#0ea5e9",
      route: "/register/personal-info"
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setTouchFeedback(roleId);
    setTimeout(() => setTouchFeedback(null), 200);
  };

  const handleCardTouchStart = (roleId) => {
    setTouchFeedback(roleId);
  };

  const handleCardTouchEnd = () => {
    setTimeout(() => setTouchFeedback(null), 150);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    const role = roles.find(r => r.id === selectedRole);
    if (role) {
      navigate(role.route, { state: { userType: selectedRole } });
    }
  };

  const handleBack = () => {
    setShowExitModal(true);
  };

  const confirmExit = () => {
    setShowExitModal(false);
    navigate("/login");
  };

  const getButtonText = () => {
    if (!selectedRole) return "Select a category to continue";
    return "Continue to Next Step";
  };

  const getButtonClass = () => {
    if (!selectedRole) return "continue-button";
    return `continue-button ${selectedRole}`;
  };

  return (
    <div className="role-container">
      <div className="role-content">
        <button className="close-button" onClick={handleBack}>×</button>
        <div className="role-header">
          <h1 className="role-title">Choose Your Category</h1>
          <p className="role-subtitle">Select the option that best describes your relationship with Rizal Technological University</p>
        </div>

        <div className="role-cards-section">
          {/* Left Card - RTU Employees */}
          <div
            className={`role-card ${selectedRole === 'rtu-employees' ? 'selected' : ''} ${touchFeedback === 'rtu-employees' ? 'touch-feedback' : ''}`}
            onClick={() => handleRoleSelect('rtu-employees')}
            onTouchStart={() => handleCardTouchStart('rtu-employees')}
            onTouchEnd={handleCardTouchEnd}
            style={{ '--role-color': roles[0].color }}
          >
            <div className="role-card-icon">
              <img
                src={roles[0].icon}
                alt={`${roles[0].title} Icon`}
                className="role-icon-image"
              />
            </div>
            <div className="role-card-content">
              <h3 className="role-card-title">{roles[0].title}</h3>
              <p className="role-card-description">{roles[0].description}</p>
            </div>
            <div className="role-selection-indicator">
              <div className={`selection-circle ${selectedRole === 'rtu-employees' ? 'selected' : ''}`}>
                {selectedRole === 'rtu-employees' && <div className="checkmark"></div>}
              </div>
            </div>
          </div>

          {/* Right Card - RTU Students */}
          <div
            className={`role-card ${selectedRole === 'rtu-students' ? 'selected' : ''} ${touchFeedback === 'rtu-students' ? 'touch-feedback' : ''}`}
            onClick={() => handleRoleSelect('rtu-students')}
            onTouchStart={() => handleCardTouchStart('rtu-students')}
            onTouchEnd={handleCardTouchEnd}
            style={{ '--role-color': roles[1].color }}
          >
            <div className="role-card-icon">
              <img
                src={roles[1].icon}
                alt={`${roles[1].title} Icon`}
                className="role-icon-image"
              />
            </div>
            <div className="role-card-content">
              <h3 className="role-card-title">{roles[1].title}</h3>
              <p className="role-card-description">{roles[1].description}</p>
            </div>
            <div className="role-selection-indicator">
              <div className={`selection-circle ${selectedRole === 'rtu-students' ? 'selected' : ''}`}>
                {selectedRole === 'rtu-students' && <div className="checkmark"></div>}
              </div>
            </div>
          </div>
        </div>

        <div className="role-controls">
          <div className="selected-role-info">
            {selectedRole && (
              <div
                className="selection-confirmation"
                style={{
                  borderColor: roles.find(r => r.id === selectedRole)?.color,
                  background: `linear-gradient(135deg, ${hexToRgba(roles.find(r => r.id === selectedRole)?.color, 0.1)}, ${hexToRgba(roles.find(r => r.id === selectedRole)?.color, 0.05)})`
                }}
              >
                <span className="selected-text">
                  You've selected: <strong style={{ color: roles.find(r => r.id === selectedRole)?.color }}>
                    {roles.find(r => r.id === selectedRole)?.title}
                  </strong>
                </span>
              </div>
            )}
          </div>

          <div className="continue-button-container">
            <button
              className={getButtonClass()}
              onClick={handleContinue}
              onTouchStart={(e) => e.currentTarget.style.transform = 'scale(0.97)'}
              onTouchEnd={(e) => e.currentTarget.style.transform = ''}
              disabled={!selectedRole}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>

      {/* Exit Confirmation Modal */}
      <Modal
        show={showExitModal}
        onHide={() => setShowExitModal(false)}
        centered
        className="exit-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Exit Registration?</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Are you sure you want to go back to login? Your progress will not be saved.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowExitModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmExit}>
            Yes, Exit
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

// Helper function for color manipulation
function hexToRgba(hex, alpha) {
  if (!hex) return 'rgba(108, 117, 125, 0.1)';
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}