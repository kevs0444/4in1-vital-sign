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
import { Line, Doughnut, Pie } from 'react-chartjs-2';
import './AdminDashboard.css';
import { getAdminStats, getAdminUsers, updateUserStatus, getMeasurementHistory, printerAPI, getShareStatsFiltered, resetPaperRoll } from '../../../../utils/api';
import Maintenance from '../Maintenance/Maintenance'; // Import Maintenance component
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardAnalytics, { TimePeriodFilter, filterHistoryByTimePeriod, MultiSelectDropdown } from '../../../../components/DashboardAnalytics/DashboardAnalytics';
import NoDataFound from '../../../../components/NoDataFound/NoDataFound';

import { useRealtimeUpdates } from '../../../../hooks/useRealtimeData';
import { exportToCSV, exportToExcel, exportToPDF } from '../../../../utils/exportUtils';
import ExportButton from '../../../../components/ExportButton/ExportButton';
import Pagination from '../../../../components/Pagination/Pagination';

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
    const [emailStatus, setEmailStatus] = useState('idle'); // 'idle' or 'sending'

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
    // Removed unused dropdown states

    // User Management Filters
    // Removed unused dropdown states
    const [statusFilter, setStatusFilter] = useState(['All']);

    // Filter history by time period
    const timeFilteredHistory = useMemo(() => {
        return filterHistoryByTimePeriod(myHistory, timePeriod, customDateRange);
    }, [myHistory, timePeriod, customDateRange]);

    // Pagination State
    const [usersPage, setUsersPage] = useState(1);
    const [historyPage, setHistoryPage] = useState(1);
    const itemsPerPage = 10;

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

    // Pagination Logic for Users
    const totalUserPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = useMemo(() => {
        const start = (usersPage - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, usersPage]);

    // Reset pagination when user filters change
    useEffect(() => {
        setUsersPage(1);
    }, [searchTerm, roleFilter, statusFilter, usersTimePeriod, usersCustomDateRange]);

    // Pagination Logic for History
    const totalHistoryPages = Math.ceil(displayedMyHistory.length / itemsPerPage);
    const currentHistory = useMemo(() => {
        const start = (historyPage - 1) * itemsPerPage;
        return displayedMyHistory.slice(start, start + itemsPerPage);
    }, [displayedMyHistory, historyPage]);

    // Reset pagination when history filters change
    useEffect(() => {
        setHistoryPage(1);
    }, [metricFilter, riskFilter, sortOrder, timePeriod, customDateRange]);

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

    const fetchShareStats = React.useCallback(async () => {
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
    const [isNotifOpen, setIsNotifOpen] = useState(false);
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

    const markAsRead = (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const clearAllNotifications = () => {
        setNotifications([]);
    };

    const getExportData_Users = () => {
        return filteredUsers.map(u => ({
            "Name": `${u.firstname || ''} ${u.lastname || ''}`.trim(),
            "Role": u.role,
            "School ID": u.school_number || 'N/A',
            "Email": u.email,
            "Registered Date": u.created_at || u.registered_at || 'N/A',
            "Status": u.approval_status || 'pending'
        }));
    };

    const handleExportUsers = (format) => {
        const data = getExportData_Users();
        const filename = `Registered_Users_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') exportToCSV(data, filename);
        if (format === 'excel') exportToExcel(data, filename);
        if (format === 'pdf') exportToPDF(data, filename, "Registered Users Report");
    };

    const getExportData_History = () => {
        return displayedMyHistory.map(m => ({
            "Date": m.created_at ? new Date(m.created_at).toLocaleString() : 'N/A',
            "BP": m.systolic ? `${m.systolic}/${m.diastolic}` : 'N/A',
            "HR": m.heart_rate || 'N/A',
            "RR": m.respiratory_rate || 'N/A',
            "SpO2": m.spo2 || 'N/A',
            "Temp": m.temperature || 'N/A',
            "Weight": m.weight || 'N/A',
            "Height": m.height || 'N/A',
            "BMI": m.bmi || 'N/A',
            "Risk": m.risk_category || 'N/A'
        }));
    };

    const handleExportHistory = (format) => {
        const data = getExportData_History();
        const filename = `My_Measurement_History_${new Date().toISOString().split('T')[0]}`;

        if (format === 'csv') exportToCSV(data, filename);
        if (format === 'excel') exportToExcel(data, filename);
        if (format === 'pdf') exportToPDF(data, filename, "Measurement History Report");
    };

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

            {/* --- Top Bar with Notifications --- */}
            <div className="admin-top-bar" style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px', padding: '0 10px', position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        style={{
                            background: 'white', border: '1px solid #e2e8f0', borderRadius: '50%', width: '40px', height: '40px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            boxShadow: '0 1px 2px rgba(0,0,0,0.05)', position: 'relative'
                        }}
                    >
                        <Notifications style={{ color: '#64748b' }} />
                        {notifications.filter(n => !n.read).length > 0 && (
                            <span style={{
                                position: 'absolute', top: '-2px', right: '-2px', background: '#ef4444', color: 'white',
                                fontSize: '0.7rem', fontWeight: 'bold', width: '18px', height: '18px', borderRadius: '50%',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid white'
                            }}>
                                {notifications.filter(n => !n.read).length}
                            </span>
                        )}
                    </button>

                    <AnimatePresence>
                        {isNotifOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                style={{
                                    position: 'absolute', top: '50px', right: '0', width: '320px', background: 'white',
                                    borderRadius: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                                    zIndex: 1000, border: '1px solid #f1f5f9', overflow: 'hidden'
                                }}
                            >
                                <div style={{ padding: '12px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc' }}>
                                    <h4 style={{ margin: 0, fontSize: '0.9rem', color: '#334155' }}>Notifications</h4>
                                    {notifications.length > 0 && (
                                        <button onClick={clearAllNotifications} style={{ border: 'none', background: 'none', color: '#64748b', fontSize: '0.75rem', cursor: 'pointer' }}>
                                            Clear All
                                        </button>
                                    )}
                                </div>
                                <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '30px', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>
                                            No new notifications
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.id}
                                                onClick={() => {
                                                    markAsRead(n.id);
                                                    if (n.action) {
                                                        n.action();
                                                        setIsNotifOpen(false);
                                                    }
                                                }}
                                                style={{
                                                    padding: '12px 16px', borderBottom: '1px solid #f1f5f9', cursor: 'pointer',
                                                    background: n.read ? 'white' : '#f0f9ff', transition: 'background 0.2s'
                                                }}
                                            >
                                                <div style={{ display: 'flex', gap: '10px' }}>
                                                    <div style={{
                                                        minWidth: '32px', height: '32px', borderRadius: '50%', background: `${n.color}20`, color: n.color,
                                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                    }}>
                                                        {n.type === 'pending' ? <Person fontSize="small" /> :
                                                            n.type === 'printer' ? <Print fontSize="small" /> :
                                                                n.type === 'email' ? <Email fontSize="small" /> :
                                                                    <Notifications fontSize="small" />}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: '#334155' }}>{n.title}</span>
                                                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{n.time}</span>
                                                        </div>
                                                        <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', lineHeight: '1.4' }}>{n.message}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
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
                                                disabled={shareStats.printCount === 0}
                                                style={{
                                                    padding: '4px 10px',
                                                    fontSize: '0.7rem',
                                                    fontWeight: '600',
                                                    backgroundColor: shareStats.printCount > 0 ? '#eff6ff' : '#f1f5f9',
                                                    color: shareStats.printCount > 0 ? '#3b82f6' : '#9ca3af',
                                                    border: '1px solid',
                                                    borderColor: shareStats.printCount > 0 ? '#bfdbfe' : '#e2e8f0',
                                                    borderRadius: '4px',
                                                    cursor: shareStats.printCount > 0 ? 'pointer' : 'not-allowed',
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

                                <ExportButton
                                    onExportCSV={() => handleExportUsers('csv')}
                                    onExportExcel={() => handleExportUsers('excel')}
                                    onExportPDF={() => handleExportUsers('pdf')}
                                />

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
                                        ) : currentUsers.length > 0 ? (
                                            currentUsers.map((u, i) => (
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
                                ) : currentUsers.length > 0 ? (
                                    currentUsers.map((u) => (
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
                        <Pagination
                            currentPage={usersPage}
                            totalPages={totalUserPages}
                            onPageChange={setUsersPage}
                        />
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
                                <ExportButton
                                    onExportCSV={() => handleExportHistory('csv')}
                                    onExportExcel={() => handleExportHistory('excel')}
                                    onExportPDF={() => handleExportHistory('pdf')}
                                />

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
                                    ) : currentHistory.length === 0 ? (
                                        <NoDataFound type="history" compact={true} colSpan={11} />
                                    ) : (
                                        currentHistory.map((m) => (
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
                        <Pagination
                            currentPage={historyPage}
                            totalPages={totalHistoryPages}
                            onPageChange={setHistoryPage}
                        />
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
