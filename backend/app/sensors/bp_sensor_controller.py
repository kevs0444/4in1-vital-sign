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
        self.lock = threading.Lock()
        self.latest_frame = None
        self.camera_index = CameraConfig.get_index('bp') if CameraConfig.get_index('bp') is not None else 0  # Confirmed: BP is Index 0
        
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

    def start(self, camera_index=None, camera_name=None):
        """Start the BP camera and detection loop."""
        
        # Resolve name if present
        if camera_name:
             idx = CameraConfig.get_index_by_name(camera_name)
             if idx is not None:
                 camera_index = idx # Override
                 logger.info(f"🩸 BP Start: Resolved '{camera_name}' -> Index {camera_index}")

        # 1. Send "start" command to Arduino to simulate button press (Turn ON)
        # DISABLED: User wants manual button press on the physical device.
        # self.send_command("start")

        if camera_index is not None:
            self.camera_index = camera_index
            
        if self.is_running:
            return True, "BP Camera already running"
        
        try:
            # Reset state
            self.bp_history = []
            self.last_smooth_bp = 0
            self.trend_state = "Stable ⏸️"
            self.stable_frames_count = 0
            # Ensure settings match user request
            self.zoom_factor = 1.4  # Default 1.4x zoom per user preference
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
            threading.Thread(target=self._process_loop, daemon=True).start()
            logger.info("[BP] 🩸 BP Camera started successfully")
            return True, "BP Camera started"
            
        except Exception as e:
            logger.error(f"[BP] Start error: {e}")
            return False, str(e)
    
    def stop(self):
        """Stop the BP camera."""
        # Send "done" command to Arduino (Turn OFF) ONLY if connected
        # Connecting just to stop causes a RESET which turns IT ON!
        if self.arduino and self.arduino.is_open:
            self.send_command("done")
        else:
            print("ℹ️ [BP] Arduino not connected, skipping shutdown command")
        
        self.is_running = False
        self.bp_status["is_running"] = False
        self.start_command_sent = False  # Reset for next measurement
        self.has_inflated = False # Reset inflation flag
        
        if self.cap:
            self.cap.release()
            self.cap = None
        
        logger.info("[BP] Camera stopped")
        print("🔌 BP Camera & Arduino stopped - Ready for new measurement")
        return True, "BP Camera stopped"
    
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
        # Lazy load YOLO model
        if not self.bp_yolo:
            try:
                from ultralytics import YOLO
                yolo_path = os.path.join(os.path.dirname(__file__), '../../ai_camera/models/bp.pt')
                self.bp_yolo = YOLO(yolo_path)
                logger.info(f"[BP] Loaded YOLO model from: {yolo_path}")
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
            if self.bp_yolo:
                self._run_detection(frame, annotated_frame)
            else:
                cv2.putText(annotated_frame, "AI Model Not Loaded", (10, 30), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 255), 2)
            
            with self.lock:
                self.latest_frame = annotated_frame
                self.bp_status["timestamp"] = time.time()
                self.bp_status["is_running"] = True
            
            time.sleep(0.05)  # ~20 FPS internal processing
    
    def _run_detection(self, frame, annotated_frame):
        """Run YOLO detection and parse BP values."""
        results = self.bp_yolo(frame, conf=0.5, verbose=False)
        
        detected_digits = []
        error_detected = False
        
        if results and len(results[0].boxes) > 0:
            for box in results[0].boxes:
                cls_id = int(box.cls[0])
                label = results[0].names[cls_id]
                
                if label.lower() == 'error':
                    if not error_detected:
                        logger.warning("⚠️ BP Monitor ERROR Symbol Detected!")
                    error_detected = True
                    continue
                
                if not label.isdigit():
                    continue
                
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                center_x = (x1 + x2) / 2
                center_y = (y1 + y2) / 2
                
                # Draw box
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                cv2.putText(annotated_frame, label, (x1, y1 - 5), 
                            cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 2)
                
                detected_digits.append({"val": label, "cx": center_x, "cy": center_y})
            
            # Parse digits
            # PRIORITY: If error detected, show it immediately
            # PRIORITY: If error detected, show it immediately
            # BUT only if we are actually running or have seen numbers.
            # Ignore "Ghost Errors" on blank screen or noise.
            if error_detected:
                if self.start_command_sent: # Only care if we actually started
                     logger.warning("⚠️ BP Monitor ERROR Symbol Detected!")
                     self._update_status("--", "--", "Error ⚠️", True)
                     
                     # Report Error (don't force connect if not already)
                     self.send_command("STATUS:ERROR", auto_connect=False)
                     
                     # Safety: Turn off if error detected to reset state (don't force connect)
                     self.send_command("done", auto_connect=False)
                else:
                    # Ignore error if we haven't even started (likely noise)
                    pass
            elif len(detected_digits) > 0:
                self._parse_digits(detected_digits, error_detected)
    
    def _parse_digits(self, detected_digits, error_detected):
        """Parse detected digits into systolic/diastolic values."""
        min_y = min(d['cy'] for d in detected_digits)
        max_y = max(d['cy'] for d in detected_digits)
        vertical_spread = max_y - min_y
        
        if vertical_spread < 50:
            # Single row - Pumping/Deflating
            detected_digits.sort(key=lambda k: k['cx'])
            sys_str = "".join([d['val'] for d in detected_digits])
            dia_str = ""
            
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
                
                # Safety: Reject single-digit drops
                if smooth_val < 10 and self.last_smooth_bp > 10:
                    smooth_val = self.last_smooth_bp
                
                # Safety: Ignore unrealistic low values (noise/glare)
                # BP values usually start higher or at 0. Glitches are often small numbers.
                # Increased threshold from 5 to 30 to prevent "Automatic On" ghosting
                if smooth_val < 30:
                    return  # Ignore noise
                
                # Trend detection with persistence
                if smooth_val > self.last_smooth_bp + 1:
                    inst_trend = "Inflating ⬆️"
                    if smooth_val > 40: # Valid inflation
                        self.has_inflated = True
                elif smooth_val < self.last_smooth_bp - 1:
                    inst_trend = "Deflating ⬇️"
                    if smooth_val > 40:
                         self.has_inflated = True
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
                
                # Send live reading AND status to Arduino LCD
                # DISABLED: To prevent "Reset" loops, we do NOT send live strings to Arduino.
                # The user watches the BP Monitor screen. We only touch Arduino to STOP it.
                # self.send_command(f"LIVE:{sys_str}|{status_text}", auto_connect=False)
                
                # Detect Physical Button Usage (Real activity)
                if not self.start_command_sent and smooth_val > 40 and self.has_inflated:
                     # If we see valid numbers AND have seen inflation -> Physical Button
                     if "Measuring" not in self.trend_state: # Avoid spamming while stable
                         print(f"👆 Physical Button usage detected! (Readings appeared: {smooth_val})")
                         # Do NOT connect. Stay passive.
                            
                         self.start_command_sent = True # Treat as started so we don't log again

            except ValueError:
                pass
            
            trend = "Error ⚠️" if error_detected else self.trend_state
            self._update_status(sys_str, dia_str, trend, error_detected)
            self._log_reading(sys_str, dia_str, trend)
            
        else:
            # Double row - Result
            mid_y = (min_y + max_y) / 2
            top_row = [d for d in detected_digits if d['cy'] < mid_y]
            bottom_row = [d for d in detected_digits if d['cy'] >= mid_y]
            
            top_row.sort(key=lambda k: k['cx'])
            bottom_row.sort(key=lambda k: k['cx'])
            
            sys_str = "".join([d['val'] for d in top_row])
            dia_str = "".join([d['val'] for d in bottom_row])
            
            trend = "Error ⚠️" if error_detected else "Deflating ⬇️"
            self._update_status(sys_str, dia_str, trend, error_detected)
            self._log_reading(sys_str, dia_str, trend)
            
            # CONFIRM RESULT LOGIC
            # Only confirm if we have seen valid inflation activity OR if we explicitly started via screen
            # This prevents confirming "Static" numbers from a previous session on startup
            if not self.has_inflated and not self.start_command_sent:
                 # We see a result (e.g. 116/75) but we never saw it inflate/deflate.
                 # This is likely a previous result on the screen. IGNORE IT.
                 return

            # Verification Logic could go here (e.g., must see result for X frames)
            # Currently assuming detection of 2 rows is final result
            
            # Send result to Arduino (even if firmware needs update to handle it)
            # FORCE CONNECTION NOW? NO! 
            # Connecting causes a RESET which turns the device ON again.
            # We must be purely PASSIVE. Do not control the hardware.
            # Let the device timeout or user turn it off.
            logger.info(f"✅ BP Result Confirmed: {sys_str}/{dia_str} - Stopping Camera.")
            print(f"✅ BP Result Confirmed: {sys_str}/{dia_str}")
            
            # self.send_command("done", auto_connect=True) # DISABLED to prevent loop
            
            # STOP the loop immediately
            self.is_running = False 
            self.bp_status["is_running"] = False
            return # Exit loop iteration

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
            logger.info(f"[BP] Captured/Saved Image: {filepath}")
            return True, filepath

# Singleton instance
bp_sensor = BPSensorController()
