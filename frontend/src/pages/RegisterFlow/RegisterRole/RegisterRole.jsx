import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./Role.css";
import adminIcon from "../assets/icons/admin-icon.png";
import medicalIcon from "../assets/icons/medical-icon.png";
import employeeIcon from "../assets/icons/employee-icon.png";
import studentIcon from "../assets/icons/student-icon.png";

export default function Role() {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const roles = [
    {
      id: "admin",
      title: "Admin",
      description: "System administrator with full access to all features and user management",
      icon: adminIcon,
      color: "#dc3545"
    },
    {
      id: "medical",
      title: "Medical Staff",
      description: "Doctors and nurses with access to medical records and patient management",
      icon: medicalIcon,
      color: "#198754"
    },
    {
      id: "employee",
      title: "Employee",
      description: "Company employees for routine health check-ups and wellness monitoring",
      icon: employeeIcon,
      color: "#0d6efd"
    },
    {
      id: "student",
      title: "Student",
      description: "Students for academic health assessments and wellness tracking",
      icon: studentIcon,
      color: "#6f42c1"
    }
  ];

  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
  };

  const handleContinue = () => {
    if (!selectedRole) return;

    // Navigate based on selected role
    switch (selectedRole) {
      case "admin":
        navigate("/admin-dashboard");
        break;
      case "medical":
        navigate("/medical-dashboard");
        break;
      case "employee":
      case "student":
        navigate("/welcome", { state: { userType: selectedRole } });
        break;
      default:
        navigate("/welcome");
    }
  };

  const getButtonText = () => {
    if (!selectedRole) return "Select Your Role to Continue";
    
    switch (selectedRole) {
      case "admin":
        return "Continue to Admin Dashboard";
      case "medical":
        return "Continue to Medical Dashboard";
      case "employee":
        return "Continue as Employee";
      case "student":
        return "Continue as Student";
      default:
        return "Continue";
    }
  };

  return (
    <div className="role-container">
      <div className={`role-content ${isVisible ? 'visible' : ''}`}>
        <div className="role-header">
          <h1 className="role-title">Select Your Role</h1>
          <p className="role-subtitle">Choose the category that best describes you to access the appropriate features</p>
        </div>

        <div className="role-cards-section">
          <div className="role-cards-grid">
            {roles.map((role) => (
              <div
                key={role.id}
                className={`role-card ${selectedRole === role.id ? 'selected' : ''}`}
                onClick={() => handleRoleSelect(role.id)}
                style={{ 
                  '--role-color': role.color,
                  borderColor: selectedRole === role.id ? role.color : '#e9ecef'
                }}
              >
                <div className="role-card-icon">
                  <img src={role.icon} alt={`${role.title} Icon`} className="role-icon-image" />
                </div>
                <div className="role-card-content">
                  <h3 className="role-card-title">{role.title}</h3>
                  <p className="role-card-description">{role.description}</p>
                </div>
                <div className="role-selection-indicator">
                  <div className={`selection-circle ${selectedRole === role.id ? 'selected' : ''}`}>
                    {selectedRole === role.id && (
                      <div className="checkmark" style={{ backgroundColor: role.color }}></div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="role-controls">
          <div className="selected-role-info">
            {selectedRole && (
              <div className="selection-confirmation">
                <span className="selected-text">
                  Selected: <strong>{roles.find(r => r.id === selectedRole)?.title}</strong>
                </span>
              </div>
            )}
          </div>
          
          <div className="continue-button-container">
            <button 
              className="continue-button" 
              onClick={handleContinue} 
              disabled={!selectedRole}
              style={{
                background: selectedRole ? `linear-gradient(135deg, ${roles.find(r => r.id === selectedRole)?.color || '#dc3545'}, ${roles.find(r => r.id === selectedRole)?.color ? adjustColor(roles.find(r => r.id === selectedRole).color, -20) : '#c82333'})` : '#6c757d',
                boxShadow: selectedRole ? `0 6px 20px ${hexToRgba(roles.find(r => r.id === selectedRole)?.color || '#dc3545', 0.4)}` : 'none'
              }}
            >
              {getButtonText()}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper functions for color manipulation
function adjustColor(color, amount) {
  return '#' + color.replace(/^#/, '').replace(/../g, color => ('0'+Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2));
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}