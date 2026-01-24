/* NurseDashboard.jsx */
import React, { useState, useEffect } from 'react'; // Removed useMemo if not used in top level
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Visibility, LocalHospital, Settings,
    History, Check, Close, ErrorOutline, WarningAmber, Dashboard, Assessment
} from '@mui/icons-material';
import './NurseDashboard.css';
import { getAdminUsers, getMeasurementHistory } from '../../../../utils/api';
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardLayout from '../../../../components/DashboardLayout/DashboardLayout';
import PopulationAnalytics from '../../../../components/PopulationAnalytics/PopulationAnalytics';
// NoDataFound import removed as it is used inside components now
import { useRealtimeUpdates } from '../../../../hooks/useRealtimeData';
import MyMeasurements from '../../../../components/MyMeasurements/MyMeasurements';
import PatientList from '../../../../components/PatientList/PatientList';
import HealthOverview from '../../../../components/HealthOverview/HealthOverview';
import MeasurementDetailsModal from '../../../../components/MeasurementDetailsModal/MeasurementDetailsModal';

// StatusToast Component (Local Definition)
const StatusToast = ({ toast, onClose }) => {
    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [toast, onClose]);

    if (!toast) return null;

    return (
        <div className="status-toast-overlay" style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 2000,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={toast.id || 'toast'}
                    initial={{ opacity: 0, x: 50, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 20, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className={`status-toast ${toast.type}`}
                    style={{
                        background: 'white',
                        borderRadius: '12px',
                        padding: '16px',
                        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '12px',
                        minWidth: '320px',
                        maxWidth: '400px',
                        borderLeft: `6px solid ${toast.type === 'success' ? '#10b981' :
                            toast.type === 'error' ? '#ef4444' :
                                '#f59e0b'
                            }`
                    }}
                >
                    <div className={`toast-icon-wrapper ${toast.type}`} style={{
                        color: toast.type === 'success' ? '#10b981' :
                            toast.type === 'error' ? '#ef4444' :
                                '#f59e0b',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginTop: '2px'
                    }}>
                        {toast.type === 'success' && <Check />}
                        {toast.type === 'error' && <ErrorOutline />}
                        {toast.type === 'warning' && <WarningAmber />}
                    </div>
                    <div className="toast-content" style={{ flex: 1 }}>
                        <span className="toast-title" style={{ display: 'block', fontWeight: 'bold', color: '#1e293b', marginBottom: '4px' }}>
                            {toast.title}
                        </span>
                        <span className="toast-message" style={{ display: 'block', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.4' }}>
                            {toast.message}
                        </span>
                    </div>
                    <button className="toast-close" onClick={onClose} style={{
                        background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Close fontSize="small" />
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

const NurseDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();

    // Core Data State
    const [currentUser, setCurrentUser] = useState(null);
    const [usersList, setUsersList] = useState([]);
    const [myHistory, setMyHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // UI State
    const [activeTab, setActiveTab] = useState('analytics'); // Default to Population Analytics
    const [toast, setToast] = useState(null);

    // Modal State
    const [selectedUser, setSelectedUser] = useState(null);
    const [userHistory, setUserHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);

    // Analytics Filters
    const [timePeriod, setTimePeriod] = useState('weekly');
    const [customDateRange, setCustomDateRange] = useState(null);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    const fetchMyHistory = React.useCallback(async (userId) => {
        try {
            const response = await getMeasurementHistory(userId);
            if (response.success) {
                setMyHistory(response.history || []);
            }
        } catch (error) {
            console.error("Failed to fetch my history:", error);
        }
    }, []);

    const fetchUsers = React.useCallback(async () => {
        try {
            setLoading(true);
            const response = await getAdminUsers();
            if (response.success) {
                setUsersList(response.users || []);
            }
        } catch (error) {
            console.error("Failed to fetch users:", error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login');
            return;
        }
        setCurrentUser(savedUser);

        fetchUsers();
        if (savedUser?.userId || savedUser?.user_id || savedUser?.id) {
            fetchMyHistory(savedUser.userId || savedUser.user_id || savedUser.id);
        }
    }, [navigate, location, fetchUsers, fetchMyHistory]);

    // Real-time Updates
    const refetchAllData = React.useCallback(async () => {
        await fetchUsers();
        if (currentUser) {
            await fetchMyHistory(currentUser.userId || currentUser.user_id || currentUser.id);
        }
    }, [currentUser, fetchUsers, fetchMyHistory]);

    const { isConnected, lastUpdated } = useRealtimeUpdates({
        role: 'Nurse', // Changed role
        userId: currentUser?.userId || currentUser?.user_id || currentUser?.id,
        refetchData: refetchAllData,
        onNewMeasurement: (data) => console.log('📊 New measurement:', data)
    });

    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        navigate('/login');
    };

    // Open Patient History Modal
    const viewUserHistory = async (targetUser) => {
        setSelectedUser(targetUser);
        setUserHistory([]);
        setHistoryLoading(true);
        try {
            const response = await getMeasurementHistory(targetUser.user_id);
            if (response.success) {
                setUserHistory(response.history || []);
            }
        } catch (error) {
            console.error("Failed to fetch user history:", error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const getRiskColor = (category) => {
        if (!category) return '#64748b';
        const cat = category.toLowerCase();
        if (cat.includes('low')) return '#10b981';
        if (cat.includes('moderate')) return '#f59e0b';
        if (cat.includes('high')) return '#ef4444';
        if (cat.includes('critical')) return '#dc2626';
        return '#64748b';
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const tabs = [
        { id: 'analytics', label: 'Population Analytics', icon: <Assessment /> },
        { id: 'patients', label: 'Patients Overview', icon: <LocalHospital /> },
        { type: 'spacer' },
        { id: 'myoverview', label: 'My Health Overview', icon: <Dashboard /> },
        { id: 'personal', label: 'My Measurements', icon: <History /> },
        { id: 'profile', label: 'Personal Info', icon: <Settings /> }
    ];

    if (!currentUser) return null;

    return (
        <DashboardLayout
            title={tabs.find(t => t.id === activeTab)?.label || 'Dashboard'}
            subtitle="Nurse Dashboard"
            user={currentUser}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            lastUpdated={lastUpdated}
            onRefresh={refetchAllData}
            isConnected={isConnected}
            notificationProps={{ userRole: 'nurse', onNavigate: (tab) => setActiveTab(tab) }}
        >
            <StatusToast toast={toast} onClose={() => setToast(null)} />

            {/* Profile Tab */}
            {activeTab === 'profile' && currentUser && (
                <PersonalInfo
                    userId={currentUser.userId || currentUser.user_id || currentUser.id}
                    onProfileUpdate={(updatedUser) => setCurrentUser(prev => ({ ...prev, ...updatedUser }))}
                    onShowToast={(type, title, message) => setToast({ type, title, message, id: Date.now() })}
                />
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div style={{ padding: '0 0 40px 0' }}>
                    <PopulationAnalytics />
                </div>
            )}

            {/* Patients Overview Tab */}
            {activeTab === 'patients' && (
                <PatientList
                    users={usersList}
                    loading={loading}
                    onViewHistory={viewUserHistory}
                    title="Assigned Patients / All Users"
                />
            )}

            {/* My Health Overview Tab */}
            {activeTab === 'myoverview' && (
                <div style={{ padding: '0 0 40px 0' }}>
                    <HealthOverview
                        user={currentUser}
                        history={myHistory}
                        timePeriod={timePeriod}
                        customDateRange={customDateRange}
                    />
                </div>
            )}

            {/* My Measurements Tab (Personal) */}
            {activeTab === 'personal' && (
                <MyMeasurements
                    history={myHistory}
                    loading={loading}
                    onSelectMeasurement={setSelectedMeasurement}
                />
            )}

            {/* Patient History Modal */}
            {selectedUser && (
                <div className="modal-overlay" onClick={() => setSelectedUser(null)} style={{ background: 'rgba(15, 23, 42, 0.4)', backdropFilter: 'blur(8px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <motion.div
                        className="modal-content"
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxWidth: '1200px', width: '95%', maxHeight: '85vh',
                            display: 'flex', flexDirection: 'column',
                            background: 'rgba(255, 255, 255, 0.95)', backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255, 255, 255, 0.5)',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', borderRadius: '24px', padding: '24px'
                        }}
                    >
                        {/* Modal Header */}
                        <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '48px', height: '48px', borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #dc2626, #ef4444)',
                                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontSize: '1.25rem', fontWeight: 'bold'
                                }}>
                                    {selectedUser.firstname?.[0]}{selectedUser.lastname?.[0]}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600', textTransform: 'uppercase' }}>History Analysis</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#1e293b' }}>
                                        {selectedUser.firstname} {selectedUser.lastname}
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedUser(null)} style={{ width: '36px', height: '36px', borderRadius: '50%', border: 'none', background: '#f1f5f9', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}>
                                &times;
                            </button>
                        </div>

                        {/* Modal Content: Unified MyMeasurements Component */}
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                            <MyMeasurements
                                history={userHistory}
                                loading={historyLoading}
                                user={selectedUser}
                                onSelectMeasurement={(m) => {
                                    // Hack: MyMeasurements calls this on select. 
                                    // We want to open detailed view ON TOP of this modal?
                                    // Yes, detailed view has z-index 1300, this modal 1100.
                                    setSelectedMeasurement(m);
                                }}
                            />
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Detailed Result Modal (Shared) */}
            <MeasurementDetailsModal
                measurement={selectedMeasurement}
                onClose={() => setSelectedMeasurement(null)}
            />

        </DashboardLayout>
    );
};

export default NurseDashboard;
