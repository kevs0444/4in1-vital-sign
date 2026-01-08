# BP AI Model Training Guide

This guide details how to prepare your dataset in Roboflow and train the model using Google Colab.

## 1. Roboflow Dataset Preparation

### Preprocessing Steps
Preprocessing ensures all images are standardized before they enter the training pipeline.
*   **Auto-Orient:** `On` (Corrects EXIF orientation)
*   **Resize:** `Stretch to 640x640` (Standard input size for YOLOv8/v11)

### Augmentation Steps
Augmentation creates variations of your images to make the model robust against different lighting, angles, and camera qualities.

> [!WARNING]
> **DO NOT USE FLIP (Horizontal or Vertical).**
> Since we are reading text/numbers, flipping the image will make the numbers backwards and confuse the model.

**Recommended Settings for BP Monitor Screens:**

1.  **Outputs per training example:** `3` (Generates 3x more images)
2.  **Rotation:** `Between -15° and +15°`
    *   *Why:* Handles slight camera misalignments.
3.  **Shear:** `±10° Horizontal, ±10° Vertical`
    *   *Why:* Helps if the camera isn't perfectly perpendicular to the screen.
4.  **Brightness:** `Between -25% and +25%`
    *   *Why:* CRITICAL. Simulates different room lighting conditions (dim vs bright).
5.  **Exposure:** `Between -15% and +15%`
    *   *Why:* Screens emit light! This helps the model handle overexposed (blown out) or underexposed screens.
6.  **Blur:** `Up to 2px`
    *   *Why:* Simulates an out-of-focus camera.
7.  **Noise:** `Up to 5%`
    *   *Why:* Simulates sensor noise (grainy footage) common in cheap cameras or low light.

### Exporting
1.  Click **Generate** to create the dataset version.
2.  Click **Export Dataset**.
3.  Select Format: **YOLOv11** (or YOLOv8, they are compatible).
4.  Select **"Show download code"**.
5.  **Copy the code snippet.** It will look like this:
    ```python
    from roboflow import Roboflow
    rf = Roboflow(api_key="YOUR_API_KEY")
    project = rf.workspace("...").project("...")
    version = project.version(1)
    dataset = version.download("yolov11")
    ```
    *Keep this code safe, you will paste it into Google Colab.*

---

## 2. Training on Google Colab

We have prepared a ready-to-use notebook for you.

1.  **Download the Notebook:**
    *   Locate `backend/ai_models/bp_training.ipynb` in your project.
    *   Upload this file to [Google Colab](https://colab.research.google.com/).

2.  **Configure the Notebook:**
    *   **Runtime:** Go to `Runtime` > `Change runtime type` > Select **T4 GPU**.
    *   **Data:** Paste your Roboflow export code into the designated cell.

3.  **Run Training:**
    *   Execute the steps. The training command uses the `yolo` CLI:
        ```bash
        yolo task=detect mode=train model=yolo11n.pt data={dataset.location}/data.yaml epochs=100 imgsz=640 plots=True
        ```

4.  **Download Weights:**
    *   After training, the best model will be saved at `runs/detect/train/weights/best.pt`.
    *   Download this file.

---

## 3. Deployment

1.  Rename the downloaded file to `bp_model_v2.pt` (or similar).
2.  Place it in `backend/juan_ai/` or `backend/ai_models/`.
3.  Update your backend code to load this new model path.
