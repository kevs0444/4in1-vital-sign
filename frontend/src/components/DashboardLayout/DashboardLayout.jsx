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
    children
}) => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile drawer open state
    const [isCollapsed, setIsCollapsed] = useState(false); // Desktop collapsed state

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
        const firstName = user.firstname || user.first_name || user.name?.split(' ')[0] || '';
        const lastName = user.lastname || user.last_name || user.name?.split(' ')[1] || '';
        const initials = `${firstName?.[0] || ''}${lastName?.[0] || ''}`;
        return initials.toUpperCase() || '?';
    };

    // Helper to get full name
    const getUserFullName = () => {
        if (!user) return 'User';
        const firstName = user.firstname || user.first_name || '';
        const lastName = user.lastname || user.last_name || '';
        if (firstName || lastName) return `${firstName} ${lastName}`.trim();
        return user.name || 'User';
    };

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
                    {user && !isCollapsed && (
                        <div className="user-profile">
                            <div className="user-avatar">
                                {getUserInitials()}
                            </div>
                            <div className="user-info">
                                <div className="user-name">{getUserFullName()}</div>
                                <div className="user-role">{user.role}</div>
                            </div>
                        </div>
                    )}
                    {user && isCollapsed && (
                        <div className="user-avatar collapsed-avatar" title={getUserFullName()}>
                            {getUserInitials()}
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
        </div>
    );
};

export default DashboardLayout;
