// afkHandler.js - Global Inactivity Timeout Handler
// Redirects users to Standby page after 1 minute of inactivity

import { useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

// Timeout duration in milliseconds (1 minute = 60000ms)
const INACTIVITY_TIMEOUT = 60000;

// Pages that should NOT trigger the inactivity redirect
const EXCLUDED_PATHS = [
    '/',           // Standby page
    '/standby',    // Alternative standby path (just in case)
];

/**
 * Custom hook to handle global inactivity timeout.
 * When user is inactive for 1 minute, redirects to Standby page.
 * 
 * @param {number} timeout - Timeout duration in milliseconds (default: 60000ms = 1 minute)
 * @returns {void}
 */
export const useInactivityTimeout = (timeout = INACTIVITY_TIMEOUT) => {
    const navigate = useNavigate();
    const location = useLocation();
    const timeoutRef = useRef(null);
    const isExcludedPage = EXCLUDED_PATHS.includes(location.pathname);

    // Reset the inactivity timer
    const resetTimer = useCallback(() => {
        // Don't set timer if on excluded page
        if (isExcludedPage) {
            return;
        }

        // Clear existing timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
            console.log('⏰ User inactive for 1 minute - Redirecting to Standby...');

            // Clear any session data before redirecting
            localStorage.removeItem('currentUser');
            sessionStorage.removeItem('currentUser');

            // Navigate to standby with a state to indicate timeout
            navigate('/', {
                replace: true,
                state: {
                    fromInactivity: true,
                    previousPath: location.pathname
                }
            });
        }, timeout);
    }, [navigate, location.pathname, timeout, isExcludedPage]);

    useEffect(() => {
        // Don't set up listeners if on excluded page
        if (isExcludedPage) {
            console.log('🔒 Inactivity timeout disabled on Standby page');
            return;
        }

        console.log('⏱️ Inactivity timeout activated - Will redirect after 1 minute of inactivity');

        // List of events that indicate user activity
        const activityEvents = [
            'mousedown',
            'mousemove',
            'keydown',
            'keyup',
            'keypress',
            'touchstart',
            'touchmove',
            'touchend',
            'scroll',
            'wheel',
            'click',
            'focus',
            'visibilitychange'
        ];

        // Handler for activity events (throttled)
        let lastActivity = Date.now();
        const THROTTLE_DELAY = 1000; // Throttle to 1 event per second for performance

        const handleActivity = () => {
            const now = Date.now();
            if (now - lastActivity > THROTTLE_DELAY) {
                lastActivity = now;
                resetTimer();
            }
        };

        // Special handler for visibility change
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                resetTimer();
            }
        };

        // Start the initial timer
        resetTimer();

        // Add event listeners
        activityEvents.forEach(event => {
            if (event === 'visibilitychange') {
                document.addEventListener(event, handleVisibilityChange);
            } else {
                window.addEventListener(event, handleActivity, { passive: true });
            }
        });

        // Cleanup function
        return () => {
            // Clear timeout
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = null;
            }

            // Remove event listeners
            activityEvents.forEach(event => {
                if (event === 'visibilitychange') {
                    document.removeEventListener(event, handleVisibilityChange);
                } else {
                    window.removeEventListener(event, handleActivity);
                }
            });
        };
    }, [resetTimer, isExcludedPage]);
};

/**
 * Hook to use in individual components if you want to manually control the timeout
 * @returns {{ resetTimer: () => void, pauseTimer: () => void, resumeTimer: () => void }}
 */
export const useInactivityControl = () => {
    const timeoutRef = useRef(null);
    const isPaused = useRef(false);

    const pauseTimer = useCallback(() => {
        isPaused.current = true;
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }, []);

    const resumeTimer = useCallback(() => {
        isPaused.current = false;
        // The main hook will handle resetting the timer on next activity
    }, []);

    return { pauseTimer, resumeTimer };
};

export default useInactivityTimeout;
