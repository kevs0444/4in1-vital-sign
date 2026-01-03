import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Visibility, VisibilityOff, ArrowBack, CheckCircle } from '@mui/icons-material';
import logo from '../../../assets/images/juan.png';

const getDynamicApiUrl = () => {
    // Return relative path to route through proxy (dev) or same-origin (production)
    // This handles local kiosk, remote Access (VPN), and Funnel (HTTPS) correctly
    return '/api';
};

const API_BASE_URL = getDynamicApiUrl();

const ForgotPasswordRemote = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(1); // 1: Enter Email/ID, 2: Enter OTP, 3: New Password, 4: Success
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [errorTitle, setErrorTitle] = useState('Error');
    const [successMessage, setSuccessMessage] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // OTP Management
    const [otpCooldown, setOtpCooldown] = useState(0);
    const [lastRequestedIdentifier, setLastRequestedIdentifier] = useState('');
    const [timeLeft, setTimeLeft] = useState(0);

    // Cooldown timer
    useEffect(() => {
        if (otpCooldown > 0) {
            const timer = setTimeout(() => setOtpCooldown(otpCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [otpCooldown]);

    // OTP Expiration timer
    useEffect(() => {
        if (step === 2 && timeLeft > 0) {
            const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [timeLeft, step]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    };

    const handleSendOTP = async (e) => {
        if (e) e.preventDefault();

        if (!identifier.trim()) {
            setErrorTitle('Missing Information');
            setError('Please enter your School Number or Email');
            setShowErrorModal(true);
            return;
        }

        if (lastRequestedIdentifier === identifier && otpCooldown > 0) {
            setErrorTitle('Please Wait');
            setError(`Please wait ${otpCooldown} seconds before requesting another code.`);
            setShowErrorModal(true);
            return;
        }

        setIsLoading(true);
        setError('');

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
                setOtp('');
                setOtpCooldown(60);
                setTimeLeft(data.expires_in || 600);
                setLastRequestedIdentifier(identifier);
            } else {
                setErrorTitle('Unable to Send Code');
                setError(data.message || 'Failed to send OTP. Please try again.');
                setShowErrorModal(true);
            }
        } catch (err) {
            setErrorTitle('Network Error');
            setError('Network error. Please check your connection.');
            setShowErrorModal(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        if (e) e.preventDefault();

        if (!otp.trim() || otp.length < 6) {
            setErrorTitle('Invalid Code');
            setError('Please enter the complete 6-digit verification code.');
            setShowErrorModal(true);
            return;
        }

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

    const handleResetPassword = async (e) => {
        if (e) e.preventDefault();

        if (newPassword !== confirmPassword) {
            setErrorTitle('Password Mismatch');
            setError('Passwords do not match');
            setShowErrorModal(true);
            return;
        }

        if (newPassword.length < 6) {
            setErrorTitle('Password Too Short');
            setError('Password must be at least 6 characters');
            setShowErrorModal(true);
            return;
        }

        setIsLoading(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier, otp, newPassword })
            });

            const data = await response.json();

            if (data.success) {
                setStep(4);
                setShowSuccessModal(true);
                setTimeout(() => {
                    navigate('/login');
                }, 2500);
            } else {
                setErrorTitle('Reset Failed');
                setError(data.message || 'Failed to reset password.');
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

    // Shared Styles
    const containerStyle = {
        minHeight: '100dvh',
        width: '100%',
        background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif"
    };

    const cardStyle = {
        width: '100%',
        maxWidth: '420px',
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '24px',
        padding: '32px 28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255, 255, 255, 0.8)'
    };

    const inputStyle = {
        width: '100%',
        padding: '16px 18px',
        fontSize: '1rem',
        border: '2px solid #e2e8f0',
        borderRadius: '14px',
        outline: 'none',
        transition: 'all 0.2s ease',
        background: '#f8fafc'
    };

    const buttonStyle = {
        width: '100%',
        padding: '16px',
        background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
        color: 'white',
        border: 'none',
        borderRadius: '14px',
        fontSize: '1.05rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: '0 4px 15px rgba(220, 38, 38, 0.3)'
    };

    return (
        <div style={containerStyle}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                style={cardStyle}
            >
                {/* Back Button */}
                <button
                    onClick={() => navigate('/login')}
                    style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#64748b',
                        fontSize: '0.95rem',
                        marginBottom: '20px',
                        padding: '0'
                    }}
                >
                    <ArrowBack fontSize="small" /> Back to Login
                </button>

                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                    <img src={logo} alt="4 in Juan" style={{ height: '60px', marginBottom: '16px' }} />
                    <h1 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#1e293b', margin: '0 0 8px 0' }}>
                        {step === 1 && <>Account <span style={{ color: '#dc2626' }}>Recovery</span></>}
                        {step === 2 && <>Verify <span style={{ color: '#dc2626' }}>Identity</span></>}
                        {step === 3 && <>Reset <span style={{ color: '#dc2626' }}>Password</span></>}
                        {step === 4 && <>Password <span style={{ color: '#22c55e' }}>Updated!</span></>}
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '0.95rem', margin: 0 }}>
                        {step === 1 && "Enter your School Number or Email"}
                        {step === 2 && (successMessage || "Enter the 6-digit code sent to your email")}
                        {step === 3 && "Create a new strong password"}
                        {step === 4 && "Redirecting to login..."}
                    </p>
                    {step === 2 && timeLeft > 0 && (
                        <p style={{
                            marginTop: '8px',
                            fontWeight: '600',
                            color: timeLeft < 60 ? '#dc2626' : '#4b5563'
                        }}>
                            Code expires in: {formatTime(timeLeft)}
                        </p>
                    )}
                    {step === 2 && timeLeft === 0 && (
                        <p style={{ marginTop: '8px', fontWeight: '600', color: '#dc2626' }}>
                            ⚠️ Code Expired
                        </p>
                    )}
                </div>

                {/* Progress Steps */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: '20px',
                    marginBottom: '28px'
                }}>
                    {[1, 2, 3].map((s) => (
                        <div key={s} style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            opacity: step >= s ? 1 : 0.4
                        }}>
                            <div style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontWeight: '700',
                                fontSize: '0.9rem',
                                background: step > s ? '#22c55e' : step === s ? '#dc2626' : '#e2e8f0',
                                color: step >= s ? 'white' : '#94a3b8'
                            }}>
                                {step > s ? '✓' : s}
                            </div>
                            <span style={{
                                fontSize: '0.75rem',
                                marginTop: '6px',
                                color: step >= s ? '#334155' : '#94a3b8',
                                fontWeight: step === s ? '600' : '400'
                            }}>
                                {s === 1 ? 'Identify' : s === 2 ? 'Verify' : 'Reset'}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Step 1: Enter Identifier */}
                {step === 1 && (
                    <form onSubmit={handleSendOTP}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                                School Number or Email
                            </label>
                            <input
                                type="text"
                                style={inputStyle}
                                placeholder="e.g. 2023-12345 or student@email.com"
                                value={identifier}
                                onChange={(e) => setIdentifier(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                ...buttonStyle,
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Sending...' :
                                lastRequestedIdentifier === identifier && otpCooldown > 0 ?
                                    `Wait ${otpCooldown}s to resend` : 'Send Verification Code'}
                        </button>
                    </form>
                )}

                {/* Step 2: Enter OTP */}
                {step === 2 && (
                    <form onSubmit={handleVerifyOTP}>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155', textAlign: 'center' }}>
                                Verification Code
                            </label>
                            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                                {[0, 1, 2, 3, 4, 5].map((idx) => (
                                    <div
                                        key={idx}
                                        style={{
                                            width: '45px',
                                            height: '55px',
                                            border: `2px solid ${otp[idx] ? '#dc2626' : '#e2e8f0'}`,
                                            borderRadius: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '1.5rem',
                                            fontWeight: '700',
                                            color: '#1e293b',
                                            background: otp[idx] ? '#fef2f2' : '#f8fafc'
                                        }}
                                    >
                                        {otp[idx] || ''}
                                    </div>
                                ))}
                            </div>
                            <input
                                type="text"
                                style={{ ...inputStyle, marginTop: '16px', textAlign: 'center', letterSpacing: '8px', fontSize: '1.2rem' }}
                                placeholder="Enter code"
                                value={otp}
                                onChange={(e) => setOtp(e.target.value.toUpperCase().slice(0, 6))}
                                maxLength={6}
                                autoFocus
                            />
                        </div>
                        <button
                            type="submit"
                            style={{
                                ...buttonStyle,
                                opacity: (isLoading || timeLeft === 0) ? 0.7 : 1,
                                cursor: (isLoading || timeLeft === 0) ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isLoading || timeLeft === 0}
                        >
                            {isLoading ? 'Verifying...' : timeLeft === 0 ? 'Code Expired' : 'Verify Code'}
                        </button>
                        {timeLeft === 0 && (
                            <button
                                type="button"
                                onClick={() => { setStep(1); setOtp(''); }}
                                style={{
                                    ...buttonStyle,
                                    background: '#6b7280',
                                    marginTop: '12px',
                                    boxShadow: 'none'
                                }}
                            >
                                Start Over
                            </button>
                        )}
                    </form>
                )}

                {/* Step 3: New Password */}
                {step === 3 && (
                    <form onSubmit={handleResetPassword}>
                        <div style={{ marginBottom: '16px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                                New Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    style={{ ...inputStyle, paddingRight: '50px' }}
                                    placeholder="Min. 6 characters"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    autoFocus
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </div>
                            {/* Password Strength */}
                            {newPassword.length > 0 && (
                                <div style={{ marginTop: '10px' }}>
                                    <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
                                        {[1, 2, 3].map((level) => (
                                            <div
                                                key={level}
                                                style={{
                                                    flex: 1,
                                                    height: '6px',
                                                    borderRadius: '3px',
                                                    background: level <= passwordStrength.score ? passwordStrength.color : '#e2e8f0'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <span style={{ fontSize: '0.8rem', color: passwordStrength.color, fontWeight: '600' }}>
                                        {passwordStrength.label}
                                    </span>
                                </div>
                            )}
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: '#334155' }}>
                                Confirm Password
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    style={{ ...inputStyle, paddingRight: '50px' }}
                                    placeholder="Confirm your password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    style={{
                                        position: 'absolute',
                                        right: '14px',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        color: '#64748b'
                                    }}
                                >
                                    {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </div>
                            {confirmPassword.length > 0 && (
                                <p style={{
                                    fontSize: '0.85rem',
                                    marginTop: '8px',
                                    color: newPassword === confirmPassword ? '#22c55e' : '#ef4444',
                                    fontWeight: '500'
                                }}>
                                    {newPassword === confirmPassword ? '✓ Passwords match' : '✗ Passwords do not match'}
                                </p>
                            )}
                        </div>
                        <button
                            type="submit"
                            style={{
                                ...buttonStyle,
                                opacity: isLoading ? 0.7 : 1,
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </form>
                )}

                {/* Step 4: Success */}
                {step === 4 && (
                    <div style={{ textAlign: 'center', padding: '20px 0' }}>
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', stiffness: 200 }}
                        >
                            <CheckCircle style={{ fontSize: '80px', color: '#22c55e' }} />
                        </motion.div>
                        <p style={{ marginTop: '16px', color: '#64748b' }}>
                            Redirecting to login...
                        </p>
                    </div>
                )}
            </motion.div>

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
                    zIndex: 1000,
                    padding: '20px'
                }} onClick={() => setShowErrorModal(false)}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '28px',
                            maxWidth: '340px',
                            width: '100%',
                            textAlign: 'center'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: '#fef2f2',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            fontSize: '24px'
                        }}>
                            ⚠️
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '700', color: '#dc2626' }}>
                            {errorTitle}
                        </h3>
                        <p style={{ margin: '0 0 24px 0', fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5' }}>
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

            {/* Success Modal */}
            {showSuccessModal && (
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
                    zIndex: 1000,
                    padding: '20px'
                }}>
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        style={{
                            background: 'white',
                            borderRadius: '20px',
                            padding: '28px',
                            maxWidth: '340px',
                            width: '100%',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: '#dcfce7',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            fontSize: '24px'
                        }}>
                            ✓
                        </div>
                        <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem', fontWeight: '700', color: '#16a34a' }}>
                            Password Reset Successful!
                        </h3>
                        <p style={{ margin: '0', fontSize: '0.95rem', color: '#64748b', lineHeight: '1.5' }}>
                            Your password has been updated. Redirecting to login...
                        </p>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default ForgotPasswordRemote;
