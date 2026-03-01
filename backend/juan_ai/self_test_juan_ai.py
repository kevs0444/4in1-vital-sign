"""
Juan AI - 100 Patient Medical-Grade Stress Test
================================================
Generates 100 random patients with known medical profiles, feeds them 
directly to the XGBoost model (no cheats, no hardcoded overrides), 
and checks if predictions match medical expectations.

Categories tested:
  A) Perfectly Healthy (all vitals normal) -> Expected: 0-19% (Low Risk)
  B) 1 Mild Abnormality                   -> Expected: 20-39% (Mild Risk)
  C) 2 Abnormalities (mixed)              -> Expected: 40-59% (Moderate Risk)
  D) 3+ Abnormalities (critical bias)     -> Expected: 60-79% (High Risk)
  E) 4+ Critical Vitals                   -> Expected: 80-100% (Critical Risk)
"""

import joblib
import pandas as pd
import random
import os

# === LOAD MODEL (RAW, NO CHEATS) ===
base_dir = os.path.dirname(os.path.abspath(__file__))
scaler = joblib.load(os.path.join(base_dir, 'juan_ai_scaler.pkl'))
model = joblib.load(os.path.join(base_dir, 'juan_ai_model.pkl'))

COLS = ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr']

def predict(age, age_group, gender, bmi, temp, spo2, hr, sys, dia, rr):
    """Pure AI prediction - no if/else, no overrides."""
    df = pd.DataFrame([[age, age_group, gender, bmi, temp, spo2, hr, sys, dia, rr]], columns=COLS)
    raw = model.predict(scaler.transform(df))[0]
    return min(100, max(0, int(round(raw))))

def tier_label(score):
    if score < 20: return "Low"
    if score < 40: return "Mild"
    if score < 60: return "Moderate"
    if score < 80: return "High"
    return "Critical"

# === VITAL GENERATORS ===
def normal_vitals():
    return {
        'bmi': round(random.uniform(18.5, 22.9), 1),
        'temp': round(random.uniform(35.5, 37.2), 1),
        'spo2': random.randint(96, 100),
        'hr': random.randint(60, 95),
        'sys': random.randint(100, 119),
        'dia': random.randint(60, 79),
        'rr': random.randint(12, 19)
    }

def mild_abnormal(v, pick):
    if pick == 'temp': v['temp'] = round(random.uniform(37.3, 38.0), 1)
    elif pick == 'hr': v['hr'] = random.randint(101, 115)
    elif pick == 'spo2': v['spo2'] = random.randint(90, 94)
    elif pick == 'bp': v['sys'] = random.randint(130, 139); v['dia'] = random.randint(80, 89)
    elif pick == 'rr': v['rr'] = random.randint(21, 24)
    elif pick == 'bmi': v['bmi'] = round(random.uniform(25.0, 29.9), 1)
    return v

def critical_abnormal(v, pick):
    if pick == 'temp': v['temp'] = round(random.uniform(38.5, 40.0), 1)
    elif pick == 'hr': v['hr'] = random.randint(125, 150)
    elif pick == 'spo2': v['spo2'] = random.randint(85, 89)
    elif pick == 'bp': v['sys'] = random.randint(160, 185); v['dia'] = random.randint(100, 120)
    elif pick == 'rr': v['rr'] = random.randint(26, 35)
    elif pick == 'bmi': v['bmi'] = round(random.uniform(32.0, 40.0), 1)
    return v

# === RUN 100 TESTS ===
print("=" * 90)
print("🏥 JUAN AI - 100 PATIENT MEDICAL-GRADE STRESS TEST")
print("   Pure XGBoost predictions only. No hardcoded overrides.")
print("=" * 90)

results = {'pass': 0, 'fail': 0}
tier_scores = {'Low': [], 'Mild': [], 'Moderate': [], 'High': [], 'Critical': []}
fails = []
vitals_list = ['temp', 'hr', 'spo2', 'bp', 'rr', 'bmi']

