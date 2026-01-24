import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, GridView, TableRows } from '@mui/icons-material';
import { TimePeriodFilter, MultiSelectDropdown, filterHistoryByTimePeriod } from '../DashboardAnalytics/DashboardAnalytics';
import ExportButton from '../ExportButton/ExportButton';
import Pagination from '../Pagination/Pagination';
import NoDataFound from '../NoDataFound/NoDataFound';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import RoleDropdown from './RoleDropdown';
import StatusDropdown from './StatusDropdown';
import { isLocalhost } from '../../utils/kioskUtils';
import './UsersOverview.css'; // Ensure this matches PatientList.css styles essentially

const UsersOverview = ({
    users = [],
    loading = false,
    onUserClick,
    onRoleUpdate,
    onStatusUpdate,
    stats = {}
}) => {
    // Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState(window.innerWidth <= 768 ? 'card' : 'table');
    const [timePeriod, setTimePeriod] = useState('all');
    const [customDateRange, setCustomDateRange] = useState(null);
    const [roleFilter, setRoleFilter] = useState(['All']);
    const [statusFilter, setStatusFilter] = useState(['All']);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // View Mode Listener
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setViewMode('card');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Reset Page
    useEffect(() => {
        setPage(1);
    }, [searchTerm, timePeriod, customDateRange, roleFilter, statusFilter]);

    // Handle Filters
    const toggleRole = (roleId) => {
        setRoleFilter(prev => {
            if (roleId === 'All') return ['All'];
            if (prev.includes('All')) return [roleId];
            const newFilter = prev.includes(roleId)
                ? prev.filter(r => r !== roleId)
                : [...prev, roleId];
            return newFilter.length === 0 ? ['All'] : newFilter;
        });
    };

    const toggleStatus = (statusId) => {
        setStatusFilter(prev => {
            if (statusId === 'All') return ['All'];
            if (prev.includes('All')) return [statusId];
            const newFilter = prev.includes(statusId)
                ? prev.filter(s => s !== statusId)
                : [...prev, statusId];
            return newFilter.length === 0 ? ['All'] : newFilter;
        });
    };

    // Filter Logic
    const filteredUsers = useMemo(() => {
        if (!users || !Array.isArray(users)) return [];
        let result = users.map(u => ({ ...u, created_at: u.created_at || u.registered_at }));

        // Time
        result = filterHistoryByTimePeriod(result, timePeriod, customDateRange);

        // Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.firstname && u.firstname.toLowerCase().includes(lowerTerm)) ||
                (u.lastname && u.lastname.toLowerCase().includes(lowerTerm)) ||
                (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
                (u.school_number && u.school_number.toLowerCase().includes(lowerTerm))
            );
        }

        // Role
        if (roleFilter.length > 0 && !roleFilter.includes('All')) {
            result = result.filter(u => roleFilter.includes(u.role));
        }

        // Status
        if (statusFilter.length > 0 && !statusFilter.includes('All')) {
            result = result.filter(u => statusFilter.includes(u.approval_status || 'pending'));
        }

        return result;
    }, [users, searchTerm, timePeriod, customDateRange, roleFilter, statusFilter]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, page]);

    // Export Logic
    const handleExport = (format) => {
        const data = filteredUsers.map(u => ({
            "Name": `${u.firstname} ${u.lastname}`,
            "Role": u.role,
            "School ID": u.school_number || 'N/A',
            "Email": u.email,
            "Joined": u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A',
            "Status": u.approval_status
        }));
        const filename = `Users_${new Date().toISOString().split('T')[0]}`;
        if (format === 'csv') exportToCSV(data, filename);
        if (format === 'excel') exportToExcel(data, filename);
        if (format === 'pdf') exportToPDF(data, filename, "Registered Users");
    };

    // Kiosk Check
    const isKioskMode = isLocalhost();

    return (
        <motion.div
            className="users-overview-container" // Matching container class concept
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            {/* Header / Controls - MATCHING PatientList Structure */}
            <div className="uo-table-header">
                <h3>Registered Users Database ({filteredUsers.length} records)</h3>

                <div className="uo-table-actions">



                    {/* Kiosk Scroll Container - Exactly like PatientList */}
                    <div className="uo-kiosk-scroll-container">
                        <style>{`
                            .uo-kiosk-scroll-container::-webkit-scrollbar { display: none; }
                            .uo-kiosk-scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
                        `}</style>

                        <MultiSelectDropdown
                            label="Select Roles"
                            selectedItems={roleFilter}
                            options={[
                                { id: 'All', label: 'All Roles' },
                                ...(Object.keys(stats.roles_distribution || {}).length > 0
                                    ? Object.keys(stats.roles_distribution)
                                    : ['Admin', 'Doctor', 'Nurse', 'Employee', 'Student']
                                ).map(role => ({ id: role, label: role }))
                            ]}
                            onToggle={toggleRole}
                            allLabel="All Roles"
                            compact={false}
                        />

                        <MultiSelectDropdown
                            label="Select Status"
                            selectedItems={statusFilter}
                            options={[
                                { id: 'All', label: 'All Status' },
                                { id: 'approved', label: 'Approved' },
                                { id: 'pending', label: 'Pending' },
                                { id: 'rejected', label: 'Rejected' }
                            ]}
                            onToggle={toggleStatus}
                            allLabel="All Status"
                            compact={false}
                        />

                        <TimePeriodFilter
                            timePeriod={timePeriod}
                            setTimePeriod={setTimePeriod}
                            customDateRange={customDateRange}
                            setCustomDateRange={setCustomDateRange}
                            variant="dropdown"
                            compact={false}
                        />

                        {/* Export - Kiosk Logic */}
                        {!isKioskMode && (
                            <ExportButton
                                onExportCSV={() => handleExport('csv')}
                                onExportExcel={() => handleExport('excel')}
                                onExportPDF={() => handleExport('pdf')}
                            />
                        )}

                        {/* View Toggle - Kiosk Logic */}
                        {!isKioskMode && (
                            <div className="view-mode-toggle" style={{ display: 'flex', gap: '4px', background: '#f1f5f9', borderRadius: '8px', padding: '4px' }}>
                                <button
                                    onClick={() => window.innerWidth > 768 && setViewMode('table')}
                                    style={{
                                        padding: '8px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: viewMode === 'table' ? '#dc2626' : 'transparent',
                                        color: viewMode === 'table' ? 'white' : '#64748b',
                                        cursor: window.innerWidth <= 768 ? 'not-allowed' : 'pointer',
                                        opacity: window.innerWidth <= 768 ? 0.5 : 1
                                    }}
                                >
                                    <TableRows />
                                </button>
                                <button
                                    onClick={() => setViewMode('card')}
                                    style={{
                                        padding: '8px',
                                        border: 'none',
                                        borderRadius: '6px',
                                        background: viewMode === 'card' ? '#dc2626' : 'transparent',
                                        color: viewMode === 'card' ? 'white' : '#64748b',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <GridView />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* List Content */}
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
                {viewMode === 'table' ? (
                    <div className="table-container-wrapper">
                        <table className="uo-users-table">
                            <thead>
                                <tr>
                                    <th>Name</th>
                                    <th>Role</th>
                                    <th>School ID</th>
                                    <th>Email</th>
                                    <th>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                                ) : currentUsers.length > 0 ? (
                                    currentUsers.map((u) => (
                                        <tr key={u.user_id || u.id} className="user-row">
                                            <td onClick={() => onUserClick && onUserClick(u)} style={{ cursor: onUserClick ? 'pointer' : 'default' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div className="uo-card-avatar" style={{
                                                        width: '40px', height: '40px', fontSize: '1rem',
                                                        background: u.role === 'Student' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                    }}>
                                                        {u.firstname?.[0]}{u.lastname?.[0]}
                                                    </div>
                                                    <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.firstname} {u.lastname}</div>
                                                </div>
                                            </td>
                                            <td>
                                                <RoleDropdown
                                                    currentRole={u.role || 'Student'}
                                                    onRoleChange={(newRole) => onRoleUpdate(u.user_id || u.id, newRole)}
                                                />
                                            </td>
                                            <td style={{ color: '#475569' }}>{u.school_number || 'N/A'}</td>
                                            <td style={{ color: '#475569' }}>{u.email}</td>
                                            <td>
                                                <StatusDropdown
                                                    currentStatus={u.approval_status || 'pending'}
                                                    onStatusChange={(newStatus) => onStatusUpdate(u.user_id || u.id, newStatus)}
                                                />
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr><td colSpan="5"><NoDataFound type="users" searchTerm={searchTerm} /></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    /* Modern Card Grid */
                    <div className="uo-user-cards-grid">
                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '2rem', gridColumn: '1/-1' }}>Loading Users...</div>
                        ) : currentUsers.length > 0 ? (
                            currentUsers.map((u) => (
                                <motion.div
                                    key={u.user_id || u.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="uo-modern-card"
                                    onClick={() => onUserClick && onUserClick(u)}
                                >
                                    <div className="uo-card-header">
                                        <div className="uo-card-avatar" style={{
                                            background: u.role === 'Student' ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'linear-gradient(135deg, #ef4444, #dc2626)'
                                        }}>
                                            {u.firstname?.[0]}{u.lastname?.[0]}
                                        </div>
                                        <div className="uo-card-identity">
                                            <div className="uo-card-name">
                                                {u.firstname} {u.lastname}
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <RoleDropdown
                                                    currentRole={u.role || 'Student'}
                                                    onRoleChange={(newRole) => onRoleUpdate(u.user_id || u.id, newRole)}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="uo-card-body">
                                        <div className="uo-info-row">
                                            <span className="uo-info-label">ID:</span>
                                            <span className="uo-info-value">{u.school_number || 'N/A'}</span>
                                        </div>
                                        <div className="uo-info-row">
                                            <span className="uo-info-label">Joined:</span>
                                            <span className="uo-info-value">{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div className="uo-info-row">
                                            <span className="uo-info-label">Email:</span>
                                            <span className="uo-info-value">{u.email}</span>
                                        </div>
                                    </div>

                                    <div className="uo-card-footer" onClick={(e) => e.stopPropagation()}>
                                        <StatusDropdown
                                            currentStatus={u.approval_status || 'pending'}
                                            onStatusChange={(newStatus) => onStatusUpdate(u.user_id || u.id, newStatus)}
                                        />
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div style={{ gridColumn: '1 / -1' }}><NoDataFound type="users" searchTerm={searchTerm} /></div>
                        )}
                    </div>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </motion.div >
    );
};

export default UsersOverview;
