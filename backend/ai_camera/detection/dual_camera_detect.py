import cv2
import sys
import os
import time

# Global flag to check if AI is available
AI_AVAILABLE = False
AI_ERROR_MSG = ""

try:
    from ultralytics import YOLO
    AI_AVAILABLE = True
except ImportError as e:
    AI_ERROR_MSG = f"Import Error: {e}"
    print(f"Warning: {AI_ERROR_MSG}")
except OSError as e:
    AI_ERROR_MSG = f"System Error (DLL): {e}"
    print(f"Warning: {AI_ERROR_MSG}")
except Exception as e:
    AI_ERROR_MSG = f"Unknown Error: {e}"
    print(f"Warning: {AI_ERROR_MSG}")

class ComplianceDetector:
    def __init__(self):
        self.person_model = None
        self.wearables_model = None
        self.feet_model = None
        self.feet_classes = {}
        self.wearables_classes = {}
        
        # Paths
        base_dir = os.path.dirname(os.path.abspath(__file__))
        self.models_dir = os.path.join(base_dir, '..', 'models')
        
        # Model File Names
        self.person_model_name = 'yolov8n.pt'
        self.wearables_model_name = 'wearables.pt'
        self.feet_model_name = 'weight.pt' 
        
        self.person_path = os.path.join(self.models_dir, self.person_model_name)
        self.wearables_path = os.path.join(self.models_dir, self.wearables_model_name)
        self.feet_path = os.path.join(self.models_dir, self.feet_model_name)
        
        # Ensure models dir exists
        if not os.path.exists(self.models_dir):
            os.makedirs(self.models_dir)

        if AI_AVAILABLE:
            try:
                print("Loading AI Models...")

                # --- 1. Load Standard Person Detector (YOLOv8n) ---
                if os.path.exists(self.person_path):
                    print(f"Loading Person Model: {self.person_path}")
                    self.person_model = YOLO(self.person_path)
                else:
                    print("Downloading yolov8n.pt...")
                    self.person_model = YOLO('yolov8n.pt')

                # --- 2. Load Wearables Model (Custom) ---
                # Force PyTorch because OpenVINO is causing StopIteration errors in thread
                if os.path.exists(self.wearables_path):
                    print(f"Loading Custom Wearables Model (PT): {self.wearables_path}")
                    self.wearables_model = YOLO(self.wearables_path)
                else:
                     print(f"Wearables model missing at {self.wearables_path}")

                if self.wearables_model:
                     self.wearables_classes = self.wearables_model.names

                # --- 3. Load Feet/Weight Model (Custom) ---
                # Force PyTorch because OpenVINO is causing StopIteration errors in thread
                if os.path.exists(self.feet_path):
                    print(f"Loading Custom Feet Model (PT): {self.feet_path}")
                    self.feet_model = YOLO(self.feet_path)
                else:
                    print(f"Weight/Feet model not found at {self.feet_path}. Feet detection disabled.")

                if self.feet_model:
                     self.feet_classes = self.feet_model.names

                print("AI Models loaded successfully.")
            except Exception as e:
                print(f"Failed to load models: {e}")
        else:
            print("AI is unavailable. Running in pass-through mode.")

    def detect_body(self, frame):
        """
        Camera 1 Logic: 
        1. Check if Person is present (Using YOLOv8n)
        2. Check for Wearables (Using Wearables Model)
        """
        if frame is None:
            return frame, "No Frame", False
            
        annotated_frame = frame.copy()
        person_detected = False
        wearables_detected = []
        
        # --- Step 1: Detect Person ---
        if self.person_model:
            results_p = self.person_model(frame, verbose=False, classes=[0], conf=0.5)
            # Draw person box manually to customize color (Blue/Yellow) if needed, or use plot
            # Using plot for simplicity, but we want to layer wearables on top
            # annotated_frame = results_p[0].plot() 
            
            if len(results_p[0].boxes) > 0:
                person_detected = True
                # Draw Person Box
                for box in results_p[0].boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (255, 255, 0), 2) # Cyan/Yellowish for Person
                    cv2.putText(annotated_frame, "User Detected", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

        # --- Step 2: Detect Wearables ---
        if self.wearables_model:
            results_w = self.wearables_model(frame, verbose=False, conf=0.25)
            
            for box in results_w[0].boxes:
                cls_id = int(box.cls[0])
                class_name = self.wearables_classes.get(cls_id, "unknown").lower()
                
                # Filter strictly for our bad classes
                # Ensure 'id-lace' or 'id_lace' or similar are caught
                if any(x in class_name for x in ['watch', 'cap', 'bag', 'lace', 'smart', 'glasses', 'necklace']):
                    conf_score = float(box.conf[0])
                    label = f"{class_name} {conf_score:.0%}"
                    detect_text = f"INVALID: {label}"
                    
                    wearables_detected.append(label)
                    
                    # Draw Wearable Box (Red)
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2) 
                    cv2.putText(annotated_frame, detect_text, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)

        # --- Decision ---
        if not person_detected:
            status = "Waiting for User..."
            color = (0, 255, 255) # Yellow
            is_valid = False
        elif len(wearables_detected) > 0:
            items_str = ", ".join(list(set(wearables_detected)))
            status = f"INVALID: Remove {items_str}"
            color = (0, 0, 255) # Red
            is_valid = False
        else:
            status = "VALID: Body Scan Clear"
            color = (0, 255, 0) # Green
            is_valid = True
            
        cv2.putText(annotated_frame, status, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        return annotated_frame, status, is_valid

    def detect_feet_compliance(self, frame):
        """
        Camera 2 Logic: Check for Barefeet/Socks vs Footwear.
        """
        if frame is None or self.feet_model is None:
            return frame, "AI Not Loaded", False

        # Run Inference
        results = self.feet_model(frame, verbose=False, conf=0.4)
        annotated_frame = results[0].plot() # Use default plot for feet is fine
        
        detections = results[0].boxes
        
        feet_count = 0
        socks_count = 0
        shoe_count = 0
        
        for box in detections:
            cls_id = int(box.cls[0])
            class_name = self.feet_classes.get(cls_id, "unknown").lower()
            
            if "barefeet" in class_name:
                feet_count += 1
            elif "socks" in class_name:
                socks_count += 1
            elif "footwear" in class_name:
                shoe_count += 1
        
        # Decision
        status_text = "Waiting..."
        is_compliant = False
        color = (0, 255, 255)

        if shoe_count > 0:
            status_text = "INVALID: Footwear Detected"
            is_compliant = False
            color = (0, 0, 255)
        elif feet_count > 0 or socks_count > 0:
            status_text = "VALID: Ready to Measure"
            is_compliant = True
            color = (0, 255, 0)
        else:
            status_text = "Waiting for Feet..."
            is_compliant = False
            color = (0, 255, 255)

        cv2.putText(annotated_frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        return annotated_frame, status_text, is_compliant
