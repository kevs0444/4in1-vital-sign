"""
WebSocket Events Handler for Real-Time Dashboard Updates
Uses Flask-SocketIO for instant data push to connected clients
"""
from flask_socketio import SocketIO, emit, join_room, leave_room
import logging

logger = logging.getLogger(__name__)

# Global SocketIO instance - will be initialized in create_app
socketio = None

def init_socketio(app):
    """Initialize SocketIO with the Flask app"""
    global socketio
    socketio = SocketIO(
        app, 
        cors_allowed_origins="*",
        async_mode='threading',
        logger=True,
        engineio_logger=True
    )
    
    @socketio.on('connect')
    def handle_connect():
        """Client connected to WebSocket"""
        logger.info(f"🔌 Client connected to WebSocket")
        emit('connected', {'message': 'Connected to real-time updates'})
    
    @socketio.on('disconnect')
    def handle_disconnect():
        """Client disconnected from WebSocket"""
        logger.info(f"🔌 Client disconnected from WebSocket")
    
    @socketio.on('join_dashboard')
    def handle_join_dashboard(data):
        """
        Client joins a specific dashboard room based on their role
        This allows targeted broadcasts (e.g., only notify admins about new users)
        """
        role = data.get('role', 'general')
        user_id = data.get('user_id')
        
        # Join role-based room
        join_room(f"role_{role}")
        
        # Join personal room for user-specific updates
        if user_id:
            join_room(f"user_{user_id}")
        
        logger.info(f"👤 User {user_id} joined dashboard room: role_{role}")
        emit('joined', {'room': role})
    
    @socketio.on('leave_dashboard')
    def handle_leave_dashboard(data):
        """Client leaves dashboard room"""
        role = data.get('role', 'general')
        user_id = data.get('user_id')
        
        leave_room(f"role_{role}")
        if user_id:
            leave_room(f"user_{user_id}")
        
        logger.info(f"👤 User {user_id} left dashboard room: role_{role}")
    
    logger.info("✅ WebSocket (Flask-SocketIO) initialized")
    return socketio

def get_socketio():
    """Get the global SocketIO instance"""
    global socketio
    return socketio


# ============================================
# BROADCAST FUNCTIONS (Called from API routes)
# ============================================

def broadcast_new_measurement(measurement_data, user_id=None):
    """
    Broadcast when a new measurement is saved
    Notifies:
    - All admins, doctors, nurses (they see all patient data)
    - The specific user who took the measurement
    """
    global socketio
    if not socketio:
        logger.warning("SocketIO not initialized, skipping broadcast")
        return
    
    event_data = {
        'type': 'new_measurement',
        'data': measurement_data,
        'user_id': user_id,
        'timestamp': str(measurement_data.get('created_at', ''))
    }
    
    # Broadcast to medical staff and admin
    for role in ['Admin', 'Doctor', 'Nurse']:
        socketio.emit('data_update', event_data, room=f"role_{role}")
    
    # Also notify the specific user
    if user_id:
        socketio.emit('data_update', event_data, room=f"user_{user_id}")
    
    logger.info(f"📡 Broadcast: new_measurement for user {user_id}")


def broadcast_new_user(user_data):
    """
    Broadcast when a new user registers
    Notifies admins only
    """
    global socketio
    if not socketio:
        return
    
    event_data = {
        'type': 'new_user',
        'data': user_data,
        'timestamp': str(user_data.get('created_at', ''))
    }
    
    # Only admins need to know about new users
    socketio.emit('data_update', event_data, room="role_Admin")
    logger.info(f"📡 Broadcast: new_user - {user_data.get('email', 'unknown')}")


def broadcast_user_status_update(user_id, new_status):
    """
    Broadcast when a user's approval status changes
    """
    global socketio
    if not socketio:
        return
    
    event_data = {
        'type': 'user_status_update',
        'user_id': user_id,
        'new_status': new_status
    }
    
    # Notify all admins
    socketio.emit('data_update', event_data, room="role_Admin")
    
    # Also notify the affected user
    socketio.emit('data_update', event_data, room=f"user_{user_id}")
    
    logger.info(f"📡 Broadcast: user_status_update for user {user_id} -> {new_status}")


def broadcast_stats_update():
    """
    Broadcast when overall statistics change
    Sent to all admin dashboards
    """
    global socketio
    if not socketio:
        return
    
    event_data = {
        'type': 'stats_update',
        'message': 'Statistics have been updated'
    }
    
    socketio.emit('data_update', event_data, room="role_Admin")
    logger.info("📡 Broadcast: stats_update")


def broadcast_to_all(event_type, data):
    """
    Broadcast to all connected clients (general updates)
    """
    global socketio
    if not socketio:
        return
    
    event_data = {
        'type': event_type,
        'data': data
    }
    
    socketio.emit('data_update', event_data, broadcast=True)
    logger.info(f"📡 Broadcast to all: {event_type}")
