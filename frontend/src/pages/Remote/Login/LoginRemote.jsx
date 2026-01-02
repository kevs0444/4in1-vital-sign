import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Visibility, VisibilityOff, ArrowBack, Sensors, ErrorOutline } from '@mui/icons-material';
import { loginWithCredentials, storeUserData, loginWithRFID } from '../../../utils/api';
import logo from '../../../assets/images/juan.png';
import './LoginRemote.css';

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

    // Refs for inputs
    const schoolNumberInputRef = useRef(null);
    const passwordInputRef = useRef(null);

    const handleLoginSuccess = (user) => {
        storeUserData(user);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('userData', JSON.stringify(user));
        localStorage.setItem('isAuthenticated', 'true');

        const userDataForState = {
            firstName: user.firstName || user.firstname || "",
            lastName: user.lastName || user.lastname || "",
            schoolNumber: user.schoolNumber || user.school_number || "",
            role: user.role || "",
            user_id: user.user_id || user.userId || user.id || "",
            email: user.email || ""
        };

        const role = (user.role || "").toLowerCase();
        let targetPath = '/student/dashboard';

        if (role === 'admin' || role === 'superadmin') targetPath = '/admin/dashboard';
        else if (role === 'doctor') targetPath = '/doctor/dashboard';
        else if (role === 'nurse') targetPath = '/nurse/dashboard';
        else if (role.includes('employee') || role.includes('faculty') || role.includes('staff')) targetPath = '/employee/dashboard';

        navigate(targetPath, { state: { user: userDataForState } });
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const schoolNumber = schoolNumberInputRef.current?.value || '';
            const password = passwordInputRef.current?.value || '';

            // Check if input is potentially an RFID scan (numbers only, length > 5, no password)
            const numbersOnly = schoolNumber.replace(/\D/g, '');
            if (!password.trim() && numbersOnly.length >= 5 && schoolNumber === numbersOnly) {
                await processRfidScan(numbersOnly);
                return;
            }

            if (!schoolNumber.trim()) throw new Error('Please enter your School Number or Email');
            if (!password.trim()) throw new Error('Please enter your password');

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
        const msg = response.message || 'Invalid credentials';
        if (msg.toLowerCase().includes('rejected')) setErrorTitle('Account Rejected');
        else if (msg.toLowerCase().includes('pending') || msg.toLowerCase().includes('approval')) setErrorTitle('Approval Pending');
        else setErrorTitle('Login Failed');

        setError(msg);
        setShowErrorModal(true);
        setIsLoading(false);
        setRfidStatus('error');
    };

    const handleLoginException = (err) => {
        const msg = err.message || 'Login failed. Please try again.';
        setErrorTitle('Login Failed');
        setError(msg);
        setShowErrorModal(true);
        setIsLoading(false);
        setRfidStatus('error');
    };

    const processRfidScan = async (scannedId) => {
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

    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
            if (isLoading) return;

            if (e.key === 'Enter' && rfidDataRef.current.length >= 5) {
                const numbersOnly = rfidDataRef.current.replace(/\D/g, '');
                if (numbersOnly.length >= 5) processRfidScan(numbersOnly);
                rfidDataRef.current = '';
                e.preventDefault();
            } else if (e.key.length === 1) {
                rfidDataRef.current += e.key;
                if (rfidDataRef.current.length >= 8) {
                    if (rfidTimeoutRef.current) clearTimeout(rfidTimeoutRef.current);
                    rfidTimeoutRef.current = setTimeout(() => {
                        if (rfidDataRef.current.length >= 8) {
                            const numbersOnly = rfidDataRef.current.replace(/\D/g, '');
                            if (numbersOnly.length >= 5) processRfidScan(numbersOnly);
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
        <div className="login-remote-main-container">
            {/* Background blobs for mobile */}
            <div className="bg-blob-1" />
            <div className="bg-blob-2" />

            {/* Desktop Hero Section */}
            <div className="login-hero-section">
                <div className="hero-shape" style={{ top: '-10%', right: '-10%', width: '300px', height: '300px' }} />
                <div className="hero-shape" style={{ bottom: '10%', left: '-5%', width: '200px', height: '200px' }} />

                <div className="hero-content">
                    <h1 className="hero-title">Simplify your health monitoring.</h1>
                    <p className="hero-subtitle">
                        Access your vital signs, medical history, and health insights instantly with our secure portal.
                    </p>
                    {/* Decorative stats/badges */}
                    <div style={{ marginTop: '40px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'block' }}>4-in-1</span>
                            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Vital Monitor</span>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.15)', padding: '16px 24px', borderRadius: '16px', backdropFilter: 'blur(10px)' }}>
                            <span style={{ fontSize: '1.5rem', fontWeight: 'bold', display: 'block' }}>Secure</span>
                            <span style={{ fontSize: '0.9rem', opacity: 0.9 }}>Cloud Data</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Navigation Bar */}
            <div className="login-top-bar">
                <button className="back-btn" onClick={() => navigate('/')}>
                    <ArrowBack />
                </button>
            </div>

            {/* Login Content/Form */}
            <div className="login-content-container">
                <div className="login-form-wrapper">
                    <div className="login-header">
                        <div className="logo-container">
                            <img src={logo} alt="Logo" style={{ width: '100%', height: 'auto' }} />
                        </div>
                        <h1 className="login-title">Welcome Back</h1>
                        <p className="login-subtitle">Sign in to access your health records</p>
                    </div>

                    <div className="rfid-indicator" style={{ color: rfidStatus === 'scanning' ? '#2563eb' : '#64748b' }}>
                        <Sensors style={{ fontSize: '1.2rem', animation: rfidStatus === 'scanning' ? 'pulse 1s infinite' : 'none' }} />
                        <span>{rfidStatus === 'scanning' ? 'Reading Card...' : 'RFID Scanner Active'}</span>
                    </div>

                    <form className="login-form" onSubmit={handleLogin}>
                        <div className="form-group">
                            <label>School Number or Email</label>
                            <input
                                ref={schoolNumberInputRef}
                                type="text"
                                className="form-input"
                                placeholder="e.g. 2023-12345"
                            />
                        </div>

                        <div className="form-group">
                            <label>Password</label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    ref={passwordInputRef}
                                    type={showPassword ? "text" : "password"}
                                    className="form-input"
                                    placeholder="Enter your password"
                                    style={{ paddingRight: '48px' }}
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
                                        color: '#94a3b8',
                                        cursor: 'pointer',
                                        padding: '4px'
                                    }}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </div>
                            <div style={{ textAlign: 'right', marginTop: '8px' }}>
                                <Link to="/forgot-password" style={{ fontSize: '0.9rem', color: '#dc2626', textDecoration: 'none', fontWeight: 600 }}>
                                    Forgot Password?
                                </Link>
                            </div>
                        </div>

                        <button type="submit" className="submit-btn" disabled={isLoading}>
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <div className="register-link-area">
                        <p style={{ color: '#64748b', marginBottom: '16px' }}>Don't have an account?</p>
                        <button className="create-account-btn" onClick={() => navigate('/register/welcome')}>
                            Create Account
                        </button>
                    </div>
                </div>
            </div>

            {/* Error Modal */}
            <AnimatePresence>
                {showErrorModal && (
                    <motion.div
                        className="modal-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowErrorModal(false)}
                        style={{
                            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px'
                        }}
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            style={{ background: 'white', borderRadius: '20px', padding: '24px', width: '100%', maxWidth: '320px', textAlign: 'center' }}
                            onClick={e => e.stopPropagation()}
                        >
                            <ErrorOutline style={{ fontSize: '48px', color: '#dc2626', marginBottom: '16px' }} />
                            <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#1e293b' }}>{errorTitle}</h3>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>{error}</p>
                            <button onClick={() => setShowErrorModal(false)} style={{ width: '100%', padding: '12px', background: '#f1f5f9', border: 'none', borderRadius: '12px', fontWeight: 600, color: '#334155', cursor: 'pointer' }}>
                                Try Again
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default LoginRemote;
