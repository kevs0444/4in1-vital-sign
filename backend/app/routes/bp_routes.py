"""
Blood Pressure Sensor API Routes
Dedicated endpoints for BP measurement using bp_sensor_controller.py
"""

from flask import Blueprint, jsonify, Response
from ..sensors.bp_sensor_controller import bp_sensor
import logging

logger = logging.getLogger(__name__)

bp_routes = Blueprint('bp', __name__, url_prefix='/api/bp')

@bp_routes.route('/start', methods=['POST'])
def start_bp_camera():
    """Start the BP camera and detection."""
    from flask import request
    data = request.get_json(silent=True) or {}
    camera_name = data.get('camera_name', None)
    camera_index = data.get('index', None)
    
    success, message = bp_sensor.start(camera_index=camera_index, camera_name=camera_name)
    return jsonify({"success": success, "message": message})

@bp_routes.route('/trigger', methods=['POST'])
def trigger_bp_measurement():
    """Send 'start' command to Arduino to simulate physical button press.
    This allows the screen button to start BP measurement.
    Only sends command ONCE per measurement session to avoid looping."""
    
    # Check if already triggered to prevent looping
    if bp_sensor.start_command_sent:
        print("⏳ BP Start already sent - ignoring duplicate trigger")
        return jsonify({"success": True, "message": "Already triggered"})
    
    print("🩺 Screen button pressed - Triggering BP measurement via Arduino...")
    
    # First ensure camera is running
    if not bp_sensor.is_running:
        bp_sensor.start()
    
    # Send start command to Arduino (simulates button press)
    success = bp_sensor.send_command("start")
    if success:
        bp_sensor.start_command_sent = True  # Mark as sent
        print("✅ BP Start command sent to Arduino")
        return jsonify({"success": True, "message": "BP measurement triggered"})
    else:
        print("⚠️ Arduino not connected - Using physical button instead")
        return jsonify({"success": True, "message": "Camera started (use physical button)"})

@bp_routes.route('/set_camera', methods=['POST'])
def set_bp_camera_index():
    """Switch the BP camera index dynamically."""
    from flask import request
    data = request.json
    index = data.get('index')
    if index is not None:
        # Stop, switch index, and restart
        bp_sensor.stop()
        success, msg = bp_sensor.start(camera_index=int(index))
        return jsonify({"success": success, "message": msg})
    return jsonify({"success": False, "message": "Index required"}), 400

@bp_routes.route('/stop', methods=['POST'])
def stop_bp_camera():
    """Stop the BP camera."""
    success, message = bp_sensor.stop()
    return jsonify({"success": success, "message": message})

@bp_routes.route('/status', methods=['GET'])
def get_bp_status():
    """Get real-time BP reading status."""
    status = bp_sensor.get_status()
    return jsonify(status)

@bp_routes.route('/video_feed', methods=['GET'])
def bp_video_feed():
    """Stream the BP camera feed as MJPEG."""
    def generate():
        while True:
            frame_bytes = bp_sensor.get_frame()
            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                # No frame available, wait a bit
                import time
                time.sleep(0.1)
    
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@bp_routes.route('/set_settings', methods=['POST'])
def set_bp_settings():
    """Update BP camera settings."""
    from flask import request
    data = request.json
    bp_sensor.set_settings(data)
    return jsonify({"success": True, "message": "Settings updated"})
