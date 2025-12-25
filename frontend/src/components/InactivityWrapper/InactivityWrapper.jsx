import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './InactivityWrapper.css';
import juanSadIcon from '../../assets/icons/juan-sad-icon.png';
import { isLocalDevice } from '../../utils/network';

// Create Context
const InactivityContext = createContext({
    isInactivityEnabled: true,
    setIsInactivityEnabled: () => { },
    signalActivity: () => { },  // NEW: Allow components to signal activity
});

// Custom Hook
export const useInactivity = () => useContext(InactivityContext);

// Timeouts in milliseconds
const WARNING_TIMEOUT = 30000; // 30 seconds
const FINAL_TIMEOUT = 60000;   // 60 seconds (1 minute total)

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

    // Refs to hold timer IDs
    const warningTimerRef = useRef(null);
    const finalTimerRef = useRef(null);

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

        // Set warning timer (30s)
        warningTimerRef.current = setTimeout(() => {
            setShowWarning(true);
        }, WARNING_TIMEOUT);

        // Set final timer (60s)
        finalTimerRef.current = setTimeout(() => {
            console.log('⏰ User inactive for 1 minute - Redirecting to Standby...');

            // Clear items to reset progress
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');

            // Attempt to trigger a backend reset if possible
            // We'll rely on the Standby page to handle the cleanup or add global cleanup here later

            setShowWarning(false);
            navigate('/', {
                replace: true,
                state: { fromInactivity: true, reset: true } // Add reset flag
            });
        }, FINAL_TIMEOUT);
    }, [location.pathname, isInactivityEnabled, navigate]);

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

    // Determine if we should show the overlay
    const canShowWarning = () => {
        if (!showWarning) return false;
        if (EXCLUDED_PATHS.includes(location.pathname)) return false;
        if (!isInactivityEnabled) return false;
        return true;
    };

    return (
        <InactivityContext.Provider value={{ isInactivityEnabled, setIsInactivityEnabled, signalActivity }}>
            {children}
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
