import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const StatusDropdown = ({ currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const buttonRef = useRef(null);

    const dropdownRef = useRef(null);

    // Update coordinates when opening
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const updatePosition = () => {
                const rect = buttonRef.current.getBoundingClientRect();
                setCoords({
                    top: rect.top + window.scrollY - 4, // Position at top of button
                    left: rect.left + window.scrollX + (rect.width / 2) // Center horizontally
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
            if (buttonRef.current && buttonRef.current.contains(event.target)) return;
            if (dropdownRef.current && dropdownRef.current.contains(event.target)) return;
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

    const getStatusColor = (status) => {
        switch (status) {
            case 'approved': return { bg: '#dcfce7', text: '#166534', border: '#bbf7d0' };
            case 'rejected': return { bg: '#fee2e2', text: '#991b1b', border: '#fecaca' };
            case 'pending': default: return { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' };
        }
    };

    const handleSelect = (status) => {
        onStatusChange(status);
        setIsOpen(false);
    };

    const currentStyle = getStatusColor(currentStatus);

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
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    border: `1px solid ${currentStyle.border}`,
                    background: currentStyle.bg,
                    color: currentStyle.text,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    textTransform: 'capitalize',
                    transition: 'all 0.2s'
                }}
            >
                {currentStatus}
                <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>▼</span>
            </button>

            {isOpen && createPortal(
                <div
                    ref={dropdownRef}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        position: 'absolute',
                        top: coords.top,
                        left: coords.left,
                        transform: 'translate(-50%, -100%)', // Move UP and Center
                        minWidth: '120px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        padding: '4px',
                        zIndex: 9999,
                        border: '1px solid #e2e8f0'
                    }}
                >
                    {['pending', 'approved', 'rejected'].map((status) => {
                        const style = getStatusColor(status);
                        return (
                            <div
                                key={status}
                                onClick={() => handleSelect(status)}
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
                                    fontSize: '0.9rem',
                                    color: '#475569',
                                    textTransform: 'capitalize',
                                    transition: 'all 0.1s',
                                    marginBottom: '2px'
                                }}
                            >
                                {status}
                            </div>
                        );
                    })}
                </div>,
                document.body
            )}
        </>
    );
};

export default StatusDropdown;
