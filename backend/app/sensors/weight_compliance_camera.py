"""
Weight Compliance Camera Controller
Dedicated camera for weight/feet compliance detection.

CAMERA INDICES (Based on ACTUAL PowerShell enumeration order):
- Index 0 = "2 - Blood Pressure Camera"
- Index 1 = "0 - Weight Compliance Camera"  <-- THIS CAMERA
- Index 2 = "1 - Wearables Compliance Camera"

NOTE: The prefix numbers in the camera names do NOT match the actual indices!
"""

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
    from app.utils.camera_config import CameraConfig
except ImportError:
    CameraConfig = None


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

class WeightComplianceCamera:
    def __init__(self):
        self.cap = None
        self.is_running = False
        self.detector = None
        self.lock = threading.Lock()
        self.latest_frame = None
        self.latest_frame = None
        self.latest_clean_frame = None # Store clean frame for capture
        
        # Load from config if available (Dynamic Indexing)
        if CameraConfig:
             self.camera_index = CameraConfig.get_index('weight')
             if self.camera_index is None: self.camera_index = 0  # VERIFIED: Weight = Index 0
        else:
             self.camera_index = 0  # VERIFIED: Weight = Index 0
        
        logger.info(f"🦶 WeightCamera initialized with index: {self.camera_index}")

        self.current_mode = 'feet'
        
        # Image Adjustments (Preserved from user request)
        self.zoom_factor = 1.3 
        self.brightness = 1.0
        self.contrast = 1.0
        self.rotation = 180 # Feet camera is often upside down/rotated
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
            # Prefer clean frame if available
            frame_to_save = self.latest_clean_frame if self.latest_clean_frame is not None else self.latest_frame

            if frame_to_save is None:
                return False, "No frame available"
            
            save_dir = r"C:\Users\VitalSign\Pictures\Camera Roll"
            class_dir = os.path.join(save_dir, class_name)
            if not os.path.exists(class_dir):
                os.makedirs(class_dir)
            
            timestamp = int(time.time() * 1000)
            filename = f"{class_name}_{timestamp}.jpg"
            filepath = os.path.join(class_dir, filename)
            
            cv2.imwrite(filepath, frame_to_save)
            logger.info(f"Captured/Saved Image: {filepath}")
            return True, filepath
        
    def set_mode(self, mode):
        # mode: 'feet' or 'body'
        self.current_mode = mode
        logger.info(f"Switched detection mode to: {mode}")
        return True, f"Mode set to {mode}"

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

    def start_camera(self, camera_index=None, camera_name=None, mode='feet', settings=None):
        """
        Start the camera.
        
        IMPORTANT: We now IGNORE camera_name and use only camera_index.
        The camera_config.json file contains the VERIFIED correct indices.
        PowerShell name resolution was returning incorrect values.
        """
        # DEBUG: Log what we received
        print(f"📷 [Weight] start_camera called: camera_index={camera_index}, camera_name={camera_name}, mode={mode}")
        logger.info(f"[Weight] start_camera called: camera_index={camera_index}, camera_name={camera_name}, mode={mode}")
        
        # 1. Update Mode immediately
        self.current_mode = mode
        
        # 2. Update Settings if provided
        if settings:
            self.set_settings(settings)

        # SIMPLE LOGIC: Use passed index, or fall back to config file
        if camera_index is not None:
            self.camera_index = camera_index
            print(f"📷 [Weight] Using provided camera_index: {camera_index}")
        else:
            # Use the verified config file value
            config_idx = CameraConfig.get_index('weight')
            if config_idx is not None:
                self.camera_index = config_idx
                print(f"📷 [Weight] Using config file index: {config_idx}")
            else:
                self.camera_index = 0  # Ultimate fallback (verified: Weight = Index 0)
                print(f"📷 [Weight] Using hardcoded fallback: 0")
        
        print(f"🎯 [Weight] Final camera_index to use: {self.camera_index}")
        logger.info(f"[Weight] Final camera_index: {self.camera_index}")
            
        if self.is_running:
            # If already running, we just successfully updated mode/settings and index logic
            # However, if index CHANGED, we might need to restart.
            # But the caller (Clearance.jsx) usually stops before starts.
            # If we assume 'start' implies 'ensure running with these params':
            return True, "Camera running (params updated)"
            
        try:
            # Init detector if needed (kept same)
            if ComplianceDetector:
                if self.detector is None:
                    try:
                        self.detector = ComplianceDetector()
                    except Exception as e:
                        logger.error(f"Failed to init detector: {e}")
            else:
                logger.warning("ComplianceDetector class not imported")

            # Robust Camera Opening Strategy
            # Try specified index ONLY to avoid conflict with other sensors
            indices_to_try = [self.camera_index]
            # Removed fallback logic to prevent grabbing the wrong camera
            # if self.camera_index == 0: indices_to_try.append(1)
            # elif self.camera_index == 1: indices_to_try.append(0)
            
            # Backends to try: CAP_ANY (auto-select), then MSMF as fallback
            backends = []
            if os.name == 'nt':
                backends = [cv2.CAP_ANY, cv2.CAP_MSMF, cv2.CAP_DSHOW]
            else:
                backends = [cv2.CAP_ANY]
                
            for idx in indices_to_try:
                for backend in backends:
                    backend_name = "DSHOW" if backend == cv2.CAP_DSHOW else "MSMF" if backend == cv2.CAP_MSMF else "ANY"
                    logger.info(f"[Weight] Trying to open camera {idx} with backend {backend_name}...")
                    
                    try:
                        temp_cap = cv2.VideoCapture(idx, backend)
                        if temp_cap.isOpened():
                            # Test read
                            ret, frame = temp_cap.read()
                            if ret and frame is not None and frame.size > 0:
                                self.cap = temp_cap
                                self.camera_index = idx
                                logger.info(f"[Weight] ✅ Success! Camera {idx} opened with {backend_name}")
                                break # Stop backend loop
                            else:
                                logger.warning(f"[Weight] Camera {idx} with {backend_name} opened but failed to read frame.")
                                temp_cap.release()
                    except Exception as e:
                        logger.error(f"[Weight] Crash trying {idx} {backend_name}: {e}")
                        
                if self.cap and self.cap.isOpened():
                    break # Stop index loop

            if not self.cap or not self.cap.isOpened():
                logger.error(f"[Weight] ❌ Failed to open ANY camera after multiple attempts.")
                return False, "Failed to open camera (checked all backends)"
                
            self.is_running = True
            threading.Thread(target=self._process_feed, daemon=True).start()
            logger.info(f"[Weight] Camera started successfully on index {self.camera_index}")
            return True, "Camera started"
            
        except Exception as e:
            logger.error(f"[Weight] Error starting camera: {e}")
            return False, str(e)

    def stop_camera(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        self.cap = None
        logger.info("[Weight] Camera stopped")
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
            clean_view = frame.copy() # Save clean copy BEFORE drawing
                
            # Run detection based on mode
            current_mode = getattr(self, 'current_mode', 'feet')
            
            if current_mode == 'capture_only':
                 annotated_frame = frame
                 status_msg = "Capture Mode"
                 is_compliant = True
            
            elif current_mode == 'reading':
                 # BP Reading mode is now handled by bp_sensor_controller.py
                 # This mode is deprecated in weight_compliance_camera
                 annotated_frame = frame
                 status_msg = "BP Mode - Use /api/bp/* endpoints"
                 is_compliant = True
            
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
                self.latest_clean_frame = clean_view
                # Preserve existing status fields but ensure real_time_bp persists if valid
                current_bp = self.compliance_status.get('real_time_bp', None)
                
                self.compliance_status = {
                    "is_compliant": is_compliant,
                    "message": status_msg,
                    "mode": getattr(self, 'current_mode', 'feet'),
                    "fps": int(fps),
                    "is_running": self.is_running, # Explicitly state camera is running
                    "real_time_bp": current_bp # Carry over
                }
                
                # If we just calculated a new one, it overrides the carry over in the logic above by modifying self.compliance_status directly in the thread
                # To be safe, let's explicitly set it in the dictionary update here if we are in reading mode
                if current_mode == 'reading' and 'sys_str' in locals() and 'dia_str' in locals():
                     self.compliance_status["real_time_bp"] = {
                         "systolic": sys_str,
                         "diastolic": dia_str,
                         "timestamp": time.time()
                     }
            
            # Adaptive sleep to maintain ~30 FPS cap if system is too fast
            # time.sleep(0.03) # Removed specific sleep to allow max FPS testing

    def list_available_cameras(self):
        """
        Check indices 0-3 to see which ones are valid cameras.
        This is a blocking operation, so use sparingly.
        """
        available = []
        # Checks indices 0 to 3
        for i in range(4):
            try:
                # If we are currently using this camera, it's definitely available
                if self.is_running and self.cap and self.camera_index == i:
                    available.append(i)
                    continue
                
                # Otherwise try to open it
                cap = cv2.VideoCapture(i, cv2.CAP_DSHOW if os.name == 'nt' else cv2.CAP_ANY)
                if cap.isOpened():
                    ret, frame = cap.read()
                    if ret and frame is not None:
                        available.append(i)
                    cap.release()
            except:
                pass
        return available

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
weight_compliance_camera = WeightComplianceCamera()
