// frontend/src/components/PersonalInfo/PersonalInfo.jsx
// Reusable Personal Info Tab Component for all dashboards
import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Person,
    Edit,
    Save,
    Cancel,
    Visibility,
    VisibilityOff,
    Lock,
    Email,
    Badge,
    Cake,
    Wc,
    School,
    CheckCircle,
    Error as ErrorIcon
} from '@mui/icons-material';
import { getUserProfile, updateUserProfile, changeUserPassword } from '../../utils/api';
import './PersonalInfo.css';

const PersonalInfo = ({ userId, onProfileUpdate, onShowToast }) => {
    // Profile State
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [editedProfile, setEditedProfile] = useState({});
    const [saveLoading, setSaveLoading] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Password Change State
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });

    const fetchProfile = useCallback(async () => {
        try {
            setLoading(true);
            const response = await getUserProfile(userId);
            if (response.success) {
                setProfile(response.user);
                setEditedProfile(response.user);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            setMessage({ text: 'Failed to load profile', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchProfile();
        }
    }, [userId, fetchProfile]);

    const handleEditToggle = () => {
        if (isEditing) {
            // Cancel editing
            setEditedProfile(profile);
        }
        setIsEditing(!isEditing);
        setMessage({ text: '', type: '' });
    };

    const handleInputChange = (field, value) => {
        setEditedProfile(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveProfile = async () => {
        try {
            setSaveLoading(true);
            setMessage({ text: '', type: '' });

            const response = await updateUserProfile(userId, {
                firstname: editedProfile.firstname,
                middlename: editedProfile.middlename,
                lastname: editedProfile.lastname,
                suffix: editedProfile.suffix,
                email: editedProfile.email,
                school_number: editedProfile.school_number
            });

            if (response.success) {
                setProfile({ ...profile, ...response.user });
                setIsEditing(false);
                if (onShowToast) {
                    onShowToast('success', 'Profile Saved', 'Your profile information has been updated successfully.');
                } else {
                    setMessage({ text: 'Profile updated successfully!', type: 'success' });
                }

                // Update localStorage with new data
                const userData = JSON.parse(localStorage.getItem('userData') || '{}');
                const updatedUserData = {
                    ...userData,
                    firstName: response.user.firstname,
                    lastName: response.user.lastname,
                    email: response.user.email,
                    schoolNumber: response.user.school_number
                };
                localStorage.setItem('userData', JSON.stringify(updatedUserData));

                if (onProfileUpdate) {
                    onProfileUpdate(response.user);
                }
            } else {
                setMessage({ text: response.message || 'Failed to update profile', type: 'error' });
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            setMessage({ text: error.message || 'Failed to update profile', type: 'error' });
        } finally {
            setSaveLoading(false);
        }
    };

    // Password Strength Calculation
    const calculatePasswordStrength = (password) => {
        if (!password) return { score: 0, label: "", color: "#e2e8f0" };

        let score = 0;
        if (password.length >= 6) score += 1;
        if (password.length >= 8) score += 1;
        if (/[A-Z]/.test(password)) score += 1;
        if (/[0-9]/.test(password)) score += 1;
        if (/[^A-Za-z0-9]/.test(password)) score += 1;

        if (password.length > 0 && password.length < 6) return { score: 0, label: "Too Short (Min 6)", color: "#ef4444" };
        if (score <= 2) return { score: 1, label: "Weak", color: "#ef4444" };
        if (score <= 4) return { score: 2, label: "Medium", color: "#f59e0b" };
        return { score: 3, label: "Strong", color: "#22c55e" };
    };

    const passwordStrength = calculatePasswordStrength(passwordData.new_password);
    const passwordsMatch = passwordData.new_password && passwordData.confirm_password && passwordData.new_password === passwordData.confirm_password;
    const isConfirmTouched = passwordData.confirm_password.length > 0;

    // Derived errors check (cleared on typing)
    const [fieldErrors, setFieldErrors] = useState({ current: '', new: '', confirm: '' });

    const handlePasswordInputChange = (field, value) => {
        setPasswordData(prev => ({
            ...prev,
            [field]: value
        }));
        // Clear specific field error on change
        setFieldErrors(prev => ({ ...prev, [field]: '' }));
    };

    const togglePasswordVisibility = (field) => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const handleChangePassword = async () => {
        // Reset previous errors
        setPasswordMessage({ text: '', type: '' });
        setFieldErrors({ current: '', new: '', confirm: '' });

        try {
            // Validation
            let hasError = false;
            const newErrors = { current: '', new: '', confirm: '' };

            if (!passwordData.current_password) {
                newErrors.current = 'Current password is required';
                hasError = true;
            }
            if (!passwordData.new_password) {
                newErrors.new = 'New password is required';
                hasError = true;
            }
            if (!passwordData.confirm_password) {
                newErrors.confirm = 'Please confirm your new password';
                hasError = true;
            }

            if (!hasError && passwordData.new_password !== passwordData.confirm_password) {
                newErrors.confirm = 'Passwords do not match';
                hasError = true;
            }

            if (!hasError && passwordData.new_password.length < 6) {
                newErrors.new = 'Password must be at least 6 characters';
                hasError = true;
            }

            if (hasError) {
                setFieldErrors(newErrors);
                return;
            }

            setPasswordLoading(true);

            const response = await changeUserPassword(userId, passwordData);

            if (response.success) {
                if (onShowToast) {
                    onShowToast('success', 'Password Changed', 'Your password has been updated securely.');
                } else {
                    setPasswordMessage({ text: 'Password changed successfully!', type: 'success' });
                }
                setPasswordData({
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                });
                setTimeout(() => {
                    setIsChangingPassword(false);
                    setPasswordMessage({ text: '', type: '' });
                }, 2000);
            } else {
                // Handle server errors - try to map to fields if possible
                const msg = response.message || 'Failed to change password';
                if (msg.toLowerCase().includes('current') || msg.toLowerCase().includes('old')) {
                    setFieldErrors(prev => ({ ...prev, current: msg }));
                } else {
                    setPasswordMessage({ text: msg, type: 'error' });
                }
            }
        } catch (error) {
            console.error('Error changing password:', error);
            setPasswordMessage({ text: error.message || 'Failed to change password', type: 'error' });
        } finally {
            setPasswordLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="personal-info-loading">
                <div className="loading-spinner"></div>
                <p>Loading profile...</p>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="personal-info-error">
                <ErrorIcon style={{ fontSize: '3rem', color: '#ef4444' }} />
                <p>Failed to load profile information</p>
                <button onClick={fetchProfile} className="retry-btn">
                    Retry
                </button>
            </div>
        );
    }

    return (
        <motion.div
            className="personal-info-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Profile Section */}
            <div className="personal-info-section">
                <div className="section-header">
                    <div className="section-title">
                        <Person className="section-icon" />
                        <h3>Account Settings</h3>
                    </div>
                    <button
                        className={`edit-toggle-btn ${isEditing ? 'editing' : ''}`}
                        onClick={handleEditToggle}
                    >
                        {isEditing ? (
                            <>
                                <Cancel style={{ fontSize: '1.1rem' }} />
                                Cancel
                            </>
                        ) : (
                            <>
                                <Edit style={{ fontSize: '1.1rem' }} />
                                Edit Profile
                            </>
                        )}
                    </button>
                </div>

                {message.text && (
                    <motion.div
                        className={`message-banner ${message.type}`}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        {message.type === 'success' ? <CheckCircle /> : <ErrorIcon />}
                        {message.text}
                    </motion.div>
                )}

                <div className="profile-grid">
                    {/* First Name */}
                    <div className="profile-field">
                        <label>
                            <Badge className="field-icon" />
                            First Name
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedProfile.firstname || ''}
                                onChange={(e) => handleInputChange('firstname', e.target.value)}
                                placeholder="Enter first name"
                            />
                        ) : (
                            <span className="field-value">{profile.firstname}</span>
                        )}
                    </div>

                    {/* Middle Name */}
                    <div className="profile-field">
                        <label>Middle Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedProfile.middlename || ''}
                                onChange={(e) => handleInputChange('middlename', e.target.value)}
                                placeholder="Enter middle name"
                            />
                        ) : (
                            <span className="field-value">{profile.middlename || 'N/A'}</span>
                        )}
                    </div>

                    {/* Last Name */}
                    <div className="profile-field">
                        <label>Last Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedProfile.lastname || ''}
                                onChange={(e) => handleInputChange('lastname', e.target.value)}
                                placeholder="Enter last name"
                            />
                        ) : (
                            <span className="field-value">{profile.lastname}</span>
                        )}
                    </div>

                    {/* Suffix */}
                    <div className="profile-field">
                        <label>Suffix</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedProfile.suffix || ''}
                                onChange={(e) => handleInputChange('suffix', e.target.value)}
                                placeholder="Jr., Sr., III, etc."
                            />
                        ) : (
                            <span className="field-value">{profile.suffix || 'N/A'}</span>
                        )}
                    </div>

                    {/* Email */}
                    <div className="profile-field full-width">
                        <label>
                            <Email className="field-icon" />
                            Email Address
                        </label>
                        {isEditing ? (
                            <input
                                type="email"
                                value={editedProfile.email || ''}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="Enter email address"
                            />
                        ) : (
                            <span className="field-value">{profile.email}</span>
                        )}
                    </div>

                    {/* School Number */}
                    <div className="profile-field">
                        <label>
                            <School className="field-icon" />
                            School Number
                        </label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedProfile.school_number || ''}
                                onChange={(e) => handleInputChange('school_number', e.target.value)}
                                placeholder="Enter school number"
                            />
                        ) : (
                            <span className="field-value">{profile.school_number || 'N/A'}</span>
                        )}
                    </div>

                    {/* Age - Read Only */}
                    <div className="profile-field">
                        <label>
                            <Cake className="field-icon" />
                            Age
                        </label>
                        <span className="field-value">{profile.age} years old</span>
                    </div>

                    {/* Sex - Read Only */}
                    <div className="profile-field">
                        <label>
                            <Wc className="field-icon" />
                            Sex
                        </label>
                        <span className="field-value">{profile.sex}</span>
                    </div>

                    {/* Role - Read Only */}
                    <div className="profile-field">
                        <label>Role</label>
                        <span className={`role-badge-info role-${profile.role?.toLowerCase()}`}>
                            {profile.role}
                        </span>
                    </div>
                </div>

                {isEditing && (
                    <motion.div
                        className="save-actions"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                    >
                        <button
                            className="save-btn"
                            onClick={handleSaveProfile}
                            disabled={saveLoading}
                        >
                            {saveLoading ? (
                                <>
                                    <span className="btn-spinner"></span>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save style={{ fontSize: '1.1rem' }} />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </motion.div>
                )}
            </div>

            {/* Password Section */}
            <div className="personal-info-section password-section">
                <div className="section-header">
                    <div className="section-title">
                        <Lock className="section-icon" />
                        <h3>Security</h3>
                    </div>
                    {!isChangingPassword && (
                        <button
                            className="change-password-btn"
                            onClick={() => setIsChangingPassword(true)}
                        >
                            <Lock style={{ fontSize: '1.1rem' }} />
                            Change Password
                        </button>
                    )}
                </div>

                {isChangingPassword && (
                    <motion.div
                        className="password-change-form"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                    >
                        {passwordMessage.text && (
                            <motion.div
                                className={`message-banner ${passwordMessage.type}`}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {passwordMessage.type === 'success' ? <CheckCircle /> : <ErrorIcon />}
                                {passwordMessage.text}
                            </motion.div>
                        )}

                        <div className="password-field">
                            <label>Current Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.current ? 'text' : 'password'}
                                    value={passwordData.current_password}
                                    onChange={(e) => handlePasswordInputChange('current_password', e.target.value)}
                                    placeholder="Enter current password"
                                    className={fieldErrors.current ? 'input-error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('current')}
                                >
                                    {showPasswords.current ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </div>
                            {fieldErrors.current && (
                                <div className="field-feedback error">
                                    <ErrorIcon style={{ fontSize: '0.9rem' }} />
                                    {fieldErrors.current}
                                </div>
                            )}
                        </div>

                        <div className="password-field">
                            <label>New Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.new ? 'text' : 'password'}
                                    value={passwordData.new_password}
                                    onChange={(e) => handlePasswordInputChange('new_password', e.target.value)}
                                    placeholder="Enter new password (min. 6 characters)"
                                    className={fieldErrors.new ? 'input-error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('new')}
                                >
                                    {showPasswords.new ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </div>

                            {/* Strength Meter */}
                            {passwordData.new_password && (
                                <div className="password-strength-meter">
                                    <div className="strength-bars">
                                        {[1, 2, 3].map((level) => (
                                            <div
                                                key={level}
                                                className="strength-bar"
                                                style={{
                                                    backgroundColor: passwordStrength.score >= level ? passwordStrength.color : '#e2e8f0'
                                                }}
                                            />
                                        ))}
                                    </div>
                                    <div
                                        className="strength-text"
                                        style={{ color: passwordStrength.color }}
                                    >
                                        {passwordStrength.label}
                                    </div>
                                </div>
                            )}

                            {fieldErrors.new && (
                                <div className="field-feedback error">
                                    <ErrorIcon style={{ fontSize: '0.9rem' }} />
                                    {fieldErrors.new}
                                </div>
                            )}
                        </div>

                        <div className="password-field">
                            <label>Confirm New Password</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPasswords.confirm ? 'text' : 'password'}
                                    value={passwordData.confirm_password}
                                    onChange={(e) => handlePasswordInputChange('confirm_password', e.target.value)}
                                    placeholder="Confirm new password"
                                    className={fieldErrors.confirm ? 'input-error' : ''}
                                />
                                <button
                                    type="button"
                                    className="password-toggle"
                                    onClick={() => togglePasswordVisibility('confirm')}
                                >
                                    {showPasswords.confirm ? <VisibilityOff /> : <Visibility />}
                                </button>
                            </div>

                            {/* Match Feedback */}
                            {isConfirmTouched && (
                                <div className={`field-feedback ${passwordsMatch ? 'success' : 'error'}`}>
                                    {passwordsMatch ? (
                                        <>
                                            <CheckCircle style={{ fontSize: '0.9rem' }} />
                                            Passwords match
                                        </>
                                    ) : (
                                        <>
                                            <ErrorIcon style={{ fontSize: '0.9rem' }} />
                                            Passwords do not match
                                        </>
                                    )}
                                </div>
                            )}

                            {fieldErrors.confirm && !isConfirmTouched && (
                                <div className="field-feedback error">
                                    <ErrorIcon style={{ fontSize: '0.9rem' }} />
                                    {fieldErrors.confirm}
                                </div>
                            )}
                        </div>

                        <div className="password-actions">
                            <button
                                className="cancel-btn"
                                onClick={() => {
                                    setIsChangingPassword(false);
                                    setPasswordData({
                                        current_password: '',
                                        new_password: '',
                                        confirm_password: ''
                                    });
                                    setPasswordMessage({ text: '', type: '' });
                                    setFieldErrors({ current: '', new: '', confirm: '' });
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                className="save-btn"
                                onClick={handleChangePassword}
                                disabled={passwordLoading}
                            >
                                {passwordLoading ? (
                                    <>
                                        <span className="btn-spinner"></span>
                                        Changing...
                                    </>
                                ) : (
                                    <>
                                        <Save style={{ fontSize: '1.1rem' }} />
                                        Change Password
                                    </>
                                )}
                            </button>
                        </div>
                    </motion.div>
                )}

                {!isChangingPassword && (
                    <p className="security-hint">
                        Keep your account secure by using a strong password and updating it regularly.
                    </p>
                )}
            </div>
            {/* Account Info Section */}
            <div className="personal-info-section account-section">
                <div className="section-header">
                    <div className="section-title">
                        <Badge className="section-icon" />
                        <h3>Account Information</h3>
                    </div>
                </div>
                <div className="account-info-grid">
                    <div className="account-info-item">
                        <span className="info-label">User ID</span>
                        <span className="info-value">{profile.user_id}</span>
                    </div>
                    <div className="account-info-item">
                        <span className="info-label">RFID Tag</span>
                        <span className="info-value">{profile.rfid_tag || 'Not Linked'}</span>
                    </div>
                    <div className="account-info-item">
                        <span className="info-label">Account Status</span>
                        <span className={`status-badge status-${profile.approval_status}`}>
                            {profile.approval_status}
                        </span>
                    </div>
                    <div className="account-info-item">
                        <span className="info-label">Member Since</span>
                        <span className="info-value">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : 'N/A'}
                        </span>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default PersonalInfo;
