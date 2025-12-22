import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './InactivityWrapper.css';
import juanSadIcon from '../../assets/icons/juan-sad-icon.png';

// Timeouts in milliseconds
const WARNING_TIMEOUT = 30000; // 30 seconds
const FINAL_TIMEOUT = 60000;   // 60 seconds (1 minute total)

// Pages that should NOT trigger the inactivity redirect
const EXCLUDED_PATHS = [
    '/',           // Standby page
    '/standby',    // Alternative standby path
    '/measure/max30102',
    '/measure/bmi',
    '/measure/bodytemp',
    '/measure/bloodpressure',
];

const InactivityWrapper = ({ children }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const [showWarning, setShowWarning] = useState(false);

    // Refs to hold timer IDs
    const warningTimerRef = useRef(null);
    const finalTimerRef = useRef(null);

    const isExcludedPage = EXCLUDED_PATHS.includes(location.pathname);

    // Function to start/reset timers
    const startTimers = useCallback(() => {
        // Clear existing timers
        if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
        if (finalTimerRef.current) clearTimeout(finalTimerRef.current);

        // Don't start timers if on excluded page
        if (isExcludedPage) {
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

            // Clear items like simple `afkHandler` did
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');

            setShowWarning(false);
            navigate('/', {
                replace: true,
                state: { fromInactivity: true }
            });
        }, FINAL_TIMEOUT);
    }, [isExcludedPage, navigate]);

    // Handler for user activity
    const handleActivity = useCallback(() => {
        // Only reset if we are not already redirecting (implied by component mount)
        // If the warning is shown, hiding it provides feedback that activity was registered
        if (showWarning) {
            setShowWarning(false);
        }
        startTimers();
    }, [showWarning, startTimers]);

    useEffect(() => {
        // Activity events to listen for
        const activityEvents = [
            'mousedown', 'mousemove', 'keydown', 'touchstart', 'scroll', 'click'
        ];

        // Attach listeners
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

    // Reset when location changes (optional, but good for UX)
    useEffect(() => {
        startTimers();
    }, [location.pathname, startTimers]);

    return (
        <>
            {children}
            {showWarning && !isExcludedPage && (
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
        </>
    );
};

export default InactivityWrapper;
