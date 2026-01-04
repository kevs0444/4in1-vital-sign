import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Logout, Search, Visibility, LocalHospital, Settings, GridView, TableRows, History, Check, Close, ErrorOutline, WarningAmber, Dashboard } from '@mui/icons-material';
import './NurseDashboard.css';
import { getAdminUsers, getMeasurementHistory } from '../../../../utils/api';
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardLayout from '../../../../components/DashboardLayout/DashboardLayout';
import DashboardAnalytics, { TimePeriodFilter, filterHistoryByTimePeriod, MultiSelectDropdown } from '../../../../components/DashboardAnalytics/DashboardAnalytics';
import PopulationAnalytics from '../../../../components/PopulationAnalytics/PopulationAnalytics';
import { Assessment } from '@mui/icons-material';
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

const NurseDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [usersList, setUsersList] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('table'); // 'table' or 'card'
    const [toast, setToast] = useState(null);

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);

    // New State for Tabs & Personal History & Filters
    const [activeTab, setActiveTab] = useState('patients'); // 'patients', 'analytics', 'personal', 'profile'
    const [myHistory, setMyHistory] = useState([]);

    // Time Period Filter State (shared for My Measurement History tab)
    const [timePeriod, setTimePeriod] = useState('weekly'); // daily, weekly, monthly, annually, custom
    const [customDateRange, setCustomDateRange] = useState(null);

    // Time Period Filter State for Patients Overview
    const [patientsTimePeriod, setPatientsTimePeriod] = useState('weekly');
    const [patientsCustomDateRange, setPatientsCustomDateRange] = useState(null);

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

    // Modal specific time period
    const [modalTimePeriod, setModalTimePeriod] = useState('all');
    const [modalCustomDateRange, setModalCustomDateRange] = useState(null);

    // Filter history by time period first
    const timeFilteredHistory = useMemo(() => {
        return filterHistoryByTimePeriod(myHistory, timePeriod, customDateRange);
    }, [myHistory, timePeriod, customDateRange]);

    // Filter modal user history by time period
    const timeFilteredUserHistory = useMemo(() => {
        return filterHistoryByTimePeriod(userHistory, modalTimePeriod, modalCustomDateRange);
    }, [userHistory, modalTimePeriod, modalCustomDateRange]);

    // Filter patients by registration date
    const timeFilteredPatients = useMemo(() => {
        if (!usersList || usersList.length === 0) return [];
        return filterHistoryByTimePeriod(
            usersList.map(u => ({ ...u, created_at: u.last_checkup || u.created_at || u.registered_at })),
            patientsTimePeriod,
            patientsCustomDateRange
        );
    }, [usersList, patientsTimePeriod, patientsCustomDateRange]);

    const fetchMyHistory = React.useCallback(async (userId) => {
        try {
            const response = await getMeasurementHistory(userId);
            if (response.success) {
                setMyHistory(response.history || []);
            }
        } catch (error) {
            console.error("Failed to fetch my history:", error);
        }
    }, []);

    const fetchUsers = React.useCallback(async () => {
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
    }, []);

    useEffect(() => {
        // Authenticate
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login');
            return;
        }

        // Store current user for profile tab
        setCurrentUser(savedUser);

        // Fetch Data
        fetchUsers();
        if (savedUser && (savedUser.userId || savedUser.user_id || savedUser.id)) {
            fetchMyHistory(savedUser.userId || savedUser.user_id || savedUser.id);
        }
    }, [navigate, location, fetchUsers, fetchMyHistory]);

    // Real-time WebSocket updates - instant push notifications
    const refetchAllData = React.useCallback(async () => {
        await fetchUsers();
        if (currentUser) {
            await fetchMyHistory(currentUser.userId || currentUser.user_id || currentUser.id);
        }
    }, [currentUser, fetchUsers, fetchMyHistory]);

    const { isConnected, lastUpdated } = useRealtimeUpdates({
        role: 'Nurse',
        userId: currentUser?.userId || currentUser?.user_id || currentUser?.id,
        refetchData: refetchAllData,
        onNewMeasurement: (data) => {
            console.log('📊 New measurement received:', data);
        }
    });

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

    const filteredUsers = timeFilteredPatients
        .filter(u =>
            u.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => {
            const dateA = a.last_checkup ? new Date(a.last_checkup).getTime() : 0;
            const dateB = b.last_checkup ? new Date(b.last_checkup).getTime() : 0;
            return dateB - dateA;
        });

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

    // Filtering & Sorting Helper (now uses pre-filtered timeFilteredHistory)
    const processHistory = (data, activeMetricFilter = metricFilter, activeRiskFilter = riskFilter) => {
        if (!data) return [];
        let processed = [...data];

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

    const displayedMyHistory = processHistory(timeFilteredHistory, metricFilter, riskFilter);
    const displayedUserHistory = processHistory(timeFilteredUserHistory, modalMetricFilter, modalRiskFilter);

    // Define Tabs
    const tabs = [
        { id: 'patients', label: 'Patients Overview', icon: <LocalHospital /> },
        { id: 'analytics', label: 'Population Analytics', icon: <Assessment /> },
        { type: 'spacer' },
        { id: 'myoverview', label: 'My Health Overview', icon: <Dashboard /> },
        { id: 'personal', label: 'My Measurements', icon: <History /> },
        { id: 'profile', label: 'Personal Info', icon: <Settings /> }
    ];

    if (!currentUser) return null;

    return (
        <DashboardLayout
            title={tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            subtitle="Nurse Dashboard"
            user={currentUser}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            lastUpdated={lastUpdated}
            onRefresh={refetchAllData}
            isConnected={isConnected}
        >
            <StatusToast toast={toast} onClose={() => setToast(null)} />
            {/* --- Personal Info Tab --- */}
            {activeTab === 'profile' && currentUser && (
                <PersonalInfo
                    userId={currentUser.userId || currentUser.user_id || currentUser.id}
                    onProfileUpdate={(updatedUser) => {
                        setCurrentUser(prev => ({ ...prev, ...updatedUser }));
                    }}
                    onShowToast={(type, title, message) => setToast({ type, title, message, id: Date.now() })}
                />
            )}

            {/* --- Analytics Tab --- */}
            {activeTab === 'analytics' && (
                <div style={{ padding: '0 0 40px 0' }}>
                    <PopulationAnalytics />
                </div>
            )}

            {/* --- Patients Tab --- */}
            {activeTab === 'patients' && (
                <motion.div
                    className="table-section"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                >
                    <div className="table-header">
                        <h3>Assigned Patients / All Users ({timeFilteredPatients.length} records)</h3>
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div className="search-bar">
                                <Search className="search-icon" />
                                <input
                                    type="text"
                                    placeholder="Search by name, email, role..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Time Period Filter */}
                            <TimePeriodFilter
                                timePeriod={patientsTimePeriod}
                                setTimePeriod={setPatientsTimePeriod}
                                customDateRange={patientsCustomDateRange}
                                setCustomDateRange={setPatientsCustomDateRange}
                                variant="dropdown"
                            />
                            {/* View Mode Toggle */}
                            <div className="view-mode-toggle" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                                <button
                                    onClick={() => setViewMode('table')}
                                    style={{
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: viewMode === 'table' ? '#dc2626' : 'transparent',
                                        color: viewMode === 'table' ? 'white' : '#64748b',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Table View"
                                >
                                    <TableRows style={{ fontSize: '1.2rem' }} />
                                </button>
                                <button
                                    onClick={() => setViewMode('card')}
                                    style={{
                                        padding: '8px 12px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: viewMode === 'card' ? '#dc2626' : 'transparent',
                                        color: viewMode === 'card' ? 'white' : '#64748b',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Card View"
                                >
                                    <GridView style={{ fontSize: '1.2rem' }} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    {viewMode === 'table' && (
                        <div className="table-container-wrapper">
                            <table className="users-table">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Role</th>
                                        <th>Email</th>
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
                                        filteredUsers.map((u, index) => (
                                            <tr key={u.user_id} style={{ background: index === 0 && u.last_checkup ? '#fff1f2' : 'transparent', transition: 'background 0.2s' }}>
                                                <td>
                                                    <div className="user-name-cell">
                                                        <div className="user-avatar">{u.firstname[0]}{u.lastname[0]}</div>
                                                        <div>
                                                            <div className="fw-bold">{u.firstname} {u.lastname}</div>
                                                            <div className="text-secondary small">ID: {u.school_number || 'N/A'}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className={`role-badge role-${u.role.toLowerCase()}`}>{u.role}</span></td>
                                                <td>{u.email}</td>
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
                    )}

                    {/* Card View */}
                    {viewMode === 'card' && (
                        <div className="user-cards-grid" style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                            gap: '1.5rem',
                            padding: '10px'
                        }}>
                            {loading ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    Loading users...
                                </div>
                            ) : filteredUsers.length === 0 ? (
                                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '2rem', color: '#64748b' }}>
                                    No users found.
                                </div>
                            ) : (
                                filteredUsers.map((u) => (
                                    <motion.div
                                        key={u.user_id}
                                        className="user-card"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        whileHover={{ y: -4, boxShadow: '0 12px 24px rgba(0,0,0,0.12)' }}
                                        style={{
                                            background: 'white',
                                            borderRadius: '16px',
                                            padding: '1.5rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                            border: '1px solid #e2e8f0',
                                            transition: 'all 0.2s ease'
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                                            <div style={{
                                                width: '56px',
                                                height: '56px',
                                                borderRadius: '50%',
                                                background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                                color: 'white',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                fontWeight: 'bold',
                                                fontSize: '1.25rem'
                                            }}>
                                                {u.firstname[0]}{u.lastname[0]}
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ margin: 0, color: '#1e293b', fontSize: '1.1rem' }}>
                                                    {u.firstname} {u.lastname}
                                                </h4>
                                                <span className={`role-badge role-${u.role.toLowerCase()}`} style={{ fontSize: '0.75rem', marginTop: '4px', display: 'inline-block' }}>
                                                    {u.role}
                                                </span>
                                            </div>
                                        </div>

                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.9rem', color: '#475569' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>Email:</span>
                                                <span style={{ fontWeight: '500', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>School ID:</span>
                                                <span style={{ fontWeight: '500' }}>{u.school_number || 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ color: '#94a3b8' }}>Last Checkup:</span>
                                                <span style={{ fontWeight: '500' }}>{u.last_checkup ? formatDate(u.last_checkup) : '-'}</span>
                                            </div>
                                        </div>

                                        <button
                                            className="action-btn"
                                            onClick={() => viewUserHistory(u)}
                                            style={{
                                                width: '100%',
                                                padding: '10px',
                                                borderRadius: '8px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                gap: '6px'
                                            }}
                                        >
                                            <Visibility style={{ fontSize: '1rem' }} /> View History
                                        </button>
                                    </motion.div>
                                ))
                            )}
                        </div>
                    )}
                </motion.div>
            )}

            {/* --- My Health Overview Tab --- */}
            {activeTab === 'myoverview' && (
                <div style={{ padding: '0 0 40px 0' }}>
                    <DashboardAnalytics
                        user={currentUser}
                        history={myHistory}
                        timePeriod={timePeriod}
                        customDateRange={customDateRange}
                    />
                </div>
            )}

            {/* --- My Measurements Tab --- */}
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
                            variant="dropdown"
                        />
                    </div>

                    <motion.div
                        className="table-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {/* Summary Cards for Personal History */}
                        <div className="summary-cards" style={{ marginBottom: '2rem', display: 'none' }}>
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
                            <h3>My Measurements ({processHistory(timeFilteredHistory).length} records)</h3>
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
                </>
            )}

            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)} style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '900px',
                            width: '95%',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            background: 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                            borderRadius: '24px',
                            padding: '24px'
                        }}
                    >
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.25rem', fontWeight: 'bold',
                                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.3)'
                                }}>
                                    {selectedUser.firstname[0]}{selectedUser.lastname[0]}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        History Analysis
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

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                            <TimePeriodFilter
                                timePeriod={modalTimePeriod}
                                setTimePeriod={setModalTimePeriod}
                                customDateRange={modalCustomDateRange}
                                setCustomDateRange={setModalCustomDateRange}
                                variant="dropdown"
                            />

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
        </DashboardLayout>
    );
};

export default NurseDashboard;
