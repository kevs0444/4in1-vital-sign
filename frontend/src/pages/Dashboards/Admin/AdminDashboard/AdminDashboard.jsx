import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Close, ErrorOutline, WarningAmber,
    Search,
    Person,
    Visibility,
    GridView,
    TableRows,
    Settings,

    People,
    History,
    Build,
    Print,
    Dashboard,
    Notifications,
    Email
} from '@mui/icons-material';
import DashboardLayout from '../../../../components/DashboardLayout/DashboardLayout';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler
} from 'chart.js';
import { Line, Pie } from 'react-chartjs-2';
import './AdminDashboard.css';
import '../../../../components/PatientList/PatientList.css'; // Shared styles for User Cards
import { getAdminStats, getAdminUsers, updateUserStatus, updateUserProfile, getMeasurementHistory, printerAPI, getShareStatsFiltered, resetPaperRoll } from '../../../../utils/api';
import Maintenance from '../Maintenance/Maintenance'; // Import Maintenance component
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardAnalytics, { TimePeriodFilter, filterHistoryByTimePeriod, MultiSelectDropdown } from '../../../../components/DashboardAnalytics/DashboardAnalytics';
import NoDataFound from '../../../../components/NoDataFound/NoDataFound';

import { useRealtimeUpdates } from '../../../../hooks/useRealtimeData';
import { exportToCSV, exportToExcel, exportToPDF } from '../../../../utils/exportUtils';
import ExportButton from '../../../../components/ExportButton/ExportButton';
import Pagination from '../../../../components/Pagination/Pagination';
import MyMeasurements from '../../../../components/MyMeasurements/MyMeasurements';
import UsersOverview from '../../../../components/UsersOverview/UsersOverview';
import HealthOverview from '../../../../components/HealthOverview/HealthOverview';
import MeasurementDetailsModal from '../../../../components/MeasurementDetailsModal/MeasurementDetailsModal';

// StatusToast Component (Local Definition)
const StatusToast = ({ toast, onClose }) => {
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Auto close after 5 seconds
            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    if (!toast) return null;

    return (
        <div className="status-toast-overlay" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={toast.id || 'toast'}
                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`status-toast ${toast.type}`}
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        minWidth: '320px',
                        maxWidth: '400px',
                        borderLeft: `6px solid ${toast.type === 'success' ? '#10b981' :
                            toast.type === 'error' ? '#ef4444' :
                                '#f59e0b'
                            }`
                    }}
                >
                    <div className={`toast-icon-wrapper ${toast.type}`} style={{
                        color: toast.type === 'success' ? '#10b981' :
                            toast.type === 'error' ? '#ef4444' :
                                '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px'
                    }}>
                        {toast.type === 'success' && <Check />}
                        {toast.type === 'error' && <ErrorOutline />}
                        {toast.type === 'warning' && <WarningAmber />}
                    </div>

                    <div className="toast-content" style={{ flex: 1 }}>
                        <span className="toast-title" style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                            {toast.title}
                        </span>
                        <span className="toast-message" style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            {toast.message}
                        </span>
                    </div>

                    <button className="toast-close" onClick={onClose} style={{
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Close fontSize="small" />
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};


// Register ChartJS components
ChartJS.register(
    ArcElement,

    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement,
    RadialLinearScale,
    Filler
);

// Helper component for auto-closing notifications
const NotificationTimer = ({ id, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose(id);
        }, 5000); // 5 seconds auto close
        return () => clearTimeout(timer);
    }, [id, onClose]);
    return null;
};




