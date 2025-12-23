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
                    try:
                        self.detector = ComplianceDetector()
                    except Exception as e:
                        logger.error(f"Failed to init detector: {e}")
            else:
                logger.warning("ComplianceDetector class not imported")

            # Proceed even if detector is None, as reading mode doesn't need it


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
        prev_time = 0
        while self.is_running and self.cap is not None and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            # FPS Calculation
            curr_time = time.time()
            fps = 1 / (curr_time - prev_time) if prev_time > 0 else 0
            prev_time = curr_time
            
            # Apply Image Adjustments (Zoom, Brightness, Rotation, Square)
            frame = self.apply_filters(frame)
                
            # Run detection based on mode
            current_mode = getattr(self, 'current_mode', 'feet')
            
            if current_mode == 'capture_only':
                 annotated_frame = frame
                 status_msg = "Capture Mode"
                 is_compliant = True
            
            elif current_mode == 'reading':
                 # --- NEW SMART BP DETECTION ---
                 annotated_frame = frame.copy()
                 h, w = frame.shape[:2]
                 
                 # Guide Box (White, thin): Shows where to aim
                 center_x, center_y = w // 2, h // 2
                 box_w, box_h = int(w * 0.6), int(h * 0.6)
                 cv2.rectangle(annotated_frame, 
                               (center_x - box_w//2, center_y - box_h//2), 
                               (center_x + box_w//2, center_y + box_h//2), 
                               (255, 255, 255), 1)
                 
                 # Lazy Load YOLO (only if needed)
                 if not hasattr(self, 'bp_yolo'):
                     try:
                         from ultralytics import YOLO
                         yolo_path = os.path.join(os.path.dirname(__file__), '../../ai_camera/models/yolo11n.pt')
                         self.bp_yolo = YOLO(yolo_path)
                     except Exception as e:
                         logger.error(f"Failed to load YOLO for BP: {e}")
                         self.bp_yolo = None

                 # Run Detection every ~3 frames to save CPU
                 # We simply use a frame counter or time check, but for now lets try every frame for smoothness
                 # YOLO Nano is fast!
                 if self.bp_yolo:
                     results = self.bp_yolo(frame, classes=[62, 63, 67, 72, 73], conf=0.15, verbose=False)
                     
                     monitor_detected = False
                     if results and len(results[0].boxes) > 0:
                         # Find largest box
                         best_box = None
                         max_area = 0
                         for box in results[0].boxes:
                             x1, y1, x2, y2 = map(int, box.xyxy[0])
                             area = (x2 - x1) * (y2 - y1)
                             if area > max_area:
                                 max_area = area
                                 best_box = (x1, y1, x2, y2)
                         
                         if best_box:
                             monitor_detected = True
                             bx1, by1, bx2, by2 = best_box
                             
                             # Draw GREEN Box (Success!)
                             cv2.rectangle(annotated_frame, (bx1, by1), (bx2, by2), (0, 255, 0), 3)
                             cv2.putText(annotated_frame, "BP MONITOR DETECTED", (bx1, by1 - 10), 
                                         cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                 
                 if not monitor_detected:
                      cv2.putText(annotated_frame, "Align Monitor Here", (center_x - 80, center_y), 
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 1)

                 status_msg = "Reading Mode"
                 is_compliant = True # In reading mode, we are always "compliant" to allow capture
            
            elif self.detector:
                if current_mode == 'body':
                     # Body/Wearables Mode
                     annotated_frame, status_msg, is_compliant = self.detector.detect_body(frame)
                else:
                     # Feet Mode (Default)
                     annotated_frame, status_msg, is_compliant = self.detector.detect_feet_compliance(frame)
            else:
                annotated_frame = frame
                status_msg = "No AI Module"
                is_compliant = False
            
            with self.lock:
                self.latest_frame = annotated_frame
                self.compliance_status = {
                    "is_compliant": is_compliant,
                    "message": status_msg,
                    "mode": getattr(self, 'current_mode', 'feet'),
                    "fps": int(fps)
                }
            
            # Adaptive sleep to maintain ~30 FPS cap if system is too fast
            # time.sleep(0.03) # Removed specific sleep to allow max FPS testing

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
