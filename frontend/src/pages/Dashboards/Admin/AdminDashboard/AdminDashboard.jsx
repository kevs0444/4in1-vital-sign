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
    Analytics,
    People,
    History,
    Build,
    Print
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
import { Line, Radar, Doughnut } from 'react-chartjs-2';
import './AdminDashboard.css';
import { getAdminStats, getAdminUsers, updateUserStatus, getMeasurementHistory, printerAPI } from '../../../../utils/api';
import Maintenance from '../Maintenance/Maintenance'; // Import Maintenance component
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardAnalytics, { TimePeriodFilter, filterHistoryByTimePeriod } from '../../../../components/DashboardAnalytics/DashboardAnalytics';
import PopulationAnalytics from '../../../../components/PopulationAnalytics/PopulationAnalytics';
import { useRealtimeUpdates, formatLastUpdated } from '../../../../hooks/useRealtimeData';

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
        if (!usersList || usersList.length === 0) return [];
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

        // Poll printer status every 30 seconds
        const printerInterval = setInterval(checkPrinterStatus, 30000);
        checkPrinterStatus(); // Initial check

        return () => clearInterval(printerInterval);
    }, [navigate, location]);

    // Real-time WebSocket updates - instant push notifications
    const refetchAllData = React.useCallback(async () => {
        await fetchDashboardData();
        if (user) {
            await fetchMyHistory(user.userId || user.user_id || user.id);
        }
    }, [user]);

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
            setUsersList(usersData);
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
    const roleDoughnutData = {
        labels: Object.keys(stats.roles_distribution || {}),
        datasets: [{
            data: Object.values(stats.roles_distribution || {}),
            backgroundColor: ['#dc2626', '#ef4444', '#f87171', '#94a3b8', '#64748b'],
            borderWidth: 0
        }]
    };

    // Mock trends data if empty
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

    const sensorHealthData = {
        labels: ['BP Accuracy', 'SpO2 Response', 'Temp Stability', 'Connect Speed', 'Data Integrity'],
        datasets: [{
            label: 'System Health',
            data: [95, 88, 92, 96, 99],
            backgroundColor: 'rgba(220, 38, 38, 0.2)',
            borderColor: '#dc2626',
            borderWidth: 2,
        }]
    };

    const doughnutOptions = {
        cutout: '75%',
        plugins: { legend: { display: false } },
        maintainAspectRatio: false
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
    const tabs = [
        { id: 'dashboard', label: 'Overview', icon: <GridView /> },
        { id: 'analytics', label: 'Population Analytics', icon: <Analytics /> },
        { id: 'users', label: 'Users', icon: <People /> },
        { id: 'history', label: 'History', icon: <History /> },
        { id: 'maintenance', label: 'System', icon: <Build /> },
        { id: 'profile', label: 'Settings', icon: <Settings /> }
    ];

    return (
        <DashboardLayout
            title="User Management"
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
                        <motion.div className="metric-card main-metric" whileHover={{ y: -5 }}>
                            <div className="metric-icon-bg"><Person /></div>
                            <div className="metric-content">
                                <span className="metric-label">Total Users</span>
                                <span className="metric-value">{stats.total_users}</span>
                                <span className="metric-trend positive">↑ 12% vs last week</span>
                            </div>
                        </motion.div>

                        <motion.div className="metric-card" whileHover={{ y: -5 }}>
                            <div className="metric-content">
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <span className="metric-label">System Status</span>
                                    <Print style={{ fontSize: '1.2rem', color: printerStatus.status === 'ready' ? '#64748b' : '#dc2626' }} />
                                </div>
                                <span className="metric-value status-text" style={{ color: printerStatus.status === 'ready' ? '#1e293b' : printerStatus.status === 'warning' ? '#dc2626' : '#7f1d1d' }}>
                                    {printerStatus.status === 'ready' ? 'ONLINE' : printerStatus.status === 'warning' ? 'WARNING' : 'OFFLINE'}
                                </span>
                                <div style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                                    <span style={{
                                        display: 'inline-block',
                                        padding: '2px 8px',
                                        borderRadius: '12px',
                                        backgroundColor: printerStatus.status === 'ready' ? '#f1f5f9' : printerStatus.status === 'warning' ? '#fee2e2' : '#fee2e2',
                                        color: printerStatus.status === 'ready' ? '#475569' : printerStatus.status === 'warning' ? '#b91c1c' : '#991b1b',
                                        fontWeight: '600'
                                    }}>
                                        {printerStatus.message || 'Checking...'}
                                    </span>
                                </div>
                            </div>
                            <div className="status-indicator-ring"></div>
                        </motion.div>

                        <motion.div className="metric-card" whileHover={{ y: -5 }}>
                            <div className="metric-content">
                                <span className="metric-label">Pending Approvals</span>
                                <span className="metric-value">{Array.isArray(usersList) ? usersList.filter(u => u.approval_status === "pending").length : 0}</span>
                                <span className="metric-sub" style={{ color: '#dc2626' }}>Needs Attention</span>
                            </div>
                        </motion.div>
                    </div>

                    {/* 2. Main Analytics Grid */}
                    <div className="analytics-grid">

                        {/* Distribution Chart */}
                        <motion.div
                            className="analytics-card distribution-card"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="card-header">
                                <h3>User Distribution</h3>
                            </div>
                            <div className="chart-wrapper doughnut-wrapper">
                                {loading ? (
                                    <div className="loading-spinner"></div>
                                ) : (
                                    <Doughnut data={roleDoughnutData} options={doughnutOptions} />
                                )}
                                <div className="doughnut-center-text">
                                    <span className="center-number">{stats.total_users}</span>
                                    <span className="center-label">Users</span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Activity Line Chart */}
                        <motion.div
                            className="analytics-card trends-card"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
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
                                    plugins: { legend: { display: false } },
                                    scales: {
                                        y: { grid: { borderDash: [5, 5], color: '#f1f5f9' }, beginAtZero: true },
                                        x: { grid: { display: false } }
                                    }
                                }} />
                            </div>
                        </motion.div>

                        {/* Sensor Health Radar */}
                        <motion.div
                            className="analytics-card health-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                        >
                            <div className="card-header">
                                <h3>Sensor Calibration</h3>
                            </div>
                            <div className="chart-wrapper radar-wrapper">
                                <Radar data={sensorHealthData} options={{ ...radarOptions, scales: { r: { ticks: { display: false, backdropColor: 'transparent' } } } }} />
                            </div>
                        </motion.div>

                        {/* Smart Insights Panel */}
                        <motion.div
                            className="analytics-card insights-card"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.5 }}
                        >
                            <div className="card-header">
                                <h3>AI Insights</h3>
                                <span className="beta-badge">BETA</span>
                            </div>
                            <div className="insights-list">
                                <div className="insight-item">
                                    <div className="insight-icon red">⚠️</div>
                                    <div className="insight-text">
                                        <strong>High BP Alert</strong>
                                        <p>15% increase in high blood pressure readings this week.</p>
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-icon gray">📊</div>
                                    <div className="insight-text">
                                        <strong>Peak Usage</strong>
                                        <p>Most measurements taken between 9:00 AM - 11:00 AM.</p>
                                    </div>
                                </div>
                                <div className="insight-item">
                                    <div className="insight-icon gray">👥</div>
                                    <div className="insight-text">
                                        <strong>New Registrations</strong>
                                        <p>Student sign-ups are trending upwards.</p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                    </div>
                </motion.div>
            )}

            {/* --- Health Trends Tab --- */}
            {activeTab === 'analytics' && (
                <div style={{ padding: '20px 0 40px 0' }}>
                    <PopulationAnalytics />
                </div>
            )}

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
                                <div className="role-filter-wrapper" style={{ display: 'flex', gap: '0.8rem' }}>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="role-select"
                                            onClick={() => setIsRoleDropdownOpen(!isRoleDropdownOpen)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                background: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                minWidth: '150px',
                                                justifyContent: 'space-between',
                                                height: '100%'
                                            }}
                                        >
                                            <span>
                                                {roleFilter.includes('All') ? 'All Roles' :
                                                    roleFilter.length > 0 ? `${roleFilter.length} Roles Selected` : 'Select Roles'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem' }}>▼</span>
                                        </button>
                                        {isRoleDropdownOpen && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                zIndex: 100,
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                width: '200px',
                                                padding: '8px',
                                                marginTop: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }}>
                                                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={roleFilter.includes('All')}
                                                        onChange={() => toggleRole('All')}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    All Roles
                                                </label>
                                                {(Object.keys(stats.roles_distribution || {}).length > 0
                                                    ? Object.keys(stats.roles_distribution)
                                                    : ['Admin', 'Doctor', 'Nurse', 'Employee', 'Student']
                                                ).map(role => (
                                                    <label key={role} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={roleFilter.includes(role)}
                                                            onChange={() => toggleRole(role)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        {role}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ position: 'relative' }}>
                                        <button
                                            className="role-select"
                                            onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                                            style={{
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                background: 'white',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '5px',
                                                minWidth: '150px',
                                                justifyContent: 'space-between',
                                                height: '100%'
                                            }}
                                        >
                                            <span>
                                                {statusFilter.includes('All') ? 'All Status' :
                                                    statusFilter.length > 0 ? `${statusFilter.length} Status Selected` : 'Select Status'}
                                            </span>
                                            <span style={{ fontSize: '0.8rem' }}>▼</span>
                                        </button>
                                        {isStatusDropdownOpen && (
                                            <div style={{
                                                position: 'absolute',
                                                top: '100%',
                                                left: 0,
                                                zIndex: 100,
                                                background: 'white',
                                                border: '1px solid #e2e8f0',
                                                borderRadius: '6px',
                                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                                width: '200px',
                                                padding: '8px',
                                                marginTop: '4px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: '4px'
                                            }}>
                                                {[
                                                    { id: 'All', label: 'All Status' },
                                                    { id: 'approved', label: 'Approved' },
                                                    { id: 'pending', label: 'Pending' },
                                                    { id: 'rejected', label: 'Rejected' }
                                                ].map(status => (
                                                    <label key={status.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={statusFilter.includes(status.id)}
                                                            onChange={() => toggleStatus(status.id)}
                                                            style={{ cursor: 'pointer' }}
                                                        />
                                                        {status.label}
                                                    </label>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <button className="icon-btn" title="Export"><Download /></button>

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
                                <div className="view-toggle" style={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: '6px', overflow: 'hidden' }}>
                                    <button
                                        onClick={() => setViewMode('table')}
                                        style={{
                                            padding: '8px',
                                            border: 'none',
                                            background: viewMode === 'table' ? '#eff6ff' : 'white',
                                            color: viewMode === 'table' ? '#2563eb' : '#64748b',
                                            cursor: 'pointer'
                                        }}
                                        title="Table View"
                                    >
                                        <TableRows fontSize="small" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('card')}
                                        style={{
                                            padding: '8px',
                                            border: 'none',
                                            background: viewMode === 'card' ? '#eff6ff' : 'white',
                                            color: viewMode === 'card' ? '#2563eb' : '#64748b',
                                            cursor: 'pointer',
                                            borderLeft: '1px solid #e2e8f0'
                                        }}
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
                                            <tr>
                                                <td colSpan="6" className="text-center p-4">No users found matching "{searchTerm}"</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            // CARD VIEW IMPLEMENTATION
                            <div className="user-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '10px 0' }}>
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
                                    <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '3rem', color: '#64748b' }}>
                                        No users found matching "{searchTerm}"
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                </>
            )}
            {/* Admin's Personal History Section */}
            {activeTab === 'history' && (
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
                            <h3>My Measurement History ({displayedMyHistory.length} records)</h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            minWidth: '150px',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span>
                                            {metricFilter.includes('all') ? 'All Metrics' :
                                                metricFilter.length > 0 ? `${metricFilter.length} Selected` : 'Select Metrics'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem' }}>▼</span>
                                    </button>
                                    {isMetricDropdownOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            zIndex: 100,
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            width: '200px',
                                            padding: '8px',
                                            marginTop: '4px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            {[
                                                { value: 'all', label: 'All Metrics' },
                                                { value: 'bp', label: 'Blood Pressure' },
                                                { value: 'hr', label: 'Heart Rate' },
                                                { value: 'rr', label: 'Respiratory Rate' },
                                                { value: 'spo2', label: 'SpO2' },
                                                { value: 'temp', label: 'Temp' },
                                                { value: 'weight', label: 'Weight' },
                                                { value: 'height', label: 'Height' },
                                                { value: 'bmi', label: 'BMI' }
                                            ].map(opt => (
                                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155', hover: { background: '#f8fafc' } }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={metricFilter.includes(opt.value)}
                                                        onChange={() => toggleMetric(opt.value)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    {opt.label}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ position: 'relative' }}>
                                    <button
                                        onClick={() => setIsRiskDropdownOpen(!isRiskDropdownOpen)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '6px',
                                            border: '1px solid #cbd5e1',
                                            background: 'white',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '5px',
                                            minWidth: '150px',
                                            justifyContent: 'space-between'
                                        }}
                                    >
                                        <span>
                                            {riskFilter.includes('all') ? 'All Risks' :
                                                riskFilter.length > 0 ? `${riskFilter.length} Selected` : 'Select Risks'}
                                        </span>
                                        <span style={{ fontSize: '0.8rem' }}>▼</span>
                                    </button>
                                    {isRiskDropdownOpen && (
                                        <div style={{
                                            position: 'absolute',
                                            top: '100%',
                                            left: 0,
                                            zIndex: 100,
                                            background: 'white',
                                            border: '1px solid #e2e8f0',
                                            borderRadius: '6px',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                                            width: '200px',
                                            padding: '8px',
                                            marginTop: '4px',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '4px'
                                        }}>
                                            {[
                                                { value: 'all', label: 'All Risks' },
                                                { value: 'low', label: 'Low Risk' },
                                                { value: 'moderate', label: 'Moderate Risk' },
                                                { value: 'high', label: 'High Risk' },
                                                { value: 'critical', label: 'Critical Risk' }
                                            ].map(opt => (
                                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                                                    <input
                                                        type="checkbox"
                                                        checked={riskFilter.includes(opt.value)}
                                                        onChange={() => toggleRisk(opt.value)}
                                                        style={{ cursor: 'pointer' }}
                                                    />
                                                    {opt.label}
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
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
                                        <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>No measurements found (Try changing filters).</td></tr>
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
        </DashboardLayout>
    );
};

export default AdminDashboard;
