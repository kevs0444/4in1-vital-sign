import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './InactivityWrapper.css';
import juanSadIcon from '../../assets/icons/juan-sad-icon.png';
import { isLocalDevice } from '../../utils/network';
import { sensorAPI, cameraAPI } from '../../utils/api';
import { speak, reinitSpeech } from '../../utils/speech';

// Create Context
const InactivityContext = createContext({
    isInactivityEnabled: true,
    setIsInactivityEnabled: () => { },
    signalActivity: () => { },
    setCustomTimeout: (warningMs, finalMs) => { },
});

// Custom Hook
export const useInactivity = () => useContext(InactivityContext);

// Defaults in milliseconds
const DEFAULT_WARNING = 30000; // 30s
const DEFAULT_FINAL = 60000;   // 60s

// Pages that should NOT trigger the inactivity redirect at all
const EXCLUDED_PATHS = [
    '/',           // Standby page
    '/standby',    // Alternative standby path
];

const InactivityWrapper = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showWarning, setShowWarning] = useState(false);
    const [isInactivityEnabled, setIsInactivityEnabled] = useState(true);

    // Global BP Alert State
    const [showIllegalAlert, setShowIllegalAlert] = useState(false);
    const lastIllegalTimeRef = useRef(Date.now() / 1000); // Only track events happening AFTER this mount

    // Dynamic Timeout State
    const [timeoutConfig, setTimeoutConfig] = useState({
        warning: DEFAULT_WARNING,
        final: DEFAULT_FINAL
    });

    // Refs to hold timer IDs
    const warningTimerRef = useRef(null);
    const finalTimerRef = useRef(null);

    // Helper to update timeouts
    const setCustomTimeout = useCallback((warningMs, finalMs) => {
        if (!warningMs || !finalMs) {
            // Reset to defaults
            setTimeoutConfig({ warning: DEFAULT_WARNING, final: DEFAULT_FINAL });
        } else {
            setTimeoutConfig({ warning: warningMs, final: finalMs });
        }
    }, []);

    // Function to start/reset timers
    const startTimers = useCallback(() => {
        // Clear existing timers
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (finalTimerRef.current) clearTimeout(finalTimerRef.current);

        const currentPath = location.pathname;
        const isExcludedPage = EXCLUDED_PATHS.includes(currentPath);

        // DISABLE FOR REMOTE DEVICES
        if (!isLocalDevice()) {
            return;
        }

        // Don't start timers if excluded or explicitly disabled
        if (isExcludedPage || !isInactivityEnabled) {
            setShowWarning(false);
            return;
        }

        // Set warning timer (Dynamic)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
            // Close any open dropdowns when warning appears
            window.dispatchEvent(new Event('closeAllDropdowns'));
        }, timeoutConfig.warning);

        // Set final timer (Dynamic)
        finalTimerRef.current = setTimeout(() => {
            console.log(`⏰ User inactive for ${(timeoutConfig.final / 1000)}s - Redirecting...`);

            // 🧹 BACKEND CLEANUP: Fire-and-forget (Non-blocking)
            // We do NOT await this, to ensure the UI navigates immediately.
            // This mimics the "Cancel" behavior which feels faster.
            sensorAPI.shutdownAll().catch(e => console.error("Background Shutdown Error:", e));
            cameraAPI.stop().catch(e => console.error("Camera Stop Error:", e));

            // Clear items to reset progress
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');
            localStorage.removeItem('measurementData');
            sessionStorage.removeItem('measurementData');

            setShowWarning(false);
            navigate('/', {
                replace: true,
                state: {
                    fromInactivity: true,
                    reset: true
                }
            });
        }, timeoutConfig.final);
    }, [location.pathname, isInactivityEnabled, navigate, timeoutConfig]);

    // Handler for user activity - also called by components via signalActivity
    const handleActivity = useCallback(() => {
        if (showWarning) {
            setShowWarning(false);
        }
        startTimers();
    }, [showWarning, startTimers]);

    // NEW: Function for components to signal activity (e.g., finger detected on sensor)
    const signalActivity = useCallback(() => {
        console.log('[InactivityWrapper] External activity signal received');
        handleActivity();
    }, [handleActivity]);

    useEffect(() => {
        // Activity events to listen for
        const activityEvents = [
            'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'
        ];

        // Attach listeners with throttle
        const throttleDelay = 1000;
        let lastCall = 0;

        const throttledHandler = (e) => {
            const now = Date.now();
            if (now - lastCall > throttleDelay) {
                lastCall = now;
                handleActivity();
            }
        };

        activityEvents.forEach(event => {
            window.addEventListener(event, throttledHandler, { passive: true });
        });

        // Initial start
        startTimers();

        // Cleanup
        return () => {
            if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
            if (finalTimerRef.current) clearTimeout(finalTimerRef.current);
            activityEvents.forEach(event => {
                window.removeEventListener(event, throttledHandler);
            });
        };
    }, [handleActivity, startTimers]);

    // Reset enabled state and timers when location changes
    useEffect(() => {
        setIsInactivityEnabled(true); // Default to enabled on navigation
        startTimers();
    }, [location.pathname, startTimers]);

    // React to isInactivityEnabled changes - IMPORTANT: Also hide warning immediately
    useEffect(() => {
        if (!isInactivityEnabled) {
            setShowWarning(false); // Immediately hide any warning when disabled
        }
        startTimers();
    }, [isInactivityEnabled, startTimers]);

    // POLL FOR ILLEGAL BP USAGE (Global)
    useEffect(() => {
        const checkIllegalBP = async () => {
            // EXCLUDE REMOTE DEVICES (Admin/Dashboard viewers don't need this alert)
            if (!isLocalDevice()) return;

            // Don't check if we are ON the BP page (Authorized)
            const path = location.pathname.toLowerCase();
            if (path.includes('bloodpressure') || path.includes('blood-pressure')) return;

            try {
                const res = await fetch(`${window.location.protocol}//${window.location.hostname}:5000/api/bp/check_illegal_press`);
                const data = await res.json();

                if (data.timestamp && data.timestamp > lastIllegalTimeRef.current) {
                    console.warn("🚨 Illegal BP Press Detected!");
                    lastIllegalTimeRef.current = data.timestamp;
                    setShowIllegalAlert(true);
                    // Close any open dropdowns when alert appears
                    window.dispatchEvent(new Event('closeAllDropdowns'));

                    // Voice Warning (Re-init to ensure sound)
                    reinitSpeech(true);
                    speak("Please do not use the blood pressure monitor right now.");

                    // Auto-hide after 4s (Backend waits 8s persistently)
                    setTimeout(() => setShowIllegalAlert(false), 4000);
                }
            } catch (err) {
                // Silent fail
            }
        };

        const interval = setInterval(checkIllegalBP, 1500);
        return () => clearInterval(interval);
    }, [location.pathname]);

    // Determine if we should show the overlay
    const canShowWarning = () => {
        if (!showWarning) return false;
        if (EXCLUDED_PATHS.includes(location.pathname)) return false;
        if (!isInactivityEnabled) return false;
        return true;
    };

    return (
        <InactivityContext.Provider value={{ isInactivityEnabled, setIsInactivityEnabled, signalActivity, setCustomTimeout }}>
            {children}
            {/* ILLEGAL BP USAGE ALERT */}
            {showIllegalAlert && (
                <div className="inactivity-overlay" style={{ background: 'rgba(255,0,0,0.3)', zIndex: 9999 }}>
                    <div className="inactivity-modal" style={{ border: '3px solid #ff4444' }}>
                        <div className="inactivity-icon-container" style={{ background: '#ffdddd' }}>
                            <span style={{ fontSize: '3rem' }}>⚠️</span>
                        </div>
                        <h2 className="inactivity-title" style={{ color: '#cc0000' }}>Device Activation Detected</h2>
                        <p className="inactivity-subtitle">
                            Please do NOT press the BP Monitor button when not on the measurement screen.
                        </p>
                        <p className="inactivity-subtitle" style={{ fontWeight: 'bold', marginTop: '10px' }}>
                            (Device stays ON due to hardware restriction)
                        </p>
                        <p className="inactivity-subtitle">
                            Please Login and navigate to Blood Pressure to measure properly.
                        </p>
                    </div>
                </div>
            )}

            {canShowWarning() && (
                <div className="inactivity-overlay" onClick={handleActivity}>
                    <div className="inactivity-modal">
                        {/* Top Shimmer Bar */}
                        <div className="inactivity-modal-bar"></div>

                        <div className="inactivity-icon-container">
                            <img
                                src={juanSadIcon}
                                alt="Inactivity Icon"
                                className="inactivity-icon-image"
                            />
                        </div>
                        <h2 className="inactivity-title">Are you still using the system?</h2>
                        <p className="inactivity-subtitle">Please touch the screen to continue.</p>
                    </div>
                </div>
            )}
        </InactivityContext.Provider>
    );
};

export default InactivityWrapper;
