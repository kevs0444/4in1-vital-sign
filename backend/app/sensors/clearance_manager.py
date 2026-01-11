import cv2
import numpy as np
import threading
import time
import logging
import gc

logger = logging.getLogger(__name__)

class ClearanceManager:
    """
    ClearanceManager - Simplified design.
    - Models loaded once, reused forever
    - Single active thread at a time
    - No complex run_id tracking
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.is_active = False
        self.current_stage = 'idle'
        
        # Frames
        self.feet_frame = None
        self.body_frame = None
        
        # Cameras
        self.cap_feet = None
        self.cap_body = None
        
        # Thread - only track for join
        self.active_thread = None
        
        # Models - loaded ONCE
        self.feet_model = None
        self.body_model = None
        self._models_loaded = False

        # Status
        self.feet_status = {"message": "Initializing...", "is_compliant": False, "violations": []}
        self.body_status = {"message": "Waiting...", "is_compliant": False, "violations": []}
        
        # Debug counter
        self.start_count = 0

    def _ensure_models_loaded(self):
        """Load models once on first use."""
        if self._models_loaded:
            return
            
        try:
            from ultralytics import YOLO
            import os
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            
            feet_path = os.path.join(base_dir, 'ai_camera', 'models', 'weight.pt')
            if os.path.exists(feet_path):
                self.feet_model = YOLO(feet_path)
                logger.info(f"✅ Loaded Feet Model")
            
            body_path = os.path.join(base_dir, 'ai_camera', 'models', 'wearables.pt')
            if os.path.exists(body_path):
                self.body_model = YOLO(body_path)
                logger.info(f"✅ Loaded Body Model")
            
            self._models_loaded = True
        except Exception as e:
            logger.error(f"❌ Model Load Error: {e}")

    def _force_stop(self):
        """Force stop everything - release cameras first to unblock threads."""
        logger.info("🧹 Force stopping...")
        self.is_active = False
        
        # Release cameras to unblock cap.read()
        if self.cap_feet:
            try:
                self.cap_feet.release()
            except:
                pass
            self.cap_feet = None
            
        if self.cap_body:
            try:
                self.cap_body.release()
            except:
                pass
            self.cap_body = None
        
        # Wait for thread
        if self.active_thread and self.active_thread.is_alive():
            self.active_thread.join(timeout=2.0)
            if self.active_thread.is_alive():
                logger.warning("⚠️ Thread did not exit in time")
        
        self.active_thread = None
        gc.collect()
        time.sleep(0.2)

    def start_clearance(self):
        """Starts Stage 1: Feet Scanning."""
        self.start_count += 1
        logger.info(f"")
        logger.info(f"{'='*50}")
        logger.info(f"🚀 START CLEARANCE - Attempt #{self.start_count}")
        logger.info(f"{'='*50}")
        logger.info(f"   is_active: {self.is_active}")
        logger.info(f"   current_stage: {self.current_stage}")
        logger.info(f"   active_thread alive: {self.active_thread.is_alive() if self.active_thread else 'None'}")
        logger.info(f"   cap_feet: {self.cap_feet is not None}")
        
        # Stop any existing
        self._force_stop()
        
        # Ensure models loaded
        self._ensure_models_loaded()
        
        # Reset state
        self.is_active = True
        self.current_stage = 'feet'
        self.feet_status = {"message": "Initializing...", "is_compliant": False, "violations": []}
        self.body_status = {"message": "Waiting...", "is_compliant": False, "violations": []}
        self.feet_frame = None
        self.body_frame = None
        
        # Start thread
        self.active_thread = threading.Thread(target=self._run_feet_camera, daemon=True)
        self.active_thread.start()

    def start_body_scan(self):
        """Switches to Stage 2: Body Scanning."""
        logger.info("🚀 Switching to Body Scan")
        
        self._force_stop()
        
        self.is_active = True
        self.current_stage = 'body'
        self.body_frame = None
        
        self.active_thread = threading.Thread(target=self._run_body_camera, daemon=True)
        self.active_thread.start()

    def stop_clearance(self):
        """Stop everything."""
        logger.info("🛑 Stopping Clearance")
        self._force_stop()
        self.current_stage = 'idle'

    def _run_detection(self, model, frame, label_prefix):
        if model is None:
            return frame, False, "AI Not Loaded", []
            
        try:
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
                    if label in ['barefeet', 'barefoot', 'socks', 'sock', 'feet', 'foot']:
                        allowed_count += 1
                    else:
                        violations.append(label)
                else:
                    violations.append(label)

            if label_prefix == "FEET":
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

    def _run_feet_camera(self):
        """Feet Camera Thread"""
        idx = 2 
        logger.info(f"🦶 Feet Camera Starting (Index {idx})")
        
        cap = None
        try:
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap = cv2.VideoCapture(idx, cv2.CAP_ANY)
            
            if not cap.isOpened():
                logger.error(f"❌ Feet Camera failed to open")
                self.feet_status = {"message": "CAMERA ERROR", "is_compliant": False, "violations": []}
                return

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap_feet = cap
            
            logger.info(f"🦶 Feet Camera opened successfully")
            
            frame_count = 0
            fail_count = 0
            
            while self.is_active and self.current_stage == 'feet':
                ret, frame = cap.read()
                if not ret:
                    fail_count += 1
                    if fail_count % 30 == 0:  # Log every 30 failures
                        logger.warning(f"🦶 Frame read failed {fail_count} times")
                    time.sleep(0.03)
                    continue
                
                fail_count = 0  # Reset on success
                frame_count += 1
                
                frame = cv2.rotate(frame, cv2.ROTATE_180)
                frame = self._apply_zoom(frame, 1.4)
                frame = self._apply_square_crop(frame)
                frame = cv2.resize(frame, (480, 480))
                
                # Run detection
                frame, is_compliant, msg, violations = self._run_detection(self.feet_model, frame, "FEET")
                
                cv2.putText(frame, "STEP 1: FEET SCAN", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 0), 2)
                
                # Update status and frame
                self.feet_status = {"message": msg, "is_compliant": is_compliant, "violations": violations}
                self.feet_frame = frame
                
                # Log first successful update
                if frame_count == 1:
                    logger.info(f"🦶 First status update: {msg}")
                
                time.sleep(0.03)
        
        except Exception as e:
            logger.error(f"🦶 Feet thread error: {e}")
            self.feet_status = {"message": f"ERROR: {e}", "is_compliant": False, "violations": []}
        finally:
            if cap:
                try:
                    cap.release()
                except:
                    pass
            self.cap_feet = None
            logger.info(f"🦶 Feet Camera Stopped")

    def _run_body_camera(self):
        """Body Camera Thread"""
        idx = 1
        logger.info(f"👕 Body Camera Starting (Index {idx})")
        
        cap = None
        try:
            cap = cv2.VideoCapture(idx, cv2.CAP_DSHOW)
            if not cap.isOpened():
                cap = cv2.VideoCapture(idx, cv2.CAP_ANY)
                 
            if not cap.isOpened():
                logger.error(f"❌ Body Camera failed to open")
                self.body_status = {"message": "CAMERA ERROR", "is_compliant": False, "violations": []}
                return

            cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
            cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
            cap.set(cv2.CAP_PROP_FPS, 30)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            self.cap_body = cap
            
            logger.info(f"👕 Body Camera opened successfully")
            
            while self.is_active and self.current_stage == 'body':
                ret, frame = cap.read()
                if not ret: 
                    time.sleep(0.03)
                    continue
                
                frame = cv2.rotate(frame, cv2.ROTATE_180)
                frame = self._apply_square_crop(frame)
                frame = cv2.resize(frame, (480, 480))
                
                frame, is_compliant, msg, violations = self._run_detection(self.body_model, frame, "BODY")
                
                cv2.putText(frame, "STEP 2: BODY SCAN", (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 255), 2)
                
                self.body_status = {"message": msg, "is_compliant": is_compliant, "violations": violations}
                self.body_frame = frame
                
                time.sleep(0.03)
                
        except Exception as e:
            logger.error(f"👕 Body thread error: {e}")
            self.body_status = {"message": f"ERROR: {e}", "is_compliant": False, "violations": []}
        finally:
            if cap:
                try:
                    cap.release()
                except:
                    pass
            self.cap_body = None
            logger.info(f"👕 Body Camera Stopped")

    def get_stitched_frame(self):
        placeholder = np.zeros((480, 480, 3), dtype=np.uint8)
        cv2.putText(placeholder, "LOADING...", (100, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        
        inactive_frames = 0
        
        while True:
            frame = placeholder
            
            if self.is_active:
                inactive_frames = 0
                if self.current_stage == 'feet' and self.feet_frame is not None:
                    frame = self.feet_frame
                elif self.current_stage == 'body' and self.body_frame is not None:
                    frame = self.body_frame
            else:
                # If inactive for > 1 second (20 frames * 0.05s), close the stream to free socket
                inactive_frames += 1
                if inactive_frames > 20: 
                    break
            
            ret, jpeg = cv2.imencode('.jpg', frame)
            if ret:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            time.sleep(0.05)

    def get_status(self):
        return {
            "stage": self.current_stage,
            "feet": self.feet_status,
            "body": self.body_status
        }

clearance_manager = ClearanceManager()