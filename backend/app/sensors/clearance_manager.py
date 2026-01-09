import cv2
import numpy as np
import threading
import time

class ClearanceManager:
    """
    Simplified ClearanceManager - Camera only, no AI processing.
    Runs dual cameras (feet/body) and stitches their feeds.
    """
    def __init__(self):
        self.lock = threading.Lock()
        self.is_active = False
        
        # Frames
        self.feet_frame = None
        self.body_frame = None
        
        # Cameras
        self.cap_feet = None
        self.cap_body = None

    def start_clearance(self):
        """Starts cameras (no AI models)."""
        print("🚀 [ClearanceManager] Starting cameras (No AI)...")
        self.is_active = True
        
        # Start Threads
        threading.Thread(target=self._run_feet_camera, daemon=True).start()
        threading.Thread(target=self._run_body_camera, daemon=True).start()

    def stop_clearance(self):
        print("🛑 [ClearanceManager] Stopping cameras...")
        self.is_active = False
        time.sleep(0.5)
        if self.cap_feet: 
            self.cap_feet.release()
            self.cap_feet = None
        if self.cap_body: 
            self.cap_body.release()
            self.cap_body = None

    def _apply_zoom(self, frame, zoom_factor):
        """Apply center zoom to frame."""
        if zoom_factor <= 1.0:
            return frame
        h, w = frame.shape[:2]
        new_w = int(w / zoom_factor)
        new_h = int(h / zoom_factor)
        x1 = (w - new_w) // 2
        y1 = (h - new_h) // 2
        cropped = frame[y1:y1+new_h, x1:x1+new_w]
        return cv2.resize(cropped, (w, h))

    def _apply_square_crop(self, frame):
        """Crop frame to center square."""
        h, w = frame.shape[:2]
        size = min(h, w)
        x1 = (w - size) // 2
        y1 = (h - size) // 2
        return frame[y1:y1+size, x1:x1+size]

    def _run_feet_camera(self):
        """Feet camera - Index 0, rotation=180, zoom=1.3, square_crop=True"""
        cap = None
        backends = [cv2.CAP_DSHOW, cv2.CAP_ANY, cv2.CAP_MSMF]
        
        for backend in backends:
            cap = cv2.VideoCapture(0, backend)
            if cap.isOpened():
                ret, test_frame = cap.read()
                if ret and test_frame is not None:
                    print(f"✅ Feet camera opened with backend {backend}")
                    break
                cap.release()
                cap = None
        
        if cap is None or not cap.isOpened():
            print("❌ Feet camera failed to open on all backends!")
            return
        
        # Optimize
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M','J','P','G'))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 15)
        self.cap_feet = cap
        
        while self.is_active:
            ret, frame = cap.read()
            if not ret: 
                time.sleep(0.1)
                continue
            
            # Apply Settings: Rotate 180, Zoom 1.3, Square Crop
            frame = cv2.rotate(frame, cv2.ROTATE_180)
            frame = self._apply_zoom(frame, 1.3)
            frame = self._apply_square_crop(frame)
            frame = cv2.resize(frame, (480, 480))
            
            # Add label overlay
            cv2.putText(frame, "FEET CAMERA", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)

            self.feet_frame = frame
            time.sleep(0.03)

    def _run_body_camera(self):
        """Body camera - Index 2, rotation=180, zoom=1.0, square_crop=True"""
        cap = None
        backends = [cv2.CAP_DSHOW, cv2.CAP_ANY, cv2.CAP_MSMF]
        
        for backend in backends:
            cap = cv2.VideoCapture(2, backend)
            if cap.isOpened():
                ret, test_frame = cap.read()
                if ret and test_frame is not None:
                    print(f"✅ Body camera opened with backend {backend}")
                    break
                cap.release()
                cap = None
        
        if cap is None or not cap.isOpened():
            print("❌ Body camera failed to open on all backends!")
            return
        
        # Optimize with MJPG codec
        cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M','J','P','G'))
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_FPS, 15)
        self.cap_body = cap
        
        while self.is_active:
            ret, frame = cap.read()
            if not ret:
                time.sleep(0.1)
                continue
            
            # Apply Settings: Rotate 180, Square Crop (no zoom)
            frame = cv2.rotate(frame, cv2.ROTATE_180)
            frame = self._apply_square_crop(frame)
            frame = cv2.resize(frame, (480, 480))
            
            # Add label overlay
            cv2.putText(frame, "BODY CAMERA", (10, 30), 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.8, (255, 255, 255), 2)
                 
            self.body_frame = frame
            time.sleep(0.03)

    def get_stitched_frame(self):
        """Yields combined MJPEG stream of both cameras (body on top, feet on bottom)."""
        placeholder = np.zeros((480, 480, 3), dtype=np.uint8)
        cv2.putText(placeholder, "NO SIGNAL", (150, 240), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (100, 100, 100), 2)
        
        while True:
            if not self.is_active:
                time.sleep(0.5)
                ret, jpeg = cv2.imencode('.jpg', placeholder)
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
                continue

            top = self.body_frame if self.body_frame is not None else placeholder
            bottom = self.feet_frame if self.feet_frame is not None else placeholder
            
            # Ensure size matches
            if top.shape[:2] != (480, 480): 
                top = cv2.resize(top, (480, 480))
            if bottom.shape[:2] != (480, 480): 
                bottom = cv2.resize(bottom, (480, 480))
            
            combined = np.vstack((top, bottom))
            ret, jpeg = cv2.imencode('.jpg', combined)
            if ret:
                yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            
            time.sleep(0.06)

    def get_status(self):
        """Returns camera status - always returns 'ready' since no AI validation."""
        return {
            "feet": {"message": "Camera Ready", "is_compliant": True},
            "body": {"message": "Camera Ready", "is_compliant": True}
        }

clearance_manager = ClearanceManager()
