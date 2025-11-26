import cv2
import threading
import time
import sys
import os
import logging

# Add backend root to path to allow importing ai_camera
# Assuming this file is in backend/app/sensors/
# We need to go up 3 levels to reach backend/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

try:
    from backend.ai_camera.detection.dual_camera_detect import ComplianceDetector
except ImportError:
    # Fallback if backend is not a package or path issue
    try:
        from ai_camera.detection.dual_camera_detect import ComplianceDetector
    except ImportError:
        print("Error: Could not import ComplianceDetector. Make sure ai_camera is in the path.")
        ComplianceDetector = None

logger = logging.getLogger(__name__)

class CameraManager:
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.detector = None
        self.lock = threading.Lock()
        self.latest_frame = None
        self.compliance_status = {
            "is_compliant": False,
            "message": "Initializing...",
            "bare_feet_detected": False
        }
        
    def start_camera(self, camera_index=0):
        if self.is_running:
            logger.info("Camera already running")
            return True, "Camera already running"
            
        try:
            if ComplianceDetector:
                self.detector = ComplianceDetector()
            else:
                logger.error("ComplianceDetector not available")
                return False, "AI Module not available"

            # Try to open camera
            self.cap = cv2.VideoCapture(camera_index)
            if not self.cap.isOpened():
                # Try fallback index 1 if 0 fails, or vice versa
                fallback_index = 1 if camera_index == 0 else 0
                logger.warning(f"Failed to open camera {camera_index}, trying {fallback_index}")
                self.cap = cv2.VideoCapture(fallback_index)
                
                if not self.cap.isOpened():
                    logger.error("Failed to open any camera")
                    return False, "Failed to open camera"
                
            self.is_running = True
            threading.Thread(target=self._process_feed, daemon=True).start()
            logger.info(f"Camera started successfully")
            return True, "Camera started"
            
        except Exception as e:
            logger.error(f"Error starting camera: {e}")
            return False, str(e)

    def stop_camera(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        self.cap = None
        logger.info("Camera stopped")
        return True, "Camera stopped"
        
    def _process_feed(self):
        while self.is_running and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                continue
                
            # Run detection
            if self.detector:
                annotated_frame, status_msg, is_compliant = self.detector.detect_feet_compliance(frame)
            else:
                annotated_frame = frame
                status_msg = "AI Error"
                is_compliant = False
            
            with self.lock:
                self.latest_frame = annotated_frame
                self.compliance_status = {
                    "is_compliant": is_compliant,
                    "message": status_msg,
                    "bare_feet_detected": is_compliant
                }
            
            time.sleep(0.03) # ~30 FPS

    def get_frame(self):
        with self.lock:
            if self.latest_frame is None:
                return None
            ret, jpeg = cv2.imencode('.jpg', self.latest_frame)
            return jpeg.tobytes()

    def get_status(self):
        with self.lock:
            return self.compliance_status

# Global instance
camera_manager = CameraManager()
