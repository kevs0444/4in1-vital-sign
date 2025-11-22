import cv2
import sys
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
    def __init__(self, model_path='yolov8n.pt'):
        self.model = None
        self.class_names = {}
        
        if AI_AVAILABLE:
            try:
                print(f"Loading YOLO model from {model_path}...")
                self.model = YOLO(model_path)
                self.class_names = self.model.names
                print("Model loaded successfully.")
            except Exception as e:
                print(f"Failed to load model: {e}")
                self.model = None
        else:
            print("AI is unavailable. Running in pass-through mode.")

        # Define Compliance Rules (IDs based on standard COCO dataset for now)
        # In a custom model, these IDs would match your config.yaml
        self.FORBIDDEN_CLASSES = [24, 26, 28] # backpack, handbag, suitcase (COCO)
        # self.FORBIDDEN_CLASSES = [2, 3, 4, 5] # shoes, bag, backpack, other (Custom)
        
        self.PERMITTED_CLASSES = [0] # person (COCO) - strictly we want feet/socks
        # self.PERMITTED_CLASSES = [0, 1] # bare_feet, socks (Custom)

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
        
        for box in detections:
            cls_id = int(box.cls[0])
            cls_name = self.class_names.get(cls_id, "Unknown")
            
            # Check for forbidden items
            if cls_id in self.FORBIDDEN_CLASSES:
                violations.append(cls_name)
            
            # If using standard YOLOv8n, we can't detect shoes yet.
            # We assume 'person' is okay, but 'backpack' is bad.
            # TODO: Once custom model is trained, add 'shoes' to FORBIDDEN_CLASSES
            
        if violations:
            status = f"VIOLATION: {', '.join(set(violations))}"
            is_compliant = False
            # Draw red border
            h, w = frame.shape[:2]
            cv2.rectangle(annotated_frame, (0,0), (w,h), (0,0,255), 10)
        else:
            status = "COMPLIANT: Ready for Weight"
            is_compliant = True
            # Draw green border
            h, w = frame.shape[:2]
            cv2.rectangle(annotated_frame, (0,0), (w,h), (0,255,0), 10)
            
        return annotated_frame, status, is_compliant
