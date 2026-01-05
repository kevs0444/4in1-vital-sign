from flask import Blueprint, jsonify, Response
from app.sensors.weight_compliance_camera import weight_compliance_camera as camera_manager
from app.utils.camera_config import CameraConfig
import time

camera_bp = Blueprint('camera', __name__)

@camera_bp.route('/start', methods=['POST'])
def start_camera():
    from flask import request
    data = request.get_json(silent=True) or {}
    camera_index = data.get('index', None)
    camera_name = data.get('camera_name', None)
    
    # DEBUG: Print what we received
    print(f"🎥 [CAMERA ROUTE] /camera/start called:")
    print(f"   📥 Received index: {camera_index}")
    print(f"   📥 Received camera_name: {camera_name}")
    
    success, message = camera_manager.start_camera(camera_index=camera_index, camera_name=camera_name)
    
    print(f"   📤 Result: success={success}, message={message}")
    print(f"   🎯 Final camera_index used: {camera_manager.camera_index}")
    
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
    data = request.get_json(silent=True) or {}
    mode = data.get('mode')
    if mode in ['feet', 'body', 'reading', 'capture_only']:
        camera_manager.set_mode(mode)
        return jsonify({"status": "success", "message": f"Mode set to {mode}"})
    return jsonify({"status": "error", "message": "Invalid mode"}), 400

@camera_bp.route('/set_camera', methods=['POST'])
def set_camera():
    from flask import request
    data = request.get_json(silent=True) or {}
    index = data.get('index')
    if index is not None:
        success, msg = camera_manager.set_camera(int(index))
        return jsonify({"status": "success" if success else "error", "message": msg})
    return jsonify({"status": "error", "message": "Index required"}), 400

@camera_bp.route('/list', methods=['GET'])
def list_cameras():
    cameras = camera_manager.list_available_cameras()
    return jsonify({"status": "success", "cameras": cameras})

@camera_bp.route('/set_settings', methods=['POST'])
def set_settings():
    from flask import request
    data = request.get_json(silent=True) or {}
    camera_manager.set_settings(data)
    return jsonify({"status": "success", "message": "Settings updated"})

@camera_bp.route('/capture', methods=['POST'])
def capture():
    from flask import request
    data = request.get_json(silent=True) or {}
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
