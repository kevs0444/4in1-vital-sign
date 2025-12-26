import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const RegisterDataSavedRemote = () => {
    const navigate = useNavigate();

    useEffect(() => {
        // Automatically redirect to login after 3 seconds
        const timer = setTimeout(() => {
            navigate('/login');
        }, 3000);

        return () => clearTimeout(timer);
    }, [navigate]);

    return (
        <div style={{
            height: '100dvh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Decoration */}
            <div style={{
                position: 'absolute',
                top: '-10%',
                right: '-10%',
                width: '60vw',
                height: '60vw',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.05) 100%)', // Green for success
                filter: 'blur(50px)',
                zIndex: 0
            }} />

            <div style={{ zIndex: 1, padding: '30px', textAlign: 'center' }}>
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    style={{
                        width: '100px',
                        height: '100px',
                        background: 'white',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 20px 40px -10px rgba(34, 197, 94, 0.3)',
                        margin: '0 auto 30px'
                    }}
                >
                    <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                </motion.div>

                <motion.h1
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        fontSize: '1.75rem',
                        fontWeight: '800',
                        color: '#1e293b',
                        marginBottom: '12px'
                    }}
                >
                    Registration Complete!
                </motion.h1>

                <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    style={{
                        fontSize: '1rem',
                        color: '#64748b',
                        maxWidth: '280px',
                        margin: '0 auto'
                    }}
                >
                    Your account has been successfully created. You can now log in.
                </motion.p>

                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    onClick={() => navigate('/login')}
                    style={{
                        marginTop: '40px',
                        padding: '12px 24px',
                        background: 'white',
                        border: '2px solid #e2e8f0',
                        borderRadius: '16px',
                        fontSize: '0.95rem',
                        fontWeight: '600',
                        color: '#334155',
                        cursor: 'pointer'
                    }}
                >
                    Go to Login
                </motion.button>
            </div>
        </div>
    );
};

export default RegisterDataSavedRemote;
