# Blood Pressure Camera AI Training Guide (Google Colab)

Since you have decided to train the model on Google Colab, here is a step-by-step guide to setting up the environment, training the YOLO11 model, and exporting it for use in your local application.

## Step 1: Set up Google Colab
1. Go to [Google Colab](https://colab.research.google.com/).
2. Create a **New Notebook**.
3. Go to **Runtime** > **Change runtime type**.
4. Select **T4 GPU** (or any available GPU) under "Hardware accelerator".
5. Click **Save**.

## Step 2: Install Dependencies
In the first code cell, copy and run the following to install `ultralytics` (for YOLO11) and `roboflow`.

```python
!pip install ultralytics roboflow
```

## Step 3: Download Your Dataset
Use the code you provided to download the dataset directly into the Colab environment.

```python
from roboflow import Roboflow

rf = Roboflow(api_key="qX4VJda9s5sBtJJozY0y")
project = rf.workspace("ai-object-and-human-detection").project("blood-pressure-ruwdq")
version = project.version(3)
dataset = version.download("yolov11")
```

## Step 4: Train the YOLO11 Model
Run the training command. We use the `yolo11n.pt` (nano) model for speed and efficiency, which is suitable for edge devices or CPU inference if needed later. You can also try `yolo11s.pt` (small) for better accuracy.

```python
from ultralytics import YOLO

# Load a pretrained YOLO11n model
model = YOLO("yolo11n.pt") 

# Train the model
# The dataset location usually defaults to the folder name downloaded by Roboflow.
# Check the folder name in the files tab on the left (e.g., "blood-pressure-ruwdq-3").
# Update 'data=' path below if necessary.
results = model.train(
    data="/content/blood-pressure-ruwdq-3/data.yaml", 
    epochs=100, 
    imgsz=480, # Set to 480 to match your camera resolution
    device=0  # Use GPU
)
```

## Step 5: Validate and Export
After training, validate the model and export it to a format usable by your local Python backend (usually `.pt` is fine for `ultralytics`, or `onnx` for broader compatibility).

```python
# Validate logic
metrics = model.val()

# Export (Optional, usually best.pt is automatically saved)
# model.export(format="onnx")
```

## Step 6: Download the Trained Model
The trained model weights will be saved in the `runs/detect/train/weights/` directory.

```python
from google.colab import files

# Download the best performing model
files.download('/content/runs/detect/train/weights/best.pt')
```

## Step 7: Integrate with Local Backend
Once you have `best.pt`:
1.  Rename it to something descriptive, e.g., `bp_reading_v1.pt`.
2.  Move it to your local backend folder: `c:\Users\VitalSign\Documents\4in1-vital-sign\backend\ai_camera\models\`.
3.  Update your backend code to load this specific model.

### Example Backend Integration:
```python
from ultralytics import YOLO

# Load your custom trained model
model = YOLO("ai_camera/models/bp_reading_v1.pt")

# Run inference
results = model("path/to/image.jpg")
```
