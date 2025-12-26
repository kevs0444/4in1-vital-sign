import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    Logout,
    Search,
    Download,
    Person
} from '@mui/icons-material';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './AdminDashboard.css';
import { getAdminStats, getAdminUsers, updateUserStatus } from '../../../../utils/api';

// Register ChartJS components
ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title
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
    const [selectedRole, setSelectedRole] = useState('All');
    const [selectedStatus, setSelectedStatus] = useState('All');

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
            backgroundColor: 'rgba(220, 38, 38, 0.8)',
            borderColor: 'transparent',
            borderRadius: 8,
            barThickness: 'flex',
            maxBarThickness: 60,
        }]
    }), [stats.roles_distribution]);

    // Filter users based on search
    const filteredUsers = usersList.filter(u => {
        const matchesSearch = u.firstname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.lastname.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (u.school_number && u.school_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
            u.role.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesRole = selectedRole === 'All' || u.role === selectedRole;
        const matchesStatus = selectedStatus === 'All' || (u.approval_status || 'approved').toLowerCase() === selectedStatus.toLowerCase();

        return matchesSearch && matchesRole && matchesStatus;
    });

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
                    <button className="maintenance-button" onClick={() => navigate('/admin/maintenance')}>
                        <span>Maintenance Testing</span>
                    </button>
                    <button className="logout-button" onClick={handleLogout}>
                        <Logout />
                        <span>Logout</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="admin-content">

                {/* Analytics Section */}
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

                    {/* Charts Grid */}
                    <div className="charts-grid">
                        <div className="chart-card">
                            <h3>User Statistics</h3>
                            <div className="chart-container">
                                {loading ? (
                                    <div className="loading-chart">Loading statistics...</div>
                                ) : (
                                    <Bar
                                        data={chartData}
                                        options={chartOptions}
                                    />
                                )}
                            </div>
                        </div>
                    </div>
                </motion.div>

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
                                <select
                                    className="role-select"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="All">All Roles</option>
                                    {Object.keys(stats.roles_distribution || {}).map(role => (
                                        <option key={role} value={role}>{role}</option>
                                    ))}
                                </select>
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
            </main>
        </div>
    );
};

export default AdminDashboard;
