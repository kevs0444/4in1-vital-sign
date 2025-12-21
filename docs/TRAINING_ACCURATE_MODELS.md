# achieving High Accuracy with YOLO11 on Google Colab

Since you need **"No Room for Error"**, follow this guide to train a model that is significantly more accurate than the standard version.

## 1. The Strategy: "Bigger is Smarter"
Standard tutorials use `yolo11n` (Nano). It is fast but can make mistakes.
**For your thesis/production use, use `yolo11s` (Small) or `yolo11m` (Medium).**
*   **Nano (n)**: ~3M parameters (Good for Raspberry Pi, but less accurate)
*   **Small (s)**: ~10M parameters (Best balance for Laptops/PC)
*   **Medium (m)**: ~25M parameters (Very smart, requires GPU like NVIDIA RTX)

**Recommendation:** Train the **Small (s)** version. It is 3x smarter than Nano but still runs fast on your laptop.

## 2. Dataset Preparation
**Crucial:** 80% of accuracy comes from data.
1.  Use your **Admin Dashboard > Maintenance** page.
2.  Capture **50+ images** of "hard" cases:
    *   Socks that look like skin color.
    *   ID laces hidden against similar colored shirts.
    *   Watches from the side/back.
3.  Upload this new data to Roboflow and add it to your dataset.

## 3. Google Colab Training Script
Copy-paste this into your Google Colab cell. This works for both your **Wearables** and **Feet** models.

```python
# 1. Install latest Ultralytics (Supports YOLO11)
%pip install ultralytics

# 2. Imports
from ultralytics import YOLO

# 3. Train the "Small" model (Much better accuracy than Nano)
# Change 'yolo11s.pt' to 'yolo11m.pt' if you want even more accuracy (slower)
model = YOLO('yolo11s.pt') 

# 4. Run Training
# data: Link to your Roboflow dataset (copy from Roboflow "Export > YOLOv8")
# epochs: 100 (Required for high accuracy)
# imgsz: 640 (Standard)
results = model.train(
    data='YOUR_ROBOFLOW_DATASET_URL/data.yaml', 
    epochs=100, 
    imgsz=640,
    plots=True,
    name='vital_sign_accurate_model'
)
```

## 4. Deployment
1.  Download the `.pt` file from Colab: `runs/detect/vital_sign_accurate_model/weights/best.pt`.
2.  Rename it:
    *   For Body: `wearables_accurate.pt`
    *   For Feet: `weight_accurate.pt`
3.  Place it in: `backend/ai_camera/models/`.
4.  Update the filenames in `backend/ai_camera/detection/dual_camera_detect.py`.
