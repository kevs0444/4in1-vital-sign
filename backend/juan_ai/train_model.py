import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import MinMaxScaler, LabelEncoder
from sklearn.metrics import accuracy_score, classification_report
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
y = df['risk_label']

print(f"🔹 Features used ({len(feature_columns)}): {feature_columns}")

# Scale features
print("⚖️ Scaling data...")
scaler = MinMaxScaler()
X_scaled = scaler.fit_transform(X)

# Split data
X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2, random_state=42)

# 3. Train
print("🧠 Training XGBoost Model...")
model = xgb.XGBClassifier(
    objective='multi:softprob',
    num_class=5,
    n_estimators=100,
    learning_rate=0.1,
    max_depth=6, # Slightly deeper to learn age groups
    random_state=42
)

model.fit(X_train, y_train)

# 4. Evaluate
print("🔍 Evaluating Model...")
predictions = model.predict(X_test)
accuracy = accuracy_score(y_test, predictions)
print(f"🏆 Model Accuracy: {accuracy * 100:.2f}%")
print(classification_report(y_test, predictions, target_names=['Normal', 'Mild Risk', 'Moderate Risk', 'High Risk', 'Critical Risk']))

# 5. Save
print("💾 Saving all AI assets...")
joblib.dump(model, 'juan_ai_model.pkl')
joblib.dump(scaler, 'juan_ai_scaler.pkl')

print("✅ Juan AI Brain successfully created in /backend/juan_ai/")
