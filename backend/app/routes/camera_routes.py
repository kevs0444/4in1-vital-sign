from flask import Blueprint, jsonify, Response
from app.sensors.camera_manager import camera_manager
import time

camera_bp = Blueprint('camera', __name__)

@camera_bp.route('/start', methods=['POST'])
def start_camera():
    success, message = camera_manager.start_camera()
    if success:
        return jsonify({"status": "success", "message": message})
    else:
        return jsonify({"status": "error", "message": message}), 500

@camera_bp.route('/stop', methods=['POST'])
def stop_camera():
    success, message = camera_manager.stop_camera()
    return jsonify({"status": "success", "message": message})

@camera_bp.route('/status', methods=['GET'])
def get_status():
    return jsonify(camera_manager.get_status())

def generate_frames():
    while True:
        frame = camera_manager.get_frame()
        if frame:
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n')
        else:
            # If no frame, wait a bit to avoid CPU spin
            time.sleep(0.1)

@camera_bp.route('/video_feed')
def video_feed():
    return Response(generate_frames(),
                    mimetype='multipart/x-mixed-replace; boundary=frame')
