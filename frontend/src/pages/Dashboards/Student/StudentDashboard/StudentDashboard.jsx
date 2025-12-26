import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logout, Person, Visibility } from '@mui/icons-material';
import './StudentDashboard.css';
import { getMeasurementHistory } from '../../../../utils/api';

const StudentDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);

    useEffect(() => {
        // Authenticate
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login');
            return;
        }

        // Fetch History
        const fetchData = async () => {
            try {
                setLoading(true);
                // Try to get user ID from savedUser object (might be userId or user_id or id)
                const userId = savedUser.userId || savedUser.user_id || savedUser.id;

                if (userId) {
                    const response = await getMeasurementHistory(userId);
                    if (response.success) {
                        setHistory(response.history || []);
                    }
                }
            } catch (error) {
                console.error("Failed to fetch history:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [navigate, location]);

    // Filtering & Sorting State
    const [filterType, setFilterType] = useState('all'); // 'all', 'today', 'week', 'month'
    const [sortOrder, setSortOrder] = useState('desc'); // 'desc', 'asc'
    const [metricFilter, setMetricFilter] = useState(['all']); // Array for multi-select
    const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
    const [riskFilter, setRiskFilter] = useState(['all']); // Array for multi-select
    const [isRiskDropdownOpen, setIsRiskDropdownOpen] = useState(false);

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


    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper to get recommendation text (mocked if not in API history response yet)
    // Assuming backend might not return full recommendations in listing, but let's assume it does or we mock it.
    // The history endpoint logic in backend (Step 737) returns:
    // id, created_at, temperature, systolic, diastolic, heart_rate, spo2, weight, bmi, risk_category
    // It DOES NOT return recommendation text.
    // So "View Recommendation" might need to fetch individual measurement or we rely on Risk Category for now.
    // I will show Risk Category details.

    return (
        <div className="dashboard-container">
            {/* Header */}
            <header className="dashboard-header">
                <div className="header-brand">
                    <div className="header-brand-icon">
                        <Person />
                    </div>
                    <div className="header-title">
                        <h1>My Health Portal</h1>
                        <p className="header-subtitle">Student Dashboard</p>
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
                        <h3>Measurement History</h3>
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
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value)}
                                style={{ padding: '8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                            >
                                <option value="desc">Newest First</option>
                                <option value="asc">Oldest First</option>
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
                        </div>
                    </div>
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
                                    const processedHistory = processHistory(history);
                                    return loading ? (
                                        <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</td></tr>
                                    ) : processedHistory.length === 0 ? (
                                        <tr><td colSpan="11" style={{ textAlign: 'center', padding: '2rem' }}>No measurements found. Visit a Kiosk to get started!</td></tr>
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
                </motion.div>

            </div>

            {/* Recommendation Modal */}
            {
                selectedMeasurement && (
                    <div className="modal-overlay" onClick={() => setSelectedMeasurement(null)}>
                        <motion.div
                            className="modal-content"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            onClick={(e) => e.stopPropagation()}
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
                )
            }
        </div >
    );
};

export default StudentDashboard;
