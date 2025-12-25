import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CheckCircle,
    Password,
    Visibility,
    VisibilityOff,
    School
} from '@mui/icons-material';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ForgotPassword.css';
import forgotPassIcon from '../../assets/icons/forgot-pass-icon.png';

import { isLocalDevice } from '../../utils/network';

const getDynamicApiUrl = () => {
    if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL + '/api';
    return `${window.location.protocol}//${window.location.hostname}:5000/api`;
};

const API_BASE_URL = getDynamicApiUrl();

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Identifier, 2: OTP, 3: New Password, 4: Success
    const [identifier, setIdentifier] = useState(''); // Email or School Number
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState(''); // For masking email info
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Glassmorphism Modal States
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorTitle, setErrorTitle] = useState('Error');
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successTitle, setSuccessTitle] = useState('Success');
    const [showExitModal, setShowExitModal] = useState(false);

    // Keyboard State
    const [activeInput, setActiveInput] = useState('identifier');
    const [isShift, setIsShift] = useState(false);
    const [showSymbols, setShowSymbols] = useState(false);

    // OTP Rate Limiting
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [lastRequestedIdentifier, setLastRequestedIdentifier] = useState('');
    const [timeLeft, setTimeLeft] = useState(0); // Expiration timer in seconds

    // Cooldown countdown timer
    useEffect(() => {
        if (otpCooldown > 0) {
            const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCooldown]);

    // OTP Expiration Timer
    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        } else if (step === 2 && timeLeft === 0) {
            // Timer expired
            // Optionally auto-fail or just rely on UI state
        }
    }, [timeLeft, step]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();

        // Check if same identifier is being spammed
        if (lastRequestedIdentifier === identifier && otpCooldown > 0) {
            setErrorTitle('Please Wait');
            setError(`Please wait ${otpCooldown} seconds before requesting another code.`);
            setShowErrorModal(true);
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccessMessage('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier })
            });

            const data = await response.json();

            if (data.success) {
                setSuccessMessage(data.message);
                setStep(2);
                setActiveInput('otp'); // Auto focus OTP
                setOtp('');
                // Set cooldown for 60 seconds
                setOtpCooldown(60);
                // Set expiration timer (default 10 mins if not provided)
                setTimeLeft(data.expires_in || 600);
                setLastRequestedIdentifier(identifier);
            } else {
                setErrorTitle('Unable to Send Code');
                setError(data.message || 'Failed to send OTP. Please try again.');
                setShowErrorModal(true);
            }
        } catch (err) {
            setErrorTitle('Network Error');
            setError('Network error. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, otp })
            });

            const data = await response.json();

            if (data.success) {
                setStep(3);
                setActiveInput('newPassword'); // Auto focus new password
            } else {
                setErrorTitle('Invalid Code');
                setError(data.message || 'Invalid OTP. Please try again.');
                setShowErrorModal(true);
            }
        } catch (err) {
            setErrorTitle('Network Error');
            setError('Network error. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Helper function for smooth navigation to login
    const handleNavigateToLogin = () => {
        const container = document.querySelector('.forgot-password-container');
        if (container) {
            container.style.transition = 'opacity 0.5s ease-out';
            container.style.opacity = '0';
        }
        setTimeout(() => {
            navigate('/login');
        }, 500);
    };

    // Handle back button with confirmation and OTP deletion
    const handleBackButton = () => {
        setShowExitModal(true);
    };

    const handleConfirmExit = async () => {
        // Delete OTP from database if it exists
        if (identifier && step >= 2) {
            try {
                await fetch(`${API_BASE_URL}/auth/cancel-reset`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier })
                });
            } catch (err) {
                console.log('Failed to clear OTP, but continuing with exit');
            }
        }

        // Clear all state
        setIdentifier('');
        setOtp('');
        setNewPassword('');
        setConfirmPassword('');
        setStep(1);
        setOtpCooldown(0);
        setLastRequestedIdentifier('');
        setShowExitModal(false);

        // Navigate to login
        handleNavigateToLogin();
    };

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();

        console.log('🔄 Password Reset Initiated');
        console.log('📝 Identifier:', identifier);
        console.log('🔑 OTP:', otp);
        console.log('🔒 Password lengths - new:', newPassword.length, 'confirm:', confirmPassword.length);

        if (newPassword !== confirmPassword) {
            console.log('❌ Passwords do not match');
            setErrorTitle('Password Mismatch');
            setError("Passwords do not match");
            setShowErrorModal(true);
            return;
        }

        if (newPassword.length < 6) {
            console.log('❌ Password too short');
            setErrorTitle('Password Too Short');
            setError("Password must be at least 6 characters");
            setShowErrorModal(true);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            console.log('📡 Sending password reset request to backend...');
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, otp, newPassword })
            });

            const data = await response.json();
            console.log('📥 Backend response:', data);

            if (data.success) {
                console.log('✅ Password reset successful!');
                // Show success modal
                setSuccessTitle('Password Reset Successful!');
                setSuccessMessage('Your password has been successfully updated. Redirecting to login...');
                setShowSuccessModal(true);

                // Navigate to step 4 and auto-redirect after 2 seconds
                setStep(4);
                setTimeout(() => {
                    handleNavigateToLogin();
                }, 2000);
            } else {
                console.log('❌ Password reset failed:', data.message);
                setErrorTitle('Reset Failed');
                setError(data.message || 'Failed to reset password.');
                setShowErrorModal(true);
            }
        } catch (err) {
            console.error('❌ Network error during password reset:', err);
            setErrorTitle('Network Error');
            setError('Network error. Please try again.');
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-capslock for OTP
    useEffect(() => {
        if (activeInput === 'otp') {
            setIsShift(true);
        } else {
            setIsShift(false);
        }
    }, [activeInput]);

    // Keyboard Handling
    const handleKeyboardPress = (key) => {
        if (key === "↑") {
            // Allow toggling shift manually if desired, or we could strict lock it. 
            // For now, allow toggle but input will still be forced upper for OTP.
            setIsShift(!isShift);
            return;
        }
        if (key === "Sym" || key === "ABC") {
            setShowSymbols(!showSymbols);
            return;
        }

        // Determine current value and setter
        let currentValue = '';
        let setValue = null;

        if (activeInput === 'identifier') { currentValue = identifier; setValue = setIdentifier; }
        else if (activeInput === 'otp') { currentValue = otp; setValue = setOtp; }
        else if (activeInput === 'newPassword') { currentValue = newPassword; setValue = setNewPassword; }
        else if (activeInput === 'confirmPassword') { currentValue = confirmPassword; setValue = setConfirmPassword; }

        if (!setValue) return;

        if (key === "Del") {
            setValue(currentValue.slice(0, -1));
        } else if (key === "Space") {
            // OTP doesn't allow space
            if (activeInput !== 'otp') {
                setValue(currentValue + " ");
            }
        } else {
            // Limits
            if (activeInput === 'otp' && currentValue.length >= 6) return;
            if ((activeInput === 'newPassword' || activeInput === 'confirmPassword') && currentValue.length >= 10) return;

            let char = key;

            if (activeInput === 'otp') {
                // Force uppercase for OTP regardless of shift state
                if (char.length === 1) char = char.toUpperCase();
            } else {
                if (isShift && char.length === 1) char = char.toUpperCase();
                else if (!isShift && char.length === 1) char = char.toLowerCase();
            }

            setValue(currentValue + char);
        }
    };

    const handleDomainSelect = (domain) => {
        const [username] = identifier.split('@');
        setIdentifier(username + '@' + domain);
    };

    // Keyboard Layouts
    const numberRow = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
    const alphabetKeys = [
        numberRow,
        ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
        ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
        ["↑", "Z", "X", "C", "V", "B", "N", "M", "Del"],
        ["Sym", "Space", step === 1 ? "@" : "-", "-"]
    ];

    const symbolKeys = [
        numberRow,
        ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")"],
        ["-", "_", "+", "=", "{", "}", "[", "]", "|"],
        [".", ",", "?", "!", "'", '"', ":", ";", "Del"],
        ["ABC", "Space", "."]
    ];

    const currentKeyboard = showSymbols ? symbolKeys : alphabetKeys;

    const calculatePasswordStrength = (password) => {
        if (!password) return { score: 0, label: "Enter password", color: "#e2e8f0" };

        let score = 0;
        if (password.length > 6) score += 1;
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
        if (score <= 4) return { score: 2, label: "Medium", color: "#f59e0b" };
        return { score: 3, label: "Strong", color: "#22c55e" };
    };

    const passwordStrength = calculatePasswordStrength(newPassword);

    // =================================================================================
    // REMOTE DEVICE UI (Standard Responsive Web Layout)
    // =================================================================================
    if (!isLocalDevice()) {
        return (
            <div style={{
                background: 'linear-gradient(135deg, #f5f7fa 0%, #e4e7eb 100%)',
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '20px',
                fontFamily: "'Inter', sans-serif"
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white rounded-4 shadow-lg p-4 p-md-5 w-100"
                    style={{ maxWidth: '500px' }}
                >
                    {/* Header */}
                    <div className="text-center mb-4">
                        <h2 className="fw-bold mb-2 text-dark">
                            {step === 1 && "Account Recovery"}
                            {step === 2 && "Verification"}
                            {step === 3 && "Reset Password"}
                            {step === 4 && "Success!"}
                        </h2>
                        <p className="text-muted small">
                            {step === 1 && "Enter your School Number or Email to proceed"}
                            {step === 2 && "Enter the 6-digit code sent to your email"}
                            {step === 3 && "Create a new strong password"}
                            {step === 4 && "Your password has been updated"}
                        </p>
                    </div>

                    {/* Step 1: Identifier */}
                    {step === 1 && (
                        <form onSubmit={handleSendOTP}>
                            <div className="mb-4">
                                <label className="form-label fw-bold">School Number or Email</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0"><School /></span>
                                    <input
                                        type="text"
                                        className="form-control form-control-lg border-start-0 ps-0"
                                        placeholder="e.g. 2023-12345 or email@rtu.edu.ph"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        autoFocus
                                        required
                                    />
                                </div>
                            </div>
                            <button
                                type="submit"
                                className="btn btn-primary w-100 btn-lg mb-3"
                                disabled={isLoading || (lastRequestedIdentifier === identifier && otpCooldown > 0)}
                            >
                                {isLoading ? 'Sending...' : (lastRequestedIdentifier === identifier && otpCooldown > 0) ? `Wait ${otpCooldown}s` : 'Send Verification Code'}
                            </button>
                            <button type="button" className="btn btn-light w-100" onClick={() => navigate('/login')}>
                                Return to Login
                            </button>
                        </form>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <form onSubmit={handleVerifyOTP}>
                            <div className="mb-4 text-center">
                                <label className="form-label fw-bold mb-3">Enter Verification Code</label>
                                <input
                                    type="text"
                                    className="form-control form-control-lg text-center fw-bold "
                                    style={{ letterSpacing: '0.5em', fontSize: '1.5rem' }}
                                    placeholder="XXXXXX"
                                    value={otp}
                                    onChange={(e) => {
                                        const val = e.target.value.toUpperCase().slice(0, 6);
                                        setOtp(val);
                                    }}
                                    autoFocus
                                    maxLength={6}
                                />
                                {timeLeft > 0 ? (
                                    <div className="text-muted small mt-2">Expires in {formatTime(timeLeft)}</div>
                                ) : (
                                    <div className="text-danger small mt-2 fw-bold">Code Expired</div>
                                )}
                            </div>
                            <button type="submit" className="btn btn-primary w-100 btn-lg mb-3" disabled={isLoading || timeLeft === 0 || otp.length < 6}>
                                {isLoading ? 'Verifying...' : 'Verify Code'}
                            </button>
                            <button type="button" className="btn btn-light w-100" onClick={() => { setStep(1); setOtp(''); }}>
                                Start Over
                            </button>
                        </form>
                    )}

                    {/* Step 3: New Password */}
                    {step === 3 && (
                        <form onSubmit={handleResetPassword}>
                            <div className="mb-3">
                                <label className="form-label fw-bold">New Password</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0"><Password /></span>
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className="form-control form-control-lg border-start-0 ps-0"
                                        placeholder="Min. 6 characters"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        autoFocus
                                    />
                                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowPassword(!showPassword)}>
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </button>
                                </div>
                                {/* Strength Bar */}
                                {newPassword.length > 0 && (
                                    <div className="mt-2 d-flex align-items-center gap-2" style={{ height: '4px' }}>
                                        {[1, 2, 3].map(lvl => (
                                            <div key={lvl} className="flex-grow-1 rounded-pill" style={{
                                                height: '100%',
                                                background: lvl <= passwordStrength.score ? passwordStrength.color : '#e9ecef'
                                            }} />
                                        ))}
                                    </div>
                                )}
                                <div className="small mt-1 text-end" style={{ color: passwordStrength.color }}>{passwordStrength.label}</div>
                            </div>

                            <div className="mb-4">
                                <label className="form-label fw-bold">Confirm Password</label>
                                <div className="input-group">
                                    <span className="input-group-text bg-light border-end-0"><Password /></span>
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className="form-control form-control-lg border-start-0 ps-0"
                                        placeholder="Re-enter password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                    />
                                    <button className="btn btn-outline-secondary" type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </button>
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary w-100 btn-lg" disabled={isLoading}>
                                {isLoading ? 'Updating...' : 'Reset Password'}
                            </button>
                        </form>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="text-center py-4">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="mb-4 text-success">
                                <CheckCircle style={{ fontSize: '5rem' }} />
                            </motion.div>
                            <h4 className="fw-bold text-success mb-3">Password Updated!</h4>
                            <p className="text-muted mb-4">You can now login with your new credentials.</p>
                            <button className="btn btn-primary w-100 btn-lg" onClick={() => navigate('/login')}>
                                Go to Login
                            </button>
                        </div>
                    )}

                    {/* Error Toast/Modal */}
                    {showErrorModal && (
                        <div className="alert alert-danger mt-3 d-flex align-items-center position-absolute top-0 start-50 translates-middle-x mt-4 shadow" role="alert" style={{ width: '90%', maxWidth: '400px', zIndex: 1050 }}>
                            <span className="me-2">⚠️</span>
                            <div className="flex-grow-1 small fw-bold">
                                {error}
                            </div>
                            <button type="button" className="btn-close ms-2" onClick={() => setShowErrorModal(false)}></button>
                        </div>
                    )}

                </motion.div>
            </div>
        );
    }

    // =================================================================================
    // KIOSK DEVICE UI (Virtual Keyboard + Full Touch)
    // =================================================================================
    return (
        <div className="forgot-password-container">
            <div className={`forgot-password-content`}>

                {/* Progress Steps */}
                <div className="progress-steps">
                    {[1, 2, 3].map((s) => (
                        <div key={s} className={`progress-step ${step === s ? 'active' : step > s ? 'completed' : ''}`}>
                            <div className="step-circle">
                                {step > s ? '✓' : s}
                            </div>
                            <span className="step-label">
                                {s === 1 ? 'Identify' : s === 2 ? 'Verify' : 'Reset'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Back Arrow Button */}
                <button className="close-button" onClick={handleBackButton}>
                    ←
                </button>

                {/* Main Area */}
                <div className="main-content-area">
                    {/* Image Section */}
                    <div className="forgot-password-image-section">
                        <img
                            src={forgotPassIcon}
                            alt="Forgot Password"
                            className="forgot-password-image"
                        />
                    </div>

                    {/* Header */}
                    <div className="forgot-password-header">
                        <h1 className="forgot-password-title">
                            {step === 1 && "Account Recovery"}
                            {step === 2 && "Verification"}
                            {step === 3 && "Secure Password"}
                            {step === 4 && "All Set!"}
                        </h1>
                        <p className="forgot-password-subtitle">
                            {step === 1 && "Enter your School Number or Email Address"}
                            {step === 2 && (successMessage || "Enter the 6-digit code sent to your email")}
                            {step === 2 && timeLeft > 0 && (
                                <span className="otp-timer-display" style={{ display: 'block', marginTop: '5px', color: timeLeft < 60 ? '#dc2626' : '#4b5563', fontWeight: 'bold' }}>
                                    Code expires in: {formatTime(timeLeft)}
                                </span>
                            )}
                            {step === 2 && timeLeft === 0 && (
                                <span className="otp-timer-display" style={{ display: 'block', marginTop: '5px', color: '#dc2626', fontWeight: 'bold' }}>
                                    ⚠️ Code Expired
                                </span>
                            )}
                            {step === 3 && "Create a new strong password"}
                            {step === 4 && "Password updated successfully!"}
                        </p>
                    </div>

                    {/* Step 1: Identifier */}
                    {step === 1 && (
                        <div className="form-container">
                            <div className="input-group-modern">
                                <label><School /> School Number or Email</label>
                                <input
                                    type="text"
                                    className={`form-input ${activeInput === 'identifier' ? 'active' : ''}`}
                                    placeholder="e.g. 2023-12345 or student@email.com"
                                    value={identifier}
                                    onFocus={(e) => {
                                        e.preventDefault();
                                        e.target.blur(); // Prevent native keyboard
                                        setActiveInput('identifier');
                                    }}
                                    readOnly // Enforce virtual keyboard
                                    inputMode="none"
                                    autoComplete="off"
                                />
                                {activeInput === 'identifier' && identifier.includes('@') && (
                                    <div className="email-suggestions">
                                        {["gmail.com", "rtu.edu.ph", "yahoo.com", "outlook.com", "icloud.com"].map((domain) => (
                                            <button
                                                key={domain}
                                                type="button"
                                                className="email-suggestion-chip"
                                                onClick={() => handleDomainSelect(domain)}
                                            >
                                                {domain}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Step 2: OTP */}
                    {step === 2 && (
                        <div className="form-container">
                            <div
                                className={`otp-container ${activeInput === 'otp' ? 'active-field' : ''}`}
                                onClick={() => setActiveInput('otp')}
                            >
                                {[0, 1, 2, 3, 4, 5].map((idx) => (
                                    <div key={idx} className={`otp-box ${otp.length === idx && activeInput === 'otp' ? 'active' : ''} ${otp[idx] ? 'filled' : ''}`}>
                                        {otp[idx] || ''}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Password */}
                    {step === 3 && (
                        <div className="form-container">
                            <div className="input-group-modern">
                                <label><Password /> New Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showPassword ? "text" : "password"}
                                        className={`form-input ${activeInput === 'newPassword' ? 'active' : ''}`}
                                        placeholder="Min. 6 chars"
                                        value={newPassword}
                                        onFocus={(e) => {
                                            e.preventDefault();
                                            e.target.blur();
                                            setActiveInput('newPassword');
                                        }}
                                        readOnly
                                        inputMode="none"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowPassword(!showPassword); }}
                                        className="password-toggle"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </button>
                                </div>

                                {/* Password Strength Meter */}
                                {newPassword.length > 0 && (
                                    <div className="password-strength-container">
                                        <div className="strength-bars">
                                            {[1, 2, 3].map((level) => (
                                                <div
                                                    key={level}
                                                    className="strength-bar"
                                                    style={{
                                                        backgroundColor: level <= passwordStrength.score ? passwordStrength.color : '#e2e8f0'
                                                    }}
                                                />
                                            ))}
                                        </div>
                                        <span className="strength-label" style={{ color: passwordStrength.color }}>
                                            {passwordStrength.label}
                                        </span>
                                    </div>
                                )}

                                <div className="password-guidelines">
                                    <span className="guideline-text">
                                        {newPassword.length > 0
                                            ? `${newPassword.length}/10 characters${newPassword.length < 6 ? ' (Minimum 6)' : ''}`
                                            : 'Minimum of 6 characters'}
                                    </span>
                                </div>
                            </div>
                            <div className="input-group-modern">
                                <label><Password /> Confirm Password</label>
                                <div className="password-input-wrapper">
                                    <input
                                        type={showConfirmPassword ? "text" : "password"}
                                        className={`form-input ${activeInput === 'confirmPassword' ? 'active' : ''}`}
                                        placeholder="Confirm Password"
                                        value={confirmPassword}
                                        onFocus={(e) => {
                                            e.preventDefault();
                                            e.target.blur();
                                            setActiveInput('confirmPassword');
                                        }}
                                        readOnly
                                        inputMode="none"
                                        autoComplete="off"
                                    />
                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); setShowConfirmPassword(!showConfirmPassword); }}
                                        className="password-toggle"
                                    >
                                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Success */}
                    {step === 4 && (
                        <div className="form-container" style={{ alignItems: 'center' }}>
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="success-icon"
                            >
                                <CheckCircle style={{ fontSize: '8rem', color: '#16a34a' }} />
                            </motion.div>
                        </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="form-navigation">
                        {step === 1 && (
                            <button
                                className="action-button"
                                onClick={handleSendOTP}
                                disabled={isLoading || (lastRequestedIdentifier === identifier && otpCooldown > 0)}
                            >
                                {isLoading ? <span className="spinner"></span> :
                                    lastRequestedIdentifier === identifier && otpCooldown > 0 ?
                                        `Wait ${otpCooldown}s to resend` :
                                        "Find Account →"}
                            </button>
                        )}
                        {step === 2 && (
                            <button className="action-button" onClick={handleVerifyOTP} disabled={isLoading || timeLeft === 0}>
                                {isLoading ? <span className="spinner"></span> :
                                    timeLeft === 0 ? "Code Expired - Go Back" :
                                        "Verify & Proceed →"}
                            </button>
                        )}
                        {step === 2 && timeLeft === 0 && (
                            <button className="action-button secondary-button" onClick={() => {
                                setStep(1);
                                setOtp('');
                                setIdentifier('');
                            }} style={{ background: '#6b7280', marginTop: '10px' }}>
                                Start Over
                            </button>
                        )}
                        {step === 3 && (
                            <button className="action-button" onClick={handleResetPassword} disabled={isLoading}>
                                {isLoading ? <span className="spinner"></span> : "Reset Password →"}
                            </button>
                        )}
                        {step === 4 && (
                            <button className="action-button" onClick={() => navigate('/login')}>
                                Return to Login
                            </button>
                        )}
                    </div>
                </div>

                {/* Keyboard Section */}
                {step !== 4 && (
                    <div className="keyboard-container">
                        {currentKeyboard.map((row, rIndex) => (
                            <div key={rIndex} className="keyboard-row">
                                {row.map((key) => {
                                    // Determine specific classes for keys
                                    let keyClass = "keyboard-key";
                                    if (key === "Del") keyClass += " delete-key";
                                    else if (key === "Space") keyClass += " space-key";
                                    else if (key === "@") keyClass += " at-key";
                                    else if (key === "↑") keyClass += ` shift-key ${isShift ? "active-shift" : ""}`;
                                    else if (key === "Sym" || key === "ABC") keyClass += ` symbols-key ${showSymbols ? "active" : ""}`;

                                    return (
                                        <button
                                            key={key}
                                            className={keyClass}
                                            onClick={(e) => {
                                                e.preventDefault(); // Prevent focus loss or form submission
                                                handleKeyboardPress(key);
                                            }}
                                        >
                                            {key === "↑" ? "SHIFT" :
                                                key === "Del" ? "DELETE" :
                                                    key === "Space" ? "SPACE" :
                                                        key === "Sym" ? "SYMBOLS" :
                                                            key === "ABC" ? "ABC" : key}
                                        </button>
                                    );
                                })}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Glassmorphism Error Modal */}
            <AnimatePresence>
                {showErrorModal && (
                    <motion.div
                        className="forgot-password-error-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowErrorModal(false)}
                    >
                        <motion.div
                            className="forgot-password-error-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="forgot-password-error-icon">
                                <span>⚠️</span>
                            </div>
                            <h2 className="forgot-password-error-title">{errorTitle}</h2>
                            <p className="forgot-password-error-message">{error}</p>
                            <button
                                className="forgot-password-error-button"
                                onClick={() => setShowErrorModal(false)}
                            >
                                Got It
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Glassmorphism Success Modal */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div
                        className="forgot-password-success-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowSuccessModal(false)}
                    >
                        <motion.div
                            className="forgot-password-success-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="forgot-password-success-icon">
                                <span>✅</span>
                            </div>
                            <h2 className="forgot-password-success-title">{successTitle}</h2>
                            <p className="forgot-password-success-message">{successMessage}</p>
                            <button
                                className="forgot-password-success-button"
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    handleNavigateToLogin();
                                }}
                            >
                                Continue
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Glassmorphism Exit Confirmation Modal */}
            <AnimatePresence>
                {showExitModal && (
                    <motion.div
                        className="forgot-password-exit-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setShowExitModal(false)}
                    >
                        <motion.div
                            className="forgot-password-exit-modal"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="forgot-password-exit-icon">
                                <span>🚪</span>
                            </div>
                            <h2 className="forgot-password-exit-title">Exit Password Recovery?</h2>
                            <p className="forgot-password-exit-message">
                                Your progress will be lost and any verification codes will be invalidated.
                            </p>
                            <div className="forgot-password-exit-buttons">
                                <button
                                    className="forgot-password-exit-cancel"
                                    onClick={() => setShowExitModal(false)}
                                >
                                    Continue Recovery
                                </button>
                                <button
                                    className="forgot-password-exit-confirm"
                                    onClick={handleConfirmExit}
                                >
                                    Exit & Clear
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
