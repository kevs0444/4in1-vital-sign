import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import logo from '../../../assets/images/juan.png';

const StandbyRemote = () => {
    const navigate = useNavigate();

    return (
        <div style={{
            height: '100dvh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decoration - Red Theme */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '50vw',
                height: '50vw',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)',
                filter: 'blur(40px)',
                zIndex: 0
            }} />
            <div style={{
                position: 'absolute',
                bottom: '-10%',
                left: '-10%',
                width: '60vw',
                height: '60vw',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(185, 28, 28, 0.02) 100%)',
                filter: 'blur(40px)',
                zIndex: 0
            }} />

            {/* Content */}
            <div style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '24px',
                zIndex: 1
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    style={{ textAlign: 'center', marginBottom: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
                >
                    <div style={{
                        width: '100px',
                        height: '100px',
                        background: 'white',
                        borderRadius: '24px',
                        boxShadow: '0 10px 30px -5px rgba(220, 38, 38, 0.2)', // Red shadow
                        padding: '16px',
                        marginBottom: '24px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img src={logo} alt="VitalSign Logo" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />
                    </div>

                    <h1 style={{
                        fontSize: '2.5rem',
                        fontWeight: '800',
                        background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        margin: '0 0 12px 0',
                        letterSpacing: '-1px'
                    }}>
                        VitalSign
                    </h1>
                    <p style={{
                        fontSize: '1.1rem',
                        color: '#64748b',
                        margin: 0,
                        lineHeight: 1.5,
                        maxWidth: '280px',
                        marginLeft: 'auto',
                        marginRight: 'auto'
                    }}>
                        Your personal health companion on the go.
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '16px' }}
                >
                    <button
                        onClick={() => navigate('/login')}
                        style={{
                            width: '100%',
                            padding: '18px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: 'white',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Red gradient
                            border: 'none',
                            borderRadius: '20px',
                            boxShadow: '0 10px 25px -5px rgba(239, 68, 68, 0.4)',
                            cursor: 'pointer',
                            transition: 'transform 0.2s ease',
                        }}
                    >
                        Log In
                    </button>

                    <button
                        onClick={() => navigate('/register/welcome')}
                        style={{
                            width: '100%',
                            padding: '18px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            color: '#334155',
                            background: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '20px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            cursor: 'pointer'
                        }}
                    >
                        Sign Up
                    </button>
                </motion.div>
            </div>

            <div style={{
                padding: '20px',
                textAlign: 'center',
                zIndex: 1
            }}>
                <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: 0 }}>
                    v1.0.0 • RTU 4-in-Juan
                </p>
            </div>
        </div>
    );
};

export default StandbyRemote;
