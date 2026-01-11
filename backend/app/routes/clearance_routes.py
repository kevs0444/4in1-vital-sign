from flask import Blueprint, Response, jsonify, request
from app.sensors.clearance_manager import clearance_manager

clearance_bp = Blueprint('clearance', __name__)

@clearance_bp.route('/start', methods=['POST'])
def start_clearance():
    try:
        clearance_manager.start_clearance()
        return jsonify({"message": "Clearance cameras started"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clearance_bp.route('/stop', methods=['POST'])
def stop_clearance():
    try:
        clearance_manager.stop_clearance()
        return jsonify({"message": "Clearance cameras stopped"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clearance_bp.route('/switch_to_body', methods=['POST'])
def switch_to_body():
    try:
        clearance_manager.start_body_scan()
        return jsonify({"message": "Switched to Body Scan"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@clearance_bp.route('/stream')
def stream_clearance():
    return Response(clearance_manager.get_stitched_frame(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')

@clearance_bp.route('/status')
def status_clearance():
    return jsonify(clearance_manager.get_status())