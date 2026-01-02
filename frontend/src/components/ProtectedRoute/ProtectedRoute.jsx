import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const location = useLocation();
    const storedUser = localStorage.getItem('userData');
    const isAuthenticated = localStorage.getItem('isAuthenticated') === 'true';

    if (!isAuthenticated || !storedUser) {
        // Redirect to login if not authenticated
        // Uses state to remember where they were trying to go
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Parse user data safely
    let user = null;
    try {
        user = JSON.parse(storedUser);
    } catch (e) {
        // Corrupt data, force logout
        localStorage.removeItem('userData');
        localStorage.removeItem('isAuthenticated');
        return <Navigate to="/login" replace />;
    }

    // Optional: Check role if provided
    if (allowedRoles && allowedRoles.length > 0) {
        const userRole = (user.role || '').toLowerCase();
        // Check if user role matches any of the allowed roles (case-insensitive)
        // Note: roles in DB might be 'Student', 'Admin', 'Nurse', etc.
        const hasPermission = allowedRoles.some(role => userRole.includes(role.toLowerCase()));

        if (!hasPermission) {
            console.warn(`User role ${userRole} not authorized for this route. Allowed: ${allowedRoles}`);
            // Redirect to home/standby if unauthorized for this specific page
            return <Navigate to="/" replace />;
        }
    }

    return children;
};

export default ProtectedRoute;
