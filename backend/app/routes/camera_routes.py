"""
LEGACY Camera Routes - DISABLED
All camera functionality for Clearance has been moved to /api/clearance
"""

from flask import Blueprint, jsonify

camera_bp = Blueprint('camera', __name__)

@camera_bp.route('/start', methods=['POST'])
def start_camera():
    return jsonify({"status": "error", "message": "Legacy route disabled. Use /api/clearance/start"}), 410

@camera_bp.route('/stop', methods=['POST'])
def stop_camera():
    return jsonify({"status": "success", "message": "No-op (legacy route)"}), 200

@camera_bp.route('/status', methods=['GET'])
def get_status():
    return jsonify({"message": "Legacy route disabled. Use /api/clearance/status"}), 410

@camera_bp.route('/feet/status', methods=['GET'])
def get_feet_status():
    return jsonify({"message": "Legacy route disabled. Use /api/clearance/status"}), 410

@camera_bp.route('/body/status', methods=['GET'])
def get_body_status():
    return jsonify({"message": "Legacy route disabled. Use /api/clearance/status"}), 410

@camera_bp.route('/set_mode', methods=['POST'])
def set_mode():
    return jsonify({"status": "error", "message": "Legacy route disabled"}), 410

@camera_bp.route('/video_feed', methods=['GET'])
def video_feed():
    return jsonify({"status": "error", "message": "Legacy route disabled. Use /api/clearance/stream"}), 410

@camera_bp.route('/feet/feed', methods=['GET'])
def feet_feed():
    return jsonify({"status": "error", "message": "Legacy route disabled"}), 410

@camera_bp.route('/body/feed', methods=['GET'])
def body_feed():
    return jsonify({"status": "error", "message": "Legacy route disabled"}), 410