const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [toast, setToast] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard', 'analytics', 'users', 'history', 'maintenance', 'profile'
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total_users: 0,
        avg_bmi: 0,
        risk_distribution: {},
        roles_distribution: {},
        measurements_today: 0,
        printer_status: 'Checking...',
        users_trend: [],
        measurements_trend: []
    });

    const [usersList, setUsersList] = useState([]);
    // Removed unused filter states (moved to UsersOverview)

    // Printing Status
    const [printerStatus, setPrinterStatus] = useState({ status: 'checking', message: 'Checking...' });

    // Share Statistics (Email & Print)
    const [shareStats, setShareStats] = useState({
        emailCount: 0,
        printCount: 0,
        paperRemaining: 100
    });
    const [showResetModal, setShowResetModal] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const [emailTimePeriod, setEmailTimePeriod] = useState('weekly');
    const [emailCustomDateRange, setEmailCustomDateRange] = useState(null);
    const [emailStatus, setEmailStatus] = useState('idle'); // 'idle' or 'sending'

    // Personal History State
    const [myHistory, setMyHistory] = useState([]);
    // Removed unused historyLoading
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [userHistoryLoading, setUserHistoryLoading] = useState(false);

    // Personal History Time Period
    const [timePeriod, setTimePeriod] = useState('weekly');
    const [customDateRange, setCustomDateRange] = useState(null);

    // User Management Time Period
    // Removed unused usersTimePeriod

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const [statsData, usersData] = await Promise.all([
                getAdminStats(),
                getAdminUsers()
            ]);

            setStats((statsData && statsData.stats) ? statsData.stats : {
                total_users: 0,
                avg_bmi: 0,
                risk_distribution: {},
                roles_distribution: {},
                measurements_today: 0,
                printer_status: 'Checking...',
                users_trend: [],
                measurements_trend: []
            });

            const usersArray = (usersData && usersData.users) ? usersData.users : [];
            setUsersList(Array.isArray(usersArray) ? usersArray : []);
        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchMyHistory = async (userId) => {
        try {
            const response = await getMeasurementHistory(userId);
            setMyHistory((response && response.history && Array.isArray(response.history)) ? response.history : []);
        } catch (error) {
            console.error("Error fetching history:", error);
        }
    };

    const fetchUserHistory = async (targetUserId) => {
        try {
            setUserHistoryLoading(true);
            const response = await getMeasurementHistory(targetUserId);
            setUserHistory((response && response.history && Array.isArray(response.history)) ? response.history : []);
        } catch (error) {
            console.error("Error fetching user history:", error);
            // toast({ type: 'error', title: 'Error', message: 'Failed to fetch user history.' });
        } finally {
            setUserHistoryLoading(false);
        }
    };

    const handleUserClick = (u) => {
        setSelectedUser(u);
        fetchUserHistory(u.user_id || u.id);
    };

    const checkPrinterStatus = async () => {
        try {
            const status = await printerAPI.getStatus();
            setPrinterStatus(status);
            setStats(prev => ({ ...prev, printer_status: status.message }));
        } catch (error) {
            console.error("Printer status check failed", error);
            setPrinterStatus({ status: 'error', message: 'Connection Failed' });
        }
    };

    const fetchShareStats = React.useCallback(async () => {
        try {
            // Calculate Date Range
            let dateParams = {};
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);

            // Helper for local time ISO string (matches DB naive datetime)
            const toLocalISOString = (date) => {
                const tzOffset = date.getTimezoneOffset() * 60000;
                return new Date(date.getTime() - tzOffset).toISOString().slice(0, -1);
            };

            if (emailTimePeriod === 'custom' && emailCustomDateRange?.start && emailCustomDateRange?.end) {
                dateParams = { start_date: emailCustomDateRange.start, end_date: emailCustomDateRange.end };
            } else {
                switch (emailTimePeriod) {
                    case 'daily':
                        dateParams = { start_date: toLocalISOString(start), end_date: toLocalISOString(end) };
                        break;
                    case 'weekly':
                        start.setDate(start.getDate() - 7);
                        dateParams = { start_date: toLocalISOString(start), end_date: toLocalISOString(end) };
                        break;
                    case 'monthly':
                        start.setMonth(start.getMonth() - 1);
                        dateParams = { start_date: toLocalISOString(start), end_date: toLocalISOString(end) };
                        break;
                    case 'annually':
                        start.setFullYear(start.getFullYear() - 1);
                        dateParams = { start_date: toLocalISOString(start), end_date: toLocalISOString(end) };
                        break;
                    default:
                        dateParams = {}; // All time
                }
            }

            console.log('📧 Fetching share stats with params:', dateParams);
            const response = await getShareStatsFiltered(dateParams);
            console.log('📧 Share stats response:', response);
            if (response && response.success && response.stats) {
                console.log('📧 Setting shareStats:', response.stats);
                setShareStats({
                    emailCount: response.stats.email_sent_count || 0,
                    printCount: response.stats.receipt_printed_count || 0,
                    paperRemaining: response.stats.paper_remaining ?? 100
                });
            }
        } catch (error) {
            console.error("Error fetching share stats:", error);
        }
    }, [emailTimePeriod, emailCustomDateRange]);

    const handleResetPaperRoll = async () => {
        setIsResetting(true);
        try {
            const response = await resetPaperRoll();
            if (response && response.success) {
                setShareStats(prev => ({ ...prev, printCount: 0, paperRemaining: 100 }));
                setToast({ type: 'success', title: 'Paper Roll Reset', message: 'Receipt counter has been reset for the new roll.', id: Date.now() });
            } else {
                throw new Error(response?.message || 'Reset failed');
            }
        } catch (error) {
            console.error("Error resetting paper roll:", error);
            setToast({ type: 'error', title: 'Reset Failed', message: 'Could not reset paper roll counter.', id: Date.now() });
        } finally {
            setIsResetting(false);
            setShowResetModal(false);
        }
    };



    useEffect(() => {
        // Check location state first (passed from navigation), then localStorage
        const savedUser = location.state?.user || (localStorage.getItem('userData') ? JSON.parse(localStorage.getItem('userData')) : null);

        if (savedUser) {
            setUser(savedUser);
            // Fetch my own history
            fetchMyHistory(savedUser.userId || savedUser.user_id || savedUser.id);
        } else {
            navigate('/login');
        }
        fetchDashboardData();

        // Poll printer status every 5 seconds for real-time live updates
        const printerInterval = setInterval(checkPrinterStatus, 5000);
        checkPrinterStatus(); // Initial check

        // Fetch share stats initially and poll every 2 seconds for REAL-TIME updates
        fetchShareStats();
        const shareStatsInterval = setInterval(fetchShareStats, 2000);

        return () => {
            clearInterval(printerInterval);
            clearInterval(shareStatsInterval);
        };
    }, [navigate, location, fetchShareStats]);

    // Real-time WebSocket updates - instant push notifications
    const refetchAllData = React.useCallback(async () => {
        setEmailStatus('idle'); // Clear sending status when we get new data (transmission done)
        // Parallel fetch for maximum speed
        await Promise.all([
            fetchDashboardData(),
            checkPrinterStatus(),
            fetchShareStats(),
            user ? fetchMyHistory(user.userId || user.user_id || user.id) : Promise.resolve()
        ]);
    }, [user, fetchShareStats]); // Added dependencies for share stats

    const { isConnected, lastUpdated } = useRealtimeUpdates({
        role: 'Admin',
        userId: user?.userId || user?.user_id || user?.id,
        refetchData: refetchAllData,
        onNewMeasurement: (data) => {
            console.log('📊 New measurement received:', data);
            // Data will be refetched automatically
        },
        onNewUser: (data) => {
            console.log('👤 New user registered:', data);
            // Add notification
            setNotifications(prev => [{
                id: `new-user-${Date.now()}`,
                type: 'info',
                title: 'New Registration',
                message: `New user ${data.name || ''} registered.`,
                time: 'Just now',
                read: false,
                color: '#3b82f6'
            }, ...prev]);
        },
        onDataUpdate: (event) => {
            if (event.type === 'email_activity' && event.data.status === 'sending') {
                setEmailStatus('sending');
                // Failsafe reset after 15s
                setTimeout(() => setEmailStatus(prev => prev === 'sending' ? 'idle' : prev), 15000);
            }
        }
    });

    // --- Notification System ---
    const [notifications, setNotifications] = useState([]);
    const prevEmailCount = React.useRef(shareStats.emailCount);

    // 1. Monitor Pending Users
    useEffect(() => {
        if (!usersList) return;
        const pendingCount = usersList.filter(u => u.approval_status === 'pending').length;

        setNotifications(prev => {
            // Remove old pending alerts to avoid duplicates/stale data
            const clean = prev.filter(n => n.type !== 'pending');
            if (pendingCount > 0) {
                return [{
                    id: 'pending-alert',
                    type: 'pending',
                    title: 'Pending Approvals',
                    message: `${pendingCount} user(s) waiting for approval.`,
                    time: 'Action Required',
                    read: false,
                    color: '#f59e0b',
                    action: () => setActiveTab('users')
                }, ...clean];
            }
            return clean;
        });
    }, [usersList, setActiveTab]);

    // 2. Monitor Email Sends
    useEffect(() => {
        // Initialize ref if 0
        if (prevEmailCount.current === 0 && shareStats.emailCount > 0) {
            prevEmailCount.current = shareStats.emailCount;
            return;
        }

        if (shareStats.emailCount > prevEmailCount.current) {
            setNotifications(prev => [{
                id: `email-${Date.now()}`,
                type: 'email',
                title: 'Email Sent',
                message: 'Weekly report sent successfully.',
                time: 'Just now',
                read: false,
                color: '#10b981'
            }, ...prev]);
            prevEmailCount.current = shareStats.emailCount;
        }
    }, [shareStats.emailCount]);

    // 3. Monitor Printer
    useEffect(() => {
        if (printerStatus.status === 'offline' || printerStatus.status === 'error') {
            setNotifications(prev => {
                if (prev.some(n => n.type === 'printer' && n.read === false)) return prev; // Don't spam if unread exists
                return [{
                    id: `printer-${Date.now()}`,
                    type: 'printer',
                    title: 'Printer Issue',
                    message: `Printer is ${printerStatus.status}: ${printerStatus.message}`,
                    time: 'Now',
                    read: false,
                    color: '#ef4444'
                }, ...prev];
            });
        }
    }, [printerStatus.status, printerStatus.message]);

    // 4. Monitor Paper Roll
    // 4. Monitor Paper Roll
    const prevPaperStatus = React.useRef('ok');
    useEffect(() => {
        const currentPaperLevel = shareStats.paperRemaining;
        let currentStatus = 'ok';

        if (currentPaperLevel <= 0) currentStatus = 'empty';
        else if (currentPaperLevel <= 5) currentStatus = 'critical';
        else if (currentPaperLevel <= 15) currentStatus = 'low';

        // Notify only on status change to worse (or if it's the first time and low)
        // We use a ref to track the last alerted status to avoid spamming on every percentage drop if staying in same tier
        // But we do want to alert if it drops from low to critical or empty
        if (currentStatus !== 'ok' && currentStatus !== prevPaperStatus.current) {
            setNotifications(prev => {
                // Prevent duplicate paper alerts
                if (prev.some(n => n.type === 'paper' && n.read === false)) return prev;

                let title = 'Paper Low';
                let msg = `Thermal paper is ${currentStatus} (${currentPaperLevel}%).`;

                if (currentStatus === 'empty') {
                    title = 'Out of Paper';
                    msg = 'Paper roll is empty (0%). Please replace immediately.';
                } else if (currentStatus === 'critical') {
                    title = 'Paper Critical';
                    msg = `Thermal paper is critically low (${currentPaperLevel}%).`;
                }

                return [{
                    id: `paper-${Date.now()}`,
                    type: 'paper',
                    title: title,
                    message: msg,
                    time: 'Action Required',
                    read: false,
                    color: (currentStatus === 'critical' || currentStatus === 'empty') ? '#ef4444' : '#f59e0b',
                    action: () => setShowResetModal(true)
                }, ...prev];
            });
        }
        prevPaperStatus.current = currentStatus;
    }, [shareStats.paperRemaining]);





    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('token');
        navigate('/login');
    };

    const handleStatusUpdate = async (userId, newStatus) => {
        try {
            // Optimistic update
            const updatedList = usersList.map(u =>
                u.user_id === userId ? { ...u, approval_status: newStatus } : u
            );
            setUsersList(updatedList);

            await updateUserStatus(userId, newStatus);
            // Re-fetch to confirm
            const usersData = await getAdminUsers();
            const usersArray = (usersData && usersData.users) ? usersData.users : [];
            setUsersList(Array.isArray(usersArray) ? usersArray : []);
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert on error would be ideal, but simply refetching works
            fetchDashboardData();
        }
    };

    const handleRoleUpdate = async (userId, newRole) => {
        try {
            // Optimistic update
            const updatedList = usersList.map(u =>
                u.user_id === userId ? { ...u, role: newRole } : u
            );
            setUsersList(updatedList);

            await updateUserProfile(userId, { role: newRole });

            // Re-fetch to confirm and update stats
            fetchDashboardData();
            setToast({ type: 'success', title: 'Role Updated', message: `User role updated to ${newRole}`, id: Date.now() });

        } catch (error) {
            console.error("Failed to update role", error);
            setToast({ type: 'error', title: 'Update Failed', message: 'Failed to update user role.', id: Date.now() });
            fetchDashboardData(); // Revert
        }
    };

    // --- Chart Data Preparation ---
    // Define Role Colors (Red & Gray Theme)
    const roleColors = {
        'Admin': '#b91c1c',    // Dark Red
        'Doctor': '#ef4444',   // Red
        'Nurse': '#f87171',    // Light Red
        'Student': '#475569',  // Dark Gray
        'Employee': '#94a3b8'  // Light Gray
    };

    const roles = Object.keys(stats.roles_distribution || {});
    const roleDoughnutData = {
        labels: roles,
        datasets: [{
            data: Object.values(stats.roles_distribution || {}),
            backgroundColor: roles.map(r => roleColors[r] || '#cbd5e1'),
            borderWidth: 0,
            hoverOffset: 10
        }]
    };

    const trafficData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Active Users',
                data: stats.users_trend?.length ? stats.users_trend : [12, 19, 3, 5, 2, 3, 15],
                borderColor: '#dc2626',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(220, 38, 38, 0.1)'
            },
            {
                label: 'Measurements',
                data: stats.measurements_trend?.length ? stats.measurements_trend : [5, 12, 15, 8, 10, 14, 9],
                borderColor: '#64748b',
                tension: 0.4,
                fill: true,
                backgroundColor: 'rgba(100, 116, 139, 0.1)'
            }
        ]
    };

    const pieOptions = {
        plugins: {
            legend: {
                display: true,
                position: 'right',
                labels: {
                    usePointStyle: true,
                    padding: 15,
                    font: {
                        family: "'Inter', sans-serif",
                        size: 11
                    },
                    color: '#64748b'
                }
            }
        },
        maintainAspectRatio: false,
        layout: {
            padding: 10
        }
    };

    const chartOptions = {
        responsive: true,
        plugins: { legend: { position: 'top' }, title: { display: false } },
        scales: { y: { beginAtZero: true } }
    };

    // Removed unused radarOptions


    // --- History Helper Functions ---
    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getRiskColor = (risk) => {
        if (!risk) return '#64748b';
        const r = risk.toLowerCase();
        if (r.includes('critical') || r.includes('high')) return '#ef4444';
        if (r.includes('moderate') || r.includes('elevated')) return '#f59e0b';
        if (r.includes('normal') || r.includes('ideal') || r.includes('healthy')) return '#10b981'; // Green
        return '#64748b';
    };






    if (!user) return null;

    // Define Tabs
    // Define Tabs
    const tabs = [
        { id: 'dashboard', label: 'Overview', icon: <GridView /> },
        { id: 'users', label: 'Users', icon: <People /> },
        { id: 'maintenance', label: 'System', icon: <Build /> },
        { type: 'spacer' },
        { id: 'myoverview', label: 'My Health Overview', icon: <Dashboard /> },
        { id: 'personal', label: 'My Measurements', icon: <History /> },
        { id: 'profile', label: 'Settings', icon: <Settings /> }
    ];

    return (
        <DashboardLayout
            title={tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            subtitle="Administrator Dashboard"
            user={user}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            lastUpdated={lastUpdated}
            onRefresh={refetchAllData}
            isConnected={isConnected}
        >
            <StatusToast toast={toast} onClose={() => setToast(null)} />



            {/* --- Enhanced Glassmorphism Notifications (Centered) --- */}
            <div className="notification-center-container" style={{
                position: 'fixed',
                top: '20px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                width: '90%',
                maxWidth: '450px',
                pointerEvents: 'none' // Allow clicks to pass through container
            }}>
                <AnimatePresence mode="popLayout">
                    {notifications.map(n => (
                        <motion.div
                            key={n.id}
                            layout
                            initial={{ opacity: 0, y: -50, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            style={{
                                pointerEvents: 'auto',
                                background: 'rgba(255, 255, 255, 0.85)',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                border: '1px solid rgba(255, 255, 255, 0.5)',
                                borderRadius: '16px',
                                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
                                padding: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '15px',
                                width: '100%',
                                borderLeft: `6px solid ${n.type === 'printer' || n.type === 'error' || n.type === 'critical' ? '#dc2626' : // Red
                                    n.type === 'warning' || n.type === 'pending' || n.type === 'paper' ? '#94a3b8' : // Gray (or maybe Orange/Slate per theme) - User asked for Red/White/Gray. Let's use Gray for warnings to fit theme? Or keep status colors?
                                        '#475569' // Dark Gray for others
                                    }`,
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            {/* Icon Box */}
                            <div style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '12px',
                                background: n.type === 'printer' || n.type === 'error' ? 'rgba(220, 38, 38, 0.1)' : 'rgba(71, 85, 105, 0.1)',
                                color: n.type === 'printer' || n.type === 'error' ? '#dc2626' : '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {n.type === 'pending' ? <Person /> :
                                    n.type === 'printer' ? <Print /> :
                                        n.type === 'paper' ? <Dashboard /> : // Use generic icon or specific if available
                                            n.type === 'email' ? <Email /> :
                                                <Notifications />}
                            </div>

                            {/* Content */}
                            <div style={{ flex: 1 }}>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '700', color: '#1e293b' }}>{n.title}</h4>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>{n.message}</p>
                            </div>

                            {/* Close Button */}
                            <button
                                onClick={() => setNotifications(prev => prev.filter(item => item.id !== n.id))}
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    borderRadius: '50%',
                                    transition: 'background 0.2s'
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.05)'; e.currentTarget.style.color = '#dc2626'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
                            >
                                <Close fontSize="small" />
                            </button>

                            {/* Self-Destruct Timer for this specific notification */}
                            <NotificationTimer id={n.id} onClose={(id) => setNotifications(prev => prev.filter(i => i.id !== id))} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Personal Info Tab */}
            {activeTab === 'profile' && user && (
                <PersonalInfo
                    userId={user.userId || user.user_id || user.id}
                    onProfileUpdate={(updatedUser) => {
                        setUser(prev => ({ ...prev, ...updatedUser }));
                    }}
                    onShowToast={(type, title, message) => setToast({ type, title, message, id: Date.now() })}
                />
            )}

            {activeTab === 'dashboard' && (
                <motion.div
                    className="analytics-dashboard"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    {/* 1. Header Metrics Row */}
                    <div className="metrics-grid">
                        {/* 1. Combined Users & Pending Approvals Card (Red Theme) */}
                        <motion.div
                            className="metric-card"
                            whileHover={{ y: -5 }}
                            style={{
                                background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                                color: 'white',
                                border: 'none',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <div className="metric-content" style={{ position: 'relative', zIndex: 2 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                                    {/* Left: Total Users */}
                                    <div style={{ paddingRight: '24px', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.2)',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '12px'
                                            }}>
                                                <Person style={{ fontSize: '1.2rem', color: 'white' }} />
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500', opacity: 0.9 }}>Total Users</span>
                                        </div>
                                        <span style={{ fontSize: '2rem', fontWeight: '800', display: 'block', lineHeight: '1' }}>
                                            {stats.total_users}
                                        </span>
                                        <span style={{ fontSize: '0.75rem', marginTop: '6px', display: 'block', opacity: 0.9 }}>
                                            ↑ 12% vs last week
                                        </span>
                                    </div>

                                    {/* Right: Pending Approvals */}
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                                            <div style={{
                                                background: 'rgba(255,255,255,0.2)',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                marginRight: '12px'
                                            }}>
                                                <span style={{ fontSize: '1.2rem' }}>⚠️</span>
                                            </div>
                                            <span style={{ fontSize: '0.9rem', fontWeight: '500', opacity: 0.9 }}>Pending</span>
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                                            <span style={{ fontSize: '2rem', fontWeight: '800', display: 'block', lineHeight: '1' }}>
                                                {Array.isArray(usersList) ? usersList.filter(u => u.approval_status === "pending").length : 0}
                                            </span>
                                            {Array.isArray(usersList) && usersList.filter(u => u.approval_status === "pending").length > 0 && (
                                                <span style={{
                                                    fontSize: '0.7rem',
                                                    background: 'white',
                                                    color: '#b91c1c',
                                                    padding: '2px 6px',
                                                    borderRadius: '4px',
                                                    fontWeight: '700'
                                                }}>
                                                    ACTION
                                                </span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', marginTop: '6px', display: 'block', opacity: 0.9 }}>
                                            Needs review
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Decorative Circle */}
                            <div style={{
                                position: 'absolute',
                                right: '-20px',
                                bottom: '-20px',
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                background: 'white',
                                opacity: 0.1
                            }} />
                        </motion.div>

                        {/* Email Statistics Card (Dark Gray Theme) */}
                        <motion.div
                            className="metric-card"
                            whileHover={{ y: -5 }}
                            style={{
                                background: 'linear-gradient(135deg, #475569 0%, #334155 100%)',
                                border: 'none',
                                position: 'relative',
                                overflow: 'visible',
                                color: 'white'
                            }}
                        >
                            {/* Dropdown positioned absolutely at top right */}
                            <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 20 }}>
                                <TimePeriodFilter
                                    timePeriod={emailTimePeriod}
                                    setTimePeriod={setEmailTimePeriod}
                                    customDateRange={emailCustomDateRange}
                                    setCustomDateRange={setEmailCustomDateRange}
                                    variant="dropdown"
                                    showCustom={true}
                                />
                            </div>

                            <div className="metric-content" style={{ zIndex: 10 }}>
                                {/* Label */}
                                <span className="metric-label" style={{ color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                    📧 Email Reports
                                    {emailStatus === 'sending' && (
                                        <span style={{
                                            fontSize: '0.65rem',
                                            background: '#3b82f6',
                                            color: 'white',
                                            padding: '2px 8px',
                                            borderRadius: '10px',
                                            animation: 'pulse 1.5s infinite'
                                        }}>
                                            Sending...
                                        </span>
                                    )}
                                </span>

                                {/* Count */}
                                <span className="metric-value" style={{
                                    color: 'white',
                                    fontWeight: '800',
                                    fontSize: '2.5rem',
                                    lineHeight: '1.1',
                                    display: 'block'
                                }}>
                                    {shareStats.emailCount}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', marginTop: '4px', display: 'block' }}>
                                    emails sent
                                </span>
                            </div>
                            <div style={{
                                position: 'absolute',
                                right: '-20px',
                                bottom: '-20px',
                                width: '120px',
                                height: '120px',
                                borderRadius: '50%',
                                border: '12px solid rgba(255,255,255,0.1)',
                                opacity: 0.3,
                                zIndex: 0
                            }} />
                        </motion.div>

                        {/* Printer Status Card */}
                        <motion.div className="metric-card" whileHover={{ y: -5 }}>
                            <div className="metric-content">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span className="metric-label">Printer Status</span>
                                    <Print style={{
                                        fontSize: '1.2rem',
                                        color: printerStatus.status === 'ready' ? '#10b981' :
                                            printerStatus.status === 'warning' ? '#f59e0b' :
                                                printerStatus.status === 'checking' ? '#64748b' : '#ef4444'
                                    }} />
                                </div>
                                <span className="metric-value status-text" style={{
                                    color: printerStatus.status === 'ready' ? '#10b981' :
                                        printerStatus.status === 'warning' ? '#f59e0b' :
                                            printerStatus.status === 'checking' ? '#64748b' : '#ef4444',
                                    fontWeight: '800',
                                    fontSize: '1.5rem',
                                    marginTop: '8px',
                                    display: 'block'
                                }}>
                                    {printerStatus.status === 'ready' ? 'ONLINE' :
                                        printerStatus.status === 'warning' ? 'ATTENTION' :
                                            printerStatus.status === 'checking' ? 'CHECKING' : 'OFFLINE'}
                                </span>

                                <div className="printer-details-layout">
                                    {/* Left: Info */}
                                    <div className="printer-info-left">
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                                            {printerStatus.printer_name || 'Generic Printer'}
                                        </span>

                                        <span style={{
                                            display: 'inline-block',
                                            padding: '4px 10px',
                                            borderRadius: '6px',
                                            fontSize: '0.75rem',
                                            width: 'fit-content',
                                            backgroundColor: printerStatus.status === 'ready' ? '#f0fdf4' :
                                                printerStatus.status === 'warning' ? '#fffbeb' :
                                                    printerStatus.status === 'checking' ? '#f1f5f9' : '#fef2f2',
                                            color: printerStatus.status === 'ready' ? '#166534' :
                                                printerStatus.status === 'warning' ? '#92400e' :
                                                    printerStatus.status === 'checking' ? '#475569' : '#991b1b',
                                            border: `1px solid ${printerStatus.status === 'ready' ? '#bbf7d0' :
                                                printerStatus.status === 'warning' ? '#fde68a' :
                                                    printerStatus.status === 'checking' ? '#e2e8f0' : '#fecaca'}`
                                        }}>
                                            {printerStatus.message || 'Checking...'}
                                        </span>
                                    </div>

                                    {/* Separator for Mobile Only */}
                                    <div className="printer-horizontal-divider" style={{ height: '1px', background: '#e2e8f0' }}></div>

                                    {/* Right: Thermal Paper (Enhanced Battery Style) */}
                                    <div className="printer-paper-right" style={{ background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                🧻 Paper
                                            </span>
                                            <span style={{
                                                color: shareStats.paperRemaining <= 5 ? '#ef4444' :
                                                    shareStats.paperRemaining <= 15 ? '#f97316' :
                                                        shareStats.paperRemaining <= 40 ? '#f59e0b' : '#10b981',
                                                fontWeight: '800',
                                                fontSize: '0.85rem'
                                            }}>
                                                {shareStats.paperRemaining}%
                                            </span>
                                        </div>

                                        <div style={{
                                            position: 'relative',
                                            height: '24px',
                                            background: '#e2e8f0',
                                            borderRadius: '5px',
                                            border: '1px solid #cbd5e1',
                                            padding: '2px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
                                        }}>
                                            {/* Fill */}
                                            <div style={{
                                                height: '100%',
                                                width: `${Math.max(5, Math.min(100, shareStats.paperRemaining))}%`,
                                                background: shareStats.paperRemaining <= 5 ? 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)' :
                                                    shareStats.paperRemaining <= 15 ? 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)' :
                                                        shareStats.paperRemaining <= 40 ? 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)' :
                                                            'linear-gradient(90deg, #10b981 0%, #34d399 100%)',
                                                borderRadius: '3px',
                                                transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)'
                                            }} />

                                            {/* Status Text Overlay */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '0.7rem', fontWeight: '700',
                                                color: shareStats.paperRemaining <= 40 ? '#fff' : '#1e293b',
                                                textShadow: shareStats.paperRemaining <= 40 ? '0 1px 2px rgba(0,0,0,0.3)' : 'none',
                                                pointerEvents: 'none'
                                            }}>
                                                {shareStats.paperRemaining <= 5 ? 'CRITICAL' :
                                                    shareStats.paperRemaining <= 15 ? 'LOW' :
                                                        shareStats.paperRemaining <= 40 ? 'MODERATE' : 'GOOD'}
                                            </div>

                                            {/* Segments Overlay */}
                                            <div style={{
                                                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                                                display: 'flex',
                                                padding: '2px'
                                            }}>
                                                {[...Array(10)].map((_, i) => (
                                                    <div key={i} style={{
                                                        flex: 1,
                                                        borderRight: i < 9 ? '1px solid rgba(255,255,255,0.2)' : 'none'
                                                    }}></div>
                                                ))}
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', gap: '12px' }}>
                                            <span style={{ fontSize: '0.7rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                                                {shareStats.printCount} printed
                                            </span>
                                            <button
                                                onClick={() => setShowResetModal(true)}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    backgroundColor: '#eff6ff',
                                                    color: '#3b82f6',
                                                    border: '1px solid',
                                                    borderColor: '#bfdbfe',
                                                    borderRadius: '4px',
                                                    cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '4px',
                                                    whiteSpace: 'nowrap'
                                                }}
                                            >
                                                ↺ Reset
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className={`status-indicator-ring`}
                                style={{
                                    borderColor: printerStatus.status === 'ready' ? '#10b981' :
                                        printerStatus.status === 'warning' ? '#f59e0b' :
                                            printerStatus.status === 'checking' ? '#cbd5e1' : '#ef4444',
                                    opacity: 0.1,
                                    position: 'absolute',
                                    right: '-20px',
                                    bottom: '-20px',
                                    width: '100px',
                                    height: '100px',
                                    borderRadius: '50%',
                                    border: '10px solid'
                                }}></div>
                        </motion.div>
                    </div>

                    {/* 2. Main Analytics Grid */}
                    <div className="analytics-grid">

                        {/* Distribution Chart */}
                        <motion.div
                            className="analytics-card distribution-card"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.01, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.1)' }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="card-header">
                                <h3>User Distribution <span style={{ fontSize: '0.9em', color: '#64748b', fontWeight: '500' }}>({stats.total_users} Users)</span></h3>
                            </div>
                            <div className="chart-wrapper pie-wrapper">
                                {loading ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <Pie data={roleDoughnutData} options={pieOptions} />
                                )}
                            </div>
                        </motion.div>

                        {/* Activity Line Chart */}
                        <motion.div
                            className="analytics-card trends-card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            whileHover={{ scale: 1.01, boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.1)' }}
                            transition={{ delay: 0.3 }}
                        >
                            <div className="card-header">
                                <h3>Activity Trends</h3>
                                <span className="period-badge">Last 7 Days</span>
                            </div>
                            <div className="chart-wrapper line-wrapper">
                                <Line data={trafficData} options={{
                                    ...chartOptions,
                                    maintainAspectRatio: false,
                                    plugins: { legend: { display: true, position: 'top' } },
                                    scales: {
                                        y: { grid: { borderDash: [5, 5], color: '#f1f5f9' }, beginAtZero: true },
                                        x: { grid: { display: false } }
                                    }
                                }} />
                            </div>
                        </motion.div>



                    </div>
                </motion.div>
            )}

            {/* --- Health Trends Tab --- */}



            {activeTab === 'users' && (
                <UsersOverview
                    users={usersList} // Pass the full list, component handles filtering
                    loading={loading}
                    onUserClick={handleUserClick}
                    onRoleUpdate={handleRoleUpdate}
                    onStatusUpdate={handleStatusUpdate}
                    stats={stats}
                />
            )}
            {/* Admin's My Health Overview */}
            {activeTab === 'myoverview' && (
                <HealthOverview
                    user={user}
                    history={myHistory}
                    timePeriod={timePeriod}
                    customDateRange={customDateRange}
                />
            )}

            {/* Personal History Section */}
            {(activeTab === 'history' || activeTab === 'personal') && (
                <div style={{ padding: '0 0 20px 0' }}>
                    <MyMeasurements
                        history={myHistory}
                        loading={loading}
                        onSelectMeasurement={setSelectedMeasurement}
                    />
                </div>
            )}

            {/* Maintenance Section */}
            {activeTab === 'maintenance' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
                >
                    <Maintenance />
                </motion.div>
            )}

            {/* Recommendation Modal */}
            <MeasurementDetailsModal
                measurement={selectedMeasurement}
                onClose={() => setSelectedMeasurement(null)}
            />

            {/* Paper Roll Reset Confirmation Modal */}
            {showResetModal && (
                <div className="status-modal-overlay" onClick={() => setShowResetModal(false)}>
                    <motion.div
                        className="status-modal-content warning"
                        initial={{ opacity: 0, scale: 0.8, y: 50 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 50 }}
                        transition={{ type: "spring", damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: 'rgba(255, 255, 255, 0.98)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
                            maxWidth: '400px'
                        }}
                    >
                        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🧻</div>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', marginBottom: '12px' }}>
                            Reset Paper Roll?
                        </h2>
                        <p style={{ fontSize: '1rem', color: '#6b7280', lineHeight: '1.6', marginBottom: '24px' }}>
                            This will reset the receipt counter to 0, indicating a new thermal paper roll has been inserted.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
                            <button
                                onClick={() => setShowResetModal(false)}
                                disabled={isResetting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: '#f1f5f9',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: 'pointer',
                                    fontWeight: '600',
                                    color: '#475569'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleResetPaperRoll}
                                disabled={isResetting}
                                style={{
                                    flex: 1,
                                    padding: '12px',
                                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    cursor: isResetting ? 'not-allowed' : 'pointer',
                                    fontWeight: '600',
                                    color: 'white',
                                    opacity: isResetting ? 0.7 : 1
                                }}
                            >
                                {isResetting ? 'Resetting...' : 'Confirm Reset'}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
            {/* User Detail Modal */}
            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '900px', width: '95%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', display: 'flex', flexDirection: 'column' }}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1rem' }}>
                            <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
                                <div style={{
                                    width: '60px', height: '60px', borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${selectedUser.role === 'Student' ? '#3b82f6' : '#ef4444'}, ${selectedUser.role === 'Student' ? '#2563eb' : '#dc2626'})`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontSize: '1.5rem', fontWeight: 'bold'
                                }}>
                                    {selectedUser.firstname ? selectedUser.firstname[0] : 'U'}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        User History
                                    </div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', lineHeight: 1.2 }}>
                                        {selectedUser.firstname} {selectedUser.lastname}
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUser(null)}
                                style={{
                                    width: '36px', height: '36px', borderRadius: '50%', border: 'none',
                                    background: '#f1f5f9', color: '#64748b', fontSize: '1.5rem',
                                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    transition: 'all 0.2s'
                                }}
                                className="hover-scale"
                            >
                                &times;
                            </button>
                        </div>

                        <MyMeasurements
                            history={userHistory}
                            loading={userHistoryLoading}
                            onSelectMeasurement={setSelectedMeasurement}
                        />
                    </motion.div>
                </div>
            )}
        </DashboardLayout>
    );
};

export default AdminDashboard;
