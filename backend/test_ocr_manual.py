import cv2
import easyocr
import numpy as np
from ultralytics import YOLO
import os

# Path to image and model
image_path = r"C:/Users/VitalSign/.gemini/antigravity/brain/a79597ed-f390-4792-a7db-f3569bee0cbb/uploaded_image_1766413415217.jpg"
model_path = r"c:\Users\VitalSign\Documents\4in1-vital-sign\backend\ai_camera\models\yolo11n.pt"

def test_bp_reading():
    print(f"Testing on image: {image_path}")
    
    # 1. Load Image
    img = cv2.imread(image_path)
    if img is None:
        print("Failed to load image")
        return

    # 2. Load Models
    print("Loading YOLO...")
    yolo_model = YOLO(model_path)
    print("Loading EasyOCR...")
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)

    # 3. YOLO Detection
    print("Running YOLO detection...")
    # Classes: 62: TV, 63: Laptop, 67: Cell phone, 72: Refrigerator, 73: Clock
    results_yolo = yolo_model(img, classes=[62, 63, 67, 72, 73], conf=0.10, verbose=False) # lowered conf for test
    
    target_crop = img
    
    if results_yolo and len(results_yolo[0].boxes) > 0:
        best_box = None
        max_area = 0
        for box in results_yolo[0].boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            area = (x2 - x1) * (y2 - y1)
            if area > max_area:
                max_area = area
                best_box = (x1, y1, x2, y2)
        
        if best_box:
            x1, y1, x2, y2 = best_box
            print(f"✅ Object detected: {x1},{y1} - {x2},{y2}")
            # Padding
            pad = 10
            h, w = img.shape[:2]
            x1 = max(0, x1 - pad); y1 = max(0, y1 - pad)
            x2 = min(w, x2 + pad); y2 = min(h, y2 + pad)
            target_crop = img[y1:y2, x1:x2]
            
            # Save crop for debugging check
            cv2.imwrite("debug_crop.jpg", target_crop)
    else:
        print("⚠️ No Object Detected by YOLO. Using full image.")

    # 4. Preprocessing
    print("Preprocessing...")
    gray = cv2.cvtColor(target_crop, cv2.COLOR_BGR2GRAY)
    
    # Resize logic (150%)
    scale_percent = 150 
    width = int(gray.shape[1] * scale_percent / 100)
    height = int(gray.shape[0] * scale_percent / 100)
    gray = cv2.resize(gray, (width, height), interpolation = cv2.INTER_AREA)
    
    # Blur
    # gray = cv2.GaussianBlur(gray, (3, 3), 0) # Reduced blur slightly

    # Thresholding
    # Try Adaptive
    thresh = cv2.adaptiveThreshold(gray, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                                   cv2.THRESH_BINARY_INV, 15, 4) # Tweak constants for LCD
    
    # Save processed for debugging
    cv2.imwrite("debug_thresh.jpg", thresh)

    # 5. EasyOCR
    print("Running EasyOCR...")
    results = reader.readtext(thresh, allowlist='0123456789', decoder='beamsearch', beamWidth=5)
    print(f"Raw Results: {results}")

    # 6. Parse
    found_numbers = []
    for (bbox, text, prob) in results:
        if prob > 0.3:
            clean = ''.join(filter(str.isdigit, text))
            if clean:
                val = int(clean)
                found_numbers.append((val, prob))
    
    found_numbers.sort(key=lambda x: x[0], reverse=True)
    print(f"Parsed Numbers: {found_numbers}")
    
    sys = 0
    dia = 0
    
    sys_cands = [n for n in found_numbers if 90 <= n[0] <= 220]
    if sys_cands: sys = sys_cands[0][0]
    
    dia_cands = [n for n in found_numbers if 50 <= n[0] <= 120]
    if sys > 0:
        dia_cands = [n for n in dia_cands if n[0] < sys]
    if dia_cands: dia = dia_cands[0][0]
    
    print(f"RESULT -> SYS: {sys}, DIA: {dia}")

if __name__ == "__main__":
    test_bp_reading()
