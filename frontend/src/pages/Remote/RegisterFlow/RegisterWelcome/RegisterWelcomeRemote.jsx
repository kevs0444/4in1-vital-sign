import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';

const RegisterWelcomeRemote = () => {
    const navigate = useNavigate();

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
                        marginBottom: '40px'
                    }}>
                        Join the VitalSign community to track your health metrics and get personalized insights.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <button
                            onClick={() => navigate('/register/role')}
                            style={{
                                width: '100%',
                                padding: '18px',
                                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '20px',
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                boxShadow: '0 10px 20px -5px rgba(220, 38, 38, 0.4)',
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
        </div>
    );
};

export default RegisterWelcomeRemote;
