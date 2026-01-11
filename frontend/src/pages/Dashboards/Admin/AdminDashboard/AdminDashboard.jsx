import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Check, Close, ErrorOutline, WarningAmber,
    Search,
    Download,
    Person,
    Visibility,
    GridView,
    TableRows,
    Settings,

    People,
    History,
    Build,
    Print,
    Dashboard
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
import { Line, Doughnut } from 'react-chartjs-2';
import './AdminDashboard.css';
import { getAdminStats, getAdminUsers, updateUserStatus, getMeasurementHistory, printerAPI, getShareStatsFiltered, resetPaperRoll } from '../../../../utils/api';
import Maintenance from '../Maintenance/Maintenance'; // Import Maintenance component
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardAnalytics, { TimePeriodFilter, filterHistoryByTimePeriod, MultiSelectDropdown } from '../../../../components/DashboardAnalytics/DashboardAnalytics';
import NoDataFound from '../../../../components/NoDataFound/NoDataFound';

import { useRealtimeUpdates } from '../../../../hooks/useRealtimeData';

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
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(['All']);
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'

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

    // Personal History State
    const [myHistory, setMyHistory] = useState([]);
    // Removed unused historyLoading
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);

    // Personal History Time Period
    const [timePeriod, setTimePeriod] = useState('weekly');
    const [customDateRange, setCustomDateRange] = useState(null);

    // User Management Time Period
    const [usersTimePeriod, setUsersTimePeriod] = useState('all');
    const [usersCustomDateRange, setUsersCustomDateRange] = useState(null);

    const [metricFilter, setMetricFilter] = useState(['all']);
    const [riskFilter, setRiskFilter] = useState(['all']);
    const [sortOrder, setSortOrder] = useState('desc');
    const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
    const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);

    // User Management Filters
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [statusFilter, setStatusFilter] = useState(['All']);
    const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);

    // Filter history by time period
    const timeFilteredHistory = useMemo(() => {
        return filterHistoryByTimePeriod(myHistory, timePeriod, customDateRange);
    }, [myHistory, timePeriod, customDateRange]);

    // Filter users list by registration date
    const timeFilteredUsers = useMemo(() => {
        if (!usersList || !Array.isArray(usersList) || usersList.length === 0) return [];
        return filterHistoryByTimePeriod(
            usersList.map(u => ({ ...u, created_at: u.created_at || u.registered_at })),
            usersTimePeriod,
            usersCustomDateRange
        );
    }, [usersList, usersTimePeriod, usersCustomDateRange]);

    // Apply processHistory-like sorting and metric filtering
    const displayedMyHistory = useMemo(() => {
        if (!timeFilteredHistory) return [];
        let processed = [...timeFilteredHistory];

        // Metric Filter
        if (!metricFilter.includes('all')) {
            processed = processed.filter(item => {
                if (metricFilter.includes('bp') && item.systolic > 0) return true;
                if (metricFilter.includes('hr') && item.heart_rate > 0) return true;
                if (metricFilter.includes('rr') && item.respiratory_rate > 0) return true;
                if (metricFilter.includes('spo2') && item.spo2 > 0) return true;
                if (metricFilter.includes('temp') && item.temperature > 0) return true;
                if (metricFilter.includes('weight') && item.weight > 0) return true;
                if (metricFilter.includes('height') && item.height > 0) return true;
                if (metricFilter.includes('bmi') && item.bmi > 0) return true;
                return false;
            });
        }

        // Risk Filter
        if (!riskFilter.includes('all')) {
            processed = processed.filter(item => {
                if (!item.risk_category) return false;
                const riskCat = item.risk_category.toLowerCase();
                return riskFilter.some(filter => riskCat.includes(filter));
            });
        }

        // Sort
        processed.sort((a, b) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
        });

        return processed;
    }, [timeFilteredHistory, metricFilter, riskFilter, sortOrder]);

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
            setFilteredUsers(Array.isArray(usersArray) ? usersArray : []);
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

    const fetchShareStats = async () => {
        try {
            // Calculate Date Range
            let dateParams = {};
            const end = new Date();
            const start = new Date();
            start.setHours(0, 0, 0, 0);

            if (emailTimePeriod === 'custom' && emailCustomDateRange?.start && emailCustomDateRange?.end) {
                dateParams = { start_date: emailCustomDateRange.start, end_date: emailCustomDateRange.end };
            } else {
                switch (emailTimePeriod) {
                    case 'daily':
                        dateParams = { start_date: start.toISOString(), end_date: end.toISOString() };
                        break;
                    case 'weekly':
                        start.setDate(start.getDate() - 7);
                        dateParams = { start_date: start.toISOString(), end_date: end.toISOString() };
                        break;
                    case 'monthly':
                        start.setMonth(start.getMonth() - 1);
                        dateParams = { start_date: start.toISOString(), end_date: end.toISOString() };
                        break;
                    case 'annually':
                        start.setFullYear(start.getFullYear() - 1);
                        dateParams = { start_date: start.toISOString(), end_date: end.toISOString() };
                        break;
                    default:
                        dateParams = {}; // All time
                }
            }

            const response = await getShareStatsFiltered(dateParams);
            if (response && response.success && response.stats) {
                setShareStats({
                    emailCount: response.stats.email_sent_count || 0,
                    printCount: response.stats.receipt_printed_count || 0,
                    paperRemaining: response.stats.paper_remaining ?? 100
                });
            }
        } catch (error) {
            console.error("Error fetching share stats:", error);
        }
    };

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

    const filterUsers = React.useCallback(() => {
        let result = Array.isArray(timeFilteredUsers) ? timeFilteredUsers : [];

        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.firstname && u.firstname.toLowerCase().includes(lowerTerm)) ||
                (u.lastname && u.lastname.toLowerCase().includes(lowerTerm)) ||
                (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
                (u.school_number && u.school_number.toLowerCase().includes(lowerTerm))
            );
        }

        if (roleFilter.length > 0 && !roleFilter.includes('All')) {
            result = result.filter(u => roleFilter.includes(u.role));
        }

        if (!statusFilter.includes('All')) {
            result = result.filter(u => statusFilter.includes(u.approval_status || 'pending'));
        }

        setFilteredUsers(result);
    }, [timeFilteredUsers, searchTerm, roleFilter, statusFilter]);

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

        // Fetch share stats initially and poll every 10 seconds
        fetchShareStats();
        const shareStatsInterval = setInterval(fetchShareStats, 10000);

        return () => {
            clearInterval(printerInterval);
            clearInterval(shareStatsInterval);
        };
    }, [navigate, location, emailTimePeriod, emailCustomDateRange]);

    // Real-time WebSocket updates - instant push notifications
    const refetchAllData = React.useCallback(async () => {
        // Parallel fetch for maximum speed
        await Promise.all([
            fetchDashboardData(),
            checkPrinterStatus(),
            fetchShareStats(),
            user ? fetchMyHistory(user.userId || user.user_id || user.id) : Promise.resolve()
        ]);
    }, [user, emailTimePeriod, emailCustomDateRange]); // Added dependencies for share stats

    const { isConnected, lastUpdated, connectionStatus } = useRealtimeUpdates({
        role: 'Admin',
        userId: user?.userId || user?.user_id || user?.id,
        refetchData: refetchAllData,
        onNewMeasurement: (data) => {
            console.log('📊 New measurement received:', data);
            // Data will be refetched automatically
        },
        onNewUser: (data) => {
            console.log('👤 New user registered:', data);
            // Data will be refetched automatically
        }
    });

    useEffect(() => {
        filterUsers();
    }, [searchTerm, roleFilter, timeFilteredUsers, statusFilter, filterUsers]);

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
            // Extract the users array from the API response
            const usersArray = (usersData && usersData.users) ? usersData.users : [];
            setUsersList(Array.isArray(usersArray) ? usersArray : []);
        } catch (error) {
            console.error("Failed to update status", error);
            // Revert on error would be ideal, but simply refetching works
            fetchDashboardData();
        }
    };

    const toggleStatus = (status) => {
        if (status === 'All') {
            setStatusFilter(['All']);
            return;
        }

        let newFilters = statusFilter.filter(f => f !== 'All');
        if (newFilters.includes(status)) {
            newFilters = newFilters.filter(f => f !== status);
        } else {
            newFilters.push(status);
        }

        if (newFilters.length === 0) newFilters = ['All'];
        setStatusFilter(newFilters);
    };

    const toggleRole = (role) => {
        if (role === 'All') {
            setRoleFilter(['All']);
            return;
        }

        let newFilters = roleFilter.filter(f => f !== 'All');
        if (newFilters.includes(role)) {
            newFilters = newFilters.filter(f => f !== role);
        } else {
            newFilters.push(role);
        }

        if (newFilters.length === 0) newFilters = ['All'];
        setRoleFilter(newFilters);
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
            hoverOffset: 10,
            cutout: '75%'
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

    const radarOptions = {
        responsive: true,
        plugins: { legend: { display: false } },
        scales: { r: { suggestedMin: 0, suggestedMax: 100 } }
    };

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

    const toggleMetric = (value) => {
        if (value === 'all') {
            setMetricFilter(['all']);
            return;
        }
        let newFilter = [...metricFilter];
        if (newFilter.includes('all')) newFilter = [];
        if (newFilter.includes(value)) newFilter = newFilter.filter(item => item !== value);
        else newFilter.push(value);
        if (newFilter.length === 0) newFilter = ['all'];
        setMetricFilter(newFilter);
    };

    const toggleRisk = (value) => {
        if (value === 'all') {
            setRiskFilter(['all']);
            return;
        }
        let newFilter = [...riskFilter];
        if (newFilter.includes('all')) newFilter = [];
        if (newFilter.includes(value)) newFilter = newFilter.filter(item => item !== value);
        else newFilter.push(value);
        if (newFilter.length === 0) newFilter = ['all'];
        setRiskFilter(newFilter);
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

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '12px' }}>
                                    <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: '500' }}>
                                        {printerStatus.printer_name || 'Generic Printer'}
                                    </span>

                                    <span style={{
                                        display: 'inline-block',
                                        padding: '4px 10px',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        width: 'fit-content',
                                        marginBottom: '12px',
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

                                    {/* Separator line */}
                                    <div style={{ height: '1px', background: '#e2e8f0', margin: '4px 0 12px 0' }}></div>

                                    {/* Thermal Paper Section (Merged) */}
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#475569' }}>🧻 Thermal Paper</span>
                                            <span style={{
                                                color: shareStats.paperRemaining <= 10 ? '#ef4444' : shareStats.paperRemaining <= 30 ? '#f59e0b' : '#10b981',
                                                fontWeight: '800',
                                                fontSize: '0.9rem'
                                            }}>
                                                {shareStats.paperRemaining}%
                                            </span>
                                        </div>

                                        {/* Progress bar */}
                                        <div style={{
                                            width: '100%',
                                            height: '6px',
                                            backgroundColor: '#e5e7eb',
                                            borderRadius: '3px',
                                            overflow: 'hidden'
                                        }}>
                                            <div style={{
                                                width: `${Math.min(100, shareStats.paperRemaining)}%`, /* Use remaining % directly */
                                                height: '100%',
                                                backgroundColor: shareStats.paperRemaining <= 10 ? '#ef4444' : shareStats.paperRemaining <= 30 ? '#f59e0b' : '#10b981',
                                                transition: 'width 0.3s ease'
                                            }} />
                                        </div>

                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                                {shareStats.printCount} printed
                                            </span>
                                            <button
                                                onClick={() => setShowResetModal(true)}
                                                disabled={shareStats.printCount === 0}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '0.75rem',
                                                    fontWeight: '600',
                                                    backgroundColor: shareStats.printCount > 0 ? '#eff6ff' : '#f1f5f9',
                                                    color: shareStats.printCount > 0 ? '#3b82f6' : '#9ca3af',
                                                    border: 'none',
                                                    borderRadius: '6px',
                                                    cursor: shareStats.printCount > 0 ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s ease'
                                                }}
                                            >
                                                Counter Reset
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

                        {/* Email Statistics Card (Gray Theme) */}
                        {/* Email Statistics Card (Gray Theme) */}
                        <motion.div
                            className="metric-card"
                            whileHover={{ y: -5 }}
                            style={{ background: '#e2e8f0', border: 'none', position: 'relative', overflow: 'visible' }}
                        >
                            <div className="metric-content" style={{ zIndex: 10 }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', width: '100%', marginBottom: '10px' }}>
                                    <span className="metric-label" style={{ color: '#475569', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        📧 Email Reports
                                    </span>
                                    <div style={{ position: 'relative', zIndex: 20 }}>
                                        <TimePeriodFilter
                                            timePeriod={emailTimePeriod}
                                            setTimePeriod={setEmailTimePeriod}
                                            customDateRange={emailCustomDateRange}
                                            setCustomDateRange={setEmailCustomDateRange}
                                            variant="dropdown"
                                            showCustom={true}
                                        />
                                    </div>
                                </div>
                                <span className="metric-value" style={{
                                    color: '#1e293b',
                                    fontWeight: '800',
                                    fontSize: '2.5rem',
                                    lineHeight: '1.1',
                                    marginTop: '8px',
                                    display: 'block'
                                }}>
                                    {shareStats.emailCount}
                                </span>
                                <span style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
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
                                border: '12px solid #cbd5e1',
                                opacity: 0.2,
                                zIndex: 0
                            }} />
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
                                <h3>User Distribution</h3>
                            </div>
                            <div className="chart-wrapper pie-wrapper" style={{ position: 'relative', flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {loading ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <>
                                        <Doughnut data={roleDoughnutData} options={pieOptions} />
                                        <div style={{
                                            position: 'absolute',
                                            top: '50%',
                                            left: pieOptions.plugins.legend.position === 'right' ? '35%' : '50%', // Offset if legend is right
                                            transform: 'translate(-50%, -50%)',
                                            textAlign: 'center',
                                            pointerEvents: 'none'
                                        }}>
                                            <span style={{ fontSize: '2rem', fontWeight: '800', color: '#1e293b', display: 'block', lineHeight: 1 }}>
                                                {stats.total_users}
                                            </span>
                                            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                                Users
                                            </span>
                                        </div>
                                    </>
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
                <>
                    {/* Users Table Section */}
                    <motion.div
                        className="table-section"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5, delay: 0.2 }}
                    >


                        <div className="table-header">
                            <h3>Registered Users Database ({filteredUsers.length} records)</h3>
                            <div className="table-actions">
                                <div className="search-bar">
                                    <Search className="search-icon" />
                                    <input
                                        type="text"
                                        placeholder="Search users..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                                <div className="role-filter-wrapper">
                                    <MultiSelectDropdown
                                        label="Select Roles"
                                        selectedItems={roleFilter}
                                        options={[
                                            { id: 'All', label: 'All Roles' },
                                            ...(Object.keys(stats.roles_distribution || {}).length > 0
                                                ? Object.keys(stats.roles_distribution)
                                                : ['Admin', 'Doctor', 'Nurse', 'Employee', 'Student']
                                            ).map(role => ({ id: role, label: role }))
                                        ]}
                                        onToggle={toggleRole}
                                        allLabel="All Roles"
                                    />
                                    <MultiSelectDropdown
                                        label="Select Status"
                                        selectedItems={statusFilter}
                                        options={[
                                            { id: 'All', label: 'All Status' },
                                            { id: 'approved', label: 'Approved' },
                                            { id: 'pending', label: 'Pending' },
                                            { id: 'rejected', label: 'Rejected' }
                                        ]}
                                        onToggle={toggleStatus}
                                        allLabel="All Status"
                                    />
                                </div>

                                <button
                                    className="icon-btn"
                                    title="Export"
                                    style={{
                                        padding: '8px',
                                        height: '100%',
                                        borderRadius: '6px',
                                        border: '1px solid #cbd5e1',
                                        background: 'white',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#64748b',
                                        minWidth: '40px'
                                    }}
                                >
                                    <Download />
                                </button>

                                {/* Time Period Filter */}
                                <div style={{ height: '100%' }}>
                                    <TimePeriodFilter
                                        timePeriod={usersTimePeriod}
                                        setTimePeriod={setUsersTimePeriod}
                                        customDateRange={usersCustomDateRange}
                                        setCustomDateRange={setUsersCustomDateRange}
                                        variant="dropdown"
                                    />
                                </div>

                                {/* View Toggle Buttons */}
                                <div className="view-toggle">
                                    <button
                                        onClick={() => setViewMode('table')}
                                        className={viewMode === 'table' ? 'active' : ''}
                                        title="Table View"
                                    >
                                        <TableRows fontSize="small" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('card')}
                                        className={viewMode === 'card' ? 'active' : ''}
                                        title="Card View"
                                    >
                                        <GridView fontSize="small" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {viewMode === 'table' ? (
                            <div className="table-container-wrapper">
                                <table className="users-table">
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Role</th>
                                            <th>School ID</th>
                                            <th>Email</th>
                                            <th>Registered Date</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            // Skeleton Loading Rows
                                            Array(5).fill(0).map((_, idx) => (
                                                <tr key={`skeleton-${idx}`} className="skeleton-row">
                                                    <td><div className="skeleton-box" style={{ width: '150px' }}></div></td>
                                                    <td><div className="skeleton-box" style={{ width: '80px' }}></div></td>
                                                    <td><div className="skeleton-box" style={{ width: '100px' }}></div></td>
                                                    <td><div className="skeleton-box" style={{ width: '180px' }}></div></td>
                                                    <td><div className="skeleton-box" style={{ width: '120px' }}></div></td>
                                                    <td><div className="skeleton-box" style={{ width: '90px' }}></div></td>
                                                </tr>
                                            ))
                                        ) : filteredUsers.length > 0 ? (
                                            filteredUsers.map((u, i) => (
                                                <tr key={u.user_id}>
                                                    <td>
                                                        <div className="user-name-cell">
                                                            <div className="user-avatar">{u.firstname[0]}{u.lastname[0]}</div>
                                                            <div>
                                                                <div className="fw-bold">{u.firstname} {u.lastname}</div>
                                                                <div className="text-secondary small">ID: {u.user_id ? u.user_id.substring(0, 8) + '...' : 'N/A'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <span className={`role-badge role-${u.role.toLowerCase()}`}>
                                                            {u.role}
                                                        </span>
                                                    </td>
                                                    <td>{u.school_number || 'N/A'}</td>
                                                    <td>{u.email}</td>
                                                    <td>{u.created_at || 'N/A'}</td>
                                                    <td>
                                                        <select
                                                            className={`role-select status-${u.approval_status?.toLowerCase() || 'pending'}`}
                                                            value={u.approval_status || 'pending'}
                                                            onChange={(e) => handleStatusUpdate(u.user_id, e.target.value)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            style={{
                                                                minWidth: '110px',
                                                                padding: '6px 10px',
                                                                borderRadius: '6px',
                                                                fontWeight: '600',
                                                                fontSize: '0.85rem',
                                                                border: '1px solid #e2e8f0',
                                                                background: u.approval_status === 'approved' ? '#dcfce7' :
                                                                    u.approval_status === 'rejected' ? '#fee2e2' : '#fff7ed',
                                                                color: u.approval_status === 'approved' ? '#166534' :
                                                                    u.approval_status === 'rejected' ? '#991b1b' : '#c2410c'
                                                            }}
                                                        >
                                                            <option value="pending">Pending</option>
                                                            <option value="approved">Approved</option>
                                                            <option value="rejected">Rejected</option>
                                                        </select>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <NoDataFound type="users" searchTerm={searchTerm} compact={true} colSpan={6} />
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // CARD VIEW IMPLEMENTATION
                            <div className="user-cards-grid">
                                {loading ? (
                                    Array(6).fill(0).map((_, idx) => (
                                        <div key={`card-skeleton-${idx}`} className="user-card-skeleton" style={{ padding: '20px', background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', height: '200px' }}>
                                            <div className="skeleton-box" style={{ width: '40px', height: '40px', borderRadius: '50%', marginBottom: '15px' }}></div>
                                            <div className="skeleton-box" style={{ width: '150px', marginBottom: '10px' }}></div>
                                            <div className="skeleton-box" style={{ width: '100px', marginBottom: '20px' }}></div>
                                            <div className="skeleton-box" style={{ width: '100%', height: '40px' }}></div>
                                        </div>
                                    ))
                                ) : filteredUsers.length > 0 ? (
                                    filteredUsers.map((u) => (
                                        <motion.div
                                            key={u.user_id}
                                            className="user-card-item"
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            whileHover={{ y: -5, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                            style={{
                                                background: 'white',
                                                borderRadius: '16px',
                                                padding: '1.5rem',
                                                border: '1px solid #f1f5f9',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                textAlign: 'center',
                                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                                                transition: 'all 0.2s ease'
                                            }}
                                        >
                                            <div className="user-avatar" style={{
                                                width: '64px', height: '64px', fontSize: '1.5rem', marginBottom: '1rem',
                                                background: `linear-gradient(135deg, ${u.role === 'Student' ? '#3b82f6' : '#ef4444'}, ${u.role === 'Student' ? '#2563eb' : '#dc2626'})`,
                                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%'
                                            }}>
                                                {u.firstname[0]}{u.lastname[0]}
                                            </div>

                                            <h4 style={{ margin: '0 0 5px 0', fontSize: '1.1rem', color: '#1e293b' }}>{u.firstname} {u.lastname}</h4>
                                            <span className={`role-badge role-${u.role.toLowerCase()}`} style={{ marginBottom: '15px' }}>{u.role}</span>

                                            <div className="card-details" style={{ width: '100%', fontSize: '0.9rem', color: '#64748b', marginBottom: '15px', textAlign: 'left' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                                                    <span>ID:</span> <strong>{u.school_number || 'N/A'}</strong>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>Joined:</span> <span>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                                                </div>
                                            </div>

                                            <div style={{ marginTop: 'auto', width: '100%' }}>
                                                <select
                                                    className={`role-select status-${u.approval_status?.toLowerCase() || 'pending'}`}
                                                    value={u.approval_status || 'pending'}
                                                    onChange={(e) => handleStatusUpdate(u.user_id, e.target.value)}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        width: '100%',
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        fontWeight: '600',
                                                        fontSize: '0.9rem',
                                                        border: '1px solid #e2e8f0',
                                                        background: u.approval_status === 'approved' ? '#dcfce7' :
                                                            u.approval_status === 'rejected' ? '#fee2e2' : '#fff7ed',
                                                        color: u.approval_status === 'approved' ? '#166534' :
                                                            u.approval_status === 'rejected' ? '#991b1b' : '#c2410c',
                                                        textAlign: 'center'
                                                    }}
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="rejected">Rejected</option>
                                                </select>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div style={{ gridColumn: '1 / -1' }}>
                                        <NoDataFound type="users" searchTerm={searchTerm} />
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
            {/* Admin's My Health Overview */}
            {activeTab === 'myoverview' && (
                <>
                    <motion.div
                        className="summary-cards"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ marginBottom: '2rem' }}
                    >
                        <div className="summary-card highlight">
                            <h3>Total Checkups</h3>
                            <div className="summary-value">{myHistory.length}</div>
                            <div className="summary-label">Measurements Taken</div>
                        </div>
                        <div className="summary-card">
                            <h3>Latest Status</h3>
                            <div className="summary-value" style={{ fontSize: '1.5rem', color: myHistory.length > 0 ? getRiskColor(myHistory[0].risk_category) : '#64748b' }}>
                                {myHistory.length > 0 ? (myHistory[0].risk_category || 'N/A') : 'No Data'}
                            </div>
                            <div className="summary-label">
                                {myHistory.length > 0 ? formatDate(myHistory[0].created_at) : '-'}
                            </div>
                        </div>
                    </motion.div>

                    <DashboardAnalytics
                        user={user}
                        history={myHistory}
                        timePeriod={timePeriod}
                        customDateRange={customDateRange}
                    />
                </>
            )}

            {/* Admin's My Measurements */}
            {activeTab === 'personal' && (
                <>
                    {/* Time Period Filter for Table */}
                    <div style={{ marginTop: '30px', marginBottom: '20px' }}>
                        <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>Filter Records</h3>
                        <TimePeriodFilter
                            timePeriod={timePeriod}
                            setTimePeriod={setTimePeriod}
                            customDateRange={customDateRange}
                            setCustomDateRange={setCustomDateRange}
                        />
                    </div>

                    <motion.div
                        className="table-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1 }}
                        style={{ marginBottom: '2rem' }}
                    >
                        <div className="table-header">
                            <h3>My Measurements ({displayedMyHistory.length} records)</h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <MultiSelectDropdown
                                    label="Select Metrics"
                                    selectedItems={metricFilter}
                                    options={[
                                        { id: 'all', label: 'All Metrics' },
                                        { id: 'bp', label: 'Blood Pressure' },
                                        { id: 'hr', label: 'Heart Rate' },
                                        { id: 'rr', label: 'Respiratory Rate' },
                                        { id: 'spo2', label: 'SpO2' },
                                        { id: 'temp', label: 'Temp' },
                                        { id: 'weight', label: 'Weight' },
                                        { id: 'height', label: 'Height' },
                                        { id: 'bmi', label: 'BMI' }
                                    ]}
                                    onToggle={toggleMetric}
                                    allLabel="All Metrics"
                                />
                                <MultiSelectDropdown
                                    label="Select Risks"
                                    selectedItems={riskFilter}
                                    options={[
                                        { id: 'all', label: 'All Risks' },
                                        { id: 'low', label: 'Low Risk' },
                                        { id: 'moderate', label: 'Moderate Risk' },
                                        { id: 'high', label: 'High Risk' },
                                        { id: 'critical', label: 'Critical Risk' }
                                    ]}
                                    onToggle={toggleRisk}
                                    allLabel="All Risks"
                                />
                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                >
                                    <option value="desc">Newest First</option>
                                    <option value="asc">Oldest First</option>
                                </select>
                            </div>
                        </div>
                        <div className="table-container-wrapper">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        {(metricFilter.includes('all') || metricFilter.includes('bp')) && <th>BP (mmHg)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('hr')) && <th>HR (bpm)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('rr')) && <th>RR (bpm)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('spo2')) && <th>SpO2 (%)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('temp')) && <th>Temp (°C)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('weight') || metricFilter.includes('bmi')) && <th>Weight (kg)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('height') || metricFilter.includes('bmi')) && <th>Height (cm)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('bmi')) && <th>BMI</th>}
                                        <th>Risk Status</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array(5).fill(0).map((_, idx) => (
                                            <tr key={`history-skeleton-${idx}`} className="skeleton-row">
                                                {Array(11).fill(0).map((_, cellIdx) => (
                                                    <td key={cellIdx}><div className="skeleton-box" style={{ width: cellIdx === 0 ? '120px' : '60px' }}></div></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : displayedMyHistory.length === 0 ? (
                                        <NoDataFound type="history" compact={true} colSpan={11} />
                                    ) : (
                                        displayedMyHistory.map((m) => (
                                            <tr key={m.id}>
                                                <td>{formatDate(m.created_at)}</td>
                                                {(metricFilter.includes('all') || metricFilter.includes('bp')) && <td>{m.systolic ? `${m.systolic}/${m.diastolic}` : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('hr')) && <td>{m.heart_rate ? m.heart_rate : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('rr')) && <td>{m.respiratory_rate ? m.respiratory_rate : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('spo2')) && <td>{m.spo2 ? `${m.spo2}%` : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('temp')) && <td>{m.temperature ? `${m.temperature}°C` : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('weight') || metricFilter.includes('bmi')) && <td>{m.weight ? m.weight : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('height') || metricFilter.includes('bmi')) && <td>{m.height ? m.height : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('bmi')) && <td>{m.bmi && Number(m.bmi) > 0 ? Number(m.bmi).toFixed(1) : 'Not Measured'}</td>}
                                                <td>
                                                    <span className="risk-badge" style={{
                                                        color: getRiskColor(m.risk_category),
                                                        fontWeight: 'bold',
                                                        textTransform: 'capitalize'
                                                    }}>
                                                        {m.risk_category || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        className="action-btn"
                                                        onClick={() => setSelectedMeasurement(m)}
                                                        style={{ display: 'flex', alignItems: 'center', gap: '4px', border: 'none', background: 'transparent', color: '#2563eb', cursor: 'pointer', fontWeight: 600 }}
                                                    >
                                                        <Visibility style={{ fontSize: '1rem' }} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                </>
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
            {selectedMeasurement && (
                <div className="modal-overlay" onClick={() => setSelectedMeasurement(null)} style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ background: 'white', padding: '2rem', borderRadius: '12px', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                    >
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Health Result Details</h2>
                            <button className="close-btn" onClick={() => setSelectedMeasurement(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#64748b' }}>&times;</button>
                        </div>

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div><strong>Date:</strong> {formatDate(selectedMeasurement.created_at)}</div>
                                <div><strong>BP:</strong> {selectedMeasurement.systolic ? `${selectedMeasurement.systolic}/${selectedMeasurement.diastolic}` : 'Not Measured'}</div>
                                <div><strong>Heart Rate:</strong> {selectedMeasurement.heart_rate ? `${selectedMeasurement.heart_rate} bpm` : 'Not Measured'}</div>
                                <div><strong>Resp. Rate:</strong> {selectedMeasurement.respiratory_rate ? `${selectedMeasurement.respiratory_rate} bpm` : 'Not Measured'}</div>
                                <div><strong>SpO2:</strong> {selectedMeasurement.spo2 ? `${selectedMeasurement.spo2}%` : 'Not Measured'}</div>
                                <div><strong>Temp:</strong> {selectedMeasurement.temperature ? `${selectedMeasurement.temperature}°C` : 'Not Measured'}</div>
                                <div><strong>Weight:</strong> {selectedMeasurement.weight ? `${selectedMeasurement.weight} kg` : 'Not Measured'}</div>
                                <div><strong>Height:</strong> {selectedMeasurement.height ? `${selectedMeasurement.height} cm` : 'Not Measured'}</div>
                                <div><strong>BMI:</strong> {selectedMeasurement.bmi && Number(selectedMeasurement.bmi) > 0 ? Number(selectedMeasurement.bmi).toFixed(1) : 'Not Measured'}</div>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                AI Analysis & Recommendations
                            </h3>

                            <div className="rec-section" style={{ marginTop: '16px' }}>
                                <h4>Risk Status</h4>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <p style={{ fontWeight: 'bold', margin: 0, color: getRiskColor(selectedMeasurement.risk_category) }}>
                                        {selectedMeasurement.risk_category}
                                    </p>
                                    {selectedMeasurement.risk_score && (
                                        <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '2px 8px', borderRadius: '4px' }}>
                                            Score: {selectedMeasurement.risk_score.toFixed(1)}%
                                        </span>
                                    )}
                                </div>
                            </div>

                            {selectedMeasurement.recommendation?.medical_action && (
                                <div className="rec-section" style={{ marginTop: '12px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>Suggested Medical Action</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedMeasurement.recommendation.medical_action}</p>
                                </div>
                            )}

                            {selectedMeasurement.recommendation?.preventive_strategy && (
                                <div className="rec-section" style={{ marginTop: '12px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>Preventive Strategy</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedMeasurement.recommendation.preventive_strategy}</p>
                                </div>
                            )}

                            {selectedMeasurement.recommendation?.wellness_tips && (
                                <div className="rec-section" style={{ marginTop: '12px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>Wellness Tips</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedMeasurement.recommendation.wellness_tips}</p>
                                </div>
                            )}

                            {selectedMeasurement.recommendation?.provider_guidance && (
                                <div className="rec-section" style={{ marginTop: '12px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>Provider Guidance</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>{selectedMeasurement.recommendation.provider_guidance}</p>
                                </div>
                            )}

                            {!selectedMeasurement.recommendation?.medical_action && (
                                <div className="rec-section" style={{ marginTop: '12px' }}>
                                    <h4 style={{ fontSize: '0.9rem', color: '#475569', marginBottom: '4px' }}>General Guidance</h4>
                                    <p style={{ margin: 0, fontSize: '0.95rem' }}>
                                        {selectedMeasurement.risk_category === 'Normal'
                                            ? "Great job! Your vital signs are within the normal range. Keep avoiding stress and maintain a healthy lifestyle."
                                            : "Your vital signs show some deviations. Please consult with the school nurse or a doctor for a more detailed checkup."}
                                    </p>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => setSelectedMeasurement(null)}
                            style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', color: '#475569' }}
                        >
                            Close
                        </button>
                    </motion.div>
                </div>
            )}

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
        </DashboardLayout>
    );
};

export default AdminDashboard;
