import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Notifications, Person, Print, Dashboard, Email } from '@mui/icons-material';

const NotificationBell = ({
    pendingCount = 0,
    printerStatus = { status: 'checking' },
    shareStats = { paperRemaining: 100, emailCount: 0 },
    onNavigate,
    userRole = 'admin', // 'admin', 'doctor', 'nurse', 'student', 'employee'
    notifications = []
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Determine alerts based on role
    // Admin sees EVERYTHING
    // Others might only see Printer/Paper errors (if they are using Kiosk)
    const isAdmin = userRole === 'admin';
    const isKioskRole = ['student', 'employee', 'doctor', 'nurse'].includes(userRole);

    const hasUserAlerts = isAdmin && pendingCount > 0;
    const hasPrinterError = isAdmin && printerStatus.status !== 'ready' && printerStatus.status !== 'checking';
    const hasLowPaper = isAdmin && shareStats.paperRemaining <= 20;

    // Total alerts count
    let alertCount = 0;
    if (hasUserAlerts) alertCount++;
    if (hasPrinterError) alertCount++;
    if (hasLowPaper) alertCount++;
    alertCount += notifications.length;

    const hasAlerts = alertCount > 0;

    return (
        <div ref={dropdownRef} style={{ position: 'relative', zIndex: 1000 }}>
            <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    background: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px', // Slightly smaller to fit standard headers
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    cursor: 'pointer',
                    position: 'relative',
                    color: '#64748b'
                }}
            >
                <Notifications />
                {hasAlerts && (
                    <span style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#ef4444',
                        borderRadius: '50%',
                        border: '2px solid white'
                    }} />
                )}
            </motion.button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        style={{
                            position: 'absolute',
                            top: '50px',
                            right: '0',
                            width: '300px',
                            backgroundColor: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #f1f5f9',
                            padding: '16px',
                            overflow: 'hidden'
                        }}
                    >
                        <div style={{ marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>
                                Notifications
                            </h3>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Live Status</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                            {/* Pending Users (Admin Only) */}
                            {isAdmin && (
                                <div
                                    onClick={() => { if (onNavigate) { onNavigate('users'); setIsOpen(false); } }}
                                    style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: onNavigate ? 'pointer' : 'default', padding: '4px', borderRadius: '8px', transition: 'background 0.2s', '&:hover': { background: '#f8fafc' } }}
                                >
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: pendingCount > 0 ? '#fff7ed' : '#f1f5f9', color: pendingCount > 0 ? '#f97316' : '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Person fontSize="small" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>User Registration</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: pendingCount > 0 ? '#ea580c' : '#64748b' }}>
                                            {pendingCount > 0 ? `${pendingCount} pending approval(s)` : 'All users approved'}
                                        </p>
                                    </div>
                                    {pendingCount > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 'bold', color: '#f97316' }}>Action</span>}
                                </div>
                            )}

                            {/* Printer Status (Admin Only) */}
                            {isAdmin && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: printerStatus.status === 'ready' ? '#f0fdf4' : '#fef2f2', color: printerStatus.status === 'ready' ? '#16a34a' : '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Print fontSize="small" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>Printer System</h4>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: printerStatus.status === 'ready' ? '#16a34a' : '#ef4444' }}></span>
                                            <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                                {printerStatus.status === 'ready' ? 'Online' : 'Offline/Error'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Paper Status - Admin Only */}
                            {isAdmin && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: shareStats.paperRemaining <= 20 ? '#fffbeb' : '#f0f9ff', color: shareStats.paperRemaining <= 20 ? '#d97706' : '#0ea5e9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Dashboard fontSize="small" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>Paper Roll</h4>
                                        <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', marginTop: '4px' }}>
                                            <div style={{ width: `${shareStats.paperRemaining}%`, height: '100%', borderRadius: '2px', background: shareStats.paperRemaining <= 20 ? '#d97706' : '#0ea5e9' }}></div>
                                        </div>
                                        <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                                            {shareStats.paperRemaining}% remaining
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Email Status (Admin Only usually, but stats are nice for everyone if public?) -> Let's show for Admin only for now to keep it clean, or everyone? User said "component for notifications in ALL roles".
                                Email stats are less "notification" worthy unless failed.
                                I'll show it if count > 0 or Admin.
                              */}
                            {isAdmin && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f3e8ff', color: '#9333ea', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Email fontSize="small" />
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>Email Service</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                            {shareStats.emailCount} emails sent
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Custom/Generic Notifications (All Roles) */}
                            {notifications.length > 0 && notifications.map((note, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
                                    <div style={{
                                        width: '36px', height: '36px', borderRadius: '8px',
                                        background: note.type === 'success' ? '#f0fdf4' : note.type === 'warning' ? '#fffbeb' : '#f1f5f9',
                                        color: note.type === 'success' ? '#16a34a' : note.type === 'warning' ? '#d97706' : '#64748b',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        {note.icon || <Notifications fontSize="small" />}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#334155' }}>{note.title}</h4>
                                        <p style={{ margin: 0, fontSize: '0.75rem', color: '#64748b' }}>
                                            {note.message}
                                        </p>
                                    </div>
                                </div>
                            ))}

                            {!hasAlerts && notifications.length === 0 && !isAdmin && (
                                <div style={{ textAlign: 'center', padding: '10px', color: '#94a3b8', fontSize: '0.85rem' }}>
                                    No new notifications
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default NotificationBell;
