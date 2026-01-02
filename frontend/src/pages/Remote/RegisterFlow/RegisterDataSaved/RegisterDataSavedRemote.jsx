import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

// Helper function to call the backend API
const registerUser = async (userData) => {
    try {
        console.log('📤 [Remote] Sending registration data to backend:', userData);

        // Use relative path for remote/proxy
        const response = await fetch('/api/register/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });

        if (!response.ok) {
            const errorText = await response.text();
            try {
                const errorJson = JSON.parse(errorText);
                throw new Error(errorJson.message || `HTTP error! status: ${response.status}`);
            } catch (e) {
                throw new Error(errorText || `HTTP error! status: ${response.status}`);
            }
        }

        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Registration failed');

        return result;
    } catch (error) {
        console.error('❌ [Remote] Registration API error:', error);
        throw error;
    }
};

const RegisterDataSavedRemote = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // State
    const [registrationStatus, setRegistrationStatus] = useState('saving'); // saving, success, error
    const [errorMessage, setErrorMessage] = useState('');
    const [generatedUserId, setGeneratedUserId] = useState('');

    const registrationData = React.useMemo(() => location.state || {}, [location.state]);
    const hasSavedRef = useRef(false);

    // Map User Types
    const mapUserTypeToRole = (userType) => {
        const roleMap = {
            "rtu-students": "Student", "student": "Student",
            "rtu-employees": "Employee", "employee": "Employee",
            "nurse": "Nurse", "doctor": "Doctor"
        };
        return roleMap[userType] || "Student";
    };

    // Generate ID
    const generateUserId = () => {
        const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `USR-${timestamp}-${randomPart}`;
    };

    // Save Logic
    useEffect(() => {
        const saveToDatabase = async () => {
            // Prevent double-save
            if (hasSavedRef.current) return;
            hasSavedRef.current = true;

            if (!registrationData.personalInfo || !registrationData.idNumber) {
                setRegistrationStatus('error');
                setErrorMessage('Incomplete registration data. Please restart.');
                return;
            }

            try {
                const newUserId = generateUserId();
                setGeneratedUserId(newUserId);

                const userData = {
                    userId: newUserId,
                    rfidTag: registrationData.rfidCode || null, // Might be null or 'smart' scanned
                    firstname: registrationData.personalInfo.firstName || '',
                    middlename: registrationData.personalInfo.middleName || '',
                    lastname: registrationData.personalInfo.lastName || '',
                    suffix: registrationData.personalInfo.suffix || '',
                    role: mapUserTypeToRole(registrationData.userType),
                    school_number: registrationData.idNumber,
                    age: parseInt(registrationData.personalInfo.age) || 0,
                    sex: registrationData.personalInfo.sex || 'Male',
                    birthday: `${registrationData.personalInfo.birthYear}-${String(registrationData.personalInfo.birthMonth).padStart(2, '0')}-${String(registrationData.personalInfo.birthDay).padStart(2, '0')}`,
                    email: registrationData.email || '',
                    password: registrationData.password || '123456',
                    created_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                };

                await registerUser(userData);

                setRegistrationStatus('success');

                // Auto redirect after success
                setTimeout(() => navigate('/login'), 3000);

            } catch (error) {
                setRegistrationStatus('error');
                setErrorMessage(error.message || "Registration failed.");
                hasSavedRef.current = false; // Allow retry if needed
            }
        };

        saveToDatabase();
    }, [registrationData, navigate]);

    return (
        <div style={{
            height: '100dvh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '24px'
        }}>
            <AnimatePresence mode="wait">
                {registrationStatus === 'saving' && (
                    <motion.div
                        key="saving"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                        <div style={{
                            width: '60px', height: '60px',
                            border: '4px solid #cbd5e1',
                            borderTopColor: '#ef4444',
                            borderRadius: '50%',
                            margin: '0 auto 24px',
                            animation: 'spin 1s linear infinite'
                        }} />
                        <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: '700' }}>
                            Creating Account...
                        </h2>
                        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                    </motion.div>
                )}

                {registrationStatus === 'success' && (
                    <motion.div
                        key="success"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div style={{
                            width: '80px', height: '80px',
                            background: '#dcfce7',
                            color: '#16a34a',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px',
                            boxShadow: '0 10px 25px -5px rgba(22, 163, 74, 0.3)'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <h2 style={{ color: '#1e293b', fontSize: '1.75rem', fontWeight: '800', marginBottom: '12px' }}>
                            Welcome Aboard!
                        </h2>
                        <p style={{ color: '#64748b' }}>
                            Your account has been created.<br />Redirecting to login...
                        </p>
                    </motion.div>
                )}

                {registrationStatus === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                    >
                        <div style={{
                            width: '80px', height: '80px',
                            background: '#fee2e2',
                            color: '#dc2626',
                            borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 24px'
                        }}>
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </div>
                        <h2 style={{ color: '#1e293b', fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}>
                            Registration Failed
                        </h2>
                        <p style={{ color: '#ef4444', marginBottom: '32px', maxWidth: '300px', margin: '0 auto 32px' }}>
                            {errorMessage}
                        </p>
                        <button
                            onClick={() => navigate('/login')}
                            style={{
                                padding: '14px 28px',
                                background: '#1e293b',
                                color: 'white',
                                borderRadius: '12px',
                                border: 'none',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Back to Login
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RegisterDataSavedRemote;
