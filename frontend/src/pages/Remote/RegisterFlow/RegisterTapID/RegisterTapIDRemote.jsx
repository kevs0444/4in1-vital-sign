import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBack, Visibility, VisibilityOff, Warning } from '@mui/icons-material';

// Import centralized API function
import { registerUser } from '../../../../utils/api';
import { validateEmail } from '../../../../utils/validators';

const RegisterTapIDRemote = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Guard: Check for previous step data
    useEffect(() => {
        if (!location.state?.personalInfo) {
            navigate('/register/welcome', { replace: true });
        }
    }, [location, navigate]);
    const userRole = location.state?.userType || "rtu-students";
    const personalInfo = location.state?.personalInfo || {};

    const [currentStep, setCurrentStep] = useState(0); // 0: ID, 1: Contact
    const [isLoading, setIsLoading] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        idNumber: "",
        email: "",
        password: "",
        confirmPassword: ""
    });

    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");

    // Modals
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [duplicateMessage, setDuplicateMessage] = useState("");
    const [duplicateTitle, setDuplicateTitle] = useState("Already Registered"); // New Title State

    const emailDomains = ["gmail.com", "yahoo.com", "outlook.com", "rtu.edu.ph", "icloud.com"];

    // Role Settings
    const getRoleSettings = (type) => {
        switch (type) {
            case 'nurse':
            case 'doctor':
                return {
                    label: "License Number",
                    placeholder: "e.g., 1234-5678",
                    hint: "Numbers and hyphens only"
                };
            case 'rtu-employees':
                return {
                    label: "Employee Number",
                    placeholder: "e.g., 2023-001",
                    hint: "Numbers and hyphens only"
                };
            case 'rtu-students':
            default:
                return {
                    label: "Student Number",
                    placeholder: "e.g., 2022-200901",
                    hint: "Numbers and hyphens only"
                };
        }
    };
    const roleSettings = getRoleSettings(userRole);

    const handleDomainSelect = (domain) => {
        const [username] = formData.email.split('@');
        setFormData(prev => ({ ...prev, email: `${username}@${domain}` }));
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
        setError("");
    };

    // Step 0 Validation: ID Number Check
    const validateStep0 = async () => {
        if (!formData.idNumber.trim()) {
            setError(`Please enter your ${roleSettings.label}.`);
            return false;
        }
        // Basic format check
        if (!/^[0-9-]+$/.test(formData.idNumber)) {
            setError("Only numbers and hyphens are allowed.");
            return false;
        }

        setIsLoading(true);
        try {
            // Check for duplicate school number
            // Use relative path /api to ensure it works via Proxy/Funnel
            const checkResponse = await fetch(`/api/register/check-school-number/${encodeURIComponent(formData.idNumber)}`);
            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                setDuplicateTitle(roleSettings.label + " Already Registered");
                setDuplicateMessage("This ID number is identified with an existing user. Please contact support if this is an error.");
                setShowDuplicateModal(true);
                setIsLoading(false);
                return false;
            }
            setIsLoading(false);
            return true;
        } catch (err) {
            console.error("ID Check Error:", err);
            // Proceed with warning if check fails? Better to allow proceeding incase of network glitch, 
            // the final register call will catch duplicates too.
            // But let's return true to let them try.
            setIsLoading(false);
            return true;
        }
    };

    // Step 2 Validation: Contact Info
    const validateStep1 = async () => {
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) {
            setError(emailValidation.error);
            return false;
        }
        if (!formData.password || formData.password.length < 6) {
            setError("Password must be at least 6 characters.");
            return false;
        }
        if (formData.password !== formData.confirmPassword) {
            setError("Passwords do not match.");
            return false;
        }

        setIsLoading(true);
        try {
            // Check for duplicate email
            const checkResponse = await fetch(`/api/register/check-email/${encodeURIComponent(formData.email)}`);
            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                setDuplicateTitle("Email Already Registered");
                setDuplicateMessage("This email address is already in use. Please login or use a different email.");
                setShowDuplicateModal(true);
                setIsLoading(false);
                return false;
            }
            setIsLoading(false);
            return true;
        } catch (err) {
            console.error("Email Check Error:", err);
            setIsLoading(false);
            return true;
        }
    };

    const rfidDataRef = useRef('');
    const rfidTimeoutRef = useRef(null);

    // Track state for event listener
    const stateRef = useRef({
        currentStep,
        isScanning: false // No visual scanning state in remote, but logic remains
    });

    useEffect(() => {
        stateRef.current = { currentStep, isScanning: isLoading };
    }, [currentStep, isLoading]);

    const handleGlobalKeyDown = useCallback((e) => {
        const currentState = stateRef.current;

        // Only listen in Step 2
        if (currentState.currentStep !== 2 || currentState.isScanning) return;

        // RFID scanners send 'Enter' after code
        if (e.key === 'Enter') {
            if (rfidDataRef.current.length >= 5) {
                processRfidScan(rfidDataRef.current);
                rfidDataRef.current = '';
                e.preventDefault();
            }
        } else if (e.key.length === 1 && /[a-zA-Z0-9]/.test(e.key)) {
            rfidDataRef.current += e.key;

            // Auto-detect fast typing (scanner behavior)
            if (rfidDataRef.current.length >= 8) {
                clearTimeout(rfidTimeoutRef.current);
                rfidTimeoutRef.current = setTimeout(() => {
                    if (rfidDataRef.current.length >= 8) {
                        processRfidScan(rfidDataRef.current);
                        rfidDataRef.current = '';
                    }
                }, 50);
            }
        }
    }, []);

    useEffect(() => {
        if (currentStep === 2) {
            document.addEventListener('keydown', handleGlobalKeyDown);
            return () => document.removeEventListener('keydown', handleGlobalKeyDown);
        }
    }, [currentStep, handleGlobalKeyDown]);

    const processRfidScan = async (scannedCode) => {
        console.log("🔔 Smart RFID Detected:", scannedCode);
        setIsLoading(true);

        try {
            // Check for duplicate RFID
            const checkResponse = await fetch(`/api/register/check-rfid/${encodeURIComponent(scannedCode)}`);
            const checkResult = await checkResponse.json();

            if (checkResult.exists) {
                setDuplicateTitle("Card Already Registered");
                setDuplicateMessage("This RFID card is already associated with another user.");
                setShowDuplicateModal(true);
                setIsLoading(false);
            } else {
                // Success! Use this code
                submitRegistration(scannedCode);
            }
        } catch (err) {
            console.error("RFID Check Error:", err);
            // If check fails, maybe let them proceed? Or fail safe?
            // Fail safe prevents bad data.
            setError("Could not verify card. Please try again or skip.");
            setIsLoading(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === 0) {
            const isValid = await validateStep0();
            if (isValid) setCurrentStep(1);
        } else if (currentStep === 1) {
            const isValid = await validateStep1();
            if (isValid) setCurrentStep(2);
        }
    };

    const submitRegistration = async (rfidCode = null) => {
        setIsLoading(true);
        setError("");

        try {
            // Prepare Data for RegisterDataSaved Page to handle
            // Normalize userType for backend
            let normalizedUserType = userRole;
            if (userRole === 'rtu-employees') normalizedUserType = 'employee';
            if (userRole === 'rtu-students') normalizedUserType = 'student';

            // Ensure rfidCode is explicitly null if event or other obj passed
            const finalRfid = (typeof rfidCode === 'string') ? rfidCode : null;

            const completeRegistrationData = {
                userType: normalizedUserType,
                personalInfo: personalInfo,
                idNumber: formData.idNumber, // Passed as 'idNumber'
                password: formData.password,
                email: formData.email,
                rfidCode: finalRfid,
                registrationDate: new Date().toISOString()
            };

            // Navigate to Saved Page (which calls API)
            navigate("/register/saved", {
                state: completeRegistrationData
            });

        } catch (err) {
            console.error("Registration prep error:", err);
            setError("An error occurred. Please try again.");
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
            setError("");
        } else {
            // Go back to Personal Info
            navigate(-1);
        }
    };

    return (
        <div style={{
            minHeight: '100dvh',
            width: '100%',
            background: '#f8fafc',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto' // Make scrollable
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
                    onClick={handleBack}
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
                <div style={{ marginLeft: '16px', flex: 1, display: 'flex', alignItems: 'center' }}>
                    {/* 3-Step Progress Bar - Dynamic Width */}
                    <div style={{
                        height: '6px',
                        background: '#e2e8f0',
                        borderRadius: '3px',
                        width: '100%',
                        maxWidth: '200px', // Wider on desktop
                        minWidth: '100px', // Min width for mobile
                        overflow: 'hidden',
                        marginRight: '12px'
                    }}>
                        <div style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)',
                            borderRadius: '3px',
                            width: `${((currentStep + 1) / 3) * 100}%`,
                            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                        }} />
                    </div>
                </div>
                <div style={{
                    fontSize: '0.85rem',
                    color: '#64748b',
                    fontWeight: '600',
                    background: '#f1f5f9',
                    padding: '4px 12px',
                    borderRadius: '12px'
                }}>
                    Step {currentStep + 1} of 3
                </div>
            </div>

            {/* Content Area - Flex Grow & Scrollable */}
            <div style={{
                flex: 1,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                maxWidth: '600px', // Constrain width on large screens
                width: '100%',
                margin: '0 auto', // Center
                overflowY: 'visible' // Let parent handle scroll or just flow
            }}>

                {/* Step 0: ID Number */}
                {currentStep === 0 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            Enter {roleSettings.label}
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>This will be your official identification.</p>

                        <div style={{ marginBottom: '24px' }}>
                            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', fontWeight: '600', color: '#334155' }}>
                                {roleSettings.label}
                            </label>
                            <input
                                type="text"
                                name="idNumber"
                                value={formData.idNumber}
                                onChange={handleChange}
                                placeholder={roleSettings.placeholder}
                                style={{
                                    width: '100%',
                                    padding: '16px',
                                    fontSize: '1.1rem',
                                    border: '2px solid #e2e8f0',
                                    borderRadius: '16px',
                                    outline: 'none',
                                    background: 'white'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                            />
                            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '8px' }}>
                                {roleSettings.hint}
                            </p>

                            {/* NO SKIP BUTTON HERE - Match Kiosk Logic */}
                        </div>
                    </motion.div>
                )}

                {/* Step 1: Contact Info */}
                {currentStep === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            Secure your account
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '24px' }}>Set up your email and password.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
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
                                        background: 'white'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                                {formData.email.includes('@') && !formData.email.includes('.', formData.email.indexOf('@') + 2) && (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
                                        {emailDomains.map((domain) => (
                                            <button
                                                key={domain}
                                                type="button"
                                                onClick={() => handleDomainSelect(domain)}
                                                style={{
                                                    padding: '6px 12px',
                                                    background: '#f1f5f9',
                                                    border: '1px solid #cbd5e1',
                                                    borderRadius: '20px',
                                                    fontSize: '0.85rem',
                                                    color: '#334155',
                                                    cursor: 'pointer'
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
                                            background: 'white'
                                        }}
                                        onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                                            border: 'none', background: 'none', color: '#94a3b8', cursor: 'pointer'
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
                                        background: 'white'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Register ID ('Smart' - Allows Tap) */}
                {currentStep === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            Register your ID
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>Link your physical ID card.</p>

                        <div style={{
                            background: '#f1f5f9',
                            padding: '30px 20px',
                            borderRadius: '20px',
                            textAlign: 'center',
                            border: '2px dashed #cbd5e1'
                        }}>
                            <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📱</div>
                            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', color: '#334155', marginBottom: '8px' }}>
                                Tap to Register
                            </h3>
                            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5' }}>
                                If you have a USB reader, tap your card now.
                                <br />Otherwise, you can skip this step.
                            </p>
                        </div>
                    </motion.div>
                )}

                {error && (
                    <div style={{
                        marginTop: '24px',
                        padding: '12px',
                        background: '#fee2e2',
                        borderRadius: '12px',
                        color: '#dc2626',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        textAlign: 'center'
                    }}>
                        {error}
                    </div>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '32px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                    {/* Primary Button */}
                    <button
                        onClick={() => currentStep === 2 ? submitRegistration(null) : handleNext()}
                        disabled={isLoading}
                        style={{
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
                        {isLoading ? "Processing..." : (currentStep === 2 ? "Finish Registration" : "Next")}
                    </button>

                    {/* Secondary Button - Only for Step 2 */}
                    {currentStep === 2 && (
                        <button
                            onClick={() => submitRegistration(null)}
                            disabled={isLoading}
                            style={{
                                width: '100%',
                                padding: '16px',
                                background: 'transparent',
                                color: '#64748b',
                                border: 'none',
                                borderRadius: '16px',
                                fontSize: '1rem',
                                fontWeight: '600',
                                cursor: isLoading ? 'not-allowed' : 'pointer'
                            }}
                        >
                            I don't have an ID card
                        </button>
                    )}
                </div>

            </div>

            {/* Duplicate / Error Modal */}
            <AnimatePresence>
                {showDuplicateModal && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        background: 'rgba(0,0,0,0.5)', zIndex: 50,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px'
                    }} onClick={() => setShowDuplicateModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'white', borderRadius: '24px', padding: '32px 24px',
                                width: '100%', maxWidth: '400px',
                                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', textAlign: 'center'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <div style={{
                                width: '64px', height: '64px', background: '#fef2f2', color: '#ef4444',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px'
                            }}>
                                <Warning style={{ fontSize: '32px' }} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                                {duplicateTitle}
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                                {duplicateMessage}
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <button
                                    onClick={() => navigate('/login')}
                                    style={{
                                        width: '100%', padding: '16px', background: '#ef4444', color: 'white',
                                        border: 'none', borderRadius: '16px', fontSize: '1rem', fontWeight: '700', cursor: 'pointer'
                                    }}
                                >
                                    Log In Instead
                                </button>
                                <button
                                    onClick={() => setShowDuplicateModal(false)}
                                    style={{
                                        width: '100%', padding: '16px', background: 'transparent', color: '#64748b',
                                        border: 'none', fontSize: '1rem', fontWeight: '600', cursor: 'pointer'
                                    }}
                                >
                                    Close & Edit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default RegisterTapIDRemote;
