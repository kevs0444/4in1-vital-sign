import csv
import random
import sys

def generate_health_data(num_samples=50000):
    """
    Generates synthetic health data for training Juan AI.
    FIXED: Ensures better distribution of 'Moderate Risk' (Class 1) patients.
    """
    
    print(f"Generating {num_samples} patient records (Balanced Distribution)...")

    # Define headers
    headers = ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr', 'risk_score', 'risk_label']
    
    data = []

    for _ in range(num_samples):
        # Age & Gender
        age = random.randint(18, 90)
        gender = random.choice(['Male', 'Female'])

        # Age Group
        if 18 <= age <= 24: age_group = 0
        elif 25 <= age <= 39: age_group = 1
        elif 40 <= age <= 59: age_group = 2
        else: age_group = 3 

        # --- RANDOMIZED SYMPTOM GENERATION ---
        # Instead of fixed profiles, we roll dice for each symptom mostly independent
        # This creates the "Mix and Match" causing Moderate Risk
        
        # 0 = Good, 1 = Bad, 2 = Critical (Weighted Layout)
        # We allow a mix: e.g. Good BMI but Bad Temp
        
        # Base Health Tier (determines probability of other bad things)
        tier = random.choices(['Healthy', 'Moderate', 'Critical'], weights=[40, 40, 20])[0]

        def get_value(normal_range, bad_range, critical_range):
            dice = random.random()
            if tier == 'Healthy':
                # 90% chance normal, 10% slight issue
                if dice < 0.90: return random.uniform(*normal_range)
                else: return random.uniform(*bad_range)
            elif tier == 'Moderate':
                # 30% normal, 60% bad, 10% critical
                if dice < 0.30: return random.uniform(*normal_range)
                elif dice < 0.90: return random.uniform(*bad_range)
                else: return random.uniform(*critical_range)
            else: # Critical
                # 10% normal, 30% bad, 60% critical
                if dice < 0.10: return random.uniform(*normal_range)
                elif dice < 0.40: return random.uniform(*bad_range)
                else: return random.uniform(*critical_range)

        # BMI
        bmi = round(get_value((18.5, 24.9), (25.0, 29.9), (30.0, 40.0)), 1)
        
        # Temp
        temp = round(get_value((36.0, 37.2), (37.3, 38.0), (38.1, 40.0)), 1)
        
        # HR
        hr = int(get_value((60, 100), (101, 120), (121, 150)))
        
        # SpO2 (Bias towards higher values as low is rare/critical)
        if tier == 'Critical':
             spo2 = int(random.uniform(85, 92))
        elif tier == 'Moderate':
             spo2 = int(random.uniform(92, 96))
        else:
             spo2 = int(random.uniform(96, 100))

        # RR
        rr = int(get_value((12, 20), (21, 24), (25, 35)))
        
        # BP (Sys/Dia)
        # Simplified: correlated roughly with tier but randomized
        if tier == 'Healthy':
            systolic = int(random.uniform(100, 119))
            diastolic = int(random.uniform(60, 79))
        elif tier == 'Moderate':
            systolic = int(random.uniform(120, 139))
            diastolic = int(random.uniform(80, 89))
        else:
            systolic = int(random.uniform(140, 170))
            diastolic = int(random.uniform(90, 110))

        # --- CALCULATE RISK SCORE ---
        current_risk_score = 0
        
        if bmi < 18.5: current_risk_score += 15 # Underweight
        elif 25.0 <= bmi <= 29.9: current_risk_score += 15 # Overweight
        elif bmi >= 30.0: current_risk_score += 40 # Obese (Critical)

        if 37.3 <= temp <= 38.0: current_risk_score += 15 # Slight Fever
        elif temp > 38.0: current_risk_score += 40 # Critical
        elif temp < 35.0: current_risk_score += 40 # Low/Hypothermia (Implicit Critical)

        if hr < 60: current_risk_score += 15 # Low
        elif 101 <= hr <= 120: current_risk_score += 15 # Elevated
        elif hr > 120: current_risk_score += 40 # Critical

        if spo2 <= 89: current_risk_score += 40 # Critical
        elif 90 <= spo2 <= 94: current_risk_score += 15 # Low/Warning

        if rr < 12: current_risk_score += 15 # Low
        elif 21 <= rr <= 24: current_risk_score += 15 # Elevated
        elif rr > 24: current_risk_score += 40 # Critical

        # BP Logic based on Image Categories & User Scores
        # Normal: Sys < 120 AND Dia < 80
        # Elevated: Sys 120-129 AND Dia < 80 -> Score 15
        # Stage 1: Sys 130-139 OR Dia 80-89 -> Score 20
        # Stage 2: Sys >= 140 OR Dia >= 90 -> Score 30
        # Crisis: Sys > 180 OR Dia > 120 -> Score 40 (User specified Critical/Crisis = 40)
        
        bp_score = 0
        if systolic > 180 or diastolic > 120: bp_score = 40 # Crisis
        elif systolic >= 140 or diastolic >= 90: bp_score = 30 # Stage 2
        elif (130 <= systolic <= 139) or (80 <= diastolic <= 89): bp_score = 20 # Stage 1
        elif (120 <= systolic <= 129) and diastolic < 80: bp_score = 15 # Elevated
        elif systolic < 90 and diastolic < 60: bp_score = 15 # Hypotension (Low)
        
        current_risk_score += bp_score

        if age_group == 3: # Senior penalty
            current_risk_score += 5
            if current_risk_score > 20: current_risk_score += 5

        total_risk_score = min(100, current_risk_score)
        
        # Labeling - MORE SPECIFIC (5 Tiers)
        if total_risk_score < 20: 
            risk_label = 0 # Normal
        elif total_risk_score < 40: 
            risk_label = 1 # Mild Risk
        elif total_risk_score < 60: 
            risk_label = 2 # Moderate Risk
        elif total_risk_score < 80: 
            risk_label = 3 # High Risk
        else: 
            risk_label = 4 # Critical Risk

        data.append([
            age, age_group, gender, bmi, temp, spo2, hr, systolic, diastolic, rr, total_risk_score, risk_label
        ])

    # Save to CSV
    output_file = 'juan_ai_dataset.csv'
    try:
        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(data)
        
        print(f"✅ Successfully generated {output_file} with BALANCED distribution.")
    except Exception as e:
        print(f"❌ Error writing file: {e}")

if __name__ == "__main__":
    generate_health_data(50000)
