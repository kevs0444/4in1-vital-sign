/* StudentDashboard.jsx */
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Visibility, Settings, History, Check, Close, ErrorOutline, WarningAmber, Dashboard } from '@mui/icons-material';
import './StudentDashboard.css';
import { getMeasurementHistory, getPopulationAnalytics } from '../../../../utils/api';
import PersonalInfo from '../../../../components/PersonalInfo/PersonalInfo';
import DashboardLayout from '../../../../components/DashboardLayout/DashboardLayout';

import NoDataFound from '../../../../components/NoDataFound/NoDataFound';
import { Assessment } from '@mui/icons-material';
import { useRealtimeUpdates } from '../../../../hooks/useRealtimeData';
import MyMeasurements from '../../../../components/MyMeasurements/MyMeasurements';
import HealthOverview from '../../../../components/HealthOverview/HealthOverview';
import MeasurementDetailsModal from '../../../../components/MeasurementDetailsModal/MeasurementDetailsModal';

// StatusToast Component (Local Definition)
const StatusToast = ({ toast, onClose }) => {
    // toast object should contain: { id (optional), type: 'success'|'error'|'warning', title, message }

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => {
                onClose();
            }, 5000); // Auto close after 5 seconds
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
                        background: 'none',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <Close fontSize="small" />
                    </button>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};


const StudentDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedMeasurement, setSelectedMeasurement] = useState(null);
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'history', 'profile'
    const [toast, setToast] = useState(null);
    const [popAverages, setPopAverages] = useState(null);

    useEffect(() => {
        // Hide body scrollbar to prevent double scrollbars in kiosk mode
        document.body.style.overflow = 'hidden';

        const handleResize = () => {
            // No custom logic needed here for view mode anymore
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            document.body.style.overflow = 'auto';
        };
    }, []);

    const fetchData = React.useCallback(async (userId) => {
        try {
            setLoading(true);

            if (userId) {
                const response = await getMeasurementHistory(userId);
                if (response.success) {
                    setHistory(response.history || []);
                }
            }

            // Fetch Population Data for comparison
            try {
                const popResponse = await getPopulationAnalytics();
                if (popResponse.success) {
                    setPopAverages(popResponse.analytics.averages);
                }
            } catch (pe) {
                console.log("Population stats unavailable");
            }
        } catch (error) {
            console.error("Failed to fetch history:", error);
        } finally {
            setLoading(false);
        }
    }, []);



    // Authenticate & Fetch Data
    useEffect(() => {
        const savedUser = location.state?.user || JSON.parse(localStorage.getItem('userData'));
        if (!savedUser) {
            navigate('/login', { replace: true });
            return;
        }
        setCurrentUser(savedUser);

        const userId = savedUser.userId || savedUser.user_id || savedUser.id;
        if (userId) fetchData(userId);
    }, [navigate, location, fetchData]);



    // Real-time WebSocket updates - instant push notifications
    const refetchAllData = React.useCallback(async () => {
        if (currentUser) {
            const userId = currentUser.userId || currentUser.user_id || currentUser.id;
            if (userId) {
                await fetchData(userId);
            }
        }
    }, [currentUser, fetchData]);

    const { isConnected, lastUpdated } = useRealtimeUpdates({
        role: 'Student',
        userId: currentUser?.userId || currentUser?.user_id || currentUser?.id,
        refetchData: refetchAllData,
        onNewMeasurement: (data) => {
            // Only refetch if this measurement belongs to the current user
            const myId = currentUser?.userId || currentUser?.user_id || currentUser?.id;
            if (data.user_id === myId) {
                console.log('📊 My new measurement received:', data);
            }
        }
    });

    // Time Period Filter State (shared between analytics and table if needed)
    // Analytics (tab 1) uses this. MyMeasurements (tab 2) uses its own internal state by default,
    // but we can make them independent or shared. Keeping independent is cleaner for simple implementation.
    const [timePeriod, setTimePeriod] = useState('weekly'); // daily, weekly, monthly, annually, custom
    const [customDateRange, setCustomDateRange] = useState(null);


    const getRiskColor = (category) => {
        if (!category) return '#64748b';
        const lower = category.toLowerCase();
        if (lower.includes('normal')) return '#166534';
        if (lower.includes('elevated')) return '#ca8a04';
        if (lower.includes('high')) return '#dc2626';
        if (lower.includes('critical')) return '#7f1d1d';
        return '#64748b';
    };


    const handleLogout = () => {
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        navigate('/login', { replace: true });
    };

    const formatDate = (isoString) => {
        if (!isoString) return 'N/A';
        return new Date(isoString).toLocaleDateString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Define Tabs
    const tabs = [
        { id: 'overview', label: 'My Health Overview', icon: <Dashboard /> },
        { id: 'history', label: 'My Measurements', icon: <History /> },
        { id: 'profile', label: 'Personal Info', icon: <Settings /> }
    ];

    if (!currentUser) return null;

    return (
        <DashboardLayout
            title={tabs.find(t => t.id === activeTab)?.label || 'My Health Portal'}
            subtitle="Student Dashboard"
            user={currentUser}
            tabs={tabs}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onLogout={handleLogout}
            lastUpdated={lastUpdated}
            onRefresh={refetchAllData}
            isConnected={isConnected}
            notificationProps={{ userRole: 'student', onNavigate: (tab) => setActiveTab(tab) }}
        >
            <StatusToast toast={toast} onClose={() => setToast(null)} />

            {/* Personal Info Tab */}
            {activeTab === 'profile' && currentUser && (
                <PersonalInfo
                    userId={currentUser.userId || currentUser.user_id || currentUser.id}
                    onProfileUpdate={(updatedUser) => {
                        setCurrentUser(prev => ({ ...prev, ...updatedUser }));
                    }}
                    onShowToast={(type, title, message) => setToast({ type, title, message, id: Date.now() })}
                />
            )}

            {/* My Health Overview Tab */}
            {activeTab === 'overview' && currentUser && (
                <div style={{ padding: '0 0 40px 0' }}>
                    <HealthOverview
                        user={currentUser}
                        history={history}
                        timePeriod={timePeriod}
                        customDateRange={customDateRange}
                        populationAverages={popAverages}
                    />
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'history' && (
                <MyMeasurements
                    history={history}
                    loading={loading}
                    onSelectMeasurement={setSelectedMeasurement}
                />
            )}

            {/* Recommendation Modal */}
            <MeasurementDetailsModal
                measurement={selectedMeasurement}
                onClose={() => setSelectedMeasurement(null)}
            />

        </DashboardLayout >
    );
};

export default StudentDashboard;
