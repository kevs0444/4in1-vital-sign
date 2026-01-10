import cv2
import numpy as np
import threading
import time
import logging
from app.utils.camera_config import CameraConfig

logger = logging.getLogger(__name__)

class ClearanceManager:
    """
    ClearanceManager - Sequential scanning (Feet -> Body).
    1. Feet: Camera Index 2 (Weight) - Rotated 180, Zoom 1.4x, Square
    2. Body: Camera Index 1 (Wearables) - Rotated 180, Square
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.is_active = False
        self.current_stage = 'idle'
        self.run_id = 0 # To track active sessions
        
        # Frames
        self.feet_frame = None
        self.body_frame = None
        
        # Cameras
        self.cap_feet = None
        self.cap_body = None

        # Status
        self.feet_status = {"message": "Initializing...", "is_compliant": False, "violations": []}
        self.body_status = {"message": "Waiting...", "is_compliant": False, "violations": []}

    def start_clearance(self):
        """Starts Stage 1: Feet Scanning."""
        logger.info("🚀 [ClearanceManager] Starting Stage 1: Feet Scan")
        self._stop_streams()
        
        with self.lock:
            self.run_id += 1
            self.is_active = True
            self.current_stage = 'feet'
            self.feet_status = {"message": "Initializing...", "is_compliant": False, "violations": []}
            self.body_status = {"message": "Waiting...", "is_compliant": False, "violations": []}
        
        self._load_model('feet')
        threading.Thread(target=self._run_feet_camera, args=(self.run_id,), daemon=True).start()

    def start_body_scan(self):
        """Switches to Stage 2: Body Scanning."""
        logger.info("🚀 [ClearanceManager] Switching to Stage 2: Body Scan")
        
        # Stop Feet Camera
        self.is_active = False # Signal feet thread to stop
        time.sleep(0.5)
        
        with self.lock:
            self.run_id += 1
            self.current_stage = 'body'
            self.is_active = True
        
        self._load_model('body')
        threading.Thread(target=self._run_body_camera, args=(self.run_id,), daemon=True).start()

    def _stop_streams(self):
        self.is_active = False
        time.sleep(0.5) # Increased wait to ensure cameras release
        if self.cap_feet: 
            self.cap_feet.release()
            self.cap_feet = None
        if self.cap_body: 
            self.cap_body.release()
            self.cap_body = None

    def _load_model(self, stage):
        try:
            from ultralytics import YOLO
            import os
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            
            if stage == 'feet':
                path = os.path.join(base_dir, 'ai_camera', 'models', 'weight.pt')
                if os.path.exists(path):
                    self.feet_model = YOLO(path)
                    logger.info(f"✅ Loaded Feet Model: {path}")
                else:
                    self.feet_model = None
            elif stage == 'body':
                path = os.path.join(base_dir, 'ai_camera', 'models', 'wearables.pt')
                if os.path.exists(path):
                    self.body_model = YOLO(path)
                    logger.info(f"✅ Loaded Body Model: {path}")
                else:
                    self.body_model = None
        except Exception as e:
            logger.error(f"❌ Model Load Error: {e}")

    def stop_clearance(self):
        logger.info("🛑 [ClearanceManager] Stopping all...")
        self._stop_streams()
        self.current_stage = None

    def _run_detection(self, model, frame, label_prefix):
        """Runs YOLO detection and returns annotated frame + compliance status."""
        if model is None:
            return frame, True, "AI Disabled", []
            
        try:
            # Run inference
            results = model(frame, verbose=False, conf=0.4)
            annotated_frame = results[0].plot()
            names = results[0].names
            boxes = results[0].boxes
            
            violations = []
            allowed_count = 0
            detected_labels = []            

            for box in boxes:
                cls_id = int(box.cls[0])
                label = names.get(cls_id, 'unknown').lower()
                detected_labels.append(label)
                
                if label_prefix == "FEET":
                    # FEET LOGIC:
                    # Must be allowed (barefeet/socks)
                    if label in ['barefeet', 'barefoot', 'socks', 'sock', 'feet', 'foot']:
                        allowed_count += 1
                    else:
                        # Anything else is a violation (shoes, etc)
                        violations.append(label)
                else:
                    # BODY LOGIC:
                    # Any detection is a violation
                    violations.append(label)

            # --- COMPLIANCE LOGIC ---
            if label_prefix == "FEET":
                # Compliant IF: 0 Violations AND >0 Allowed items
                if len(violations) == 0 and allowed_count > 0:
                    is_compliant = True
                    found_item = detected_labels[0].upper() if detected_labels else "FEET"
                    status_msg = f"✅ CLEAR ({found_item})"
                elif len(violations) > 0:
                    is_compliant = False
                    unique_v = list(set(violations))
                    status_msg = f"❌ DETECTED: {', '.join(unique_v).upper()}"
                else:
                    is_compliant = False
                    status_msg = "⚠️ PLEASE STAND ON SCALE"

            else:
                # BODY Logic (Standard)
                if len(violations) == 0:
                    is_compliant = True
                    status_msg = "✅ CLEAR"
                else:
                    is_compliant = False
                    unique_v = list(set(violations))
                    status_msg = f"❌ DETECTED: {', '.join(unique_v).upper()}"

            return annotated_frame, is_compliant, status_msg, violations
            
        except Exception as e:
            logger.error(f"Detection Error: {e}")
            return frame, False, "AI Error", []

    def _apply_zoom(self, frame, zoom_factor):
        if zoom_factor <= 1.0: return frame
        h, w = frame.shape[:2]
        new_w = int(w / zoom_factor)
        new_h = int(h / zoom_factor)
        x1 = (w - new_w) // 2
        y1 = (h - new_h) // 2
        cropped = frame[y1:y1+new_h, x1:x1+new_w]
        return cv2.resize(cropped, (w, h))

    def _apply_square_crop(self, frame):
        h, w = frame.shape[:2]
        size = min(h, w)
        x1 = (w - size) // 2
        y1 = (h - size) // 2
        return frame[y1:y1+size, x1:x1+size]

    def _run_feet_camera(self, my_run_id):
        """Feet Camera - Using Index 2 (Scale)"""
        idx = 2 
        logger.info(f"🦶 Feet Camera: Starting at Index {idx} (Run {my_run_id})")
        
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
             cap = cv2.VideoCapture(idx, cv2.CAP_ANY)
        
        if not cap.isOpened():
            logger.error(f"❌ Feet Camera failed at Index {idx}")
            if self.run_id == my_run_id:
                self.feet_status = {"message": "CAMERA ERROR - REFRESH", "is_compliant": False, "violations": []}
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap_feet = cap
        
        while self.is_active and self.current_stage == 'feet':
            if self.run_id != my_run_id: break # Stale thread check

            ret, frame = cap.read()
            if not ret: 
                time.sleep(0.1)
                continue
            
            # Processing
            frame = cv2.rotate(frame, cv2.ROTATE_180)
            frame = self._apply_zoom(frame, 1.4)
            frame = self._apply_square_crop(frame)
            frame = cv2.resize(frame, (480, 480))
            
            # Detection
            model = getattr(self, 'feet_model', None)
            frame, is_compliant, msg, violations = self._run_detection(model, frame, "FEET")
            
            # Update Status (Thread Safe enough for dict assignment)
            if self.run_id == my_run_id:
                self.feet_status = {"message": msg, "is_compliant": is_compliant, "violations": violations}
            
            cv2.putText(frame, "STEP 1: FEET SCAN", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
            self.feet_frame = frame
            time.sleep(0.01) # Slightly faster loop

        cap.release()
        logger.info(f"🦶 Feet Camera Stopped (Run {my_run_id})")

    def _run_body_camera(self, my_run_id):
        """Body Camera - Using Index 1 (Wearables)"""
        idx = 1
        logger.info(f"👕 Body Camera: Starting at Index {idx} (Run {my_run_id})")
        
        cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
        if not cap.isOpened():
             cap = cv2.VideoCapture(idx, cv2.CAP_ANY)
             
        if not cap.isOpened():
            logger.error(f"❌ Body Camera failed at Index {idx}")
            if self.run_id == my_run_id:
                self.body_status = {"message": "CAMERA ERROR - REFRESH", "is_compliant": False, "violations": []}
            return

        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 30)
        self.cap_body = cap
        
        while self.is_active and self.current_stage == 'body':
            if self.run_id != my_run_id: break

            ret, frame = cap.read()
            if not ret: 
                time.sleep(0.1)
                continue
            
            frame = cv2.rotate(frame, cv2.ROTATE_180)
            frame = self._apply_square_crop(frame)
            frame = cv2.resize(frame, (480, 480))
            
            model = getattr(self, 'body_model', None)
            frame, is_compliant, msg, violations = self._run_detection(model, frame, "BODY")
            
            if self.run_id == my_run_id:
                self.body_status = {"message": msg, "is_compliant": is_compliant, "violations": violations}
            
            cv2.putText(frame, "STEP 2: BODY SCAN", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
            self.body_frame = frame
            time.sleep(0.01)

        cap.release()
        logger.info(f"👕 Body Camera Stopped (Run {my_run_id})")

    def get_stitched_frame(self):
        """Returns the SINGLE active frame based on stage."""
        placeholder = np.zeros((480, 480, 3), dtype=np.uint8)
        cv2.putText(placeholder, "LOADING...", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        while True:
            # If not active, or no frame yet, show placeholder
            frame = placeholder
            
            if self.is_active:
                if self.current_stage == 'feet' and self.feet_frame is not None:
                    frame = self.feet_frame
                elif self.current_stage == 'body' and self.body_frame is not None:
                    frame = self.body_frame
            
            # Always yield something to keep stream alive
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.05)
            
    def _yield_frame(self, img):
         pass 

    def get_status(self):
        return {
            "stage": getattr(self, 'current_stage', 'idle'),
            "feet": getattr(self, 'feet_status', {}),
            "body": getattr(self, 'body_status', {})
        }

clearance_manager = ClearanceManager()
