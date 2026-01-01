import React, { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Visibility, VisibilityOff, ArrowBack, Sensors } from '@mui/icons-material';
import { loginWithCredentials, storeUserData, loginWithRFID } from '../../../utils/api';
import logo from '../../../assets/images/juan.png';

const LoginRemote = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [errorTitle, setErrorTitle] = useState('Login Failed');
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [rfidStatus, setRfidStatus] = useState('ready');

    // RFID Refs
    const rfidDataRef = useRef('');
    const rfidTimeoutRef = useRef(null);

    // Refs for accessing input values directly
    const schoolNumberInputRef = useRef(null);
    const passwordInputRef = useRef(null);

    const handleLoginSuccess = (user) => {
        console.log('✅ Login successful:', user);

        storeUserData(user);

        // Also store in localStorage for dashboard access
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');

        const userDataForState = {
            firstName: user.firstName || user.firstname || "",
            lastName: user.lastName || user.lastname || "",
            age: user.age || "",
            sex: user.sex || "",
            schoolNumber: user.schoolNumber || user.school_number || "",
            role: user.role || "",
            user_id: user.user_id || user.userId || user.id || "",
            email: user.email || ""
        };

        // Navigate based on role to Dashboard (Remote users don't measure)
        const role = (user.role || user.userType || user.type || "").toLowerCase();
        let targetPath = '/student/dashboard';

        if (role === 'admin' || role === 'superadmin') targetPath = '/admin/dashboard';
        else if (role === 'doctor') targetPath = '/doctor/dashboard';
        else if (role === 'nurse') targetPath = '/nurse/dashboard';
        else if (role.includes('student')) targetPath = '/student/dashboard';
        else if (role.includes('employee') || role.includes('faculty') || role.includes('staff')) targetPath = '/employee/dashboard';
        else targetPath = '/student/dashboard';

        console.log(`🔀 Redirecting Remote User (${role}) to: ${targetPath}`);

        navigate(targetPath, {
            state: { user: userDataForState }
        });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const schoolNumber = schoolNumberInputRef.current?.value || '';
            const password = passwordInputRef.current?.value || '';

            if (!schoolNumber.trim()) {
                setError('Please enter your School Number/Email');
                setShowErrorModal(true);
                setIsLoading(false);
                return;
            }

            // Fallback: If password is empty but schoolNumber looks like RFID (long number), try RFID login
            // This handles cases where user scans into the input field
            const numbersOnly = schoolNumber.replace(/\D/g, '');
            if (!password.trim() && numbersOnly.length >= 5 && schoolNumber === numbersOnly) {
                console.log('🔄 Detected potential RFID in username field:', numbersOnly);
                await processRfidScan(numbersOnly);
                return;
            }

            if (!password.trim()) {
                setError('Please enter your password');
                setShowErrorModal(true);
                setIsLoading(false);
                return;
            }

            console.log('📤 Sending remote login credentials...');
            const response = await loginWithCredentials(schoolNumber, password);

            if (response.success) {
                handleLoginSuccess(response.user);
            } else {
                handleLoginError(response);
            }
        } catch (err) {
            handleLoginException(err);
        }
    };

    const handleLoginError = (response) => {
        if (response.status === 'rejected' || (response.message && response.message.toLowerCase().includes('rejected'))) {
            setErrorTitle('Account Rejected');
        } else if (response.status === 'pending' || (response.message && (response.message.toLowerCase().includes('pending') || response.message.toLowerCase().includes('approval')))) {
            setErrorTitle('Approval Pending');
        } else {
            setErrorTitle('Login Failed');
        }
        setError(response.message || 'Invalid credentials');
        setShowErrorModal(true);
        setIsLoading(false);
        setRfidStatus('error');
    };

    const handleLoginException = (err) => {
        console.error('❌ Login error:', err);
        const errorMessage = err.message || 'Login failed. Please try again.';
        if (errorMessage.toLowerCase().includes('rejected')) {
            setErrorTitle('Account Rejected');
        } else if (errorMessage.toLowerCase().includes('pending') || errorMessage.toLowerCase().includes('approval')) {
            setErrorTitle('Approval Pending');
        } else {
            setErrorTitle('Login Failed');
        }
        setError(errorMessage);
        setShowErrorModal(true);
        setIsLoading(false);
        setRfidStatus('error');
    };

    // RFID Handling
    const processRfidScan = async (scannedId) => {
        console.log('🎫 Processing RFID Scan:', scannedId);
        setIsLoading(true);
        setRfidStatus('scanning');
        setError('');

        try {
            const response = await loginWithRFID(scannedId);

            if (response.success) {
                setRfidStatus('success');
                handleLoginSuccess(response.user);
            } else {
                handleLoginError(response);
            }
        } catch (err) {
            handleLoginException(err);
        }
    };

    // Global Keydown Listener for RFID
    React.useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ignore if typing in an input field (unless we strictly want to capture everything)
            // Safety: Don't interfere with user typing credentials
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;

            if (isLoading) return;

            // RFID scanners typically send numbers/letters followed by Enter
            if (e.key === 'Enter') {
                if (rfidDataRef.current.length >= 5) {
                    console.log('🔑 Enter key pressed, processing RFID data:', rfidDataRef.current);
                    // Extract numbers
                    const numbersOnly = rfidDataRef.current.replace(/\D/g, '');
                    if (numbersOnly.length >= 5) {
                        processRfidScan(numbersOnly);
                    }
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
                            const numbersOnly = rfidDataRef.current.replace(/\D/g, '');
                            if (numbersOnly.length >= 5) {
                                processRfidScan(numbersOnly);
                            }
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

    return (
        <div style={{
            minHeight: '100dvh',
            width: '100%',
            background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background decoration - matching StandbyRemote */}
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
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(37, 99, 235, 0.05) 100%)',
                filter: 'blur(40px)',
                zIndex: 0
            }} />

            {/* Top Bar */}
            <div style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                zIndex: 10
            }}>
                <button
                    onClick={() => navigate('/')}
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
            </div>

            {/* Scrollable Content */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '0 24px 24px 24px',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1
            }}>
                {/* Header Section */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginBottom: '32px',
                    marginTop: '20px'
                }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        background: 'white',
                        borderRadius: '20px',
                        boxShadow: '0 8px 16px -4px rgba(220, 38, 38, 0.15)', // Red shadow
                        padding: '12px',
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <img src={logo} alt="VitalSign" style={{ width: '100%', height: 'auto' }} />
                    </div>
                    <h1 style={{
                        fontSize: '1.75rem',
                        fontWeight: '800',
                        color: '#1e293b',
                        marginBottom: '8px',
                        textAlign: 'center'
                    }}>
                        Welcome Back
                    </h1>
                    <p style={{
                        fontSize: '1rem',
                        color: '#64748b',
                        margin: 0,
                        textAlign: 'center'
                    }}>
                        Sign in to access your health records
                    </p>
                </div>

                {/* RFID Status Indicator */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    gap: '8px',
                    color: rfidStatus === 'scanning' ? '#3b82f6' : '#64748b',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                }}>
                    <Sensors style={{ fontSize: '1.2rem', animation: rfidStatus === 'scanning' ? 'pulse 1s infinite' : 'none' }} />
                    {rfidStatus === 'scanning' ? 'Reading Card...' : 'RFID Scanner Active'}
                </div>

                {/* Form Section */}
                <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    onSubmit={handleLogin}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '20px'
                    }}
                >
                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: '#334155',
                            marginBottom: '8px'
                        }}>
                            School Number or Email
                        </label>
                        <input
                            ref={schoolNumberInputRef}
                            type="text"
                            placeholder="e.g. 2023-12345 or student@email.com"
                            style={{
                                width: '100%',
                                padding: '16px',
                                fontSize: '1rem',
                                border: '2px solid #e2e8f0',
                                borderRadius: '16px',
                                background: 'rgba(255, 255, 255, 0.8)',
                                backdropFilter: 'blur(8px)',
                                color: '#1e293b',
                                outline: 'none',
                                transition: 'all 0.2s',
                                WebkitAppearance: 'none'
                            }}
                            onFocus={(e) => {
                                e.target.style.borderColor = '#ef4444'; // Red-500
                                e.target.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
                            }}
                            onBlur={(e) => {
                                e.target.style.borderColor = '#e2e8f0';
                                e.target.style.boxShadow = 'none';
                            }}
                        />
                    </div>

                    <div>
                        <label style={{
                            display: 'block',
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: '#334155',
                            marginBottom: '8px'
                        }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                ref={passwordInputRef}
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    paddingRight: '50px',
                                    fontSize: '1rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '16px',
                                    background: 'rgba(255, 255, 255, 0.8)',
                                    backdropFilter: 'blur(8px)',
                                    color: '#1e293b',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    WebkitAppearance: 'none'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#ef4444'; // Red-500
                                    e.target.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.1)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = '#e2e8f0';
                                    e.target.style.boxShadow = 'none';
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                style={{
                                    position: 'absolute',
                                    right: '12px',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    background: 'none',
                                    border: 'none',
                                    padding: '8px',
                                    color: '#94a3b8',
                                    cursor: 'pointer'
                                }}
                            >
                                {showPassword ? <VisibilityOff /> : <Visibility />}
                            </button>
                        </div>
                        <div style={{ textAlign: 'right', marginTop: '12px' }}>
                            <Link to="/forgot-password" style={{
                                fontSize: '0.9rem',
                                color: '#ef4444', // Red-500
                                textDecoration: 'none',
                                fontWeight: '600'
                            }}>
                                Forgot Password?
                            </Link>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            marginTop: '12px',
                            width: '100%',
                            padding: '18px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Red gradient
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            boxShadow: '0 10px 20px -5px rgba(220, 38, 38, 0.4)', // Red shadow
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.8 : 1,
                            transition: 'transform 0.2s ease'
                        }}
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </motion.form>

                {/* Register Link */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '32px',
                    paddingTop: '24px',
                    borderTop: '1px solid #cbd5e1'
                }}>
                    <p style={{
                        fontSize: '1rem',
                        color: '#64748b',
                        marginBottom: '16px'
                    }}>
                        Don't have an account?
                    </p>
                    <button
                        onClick={() => navigate('/register/welcome')}
                        style={{
                            width: '100%',
                            padding: '16px',
                            background: 'white',
                            border: '2px solid #e2e8f0',
                            borderRadius: '16px',
                            color: '#334155',
                            fontSize: '1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                        }}
                    >
                        Create Account
                    </button>
                </div>
            </div>

            {/* Error Modal */}
            {showErrorModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 100,
                    padding: '24px'
                }} onClick={() => setShowErrorModal(false)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: 'white',
                            borderRadius: '24px',
                            padding: '24px',
                            width: '100%',
                            maxWidth: '320px',
                            textAlign: 'center'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            width: '48px',
                            height: '48px',
                            background: '#fee2e2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            fontSize: '24px'
                        }}>
                            ⚠️
                        </div>
                        <h3 style={{
                            margin: '0 0 8px 0',
                            fontSize: '1.2rem',
                            fontWeight: '700',
                            color: errorTitle === 'Account Rejected' ? '#991b1b' : errorTitle === 'Approval Pending' ? '#b45309' : '#dc2626'
                        }}>
                            {errorTitle}
                        </h3>
                        <p style={{
                            margin: '0 0 24px 0',
                            fontSize: '0.95rem',
                            color: '#64748b',
                            lineHeight: '1.5'
                        }}>
                            {error}
                        </p>
                        <button
                            onClick={() => setShowErrorModal(false)}
                            style={{
                                width: '100%',
                                padding: '14px',
                                background: '#f1f5f9',
                                color: '#334155',
                                border: 'none',
                                borderRadius: '14px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: 'pointer'
                            }}
                        >
                            Try Again
                        </button>
                    </motion.div>
                </div>
            )}

            {/* Styles for pulse animation */}
            <style>
                {`
                @keyframes pulse {
                    0% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.7; transform: scale(1.1); }
                    100% { opacity: 1; transform: scale(1); }
                }
                `}
            </style>
        </div>
    );
};

export default LoginRemote;
