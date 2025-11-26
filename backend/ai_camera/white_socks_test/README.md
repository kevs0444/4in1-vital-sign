# White Socks Testing

This folder is for testing the AI model's performance on white socks specifically.

## How to use:

1. **Add Images**: Place your test images (jpg, png) of white socks in the `images` folder.
2. **Run Test**: Run the python script:
   ```bash
   python test_socks.py
   ```
3. **Check Results**: The annotated images showing what the AI detected will be saved in the `output` folder.

## Configuration

The script tries to load the model from:
1. `logs/yolov8_custom5/weights/best.pt` (Latest training)
2. `backend/ai_camera/models/best.pt` (Default fallback)

You can edit `test_socks.py` to change the `model_path` if needed.
