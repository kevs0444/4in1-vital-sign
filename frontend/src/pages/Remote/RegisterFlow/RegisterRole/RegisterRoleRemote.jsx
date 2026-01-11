// RegisterRoleRemote.jsx - Remote/Mobile version with 2x2 grid layout
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';
import './RegisterRoleRemote.css';

// Import icons (4 levels up -> src)
import employeeIcon from "../../../../assets/icons/employee-icon.png";
import studentIcon from "../../../../assets/icons/student-icon.png";
import nurseJuanIcon from "../../../../assets/icons/nurse-juan-icon.png";
import doctorJuanIcon from "../../../../assets/icons/doctor-juan-icon.png";

const RegisterRoleRemote = () => {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null);
    const [showExitModal, setShowExitModal] = useState(false);

    const roles = [
        {
            id: "rtu-employees",
            title: "RTU Employees",
            description: "Faculty and Employees",
            icon: employeeIcon,
            color: "#16a34a",
            bgColor: "#f0fdf4",
            borderColor: "#84e1bc"
        },
        {
            id: "rtu-students",
            title: "RTU Students",
            description: "Currently enrolled students",
            icon: studentIcon,
            color: "#0ea5e9",
            bgColor: "#f0f9ff",
            borderColor: "#93c5fd"
        },
        {
            id: "nurse",
            title: "Nurse",
            description: "Registered Nurses",
            icon: nurseJuanIcon,
            color: "#ec4899",
            bgColor: "#fdf2f8",
            borderColor: "#fbcfe8"
        },
        {
            id: "doctor",
            title: "Doctor",
            description: "Licensed Medical Doctors",
            icon: doctorJuanIcon,
            color: "#8b5cf6",
            bgColor: "#f5f3ff",
            borderColor: "#ddd6fe"
        }
    ];

    const handleRoleSelect = (roleId) => {
        setSelectedRole(roleId);
    };

    const handleContinue = () => {
        if (!selectedRole) return;
        navigate('/register/personal-info', { state: { userType: selectedRole } });
    };

    const handleBack = () => {
        setShowExitModal(true);
    };

    const getSelectedRole = () => roles.find(r => r.id === selectedRole);

    return (
        <div className="register-role-remote-container">
            {/* Top Bar */}
            <div className="remote-top-bar">
                <button className="back-btn" onClick={handleBack}>
                    <ArrowBack />
                </button>
                <div className="header-title-container">
                    <h1 className="header-title">Choose Category</h1>
                </div>
            </div>

            {/* Content Area */}
            <div className="remote-content">
                <div className="page-headline-group">
                    <h2 className="page-headline">
                        Select Your <span style={{ color: '#ef4444' }}>Role</span>
                    </h2>
                    <p className="page-subheadline">Choose the option that best describes you</p>
                </div>

                {/* 2x2 Grid of Role Cards */}
                <div className="role-grid-2x2">
                    {roles.map((role) => (
                        <div
                            key={role.id}
                            className={`role-card-square ${selectedRole === role.id ? 'selected' : ''}`}
                            onClick={() => handleRoleSelect(role.id)}
                            style={{
                                '--role-color': role.color,
                                '--role-bg': role.bgColor,
                                '--role-border': role.borderColor
                            }}
                        >
                            <div className="role-card-icon-wrapper">
                                <img
                                    src={role.icon}
                                    alt={role.title}
                                    className="role-card-icon-img"
                                />
                            </div>
                            <h3 className="role-card-name">{role.title}</h3>
                            <p className="role-card-desc">{role.description}</p>

                            {/* Selection Indicator */}
                            <div className="role-check-indicator">
                                {selectedRole === role.id && (
                                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                    </svg>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Selection Confirmation */}
                {selectedRole && (
                    <div className="selection-confirmation-remote" style={{ borderColor: getSelectedRole()?.color }}>
                        <span>Selected: </span>
                        <strong style={{ color: getSelectedRole()?.color }}>{getSelectedRole()?.title}</strong>
                    </div>
                )}
            </div>

            {/* Bottom Action Bar */}
            <div className="remote-bottom-bar">
                <button
                    className="action-btn-primary"
                    onClick={handleContinue}
                    disabled={!selectedRole}
                    style={{
                        background: selectedRole
                            ? `linear-gradient(135deg, ${getSelectedRole()?.color}, ${getSelectedRole()?.color}dd)`
                            : '#cbd5e1',
                        boxShadow: selectedRole
                            ? `0 8px 20px -6px ${getSelectedRole()?.color}66`
                            : 'none'
                    }}
                >
                    {selectedRole ? 'Continue to Next Step' : 'Select a category'}
                </button>
            </div>

            {/* Exit Modal */}
            <AnimatePresence>
                {showExitModal && (
                    <div
                        className="exit-modal-overlay"
                        onClick={() => setShowExitModal(false)}
                    >
                        <motion.div
                            className="exit-modal-content"
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div className="exit-modal-icon">🚪</div>
                            <h3 className="exit-modal-title">Exit Registration?</h3>
                            <p className="exit-modal-message">
                                Your progress will not be saved.
                            </p>
                            <div className="exit-modal-buttons">
                                <button
                                    className="exit-btn secondary"
                                    onClick={() => setShowExitModal(false)}
                                >
                                    Cancel
                                </button>
                                <button
                                    className="exit-btn primary"
                                    onClick={() => navigate('/register/welcome')}
                                >
                                    Yes, Exit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RegisterRoleRemote;
