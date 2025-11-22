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
    def __init__(self, model_path='../models/best.pt'):
        self.model = None
        self.class_names = {}
        
        if AI_AVAILABLE:
            try:
                # Construct absolute path to model to avoid path issues
                abs_model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'best.pt'))
                print(f"Loading YOLO model from {abs_model_path}...")
                self.model = YOLO(abs_model_path)
                self.class_names = self.model.names
                print("Model loaded successfully.")
            except Exception as e:
                print(f"Failed to load model: {e}")
                self.model = None
        else:
            print("AI is unavailable. Running in pass-through mode.")

        # Define Compliance Rules
        # In our custom model: 0 = bare_feet
        self.PERMITTED_CLASSES = [0] # bare_feet
        
        # We don't have 'shoes' trained yet, so anything NOT 'bare_feet' is technically unknown/suspicious
        # But for now, we will just check if we see 'bare_feet'.
        self.FORBIDDEN_CLASSES = []

    def detect_body(self, frame):
        """
        Camera 1 Logic: Detect Person presence.
        """
        if frame is None or self.model is None:
            return frame, False

        results = self.model(frame, verbose=False, classes=[0]) # 0 is Person in COCO
        annotated_frame = results[0].plot()
        
        # Check if person is detected
        person_detected = len(results[0].boxes) > 0
        return annotated_frame, person_detected

    def detect_feet_compliance(self, frame):
        """
        Camera 2 Logic: Check for shoes, bags, etc.
        Returns: frame, status_message, is_compliant (True/False)
        """
        if frame is None or self.model is None:
            return frame, "AI Error", False

        # Run detection on everything
        results = self.model(frame, verbose=False)
        annotated_frame = results[0].plot()
        
        detections = results[0].boxes
        
        violations = []
        
        # Custom Logic for Bare Feet Model
        # We only trained 'bare_feet' (class 0).
        # So if we see class 0, it is compliant.
        
        bare_feet_detected = False
        
        for box in detections:
            cls_id = int(box.cls[0])
            # cls_name = self.class_names.get(cls_id, "Unknown")
            
            if cls_id == 0: # bare_feet
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
