import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowBack, Visibility, VisibilityOff } from '@mui/icons-material';

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
            // Prepare payload matching backend expectations
            const payload = {
                firstName: personalInfo.firstName,
                lastName: personalInfo.lastName,
                birthDate: `${personalInfo.birthYear}-${String(personalInfo.birthMonth).padStart(2, '0')}-${String(personalInfo.birthDay).padStart(2, '0')}`,
                sex: personalInfo.sex,
                role: userRole,

                schoolNumber: formData.schoolId, // Backend likely expects 'schoolNumber' or 'id_number'
                email: formData.email,
                password: formData.password,

                // Remote users don't have RFID initially
                rfid_code: null
            };

            const response = await registerUser(payload);

            if (response.success) {
                navigate('/register/saved');
            } else {
                setError(response.message || "Registration failed. Please try again.");
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
        </div>
    );
};

export default RegisterTapIDRemote;
