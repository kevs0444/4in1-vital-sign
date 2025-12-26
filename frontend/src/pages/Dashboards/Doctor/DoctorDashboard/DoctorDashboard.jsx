import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logout, Person, Search, Visibility, LocalHospital } from '@mui/icons-material';
import './DoctorDashboard.css';
import { getAdminUsers, getMeasurementHistory } from '../../../../utils/api';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        // Authenticate
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login');
            return;
        }
        setUser(savedUser);

        // Fetch Data
        fetchUsers();
    }, [navigate, location]);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await getAdminUsers();
            if (response.success) {
                setUsersList(response.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    const viewUserHistory = async (targetUser) => {
        setSelectedUser(targetUser);
        setUserHistory([]);
        setHistoryLoading(true);
        try {
            // targetUser.user_id is from getAdminUsers
            const response = await getMeasurementHistory(targetUser.user_id);
            if (response.success) {
                setUserHistory(response.history || []);
            }
        } catch (error) {
            console.error("Failed to fetch user history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const filteredUsers = usersList.filter(u =>
        u.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.role?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-brand">
                    <div className="header-brand-icon">
                        <LocalHospital />
                    </div>
                    <div className="header-title">
                        <h1>Medical Portal</h1>
                        <p className="header-subtitle">Doctor Dashboard</p>
                    </div>
                </div>
                <div className="header-actions">
                    <button className="logout-button" onClick={handleLogout}>
                        <Logout /> <span>Logout</span>
                    </button>
                </div>
            </header>

            {/* Content */}
            <div className="dashboard-content">
                <motion.div
                    className="summary-cards"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="summary-card highlight">
                        <h3>Total Patients</h3>
                        <div className="summary-value">{usersList.length}</div>
                        <div className="summary-label">Registered Users</div>
                    </div>
                    {/* Add more stats if available */}
                </motion.div>

                <motion.div
                    className="table-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                >
                    <div className="table-header">
                        <h3>Patient Database</h3>
                        <div className="search-bar">
                            <Search style={{ color: '#94a3b8', fontSize: '1.2rem' }} />
                            <input
                                type="text"
                                placeholder="Search by name, email, role..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="table-wrapper">
                        <table className="users-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>Age/Sex</th>
                                    <th>School ID</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading database...</td></tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td></tr>
                                ) : (
                                    filteredUsers.map((u) => (
                                        <tr key={u.user_id}>
                                            <td>
                                                <div className="user-name-cell">
                                                    <div className="user-avatar">{u.firstname?.[0]}{u.lastname?.[0]}</div>
                                                    <div>
                                                        <div style={{ fontWeight: '600', color: '#1e293b' }}>{u.firstname} {u.lastname}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span style={{
                                                    padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                                                    background: '#f1f5f9', color: '#475569'
                                                }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td>{u.age} / {u.sex}</td>
                                            <td>{u.school_number || 'N/A'}</td>
                                            <td>
                                                <button className="action-btn" onClick={() => viewUserHistory(u)}>
                                                    <Visibility style={{ fontSize: '1rem' }} /> History
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* User History Modal */}
            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="modal-header">
                            <div>
                                <h2>Patient History</h2>
                                <p style={{ margin: 0, color: '#64748b', fontSize: '0.9rem' }}>
                                    {selectedUser.firstname} {selectedUser.lastname}
                                </p>
                            </div>
                            <button className="close-btn" onClick={() => setSelectedUser(null)}>&times;</button>
                        </div>

                        <div style={{ overflowX: 'auto' }}>
                            {historyLoading ? (
                                <div style={{ textAlign: 'center', padding: '20px' }}>Loading history...</div>
                            ) : userHistory.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>No measurements found for this user.</div>
                            ) : (
                                <table className="users-table" style={{ fontSize: '0.9rem' }}>
                                    <thead>
                                        <tr>
                                            <th>Date</th>
                                            <th>BP</th>
                                            <th>HR</th>
                                            <th>SpO2</th>
                                            <th>Risk</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {userHistory.map(h => (
                                            <tr key={h.id}>
                                                <td>{formatDate(h.created_at)}</td>
                                                <td>{h.systolic}/{h.diastolic}</td>
                                                <td>{h.heart_rate}</td>
                                                <td>{h.spo2}%</td>
                                                <td>{h.risk_category}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>

                        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                            <button
                                onClick={() => setSelectedUser(null)}
                                style={{
                                    padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px',
                                    cursor: 'pointer', fontWeight: '600', color: '#475569'
                                }}
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default DoctorDashboard;
