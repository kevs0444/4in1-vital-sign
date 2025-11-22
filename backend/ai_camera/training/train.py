from ultralytics import YOLO

def train_model():
    # Load a model
    model = YOLO('yolov8n.pt')  # load a pretrained model (recommended for training)

    # Train the model
    results = model.train(
        data=r'C:\Users\VitalSign\Documents\4in1-vital-sign\backend\ai_camera\training\config.yaml',
        epochs=100,
        imgsz=640,
        device='cpu', # Use '0' for GPU
        project='logs',
        name='yolov8_custom'
    )
    
    print("Training completed.")
    print(f"Best model saved at: {results.save_dir}")

if __name__ == "__main__":
    train_model()
