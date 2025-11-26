from ultralytics import YOLO
import os

try:
    model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'models', 'best.pt'))
    print(f"Loading model from: {model_path}")
    model = YOLO(model_path)
    print("Model Classes:")
    print(model.names)
except Exception as e:
    print(f"Error: {e}")
