import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./RegisterRole.css";
import employeeIcon from "../../../assets/icons/employee-icon.png";
import studentIcon from "../../../assets/icons/student-icon.png";

export default function RegisterRole() {
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState(null);
  const [touchFeedback, setTouchFeedback] = useState(null);

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

  const handleTouchStart = (roleId) => {
    setTouchFeedback(roleId);
  };

  const handleTouchEnd = () => {
    setTimeout(() => setTouchFeedback(null), 150);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    const role = roles.find(r => r.id === selectedRole);
    if (role) {
      navigate(role.route, { state: { userType: selectedRole } });
    }
  };

  const getButtonText = () => {
    if (!selectedRole) return "Choose your category to continue";
    
    const role = roles.find(r => r.id === selectedRole);
    return `Continue as ${role?.title}`;
  };

  const getButtonClass = () => {
    if (!selectedRole) return "continue-button";
    return `continue-button ${selectedRole}`;
  };

  return (
    <div className="role-container">
      <div className="role-content">
        <div className="role-header">
          <h1 className="role-title">Choose Your Category</h1>
          <p className="role-subtitle">Select the option that best describes your relationship with Rizal Technological University</p>
        </div>

        <div className="role-cards-section">
          {/* Left Card - RTU Employees */}
          <div
            className={`role-card ${selectedRole === 'rtu-employees' ? 'selected' : ''} ${touchFeedback === 'rtu-employees' ? 'touch-feedback' : ''}`}
            onClick={() => handleRoleSelect('rtu-employees')}
            onTouchStart={() => handleTouchStart('rtu-employees')}
            onTouchEnd={handleTouchEnd}
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
            onTouchStart={() => handleTouchStart('rtu-students')}
            onTouchEnd={handleTouchEnd}
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
              {selectedRole && <span className="button-arrow">→</span>}
            </button>
          </div>
        </div>
      </div>
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