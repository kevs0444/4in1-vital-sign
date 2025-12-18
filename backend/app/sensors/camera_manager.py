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
        self.camera_index = 0
        self.current_mode = 'feet'
        
        # Image Adjustments
        self.zoom_factor = 1.0
        self.brightness = 1.0
        self.contrast = 1.0
        self.rotation = 0
        self.square_crop = True
        
        self.compliance_status = {
            "is_compliant": False,
            "message": "Initializing...",
            "mode": "feet"
        }
        
    def set_settings(self, settings):
        with self.lock:
            self.zoom_factor = float(settings.get('zoom', self.zoom_factor))
            self.brightness = float(settings.get('brightness', self.brightness))
            self.contrast = float(settings.get('contrast', self.contrast))
            self.rotation = int(settings.get('rotation', self.rotation))
            self.square_crop = bool(settings.get('square_crop', self.square_crop))
        logger.info(f"Updated camera settings: {settings}")

    def apply_filters(self, frame):
        # 1. Apply Rotation First
        if self.rotation == 90:
            frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
        elif self.rotation == 180:
            frame = cv2.rotate(frame, cv2.ROTATE_180)
        elif self.rotation == 270:
            frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)

        h, w = frame.shape[:2]
        
        # 2. Apply Square Crop (if enabled)
        if self.square_crop:
            min_dim = min(h, w)
            start_x = (w - min_dim) // 2
            start_y = (h - min_dim) // 2
            frame = frame[start_y:start_y+min_dim, start_x:start_x+min_dim]
            h, w = frame.shape[:2]

        # 3. Apply Zoom
        if self.zoom_factor != 1.0:
            if self.zoom_factor > 1.0:
                new_h, new_w = int(h / self.zoom_factor), int(w / self.zoom_factor)
                top = (h - new_h) // 2
                left = (w - new_w) // 2
                frame = frame[top:top+new_h, left:left+new_w]
                frame = cv2.resize(frame, (w, h))
            else:
                new_h, new_w = int(h * self.zoom_factor), int(w * self.zoom_factor)
                resized = cv2.resize(frame, (new_w, new_h))
                frame = cv2.copyMakeBorder(
                    resized, 
                    top=(h - new_h) // 2, 
                    bottom=(h - new_h) - (h - new_h) // 2,
                    left=(w - new_w) // 2, 
                    right=(w - new_w) - (w - new_w) // 2,
                    borderType=cv2.BORDER_CONSTANT, 
                    value=[0, 0, 0]
                )

        # 4. Apply Brightness & Contrast
        if self.brightness != 1.0 or self.contrast != 1.0:
            # contrast is alpha, brightness baseline is shifted
            frame = cv2.convertScaleAbs(frame, alpha=self.contrast, beta=int((self.brightness - 1.0) * 50))
        
        return frame

    def capture_image(self, class_name):
        with self.lock:
            if self.latest_frame is None:
                return False, "No frame available"
            
            save_dir = r"C:\Users\VitalSign\Pictures\Camera Roll"
            class_dir = os.path.join(save_dir, class_name)
            if not os.path.exists(class_dir):
                os.makedirs(class_dir)
            
            timestamp = int(time.time() * 1000)
            filename = f"{class_name}_{timestamp}.jpg"
            filepath = os.path.join(class_dir, filename)
            
            cv2.imwrite(filepath, self.latest_frame)
            logger.info(f"Captured/Saved Image: {filepath}")
            return True, filepath
        
    def set_mode(self, mode):
        # mode: 'feet' or 'body'
        self.current_mode = mode
        logger.info(f"Switched detection mode to: {mode}")

    def set_camera(self, index):
        if self.camera_index == index:
            return True, "Already on this camera"
            
        self.camera_index = index
        # Restart camera with new index
        if self.is_running:
            self.stop_camera()
            time.sleep(0.5)
            self.start_camera(index)
        return True, f"Switched to camera {index}"

    def start_camera(self, camera_index=None):
        if camera_index is not None:
            self.camera_index = camera_index
            
        if self.is_running:
            return True, "Camera already running"
            
        try:
            if ComplianceDetector:
                if self.detector is None:
                    self.detector = ComplianceDetector()
            else:
                logger.error("ComplianceDetector not available")
                return False, "AI Module not available"

            # Try to open camera
            logger.info(f"Opening camera index: {self.camera_index}")
            self.cap = cv2.VideoCapture(self.camera_index)
            if not self.cap.isOpened():
                logger.error(f"Failed to open camera {self.camera_index}")
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
        while self.is_running and self.cap is not None and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            # Apply Image Adjustments (Zoom, Brightness, Rotation, Square)
            frame = self.apply_filters(frame)
                
            # Run detection based on mode
            if self.detector:
                if getattr(self, 'current_mode', 'feet') == 'body':
                     # Body/Wearables Mode
                     annotated_frame, status_msg, is_compliant = self.detector.detect_body(frame)
                else:
                     # Feet Mode (Default)
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
                    "mode": getattr(self, 'current_mode', 'feet')
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
