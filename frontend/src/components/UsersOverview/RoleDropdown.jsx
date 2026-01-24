import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const RoleDropdown = ({ currentRole, onRoleChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const buttonRef = useRef(null);
    const dropdownRef = useRef(null);
    const roles = ['Student', 'Nurse', 'Doctor', 'Employee', 'Admin'];

    // Update coordinates when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const updatePosition = () => {
                const rect = buttonRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.bottom + window.scrollY + 4,
                    left: rect.left + window.scrollX + (rect.width / 2),
                    width: rect.width
                });
            };
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isOpen]);

    // Close on click outside or global close event
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                buttonRef.current &&
                buttonRef.current.contains(event.target)
            ) return;

            if (
                dropdownRef.current &&
                dropdownRef.current.contains(event.target)
            ) return;

            setIsOpen(false);
        };

        const handleGlobalClose = (e) => {
            setIsOpen(false);
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            window.addEventListener('closeAllDropdowns', handleGlobalClose);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            window.removeEventListener('closeAllDropdowns', handleGlobalClose);
        };
    }, [isOpen]);

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
        <>
            <button
                ref={buttonRef}
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isOpen) {
                        // Close other dropdowns
                        window.dispatchEvent(new CustomEvent('closeAllDropdowns'));
                    }
                    setIsOpen(!isOpen);
                }}
                style={{
                    width: '100%',
                    padding: '6px 10px',
                    borderRadius: '20px',
                    fontWeight: '600',
                    fontSize: '0.8rem',
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

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        top: coords.top,
                        left: coords.left,
                        transform: 'translateX(-50%)',
                        minWidth: '140px',
                        backgroundColor: 'white',
                        borderRadius: '12px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        padding: '6px',
                        zIndex: 9999,
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
                                    padding: '8px 12px',
                                    borderRadius: '8px',
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
                </div>,
                document.body
            )}
        </>
    );
};

export default RoleDropdown;
