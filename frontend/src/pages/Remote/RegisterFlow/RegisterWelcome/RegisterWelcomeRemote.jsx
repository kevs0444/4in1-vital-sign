import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';

const RegisterWelcomeRemote = () => {
    const navigate = useNavigate();
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [showTermsModal, setShowTermsModal] = useState(false);

    return (
        <div style={{
            minHeight: '100dvh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', // Light gray gradient
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decorations - Red Theme */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-20%',
                width: '70vw',
                height: '70vw',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.02) 100%)',
                filter: 'blur(50px)',
                zIndex: 0
            }} />

            {/* Top Navigation */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                zIndex: 10
            }}>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        background: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 5px rgba(0,0,0,0.05)',
                        cursor: 'pointer',
                        color: '#334155'
                    }}
                >
                    <ArrowBack />
                </button>
            </div>

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '30px',
                zIndex: 1
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        width: '100%',
                        maxWidth: '360px',
                        textAlign: 'center'
                    }}
                >
                    {/* Illustration / Icon */}
                    <div style={{
                        width: '120px',
                        height: '120px',
                        margin: '0 auto 40px',
                        background: 'white',
                        borderRadius: '30px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 20px 40px -10px rgba(239, 68, 68, 0.2)',
                        transform: 'rotate(-5deg)'
                    }}>
                        <span style={{ fontSize: '3.5rem' }}>📝</span>
                    </div>

                    <h1 style={{
                        fontSize: '2rem',
                        fontWeight: '800',
                        color: '#1e293b',
                        marginBottom: '16px',
                        lineHeight: '1.2'
                    }}>
                        Create Account
                    </h1>

                    <p style={{
                        fontSize: '1rem',
                        color: '#64748b',
                        lineHeight: '1.6',
                        marginBottom: '30px'
                    }}>
                        Join the VitalSign community to track your health metrics and get personalized insights.
                    </p>

                    {/* Terms Checkbox */}
                    <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                        <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => setTermsAccepted(e.target.checked)}
                            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.9rem', color: '#475569' }}>
                            I agree to the <span
                                onClick={() => setShowTermsModal(true)}
                                style={{ color: '#ef4444', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline' }}
                            >
                                Terms and Conditions
                            </span>
                        </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={() => navigate('/register/role')}
                            disabled={!termsAccepted}
                            style={{
                                width: '100%',
                                padding: '18px',
                                background: termsAccepted
                                    ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
                                    : '#cbd5e1',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: termsAccepted ? 'pointer' : 'not-allowed',
                                boxShadow: termsAccepted ? '0 10px 20px -5px rgba(220, 38, 38, 0.4)' : 'none',
                                transition: 'all 0.2s',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px'
                            }}
                        >
                            Get Started
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M5 12h14"></path>
                                <path d="M12 5l7 7-7 7"></path>
                            </svg>
                        </button>

                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#64748b',
                                fontSize: '0.95rem',
                                fontWeight: '600',
                                padding: '10px',
                                cursor: 'pointer'
                            }}
                        >
                            I already have an account
                        </button>
                    </div>
                </motion.div>
            </div>
            {/* Terms and Conditions Modal */}
            <AnimatePresence>
                {showTermsModal && (
                    <div
                        style={{
                            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                            background: 'rgba(0,0,0,0.5)', zIndex: 100,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
                        }}
                        onClick={() => setShowTermsModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'white',
                                width: '100%',
                                maxWidth: '500px',
                                maxHeight: '80vh',
                                borderRadius: '24px',
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '12px',
                                    background: '#fef2f2', color: '#ef4444',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem'
                                }}>
                                    📋
                                </div>
                                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1e293b', margin: 0 }}>
                                    Terms & Conditions
                                </h2>
                            </div>

                            {/* Scrollable Content */}
                            <div style={{ padding: '24px', overflowY: 'auto', flex: 1, color: '#475569', fontSize: '0.95rem', lineHeight: '1.6' }}>
                                <p><strong>Last Updated: {new Date().toLocaleDateString()}</strong></p>

                                <h4 style={{ color: '#1e293b', marginTop: '16px', marginBottom: '8px' }}>1. Acceptance of Terms</h4>
                                <p>By registering for the 4 in Juan Vital Sign System, you agree to these terms. If you do not agree, please do not proceed.</p>

                                <h4 style={{ color: '#1e293b', marginTop: '16px', marginBottom: '8px' }}>2. Data Collection</h4>
                                <p>We collect personal details (name, age, sex) and health metrics (BP, BMI, etc.) to create your health profile.</p>

                                <h4 style={{ color: '#1e293b', marginTop: '16px', marginBottom: '8px' }}>3. Privacy & Security</h4>
                                <p>Your data is securely stored and used only for health monitoring. We do not share it with third parties without consent.</p>

                                <h4 style={{ color: '#1e293b', marginTop: '16px', marginBottom: '8px' }}>4. Medical Disclaimer</h4>
                                <p>This system provides health screenings, not medical diagnoses. Always consult a professional for medical advice.</p>

                                <div style={{ marginTop: '24px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                                    <p style={{ margin: 0, fontSize: '0.85rem', fontWeight: '600' }}>
                                        By clicking "I Agree", you consent to the collection and processing of your personal and health information.
                                    </p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div style={{ padding: '20px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowTermsModal(false)}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                                        background: '#f1f5f9', color: '#475569', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    Close
                                </button>
                                <button
                                    onClick={() => {
                                        setTermsAccepted(true);
                                        setShowTermsModal(false);
                                    }}
                                    style={{
                                        flex: 1, padding: '14px', borderRadius: '12px', border: 'none',
                                        background: '#ef4444', color: 'white', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    I Agree
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};
export default RegisterWelcomeRemote;
