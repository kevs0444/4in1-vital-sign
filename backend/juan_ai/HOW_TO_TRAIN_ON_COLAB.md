# 🎓 How to Train Juan AI on Google Colab

Since we are using **XGBoost**, training on the cloud is fast and easy. Follow these steps to create your AI's "brain" files.

## 1. Setup
1. Go to [Google Colab](https://colab.research.google.com/).
2. Click **New Notebook**.
3. On the left sidebar, click the **Folder Icon (📁)** to open the file browser.
4. Click the **Upload Icon** (Paper with an Up Arrow).
5. Navigate to your project folder: `backend/juan_ai/`
6. Upload these two files:
   - `generate_dataset.py`
   - `train_model.py`

## 2. Execution
Copy and paste the following commands into the code cells in Colab and run them in order.

### Cell 1: Install Dependencies
```python
!pip install xgboost scikit-learn pandas joblib
```

### Cell 2: Generate Data
*This creates the synthetic database of 50,000 patients.*
```python
!python generate_dataset.py
```

### Cell 3: Train the Model
*This learns the patterns and creates the brain files.*
```python
!python train_model.py
```

## 3. Download Results
After the training finishes (it should take less than 1 minute), refresh the file browser on the left. You will see 3 new files:

1. `juan_ai_model.pkl` (The Brain)
2. `juan_ai_scaler.pkl` (The Translator/Scaler)
3. `juan_ai_gender_encoder.pkl` (The Gender Decoder)

**Right-click -> Download** each of these files.

## 4. Installation
Move the downloaded files into your local project folder:
`c:\Users\VitalSign\Documents\4in1-vital-sign\backend\juan_ai\`

---
**Once you have done this, your backend will automatically detect them and the "Predict Risk" feature will start working!**
