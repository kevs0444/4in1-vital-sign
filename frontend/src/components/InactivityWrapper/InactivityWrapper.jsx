// InactivityWrapper.jsx - Global Inactivity Timeout Wrapper Component
// This component wraps the entire app and handles inactivity timeout globally

import React from 'react';
import { useInactivityTimeout } from '../../utils/afkHandler';

/**
 * InactivityWrapper Component
 * 
 * Wraps children components and applies global inactivity timeout.
 * After 1 minute of inactivity, redirects user to Standby page.
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components to render
 * @returns {React.ReactElement} The wrapped children
 */
const InactivityWrapper = ({ children }) => {
    // Apply the inactivity timeout hook
    useInactivityTimeout();

    return <>{children}</>;
};

export default InactivityWrapper;
