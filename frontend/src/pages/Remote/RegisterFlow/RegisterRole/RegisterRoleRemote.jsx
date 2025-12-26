import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';

// Import icons (4 levels up: RegisterRole -> RegisterFlow -> Remote -> pages -> src)
import employeeIcon from "../../../../assets/icons/employee-icon.png";
import studentIcon from "../../../../assets/icons/student-icon.png";
import nurseJuanIcon from "../../../../assets/icons/nurse-juan-icon.png";
import doctorJuanIcon from "../../../../assets/icons/doctor-juan-icon.png";

const RegisterRoleRemote = () => {
    const navigate = useNavigate();
    const [selectedRole, setSelectedRole] = useState(null);

    const roles = [
        {
            id: "rtu-employees",
            title: "RTU Employee",
            description: "Faculty & Staff",
            icon: employeeIcon,
            color: "#16a34a", // Green (Role specific color stays)
            bg: "#dcfce7",
            route: "/register/personal-info"
        },
        {
            id: "rtu-students",
            title: "RTU Student",
            description: "Currently Enrolled",
            icon: studentIcon,
            color: "#0ea5e9", // Blue
            bg: "#e0f2fe",
            route: "/register/personal-info"
        },
        {
            id: "nurse",
            title: "Nurse",
            description: "Medical Staff",
            icon: nurseJuanIcon,
            color: "#ec4899", // Pink
            bg: "#fce7f3",
            route: "/register/personal-info"
        },
        {
            id: "doctor",
            title: "Doctor",
            description: "Medical Doctor",
            icon: doctorJuanIcon,
            color: "#8b5cf6", // Purple
            bg: "#f3e8ff",
            route: "/register/personal-info"
        }
    ];

    const handleContinue = () => {
        if (!selectedRole) return;
        const role = roles.find(r => r.id === selectedRole);
        if (role) {
            navigate(role.route, { state: { userType: selectedRole } });
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            width: '100%',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative'
        }}>
            {/* Top Bar with Red Theme Accent */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                zIndex: 10,
                borderBottom: '1px solid #fee2e2' // Light red border
            }}>
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px',
                        marginLeft: '-8px',
                        cursor: 'pointer',
                        color: '#334155'
                    }}
                >
                    <ArrowBack />
                </button>
                <div style={{ flex: 1, textAlign: 'center', marginRight: '32px' }}>
                    <h1 style={{
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        color: '#1e293b',
                        margin: 0
                    }}>
                        Select Role
                    </h1>
                </div>
            </div>

            {/* Scrollable Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <div style={{ marginBottom: '8px' }}>
                    <h2 style={{
                        fontSize: '1.5rem',
                        fontWeight: '800',
                        color: '#1e293b',
                        margin: '0 0 8px 0'
                    }}>
                        Who are you?
                    </h2>
                    <p style={{
                        color: '#64748b',
                        margin: 0,
                        fontSize: '0.95rem'
                    }}>
                        Choose the option that describes you best.
                    </p>
                </div>

                {roles.map((role) => (
                    <motion.div
                        key={role.id}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => setSelectedRole(role.id)}
                        style={{
                            background: selectedRole === role.id ? 'white' : 'white',
                            border: `2px solid ${selectedRole === role.id ? role.color : 'transparent'}`,
                            borderRadius: '20px',
                            padding: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px',
                            cursor: 'pointer',
                            boxShadow: selectedRole === role.id
                                ? `0 8px 20px -6px ${role.color}40`
                                : '0 2px 8px rgba(0,0,0,0.05)',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Icon Container */}
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: role.bg,
                            borderRadius: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                        }}>
                            <img
                                src={role.icon}
                                alt={role.title}
                                style={{ width: '32px', height: '32px', objectFit: 'contain' }}
                            />
                        </div>

                        {/* Text Content */}
                        <div style={{ flex: 1 }}>
                            <h3 style={{
                                margin: '0 0 4px 0',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: '#1e293b'
                            }}>
                                {role.title}
                            </h3>
                            <p style={{
                                margin: 0,
                                fontSize: '0.85rem',
                                color: '#64748b'
                            }}>
                                {role.description}
                            </p>
                        </div>

                        {/* Selection Indicator */}
                        <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: `2px solid ${selectedRole === role.id ? role.color : '#cbd5e1'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: selectedRole === role.id ? role.color : 'transparent',
                            transition: 'all 0.2s'
                        }}>
                            {selectedRole === role.id && (
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Bottom Floating Action Button - Red Theme */}
            <div style={{
                padding: '24px',
                background: 'white',
                borderTop: '1px solid #f1f5f9',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.02)'
            }}>
                <button
                    onClick={handleContinue}
                    disabled={!selectedRole}
                    style={{
                        width: '100%',
                        padding: '18px',
                        // Use Role color if selected, otherwise gray. 
                        // If we want STRICT red theme, we could override this, but role colors are informative.
                        // However, button style itself is modern.
                        background: selectedRole
                            ? (roles.find(r => r.id === selectedRole)?.color || '#ef4444')
                            : '#cbd5e1',
                        color: 'white',
                        border: 'none',
                        borderRadius: '16px',
                        fontSize: '1.1rem',
                        fontWeight: '700',
                        boxShadow: selectedRole
                            ? `0 8px 20px -6px ${roles.find(r => r.id === selectedRole)?.color}60`
                            : 'none',
                        cursor: selectedRole ? 'pointer' : 'not-allowed',
                        transition: 'all 0.2s'
                    }}
                >
                    {selectedRole ? 'Continue' : 'Select a Role'}
                </button>
            </div>
        </div>
    );
};

export default RegisterRoleRemote;
