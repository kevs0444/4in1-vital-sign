# Training Weight Compliance Model (YOLO11) on Google Colab

Follow this guide to train your **Weight Compliance (Feet/Socks/Shoes)** model using the latest **YOLOv11** architecture. This will give you faster FPS and better accuracy on your Mini PC.

## Step 1: Export Dataset from Roboflow
1.  Login to your **Roboflow** account.
2.  Open your **Weight Compliance** project.
3.  Click **"Generate"** (if a version isn't generated yet) or **"Versions"**.
4.  Click **"Export Dataset"**.
5.  Select Format: **YOLOv11** (or YOLOv8 if v11 isn't listed, both work).
6.  Select **"Show Download Code"**.
7.  **COPY** the Python code snippet provided. It looks like this:
    ```python
    from roboflow import Roboflow
    rf = Roboflow(api_key="bX....")
    project = rf.workspace("...").project("...")
    dataset = project.version(1).download("yolov11")
    ```

## Step 2: Open Google Colab
1.  Go to [Google Colab](https://colab.research.google.com/).
2.  Click **New Notebook**.
3.  Go to the menu **Runtime > Change runtime type**.
4.  Select **T4 GPU** (Hardware accelerator) and click **Save**.

## Step 3: Run Training Script (Copy & Paste)
Copy the code below into a cell in Colab and run it. **Replace the `PASTE_ROBOFLOW_CODE_HERE` section with the code you copied in Step 1.**

```python
# --- CELL 1: SETUP & INSTALL ---
%pip install ultralytics roboflow

import os
from ultralytics import YOLO
from roboflow import Roboflow

print("Installation Complete. Ready to download data.")
```

```python
# --- CELL 2: DOWNLOAD DATASET ---
# !!! PASTE YOUR ROBOFLOW CODE BELOW THIS LINE !!!
# Example:
# rf = Roboflow(api_key="...")
# project = rf.workspace("...").project("...")
# dataset = project.version(1).download("yolov11")

# ... Paste here ...

# Keep track of where dataset is saved
import yaml
if 'dataset' in locals():
    print(f"Dataset downloaded to: {dataset.location}")
    data_yaml_path = f"{dataset.location}/data.yaml"
else:
    print("ERROR: You did not paste the Roboflow code!")
```

```python
# --- CELL 3: TRAIN YOLOv11 NANO ---
# We use 'yolo11n.pt' for maximum FPS on your Mini PC.
# If you want slightly more accuracy but slower speed, change to 'yolo11s.pt'

model = YOLO('yolo11n.pt') 

# Train
results = model.train(
    data=data_yaml_path, 
    epochs=100,           # 100 epochs ensures solid learning
    imgsz=640,           # Standard resolution
    batch=16,            # Good for Colab GPU
    name='weight_compliance_v11',
    plots=True
)
```

```python
# --- CELL 4: DOWNLOAD MODEL ---
# This zips the best model so you can download it to your PC

!zip -r /content/weight_model.zip /content/runs/detect/weight_compliance_v11/weights/best.pt

from google.colab import files
files.download("/content/weight_model.zip")
```

## Step 4: Install in Your Backend
1.  Extract the zip file.
2.  Rename `best.pt` to **`weight.pt`**.
3.  Copy `weight.pt` into your project folder: `backend/ai_camera/models/`.
4.  Restart the backend server.
