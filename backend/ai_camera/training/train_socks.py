from ultralytics import YOLO

def train_socks_model():
    # Load a model
    model = YOLO('yolov8n.pt')  # load a pretrained model (recommended for training)

    # Train the model
    results = model.train(
        data=r'C:\Users\VitalSign\Documents\4in1-vital-sign\backend\ai_camera\training\socks_config.yaml',
        epochs=100,
        imgsz=640,
        device='cpu', # Use '0' for GPU if available
        project='logs',
        name='yolov8_socks'
    )
    
    print("Training completed.")
    print(f"Best model saved at: {results.save_dir}")

if __name__ == "__main__":
    train_socks_model()