for i in range(100):
    age = random.randint(16, 85)
    gender = random.choice([0, 1])
    age_group = 0 if age <= 24 else 1 if age <= 39 else 2 if age <= 59 else 3
    
    # Decide patient category (20 per tier)
    if i < 20:
        # A) HEALTHY - expect Low (0-19)
        category = "Healthy"
        expected_tier = "Low"
        v = normal_vitals()
    elif i < 40:
        # B) 1 MILD ABNORMALITY - expect Mild (20-39)
        category = "1 Mild Abnml"
        expected_tier = "Mild"
        v = normal_vitals()
        pick = random.choice(vitals_list)
        v = mild_abnormal(v, pick)
    elif i < 60:
        # C) 2 ABNORMALITIES - expect Moderate (40-59)
        category = "2 Abnormals"
        expected_tier = "Moderate"
        v = normal_vitals()
        picks = random.sample(vitals_list, 2)
        for p in picks:
            v = random.choice([mild_abnormal, critical_abnormal])(v, p)
    elif i < 80:
        # D) 3 ABNORMALITIES (critical bias) - expect High (60-79)
        category = "3 Abnormals"
        expected_tier = "High"
        v = normal_vitals()
        picks = random.sample(vitals_list, 3)
        for p in picks:
            v = critical_abnormal(v, p)
    else:
        # E) 4+ CRITICAL - expect Critical (80-100)
        category = "4+ Critical"
        expected_tier = "Critical"
        v = normal_vitals()
        num = random.choice([4, 5, 6])
        picks = random.sample(vitals_list, num)
        for p in picks:
            v = critical_abnormal(v, p)
    
    score = predict(age, age_group, gender, v['bmi'], v['temp'], v['spo2'], v['hr'], v['sys'], v['dia'], v['rr'])
    actual_tier = tier_label(score)
    tier_scores[actual_tier].append(score)
    
    # Allow ±1 tier tolerance (e.g. a "Mild" patient scoring Moderate is still medically reasonable)
    tier_order = ['Low', 'Mild', 'Moderate', 'High', 'Critical']
    expected_idx = tier_order.index(expected_tier)
    actual_idx = tier_order.index(actual_tier)
    is_pass = abs(expected_idx - actual_idx) <= 1
    
    status = "✅" if is_pass else "❌"
    results['pass' if is_pass else 'fail'] += 1
    
    if not is_pass:
        fails.append(f"  #{i+1}: {category} Age {age} -> {score}% ({actual_tier}) expected {expected_tier}")
    
    print(f"{status} #{i+1:3d} | {category:14s} | Age {age:2d} | BMI {v['bmi']:5.1f} | T {v['temp']:4.1f} | SpO2 {v['spo2']:3d} | HR {v['hr']:3d} | BP {v['sys']:3d}/{v['dia']:3d} | RR {v['rr']:2d} | -> {score:3d}% {actual_tier}")

# === SUMMARY ===
print("\n" + "=" * 90)
print("📊 RESULTS SUMMARY")
print("=" * 90)
total = results['pass'] + results['fail']
accuracy = (results['pass'] / total) * 100
print(f"✅ Passed: {results['pass']}/{total}")
print(f"❌ Failed: {results['fail']}/{total}")
print(f"🎯 Accuracy: {accuracy:.1f}%")

print("\n📈 Score Distribution by Predicted Tier:")
for tier in ['Low', 'Mild', 'Moderate', 'High', 'Critical']:
    scores = tier_scores[tier]
    if scores:
        print(f"  {tier:10s}: {len(scores):3d} patients | Range: {min(scores):3d}% - {max(scores):3d}% | Avg: {sum(scores)/len(scores):.1f}%")
    else:
        print(f"  {tier:10s}:   0 patients")

if fails:
    print(f"\n⚠️ Failed Cases (off by 2+ tiers):")
    for f in fails:
        print(f)

print("\n" + "=" * 90)
if accuracy >= 90:
    print("🏆 VERDICT: MEDICAL-GRADE ACCURACY ACHIEVED!")
elif accuracy >= 75:
    print("⚠️ VERDICT: ACCEPTABLE BUT NEEDS IMPROVEMENT")
else:
    print("❌ VERDICT: MODEL NEEDS RETRAINING")
print("=" * 90)
