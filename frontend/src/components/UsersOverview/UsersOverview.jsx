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
import './UsersOverview.css';

const UsersOverview = ({
    users = [],
    loading = false,
    onUserClick,
    onRoleUpdate,
    onStatusUpdate,
    stats = {} // For roles distribution in dropdown
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

    // Reset Page on Filter Change
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

        // 1. Time Filter
        result = filterHistoryByTimePeriod(result, timePeriod, customDateRange);

        // 2. Search Filter
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(u =>
                (u.firstname && u.firstname.toLowerCase().includes(lowerTerm)) ||
                (u.lastname && u.lastname.toLowerCase().includes(lowerTerm)) ||
                (u.email && u.email.toLowerCase().includes(lowerTerm)) ||
                (u.school_number && u.school_number.toLowerCase().includes(lowerTerm))
            );
        }

        // 3. Role Filter
        if (roleFilter.length > 0 && !roleFilter.includes('All')) {
            result = result.filter(u => roleFilter.includes(u.role));
        }

        // 4. Status Filter
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

    return (
        <motion.div
            className="users-overview-container"
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
        >
            <div className="uo-table-header">
                <h3>Registered Users Database ({filteredUsers.length} records)</h3>

                {/* DESKTOP LAYOUT */}
                {window.innerWidth > 768 && (
                    <div className="uo-table-actions">
                        <div className="uo-search-bar">
                            <Search style={{ color: '#94a3b8', marginRight: '8px' }} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="role-filter-wrapper" style={{ display: 'flex', gap: '8px' }}>
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
                            />
                        </div>

                        {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                            <ExportButton
                                onExportCSV={() => handleExport('csv')}
                                onExportExcel={() => handleExport('excel')}
                                onExportPDF={() => handleExport('pdf')}
                            />
                        )}

                        <TimePeriodFilter
                            timePeriod={timePeriod}
                            setTimePeriod={setTimePeriod}
                            customDateRange={customDateRange}
                            setCustomDateRange={setCustomDateRange}
                            variant="dropdown"
                        />

                        <div className="view-toggle" style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                            <button
                                onClick={() => setViewMode('table')}
                                style={{ padding: '8px', background: viewMode === 'table' ? '#fef2f2' : 'white', color: viewMode === 'table' ? '#dc2626' : '#64748b', border: 'none', cursor: 'pointer' }}
                            >
                                <TableRows fontSize="small" />
                            </button>
                            <button
                                onClick={() => setViewMode('card')}
                                style={{ padding: '8px', background: viewMode === 'card' ? '#fef2f2' : 'white', color: viewMode === 'card' ? '#dc2626' : '#64748b', border: 'none', cursor: 'pointer' }}
                            >
                                <GridView fontSize="small" />
                            </button>
                        </div>
                    </div>
                )}

                {/* KIOSK LAYOUT */}
                {window.innerWidth <= 768 && (
                    <div className="uo-table-actions" style={{ flexDirection: 'column', width: '100%', alignItems: 'stretch' }}>
                        <div className="uo-search-bar" style={{ width: '100%', maxWidth: 'none' }}>
                            <Search style={{ color: '#94a3b8', marginRight: '8px' }} />
                            <input
                                type="text"
                                placeholder="Search users..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="uo-kiosk-scroll-container">
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
                                compact={true}
                                style={{ flex: 1, minWidth: 0 }}
                                className="kiosk-filter-item"
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
                                compact={true}
                                style={{ flex: 1, minWidth: 0 }}
                                className="kiosk-filter-item"
                            />
                            <TimePeriodFilter
                                timePeriod={timePeriod}
                                setTimePeriod={setTimePeriod}
                                customDateRange={customDateRange}
                                setCustomDateRange={setCustomDateRange}
                                variant="dropdown"
                                compact={true}
                                style={{ flex: 1, minWidth: 0 }}
                                className="kiosk-filter-item"
                            />

                            {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                                <div style={{ flex: '0 0 auto' }}>
                                    <ExportButton
                                        onExportCSV={() => handleExport('csv')}
                                        onExportExcel={() => handleExport('excel')}
                                        onExportPDF={() => handleExport('pdf')}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Content List */}
            {viewMode === 'table' ? (
                <div className="table-container-wrapper" style={{ overflowX: 'auto', flex: 1 }}>
                    <table className="uo-users-table">
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Role</th>
                                <th>School ID</th>
                                <th>Email</th>
                                <th>Registered Date</th>
                                <th>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading...</td></tr>
                            ) : currentUsers.length > 0 ? (
                                currentUsers.map((u) => (
                                    <tr key={u.user_id}>
                                        <td onClick={() => onUserClick(u)} style={{ cursor: 'pointer' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                <div style={{
                                                    width: '40px', height: '40px', borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${u.role === 'Student' ? '#3b82f6' : '#ef4444'}, ${u.role === 'Student' ? '#2563eb' : '#dc2626'})`,
                                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                                                }}>
                                                    {u.firstname?.[0]}{u.lastname?.[0]}
                                                </div>
                                                <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.firstname} {u.lastname}</div>
                                            </div>
                                        </td>
                                        <td>
                                            <RoleDropdown
                                                currentRole={u.role || 'Student'}
                                                onRoleChange={(newRole) => onRoleUpdate(u.user_id, newRole)}
                                            />
                                        </td>
                                        <td>{u.school_number || 'N/A'}</td>
                                        <td>{u.email}</td>
                                        <td>{u.created_at || 'N/A'}</td>
                                        <td>
                                            <StatusDropdown
                                                currentStatus={u.approval_status || 'pending'}
                                                onStatusChange={(newStatus) => onStatusUpdate(u.user_id, newStatus)}
                                            />
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan="6"><NoDataFound type="users" searchTerm={searchTerm} /></td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="uo-user-cards-grid">
                    {loading ? (
                        <div>Loading...</div>
                    ) : currentUsers.length > 0 ? (
                        currentUsers.map((u) => (
                            <motion.div
                                key={u.user_id}
                                className="user-card-item"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                whileHover={{ y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                                onClick={() => onUserClick(u)}
                                style={{
                                    background: 'white', borderRadius: '12px', padding: '16px',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                                    display: 'flex', flexDirection: 'column', gap: '12px', cursor: 'pointer', height: 'auto'
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{
                                        width: '48px', height: '48px', borderRadius: '50%',
                                        background: `linear-gradient(135deg, ${u.role === 'Student' ? '#3b82f6' : '#ef4444'}, ${u.role === 'Student' ? '#2563eb' : '#dc2626'})`,
                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontWeight: 'bold', fontSize: '1.1rem', flexShrink: 0
                                    }}>
                                        {u.firstname?.[0]}{u.lastname?.[0]}
                                    </div>
                                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', overflow: 'hidden' }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {u.firstname} {u.lastname}
                                        </div>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <RoleDropdown
                                                currentRole={u.role || 'Student'}
                                                onRoleChange={(newRole) => onRoleUpdate(u.user_id, newRole)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>ID:</span> <span style={{ color: '#1e293b', fontWeight: 500 }}>{u.school_number || 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Joined:</span> <span style={{ color: '#1e293b', fontWeight: 500 }}>{u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <span>Email:</span> <span style={{ color: '#1e293b', fontWeight: 500, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                                    </div>
                                </div>

                                <div style={{ marginTop: 'auto', width: '100%' }} onClick={(e) => e.stopPropagation()}>
                                    <StatusDropdown
                                        currentStatus={u.approval_status || 'pending'}
                                        onStatusChange={(newStatus) => onStatusUpdate(u.user_id, newStatus)}
                                    />
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1 / -1' }}><NoDataFound type="users" searchTerm={searchTerm} /></div>
                    )}
                </div>
            )}

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </motion.div>
    );
};

export default UsersOverview;
