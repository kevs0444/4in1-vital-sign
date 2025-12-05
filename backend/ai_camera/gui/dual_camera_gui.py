import tkinter as tk
from tkinter import ttk, messagebox
import cv2
from PIL import Image, ImageTk
import sys
import os
import threading
import time

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from detection.dual_camera_detect import ComplianceDetector

class CameraThread(threading.Thread):
    def __init__(self, camera_index, detector_func, zoom_factor=1.0, flip_vertical=False, name="Camera"):
        super().__init__()
        self.camera_index = camera_index
        self.detector_func = detector_func
        self.zoom_factor = zoom_factor
        self.flip_vertical = flip_vertical
        self.name_str = name
        self.cap = None
        self.running = True
        self.latest_frame = None
        self.latest_status = "Initializing..."
        self.latest_flag = False # Compliant or Detected
        self.lock = threading.Lock()
        self.fps = 0
        self.last_time = time.time()

    def run(self):
        print(f"Starting {self.name_str} on index {self.camera_index}...")
        self.cap = cv2.VideoCapture(self.camera_index)
        
        if not self.cap.isOpened():
            print(f"Error: Could not open {self.name_str} (Index {self.camera_index})")
            self.latest_status = "Camera Error"
            return

        while self.running:
            ret, frame = self.cap.read()
            if ret:
                # Calculate FPS
                curr_time = time.time()
                self.fps = 1 / (curr_time - self.last_time) if (curr_time - self.last_time) > 0 else 0
                self.last_time = curr_time

                # Flip Vertical (if enabled)
                if self.flip_vertical:
                    frame = cv2.flip(frame, 0) # 0 = Vertical Flip

                # Zoom
                if self.zoom_factor > 1.0:
                    frame = self.apply_zoom(frame, self.zoom_factor)

                # Square Crop (If enabled for this camera)
                if getattr(self, 'apply_square_crop', False):
                    h, w = frame.shape[:2]
                    min_dim = min(h, w)
                    start_x = (w - min_dim) // 2
                    start_y = (h - min_dim) // 2
                    frame = frame[start_y:start_y+min_dim, start_x:start_x+min_dim]
                
                # Detection
                try:
                    # detector_func must return (frame, status_text, boolean_flag)
                    processed_frame, status, flag = self.detector_func(frame)
                    
                    with self.lock:
                        self.latest_frame = processed_frame
                        self.latest_status = status
                        self.latest_flag = flag
                except Exception as e:
                    print(f"Error in detection loop for {self.name_str}: {e}")
            else:
                with self.lock:
                    self.latest_status = "No Signal"
                time.sleep(0.1)

        self.cap.release()
        print(f"Stopped {self.name_str}")

    def apply_zoom(self, frame, zoom_factor):
        h, w = frame.shape[:2]
        new_h, new_w = int(h / zoom_factor), int(w / zoom_factor)
        
        top = (h - new_h) // 2
        left = (w - new_w) // 2
        
        cropped = frame[top:top+new_h, left:left+new_w]
        return cv2.resize(cropped, (w, h))

    def get_data(self):
        with self.lock:
            return self.latest_frame, self.latest_status, self.latest_flag, self.fps

    def stop(self):
        self.running = False
        self.join()

