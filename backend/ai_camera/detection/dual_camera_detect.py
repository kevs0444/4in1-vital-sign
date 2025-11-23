import cv2
import sys
import os
from ultralytics import YOLO

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
    def __init__(self, feet_model_path='../models/best.pt', person_model_path='yolov8n.pt'):
        self.feet_model = None
        self.person_model = None
        
        if AI_AVAILABLE:
            try:
                # 1. Load Custom Feet Model
                abs_feet_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'best.pt'))
                print(f"Loading Feet Model from {abs_feet_path}...")
                self.feet_model = YOLO(abs_feet_path)
                
                # 2. Load Standard Person Model (YOLOv8n)
                # This will download automatically if not present
                print(f"Loading Person Model from {person_model_path}...")
                self.person_model = YOLO(person_model_path)
                
                print("All Models loaded successfully.")
            except Exception as e:
                print(f"Failed to load models: {e}")
                self.feet_model = None
                self.person_model = None
        else:
            print("AI is unavailable. Running in pass-through mode.")

    def detect_body(self, frame):
        """
        Camera 1 Logic: Detect Person presence using Standard YOLOv8n.
        """
        if frame is None or self.person_model is None:
            return frame, False

        # Use Standard Model, Class 0 = Person
        results = self.person_model(frame, verbose=False, classes=[0]) 
        annotated_frame = results[0].plot()
        
        # Check if person is detected
        person_detected = len(results[0].boxes) > 0
        return annotated_frame, person_detected

    def detect_feet_compliance(self, frame):
        """
        Camera 2 Logic: Check for Bare Feet using Custom Model.
        """
        if frame is None or self.feet_model is None:
            return frame, "AI Error", False

        # Use Custom Feet Model
        results = self.feet_model(frame, verbose=False)
        annotated_frame = results[0].plot()
        
        detections = results[0].boxes
        bare_feet_detected = False
        
        for box in detections:
            cls_id = int(box.cls[0])
            # In our custom model, 0 is bare_feet
            if cls_id == 0: 
                bare_feet_detected = True
            
        if bare_feet_detected:
            status = "COMPLIANT: Bare Feet Detected"
            is_compliant = True
            # Draw green border
            h, w = frame.shape[:2]
            cv2.rectangle(annotated_frame, (0,0), (w,h), (0,255,0), 10)
        else:
            status = "WAITING: Please step on scale barefoot"
            is_compliant = False
            # Draw orange border
            h, w = frame.shape[:2]
            cv2.rectangle(annotated_frame, (0,0), (w,h), (0,165,255), 10)
            
        return annotated_frame, status, is_compliant
