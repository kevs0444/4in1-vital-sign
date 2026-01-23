import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Visibility, Settings, History, Check, Close, ErrorOutline, WarningAmber, Dashboard } from '@mui/icons-material';
import './StudentDashboard.css';
import { getMeasurementHistory, getPopulationAnalytics } from '../../../../utils/api';
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardLayout from '../../../../components/DashboardLayout/DashboardLayout';
import DashboardAnalytics, { TimePeriodFilter, filterHistoryByTimePeriod, MultiSelectDropdown } from '../../../../components/DashboardAnalytics/DashboardAnalytics';
import NoDataFound from '../../../../components/NoDataFound/NoDataFound';
import { Assessment } from '@mui/icons-material';
import { useRealtimeUpdates } from '../../../../hooks/useRealtimeData';
import ExportButton from '../../../../components/ExportButton/ExportButton';
import { exportToCSV, exportToExcel, exportToPDF } from '../../../../utils/exportUtils';
import { GridView, TableRows } from '@mui/icons-material';

// StatusToast Component (Local Definition)
const StatusToast = ({ toast, onClose }) => {
    // toast object should contain: { id (optional), type: 'success'|'error'|'warning', title, message }

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


const StudentDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'history', 'profile'
    const [toast, setToast] = useState(null);
    const [popAverages, setPopAverages] = useState(null);

    // Kiosk Mode: Default to 'card' if width <= 768px (Only for consistent view logic, though Student uses table mostly)
    const [viewMode, setViewMode] = useState(window.innerWidth <= 768 ? 'card' : 'table');

    useEffect(() => {
        const handleResize = () => {
            // Just tracking state if needed, though Student Dashboard primarily uses table. 
            // We will apply CSS overrides to make table behave like cards or scrollable.
            if (window.innerWidth <= 768) {
                setViewMode('card');
            }
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const fetchData = React.useCallback(async (userId) => {
        try {
            setLoading(true);

            if (userId) {
                const response = await getMeasurementHistory(userId);
                if (response.success) {
                    setHistory(response.history || []);
                }
            }

            // Fetch Population Data for comparison
            try {
                const popResponse = await getPopulationAnalytics();
                if (popResponse.success) {
                    setPopAverages(popResponse.analytics.averages);
                }
            } catch (pe) {
                console.log("Population stats unavailable");
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    }, []);



    // Authenticate & Fetch Data
    useEffect(() => {
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login', { replace: true });
            return;
        }
        setCurrentUser(savedUser);

        const userId = savedUser.userId || savedUser.user_id || savedUser.id;
        if (userId) fetchData(userId);
    }, [navigate, location, fetchData]);



    // Real-time WebSocket updates - instant push notifications
    const refetchAllData = React.useCallback(async () => {
        if (currentUser) {
            const userId = currentUser.userId || currentUser.user_id || currentUser.id;
            if (userId) {
                await fetchData(userId);
            }
        }
    }, [currentUser, fetchData]);

    const { isConnected, lastUpdated } = useRealtimeUpdates({
        role: 'Student',
        userId: currentUser?.userId || currentUser?.user_id || currentUser?.id,
        refetchData: refetchAllData,
        onNewMeasurement: (data) => {
            // Only refetch if this measurement belongs to the current user
            const myId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
            if (data.user_id === myId) {
                console.log('📊 My new measurement received:', data);
            }
        }
    });

    // Time Period Filter State (shared between analytics and table)
    const [timePeriod, setTimePeriod] = useState('weekly'); // daily, weekly, monthly, annually, custom
    const [customDateRange, setCustomDateRange] = useState(null);

    // Other Filtering & Sorting State
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'
    const [metricFilter, setMetricFilter] = useState(['all']); // Array for multi-select
    const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
    const [riskFilter, setRiskFilter] = useState(['all']); // Array for multi-select
    const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);

    // Filter history by time period first
    const timeFilteredHistory = useMemo(() => {
        return filterHistoryByTimePeriod(history, timePeriod, customDateRange);
    }, [history, timePeriod, customDateRange]);

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

    // Filtering & Sorting Helper (now uses pre-filtered timeFilteredHistory)
    const processHistory = (data) => {
        if (!data) return [];
        let processed = [...data];

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
        const lower = category.toLowerCase();
        if (lower.includes('normal')) return '#166534';
        if (lower.includes('elevated')) return '#ca8a04';
        if (lower.includes('high')) return '#dc2626';
        if (lower.includes('critical')) return '#7f1d1d';
        return '#64748b';
    };

    const handleExportHistory = (type) => {
        if (!timeFilteredHistory || timeFilteredHistory.length === 0) {
            setToast({ type: 'warning', title: 'Export Failed', message: 'No data to export.' });
            return;
        }

        const dataToExport = processHistory(timeFilteredHistory).map(m => ({
            Date: formatDate(m.created_at),
            'BP (mmHg)': m.systolic ? `${m.systolic}/${m.diastolic}` : '-',
            'Heart Rate (bpm)': m.heart_rate || '-',
            'Resp. Rate (bpm)': m.respiratory_rate || '-',
            'SpO2 (%)': m.spo2 ? `${m.spo2}%` : '-',
            'Temp (°C)': m.temperature ? `${m.temperature}` : '-',
            'Weight (kg)': m.weight || '-',
            'Height (cm)': m.height || '-',
            'BMI': m.bmi || '-',
            'Risk Status': m.risk_category || 'Unknown'
        }));

        const timestamp = new Date().toISOString().split('T')[0];
        const filename = `My_Health_History_${timestamp}`;

        if (type === 'csv') exportToCSV(dataToExport, filename);
        else if (type === 'excel') exportToExcel(dataToExport, filename);
        else if (type === 'pdf') exportToPDF(dataToExport, filename, `My Health History (${timestamp})`);
    };



    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        navigate('/login', { replace: true });
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Define Tabs
    const tabs = [
        { id: 'overview', label: 'My Health Overview', icon: <Dashboard /> },
        { id: 'history', label: 'My Measurements', icon: <History /> },
        { id: 'profile', label: 'Personal Info', icon: <Settings /> }
    ];

    if (!currentUser) return null;

    return (
        <DashboardLayout
            title={tabs.find(t => t.id === activeTab)?.label || 'My Health Portal'}
            subtitle="Student Dashboard"
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

            {/* Personal Info Tab */}
            {activeTab === 'profile' && currentUser && (
                <PersonalInfo
                    userId={currentUser.userId || currentUser.user_id || currentUser.id}
                    onProfileUpdate={(updatedUser) => {
                        setCurrentUser(prev => ({ ...prev, ...updatedUser }));
                    }}
                    onShowToast={(type, title, message) => setToast({ type, title, message, id: Date.now() })}
                />
            )}

            {/* My Health Overview Tab */}
            {activeTab === 'overview' && currentUser && (
                <div style={{ padding: '0 0 40px 0' }}>
                    <DashboardAnalytics
                        user={currentUser}
                        history={history}
                        timePeriod={timePeriod}
                        customDateRange={customDateRange}
                        populationAverages={popAverages}
                    />
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <>

                    <motion.div
                        className="summary-cards"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{ display: 'none' }} // Hiding old cards but keeping code for safety/reference if needed for now
                    >
                        <div className="summary-card highlight">
                            <h3>Total Checkups</h3>
                            <div className="summary-value">{history.length}</div>
                            <div className="summary-label">Measurements Taken</div>
                        </div>
                        <div className="summary-card">
                            <h3>Latest Status</h3>
                            <div className="summary-value" style={{ fontSize: '1.5rem', color: history.length > 0 ? getRiskColor(history[0].risk_category) : '#64748b' }}>
                                {history.length > 0 ? (history[0].risk_category || 'N/A') : 'No Data'}
                            </div>
                            <div className="summary-label">
                                {history.length > 0 ? formatDate(history[0].created_at) : '-'}
                            </div>
                        </div>
                    </motion.div>

                    <motion.div
                        className="table-section"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="table-header">
                            <h3>My Measurements ({processHistory(timeFilteredHistory).length} records)</h3>
                            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                                <TimePeriodFilter
                                    timePeriod={timePeriod}
                                    setTimePeriod={setTimePeriod}
                                    customDateRange={customDateRange}
                                    setCustomDateRange={setCustomDateRange}
                                    variant="dropdown"
                                />
                                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
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
                                </div>

                                <select
                                    value={sortOrder}
                                    onChange={(e) => setSortOrder(e.target.value)}
                                    style={{
                                        padding: '10px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        background: 'white',
                                        color: '#1e293b',
                                        fontWeight: '600',
                                        fontSize: '0.9rem',
                                        cursor: 'pointer',
                                        minWidth: '140px'
                                    }}
                                >
                                    <option value="desc">Newest First</option>
                                    <option value="asc">Oldest First</option>
                                </select>

                                <ExportButton
                                    onExportCSV={() => handleExportHistory('csv')}
                                    onExportExcel={() => handleExportHistory('excel')}
                                    onExportPDF={() => handleExportHistory('pdf')}
                                />

                                <div className="view-mode-toggle" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                                    <button
                                        onClick={() => {
                                            if (window.innerWidth > 768) setViewMode('table');
                                        }}
                                        style={{
                                            padding: '8px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            background: viewMode === 'table' ? '#dc2626' : 'transparent',
                                            color: viewMode === 'table' ? 'white' : '#64748b',
                                            cursor: window.innerWidth <= 768 ? 'not-allowed' : 'pointer',
                                            opacity: window.innerWidth <= 768 ? 0.5 : 1
                                        }}
                                    >
                                        <TableRows />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('card')}
                                        style={{
                                            padding: '8px',
                                            border: 'none',
                                            borderRadius: '6px',
                                            background: viewMode === 'card' ? '#dc2626' : 'transparent',
                                            color: viewMode === 'card' ? 'white' : '#64748b',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <GridView />
                                    </button>
                                </div>

                            </div>
                        </div>

                        {viewMode === 'table' ? (
                            <div className="table-container-wrapper">
                                <table className="history-table">
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
                                            const processedHistory = processHistory(timeFilteredHistory);
                                            return loading ? (
                                                <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</td></tr>
                                            ) : processedHistory.length === 0 ? (
                                                <NoDataFound type="measurements" compact={true} colSpan={11} />
                                            ) : (
                                                processedHistory.map((m) => (
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
                                                            <button
                                                                className="action-btn"
                                                                onClick={() => setSelectedMeasurement(m)}
                                                            >
                                                                <Visibility style={{ fontSize: '1rem', marginRight: '4px' }} /> View
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="measurement-cards-grid">
                                {(() => {
                                    const processedHistory = processHistory(timeFilteredHistory);
                                    return loading ? (
                                        <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1/-1' }}>Loading...</div>
                                    ) : processedHistory.length === 0 ? (
                                        <div style={{ gridColumn: '1/-1' }}><NoDataFound type="measurements" /></div>
                                    ) : (
                                        processedHistory.map(m => (
                                            <div className="measurement-card" key={m.id} onClick={() => setSelectedMeasurement(m)}>
                                                <div className="m-card-header">
                                                    <div className="m-card-date">{formatDate(m.created_at)}</div>
                                                    <span className={`risk-badge ${m.risk_category?.toLowerCase().includes('normal') ? 'risk-normal' : 'risk-high'}`} style={{ fontSize: '0.75rem', padding: '2px 8px' }}>
                                                        {m.risk_category || 'Unknown'}
                                                    </span>
                                                </div>
                                                <div className="m-card-grid">
                                                    <div className="m-metric">
                                                        <span className="m-label">BP (mmHg)</span>
                                                        <span className="m-value">{m.systolic ? `${m.systolic}/${m.diastolic}` : '-'}</span>
                                                    </div>
                                                    <div className="m-metric">
                                                        <span className="m-label">Heart Rate</span>
                                                        <span className="m-value">{m.heart_rate ? `${m.heart_rate} bpm` : '-'}</span>
                                                    </div>
                                                    <div className="m-metric">
                                                        <span className="m-label">SpO2</span>
                                                        <span className="m-value">{m.spo2 ? `${m.spo2}%` : '-'}</span>
                                                    </div>
                                                    <div className="m-metric">
                                                        <span className="m-label">Temp</span>
                                                        <span className="m-value">{m.temperature ? `${m.temperature}°C` : '-'}</span>
                                                    </div>
                                                </div>
                                                <button className="action-btn" style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}>
                                                    View Details
                                                </button>
                                            </div>
                                        ))
                                    );
                                })()}
                            </div>
                        )}
                    </motion.div>
                </>
            )}

            {/* Recommendation Modal */}
            {selectedMeasurement && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelectedMeasurement(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(15, 23, 42, 0.6)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 2000,
                        padding: '20px'
                    }}
                >
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '20px',
                            width: '100%',
                            maxWidth: '550px',
                            maxHeight: '85vh',
                            padding: '28px',
                            overflowY: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        <div className="modal-header">
                            <h2>Health Result Details</h2>
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

                            {!selectedMeasurement.recommendation?.medical_action && (
                                <div className="rec-section">
                                    <h4>General Guidance</h4>
                                    <p>
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

export default StudentDashboard;
