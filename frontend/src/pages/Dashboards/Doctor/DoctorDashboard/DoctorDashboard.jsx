import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logout, Search, Visibility, LocalHospital } from '@mui/icons-material';
import './DoctorDashboard.css';
import { getAdminUsers, getMeasurementHistory } from '../../../../utils/api';

const DoctorDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal State
    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);

    // New State for Tabs & Personal History & Filters
    const [activeTab, setActiveTab] = useState('patients'); // 'patients', 'personal'
    const [myHistory, setMyHistory] = useState([]);
    const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'week', 'month'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'
    const [metricFilter, setMetricFilter] = useState(['all']); // Array for multi-select
    const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);

    // Modal specific filters
    const [modalMetricFilter, setModalMetricFilter] = useState(['all']);
    const [isModalMetricDropdownOpen, setIsModalMetricDropdownOpen] = useState(false);

    const [riskFilter, setRiskFilter] = useState(['all']); // Array for multi-select
    const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);
    const [modalRiskFilter, setModalRiskFilter] = useState(['all']);
    const [isModalRiskDropdownOpen, setIsModalRiskDropdownOpen] = useState(false);

    useEffect(() => {
        // Authenticate
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login');
            return;
        }

        // Fetch Data
        fetchUsers();
        if (savedUser && (savedUser.userId || savedUser.user_id || savedUser.id)) {
            fetchMyHistory(savedUser.userId || savedUser.user_id || savedUser.id);
        }
    }, [navigate, location]);

    const fetchMyHistory = async (userId) => {
        try {
            const response = await getMeasurementHistory(userId);
            if (response.success) {
                setMyHistory(response.history || []);
            }
        } catch (error) {
            console.error("Failed to fetch my history:", error);
        }
    };

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

    const toggleMetric = (value) => {
        if (value === 'all') {
            if (metricFilter.includes('all')) {
                setMetricFilter([]);
            } else {
                setMetricFilter(['all']);
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

    const toggleModalMetric = (value) => {
        if (value === 'all') {
            if (modalMetricFilter.includes('all')) {
                setModalMetricFilter([]);
            } else {
                setModalMetricFilter(['all']);
            }
            return;
        }

        let newFilters = modalMetricFilter.filter(f => f !== 'all');
        if (newFilters.includes(value)) {
            newFilters = newFilters.filter(f => f !== value);
        } else {
            newFilters.push(value);
        }

        if (newFilters.length === 0) newFilters = ['all'];
        setModalMetricFilter(newFilters);
    };

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

    const toggleModalRisk = (value) => {
        if (value === 'all') {
            if (modalRiskFilter.includes('all')) {
                setModalRiskFilter([]);
            } else {
                setModalRiskFilter(['all']);
            }
            return;
        }

        let newFilters = modalRiskFilter.filter(f => f !== 'all');
        if (newFilters.includes(value)) {
            newFilters = newFilters.filter(f => f !== value);
        } else {
            newFilters.push(value);
        }

        if (newFilters.length === 0) newFilters = ['all'];
        setModalRiskFilter(newFilters);
    };

    // Filtering & Sorting Helper
    const processHistory = (data, activeMetricFilter = metricFilter, activeRiskFilter = riskFilter) => {
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
        if (!activeMetricFilter.includes('all')) {
            processed = processed.filter(item => {
                if (activeMetricFilter.includes('bp') && item.systolic > 0) return true;
                if (activeMetricFilter.includes('hr') && item.heart_rate > 0) return true;
                if (activeMetricFilter.includes('rr') && item.respiratory_rate > 0) return true;
                if (activeMetricFilter.includes('spo2') && item.spo2 > 0) return true;
                if (activeMetricFilter.includes('temp') && item.temperature > 0) return true;
                if (activeMetricFilter.includes('weight') && item.weight > 0) return true;
                if (activeMetricFilter.includes('height') && item.height > 0) return true;
                if (activeMetricFilter.includes('bmi') && item.bmi > 0) return true;
                return false;
            });
        }

        // Risk Filter
        if (!activeRiskFilter.includes('all')) {
            processed = processed.filter(item => {
                if (!item.risk_category) return false;
                const riskCat = item.risk_category.toLowerCase();
                return activeRiskFilter.some(filter => riskCat.includes(filter));
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

    const displayedMyHistory = processHistory(myHistory, metricFilter, riskFilter);
    const displayedUserHistory = processHistory(userHistory, modalMetricFilter, modalRiskFilter);


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

            {/* Tab Navigation */}
            <div className="dashboard-tabs" style={{ padding: '0 2rem', display: 'flex', gap: '1rem', borderBottom: '1px solid #e2e8f0', background: 'white', marginBottom: '1rem' }}>
                <button
                    onClick={() => setActiveTab('patients')}
                    style={{
                        padding: '1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'patients' ? '3px solid #dc2626' : '3px solid transparent',
                        fontWeight: activeTab === 'patients' ? 'bold' : 'normal',
                        color: activeTab === 'patients' ? '#dc2626' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    Patients Overview
                </button>
                <button
                    onClick={() => setActiveTab('personal')}
                    style={{
                        padding: '1rem',
                        border: 'none',
                        background: 'none',
                        borderBottom: activeTab === 'personal' ? '3px solid #dc2626' : '3px solid transparent',
                        fontWeight: activeTab === 'personal' ? 'bold' : 'normal',
                        color: activeTab === 'personal' ? '#dc2626' : '#64748b',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    My Measurement History
                </button>
            </div>

            {/* Content */}
            <div className="dashboard-content">

                {/* --- Patients Tab --- */}
                {activeTab === 'patients' && (
                    <motion.div
                        className="table-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <div className="table-header">
                            <h3>Assigned Patients / All Users</h3>
                            <div className="search-bar">
                                <Search className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, role..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="table-container-wrapper">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>School ID</th>
                                        <th>Last Checkup</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No users found.</td></tr>
                                    ) : (
                                        filteredUsers.map((u) => (
                                            <tr key={u.user_id}>
                                                <td>
                                                    <div className="user-name-cell">
                                                        <div className="user-avatar">{u.firstname[0]}{u.lastname[0]}</div>
                                                        <div>
                                                            <div className="fw-bold">{u.firstname} {u.lastname}</div>
                                                            <div className="text-secondary small">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                                                <td>{u.school_number || 'N/A'}</td>
                                                <td>{u.last_checkup ? formatDate(u.last_checkup) : '-'}</td>
                                                <td>
                                                    <button className="action-btn" onClick={() => viewUserHistory(u)}>
                                                        <Visibility style={{ fontSize: '1rem', marginRight: '4px' }} /> View History
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

                {/* --- Personal History Tab --- */}
                {activeTab === 'personal' && (
                    <motion.div
                        className="table-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Summary Cards for Personal History */}
                        <div className="summary-cards" style={{ marginBottom: '2rem' }}>
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
                        </div>

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
                                                <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
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
                                    {displayedMyHistory.length === 0 ? (
                                        <tr><td colSpan="9" style={{ textAlign: 'center', padding: '2rem' }}>No history found (Try changing filters)</td></tr>
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
                                                    <span className={`risk-badge ${m.risk_category?.toLowerCase().includes('normal') ? 'risk-normal' :
                                                        m.risk_category?.toLowerCase().includes('high') ? 'risk-high' : 'risk-elevated'
                                                        }`}>
                                                        {m.risk_category || 'Unknown'}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button className="action-btn" onClick={() => setSelectedMeasurement(m)}>
                                                        <Visibility style={{ fontSize: '1rem', marginRight: '4px' }} /> View
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}

            </div>

            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ maxWidth: '800px', width: '90%' }}
                    >
                        <div className="modal-header">
                            <h2>History: {selectedUser.firstname} {selectedUser.lastname}</h2>
                            <button className="close-btn" onClick={() => setSelectedUser(null)}>&times;</button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value)}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="all">All Time</option>
                                <option value="today">Today</option>
                                <option value="week">Past Week</option>
                                <option value="month">Past Month</option>
                            </select>

                            <div style={{ position: 'relative' }}>
                                <button
                                    onClick={() => setIsModalMetricDropdownOpen(!isModalMetricDropdownOpen)}
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
                                        {modalMetricFilter.includes('all') ? 'All Metrics' :
                                            modalMetricFilter.length > 0 ? `${modalMetricFilter.length} Selected` : 'Select Metrics'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem' }}>▼</span>
                                </button>
                                {isModalMetricDropdownOpen && (
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
                                            <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9rem', color: '#334155' }}>
                                                <input
                                                    type="checkbox"
                                                    checked={modalMetricFilter.includes(opt.value)}
                                                    onChange={() => toggleModalMetric(opt.value)}
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
                                    onClick={() => setIsModalRiskDropdownOpen(!isModalRiskDropdownOpen)}
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
                                        {modalRiskFilter.includes('all') ? 'All Risks' :
                                            modalRiskFilter.length > 0 ? `${modalRiskFilter.length} Selected` : 'Select Risks'}
                                    </span>
                                    <span style={{ fontSize: '0.8rem' }}>▼</span>
                                </button>
                                {isModalRiskDropdownOpen && (
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
                                                    checked={modalRiskFilter.includes(opt.value)}
                                                    onChange={() => toggleModalRisk(opt.value)}
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
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
                            </select>
                        </div>

                        <div className="table-container-wrapper" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Date</th>
                                        {(metricFilter.includes('all') || metricFilter.includes('bp')) && <th>BP</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('hr')) && <th>HR</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('rr')) && <th>RR</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('spo2')) && <th>SpO2</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('temp')) && <th>Temp</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('weight') || metricFilter.includes('bmi')) && <th>Weight (kg)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('height') || metricFilter.includes('bmi')) && <th>Height (cm)</th>}
                                        {(metricFilter.includes('all') || metricFilter.includes('bmi')) && <th>BMI</th>}
                                        <th>Risk</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyLoading ? (
                                        <tr><td colSpan="11" style={{ textAlign: 'center' }}>Loading history...</td></tr>
                                    ) : displayedUserHistory.length === 0 ? (
                                        <tr><td colSpan="11" style={{ textAlign: 'center' }}>No history records found.</td></tr>
                                    ) : (
                                        displayedUserHistory.map(h => (
                                            <tr key={h.id}>
                                                <td>{formatDate(h.created_at)}</td>
                                                {(metricFilter.includes('all') || metricFilter.includes('bp')) && <td>{h.systolic ? `${h.systolic}/${h.diastolic}` : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('hr')) && <td>{h.heart_rate ? h.heart_rate : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('rr')) && <td>{h.respiratory_rate ? h.respiratory_rate : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('spo2')) && <td>{h.spo2 ? `${h.spo2}%` : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('temp')) && <td>{h.temperature ? `${h.temperature}°C` : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('weight') || metricFilter.includes('bmi')) && <td>{h.weight ? h.weight : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('height') || metricFilter.includes('bmi')) && <td>{h.height ? h.height : 'Not Measured'}</td>}
                                                {(metricFilter.includes('all') || metricFilter.includes('bmi')) && <td>{h.bmi && Number(h.bmi) > 0 ? Number(h.bmi).toFixed(1) : 'Not Measured'}</td>}
                                                <td>
                                                    <span style={{
                                                        padding: '2px 6px', borderRadius: '4px', fontSize: '0.8rem', fontWeight: '600',
                                                        background: h.risk_category?.toLowerCase().includes('high') ? '#fee2e2' : '#dcfce7',
                                                        color: h.risk_category?.toLowerCase().includes('high') ? '#991b1b' : '#166534'
                                                    }}>
                                                        {h.risk_category}
                                                    </span>
                                                </td>
                                                <td>
                                                    <button
                                                        onClick={() => setSelectedMeasurement(h)}
                                                        style={{ border: 'none', background: 'none', color: '#3b82f6', cursor: 'pointer', fontWeight: '600' }}
                                                    >
                                                        View
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
            )}

            {/* Detailed Result Modal (Shared) */}
            {
                selectedMeasurement && (
                    <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setSelectedMeasurement(null)}>
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h2>Detailed Assessment</h2>
                                <button className="close-btn" onClick={() => setSelectedMeasurement(null)}>&times;</button>
                            </div>

                            <div style={{ marginBottom: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
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
                                    <div className="rec-section">
                                        <h4>Suggested Medical Action</h4>
                                        <p>{selectedMeasurement.recommendation.medical_action}</p>
                                    </div>
                                )}

                                {selectedMeasurement.recommendation?.preventive_strategy && (
                                    <div className="rec-section">
                                        <h4>Preventive Strategy</h4>
                                        <p>{selectedMeasurement.recommendation.preventive_strategy}</p>
                                    </div>
                                )}

                                {selectedMeasurement.recommendation?.wellness_tips && (
                                    <div className="rec-section">
                                        <h4>Wellness Tips</h4>
                                        <p>{selectedMeasurement.recommendation.wellness_tips}</p>
                                    </div>
                                )}

                                {selectedMeasurement.recommendation?.provider_guidance && (
                                    <div className="rec-section">
                                        <h4>Provider Guidance</h4>
                                        <p>{selectedMeasurement.recommendation.provider_guidance}</p>
                                    </div>
                                )}
                            </div>

                            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end' }}>
                                <button
                                    onClick={() => setSelectedMeasurement(null)}
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
                )
            }
        </div >
    );
};

export default DoctorDashboard;


