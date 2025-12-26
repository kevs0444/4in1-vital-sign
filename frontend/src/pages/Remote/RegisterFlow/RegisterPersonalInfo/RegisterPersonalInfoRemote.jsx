import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowBack } from '@mui/icons-material';

// Import icons (4 levels up -> src)
import maleIcon from "../../../../assets/icons/male-icon.png";
import femaleIcon from "../../../../assets/icons/female-icon.png";

const RegisterPersonalInfoRemote = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const userRole = location.state?.userType || "rtu-students";

    // State
    const [step, setStep] = useState(1); // 1: Name, 2: Birthday, 3: Sex
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        birthYear: "",
        birthMonth: "",
        birthDay: "",
        sex: ""
    });
    const [error, setError] = useState("");

    const handleNext = () => {
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
            if (year < 1920 || year > new Date().getFullYear()) {
                setError("Please enter a valid year.");
                return;
            }
            setStep(3);
        } else if (step === 3) {
            if (!formData.sex) {
                setError("Please select your biological sex.");
                return;
            }
            // Complete
            navigate('/register/tapid', {
                state: {
                    userType: userRole,
                    personalInfo: formData
                }
            });
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
            setError("");
        } else {
            navigate('/register/role');
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
                overflowY: 'auto',
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
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>First Name</label>
                                <input
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                    placeholder="e.g. Juan"
                                    style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none' }}
                                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Last Name</label>
                                <input
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                    placeholder="e.g. Dela Cruz"
                                    style={{ width: '100%', padding: '16px', fontSize: '1.1rem', borderRadius: '12px', border: '2px solid #e2e8f0', outline: 'none' }}
                                    onFocus={(e) => e.target.style.borderColor = '#ef4444'}
                                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                                />
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
                        <p style={{ color: '#64748b', marginBottom: '32px' }}>We use this to calculate your age.</p>

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
                                <input
                                    type="number"
                                    placeholder="Day"
                                    value={formData.birthDay}
                                    onChange={(e) => setFormData({ ...formData, birthDay: e.target.value })}
                                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1rem' }}
                                />
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', color: '#334155', marginBottom: '8px' }}>Year</label>
                                <input
                                    type="number"
                                    placeholder="Year"
                                    value={formData.birthYear}
                                    onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
                                    style={{ width: '100%', padding: '16px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '1rem' }}
                                />
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
                        {step === 3 ? "Complete Registration" : "Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RegisterPersonalInfoRemote;
