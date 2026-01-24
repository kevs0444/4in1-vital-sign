import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Helper for date formatting
const formatDate = (isoString) => {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

// Helper for risk color
const getRiskColor = (category) => {
    if (!category) return '#64748b';
    const lower = category.toLowerCase();
    if (lower.includes('normal') || lower.includes('ideal') || lower.includes('healthy')) return '#166534';
    if (lower.includes('elevated') || lower.includes('moderate')) return '#ca8a04';
    if (lower.includes('high')) return '#dc2626';
    if (lower.includes('critical')) return '#7f1d1d';
    return '#64748b';
};

const MeasurementDetailsModal = ({ measurement, onClose }) => {
    if (!measurement) return null;

    return (
        <div
            className="modal-overlay"
            onClick={onClose}
            style={{
                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                background: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 2000, padding: '20px'
            }}
        >
            <motion.div
                className="modal-content"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
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
                <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>Health Result Details</h2>
                    <button className="close-btn" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.8rem', cursor: 'pointer', color: '#94a3b8', padding: '0', display: 'flex', lineHeight: 1 }}>&times;</button>
                </div>

                <div style={{ marginBottom: '24px', maxHeight: '60vh', overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <div><strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Date</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{formatDate(measurement.created_at)}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>BP</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{measurement.systolic ? `${measurement.systolic}/${measurement.diastolic}` : 'N/A'}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Heart Rate</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{measurement.heart_rate ? `${measurement.heart_rate} bpm` : 'N/A'}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>SpO2</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{measurement.spo2 ? `${measurement.spo2}%` : 'N/A'}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Temp</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{measurement.temperature ? `${measurement.temperature}°C` : 'N/A'}</span></div>
                        <div><strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>BMI</strong> <span style={{ color: '#1e293b', fontWeight: 600 }}>{measurement.bmi && Number(measurement.bmi) > 0 ? Number(measurement.bmi).toFixed(1) : 'N/A'}</span></div>
                    </div>

                    <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                        AI Analysis & Recommendations
                    </h3>

                    <div className="rec-section" style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Risk Status</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                            <p style={{ fontWeight: 'bold', margin: 0, color: getRiskColor(measurement.risk_category), fontSize: '1.1rem' }}>
                                {measurement.risk_category || 'Unknown'}
                            </p>
                            {measurement.risk_score && (
                                <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                                    Score: {measurement.risk_score.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>

                    {measurement.recommendation?.medical_action && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span> Suggested Action
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{measurement.recommendation.medical_action}</p>
                        </div>
                    )}

                    {measurement.recommendation?.preventive_strategy && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#f59e0b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span> Strategy
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{measurement.recommendation.preventive_strategy}</p>
                        </div>
                    )}

                    {measurement.recommendation?.wellness_tips && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> Wellness Tip
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{measurement.recommendation.wellness_tips}</p>
                        </div>
                    )}

                    {measurement.recommendation?.provider_guidance && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#3b82f6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span> Provider Guidance
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{measurement.recommendation.provider_guidance}</p>
                        </div>
                    )}

                    {!measurement.recommendation && (
                        <div className="rec-section" style={{ padding: '16px', background: '#f8fafc', borderRadius: '8px', color: '#64748b', fontSize: '0.95rem', fontStyle: 'italic', textAlign: 'center' }}>
                            No specific AI recommendations available for this record.
                        </div>
                    )}
                </div>

                <button
                    onClick={onClose}
                    style={{ width: '100%', padding: '14px', background: '#f1f5f9', border: 'none', borderRadius: '12px', cursor: 'pointer', fontWeight: '700', color: '#475569', fontSize: '1rem', transition: 'background 0.2s', letterSpacing: '0.02em' }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0'; e.currentTarget.style.color = '#1e293b' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#475569' }}
                >
                    Close
                </button>
            </motion.div>
        </div>
    );
};

export default MeasurementDetailsModal;
