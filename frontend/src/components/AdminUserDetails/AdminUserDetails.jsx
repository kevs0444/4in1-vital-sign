import React from 'react';
import { Person, Email, Badge, CalendarToday, VerifiedUser, AdminPanelSettings, School } from '@mui/icons-material';
import { motion } from 'framer-motion';

const AdminUserDetails = ({ user }) => {
    if (!user) return null;

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const InfoCard = ({ icon, label, value, color = '#64748b', bgColor = '#f8fafc' }) => (
        <motion.div
            whileHover={{ y: -2 }}
            style={{
                background: bgColor,
                padding: '16px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                gap: '16px'
            }}
        >
            <div style={{
                width: '40px', height: '40px', borderRadius: '10px',
                background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: color, boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500' }}>{label}</div>
                <div style={{ fontSize: '1rem', color: '#1e293b', fontWeight: '600' }}>{value || 'N/A'}</div>
            </div>
        </motion.div>
    );

    return (
        <div className="admin-user-details" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', padding: '10px 0' }}>
            <InfoCard
                icon={<Badge />}
                label="School / Company ID"
                value={user.school_number || user.school_id}
                color="#3b82f6"
                bgColor="#eff6ff"
            />
            <InfoCard
                icon={<Email />}
                label="Email Address"
                value={user.email}
                color="#8b5cf6"
                bgColor="#f5f3ff"
            />
            <InfoCard
                icon={<AdminPanelSettings />}
                label="System Role"
                value={user.role}
                color="#dc2626"
                bgColor="#fef2f2"
            />
            <InfoCard
                icon={<VerifiedUser />}
                label="Account Status"
                value={user.approval_status}
                color={user.approval_status === 'approved' ? '#16a34a' : '#ea580c'}
                bgColor={user.approval_status === 'approved' ? '#f0fdf4' : '#fff7ed'}
            />
            <InfoCard
                icon={<CalendarToday />}
                label="Date Registered"
                value={formatDate(user.created_at || user.registered_at)}
                color="#0891b2"
                bgColor="#ecfeff"
            />
            <InfoCard
                icon={<School />}
                label="Department / Course"
                value={user.department || 'Not Specified'}
                color="#d97706"
                bgColor="#fffbeb"
            />
        </div>
    );
};

export default AdminUserDetails;