class DualCameraSystem:
    def __init__(self, root):
        self.root = root
        self.root.title("Vital Sign: Weight Accuracy & Body Scan")
        self.root.geometry("1300x750")
        self.root.configure(bg="#1e1e1e")
        
        # Initialize detector - Camera 2 will use the barefeet model
        # Model path: logs/yolov8_barefeet/weights/best.pt (trained from datasets_barefeet)
        self.detector = ComplianceDetector()
        
        # Camera Indices (Swapped as per previous request)
        self.cam1_idx = 1 # Body Cam (Person detection using YOLOv8n)
        self.cam2_idx = 0 # Feet Cam (Barefeet detection using custom model)
        
        self.setup_ui()
        
        # Start Threads
        # Body Cam: Normal (1.0x), Flipped Vertically
        self.thread_body = CameraThread(self.cam1_idx, self.body_detection_wrapper, zoom_factor=1.0, flip_vertical=True, name="Body Cam")
        
        # Feet Cam: Zoomed (1.3x) to match training data
        self.thread_feet = CameraThread(self.cam2_idx, self.feet_detection_wrapper, zoom_factor=1.3, name="Feet Cam")
        self.thread_feet.apply_square_crop = True # Enable square crop flag
        
        self.thread_body.start()
        self.thread_feet.start()
        
        self.update_ui()

    def body_detection_wrapper(self, frame):
        # Adapt detect_body to return (frame, status, flag)
        annotated_frame, detected = self.detector.detect_body(frame)
        status = "User Detected" if detected else "No User Detected"
        return annotated_frame, status, detected

    def feet_detection_wrapper(self, frame):
        # detect_feet_compliance already returns (frame, status, is_compliant)
        return self.detector.detect_feet_compliance(frame)

    def setup_ui(self):
        # Header
        header = tk.Frame(self.root, bg="#2d2d2d", height=60)
        header.pack(fill=tk.X)
        lbl_title = tk.Label(header, text="AI Weight Compliance System", font=("Segoe UI", 20, "bold"), bg="#2d2d2d", fg="white")
        lbl_title.pack(pady=10)

        # Main Content Area
        content = tk.Frame(self.root, bg="#1e1e1e")
        content.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # --- Left Side: Body Camera ---
        frame_body = tk.LabelFrame(content, text="Body Camera (Positioning)", font=("Segoe UI", 12), bg="#1e1e1e", fg="white")
        frame_body.grid(row=0, column=0, padx=10, pady=10, sticky="nsew")
        
        self.canvas_body = tk.Canvas(frame_body, width=600, height=450, bg="black")
        self.canvas_body.pack(padx=5, pady=5)
        
        self.lbl_body_status = tk.Label(frame_body, text="Waiting...", font=("Segoe UI", 14), bg="#1e1e1e", fg="#aaaaaa")
        self.lbl_body_status.pack(pady=10)
        self.lbl_body_fps = tk.Label(frame_body, text="FPS: 0", font=("Segoe UI", 10), bg="#1e1e1e", fg="#555555")
        self.lbl_body_fps.pack()

        # --- Right Side: Feet Camera ---
        frame_feet = tk.LabelFrame(content, text="Feet Camera (Weight Compliance)", font=("Segoe UI", 12), bg="#1e1e1e", fg="white")
        frame_feet.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        self.canvas_feet = tk.Canvas(frame_feet, width=600, height=450, bg="black")
        self.canvas_feet.pack(padx=5, pady=5)
        
        self.lbl_feet_status = tk.Label(frame_feet, text="Initializing...", font=("Segoe UI", 14, "bold"), bg="#1e1e1e", fg="orange")
        self.lbl_feet_status.pack(pady=10)
        self.lbl_feet_fps = tk.Label(frame_feet, text="FPS: 0", font=("Segoe UI", 10), bg="#1e1e1e", fg="#555555")
        self.lbl_feet_fps.pack()

        # --- Footer Controls ---
        footer = tk.Frame(self.root, bg="#1e1e1e")
        footer.pack(fill=tk.X, pady=10)
        
        btn_switch = ttk.Button(footer, text="Switch Cameras", command=self.switch_cameras)
        btn_switch.pack(side=tk.LEFT, padx=20)
        
        btn_quit = ttk.Button(footer, text="Exit System", command=self.on_close)
        btn_quit.pack(side=tk.RIGHT, padx=20)

    def update_ui(self):
        # Update Body Cam UI
        frame1, status1, flag1, fps1 = self.thread_body.get_data()
        if frame1 is not None:
            self.display_frame(frame1, self.canvas_body)
            self.lbl_body_status.config(text=status1, fg="#00ff00" if flag1 else "#aaaaaa")
            self.lbl_body_fps.config(text=f"FPS: {fps1:.1f}")

        # Update Feet Cam UI
        frame2, status2, flag2, fps2 = self.thread_feet.get_data()
        if frame2 is not None:
            self.display_frame(frame2, self.canvas_feet)
            self.lbl_feet_status.config(text=status2)
            self.lbl_feet_status.config(fg="#00ff00" if flag2 else "#ff0000")
            self.lbl_feet_fps.config(text=f"FPS: {fps2:.1f}")

        # Schedule next update (keep GUI responsive, 30ms = ~33fps refresh)
        self.root.after(30, self.update_ui)

    def display_frame(self, frame, canvas):
        # Resize to fit canvas if needed (though we resize in thread/zoom, double check)
        # The canvas is 600x450.
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame = cv2.resize(frame, (600, 450))
        img = Image.fromarray(frame)
        imgtk = ImageTk.PhotoImage(image=img)
        canvas.imgtk = imgtk
        canvas.create_image(0, 0, anchor=tk.NW, image=imgtk)

    def switch_cameras(self):
        print("Switching cameras...")
        # Stop current threads
        self.thread_body.stop()
        self.thread_feet.stop()
        
        # Swap indices
        self.cam1_idx, self.cam2_idx = self.cam2_idx, self.cam1_idx
        
        # Restart threads with new indices
        self.thread_body = CameraThread(self.cam1_idx, self.body_detection_wrapper, zoom_factor=1.0, name="Body Cam")
        self.thread_feet = CameraThread(self.cam2_idx, self.feet_detection_wrapper, zoom_factor=1.0, name="Feet Cam")
        
        self.thread_body.start()
        self.thread_feet.start()
        print(f"Cameras switched. Body: {self.cam1_idx}, Feet: {self.cam2_idx}")

    def on_close(self):
        self.thread_body.stop()
        self.thread_feet.stop()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = DualCameraSystem(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()
