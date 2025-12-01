import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import cv2
from PIL import Image, ImageTk
import sys
import os
import time
import threading

# Add parent directory to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

# from detection.simple_detect import PersonDetector

class DatasetCollectorGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Weight Platform - Dataset Collector")
        self.root.geometry("1280x720")
        self.root.configure(bg="#1e1e1e")

        # Configuration
        # Default to Camera Roll, but user can change it
        self.base_save_dir = r"C:\Users\VitalSign\Pictures\Camera Roll"
        self.camera_index = 0
        self.camera_index = 0
        # self.detector = PersonDetector() # Removed as per request
        
        # State
        self.cap = None
        self.running = True
        self.is_capturing = False
        self.capture_count = 0
        self.crop_rect = None # (x, y, w, h)
        self.crop_start = None
        self.is_drawing = False
        self.zoom_factor = 1.0
        
        self.setup_ui()
        
        # Start camera thread
        self.thread = threading.Thread(target=self.video_loop)
        self.thread.daemon = True
        self.thread.start()
        
        # Key bindings
        self.root.bind('<space>', self.on_space_press)
        self.root.bind('<KeyRelease-space>', self.on_space_release)

    def setup_ui(self):
        # --- Header ---
        header = tk.Frame(self.root, bg="#2d2d2d", height=50)
        header.pack(fill=tk.X)
        tk.Label(header, text="Weight Platform Data Collector", font=("Segoe UI", 16, "bold"), bg="#2d2d2d", fg="white").pack(side=tk.LEFT, padx=20, pady=5)
        
        # --- Sidebar (Controls) ---
        # Width increased slightly for better spacing
        sidebar = tk.Frame(self.root, bg="#252526", width=320)
        sidebar.pack(side=tk.RIGHT, fill=tk.Y, padx=0, pady=0)
        sidebar.pack_propagate(False)
        
        # 1. Save Directory (Compact)
        dir_frame = tk.Frame(sidebar, bg="#252526")
        dir_frame.pack(fill=tk.X, padx=10, pady=(10, 5))
        tk.Label(dir_frame, text="Save To:", font=("Segoe UI", 10, "bold"), bg="#252526", fg="white").pack(anchor="w")
        self.lbl_save_dir = tk.Label(dir_frame, text=self.get_short_path(self.base_save_dir), font=("Segoe UI", 8), bg="#252526", fg="#aaaaaa", wraplength=300, justify=tk.LEFT)
        self.lbl_save_dir.pack(fill=tk.X)
        ttk.Button(dir_frame, text="Change Folder...", command=self.change_save_directory).pack(fill=tk.X, pady=2)

        # 2. Zoom Controls (High Priority - Moved Up)
        zoom_group = tk.LabelFrame(sidebar, text="Digital Zoom", font=("Segoe UI", 10, "bold"), bg="#252526", fg="white")
        zoom_group.pack(fill=tk.X, padx=10, pady=5)
        
        zoom_btns = tk.Frame(zoom_group, bg="#252526")
        zoom_btns.pack(fill=tk.X, padx=5, pady=5)
        
        ttk.Button(zoom_btns, text="-", width=5, command=self.zoom_out).pack(side=tk.LEFT, padx=5)
        self.lbl_zoom = tk.Label(zoom_btns, text="1.0x", font=("Segoe UI", 12, "bold"), bg="#252526", fg="#00ff00", width=6)
        self.lbl_zoom.pack(side=tk.LEFT, padx=5)
        ttk.Button(zoom_btns, text="+", width=5, command=self.zoom_in).pack(side=tk.LEFT, padx=5)

        # 3. Brightness / Filter
        filter_group = tk.LabelFrame(sidebar, text="Image Adjustments", font=("Segoe UI", 10, "bold"), bg="#252526", fg="white")
        filter_group.pack(fill=tk.X, padx=10, pady=5)
        
        # Brightness
        tk.Label(filter_group, text="Brightness", font=("Segoe UI", 9), bg="#252526", fg="#aaaaaa").pack(anchor="w", padx=5)
        self.brightness_var = tk.DoubleVar(value=1.0)
        self.scale_brightness = tk.Scale(filter_group, from_=0.2, to=2.0, resolution=0.1, orient=tk.HORIZONTAL, variable=self.brightness_var, bg="#252526", fg="white", highlightthickness=0, showvalue=False)
        self.scale_brightness.pack(fill=tk.X, padx=5)
        
        # Rotation
        tk.Label(filter_group, text="Rotation / Angle", font=("Segoe UI", 9), bg="#252526", fg="#aaaaaa").pack(anchor="w", padx=5, pady=(5,0))
        self.rotation_var = tk.DoubleVar(value=0.0)
        self.scale_rotation = tk.Scale(filter_group, from_=-45.0, to=45.0, resolution=0.5, orient=tk.HORIZONTAL, variable=self.rotation_var, bg="#252526", fg="white", highlightthickness=0, showvalue=True)
        self.scale_rotation.pack(fill=tk.X, padx=5)
        
        ttk.Button(filter_group, text="Reset Adjustments", command=self.reset_adjustments).pack(fill=tk.X, padx=5, pady=5)

        # 4. Class Selection
        class_group = tk.LabelFrame(sidebar, text="Class Selection", font=("Segoe UI", 10, "bold"), bg="#252526", fg="white")
        class_group.pack(fill=tk.X, padx=10, pady=5)
        
        self.var_class_name = tk.StringVar(value="barefeet")
        self.entry_class = ttk.Entry(class_group, textvariable=self.var_class_name, font=("Segoe UI", 11))
        self.entry_class.pack(fill=tk.X, padx=5, pady=5)
        
        # Quick Buttons
        btn_frame = tk.Frame(class_group, bg="#252526")
        btn_frame.pack(fill=tk.X, padx=5, pady=2)
        
        def set_class(name):
            self.var_class_name.set(name)
            
        ttk.Button(btn_frame, text="✔ Empty Platform", command=lambda: set_class("platform")).pack(fill=tk.X, pady=1)
        ttk.Button(btn_frame, text="✔ Barefoot", command=lambda: set_class("barefeet")).pack(fill=tk.X, pady=1)
        ttk.Button(btn_frame, text="✔ Socks", command=lambda: set_class("socks")).pack(fill=tk.X, pady=1)
        ttk.Button(btn_frame, text="✔ Footwear", command=lambda: set_class("footwear")).pack(fill=tk.X, pady=1)

        # 5. Crop & View Controls
        crop_group = tk.Frame(sidebar, bg="#252526")
        crop_group.pack(fill=tk.X, padx=10, pady=5)
        
        self.square_mode_var = tk.BooleanVar(value=False)
        tk.Checkbutton(crop_group, text="Square Camera (1:1)", variable=self.square_mode_var, bg="#252526", fg="white", selectcolor="#2d2d2d", font=("Segoe UI", 10)).pack(anchor="w", pady=2)
        
        ttk.Button(crop_group, text="Reset Crop Region", command=self.reset_crop).pack(fill=tk.X, pady=2)

        # 6. Capture (Bottom)
        cap_group = tk.Frame(sidebar, bg="#252526")
        cap_group.pack(side=tk.BOTTOM, fill=tk.X, padx=10, pady=20)
        
        self.lbl_count = tk.Label(cap_group, text="Captures: 0", font=("Segoe UI", 12), bg="#252526", fg="#00ff00")
        self.lbl_count.pack(pady=(0, 5))
        
        self.btn_capture = tk.Button(cap_group, text="CAPTURE (SPACE)", command=self.capture_image, bg="#007acc", fg="white", font=("Segoe UI", 12, "bold"), height=2)
        self.btn_capture.pack(fill=tk.X)
        
        tk.Label(cap_group, text="Draw box on video to crop.\nPress SPACE to capture.", font=("Segoe UI", 8), bg="#252526", fg="#888888").pack(pady=5)

        # --- Main Content (Video) ---
        # Using a smaller frame for video to "minimize camera space" as requested, 
        # but keeping it expandable so it doesn't look broken.
        content = tk.Frame(self.root, bg="#1e1e1e")
        content.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=20, pady=20) # Increased padding to center/shrink slightly

        self.canvas = tk.Canvas(content, bg="black", cursor="cross")
        self.canvas.pack(fill=tk.BOTH, expand=True)
        
        # Mouse events
        self.canvas.bind("<ButtonPress-1>", self.on_mouse_down)
        self.canvas.bind("<B1-Motion>", self.on_mouse_drag)
        self.canvas.bind("<ButtonRelease-1>", self.on_mouse_up)

    def get_short_path(self, path):
        if len(path) > 40:
            return "..." + path[-37:]
        return path

    def change_save_directory(self):
        new_dir = filedialog.askdirectory(initialdir=self.base_save_dir, title="Select Dataset Parent Directory")
        if new_dir:
            self.base_save_dir = new_dir
            self.lbl_save_dir.config(text=self.get_short_path(self.base_save_dir))
            print(f"Save directory changed to: {self.base_save_dir}")

    def zoom_in(self):
        self.zoom_factor = min(self.zoom_factor + 0.1, 3.0)
        self.update_zoom_label()

    def zoom_out(self):
        self.zoom_factor = max(self.zoom_factor - 0.1, 1.0)
        self.update_zoom_label()

    def update_zoom_label(self):
        self.lbl_zoom.config(text=f"{self.zoom_factor:.1f}x")

    def reset_adjustments(self):
        self.brightness_var.set(1.0)
        self.rotation_var.set(0.0)

    def apply_zoom(self, frame):
        if self.zoom_factor == 1.0:
            return frame
        
        h, w = frame.shape[:2]
        new_h, new_w = int(h / self.zoom_factor), int(w / self.zoom_factor)
        
        top = (h - new_h) // 2
        left = (w - new_w) // 2
        
        cropped = frame[top:top+new_h, left:left+new_w]
        return cv2.resize(cropped, (w, h))

    def apply_brightness(self, frame):
        val = self.brightness_var.get()
        if val == 1.0:
            return frame
        # Efficient brightness adjustment
        return cv2.convertScaleAbs(frame, alpha=val, beta=0)

    def apply_rotation(self, frame):
        angle = self.rotation_var.get()
        if angle == 0.0:
            return frame
        
        h, w = frame.shape[:2]
        center = (w // 2, h // 2)
        
        # Calculate rotation matrix
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        
        # Perform rotation
        # Use borderReplicate to avoid black borders if possible, or constant black
        return cv2.warpAffine(frame, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)

    def apply_square_crop(self, frame):
        if not self.square_mode_var.get():
            return frame
        
        h, w = frame.shape[:2]
        min_dim = min(h, w)
        
        start_x = (w - min_dim) // 2
        start_y = (h - min_dim) // 2
        
        return frame[start_y:start_y+min_dim, start_x:start_x+min_dim]

    def video_loop(self):
        self.cap = cv2.VideoCapture(self.camera_index)
        
        while self.running:
            ret, frame = self.cap.read()
            if ret:
                # 1. Apply Zoom
                frame = self.apply_zoom(frame)
                
                # 2. Apply Rotation (New)
                frame = self.apply_rotation(frame)
                
                # 3. Apply Square Crop
                frame = self.apply_square_crop(frame)
                
                # 4. Apply Brightness (Filter)
                frame = self.apply_brightness(frame)
                
                self.original_frame = frame.copy()
                
                # No Detection - Just raw frame
                annotated_frame = frame
                
                # Draw Crop Rect
                if self.crop_rect:
                    x, y, w, h = self.crop_rect
                    cv2.rectangle(annotated_frame, (x, y), (x+w, y+h), (0, 255, 0), 2)
                    cv2.putText(annotated_frame, "CROP AREA", (x, y-5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
                
                # Convert for Display
                img = cv2.cvtColor(annotated_frame, cv2.COLOR_BGR2RGB)
                img = Image.fromarray(img)
                
                # Resize to fit canvas
                canvas_w = self.canvas.winfo_width()
                canvas_h = self.canvas.winfo_height()
                if canvas_w > 1 and canvas_h > 1:
                    img = img.resize((canvas_w, canvas_h), Image.Resampling.LANCZOS)
                
                self.display_image = ImageTk.PhotoImage(image=img)
                self.root.after(0, self.update_canvas, self.display_image)
                
                # Auto-repeat capture if holding space
                if self.is_capturing:
                    self.capture_image()
                    time.sleep(0.1) # Limit to ~10fps capture
            
            time.sleep(0.01)

    def update_canvas(self, imgtk):
        self.canvas.imgtk = imgtk
        self.canvas.create_image(0, 0, anchor=tk.NW, image=imgtk)

    # --- Mouse Handling for Crop ---
    def on_mouse_down(self, event):
        self.crop_start = (event.x, event.y)
        self.is_drawing = True

    def on_mouse_drag(self, event):
        pass # Visual feedback could be added here

    def on_mouse_up(self, event):
        self.is_drawing = False
        end_x, end_y = event.x, event.y
        start_x, start_y = self.crop_start
        
        # Get Canvas Dimensions
        c_w = self.canvas.winfo_width()
        c_h = self.canvas.winfo_height()
        
        # Get Frame Dimensions
        if hasattr(self, 'original_frame'):
            f_h, f_w = self.original_frame.shape[:2]
            
            # Calculate Scale
            scale_x = f_w / c_w
            scale_y = f_h / c_h
            
            # Calculate Rect in Frame Coordinates
            x = int(min(start_x, end_x) * scale_x)
            y = int(min(start_y, end_y) * scale_y)
            w = int(abs(end_x - start_x) * scale_x)
            h = int(abs(end_y - start_y) * scale_y)
            
            if w > 10 and h > 10: # Minimum size
                self.crop_rect = (x, y, w, h)
                print(f"Crop Area Set: {self.crop_rect}")

    def reset_crop(self):
        self.crop_rect = None

    # --- Capture Logic ---
    def on_space_press(self, event):
        self.is_capturing = True
    
    def on_space_release(self, event):
        self.is_capturing = False

    def capture_image(self):
        if not hasattr(self, 'original_frame'):
            return

        class_name = self.var_class_name.get().strip()
        if not class_name:
            class_name = "unknown"
            
        # Create Directory
        save_dir = os.path.join(self.base_save_dir, class_name)
        if not os.path.exists(save_dir):
            os.makedirs(save_dir)
            
        timestamp = int(time.time() * 1000)
        filename = f"{class_name}_{timestamp}.jpg"
        filepath = os.path.join(save_dir, filename)
        
        # Crop or Full
        if self.crop_rect:
            x, y, w, h = self.crop_rect
            # Bounds check
            H, W = self.original_frame.shape[:2]
            x = max(0, x)
            y = max(0, y)
            w = min(w, W - x)
            h = min(h, H - y)
            
            img_to_save = self.original_frame[y:y+h, x:x+w]
        else:
            img_to_save = self.original_frame
            
        cv2.imwrite(filepath, img_to_save)
        
        self.capture_count += 1
        self.lbl_count.config(text=f"Session Captures: {self.capture_count}")
        print(f"Saved: {filepath}")

    def on_close(self):
        self.running = False
        if self.cap:
            self.cap.release()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = DatasetCollectorGUI(root)
    root.protocol("WM_DELETE_WINDOW", app.on_close)
    root.mainloop()
