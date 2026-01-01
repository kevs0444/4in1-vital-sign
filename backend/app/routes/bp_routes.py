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
    success, message = bp_sensor.start()
    return jsonify({"success": success, "message": message})

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
