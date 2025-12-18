# Training on Google Colab

Use this guide to train your YOLOv8 model on Google Colab using the Free GPU.

## Step 1: Open Google Colab
1. Go to [colab.research.google.com](https://colab.research.google.com).
2. Click **New Notebook**.
3. In the top menu, go to **Runtime** -> **Change runtime type**.
4. Select **T4 GPU** (or any available GPU) and click **Save**.

## Step 2: Copy & Paste this Code
Copy the following code blocks into cells in your Colab notebook.

### Cell 1: Install Dependencies
```python
!pip install ultralytics roboflow
```

### Cell 2: Download Dataset (Paste your Roboflow Code here)
*Go to your Roboflow project -> Export -> Select "YOLOv8" -> "Show Download Code".*
*Replace the placeholder below with that code.*

```python
from roboflow import Roboflow

# REPLACE THIS SECTION WITH YOUR ROBOFLOW CODE
rf = Roboflow(api_key="YOUR_API_KEY")
project = rf.workspace("workspace-name").project("project-name")
version = project.version(1)
dataset = version.download("yolov8")
```

### Cell 3: Train the Model
This will train the model for 100 epochs.

```python
from ultralytics import YOLO

# Load a model
model = YOLO('yolov8n.pt')  # load a pretrained model (recommended for training)

# Train the model
results = model.train(
    data=f'{dataset.location}/data.yaml', 
    epochs=100, 
    imgsz=640,
    project='/content/runs',
    name='yolov8_barefeet'
)
```

### Cell 4: Validate (Optional)
Check how well the model performs.
```python
metrics = model.val()
print(metrics.box.map)
```

### Cell 5: Download the Trained Model
This will download the `best.pt` file to your computer.

```python
from google.colab import files
import os

# Zip the results first (optional, but good for logs)
!zip -r /content/runs.zip /content/runs

# Download the specific weight file
weight_path = '/content/runs/yolov8_barefeet/weights/best.pt'

if os.path.exists(weight_path):
    print("Downloading best.pt...")
    files.download(weight_path)
else:
    print(f"File not found: {weight_path}")
```
