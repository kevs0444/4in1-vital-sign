import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowBack, Warning } from '@mui/icons-material';

// Import icons (4 levels up -> src)
import maleIcon from "../../../../assets/icons/male-icon.png";
import femaleIcon from "../../../../assets/icons/female-icon.png";

// Local URL helper removed to prevent port 5000 errors on remote
// All API calls now use relative '/api' path to work with Proxy and Tailscale Funnel

const RegisterPersonalInfoRemote = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = location.state?.userType;

    // Guard: Redirect if skipping steps
    useEffect(() => {
        if (!userRole) {
            navigate('/register/welcome', { replace: true });
        }
    }, [userRole, navigate]);

    // State
    const [step, setStep] = useState(1); // 1: Name, 2: Birthday, 3: Sex
    const [formData, setFormData] = useState({
        firstName: "",
        middleName: "",
        lastName: "",
        suffix: "",
        birthYear: "",
        birthMonth: "",
        birthDay: "",
        sex: ""
    });
    const [error, setError] = useState("");
    const [isChecking, setIsChecking] = useState(false);

    // Modals
    const [showDuplicateModal, setShowDuplicateModal] = useState(false);
    const [showExitModal, setShowExitModal] = useState(false);
    const [showAgeWarningModal, setShowAgeWarningModal] = useState(false);

    const handleNext = async () => {
        setError("");
        if (step === 1) {
            if (!formData.firstName.trim() || !formData.lastName.trim()) {
                setError("Please enter your full name.");
                return;
            }
            setStep(2);
        } else if (step === 2) {
            if (!formData.birthYear || !formData.birthMonth || !formData.birthDay) {
                setError("Please enter a valid birthday.");
                return;
            }
            // Basic validation
            const year = parseInt(formData.birthYear);
            const month = parseInt(formData.birthMonth);
            const day = parseInt(formData.birthDay);
            if (year < 1900 || year > new Date().getFullYear()) {
                setError("Please enter a valid year.");
                return;
            }
            if (month < 1 || month > 12) {
                setError("Please enter a valid month (1-12).");
                return;
            }
            // Age Calculation and Limit Check
            const today = new Date();
            const birthDate = new Date(year, month - 1, day);
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }

            if (age < 12) {
                setError("For medical accuracy, this system is restricted to users 12 years and older.");
                return;
            }
            if (age >= 12 && age <= 15) {
                setShowAgeWarningModal(true);
                return;
            }
            if (age > 99) {
                setError("Please enter a valid age.");
                return;
            }

            setStep(3);
        } else if (step === 3) {
            if (!formData.sex) {
                setError("Please select your biological sex.");
                return;
            }

            // Check for duplicate personal info before proceeding
            setIsChecking(true);
            try {
                // Calculate age for the check
                const today = new Date();
                const birthDate = new Date(formData.birthYear, formData.birthMonth - 1, formData.birthDay);
                let age = today.getFullYear() - birthDate.getFullYear();
                const monthDiff = today.getMonth() - birthDate.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }

                const checkResponse = await fetch(`/api/register/check-personal-info`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        firstname: formData.firstName.trim(),
                        middlename: formData.middleName.trim(),
                        lastname: formData.lastName.trim(),
                        suffix: formData.suffix,
                        age: age,
                        sex: formData.sex,
                        birthMonth: formData.birthMonth,
                        birthDay: formData.birthDay,
                        birthYear: formData.birthYear
                    })
                });

                const checkResult = await checkResponse.json();

                if (checkResult.exists) {
                    setShowDuplicateModal(true);
                    setIsChecking(false);
                    return;
                }

                // Proceed if no duplicate
                navigate('/register/tapid', {
                    state: {
                        userType: userRole,
                        personalInfo: {
                            ...formData,
                            age: age // Include calculated age
                        }
                    }
                });

            } catch (err) {
                console.error("Error checking personal info:", err);
                // On error, we might choose to proceed or block. 
                // Usually safer to warn but let proceed if network issue? 
                // Or block to prevent data issues. Let's block with a retry message.
                setError("Network error validating information. Please try again.");
            } finally {
                setIsChecking(false);
            }
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setError("");
        } else {
            // Confirm exit if on first step
            setShowExitModal(true);
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
                <div style={{ marginLeft: '16px', flex: 1 }}>
                    <div style={{ height: '4px', background: '#e2e8f0', borderRadius: '2px', width: '100%', maxWidth: '120px' }}>
                        <div style={{
                            height: '100%',
                            background: '#ef4444', // Red-500
                            borderRadius: '2px',
                            width: `${(step / 3) * 100}%`,
                            transition: 'width 0.3s ease'
                        }} />
                    </div>
                </div>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8', fontWeight: '600' }}>
                    {step}/3
                </div>
            </div>

            {/* Content Area */}
            <div style={{
                flex: 1,
                padding: '24px',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Step specific content */}

                {/* Step 1: Name */}
                {step === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            What's your name?
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>Enter your real legal name.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>First Name</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        placeholder="Juan"
                                        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none' }}
                                        onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Middle Name</label>
                                    <input
                                        type="text"
                                        value={formData.middleName}
                                        onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
                                        placeholder="Santos"
                                        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none' }}
                                        onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <div style={{ flex: 2 }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Last Name</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        placeholder="Dela Cruz"
                                        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none' }}
                                        onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Suffix</label>
                                    <select
                                        value={formData.suffix}
                                        onChange={(e) => setFormData({ ...formData, suffix: e.target.value })}
                                        style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none', backgroundColor: 'white' }}
                                        onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                        onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                    >
                                        <option value="">None</option>
                                        {["Jr.", "Sr.", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "MD", "PhD", "DDS", "DVM", "JD", "Esq.", "CPA", "RN", "PE"].map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Birthday */}
                {step === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            When were you born?
                        </h2>
                        {/* Status / Age Display */}
                        <div style={{ marginBottom: '32px' }}>
                            <p style={{ color: '#64748b', margin: 0 }}>We use this to calculate your age.</p>
                            {formData.birthYear && formData.birthMonth && formData.birthDay && (
                                <div style={{
                                    marginTop: '12px',
                                    display: 'inline-block',
                                    padding: '6px 16px',
                                    background: '#f1f5f9',
                                    borderRadius: '20px',
                                    color: '#334155',
                                    fontWeight: '600',
                                    fontSize: '0.9rem'
                                }}>
                                    Age: {(() => {
                                        const today = new Date();
                                        const birthDate = new Date(formData.birthYear, formData.birthMonth - 1, formData.birthDay);
                                        let age_now = today.getFullYear() - birthDate.getFullYear();
                                        const m = today.getMonth() - birthDate.getMonth();
                                        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                            age_now--;
                                        }
                                        return age_now;
                                    })()}
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{ flex: 2 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Month</label>
                                <select
                                    value={formData.birthMonth}
                                    onChange={(e) => setFormData({ ...formData, birthMonth: e.target.value })}
                                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '1rem' }}
                                >
                                    <option value="">Month</option>
                                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                        <option key={m} value={m}>{new Date(0, m - 1).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Day</label>
                                <select
                                    value={formData.birthDay}
                                    onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })}
                                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '1rem' }}
                                >
                                    <option value="">Day</option>
                                    {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                                        <option key={d} value={d}>{d}</option>
                                    ))}
                                </select>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Year</label>
                                <select
                                    value={formData.birthYear}
                                    onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', background: 'white', fontSize: '1rem' }}
                                >
                                    <option value="">Year</option>
                                    {Array.from({ length: 125 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                        <option key={y} value={y}>{y}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Sex */}
                {step === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            What's your sex?
                        </h2>
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>Select your biological sex.</p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div
                                onClick={() => setFormData({ ...formData, sex: 'Male' })}
                                style={{
                                    padding: '24px',
                                    borderRadius: '20px',
                                    border: `2px solid ${formData.sex === 'Male' ? '#3b82f6' : '#e2e8f0'}`,
                                    background: formData.sex === 'Male' ? '#eff6ff' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <img src={maleIcon} alt="Male" style={{ width: '48px', height: '48px' }} />
                                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>Male</span>
                            </div>

                            <div
                                onClick={() => setFormData({ ...formData, sex: 'Female' })}
                                style={{
                                    padding: '24px',
                                    borderRadius: '20px',
                                    border: `2px solid ${formData.sex === 'Female' ? '#ec4899' : '#e2e8f0'}`,
                                    background: formData.sex === 'Female' ? '#fdf2f8' : 'white',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '20px',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                <img src={femaleIcon} alt="Male" style={{ width: '48px', height: '48px' }} />
                                <span style={{ fontSize: '1.2rem', fontWeight: '700', color: '#1e293b' }}>Female</span>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error Message */}
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

                {/* Continue Button */}
                <div style={{ marginTop: 'auto', paddingTop: '32px' }}>
                    <button
                        onClick={handleNext}
                        style={{
                            width: '100%',
                            padding: '18px',
                            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)', // Red gradient
                            color: 'white',
                            border: 'none',
                            borderRadius: '16px',
                            fontSize: '1.1rem',
                            fontWeight: '700',
                            cursor: 'pointer',
                            boxShadow: '0 8px 20px -6px rgba(220, 38, 38, 0.4)',
                            transition: 'transform 0.2s'
                        }}
                    >
                        {step === 3 ? (isChecking ? "Checking..." : "Next") : "Continue"}
                    </button>
                </div>
            </div>
            {/* ===================== MODALS ===================== */}
            <AnimatePresence>
                {/* Duplicate User Modal */}
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
                                Already Registered
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                                A user with this name, birthday, and sex already exists in our system.
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
                                    Close & Check Info
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}

                {/* Exit Confirmation Modal */}
                {showExitModal && (
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
                    }} onClick={() => setShowExitModal(false)}>
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            style={{
                                background: 'white',
                                borderRadius: '24px',
                                padding: '32px 24px',
                                width: '100%',
                                maxWidth: '350px',
                                textAlign: 'center'
                            }}
                            onClick={e => e.stopPropagation()}
                        >
                            <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                                Go back to start?
                            </h3>
                            <p style={{ color: '#64748b', marginBottom: '24px' }}>
                                You will lose your current progress.
                            </p>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setShowExitModal(false)}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: '#f1f5f9',
                                        color: '#334155',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '600'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => navigate('/register/role')}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        background: '#ef4444',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '12px',
                                        fontWeight: '600'
                                    }}
                                >
                                    Exit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Age Warning Modal (12-15 years old) */}
            {showAgeWarningModal && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(0,0,0,0.5)',
                    zIndex: 51, // Higher than others
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '24px'
                }} onClick={() => setShowAgeWarningModal(false)}>
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
                            boxShadow: '0 20px 30px rgba(0,0,0,0.2)',
                            textAlign: 'center'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{
                            width: '64px',
                            height: '64px',
                            background: '#fff7ed', // Orange-50
                            color: '#ea580c', // Orange-600
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 16px'
                        }}>
                            <span style={{ fontSize: '32px' }}>ℹ️</span>
                        </div>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: '800', color: '#1e293b', marginBottom: '8px' }}>
                            Medical Supervision
                        </h3>
                        <p style={{ color: '#64748b', marginBottom: '24px', lineHeight: '1.5' }}>
                            For users aged <strong>12 to 15</strong>, please ask for assistance from medical staff to ensure accurate sensor readings (e.g., blood pressure cuff fitting).
                        </p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button
                                onClick={() => setShowAgeWarningModal(false)}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: '#f1f5f9',
                                    color: '#334155',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    setShowAgeWarningModal(false);
                                    setStep(3); // Proceed to next step
                                }}
                                style={{
                                    flex: 1,
                                    padding: '14px',
                                    background: '#ea580c', // Orange
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '12px',
                                    fontWeight: '700',
                                    cursor: 'pointer'
                                }}
                            >
                                I Understand
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default RegisterPersonalInfoRemote;
