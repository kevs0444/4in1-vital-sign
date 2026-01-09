"""
Blood Pressure Sensor Controller
Dedicated camera + AI module for BP measurement.

CAMERA INDICES (Based on ACTUAL PowerShell enumeration order):
- Index 0 = "2 - Blood Pressure Camera"
- Index 1 = "0 - Weight Compliance Camera"
- Index 2 = "1 - Wearables Compliance Camera"

NOTE: The prefix numbers in the camera names do NOT match the actual indices!
This is because Windows PnP enumeration order differs from the friendly names.

Separate from weight_compliance_camera.py to avoid mode conflicts.
"""

import cv2
import threading
import time
import os
import logging
import serial
import serial.tools.list_ports
from app.utils.camera_config import CameraConfig


logger = logging.getLogger(__name__)

class BPSensorController:
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
        self.ai_enabled = True # Default to AI enabled
        self.lock = threading.Lock()
        self.latest_frame = None
        self.latest_clean_frame = None # Store clean frame for capture
        self.camera_index = CameraConfig.get_index('bp') if CameraConfig.get_index('bp') is not None else 0
        
        logger.info(f"🩸 BPSensorController initialized with index: {self.camera_index}")

        
        # Image Adjustments
        # Image Adjustments - Matches user preference for BP cam
        self.zoom_factor = 1.4  # Default 1.4x zoom per user preference
        self.square_crop = True
        self.rotation = 0 # Assume default orientation
        
        # Arduino Serial Connection
        self.arduino = None
        self.serial_port = None
        self.baud_rate = 115200
        
        # BP Detection State
        self.bp_yolo = None
        self.bp_history = []
        self.last_smooth_bp = 0
        self.trend_state = "Stable ⏸️"
        self.stable_frames_count = 0
        self.last_debug_bp = None
        
        # Real-time status for frontend polling
        self.bp_status = {
            "systolic": "--",
            "diastolic": "--",
            "trend": "Waiting",
            "error": False,
            "is_running": False,
            "timestamp": 0
        }
        
        # Prevent duplicate start commands
        self.start_command_sent = False
        
        # Validation Flags
        self.has_inflated = False # Must detect inflation before confirming result
        self.stable_result_timer = 0
        self.result_sent_to_lcd = False # Prevent duplicate LCD result
        self.device_is_on = False # Track if BP device is currently ON to prevent duplicate toggles
        
        # DELAYED CONNECTION REMOVED: User requested to connect only on BP phase.
        # Check backend/app/sensors/bp_sensor_controller.py start() method for connection logic.
        # threading.Timer(10.0, self._connect_arduino).start()
        
        logger.info("🩸 BPSensorController initialized")
    
    def _connect_arduino(self):
        """Attempt to connect to the Arduino Nano."""
        if self.arduino and self.arduino.is_open:
            return True
            
        ports = serial.tools.list_ports.comports()
        target_port = None
        
        print("🔍 [BP] Scanning for BP Arduino (Nano/CH340)...")
        for port in ports:
            desc = port.description.lower()
            print(f"   📌 [BP] {port.device}: {port.description}")
            
            # EXPLICITLY AVOID MEGA (reserved for main sensors)
            if "mega" in desc:
                continue

            if "arduino" in desc or "ch340" in desc or "serial" in desc or "usb status" in desc:
                target_port = port.device
                # Prefer Nano explicitly if found
                if "nano" in desc:
                    break
        
        if target_port:
            try:
                # Initialize Serial without opening first to configure DTR
                self.arduino = serial.Serial()
                self.arduino.port = target_port
                self.arduino.baudrate = self.baud_rate
                self.arduino.timeout = 1
                self.arduino.dtr = False # Prevent DTR reset
                self.arduino.rts = False
                
                self.arduino.open()
                
                time.sleep(2)
                logger.info(f"[BP] Connected to Arduino on {target_port}")
                print(f"✅ BP Arduino Connected ({target_port})")
                return True
            except Exception as e:
                logger.error(f"[BP] Failed to connect to Arduino on {target_port}: {e}")
                print(f"❌ [BP] Connection failed: {e}")
        else:
            print("⚠️ [BP] No Arduino Nano found - LCD display will not work")
            
        return False

    def send_command(self, cmd, auto_connect=True):
        """Send a command string to the Arduino.
        auto_connect: If False, will not attempt to connect if discouraged."""
        try:
            if not self.arduino or not self.arduino.is_open:
                if not auto_connect:
                    return False # Fail silently if we don't want to force connect
                
                if not self._connect_arduino():
                    print(f"🔌 [BP] Cannot send '{cmd}' - Arduino not connected")
                    return False
            
            full_cmd = f"{cmd}\n"
            self.arduino.write(full_cmd.encode('utf-8'))
            print(f"📤 [BP LCD] Sent: {cmd}")
            return True
        except Exception as e:
            logger.error(f"[BP] Serial send error: {e}")
            self.arduino = None
            return False

    def set_camera(self, index=None, camera_name=None):
        """Update sensor camera target."""
        if camera_name:
             idx = CameraConfig.get_index_by_name(camera_name)
             if idx is not None:
                 index = idx
                 logger.info(f"🩸 BP Camera Resolved '{camera_name}' -> Index {index}")
        
        if index is not None:
            logger.info(f"🩸 BP Camera Index updated to: {index}")
            self.camera_index = index

    def start(self, camera_index=None, camera_name=None, enable_ai=True, mode='regular'):
        """Start the BP camera and detection loop."""
        self.mode = mode # Store mode
        
        # Update AI state
        self.ai_enabled = enable_ai
        if not self.ai_enabled:
            logger.info("🩸 BP Camera starting in RAW mode (AI Disabled)")

        # Resolve name if present
        if camera_name:
             idx = CameraConfig.get_index_by_name(camera_name)
             if idx is not None:
                 camera_index = idx # Override
                 logger.info(f"🩸 BP Start: Resolved '{camera_name}' -> Index {camera_index}")

        # 1. Send "start" command to Arduino to simulate button press (Turn ON)
        # DISABLED: User wants manual button press on the physical device.
        # self.send_command("start")

        if self.camera_index is not None:
            self.camera_index = camera_index
            
        if self.is_running:
            return True, "BP Camera already running"
        
        try:
            # Reset state
            self.bp_history = []
            self.last_smooth_bp = 0
            self.trend_state = "Stable ⏸️"
            self.stable_frames_count = 0
            self.result_confirmed = False  # NEW: Prevent re-triggering result
            self.ignore_start_until = 0    # NEW: Cooldown for manual interrupts
            
            # CRITICAL: Reset Status for New User
            self.bp_status = {
                "systolic": "--",
                "diastolic": "--",
                "trend": "Waiting",
                "error": False,
                "is_running": False,
                "timestamp": 0
            }
            
            # Reset LCD result flag
            self.result_sent_to_lcd = False
            
            # Ensure settings match user request
            self.zoom_factor = 1.4  # Default 1.4x zoom per user preference (Updated to 1.4x for better digit visibility)
            self.rotation = 0
            
            # Robust Camera Opening
            indices_to_try = [self.camera_index]
            
            backends = []
            if os.name == 'nt':
                backends = [cv2.CAP_MSMF, cv2.CAP_DSHOW, cv2.CAP_ANY]
            else:
                backends = [cv2.CAP_ANY]
            
            for idx in indices_to_try:
                for backend in backends:
                    backend_name = "DSHOW" if backend == cv2.CAP_DSHOW else "MSMF" if backend == cv2.CAP_MSMF else "ANY"
                    logger.info(f"[BP] Trying camera {idx} with {backend_name}...")
                    
                    try:
                        temp_cap = cv2.VideoCapture(idx, backend)
                        if temp_cap.isOpened():
                            ret, frame = temp_cap.read()
                            if ret and frame is not None and frame.size > 0:
                                self.cap = temp_cap
                                self.camera_index = idx
                                logger.info(f"[BP] ✅ Camera {idx} opened with {backend_name}")
                                break
                            else:
                                temp_cap.release()
                    except Exception as e:
                        logger.error(f"[BP] Camera open error: {e}")
                        
                if self.cap and self.cap.isOpened():
                    break
            
            if not self.cap or not self.cap.isOpened():
                logger.error("[BP] ❌ Failed to open any camera")
                return False, "Failed to open camera"
            
            self.is_running = True
            self.bp_status["is_running"] = True
            
            # Reset error detection state for new session
            self.error_frame_count = 0
            self.error_handled = False
            
            threading.Thread(target=self._process_loop, daemon=True).start()
            
            # Send LCD message to show "Blood Pressure Ready"
            self.send_command("LCD_BP_READY", auto_connect=True)
            
            logger.info("[BP] 🩸 BP Camera started successfully")
            return True, "BP Camera started"
            
        except Exception as e:
            logger.error(f"[BP] Start error: {e}")
            return False, str(e)
            
    def stop(self):
        """Stop the BP camera."""
        # Send "done" command to Arduino (Turn OFF) ONLY if device is ON
        # CRITICAL: Only toggle if device_is_on to prevent accidental turn-on
        if self.arduino and self.arduino.is_open:
            if self.device_is_on:
                logger.info("[BP] Device is ON - Sending shutdown toggle")
                self.send_command("done")
                self.device_is_on = False
            else:
                logger.info("[BP] Skipping shutdown toggle - Device is already OFF")
        
        self.is_running = False
        self.bp_status["is_running"] = False
        self.start_command_sent = False  # Reset for next measurement
        self.has_inflated = False # Reset inflation flag
        
        if self.cap:
            self.cap.release()
            self.cap = None
        
        # Send LCD message to show "System Ready" (idle state)
        self.send_command("LCD_IDLE", auto_connect=True)
        
        logger.info("[BP] Camera stopped")
        print("🔌 BP Camera stopped - Ready for new measurement")
        return True, "BP Camera stopped"
    
    def _turn_off_hardware(self):
        """Turn off the BP hardware device (used during error recovery)."""
        logger.info("[BP] 🔌 Turning OFF BP hardware for error recovery...")
        
        # Use explicit OFF command (not toggle) to ensure device turns off
        if self.arduino and self.arduino.is_open:
            self.send_command("OFF", auto_connect=True)
            self.device_is_on = False
            logger.info("[BP] Hardware OFF command sent")
            # Wait briefly to allow device to respond and turn off
            time.sleep(0.5)
        else:
            logger.info("[BP] Arduino not connected - skipping toggle")
        
        # Reset hardware state flags
        self.start_command_sent = False
        self.has_inflated = False
        self.result_confirmed = False
        self.result_sent_to_lcd = False  # Allow new result to show on LCD
        
        # Reset detection state
        self.bp_history = []
        self.last_smooth_bp = 0
        self.stable_frames_count = 0
        self.trend_state = "Stable ⏸️"
        
        logger.info("[BP] Hardware turned OFF - Ready for retry")
    
    def reset_for_retry(self):
        """Reset the BP system for a retry measurement after an error.
        Turns off the hardware and resets state. User presses physical button to restart.
        """
        logger.info("[BP] 🔄 Resetting for retry measurement...")
        
        # 0. Suppress echoes and visual noise during reset (Crucial)
        future_time = time.time() + 5.0
        self.ignore_start_until = future_time
        self.ignore_error_until = future_time
        
        # 1. Turn off the hardware
        self._turn_off_hardware()
        
        # 2. Reset status for frontend
        with self.lock:
            self.bp_status = {
                "systolic": "--",
                "diastolic": "--",
                "trend": "Ready",
                "error": False,
                "is_running": self.is_running,
                "timestamp": time.time()
            }
        
        logger.info("[BP] ✅ Reset complete - Waiting for user to press physical button")
        return True, "BP system reset - Press physical button to restart"
    
    def _serial_listener(self):
        """Continuously read from Arduino Serial to catch MANUAL_START."""
        logger.info("[BP] 🎧 Serial Listener Started")
        while self.is_running and self.arduino and self.arduino.is_open:
            try:
                if self.arduino.in_waiting > 0:
                    line = self.arduino.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        print(f"📥 [BP Arduino] {line}")
                        
                        # MANUAL START DETECTION
                        if "MANUAL_START" in line:
                            # CRITICAL: Ignore if we just finished a measurement (to avoid restart loops)
                            if time.time() < getattr(self, 'ignore_start_until', 0):
                                logger.info("🛑 Ignoring MANUAL_START (Cooldown/Auto-Off Phase)")
                                continue

                            logger.info("👆 PHYSICAL BUTTON PRESSED (Detected via Serial)")
                            with self.lock:
                                self.start_command_sent = True
                                self.trend_state = "Inflating ⬆️" # Anticipate inflation
                                self.bp_status["trend"] = "Starting..."
                                
                                # CRITICAL: CLEAR ERROR STATUS IMMEDIATELY
                                self.bp_status["error"] = False
                                self.error_handled = False
                                self.error_frame_count = 0
                                
                                # Ignore visual ERROR detection for 5s (Screen lag)
                                self.ignore_error_until = time.time() + 5.0
                        
            except Exception as e:
                logger.error(f"[BP] Serial Read Error: {e}")
                time.sleep(1)
            
            time.sleep(0.05)
        logger.info("[BP] 🎧 Serial Listener Stopped")

    def get_status(self):
        """Get the current BP status for frontend polling."""
        with self.lock:
            return self.bp_status.copy()
    
    def get_frame(self):
        """Get the latest annotated frame as JPEG bytes."""
        with self.lock:
            if self.latest_frame is None:
                return None
            _, buffer = cv2.imencode('.jpg', self.latest_frame)
            return buffer.tobytes()
    
    def _apply_zoom(self, frame):
        """Apply rotation, zoom, and square crop."""
        
        # 1. Rotation
        if self.rotation != 0:
            if self.rotation == 90:
                frame = cv2.rotate(frame, cv2.ROTATE_90_CLOCKWISE)
            elif self.rotation == 180:
                frame = cv2.rotate(frame, cv2.ROTATE_180)
            elif self.rotation == 270:
                frame = cv2.rotate(frame, cv2.ROTATE_90_COUNTERCLOCKWISE)

        h, w = frame.shape[:2]
        
        # 2. Square crop
        if self.square_crop:
            size = min(h, w)
            x1 = (w - size) // 2
            y1 = (h - size) // 2
            frame = frame[y1:y1+size, x1:x1+size]
            h, w = frame.shape[:2]
        
        # 3. Zoom
        if self.zoom_factor != 1.0 and self.zoom_factor > 1.0:
            new_w = int(w / self.zoom_factor)
            new_h = int(h / self.zoom_factor)
            x1 = (w - new_w) // 2
            y1 = (h - new_h) // 2
            frame = frame[y1:y1+new_h, x1:x1+new_w]
            frame = cv2.resize(frame, (w, h))
        
        return frame
    
    def _process_loop(self):
        """Main processing loop for BP detection."""
        # Try connecting to Arduino for LCD/Buttons
        self._connect_arduino()
        if self.arduino and self.arduino.is_open:
            logger.info(f"[BP] Arduino connected on {self.arduino.port} - Starting serial listener")
            # Start listener thread
            threading.Thread(target=self._serial_listener, daemon=True).start()
        else:
            logger.warning("[BP] Arduino NOT connected - Physical button detection disabled")

        # Lazy load YOLO model
        if not self.bp_yolo:
            try:
                from ultralytics import YOLO
                # Use absolute path to ensure we find it
                base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # backend/
                yolo_path = os.path.join(base_dir, 'ai_camera', 'models', 'bp.pt')
                
                if os.path.exists(yolo_path):
                    self.bp_yolo = YOLO(yolo_path)
                    logger.info(f"[BP] ✅ Loaded YOLO model from: {yolo_path}")
                else:
                    logger.error(f"[BP] ❌ Model not found at: {yolo_path}")
                    self.bp_yolo = None
            except Exception as e:
                logger.error(f"[BP] Failed to load YOLO: {e}")
                self.bp_yolo = None
        
        while self.is_running and self.cap and self.cap.isOpened():
            ret, frame = self.cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            # Apply filters
            frame = self._apply_zoom(frame)
            clean_view = frame.copy() # Clean copy for capture
            annotated_frame = frame.copy()
            h, w = frame.shape[:2]
            
            # Draw guide box
            center_x, center_y = w // 2, h // 2
            box_w, box_h = int(w * 0.6), int(h * 0.6)
            cv2.rectangle(annotated_frame, 
                          (center_x - box_w//2, center_y - box_h//2), 
                          (center_x + box_w//2, center_y + box_h//2), 
                          (255, 255, 255), 1)
            
            # Run detection
            if self.ai_enabled and self.bp_yolo:
                self._run_detection(frame, annotated_frame)
                # Visual Indicator for AI
                cv2.circle(annotated_frame, (30, 30), 10, (0, 255, 0), -1) 
                cv2.putText(annotated_frame, "AI ACTIVE", (50, 35), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
            elif not self.ai_enabled:
                cv2.putText(annotated_frame, "RAW VIDEO (AI OFF)", (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 255), 2)
            else:
                cv2.putText(annotated_frame, "AI Model Missing", (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            with self.lock:
                self.latest_frame = annotated_frame
                self.latest_clean_frame = clean_view
                self.bp_status["timestamp"] = time.time()
                self.bp_status["is_running"] = True
            
            time.sleep(0.05)  # ~20 FPS internal processing
    
    def _run_detection(self, frame, annotated_frame):
        """Run YOLO detection and parse BP values."""
        # Stop processing if we already have a confirmed result
        if getattr(self, 'result_confirmed', False):
             return

        # Lower confidence to 0.25 to catch more digits
        # agnostic_nms=True helps prevent multiple classes (e.g. 1 and 7) on same spot
        results = self.bp_yolo(frame, conf=0.25, verbose=False, agnostic_nms=True)
        
        raw_detections = []
        error_detected = False
        
        if results and len(results[0].boxes) > 0:
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                label = results[0].names[cls_id]
                conf = float(box.conf[0])
                
                if label.lower() == 'error':
                    # Ignore error if we recently restarted (screen lag)
                    if time.time() < getattr(self, 'ignore_error_until', 0):
                         continue
                    error_detected = True
                    continue
                
                if not label.isdigit():
                    continue
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                raw_detections.append({
                    "label": label,
                    "conf": conf,
                    "box": [x1, y1, x2, y2],
                    "area": (x2 - x1) * (y2 - y1)
                })

        # --- NON-MAXIMUM SUPPRESSION (FILTER OVERLAPS) ---
        # Sort by confidence (highest first)
        raw_detections.sort(key=lambda x: x['conf'], reverse=True)
        
        final_digits = []
        
        def calculate_iou(boxA, boxB):
            # determine the (x, y)-coordinates of the intersection rectangle
            xA = max(boxA[0], boxB[0])
            yA = max(boxA[1], boxB[1])
            xB = min(boxA[2], boxB[2])
            yB = min(boxA[3], boxB[3])
            
            # compute the area of intersection rectangle
            interArea = max(0, xB - xA) * max(0, yB - yA)
            
            # compute the area of both the prediction and ground-truth rectangles
            boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
            boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])
            
            # compute the intersection over union by taking the intersection
            # area and dividing it by the sum of prediction + ground-truth
            # areas - the interesection area
            iou = interArea / float(boxAArea + boxBArea - interArea)
            return iou

        for det in raw_detections:
            is_overlap = False
            for kept in final_digits:
                # If IoU > 0.4, consider it the same digit
                if calculate_iou(det['box'], kept['box']) > 0.4:
                    is_overlap = True
                    break
            
            if not is_overlap:
                final_digits.append(det)

        # ------------------------------------------------
        
        detected_digits = []
        
        # Draw and Process Final Digits
        for d in final_digits:
             x1, y1, x2, y2 = d['box']
             label = d['label']
             center_x = (x1 + x2) / 2
             center_y = (y1 + y2) / 2
             
             # Draw box
             cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
             cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                         cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
             
             detected_digits.append({"val": label, "cx": center_x, "cy": center_y})

        # Parse digits
        # PRIORITY: If error detected, use debounced detection (5 frames)
        if error_detected:
             # Initialize counter if not exists
             if not hasattr(self, 'error_frame_count'):
                  self.error_frame_count = 0
             if not hasattr(self, 'error_handled'):
                  self.error_handled = False
             
             # If we already handled this error, just return (no spam)
             if self.error_handled:
                  return
             
             # Increment counter
             self.error_frame_count += 1
             
             # Act on first error detection (changed from 5 to 1 for instant response)
             if self.error_frame_count >= 1:
                  logger.warning("⚠️ BP Monitor ERROR Detected")
                  self._update_status("--", "--", "Error ⚠️", True)
                  self.send_command("ERROR", auto_connect=True)
                  
                  # Wait for LCD to update before toggling hardware
                  # This prevents serial command flooding and ensures the user sees the error
                  time.sleep(1.0)
                  
                  # 0. BLOCK RE-START SIGNALS (Crucial: Avoid reacting to the button tap we are about to make)
                  # Mimic success logic: ignore serial inputs for a few seconds
                  # Reduced to 2.5s to allow user to press button quickly after seeing error
                  self.ignore_start_until = time.time() + 2.5
                  
                  # Turn OFF the BP device when error is detected
                  self._turn_off_hardware()
                  
                  # Mark as handled to prevent further detections (will be reset on MANUAL_START)
                  self.error_handled = True
                  
                  # NOTE: We DO NOT auto-reset to "Ready" anymore.
                  # The "Error" state persists until the user presses the physical button (MANUAL_START).
             return
              
        else:
             # Reset error counter if no error detected
             if hasattr(self, 'error_frame_count'):
                  self.error_frame_count = 0
        
        if len(detected_digits) > 0:
            self._parse_digits(detected_digits, error_detected)
    
    def _is_startup_pattern(self, val_str):
        """Check if value is likely the '888' startup check."""
        return val_str and all(c == '8' for c in val_str) and len(val_str) >= 2

    def _parse_digits(self, detected_digits, error_detected):
        """Parse detected digits into systolic/diastolic values."""
        min_y = min(d['cy'] for d in detected_digits)
        max_y = max(d['cy'] for d in detected_digits)
        vertical_spread = max_y - min_y
        
        # Throttling counter for Serial updates
        current_time = time.time()
        if not hasattr(self, 'last_serial_update'):
             self.last_serial_update = 0
             
        should_send = (current_time - self.last_serial_update) > 1.0 # 1 sec throttle
        
        if vertical_spread < 50:
            # Single row - Pumping/Deflating
            detected_digits.sort(key=lambda k: k['cx'])
            sys_str = "".join([d['val'] for d in detected_digits])
            dia_str = ""
            
            # HANDLE STARTUP PATTERN (888)
            if self._is_startup_pattern(sys_str):
                # detected '888' -> The monitor is initializing
                self.trend_state = "Starting..."
                self._update_status("--", "--", "Starting ⏳", False)
                return
            
            try:
                val = int(sys_str)
                
                # History buffer
                self.bp_history.append(val)
                if len(self.bp_history) > 5:
                    self.bp_history.pop(0)
                
                # Median filter
                if len(self.bp_history) >= 1:
                    sorted_hist = sorted(self.bp_history)
                    smooth_val = sorted_hist[len(sorted_hist)//2]
                else:
                    smooth_val = val
                
                # Safety: Reject single-digit drops only if we were previously high
                if smooth_val < 10 and self.last_smooth_bp > 50:
                    smooth_val = self.last_smooth_bp
                
                # Safety: Allow detecting low numbers (single digits) for inflation start
                # Only ignore 0 or negative
                if smooth_val < 1:
                    return 
                
                # Trend detection
                if smooth_val > self.last_smooth_bp:
                    inst_trend = "Inflating ⬆️"
                    # Count inflation as valid if we see numbers rising
                    if smooth_val > 5: 
                        self.has_inflated = True
                        self.device_is_on = True  # Device is ON when measuring
                        # Reset error handling flag - user is retrying
                        if hasattr(self, 'error_handled'):
                            self.error_handled = False
                    if should_send:
                        print(f"📈 [BP] Inflating... {smooth_val} mmHg")
                        self.send_command(f"INFLATING:{smooth_val}", auto_connect=True)
                        self.last_serial_update = current_time
                        
                elif smooth_val < self.last_smooth_bp:
                    inst_trend = "Deflating ⬇️"
                    if smooth_val > 5:
                         self.has_inflated = True
                         self.device_is_on = True  # Device is ON when measuring
                    if should_send:
                        print(f"📉 [BP] Deflating... {smooth_val} mmHg")
                        self.send_command(f"DEFLATING:{smooth_val}", auto_connect=True)
                        self.last_serial_update = current_time
                else:
                    inst_trend = "Stable"
                
                if inst_trend != "Stable":
                    self.trend_state = inst_trend
                    self.stable_frames_count = 0
                else:
                    self.stable_frames_count += 1
                    if self.stable_frames_count >= 4:
                        self.trend_state = "Stable ⏸️"
                
                self.last_smooth_bp = smooth_val
                sys_str = str(smooth_val)
                
                if not self.start_command_sent and smooth_val > 40 and self.has_inflated:
                     if "Measuring" not in self.trend_state:
                         print(f"👆 Physical Button usage detected! (Readings appeared: {smooth_val})")
                         self.start_command_sent = True 

            except ValueError:
                pass
            
            # STICKY ERROR LOGIC:
            # If we were in Error mode, stay there unless we see explicit Inflation or Startup.
            # This prevents flickering/clearing error on noise.
            if self.bp_status["error"]:
                if "Inflating" in self.trend_state or "Starting" in self.trend_state:
                     error_detected = False
                else:
                     error_detected = True
            
            trend = "Error ⚠️" if error_detected else self.trend_state
            self._update_status(sys_str, dia_str, trend, error_detected)
            self._log_reading(sys_str, dia_str, trend)
            
        else:
            # Result
            mid_y = (min_y + max_y) / 2
            top_row = [d for d in detected_digits if d['cy'] < mid_y]
            bottom_row = [d for d in detected_digits if d['cy'] >= mid_y]
            
            top_row.sort(key=lambda k: k['cx'])
            bottom_row.sort(key=lambda k: k['cx'])
            
            sys_str = "".join([d['val'] for d in top_row])
            dia_str = "".join([d['val'] for d in bottom_row])
            
            # HANDLE STARTUP PATTERN (888/888)
            if self._is_startup_pattern(sys_str) or self._is_startup_pattern(dia_str):
                 self.trend_state = "Starting..."
                 self._update_status("--", "--", "Starting ⏳", False)
                 return
            
            # STICKY ERROR LOGIC (Result Block):
            if self.bp_status["error"]:
                 if "Inflating" in self.trend_state or "Starting" in self.trend_state:
                      error_detected = False
                 else:
                      error_detected = True

            trend = "Error ⚠️" if error_detected else "Deflating ⬇️"
            self._update_status(sys_str, dia_str, trend, error_detected)
            self._log_reading(sys_str, dia_str, trend)
            
            if not self.has_inflated and not self.start_command_sent:
                 return # Ignore stale

            logger.info(f"✅ BP Result Confirmed: {sys_str}/{dia_str}")
            print(f"✅ BP Result Confirmed: {sys_str}/{dia_str}")
            
            # Send result to LCD ONLY ONCE
            if not self.result_sent_to_lcd:
                self.send_command(f"RESULT:{sys_str}/{dia_str}", auto_connect=True)
                self.result_sent_to_lcd = True
            
            # New Step: Prevent re-entry immediately
            self.result_confirmed = True
            
            # AUTO-TURN OFF LOGIC
            if getattr(self, 'mode', 'regular') == 'regular':
                logger.info("[BP] Regular Mode: Result found. Stopping hardware immediately, delayed backend stop.")
                
                # 0. BLOCK RE-START SIGNALS
                # The Arduino might report 'MANUAL_START' again when we press the button to turn it OFF.
                # We must ignore that signal for a few seconds.
                self.ignore_start_until = time.time() + 10.0 
                
                # 1. Stop Hardware Immediately (Pump off)
                self.send_command("done", auto_connect=True)
                self.device_is_on = False   # CRITICAL: Mark device as OFF so stop() doesn't toggle it again
                self.start_command_sent = False # Reset flag so stop() doesn't toggle it again
                self.has_inflated = False       # CRITICAL: Prevent stop() from firing 'done' again
                
                # 2. Keep Backend Alive briefly so Frontend can poll the result
                def delayed_stop():
                    logger.info("[BP] 🛑 Executing delayed auto-stop...")
                    self.stop()
                    
                threading.Timer(4.0, delayed_stop).start()
                
            else:
                logger.info("[BP] Maintenance Mode: Keeping camera/device ON after result.")
                self.result_confirmed = False # In maintenance, we allow it to continue
            
            return

    def _update_status(self, systolic, diastolic, trend, error):
        """Update the BP status dictionary."""
        with self.lock:
            self.bp_status["systolic"] = systolic
            self.bp_status["diastolic"] = diastolic
            self.bp_status["trend"] = trend
            self.bp_status["error"] = error
            
    def _log_reading(self, sys_str, dia_str, trend):
        """Log BP reading changes."""
        current_val = f"{sys_str}/{dia_str}" if dia_str else f"{sys_str} ({trend})"
        if current_val != self.last_debug_bp:
            logger.info(f"🩸 BP Detector: {current_val}")
            self.last_debug_bp = current_val

    def set_settings(self, settings):
        """Update camera settings (zoom, rotation, square_crop)."""
        if 'zoom' in settings:
            try:
                self.zoom_factor = float(settings['zoom'])
                logger.info(f"[BP] Zoom set to {self.zoom_factor}x")
            except ValueError:
                pass
        
        if 'square_crop' in settings:
            self.square_crop = bool(settings['square_crop'])
            logger.info(f"[BP] Square Crop set to {self.square_crop}")
            
        if 'rotation' in settings:
            try:
                self.rotation = int(settings['rotation'])
                logger.info(f"[BP] Rotation set to {self.rotation}°")
            except ValueError:
                pass

    def capture_image(self, class_name):
        """Capture the current frame and save to disk."""
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
            logger.info(f"[BP] Captured/Saved Image: {filepath}")
            return True, filepath

# Singleton instance
bp_sensor = BPSensorController()

