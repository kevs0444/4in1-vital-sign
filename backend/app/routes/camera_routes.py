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

@camera_bp.route('/set_mode', methods=['POST'])
def set_mode():
    from flask import request
    data = request.json
    mode = data.get('mode')
    if mode in ['feet', 'body']:
        camera_manager.set_mode(mode)
        return jsonify({"status": "success", "message": f"Mode set to {mode}"})
    return jsonify({"status": "error", "message": "Invalid mode"}), 400

@camera_bp.route('/set_camera', methods=['POST'])
def set_camera():
    from flask import request
    data = request.json
    index = data.get('index')
    if index is not None:
        success, msg = camera_manager.set_camera(int(index))
        return jsonify({"status": "success" if success else "error", "message": msg})
    return jsonify({"status": "error", "message": "Index required"}), 400

@camera_bp.route('/set_settings', methods=['POST'])
def set_settings():
    from flask import request
    data = request.json
    camera_manager.set_settings(data)
    return jsonify({"status": "success", "message": "Settings updated"})

@camera_bp.route('/capture', methods=['POST'])
def capture():
    from flask import request
    data = request.json
    class_name = data.get('class_name', 'unknown')
    success, result = camera_manager.capture_image(class_name)
    if success:
        return jsonify({"status": "success", "filepath": result})
    return jsonify({"status": "error", "message": result}), 500

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
