from ultralytics import YOLO
import os

def verify_model():
    # Path to the trained model
    model_path = r'C:\Users\VitalSign\Documents\4in1-vital-sign\logs\yolov8_socks\weights\best.pt'
    
    if not os.path.exists(model_path):
        print(f"❌ Model file not found at: {model_path}")
        return

    print(f"✅ Found model at: {model_path}")
    
    try:
        model = YOLO(model_path)
        print("\nModel Classes:")
        print(model.names)
        
        if 0 in model.names and model.names[0] == 'white_socks':
            print("\n✅ VERIFICATION SUCCESSFUL: Model is trained for 'white_socks'")
        else:
            print("\n⚠️ WARNING: Model classes do not match expected 'white_socks'")
            
    except Exception as e:
        print(f"❌ Error loading model: {e}")

if __name__ == "__main__":
    verify_model()
