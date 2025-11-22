import tkinter as tk
from tkinter import ttk, messagebox
import cv2
from PIL import Image, ImageTk
import sys
import os
import threading

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from detection.dual_camera_detect import ComplianceDetector

class DualCameraSystem:
    def __init__(self, root):
        self.root = root
        self.root.title("Vital Sign: Weight Accuracy & Body Scan")
        self.root.geometry("1300x700")
        self.root.configure(bg="#1e1e1e") # Dark mode background
        
        self.detector = ComplianceDetector()
        
        # Camera Indices
        self.cam1_idx = 0 # Body Cam
        self.cam2_idx = 1 # Feet Cam (Change to 1 if you have 2 cameras)
        
        # Initialize Cameras
        self.cap1 = cv2.VideoCapture(self.cam1_idx)
        self.cap2 = cv2.VideoCapture(self.cam2_idx)
        
        # Check if Cam 2 failed, fallback to Cam 1 for demo if needed
        if not self.cap2.isOpened():
            print("Warning: Camera 2 not found. Using Camera 1 for both feeds (Demo Mode).")
            self.cap2 = self.cap1
            
        self.setup_ui()
        self.running = True
        self.update_feeds()

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
        
        self.lbl_body_status = tk.Label(frame_body, text="Waiting for user...", font=("Segoe UI", 14), bg="#1e1e1e", fg="#aaaaaa")
        self.lbl_body_status.pack(pady=10)

        # --- Right Side: Feet Camera ---
        frame_feet = tk.LabelFrame(content, text="Feet Camera (Weight Compliance)", font=("Segoe UI", 12), bg="#1e1e1e", fg="white")
        frame_feet.grid(row=0, column=1, padx=10, pady=10, sticky="nsew")
        
        self.canvas_feet = tk.Canvas(frame_feet, width=600, height=450, bg="black")
        self.canvas_feet.pack(padx=5, pady=5)
        
        self.lbl_feet_status = tk.Label(frame_feet, text="Checking Compliance...", font=("Segoe UI", 14, "bold"), bg="#1e1e1e", fg="orange")
        self.lbl_feet_status.pack(pady=10)

        # --- Footer Controls ---
        footer = tk.Frame(self.root, bg="#1e1e1e")
        footer.pack(fill=tk.X, pady=10)
        
        btn_quit = ttk.Button(footer, text="Exit System", command=self.on_close)
        btn_quit.pack()

    def update_feeds(self):
        if not self.running:
            return
            
        # --- Process Camera 1 (Body) ---
        ret1, frame1 = self.cap1.read()
        if ret1:
            # Detect Person
            frame1, person_found = self.detector.detect_body(frame1)
            self.display_frame(frame1, self.canvas_body)
            
            if person_found:
                self.lbl_body_status.config(text="User Detected", fg="#00ff00")
            else:
                self.lbl_body_status.config(text="No User Detected", fg="#aaaaaa")

        # --- Process Camera 2 (Feet) ---
        ret2, frame2 = self.cap2.read()
        if ret2:
            # Detect Compliance (Shoes/Bags)
            frame2, status_msg, is_compliant = self.detector.detect_feet_compliance(frame2)
            self.display_frame(frame2, self.canvas_feet)
            
            self.lbl_feet_status.config(text=status_msg)
            if is_compliant:
                self.lbl_feet_status.config(fg="#00ff00") # Green
            else:
                self.lbl_feet_status.config(fg="#ff0000") # Red

        self.root.after(30, self.update_feeds)

    def display_frame(self, frame, canvas):
        frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        frame = cv2.resize(frame, (600, 450))
        img = Image.fromarray(frame)
        imgtk = ImageTk.PhotoImage(image=img)
        canvas.imgtk = imgtk
        canvas.create_image(0, 0, anchor=tk.NW, image=imgtk)

    def on_close(self):
        self.running = False
        self.cap1.release()
        self.cap2.release()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = DualCameraSystem(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()
