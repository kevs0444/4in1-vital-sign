import cv2
from ultralytics import YOLO
import os

class PersonDetector:
    def __init__(self, model_path='yolov8n.pt'):
        self.model = None
        try:
            print(f"Loading Person Model from {model_path}...")
            self.model = YOLO(model_path)
            print("Person Model loaded successfully.")
        except Exception as e:
            print(f"Failed to load model: {e}")
            self.model = None

    def detect(self, frame):
        """
        Detect Person presence using Standard YOLOv8n.
        """
        if frame is None or self.model is None:
            return frame, False

        # Use Standard Model, Class 0 = Person
        results = self.model(frame, verbose=False, classes=[0]) 
        annotated_frame = results[0].plot()
        
        # Check if person is detected
        person_detected = len(results[0].boxes) > 0
        return annotated_frame, person_detected
