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
    def __init__(self, person_model_path='yolov8n.pt', custom_model_path='models/best.pt'):
        self.person_model = None
        self.feet_model = None
        self.class_names = {}
        
        if AI_AVAILABLE:
            try:
                # 1. Load Standard Person Model (YOLOv8n) for Body Detection
                print(f"Loading Person Model from {person_model_path}...")
                self.person_model = YOLO(person_model_path)
                
                # 2. Load Custom Feet Model (best.pt)
                # Check if OpenVINO model exists for optimization
                openvino_path = custom_model_path.replace('.pt', '_openvino_model')
                if os.path.exists(openvino_path):
                    print(f"Loading Optimized OpenVINO Model: {openvino_path}")
                    self.feet_model = YOLO(openvino_path, task='detect')
                elif os.path.exists(custom_model_path):
                    print(f"Loading Custom Feet Model: {custom_model_path}")
                    self.feet_model = YOLO(custom_model_path)
                    
                    # OPTIONAL: Auto-export to OpenVINO for Intel CPU acceleration
                    # Uncomment the next lines to auto-optimize on first run
                    # print("Optimizing model for Intel CPU (OpenVINO)...")
                    # self.feet_model.export(format='openvino')
                    # self.feet_model = YOLO(openvino_path, task='detect')
                else:
                    print(f"Custom model not found at {custom_model_path}. Feet detection disabled.")
                
                if self.feet_model:
                    self.class_names = self.feet_model.names
                    print(f"Feet Model Classes: {self.class_names}")
                    
                print("AI Models loaded successfully.")
            except Exception as e:
                print(f"Failed to load models: {e}")
                self.person_model = None
                self.feet_model = None
        else:
            print("AI is unavailable. Running in pass-through mode.")

    def detect_body(self, frame):
        """
        Camera 1 Logic: Detect Person presence using Standard YOLOv8n.
        """
        if frame is None or self.person_model is None:
            return frame, False

        # Use Standard Model, Class 0 = Person
        # conf=0.5 ensures we don't detect ghosts
        results = self.person_model(frame, verbose=False, classes=[0], conf=0.5) 
        annotated_frame = results[0].plot()
        
        # Check if person is detected
        person_detected = len(results[0].boxes) > 0
        return annotated_frame, person_detected

    def detect_feet_compliance(self, frame):
        """
        Camera 2 Logic: Check for Barefeet/Socks vs Footwear.
        Returns:
            frame: Annotated frame
            status_text: "Valid", "Invalid", or "Waiting"
            is_compliant: True/False
        """
        if frame is None or self.feet_model is None:
            return frame, "AI Not Loaded", False

        # Run Inference
        # conf=0.4: Moderate confidence threshold
        results = self.feet_model(frame, verbose=False, conf=0.4)
        annotated_frame = results[0].plot()
        
        detections = results[0].boxes
        
        # Logic Counters
        feet_count = 0
        socks_count = 0
        shoe_count = 0
        
        for box in detections:
            cls_id = int(box.cls[0])
            class_name = self.class_names.get(cls_id, "unknown").lower()
            
            if "barefeet" in class_name:
                feet_count += 1
            elif "socks" in class_name:
                socks_count += 1
            elif "footwear" in class_name:
                shoe_count += 1
        
        # --- DECISION LOGIC ---
        status_text = "Waiting..."
        is_compliant = False
        color = (0, 255, 255) # Yellow (Waiting)

        if shoe_count > 0:
            status_text = "INVALID: Footwear Detected"
            is_compliant = False
            color = (0, 0, 255) # Red
        elif feet_count > 0 or socks_count > 0:
            status_text = "VALID: Ready to Measure"
            is_compliant = True
            color = (0, 255, 0) # Green
        else:
            status_text = "Waiting for Feet..."
            is_compliant = False
            color = (0, 255, 255) # Yellow

        # Draw Status on Frame
        cv2.putText(annotated_frame, status_text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.8, color, 2)
        
        return annotated_frame, status_text, is_compliant
