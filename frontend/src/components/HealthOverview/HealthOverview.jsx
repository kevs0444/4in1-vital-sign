import React from 'react';
import { motion } from 'framer-motion';
import DashboardAnalytics from '../DashboardAnalytics/DashboardAnalytics';

// Helper to get risk color (duplicated logic, could be shared utility but kept here for self-containment or imported)
const getRiskColor = (risk) => {
    if (!risk) return '#64748b';
    const r = risk.toLowerCase();
    if (r.includes('critical') || r.includes('high')) return '#ef4444';
    if (r.includes('moderate') || r.includes('elevated')) return '#f59e0b';
    if (r.includes('normal') || r.includes('ideal') || r.includes('healthy')) return '#10b981';
    return '#64748b';
};

const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const HealthOverview = ({
    user,
    history = [],
    timePeriod,
    customDateRange,
    populationAverages
}) => {
    // Calculate latest measurement for summary cards
    // Assuming history is sorted descending? Or we sort it.
    // If not sorted, we should find max date. 
    // Usually history passed is full list.
    const sortedHistory = [...history].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const latestMeasurement = sortedHistory.length > 0 ? sortedHistory[0] : null;

    return (
        <div className="health-overview-container">
            {/* Summary Cards */}
            <motion.div
                className="summary-cards"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
                    gap: '20px',
                    marginBottom: '30px'
                }}
            >
                <div className="summary-card highlight" style={{
                    background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
                    borderRadius: '16px',
                    padding: '24px',
                    color: 'white',
                    boxShadow: '0 10px 25px -5px rgba(220, 38, 38, 0.4)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', opacity: 0.9, fontWeight: 500 }}>Total Checkups</h3>
                    <div className="summary-value" style={{ fontSize: '2.5rem', fontWeight: 700, margin: '10px 0' }}>{history.length}</div>
                    <div className="summary-label" style={{ fontSize: '0.9rem', opacity: 0.8 }}>Measurements Taken</div>
                </div>

                <div className="summary-card" style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '24px',
                    border: '1px solid #e2e8f0',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                }}>
                    <h3 style={{ margin: '0 0 10px 0', fontSize: '1.1rem', color: '#64748b', fontWeight: 500 }}>Latest Status</h3>
                    <div className="summary-value" style={{
                        fontSize: '1.8rem',
                        fontWeight: 700,
                        margin: '10px 0',
                        color: latestMeasurement ? getRiskColor(latestMeasurement.risk_category) : '#64748b'
                    }}>
                        {latestMeasurement ? (latestMeasurement.risk_category || 'N/A') : 'No Data'}
                    </div>
                    <div className="summary-label" style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                        {latestMeasurement ? formatDate(latestMeasurement.created_at) : '-'}
                    </div>
                </div>
            </motion.div>

            {/* Analytics Charts */}
            <DashboardAnalytics
                user={user}
                history={history}
                timePeriod={timePeriod}
                customDateRange={customDateRange}
                populationAverages={populationAverages}
            />
        </div>
    );
};

export default HealthOverview;
