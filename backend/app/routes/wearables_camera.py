"""
Wearables Camera Controller
Dedicated camera for wearables/body detection (watch, bag, cap, ID lace, etc.)
Camera Index: 0 (0=Wearables, 1=Weight, 2=BP)
"""

import cv2
import threading
import time
import os
import logging
from flask import Blueprint, Response, jsonify

logger = logging.getLogger(__name__)

class WearablesCameraController:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance
    
    def __init__(self):
        if self._initialized:
            return
        self._initialized = True
        
        self.cap = None
        self.is_running = False
        self.lock = threading.Lock()
        self.latest_frame = None
        self.camera_index = 0  # Index 0 for Wearables camera (0=Wearables, 1=Weight, 2=BP)
        
        logger.info("👕 WearablesCameraController initialized")
    
    def start(self, camera_index=None):
        if camera_index is not None:
            self.camera_index = camera_index
            
        if self.is_running:
            return True, "Wearables Camera already running"
        
        try:
            # Try CAP_ANY first (auto-select), then specific backends as fallback
            backends_to_try = [cv2.CAP_ANY, cv2.CAP_MSMF] if os.name == 'nt' else [cv2.CAP_ANY]
            
            for backend in backends_to_try:
                backend_name = "ANY" if backend == cv2.CAP_ANY else "MSMF"
                logger.info(f"[Wearables] Trying camera {self.camera_index} with {backend_name}...")
                
                try:
                    self.cap = cv2.VideoCapture(self.camera_index, backend)
                    if self.cap.isOpened():
                        ret, frame = self.cap.read()
                        if ret and frame is not None:
                            logger.info(f"[Wearables] ✅ Camera {self.camera_index} opened with {backend_name}")
                            break
                        else:
                            self.cap.release()
                            self.cap = None
                except Exception as e:
                    logger.warning(f"[Wearables] Backend {backend_name} failed: {e}")
                    
            if not self.cap or not self.cap.isOpened():
                logger.error(f"[Wearables] ❌ Failed to open camera {self.camera_index}")
                return False, "Failed to open wearables camera"
            
            self.is_running = True
            threading.Thread(target=self._process_loop, daemon=True).start()
            logger.info(f"[Wearables] ✅ Camera {self.camera_index} started")
            return True, "Wearables Camera started"
            
        except Exception as e:
            logger.error(f"[Wearables] Start error: {e}")
            return False, str(e)
            
    def stop(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
            self.cap = None
        return True, "Wearables Camera stopped"
        
    def get_frame(self):
        with self.lock:
            if self.latest_frame is None:
                return None
            _, buffer = cv2.imencode('.jpg', self.latest_frame)
            return buffer.tobytes()
            
    def _process_loop(self):
        while self.is_running and self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            # Simple resize for performance if needed, keeping raw for now
            
            with self.lock:
                self.latest_frame = frame
            
            time.sleep(0.04)  # ~25fps

# Global Instance
wearables_camera = WearablesCameraController()

# Blueprint
wearables_routes = Blueprint('wearables', __name__, url_prefix='/api/wearables')

@wearables_routes.route('/start', methods=['POST'])
def start_wearables_camera():
    from flask import request
    data = request.get_json() or {}
    camera_index = data.get('index', None)
    success, message = wearables_camera.start(camera_index=camera_index)
    return jsonify({"success": success, "message": message})

@wearables_routes.route('/stop', methods=['POST'])
def stop_wearables_camera():
    success, message = wearables_camera.stop()
    return jsonify({"success": success, "message": message})

@wearables_routes.route('/video_feed', methods=['GET'])
def wearables_video_feed():
    def generate():
        while True:
            frame_bytes = wearables_camera.get_frame()
            if frame_bytes:
                yield (b'--frame\r\n'
                       b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            else:
                time.sleep(0.1)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')
