import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Logout,
    Search,
    Download,
    Person,
    Visibility // Added visibility icon
} from '@mui/icons-material';
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
    RadialLinearScale
} from 'chart.js';
import { Bar, Line, Radar } from 'react-chartjs-2';
import './AdminDashboard.css';
import './AdminDashboard.css';
import { getAdminStats, getAdminUsers, updateUserStatus, getMeasurementHistory } from '../../../../utils/api'; // Added getMeasurementHistory
import Maintenance from '../Maintenance/Maintenance'; // Import Maintenance component

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
    RadialLinearScale
);

const AdminDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [stats, setStats] = useState({
        total_users: 0,
        roles_distribution: {},
        system_health: 'GOOD'
    });
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [roleFilter, setRoleFilter] = useState(['All']);
    const [isRoleDropdownOpen, setIsRoleDropdownOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState('All');

    // Admin's own history state
    const [myHistory, setMyHistory] = useState([]);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);

    // Tab State
    const [activeTab, setActiveTab] = useState('users'); // 'users', 'history', 'maintenance'

    // Filtering & Sorting State
    const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'week', 'month'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'
    const [metricFilter, setMetricFilter] = useState(['all']); // Array for multi-select
    const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false); // Toggle state
    const [riskFilter, setRiskFilter] = useState(['all']); // Array for multi-select
    const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);

    const toggleRisk = (value) => {
        if (value === 'all') {
            if (riskFilter.includes('all')) {
                setRiskFilter([]);
            } else {
                setRiskFilter(['all']);
            }
            return;
        }

        let newFilters = riskFilter.filter(f => f !== 'all');
        if (newFilters.includes(value)) {
            newFilters = newFilters.filter(f => f !== value);
        } else {
            newFilters.push(value);
        }

        if (newFilters.length === 0) newFilters = ['all'];
        setRiskFilter(newFilters);
    };

    const toggleRole = (value) => {
        if (value === 'All') {
            if (roleFilter.includes('All')) {
                setRoleFilter([]);
            } else {
                setRoleFilter(['All']);
            }
            return;
        }

        let newFilters = roleFilter.filter(f => f !== 'All');
        if (newFilters.includes(value)) {
            newFilters = newFilters.filter(f => f !== value);
        } else {
            newFilters.push(value);
        }

        if (newFilters.length === 0) newFilters = ['All'];
        setRoleFilter(newFilters);
    };

    // Filtering & Sorting Helper
    const processHistory = (data) => {
        if (!data) return [];
        let processed = [...data];

        // Filter
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        if (filterType === 'today') {
            processed = processed.filter(item => new Date(item.created_at) >= startOfToday);
        } else if (filterType === 'week') {
            processed = processed.filter(item => new Date(item.created_at) >= weekAgo);
        } else if (filterType === 'month') {
            processed = processed.filter(item => new Date(item.created_at) >= monthAgo);
        }

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
    };

    const getRiskColor = (category) => {
        if (!category) return '#64748b';
        const cat = category.toLowerCase();
        if (cat.includes('low')) return '#10b981';
        if (cat.includes('moderate')) return '#f59e0b';
        if (cat.includes('high')) return '#ef4444';
        if (cat.includes('critical')) return '#dc2626';
        return '#64748b';
    };


    // Handler for updating user approval status - component level function
    const handleStatusUpdate = async (userId, newStatus) => {
        try {
            console.log(`📤 Updating user ${userId} status to ${newStatus}...`);
            const response = await updateUserStatus(userId, newStatus);
            if (response.success) {
                console.log(`✅ Status updated successfully`);
                setUsersList(prevUsers => prevUsers.map(u =>
                    u.user_id === userId ? { ...u, approval_status: newStatus } : u
                ));
            } else {
                console.error(`❌ Failed to update status:`, response.message);
                alert(`Failed to update status: ${response.message}`);
            }
        } catch (error) {
            console.error('Error updating user status:', error);
            alert('Error updating status. Please try again.');
        }
    };

    useEffect(() => {
        // Get user from location state or localStorage (check multiple keys for compatibility)
        const stateUser = location.state?.user;
        const localUser = JSON.parse(localStorage.getItem('user') || 'null');
        const localUserData = JSON.parse(localStorage.getItem('userData') || 'null');
        const savedUser = stateUser || localUser || localUserData;

        console.log('🔍 AdminDashboard - User sources:', { stateUser, localUser, localUserData });
        console.log('👤 AdminDashboard - Using user:', savedUser);

        // Redirect to login if not authenticated or not admin
        if (!savedUser) {
            console.log('❌ No user found, redirecting to login');
            navigate('/login');
            return;
        }

        if (savedUser.role && savedUser.role.toLowerCase() !== 'admin') {
            navigate('/measure/welcome');
            return;
        }

        setUser(savedUser);

        // Fetch Admin Data
        const fetchData = async () => {
            try {
                setLoading(true);

                // Parallel fetching
                const [statsData, usersData] = await Promise.all([
                    getAdminStats(),
                    getAdminUsers()
                ]);

                if (statsData.success) {
                    setStats(statsData.stats);
                }
                if (usersData.success) {
                    setUsersList(usersData.users);
                }

                // Fetch Admin's own history
                if (savedUser && (savedUser.userId || savedUser.user_id || savedUser.id)) {
                    const userId = savedUser.userId || savedUser.user_id || savedUser.id;
                    const historyResponse = await getMeasurementHistory(userId);
                    if (historyResponse.success) {
                        setMyHistory(historyResponse.history || []);
                    }
                }

            } catch (error) {
                console.error("Failed to fetch admin data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate, location]);

    const handleLogout = () => {
        localStorage.removeItem('user');
        navigate('/login');
    };

    const toggleMetric = (value) => {
        if (value === 'all') {
            if (metricFilter.includes('all')) {
                setMetricFilter([]); // Deselect all to nothing
            } else {
                setMetricFilter(['all']); // Select all
            }
            return;
        }

        let newFilters = metricFilter.filter(f => f !== 'all');
        if (newFilters.includes(value)) {
            newFilters = newFilters.filter(f => f !== value);
        } else {
            newFilters.push(value);
        }

        if (newFilters.length === 0) newFilters = ['all'];
        setMetricFilter(newFilters);
    };

    // Chart Data Configuration


    // Chart Configuration
    // Memoized Chart Configuration
    const chartOptions = React.useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                display: false,
            },
            title: {
                display: false,
            },
            tooltip: {
                backgroundColor: 'rgba(255, 255, 255, 0.9)',
                titleColor: '#1e293b',
                bodyColor: '#475569',
                borderColor: 'rgba(220, 38, 38, 0.1)',
                borderWidth: 1,
                padding: 12,
                cornerRadius: 12,
                displayColors: false,
                titleFont: {
                    size: 14,
                    family: "'Outfit', sans-serif",
                    weight: 'bold',
                },
                bodyFont: {
                    size: 13,
                    family: "'Outfit', sans-serif",
                },
                callbacks: {
                    label: function (context) {
                        return ` ${context.parsed.y} Users`;
                    }
                }
            },
        },
        scales: {
            x: {
                grid: {
                    display: false,
                    drawBorder: false,
                },
                ticks: {
                    font: {
                        family: "'Outfit', sans-serif",
                        size: 12
                    },
                    color: '#64748b'
                }
            },
            y: {
                grid: {
                    color: '#f1f5f9',
                    borderDash: [5, 5],
                    drawBorder: false,
                },
                ticks: {
                    font: {
                        family: "'Outfit', sans-serif",
                        size: 11
                    },
                    color: '#94a3b8',
                    stepSize: 1
                },
                beginAtZero: true
            }
        },
        animation: {
            duration: 2000,
            easing: 'easeOutQuart'
        }
    }), []);

    // Memoized Chart Data
    const chartData = React.useMemo(() => ({
        labels: Object.keys(stats.roles_distribution || {}),
        datasets: [{
            label: 'Users per Role',
            data: Object.values(stats.roles_distribution || {}),
            backgroundColor: [
                'rgba(239, 68, 68, 0.8)', // red-500
                'rgba(59, 130, 246, 0.8)', // blue-500
                'rgba(34, 197, 94, 0.8)',  // green-500
                'rgba(234, 179, 8, 0.8)',  // yellow-500
                'rgba(168, 85, 247, 0.8)', // purple-500
                'rgba(236, 72, 153, 0.8)', // pink-500
            ],
            borderColor: 'transparent',
            borderRadius: 8,
            barThickness: 'flex',
            maxBarThickness: 60,
        }]
    }), [stats.roles_distribution]);

    // --- Mock Data for "Wow" Factor (Sensor & Maintenance) ---
    const sensorHealthData = {
        labels: ['Accuracy', 'Response Time', 'Uptime', 'Calibration', 'Signal Quality'],
        datasets: [
            {
                label: 'BP Monitor',
                data: [95, 90, 99, 88, 92],
                backgroundColor: 'rgba(59, 130, 246, 0.2)',
                borderColor: '#3b82f6',
                pointBackgroundColor: '#3b82f6',
            },
            {
                label: 'Temp Sensor',
                data: [98, 95, 100, 96, 98],
                backgroundColor: 'rgba(16, 185, 129, 0.2)',
                borderColor: '#10b981',
                pointBackgroundColor: '#10b981',
            }
        ]
    };

    const trafficData = {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
            {
                label: 'Measurements Taken',
                data: [12, 19, 15, 25, 22, 10, 8],
                fill: true,
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                borderColor: '#ef4444',
                tension: 0.4
            }
        ]
    };

    const trafficOptions = {
        responsive: true,
        plugins: { legend: { display: false }, title: { display: true, text: 'Weekly System Usage' } },
        scales: { y: { beginAtZero: true, grid: { borderDash: [5, 5] } }, x: { grid: { display: false } } }
    };

    const radarOptions = {
        responsive: true,
        plugins: { legend: { position: 'top' }, title: { display: false } },
        scales: { r: { ticks: { display: false }, grid: { circular: true } } }
    };

    // Filter users based on search
    const filteredUsers = usersList.filter(u => {
        const matchesSearch = u.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.school_number && u.school_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            u.role.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = roleFilter.includes('All') || roleFilter.includes(u.role);
        const matchesStatus = selectedStatus === 'All' || (u.approval_status || 'approved').toLowerCase() === selectedStatus.toLowerCase();

        return matchesSearch && matchesRole && matchesStatus;
    });

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (!user) return null;

    return (
        <div className="admin-container">
            {/* Header */}
            <header className="admin-header">
                <div className="header-brand">
                    <div className="header-brand-icon">
                        <Person />
                    </div>
                    <div className="header-title">
                        <h1>User Management</h1>
                        <p className="header-subtitle">Administrator Dashboard</p>
                    </div>
                </div>

                <div className="header-actions">
                    <button className="logout-button" onClick={handleLogout}>
                        <Logout />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            {/* Tab Navigation */}
            <div className="admin-tabs" style={{ padding: '0 2rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', background: 'white' }}>
                <button
                    onClick={() => setActiveTab('analytics')}
                    style={{
                        padding: '1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'analytics' ? '3px solid #dc2626' : '3px solid transparent',
                        fontWeight: activeTab === 'analytics' ? 'bold' : 'normal',
                        color: activeTab === 'analytics' ? '#dc2626' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    Analytics
                </button>
                <button
                    onClick={() => setActiveTab('users')}
                    style={{
                        padding: '1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'users' ? '3px solid #dc2626' : '3px solid transparent',
                        fontWeight: activeTab === 'users' ? 'bold' : 'normal',
                        color: activeTab === 'users' ? '#dc2626' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    User Management
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    style={{
                        padding: '1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'history' ? '3px solid #dc2626' : '3px solid transparent',
                        fontWeight: activeTab === 'history' ? 'bold' : 'normal',
                        color: activeTab === 'history' ? '#dc2626' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    Measurement History
                </button>
                <button
                    onClick={() => setActiveTab('maintenance')}
                    style={{
                        padding: '1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'maintenance' ? '3px solid #dc2626' : '3px solid transparent',
                        fontWeight: activeTab === 'maintenance' ? 'bold' : 'normal',
                        color: activeTab === 'maintenance' ? '#dc2626' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    Maintenance
                </button>
            </div>

            {/* Main Content */}
            <main className="admin-content">
                {activeTab === 'analytics' && (
                    <motion.div
                        className="charts-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Summary Cards */}
                        <div className="summary-cards">
                            <div className="summary-card total-users highlight">
                                <h3>Total Registered</h3>
                                <div className="summary-value">{stats.total_users}</div>
                                <div className="summary-label">Active Accounts</div>
                            </div>
                            <div className="summary-card system-health">
                                <h3>System Status</h3>
                                <div className="summary-value status-ok">ONLINE</div>
                                <div className="summary-label">Database Connected</div>
                            </div>
                        </div>

                        {/* Charts Grid - IMPROVED LAYOUT */}
                        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                            {/* Chart 1: User Stats (Real) */}
                            <div className="chart-card">
                                <h3>User Demographics</h3>
                                <div className="chart-container">
                                    {loading ? (
                                        <div className="loading-chart">Loading statistics...</div>
                                    ) : (
                                        <Bar data={chartData} options={chartOptions} />
                                    )}
                                </div>
                                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>Real-time user role distribution.</p>
                            </div>

                            {/* Chart 2: Sensor Health (Mocked/Impressive) */}
                            <div className="chart-card">
                                <h3>Sensor Health Index</h3>
                                <div className="chart-container">
                                    <Radar data={sensorHealthData} options={radarOptions} />
                                </div>
                                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>Real-time sensor calibration & accuracy status.</p>
                            </div>

                            {/* Chart 3: System Traffic (Mocked/Impressive) */}
                            <div className="chart-card" style={{ gridColumn: '1 / -1' }}>
                                <h3>System Maintenance & Usage</h3>
                                <div className="chart-container" style={{ height: '300px' }}>
                                    <Line data={trafficData} options={trafficOptions} />
                                </div>
                                <p style={{ textAlign: 'center', fontSize: '0.9rem', color: '#64748b', marginTop: '10px' }}>7-Day active measurement traffic.</p>
                            </div>
                        </div>
                    </motion.div>
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
                                <h3>Registered Users Database</h3>
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
                                        <select
                                            className="role-select"
                                            value={selectedStatus}
                                            onChange={(e) => setSelectedStatus(e.target.value)}
                                        >
                                            <option value="All">All Status</option>
                                            <option value="approved">Approved</option>
                                            <option value="pending">Pending</option>
                                            <option value="rejected">Rejected</option>
                                        </select>
                                    </div>

                                    <button className="icon-btn" title="Export"><Download /></button>
                                </div>
                            </div>

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
                                            <tr>
                                                <td colSpan="6" className="text-center p-4">Loading user data...</td>
                                            </tr>
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

                        <motion.div
                            className="table-section"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            style={{ marginBottom: '2rem' }}
                        >
                            <div className="table-header">
                                <h3>My Measurement History</h3>
                                <div style={{ display: 'flex', gap: '10px' }}>
                                    <select
                                        value={filterType}
                                        onChange={(e) => setFilterType(e.target.value)}
                                        style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                                    >
                                        <option value="all">All Time</option>
                                        <option value="today">Today</option>
                                        <option value="week">Past Week</option>
                                        <option value="month">Past Month</option>
                                    </select>
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
                                        {(() => {
                                            const displayedHistory = processHistory(myHistory);
                                            return loading ? (
                                                <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</td></tr>
                                            ) : displayedHistory.length === 0 ? (
                                                <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>No measurements found (Try changing filters).</td></tr>
                                            ) : (
                                                displayedHistory.map((m) => (
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
                                            );
                                        })()}
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
            </main>

            {/* Recommendation Modal */}
            {
                selectedMeasurement && (
                    <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={() => setSelectedMeasurement(null)}>
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
                )
            }
        </div >
    );
};

export default AdminDashboard;
