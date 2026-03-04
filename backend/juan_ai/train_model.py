import pandas as pd
from sklearn.model_selection import KFold
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import mean_absolute_error, mean_squared_error
import xgboost as xgb
import joblib
import numpy as np

# 1. Load the Dataset
print("📂 Loading dataset...")
try:
    df = pd.read_csv('juan_ai_dataset.csv')
    print(f"✅ Loaded {len(df)} records.")
except FileNotFoundError:
    print("❌ Error: 'juan_ai_dataset.csv' not found.")
    exit()

# 2. Preprocessing
print("⚙️ Preprocessing data...")

# Encode Gender
le = LabelEncoder()
df['gender'] = le.fit_transform(df['gender'])
joblib.dump(le, 'juan_ai_gender_encoder.pkl')

# Updated Feature List including Age Group
feature_columns = ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr']
X = df[feature_columns]
y = df['risk_score']

print(f"🔹 Features used ({len(feature_columns)}): {feature_columns}")

# Removed scaling step, XGBoost natively handles mixed ranges.
# Also passing numpy arrays directly instead of scaled arrays.
X_np = X.values
y_np = y.values

# 3. Train using K-Fold Validation
print("🧠 Training XGBoost Model with K-Fold Validation...")

kf = KFold(n_splits=5, shuffle=True, random_state=42)
rmse_scores = []
mae_scores = []

model = None # Persist the last model trained

for fold, (train_idx, test_idx) in enumerate(kf.split(X_np)):
    X_train, X_test = X_np[train_idx], X_np[test_idx]
    y_train, y_test = y_np[train_idx], y_np[test_idx]
    
    model = xgb.XGBRegressor(
        objective='reg:squarederror',
        n_estimators=500,          # More trees = finer predictions
        learning_rate=0.05,        # Lower LR = more precise learning
        max_depth=8,               # Deeper = distinguishes subtle differences (e.g. 6% vs 15%) 
        subsample=0.8,             # Prevents overfitting
        colsample_bytree=0.8,      # Prevents overfitting
        min_child_weight=3,        # Smooths out noisy predictions
        random_state=42
    )

    model.fit(X_train, y_train)

    predictions = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions)
    rmse = np.sqrt(mean_squared_error(y_test, predictions))
    
    print(f"  --> Fold {fold + 1} | MAE: {mae:.2f} | RMSE: {rmse:.2f}")
    
    mae_scores.append(mae)
    rmse_scores.append(rmse)

# 4. Evaluate Average
print("\n🔍 Final Evaluation (Average across 5 folds):")
print(f"📉 Average MAE: {np.mean(mae_scores):.2f} points (Average Error)")
print(f"📉 Average RMSE: {np.mean(rmse_scores):.2f} points")

# 5. Save
print("💾 Saving all AI assets...")
joblib.dump(model, 'juan_ai_model.pkl')
# scaler is removed

print("✅ Juan AI Brain successfully created in /backend/juan_ai/")
