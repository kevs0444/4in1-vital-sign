import React, { useState, useEffect } from 'react';

import { motion, AnimatePresence } from 'framer-motion';
import { Logout, Menu, Close, ChevronLeft, ChevronRight } from '@mui/icons-material';
import './DashboardLayout.css';


const DashboardLayout = ({
    title = 'Medical Portal',
    subtitle = 'Dashboard',
    user,
    tabs = [],
    activeTab,
    onTabChange,
    onLogout,
    lastUpdated,
    onRefresh,
    isConnected = false,
    children
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer open state
    const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapsed state
    const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // Logout confirmation modal state

    // Session Protection: Prevent Back Button Logout
    useEffect(() => {
        // Push a state so that the back button logic has something to pop
        // This effectively "traps" the user on the current page
        window.history.pushState(null, document.title, window.location.href);

        const handlePopState = (event) => {
            // Prevent leaving the page immediately
            event.preventDefault();
            // Push state again to maintain the trap (so they stay on the page)
            window.history.pushState(null, document.title, window.location.href);
            // Show confirmation modal
            setShowLogoutConfirm(true);
        };

        window.addEventListener('popstate', handlePopState);

        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, []);


    // Close sidebar when active tab changes on mobile
    useEffect(() => {
        if (window.innerWidth <= 1024) {
            setIsSidebarOpen(false);
        }
    }, [activeTab]);

    // Load collapsed state from localStorage
    useEffect(() => {
        const savedState = localStorage.getItem('sidebar-collapsed');
        if (savedState === 'true') {
            setIsCollapsed(true);
        }
    }, []);

    // Save collapsed state to localStorage
    const toggleCollapse = () => {
        const newState = !isCollapsed;
        setIsCollapsed(newState);
        localStorage.setItem('sidebar-collapsed', newState.toString());
    };

    // Helper to get user initials (handles different property naming conventions)
    const getUserInitials = () => {
        if (!user) return '?';
        const firstName = user.firstName || user.firstname || user.first_name || user.name?.split(' ')[0] || '';
        const lastName = user.lastName || user.lastname || user.last_name || user.name?.split(' ')[1] || '';
        const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
        return initials.toUpperCase() || '?';
    };

    // Helper to get full name
    const getUserFullName = () => {
        if (!user) return 'User';
        const firstName = user.firstName || user.firstname || user.first_name || '';
        const lastName = user.lastName || user.lastname || user.last_name || '';
        if (firstName || lastName) return `${firstName} ${lastName}`.trim();
        return user.name || 'User';
    };

    // Connection status colors
    const statusColor = isConnected ? '#10b981' : '#f59e0b';
    const statusBg = isConnected ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
    const statusText = isConnected ? 'Live' : 'Connecting...';

    return (
        <div className={`dashboard-layout ${isCollapsed ? 'sidebar-collapsed' : ''}`}>
            {/* Mobile Overlay */}
            <div
                className={`mobile-overlay ${isSidebarOpen ? 'open' : ''}`}
                onClick={() => setIsSidebarOpen(false)}
            />

            {/* Sidebar */}
            <aside className={`dashboard-sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        {/* You can pass a custom icon or use a default one */}
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                        </svg>
                    </div>
                    {!isCollapsed && (
                        <div className="sidebar-title">
                            <h1>{title}</h1>
                            <p>{subtitle}</p>
                        </div>
                    )}
                    {/* Close button for mobile within sidebar */}
                    <button
                        className="menu-toggle mobile-close-btn"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <Close />
                    </button>
                </div>

                <nav className="sidebar-nav">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => onTabChange(tab.id)}
                            title={isCollapsed ? tab.label : undefined}
                        >
                            <span className="nav-item-icon">{tab.icon}</span>
                            {!isCollapsed && <span>{tab.label}</span>}
                        </button>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    {/* User Profile with Live Indicator */}
                    {user && !isCollapsed && (
                        <div className="user-profile" style={{ position: 'relative' }}>
                            <div className="user-avatar">
                                {getUserInitials()}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{getUserFullName()}</div>
                                <div className="user-role" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {user.role}
                                    <span style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        fontSize: '0.7rem',
                                        color: statusColor,
                                        marginLeft: '4px'
                                    }}>
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            background: statusColor,
                                            animation: isConnected ? 'pulse 2s infinite' : 'none'
                                        }} />
                                        {statusText}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                    {user && isCollapsed && (
                        <div style={{ position: 'relative' }}>
                            <div className="user-avatar collapsed-avatar" title={getUserFullName()}>
                                {getUserInitials()}
                            </div>
                            <span style={{
                                position: 'absolute',
                                bottom: '0',
                                right: '0',
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: statusColor,
                                border: '2px solid white',
                                animation: isConnected ? 'pulse 2s infinite' : 'none'
                            }} title={statusText} />
                        </div>
                    )}
                    <button className="logout-btn" onClick={onLogout} title={isCollapsed ? 'Sign Out' : undefined}>
                        <Logout style={{ fontSize: '1.2rem' }} />
                        {!isCollapsed && <span>Sign Out</span>}
                    </button>
                </div>

                {/* Collapse Toggle Button (Desktop Only) */}
                <button className="collapse-toggle" onClick={toggleCollapse} title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}>
                    {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
                </button>
            </aside>

            {/* Main Content Area */}
            <main className={`dashboard-main ${isCollapsed ? 'expanded' : ''}`}>
                {/* Mobile Header */}
                <header className="mobile-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <button className="menu-toggle" onClick={() => setIsSidebarOpen(true)}>
                            <Menu />
                        </button>
                        <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1e293b' }}>
                            {title}
                        </div>
                    </div>
                    <div className="user-avatar" style={{ width: '32px', height: '32px', fontSize: '0.8rem' }}>
                        {user?.firstname?.[0]}{user?.lastname?.[0]}
                    </div>
                </header>

                <div className="dashboard-content-wrapper" style={{ flex: 1, overflowX: 'hidden' }}>
                    {children}
                </div>
            </main>

            {/* Logout Confirmation Modal for Back Button Protection */}
            <AnimatePresence>
                {showLogoutConfirm && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 3000,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }} onClick={() => setShowLogoutConfirm(false)}>
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="modal-content"
                            style={{
                                background: 'white',
                                borderRadius: '16px',
                                maxWidth: '350px',
                                width: '90%',
                                padding: '24px',
                                textAlign: 'center',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ margin: '0 0 16px', color: '#1e293b', fontSize: '1.25rem', fontWeight: 600 }}>End Session?</h3>
                            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                                Going back will end your current session. Are you sure you want to log out?
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowLogoutConfirm(false)}
                                    style={{
                                        flex: 1, padding: '12px', background: '#f1f5f9',
                                        border: 'none', borderRadius: '8px', color: '#64748b', fontWeight: 'bold',
                                        cursor: 'pointer', transition: 'background 0.2s'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        setShowLogoutConfirm(false);
                                        onLogout();
                                    }}
                                    style={{
                                        flex: 1, padding: '12px', background: '#ef4444',
                                        border: 'none', borderRadius: '8px', color: 'white', fontWeight: 'bold',
                                        cursor: 'pointer', transition: 'background 0.2s',
                                        boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    Log Out
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DashboardLayout;
