import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBack, Visibility, VisibilityOff, Sensors, CheckCircle, Error, Warning } from '@mui/icons-material';

// We import the centralized API function (4 levels up -> src/utils/api)
import { registerUser } from '../../../../utils/api';

const RegisterTapIDRemote = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = location.state?.userType || "rtu-students"; // Consistent with RegisterRole params
    const personalInfo = location.state?.personalInfo || {};

    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState({
        schoolId: "",
        email: "",
        password: "",
        confirmPassword: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    // Duplicate Modal State
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateMessage, setDuplicateMessage] = useState("");

    // RFID State
    const [rfidCode, setRfidCode] = useState(null);
    const [rfidStatus, setRfidStatus] = useState('ready'); // ready, scanning, success, error
    const [rfidMessage, setRfidMessage] = useState('');

    const rfidDataRef = useRef('');
    const rfidTimeoutRef = useRef(null);

    // Dynamic API URL Helper
    const getDynamicApiUrl = () => {
        if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
        return `${window.location.protocol}//${window.location.hostname}:5000/api`;
    };
    const API_BASE = getDynamicApiUrl();

    const emailDomains = ["gmail.com", "yahoo.com", "outlook.com", "rtu.edu.ph", "icloud.com"];

    const handleDomainSelect = (domain) => {
        const [username] = formData.email.split('@');
        setFormData(prev => ({ ...prev, email: `${username}@${domain}` }));
    };

    // Process RFID Scan
    const processRfidScan = async (scannedData) => {
        console.log('🎫 RFID Scanned:', scannedData);
        setRfidStatus('scanning');
        setRfidMessage('Verifying ID Card...');

        try {
            // Check if RFID exists
            const checkResponse = await fetch(`${API_BASE}/login/check-rfid/${encodeURIComponent(scannedData)}`);
            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                setRfidStatus('error');
                setRfidMessage('Card already registered to another user.');
                setDuplicateMessage("This ID Card (RFID) is already registered to another user.");
                setShowDuplicateModal(true);
                setRfidCode(null);
            } else {
                setRfidStatus('success');
                setRfidMessage('ID Card Linked Successfully!');
                setRfidCode(scannedData);
            }
        } catch (err) {
            console.warn('Could not verify RFID uniqueness:', err);
            // Proceed anyway? Or fail? Better to fail safely or warn.
            // If network fails, we usually can't register anyway.
            setRfidStatus('error');
            setRfidMessage('Error verifying card. Try again.');
        }
    };

    // Global Keydown Listener
    React.useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ignore if typing in an input field
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (isLoading) return;

            // RFID scanners typically send numbers/letters followed by Enter
            if (e.key === 'Enter') {
                if (rfidDataRef.current.length >= 5) {
                    processRfidScan(rfidDataRef.current);
                    rfidDataRef.current = '';
                    e.preventDefault();
                }
            } else if (e.key.length === 1) {
                rfidDataRef.current += e.key;

                // Auto-detect timeout
                if (rfidDataRef.current.length >= 8) {
                    if (rfidTimeoutRef.current) clearTimeout(rfidTimeoutRef.current);
                    rfidTimeoutRef.current = setTimeout(() => {
                        if (rfidDataRef.current.length >= 8) {
                            processRfidScan(rfidDataRef.current);
                            rfidDataRef.current = '';
                        }
                    }, 100);
                }
            }
        };

        document.addEventListener('keydown', handleGlobalKeyDown);
        return () => {
            document.removeEventListener('keydown', handleGlobalKeyDown);
            if (rfidTimeoutRef.current) clearTimeout(rfidTimeoutRef.current);
        };
    }, [isLoading]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError(""); // Clear error on edit
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");

        if (!formData.schoolId || !formData.email || !formData.password || !formData.confirmPassword) {
            setError("All fields are required.");
            setIsLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            setIsLoading(false);
            return;
        }

        try {
            // Generate User ID
            const generateUserId = () => {
                const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
                const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
                return `USR-${timestamp}-${randomPart}`;
            };

            // Prepare payload matching backend expectations
            const payload = {
                userId: generateUserId(),
                firstName: personalInfo.firstName,
                middleName: personalInfo.middleName, // Add middle name
                lastName: personalInfo.lastName,
                suffix: personalInfo.suffix, // Add suffix
                birthDate: `${personalInfo.birthYear}-${String(personalInfo.birthMonth).padStart(2, '0')}-${String(personalInfo.birthDay).padStart(2, '0')}`,
                sex: personalInfo.sex,
                role: userRole,

                schoolNumber: formData.schoolId, // Backend likely expects 'schoolNumber' or 'id_number'
                email: formData.email,
                password: formData.password,

                // Pass captured RFID code (or null if none)
                rfid_code: rfidCode
            };

            const response = await registerUser(payload);

            if (response.success) {
                navigate('/register/saved');
            } else {
                // Check if error is related to duplication
                if (response.message && (
                    response.message.toLowerCase().includes('email') ||
                    response.message.toLowerCase().includes('school') ||
                    response.message.toLowerCase().includes('id') ||
                    response.message.toLowerCase().includes('rfid') ||
                    response.message.toLowerCase().includes('already registered')
                )) {
                    setDuplicateMessage(response.message);
                    setShowDuplicateModal(true);
                } else {
                    setError(response.message || "Registration failed. Please try again.");
                }
            }

        } catch (err) {
            console.error("Registration error:", err);
            setError(err.message || "Network error. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            width: '100%',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Top Bar */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                background: 'white',
                borderBottom: '1px solid #e2e8f0',
                position: 'sticky',
                top: 0,
                zIndex: 10
            }}>
                <button
                    onClick={() => navigate(-1)} // Go back
                    style={{
                        background: 'none',
                        border: 'none',
                        padding: '8px',
                        marginLeft: '-8px',
                        cursor: 'pointer',
                        color: '#334155'
                    }}
                >
                    <ArrowBack />
                </button>
                <h1 style={{
                    fontSize: '1.1rem',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: '0 0 0 16px'
                }}>
                    Account Setup
                </h1>
            </div>

            {/* Form Content */}
            <div style={{
                flex: 1,
                padding: '24px',
                overflowY: 'auto'
            }}>
                <p style={{
                    fontSize: '0.95rem',
                    color: '#64748b',
                    marginBottom: '24px'
                }}>
                    Final step! Set up your secure login credentials.
                </p>

                {/* RFID Linking Section */}
                <div style={{
                    marginBottom: '24px',
                    padding: '16px',
                    borderRadius: '16px',
                    background: rfidStatus === 'success' ? '#f0fdf4' : rfidStatus === 'error' ? '#fef2f2' : '#f1f5f9',
                    border: `2px dashed ${rfidStatus === 'success' ? '#22c55e' : rfidStatus === 'error' ? '#ef4444' : '#cbd5e1'}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <div style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        background: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: rfidStatus === 'success' ? '#16a34a' : rfidStatus === 'error' ? '#dc2626' : '#64748b'
                    }}>
                        {rfidStatus === 'success' ? <CheckCircle /> : rfidStatus === 'error' ? <Error /> : <Sensors />}
                    </div>
                    <div>
                        <p style={{ margin: 0, fontWeight: '600', fontSize: '0.95rem', color: '#334155' }}>
                            {rfidStatus === 'success' ? 'ID Card Linked' : rfidStatus === 'error' ? 'Scan Failed' : 'Link ID Card (Optional)'}
                        </p>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>
                            {rfidStatus === 'success' ? rfidMessage : rfidStatus === 'error' ? rfidMessage : 'Tap card on scanner to link to account'}
                        </p>
                    </div>
                </div>

                <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Error Alert */}
                    {error && (
                        <div style={{
                            padding: '12px',
                            background: '#fee2e2',
                            borderRadius: '12px',
                            color: '#dc2626',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            border: '1px solid #fecaca'
                        }}>
                            {error}
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                            {userRole.includes('doctor') || userRole.includes('nurse') ? 'License Number' : 'School ID Number'}
                        </label>
                        <input
                            type="text"
                            name="schoolId"
                            value={formData.schoolId}
                            onChange={handleChange}
                            placeholder={userRole.includes('doctor') ? 'Enter License No.' : 'e.g. 2023-00123'}
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '16px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                background: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                            Email Address
                        </label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            placeholder="juan@example.com"
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '16px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                background: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                        {/* Email Domain Suggestions */}
                        {formData.email.includes('@') && !formData.email.includes('.', formData.email.indexOf('@') + 2) && (
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: '8px',
                                marginTop: '12px'
                            }}>
                                {emailDomains.map((domain) => (
                                    <button
                                        key={domain}
                                        type="button"
                                        onClick={() => handleDomainSelect(domain)}
                                        style={{
                                            padding: '8px 12px',
                                            background: '#f1f5f9',
                                            border: '1px solid #cbd5e1',
                                            borderRadius: '20px',
                                            fontSize: '0.85rem',
                                            color: '#334155',
                                            cursor: 'pointer',
                                            fontWeight: '600',
                                            transition: 'all 0.2s'
                                        }}
                                        onMouseOver={(e) => {
                                            e.target.style.background = '#e2e8f0';
                                            e.target.style.borderColor = '#94a3b8';
                                        }}
                                        onMouseOut={(e) => {
                                            e.target.style.background = '#f1f5f9';
                                            e.target.style.borderColor = '#cbd5e1';
                                        }}
                                    >
                                        @{domain}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? "text" : "password"}
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                placeholder="Create a password"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    paddingRight: '50px',
                                    fontSize: '1rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '16px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                    background: 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    border: 'none',
                                    background: 'none',
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </button>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                            Confirm Password
                        </label>
                        <input
                            type="password"
                            name="confirmPassword"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            placeholder="Repeat password"
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '16px',
                                outline: 'none',
                                transition: 'border-color 0.2s',
                                background: 'white'
                            }}
                            onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                            onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            marginTop: '20px',
                            width: '100%',
                            padding: '18px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            boxShadow: '0 8px 20px -6px rgba(220, 38, 38, 0.4)'
                        }}
                    >
                        {isLoading ? "Creating Account..." : "Create Account"}
                    </button>
                </form>
            </div>

            {/* Duplicate / Error Modal */}
            <AnimatePresence>
                {showDuplicateModal && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        background: 'rgba(0,0,0,0.5)',
                        zIndex: 50,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }} onClick={() => setShowDuplicateModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                padding: '32px 24px',
                                width: '100%',
                                maxWidth: '400px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
                                textAlign: 'center'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                width: '64px',
                                height: '64px',
                                background: '#fef2f2',
                                color: '#ef4444',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Warning style={{ fontSize: '32px' }} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                                Registration Issue
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                                {duplicateMessage || "This information is already registered in our system."}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '16px',
                                        fontSize: '1rem',
                                        fontWeight: '700',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Log In Instead
                                </button>
                                <button
                                    onClick={() => setShowDuplicateModal(false)}
                                    style={{
                                        width: '100%',
                                        padding: '16px',
                                        background: 'transparent',
                                        color: '#64748b',
                                        border: 'none',
                                        fontSize: '1rem',
                                        fontWeight: '600',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Close & Edit Info
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
};

export default RegisterTapIDRemote;
