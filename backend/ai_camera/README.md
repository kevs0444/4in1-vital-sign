# AI Camera - YOLOv8 Dual Camera Detection

This module implements object and person detection using YOLOv8 with support for dual webcam feeds.

## Structure
- `gui/`: Tkinter-based GUI for viewing camera feeds.
- `detection/`: Backend logic for YOLOv8 inference.
- `training/`: Scripts and config for training custom YOLOv8 models.
- `models/`: Store your `.pt` model weights here.
- `datasets/`: Store training datasets here.

## Setup
1. Install requirements:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the GUI:
   ```bash
   python gui/dual_camera_gui.py
   ```
