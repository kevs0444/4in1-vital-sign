import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    getBloodPressureStatus,
    getHeartRateStatus,
    getSPO2Status,
    getTemperatureStatus,
    getBMICategory,
    getRespiratoryStatus
} from '../../utils/healthStatus';

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

// Metric cell with status label
const MetricCell = ({ label, value, statusObj }) => (
    <div>
        <strong style={{ color: '#64748b', fontSize: '0.9rem', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>{label}</strong>
        <span style={{ color: statusObj?.color || '#1e293b', fontWeight: 600 }}>{value || 'N/A'}</span>
        {statusObj && statusObj.label !== 'Not Measured' && statusObj.label !== 'Invalid' && (
            <span style={{
                display: 'block',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: statusObj.color,
                marginTop: '2px',
                opacity: 0.85
            }}>
                {statusObj.label}
            </span>
        )}
    </div>
);

const MeasurementDetailsModal = ({ measurement, onClose, user }) => {
    if (!measurement) return null;

    const m = measurement;
    const bpStatus = getBloodPressureStatus(m.systolic, m.diastolic);
    const hrStatus = getHeartRateStatus(m.heart_rate);
    const spo2Status = getSPO2Status(m.spo2);
    const tempStatus = getTemperatureStatus(m.temperature);
    const bmiStatus = getBMICategory(m.bmi);
    const rrStatus = getRespiratoryStatus(m.respiratory_rate);

    // Age & Gender from user prop or measurement data
    const age = m.age || user?.age;
    const gender = m.sex || user?.sex;

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
                    {/* Vitals Grid - 2 columns with status labels */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                        <MetricCell label="Date" value={formatDate(m.created_at)} />
                        <MetricCell
                            label="BP"
                            value={m.systolic ? `${m.systolic}/${m.diastolic}` : null}
                            statusObj={m.systolic > 0 ? bpStatus : null}
                        />
                        <MetricCell
                            label="Heart Rate"
                            value={m.heart_rate ? `${m.heart_rate} bpm` : null}
                            statusObj={m.heart_rate > 0 ? hrStatus : null}
                        />
                        <MetricCell
                            label="SpO2"
                            value={m.spo2 ? `${m.spo2}%` : null}
                            statusObj={m.spo2 > 0 ? spo2Status : null}
                        />
                        <MetricCell
                            label="RR"
                            value={m.respiratory_rate ? `${m.respiratory_rate} bpm` : null}
                            statusObj={m.respiratory_rate > 0 ? rrStatus : null}
                        />
                        <MetricCell
                            label="Temp"
                            value={m.temperature ? `${m.temperature}\u00b0C` : null}
                            statusObj={m.temperature > 0 ? tempStatus : null}
                        />
                        <MetricCell
                            label="BMI"
                            value={m.bmi && Number(m.bmi) > 0 ? Number(m.bmi).toFixed(1) : null}
                            statusObj={m.bmi > 0 ? bmiStatus : null}
                        />
                        <MetricCell label="Age" value={age ? `${age} yrs` : 'N/A'} />
                        <MetricCell label="Gender" value={gender || 'N/A'} />
                        {m.weight > 0 && (
                            <MetricCell label="Weight" value={`${m.weight} kg`} />
                        )}
                        {m.height > 0 && (
                            <MetricCell label="Height" value={`${m.height} cm`} />
                        )}
                    </div>

                    <h3 style={{ fontSize: '1.1rem', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                        AI Analysis & Recommendations
                    </h3>

                    <div className="rec-section" style={{ marginBottom: '20px' }}>
                        <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase', marginBottom: '6px' }}>Risk Status</div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px' }}>
                            <p style={{ fontWeight: 'bold', margin: 0, color: getRiskColor(m.risk_category), fontSize: '1.1rem' }}>
                                {m.risk_category || 'Unknown'}
                            </p>
                            {m.risk_score && (
                                <span style={{ fontSize: '0.85rem', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '6px', fontWeight: 600 }}>
                                    Score: {m.risk_score.toFixed(1)}%
                                </span>
                            )}
                        </div>
                    </div>

                    {m.recommendation?.medical_action && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#ef4444', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444' }}></span> Suggested Action
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{m.recommendation.medical_action}</p>
                        </div>
                    )}

                    {m.recommendation?.preventive_strategy && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#f59e0b', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }}></span> Strategy
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{m.recommendation.preventive_strategy}</p>
                        </div>
                    )}

                    {m.recommendation?.wellness_tips && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#10b981', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span> Wellness Tip
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{m.recommendation.wellness_tips}</p>
                        </div>
                    )}

                    {m.recommendation?.provider_guidance && (
                        <div className="rec-section" style={{ marginBottom: '16px' }}>
                            <h4 style={{ fontSize: '0.95rem', color: '#3b82f6', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6' }}></span> Provider Guidance
                            </h4>
                            <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: '1.5', color: '#334155' }}>{m.recommendation.provider_guidance}</p>
                        </div>
                    )}

                    {!m.recommendation && (
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
