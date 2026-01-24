import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const RoleDropdown = ({ currentRole, onRoleChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const roles = ['Student', 'Nurse', 'Doctor', 'Employee', 'Admin'];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getRoleColor = (role) => {
        const r = role.toLowerCase();
        switch (r) {
            case 'student': return { bg: '#fef3c7', text: '#b45309', border: '#fde68a' }; // Yellow/Beige
            case 'nurse': return { bg: '#e0f2fe', text: '#0369a1', border: '#bae6fd' }; // Light Blue
            case 'doctor': return { bg: '#ecfccb', text: '#4d7c0f', border: '#d9f99d' }; // Light Green
            case 'employee': return { bg: '#f3e8ff', text: '#7e22ce', border: '#e9d5ff' }; // Light Purple
            case 'admin': return { bg: '#fee2e2', text: '#dc2626', border: '#fecaca' }; // Light Red
            default: return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' }; // Gray
        }
    };

    const handleSelect = (role) => {
        onRoleChange(role);
        setIsOpen(false);
    };

    const currentStyle = getRoleColor(currentRole);

    return (
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%', minWidth: '100px' }} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '20px', // Match badge style roughly
                    fontWeight: '600',
                    fontSize: '0.8rem', // Slightly smaller font match badge
                    border: `1px solid ${currentStyle.border}`,
                    background: currentStyle.bg,
                    color: currentStyle.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s',
                    whiteSpace: 'nowrap'
                }}
            >
                {currentRole}
                <span style={{ fontSize: '0.6rem', opacity: 0.7 }}>▼</span>
            </button>

            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'absolute',
                        top: '100%',
                        left: '50%',
                        transform: 'translateX(-50%)', // Center align
                        minWidth: '120px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        padding: '4px',
                        marginTop: '4px',
                        zIndex: 50,
                        border: '1px solid #e2e8f0'
                    }}
                >
                    {roles.map((role) => {
                        const style = getRoleColor(role);
                        return (
                            <div
                                key={role}
                                onClick={() => handleSelect(role)}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.background = style.bg;
                                    e.currentTarget.style.color = style.text;
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.background = 'transparent';
                                    e.currentTarget.style.color = '#475569';
                                }}
                                style={{
                                    padding: '8px',
                                    borderRadius: '6px',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    fontSize: '0.85rem',
                                    color: '#475569',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.1s',
                                    marginBottom: '2px'
                                }}
                            >
                                {role}
                            </div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
};

export default RoleDropdown;
