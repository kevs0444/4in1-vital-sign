import os
import cv2
from ultralytics import YOLO
import glob

def test_white_socks():
    # Paths
    base_dir = os.path.dirname(os.path.abspath(__file__))
    images_dir = os.path.join(base_dir, 'images')
    output_dir = os.path.join(base_dir, 'output')
    
    # Model Path - trying the latest training run first, then falling back to default
    # Adjust this path if you want to test a specific model checkpoint
    model_path = r'C:\Users\VitalSign\Documents\4in1-vital-sign\logs\yolov8_custom5\weights\best.pt'
    
    if not os.path.exists(model_path):
        print(f"Model not found at {model_path}, trying default...")
        model_path = r'C:\Users\VitalSign\Documents\4in1-vital-sign\backend\ai_camera\models\best.pt'
    
    if not os.path.exists(model_path):
        print("No model found! Please check paths.")
        return

    print(f"Loading model: {model_path}")
    model = YOLO(model_path)
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    # Get all images
    image_extensions = ['*.jpg', '*.jpeg', '*.png', '*.bmp']
    image_files = []
    for ext in image_extensions:
        image_files.extend(glob.glob(os.path.join(images_dir, ext)))
    
    print(f"Found {len(image_files)} images in {images_dir}")
    
    for img_path in image_files:
        filename = os.path.basename(img_path)
        print(f"Processing {filename}...")
        
        # Run inference
        # conf=0.25 is default, lowering it might help see weak detections
        results = model(img_path, conf=0.25)
        
        # Visualize
        for r in results:
            im_array = r.plot()  # plot a BGR numpy array of predictions
            
            # Save result
            save_path = os.path.join(output_dir, f"result_{filename}")
            cv2.imwrite(save_path, im_array)
            
            # Print detections
            for box in r.boxes:
                cls_id = int(box.cls[0])
                cls_name = model.names[cls_id]
                conf = float(box.conf[0])
                print(f"  Detected: {cls_name} ({conf:.2f})")

    print("\nProcessing complete. Check 'output' folder for results.")

if __name__ == "__main__":
    test_white_socks()
