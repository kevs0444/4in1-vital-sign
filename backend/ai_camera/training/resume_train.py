from ultralytics import YOLO

def resume_training():
    """
    Resume training from the last checkpoint.
    This will continue from epoch 47 to epoch 100.
    """
    # Load the last checkpoint from the interrupted training
    checkpoint_path = r'C:\Users\VitalSign\Documents\4in1-vital-sign\logs\yolov8_custom5\weights\last.pt'
    
    print(f"Resuming training from checkpoint: {checkpoint_path}")
    print("This will continue from epoch 47/100 to 100/100")
    
    # Load the model from the checkpoint
    model = YOLO(checkpoint_path)
    
    # Resume training - YOLOv8 will automatically continue from where it left off
    results = model.train(
        resume=True  # This tells YOLO to resume from the checkpoint
    )
    
    print("\n" + "="*50)
    print("Training completed successfully!")
    print(f"Best model saved at: {results.save_dir}")
    print("="*50)

if __name__ == "__main__":
    resume_training()
