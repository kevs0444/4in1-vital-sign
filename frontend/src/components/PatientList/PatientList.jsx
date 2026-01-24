import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, GridView, TableRows, Visibility } from '@mui/icons-material';
import { TimePeriodFilter, filterHistoryByTimePeriod } from '../DashboardAnalytics/DashboardAnalytics';
import ExportButton from '../ExportButton/ExportButton';
import Pagination from '../Pagination/Pagination';
import NoDataFound from '../NoDataFound/NoDataFound';
import { exportToCSV, exportToExcel, exportToPDF } from '../../utils/exportUtils';
import './PatientList.css'; // You'll need to create this or reuse existing styles

const PatientList = ({ users, loading, onViewHistory, title = "Assigned Patients" }) => {
    // Local State
    const [searchTerm, setSearchTerm] = useState('');
    const [timePeriod, setTimePeriod] = useState('weekly');
    const [customDateRange, setCustomDateRange] = useState(null);
    const [page, setPage] = useState(1);
    const itemsPerPage = 10;

    // View Mode (Kiosk Logic)
    const [viewMode, setViewMode] = useState(window.innerWidth <= 768 ? 'card' : 'table');

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth <= 768) {
                setViewMode('card');
            }
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Helper: Reset Page on Filter Change
    useEffect(() => {
        setPage(1);
    }, [searchTerm, timePeriod, customDateRange]);

    // Filtering
    const filteredUsers = useMemo(() => {
        if (!users) return [];

        // 1. Time Filter (based on last_checkup OR created_at)
        // We map users to have a 'created_at' field for the filter utility to work, 
        // prioritizing last_checkup for relevance
        const timeableUsers = users.map(u => ({
            ...u,
            _filterDate: u.last_checkup || u.created_at || u.registered_at
        }));

        // Custom time filter logic since 'filterHistoryByTimePeriod' expects 'created_at'
        // We can temporarily swap created_at, or filter manually. 
        // Let's use the utility by creating a temporary array
        const tempArray = timeableUsers.map(u => ({ ...u, created_at: u._filterDate }));
        const timeFiltered = filterHistoryByTimePeriod(tempArray, timePeriod, customDateRange);

        // 2. Search Filter
        return timeFiltered.filter(u =>
            u.firstname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.lastname?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            u.school_number?.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => {
            // Sort by latest activity
            const dateA = new Date(a._filterDate || 0).getTime();
            const dateB = new Date(b._filterDate || 0).getTime();
            return dateB - dateA;
        });
    }, [users, searchTerm, timePeriod, customDateRange]);

    // Pagination
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
    const currentUsers = useMemo(() => {
        const start = (page - 1) * itemsPerPage;
        return filteredUsers.slice(start, start + itemsPerPage);
    }, [filteredUsers, page]);

    const handleExport = (format) => {
        const data = filteredUsers.map(u => ({
            "Name": `${u.firstname || ''} ${u.lastname || ''}`.trim(),
            "Role": u.role,
            "School ID": u.school_number || 'N/A',
            "Email": u.email,
            "Last Checkup": u.last_checkup ? new Date(u.last_checkup).toLocaleDateString() : 'N/A'
        }));
        const filename = `Patients_${new Date().toISOString().split('T')[0]}`;
        if (format === 'csv') exportToCSV(data, filename);
        if (format === 'excel') exportToExcel(data, filename);
        if (format === 'pdf') exportToPDF(data, filename, "Patient List");
    };

    const formatDate = (isoString) => {
        if (!isoString) return '-';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    return (
        <motion.div
            className="patient-list-container"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
            {/* Header / Controls */}
            <div className="table-header" style={{ marginBottom: '16px' }}>
                <h3>{title} ({filteredUsers.length} records)</h3>

                <div className="table-controls-wrapper" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Search */}
                    <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', width: 'auto', flex: '1 1 200px' }}>
                        <Search style={{ color: '#94a3b8', marginRight: '8px' }} />
                        <input
                            type="text"
                            placeholder="Search patients..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem' }}
                        />
                    </div>

                    {/* Controls Row (Scrollable on mobile/kiosk) */}
                    <div className="kiosk-scroll-container" style={{
                        display: 'flex',
                        gap: '10px',
                        overflowX: 'auto',
                        paddingBottom: '4px',
                        alignItems: 'center'
                    }}>
                        <style>{`
                            .kiosk-scroll-container::-webkit-scrollbar { display: none; }
                            .kiosk-scroll-container { -ms-overflow-style: none; scrollbar-width: none; }
                        `}</style>

                        <TimePeriodFilter
                            timePeriod={timePeriod}
                            setTimePeriod={setTimePeriod}
                            customDateRange={customDateRange}
                            setCustomDateRange={setCustomDateRange}
                            variant="dropdown"
                        />

                        {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
                            <ExportButton
                                onExportCSV={() => handleExport('csv')}
                                onExportExcel={() => handleExport('excel')}
                                onExportPDF={() => handleExport('pdf')}
                            />
                        )}

                        {/* View Toggle (Hidden on Kiosk if localhost logic applies, 
                           but here we just use screen width check for general Kiosk mode) */}
                        {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
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
                        <table className="users-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', zIndex: 10 }}>
                                <tr>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Name</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Role</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Email</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Last Checkup</th>
                                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e2e8f0' }}>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Loading users...</td></tr>
                                ) : currentUsers.length === 0 ? (
                                    <NoDataFound type="users" searchTerm={searchTerm} compact={true} colSpan={5} />
                                ) : (
                                    currentUsers.map((u, index) => (
                                        <tr key={u.user_id} className="user-row" style={{ borderBottom: '1px solid #f1f5f9' }}>
                                            <td style={{ padding: '12px' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px', height: '40px', borderRadius: '50%',
                                                        background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                        fontWeight: 'bold'
                                                    }}>
                                                        {u.firstname?.[0]}{u.lastname?.[0]}
                                                    </div>
                                                    <div>
                                                        <div style={{ fontWeight: 600, color: '#1e293b' }}>{u.firstname} {u.lastname}</div>
                                                        <div style={{ fontSize: '0.8rem', color: '#64748b' }}>ID: {u.school_number || 'N/A'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding: '12px' }}>
                                                <span className={`role-badge role-${u.role?.toLowerCase()}`} style={{
                                                    padding: '4px 8px', borderRadius: '12px',
                                                    fontSize: '0.75rem', fontWeight: 600,
                                                    background: '#ebf5ff', color: '#1d4ed8',
                                                    textTransform: 'capitalize'
                                                }}>
                                                    {u.role}
                                                </span>
                                            </td>
                                            <td style={{ padding: '12px', color: '#475569' }}>{u.email}</td>
                                            <td style={{ padding: '12px', color: '#475569' }}>{formatDate(u.last_checkup)}</td>
                                            <td style={{ padding: '12px' }}>
                                                <button
                                                    className="pl-action-btn"
                                                    onClick={() => onViewHistory(u)}
                                                    style={{ padding: '6px 12px', fontSize: '0.85rem' }}
                                                >
                                                    <Visibility fontSize="small" /> History
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="measurement-cards-grid" style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: '16px',
                        padding: '4px'
                    }}>
                        {loading ? (
                            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem' }}>Loading users...</div>
                        ) : currentUsers.length === 0 ? (
                            <div style={{ gridColumn: '1/-1' }}><NoDataFound type="users" searchTerm={searchTerm} /></div>
                        ) : (
                            currentUsers.map(u => (
                                <motion.div
                                    key={u.user_id}
                                    initial={{ opacity: 0, scale: 0.95 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    whileHover={{ y: -2, boxShadow: '0 8px 16px rgba(0,0,0,0.1)' }}
                                    onClick={() => onViewHistory(u)}
                                    style={{
                                        background: 'white', borderRadius: '12px', padding: '16px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
                                        cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '12px'
                                    }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                        <div style={{
                                            width: '48px', height: '48px', borderRadius: '50%',
                                            background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            fontWeight: 'bold', fontSize: '1.1rem'
                                        }}>
                                            {u.firstname?.[0]}{u.lastname?.[0]}
                                        </div>
                                        <div style={{ flex: 1, overflow: 'hidden' }}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                {u.firstname} {u.lastname}
                                            </div>
                                            <span style={{
                                                fontSize: '0.7rem', background: '#f1f5f9', color: '#64748b',
                                                padding: '2px 6px', borderRadius: '4px', marginTop: '2px', display: 'inline-block'
                                            }}>
                                                {u.role}
                                            </span>
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem', color: '#64748b' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>ID:</span> <span style={{ color: '#1e293b', fontWeight: 500 }}>{u.school_number || '-'}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Checkup:</span> <span style={{ color: '#1e293b', fontWeight: 500 }}>{formatDate(u.last_checkup)}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span>Email:</span> <span style={{ color: '#1e293b', fontWeight: 500, maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{u.email}</span>
                                        </div>
                                    </div>

                                    <button
                                        className="pl-action-btn"
                                        onClick={() => onViewHistory(u)}
                                        style={{ width: '100%', marginTop: '4px' }}
                                    >
                                        View History
                                    </button>
                                </motion.div>
                            ))
                        )}
                    </div>
                )}
            </div>

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />
        </motion.div>
    );
};

export default PatientList;
