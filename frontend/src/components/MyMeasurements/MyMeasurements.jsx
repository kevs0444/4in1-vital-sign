import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GridView, TableRows } from '@mui/icons-material';
import './MyMeasurements.css';
import { TimePeriodFilter, filterHistoryByTimePeriod, MultiSelectDropdown } from '../DashboardAnalytics/DashboardAnalytics';
import ExportButton from '../ExportButton/ExportButton';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import NoDataFound from '../NoDataFound/NoDataFound';

const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    });
};

const MyMeasurements = ({ history, loading, onSelectMeasurement }) => {
    // State management for filters and view
    const [timePeriod, setTimePeriod] = useState('weekly');
    const [customDateRange, setCustomDateRange] = useState(null);
    const [metricFilter, setMetricFilter] = useState(['all']);
    const [riskFilter, setRiskFilter] = useState(['all']);
    const [sortOrder, setSortOrder] = useState('desc');

    // View Mode: Default to Card for Screens <= 768px (Kiosk/Mobile)
    const [viewMode, setViewMode] = useState(window.innerWidth <= 768 ? 'card' : 'table');

    // Handle Window Resize for View Mode
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setViewMode('card');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Time Filtering
    const timeFilteredHistory = useMemo(() => {
        return filterHistoryByTimePeriod(history, timePeriod, customDateRange);
    }, [history, timePeriod, customDateRange]);

    // Metric, Risk Filtering & Sorting
    const processedHistory = useMemo(() => {
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

    const toggleMetric = (metric) => {
        if (metric === 'all') {
            setMetricFilter(['all']);
        } else {
            if (metricFilter.includes('all')) {
                setMetricFilter([metric]);
            } else {
                if (metricFilter.includes(metric)) {
                    const next = metricFilter.filter(m => m !== metric);
                    setMetricFilter(next.length ? next : ['all']);
                } else {
                    setMetricFilter([...metricFilter, metric]);
                }
            }
        }
    };

    const toggleRisk = (risk) => {
        if (risk === 'all') {
            setRiskFilter(['all']);
        } else {
            if (riskFilter.includes('all')) {
                setRiskFilter([risk]);
            } else {
                if (riskFilter.includes(risk)) {
                    const next = riskFilter.filter(r => r !== risk);
                    setRiskFilter(next.length ? next : ['all']);
                } else {
                    setRiskFilter([...riskFilter, risk]);
                }
            }
        }
    };

    const handleExportHistory = (type) => {
        if (!processedHistory || processedHistory.length === 0) return;
        const filename = `my_measurements_${type}_${new Date().toISOString().slice(0, 10)}`;
        if (type === 'csv') exportToCSV(processedHistory, filename);
        else if (type === 'excel') exportToExcel(processedHistory, filename);
        else if (type === 'pdf') exportToPDF(processedHistory, filename);
    };

    const getRiskClass = (category) => {
        if (!category) return '';
        const lower = category.toLowerCase();
        if (lower.includes('normal')) return 'mm-risk-normal';
        if (lower.includes('elevated')) return 'mm-risk-elevated';
        if (lower.includes('high')) return 'mm-risk-high';
        if (lower.includes('critical')) return 'mm-risk-critical';
        return 'mm-risk-high';
    };

    // Kiosk/Localhost check for View Toggle logic (only hide button, logic stays same)
    const showViewToggle = !(window.innerWidth <= 768 && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'));

    return (
        <motion.div
            className="mm-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: '400px', // Standard min-height
                height: '100%' // Fill parent
            }}
        >
            {/* Header / Controls (Unified Structure like PatientList) */}
            <div className="mm-table-header">
                <h3>My Measurements ({processedHistory.length} records)</h3>

                <div className="mm-controls-wrapper">
                    {/* No Search Bar here, but we have filters */}

                    <div className="mm-kiosk-scroll-container">
                        <TimePeriodFilter
                            timePeriod={timePeriod}
                            setTimePeriod={setTimePeriod}
                            customDateRange={customDateRange}
                            setCustomDateRange={setCustomDateRange}
                            variant="dropdown"
                            compact={window.innerWidth <= 768}
                            style={window.innerWidth <= 768 ? { flex: 1, minWidth: 0 } : {}}
                        />

                        {/* Metric/Risk Filters (Flattened for Kiosk space maximization) */}
                        <MultiSelectDropdown
                            label="Metrics"
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
                            compact={window.innerWidth <= 768}
                            style={window.innerWidth <= 768 ? { flex: 1, minWidth: 0 } : {}}
                        />
                        <MultiSelectDropdown
                            label="Risks"
                            selectedItems={riskFilter}
                            options={[
                                { id: 'all', label: 'All Risks' },
                                { id: 'low', label: 'Low Risk', color: '#10b981' }, // Green
                                { id: 'moderate', label: 'Moderate Risk', color: '#f59e0b' }, // Orange
                                { id: 'high', label: 'High Risk', color: '#ef4444' }, // Red
                                { id: 'critical', label: 'Critical Risk', color: '#991b1b' } // Dark Red
                            ]}
                            onToggle={toggleRisk}
                            allLabel="All Risks"
                            compact={window.innerWidth <= 768}
                            style={window.innerWidth <= 768 ? { flex: 1, minWidth: 0 } : {}}
                        />

                        <MultiSelectDropdown
                            label="Sort"
                            selectedItems={[sortOrder]}
                            options={[
                                { id: 'desc', label: 'Newest First' },
                                { id: 'asc', label: 'Oldest First' }
                            ]}
                            onToggle={(val) => setSortOrder(val)}
                            singleSelect={true}
                            minWidth="140px"
                            compact={window.innerWidth <= 768}
                            style={window.innerWidth <= 768 ? { flex: 1, minWidth: 0 } : {}}
                        />

                        {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                            <ExportButton
                                onExportCSV={() => handleExportHistory('csv')}
                                onExportExcel={() => handleExportHistory('excel')}
                                onExportPDF={() => handleExportHistory('pdf')}
                            />
                        )}

                        {/* View Toggle */}
                        {showViewToggle && (
                            <div className="mm-view-mode-toggle">
                                <button
                                    onClick={() => {
                                        if (window.innerWidth > 768) setViewMode('table');
                                    }}
                                    style={{
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
                                        background: viewMode === 'card' ? '#dc2626' : 'transparent',
                                        color: viewMode === 'card' ? 'white' : '#64748b',
                                    }}
                                >
                                    <GridView />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* --- CONTENT (Table / Card) --- */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {viewMode === 'table' ? (
                    <div className="mm-table-container-wrapper">
                        <table className="mm-history-table">
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Metrics</th>
                                    <th>Risk Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="4" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                                ) : processedHistory.length === 0 ? (
                                    <tr><td colSpan="4"><NoDataFound type="measurements" /></td></tr>
                                ) : (
                                    processedHistory.map(m => (
                                        <tr key={m.id}>
                                            <td>{formatDate(m.created_at)}</td>
                                            <td>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                                    {m.systolic > 0 && <span className="mm-metric-tag">BP: {m.systolic}/{m.diastolic}</span>}
                                                    {m.heart_rate > 0 && <span className="mm-metric-tag">HR: {m.heart_rate}</span>}
                                                    {m.temperature > 0 && <span className="mm-metric-tag">Temp: {m.temperature}°C</span>}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`mm-risk-badge ${getRiskClass(m.risk_category)}`}>
                                                    {m.risk_category || 'Unknown'}
                                                </span>
                                            </td>
                                            <td>
                                                <button className="mm-action-btn" onClick={() => onSelectMeasurement(m)}>
                                                    View Details
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="mm-measurement-cards-grid">
                        {loading ? (
                            <div style={{ padding: '2rem', textAlign: 'center', gridColumn: '1/-1' }}>Loading...</div>
                        ) : processedHistory.length === 0 ? (
                            <div style={{ gridColumn: '1/-1' }}><NoDataFound type="measurements" /></div>
                        ) : (
                            processedHistory.map(m => (
                                <div className="mm-measurement-card" key={m.id} onClick={() => onSelectMeasurement(m)}>
                                    <div className="mm-card-header">
                                        <div className="mm-card-date">{formatDate(m.created_at)}</div>
                                        <span className={`mm-risk-badge ${getRiskClass(m.risk_category)}`}>
                                            {m.risk_category || 'Unknown'}
                                        </span>
                                    </div>
                                    <div className="mm-card-grid">
                                        <div className="mm-metric">
                                            <span className="mm-label">BP (mmHg)</span>
                                            <span className="mm-value">{m.systolic ? `${m.systolic}/${m.diastolic}` : '-'}</span>
                                        </div>
                                        <div className="mm-metric">
                                            <span className="mm-label">Heart Rate</span>
                                            <span className="mm-value">{m.heart_rate ? `${m.heart_rate} bpm` : '-'}</span>
                                        </div>
                                        <div className="mm-metric">
                                            <span className="mm-label">SpO2</span>
                                            <span className="mm-value">{m.spo2 ? `${m.spo2}%` : '-'}</span>
                                        </div>
                                        <div className="mm-metric">
                                            <span className="mm-label">Temp</span>
                                            <span className="mm-value">{m.temperature ? `${m.temperature}°C` : '-'}</span>
                                        </div>
                                    </div>
                                    <button className="mm-action-btn" style={{ marginTop: '12px', width: '100%', justifyContent: 'center' }}>
                                        View Details
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
};

export default MyMeasurements;
