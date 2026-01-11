/**
 * useRealtimeData - Custom hook for REAL-TIME data updates via WebSockets
 * Uses Socket.IO to receive instant push notifications from the server
 * when data changes (new measurements, new users, etc.)
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

// WebSocket server URL - connects to the backend
const getSocketUrl = () => {
    const hostname = window.location.hostname;

    // 1. Localhost (Kiosk/Mini PC)
    // Connect DIRECTLY to the backend port to avoid any proxy/tunnel overhead
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'http://localhost:5000';
    }

    // 2. Remote (Tailscale/Ngrok/Tunneled)
    // Return undefined to let Socket.IO connect to the current window.location.origin
    // This automatically handles HTTPS/WSS and relative paths correctly
    return undefined;
};

// Global socket instance (singleton pattern)
let globalSocket = null;
let connectionAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize the global WebSocket connection
 */
const initializeSocket = () => {
    if (globalSocket && globalSocket.connected) {
        return globalSocket;
    }

    const socketUrl = getSocketUrl();
    // Dynamically detect security based on current page protocol
    // http://localhost -> secure: false
    // https://remote-url -> secure: true
    const isSecure = window.location.protocol === 'https:';

    console.log('🔌 Initializing WebSocket connection to:', socketUrl, `(Secure: ${isSecure})`);

    globalSocket = io(socketUrl, {
        path: '/socket.io',
        transports: ['polling', 'websocket'], // Use polling first for maximum compatibility with Proxies/Funnels
        secure: isSecure,
        rejectUnauthorized: false,
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        timeout: 20000,
        enableLongPolling: true, // Ensure long polling is enabled
        autoConnect: true,
        rememberUpgrade: true
    });

    globalSocket.on('connect', () => {
        console.log('✅ WebSocket connected:', globalSocket.id);
        connectionAttempts = 0;
    });

    globalSocket.on('disconnect', (reason) => {
        console.log('🔌 WebSocket disconnected:', reason);
    });

    globalSocket.on('connect_error', (error) => {
        connectionAttempts++;
        console.warn(`⚠️ WebSocket connection error (attempt ${connectionAttempts}):`, error.message);

        if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('❌ Max reconnection attempts reached. Real-time updates unavailable.');
        }
    });

    globalSocket.on('connected', (data) => {
        console.log('🟢 Server confirmed connection:', data.message);
    });

    return globalSocket;
};

/**
 * Get the global socket instance
 */
export const getSocket = () => {
    if (!globalSocket) {
        return initializeSocket();
    }
    return globalSocket;
};

/**
 * Hook for real-time dashboard updates via WebSocket
 * @param {Object} options - Configuration options
 * @param {string} options.role - User role (Admin, Doctor, Nurse, Student, Employee)
 * @param {string} options.userId - User ID for personal updates
 * @param {Function} options.onNewMeasurement - Callback when new measurement arrives
 * @param {Function} options.onNewUser - Callback when new user registers (admins only)
 * @param {Function} options.onDataUpdate - Generic callback for any data update
 * @param {Function} options.refetchData - Function to refetch all data
 * @returns {Object} - { isConnected, lastUpdated, connectionStatus }
 */
export const useRealtimeUpdates = (options = {}) => {
    const {
        role = 'general',
        userId = null,
        onNewMeasurement,
        onNewUser,
        onDataUpdate,
        refetchData
    } = options;

    const [isConnected, setIsConnected] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('connecting');
    const socketRef = useRef(null);
    const hasJoinedRoom = useRef(false);

    // Handle incoming data updates
    const handleDataUpdate = useCallback((eventData) => {
        console.log('📡 Real-time update received:', eventData.type);
        setLastUpdated(new Date());

        switch (eventData.type) {
            case 'new_measurement':
                if (onNewMeasurement) {
                    onNewMeasurement(eventData.data);
                }
                // Always refetch to ensure data consistency
                if (refetchData) {
                    refetchData();
                }
                break;

            case 'new_user':
                if (onNewUser) {
                    onNewUser(eventData.data);
                }
                if (refetchData) {
                    refetchData();
                }
                break;

            case 'user_status_update':
            case 'stats_update':
                if (refetchData) {
                    refetchData();
                }
                break;

            default:
                if (onDataUpdate) {
                    onDataUpdate(eventData);
                }
        }
    }, [onNewMeasurement, onNewUser, onDataUpdate, refetchData]);

    useEffect(() => {
        // Initialize socket connection
        const socket = getSocket();
        socketRef.current = socket;

        // Set up event listeners
        const handleConnect = () => {
            setIsConnected(true);
            setConnectionStatus('connected');

            // Join dashboard room based on role
            if (!hasJoinedRoom.current && (role || userId)) {
                socket.emit('join_dashboard', { role, user_id: userId });
                hasJoinedRoom.current = true;
                console.log(`👤 Joined dashboard room: role_${role}`);
            }
        };

        const handleDisconnect = () => {
            setIsConnected(false);
            setConnectionStatus('disconnected');
            hasJoinedRoom.current = false;
        };

        const handleConnectError = () => {
            setConnectionStatus('error');
        };

        // Register event handlers
        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleConnectError);
        socket.on('data_update', handleDataUpdate);

        // If already connected, join room immediately
        if (socket.connected) {
            handleConnect();
        }

        // Cleanup on unmount
        return () => {
            socket.off('connect', handleConnect);
            socket.off('disconnect', handleDisconnect);
            socket.off('connect_error', handleConnectError);
            socket.off('data_update', handleDataUpdate);

            // Leave room on unmount
            if (hasJoinedRoom.current) {
                socket.emit('leave_dashboard', { role, user_id: userId });
                hasJoinedRoom.current = false;
            }
        };
    }, [role, userId, handleDataUpdate]);

    return {
        isConnected,
        lastUpdated,
        connectionStatus,
        socket: socketRef.current
    };
};

/**
 * Helper to format the last updated time in a user-friendly way
 * @param {Date} date - The last updated timestamp
 * @returns {string} - Formatted time string
 */
export const formatLastUpdated = (date) => {
    if (!date) return 'Connecting...';
    const now = new Date();
    const diffMs = now - date;
    const diffSec = Math.floor(diffMs / 1000);

    if (diffSec < 5) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    return date.toLocaleTimeString();
};

// Legacy export for backwards compatibility (deprecated)
export const useRealtimePolling = useRealtimeUpdates;

export default useRealtimeUpdates;
