import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
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

# Scale features
print("⚖️ Scaling data...")
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# 3. Train
print("🧠 Training XGBoost Model...")
model = xgb.XGBRegressor(
    objective='reg:squarederror',
    n_estimators=500,          # More trees = finer predictions
    learning_rate=0.05,        # Lower LR = more precise learning
    max_depth=8,               # Deeper = distinguishes subtle differences (e.g. 6% vs 15%) 
    subsample=0.8,             # Prevents overfitting
    colsample_bytree=0.8,     # Prevents overfitting
    min_child_weight=3,        # Smooths out noisy predictions
    random_state=42
)

model.fit(X_train, y_train)

# 4. Evaluate
print("🔍 Evaluating Model...")
predictions = model.predict(X_test)
mae = mean_absolute_error(y_test, predictions)
rmse = np.sqrt(mean_squared_error(y_test, predictions))
print(f"📉 Model MAE: {mae:.2f} points (Average Error)")
print(f"📉 Model RMSE: {rmse:.2f} points")

# 5. Save
print("💾 Saving all AI assets...")
joblib.dump(model, 'juan_ai_model.pkl')
joblib.dump(scaler, 'juan_ai_scaler.pkl')

print("✅ Juan AI Brain successfully created in /backend/juan_ai/")
