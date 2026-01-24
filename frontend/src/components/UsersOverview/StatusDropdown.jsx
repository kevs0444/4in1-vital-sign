import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const StatusDropdown = ({ currentStatus, onStatusChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
        <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }} onClick={(e) => e.stopPropagation()}>
            <button
                onClick={() => setIsOpen(!isOpen)}
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

            {isOpen && (
                <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                        position: 'absolute',
                        bottom: '100%',
                        left: 0,
                        right: 0,
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                        padding: '4px',
                        marginBottom: '4px',
                        zIndex: 10,
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
                </motion.div>
            )}
        </div>
    );
};

export default StatusDropdown;
