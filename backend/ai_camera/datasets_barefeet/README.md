# New Barefeet Dataset Setup

Please extract your zip file contents into this folder structure:

1. **Train Images**: Put training images in `train/images` and labels in `train/labels`
2. **Validation Images**: Put validation images in `valid/images` and labels in `valid/labels`
3. **Test Images**: Put test images in `test/images` and labels in `test/labels`

Structure should look like this:
```
datasets_barefeet/
├── train/
│   ├── images/ (put .jpg files here)
│   └── labels/ (put .txt files here)
├── valid/
│   ├── images/
│   └── labels/
└── test/
    ├── images/
    └── labels/
```

After placing the files, you can start training by running:
```bash
python backend/ai_camera/training/train_barefeet.py
```
