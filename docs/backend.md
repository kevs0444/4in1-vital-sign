# Backend & AI Documentation

## 1. Backend Overview

This system uses a Flask backend to manage user authentication, data storage, and AI processing.

### Directory Structure
- `backend/app/`: Core application logic (routes, models).
- `backend/ai_camera/`: AI detection logic (YOLOv8/v11).
- `backend/run.py`: Entry point.

## 2. Backend Fixes & Improvements (Dec 2025)

### Logging & Debugging
*   **Full Visibility:** Backend logging is set to `INFO` level for `werkzeug`.
*   **What you see:** HTTP requests, custom print statements with emojis, database operations, and error traces.
*   **Modified Files:** `backend/run.py` and `backend/app/__init__.py`.

### Forgot Password Flow (Fixed)
**Issue:** A schema mismatch in `verification_codes` table (missing `code_id`) caused internal server errors.
**Fix Implemented:**
1.  **Schema Update:** `verification_codes` table now includes `code_id` (VARCHAR) as Primary Key.
2.  **Fix Script:** `backend/fix_verification_table.py` was created to drop and recreate the table with the correct schema.
3.  **OTP Logic:**
    *   **Cleanup:** Old OTPs are deleted before generating a new one to prevent conflicts.
    *   **Expiration:** OTPs expire in 10 minutes.
    *   **One-Time Use:** OTPs are marked `is_used` after reset and then cleaned up.
    *   **Security:** Passwords are hashed before storage.

## 3. AI Camera System (YOLOv11)

### Overview
This module implements object and person detection using YOLOv8/YOLOv11 with support for dual webcam feeds.
- `gui/`: Tkinter-based GUI for viewing camera feeds.
- `detection/`: Backend logic for inference.
- `models/`: Stores `.pt` model weights.

### Strategy: "Bigger is Smarter"
For high accuracy ("No Room for Error"), use **YOLO11 Small (`yolo11s`)** or **Medium (`yolo11m`)** instead of Nano.
*   **Nano (n)**: ~3M params (Fast, less accurate)
*   **Small (s)**: ~10M params (Recommended balance)
*   **Medium (m)**: ~25M params (High accuracy, requires GPU)

### Training Weight Compliance Model
**Goal:** Detect Feet, Socks, Shoes.
1.  **Export Dataset:** From Roboflow, export as **YOLOv11**.
2.  **Train on Colab:**
    *   Runtime: T4 GPU
    *   Base Model: `yolo11n.pt` (for speed) or `yolo11s.pt` (for accuracy)
    *   Epochs: 100
3.  **Deployment:**
    *   Download best model.
    *   Rename to `weight.pt`.
    *   Place in `backend/ai_camera/models/`.

### Training Accurate Models ("Wearables")
**Goal:** Detect "hard" cases like skin-colored socks, ID laces, watches.
1.  **Data Collection:** Capture 50+ images of hard cases using **Admin > Maintenance**.
2.  **Train on Colab:**
    *   Base Model: `yolo11s.pt` (Small) is recommended.
    *   Epochs: 100
    *   Plots: True
3.  **Deployment:**
    *   Rename to `wearables_accurate.pt` (or `wearables.pt`).
    *   Place in `backend/ai_camera/models/`.
    *   Update `backend/ai_camera/detection/dual_camera_detect.py` to use the new filename.

### Dual Camera Setup
- **Camera 1 (Body):** Vertical flip may be applied.
- **Camera 2 (Feet):** 1.3x zoom and square crop.
- **Running:** `python backend/ai_camera/gui/dual_camera_gui.py`
