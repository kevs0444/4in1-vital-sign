import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Logout, Person, Visibility } from '@mui/icons-material';
import './EmployeeDashboard.css';
import { getMeasurementHistory } from '../../../../utils/api';

const EmployeeDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [user, setUser] = useState(null);
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
        setUser(savedUser);

        // Fetch History
        const fetchData = async () => {
            try {
                setLoading(true);
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
                        <p className="header-subtitle">Employee Dashboard</p>
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
                        <div className="summary-value" style={{ fontSize: '1.5rem', color: '#a855f7' }}>
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
                    </div>
                    <div className="table-container-wrapper">
                        <table className="history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>BP (mmHg)</th>
                                    <th>HR (bpm)</th>
                                    <th>SpO2 (%)</th>
                                    <th>Temp (°C)</th>
                                    <th>BMI</th>
                                    <th>Risk Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>Loading history...</td></tr>
                                ) : history.length === 0 ? (
                                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '2rem' }}>No measurements found. Visit a Kiosk to get started!</td></tr>
                                ) : (
                                    history.map((m) => (
                                        <tr key={m.id}>
                                            <td>{formatDate(m.created_at)}</td>
                                            <td>{m.systolic}/{m.diastolic}</td>
                                            <td>{m.heart_rate}</td>
                                            <td>{m.spo2}%</td>
                                            <td>{m.temperature}°C</td>
                                            <td>{Number(m.bmi).toFixed(1)}</td>
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
                                )}
                            </tbody>
                        </table>
                    </div>
                </motion.div>
            </div>

            {/* Recommendation Modal */}
            {selectedMeasurement && (
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

                        <div style={{ marginBottom: '24px' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                                <div><strong>Date:</strong> {formatDate(selectedMeasurement.created_at)}</div>
                                <div><strong>BP:</strong> {selectedMeasurement.systolic}/{selectedMeasurement.diastolic}</div>
                                <div><strong>Heart Rate:</strong> {selectedMeasurement.heart_rate} bpm</div>
                                <div><strong>SpO2:</strong> {selectedMeasurement.spo2}%</div>
                            </div>

                            <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                                AI Analysis & Recommendations
                            </h3>

                            <div className="rec-section" style={{ marginTop: '16px' }}>
                                <h4>Risk Category</h4>
                                <p style={{ fontWeight: 'bold', color: selectedMeasurement.risk_category?.includes('High') ? '#ef4444' : '#059669' }}>
                                    {selectedMeasurement.risk_category}
                                </p>
                            </div>

                            <div className="rec-section">
                                <h4>General Guidance</h4>
                                <p>
                                    {selectedMeasurement.risk_category === 'Normal'
                                        ? "Great job! Your vital signs are within the normal range. Keep avoiding stress and maintain a healthy lifestyle."
                                        : "Your vital signs show some deviations. Please consult with the school nurse or a doctor for a more detailed checkup."}
                                </p>
                            </div>
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
        </div>
    );
};

export default EmployeeDashboard;
