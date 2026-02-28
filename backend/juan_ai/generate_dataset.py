import csv
import random
import math

def generate_health_data(num_samples=50000):
    """
    Generates synthetic health data for training Juan AI.
    DOCTOR-LEVEL SCORING: Uses clinical reasoning with proportional penalties,
    age-adjusted thresholds, physiological correlations, and combinatorial risk.
    """
    
    print(f"Generating {num_samples} patient records (Doctor-Level Scoring)...")

    # Define headers
    # risk_score = the continuous 0-100 number the AI model trains on
    # risk_label = the category derived from risk_score (for display/reference only)
    headers = ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr', 'risk_score', 'risk_label']
    
    data = []

    for _ in range(num_samples):
        # --- DEMOGRAPHICS ---
        age = random.randint(16, 90)
        gender = random.choice(['Male', 'Female'])

        # Age Group: 0=Young Adult, 1=Adult, 2=Middle-Aged, 3=Senior
        if 16 <= age <= 24: age_group = 0
        elif 25 <= age <= 39: age_group = 1
        elif 40 <= age <= 59: age_group = 2
        else: age_group = 3 

        # --- RANDOMIZED SYMPTOM GENERATION ---
        tier = random.choices(['Healthy', 'Moderate', 'Critical'], weights=[40, 40, 20])[0]

        def get_value(normal_range, bad_range, critical_range):
            dice = random.random()
            if tier == 'Healthy':
                if dice < 0.90: return random.uniform(*normal_range)
                else: return random.uniform(*bad_range)
            elif tier == 'Moderate':
                if dice < 0.30: return random.uniform(*normal_range)
                elif dice < 0.90: return random.uniform(*bad_range)
                else: return random.uniform(*critical_range)
            else:
                if dice < 0.10: return random.uniform(*normal_range)
                elif dice < 0.40: return random.uniform(*bad_range)
                else: return random.uniform(*critical_range)

        bmi = round(get_value((18.5, 24.9), (25.0, 29.9), (30.0, 40.0)), 1)
        temp = round(get_value((36.0, 37.2), (37.3, 38.0), (38.1, 40.0)), 1)
        hr = int(get_value((60, 100), (101, 120), (121, 150)))
        
        if tier == 'Critical': spo2 = int(random.uniform(85, 92))
        elif tier == 'Moderate': spo2 = int(random.uniform(92, 96))
        else: spo2 = int(random.uniform(96, 100))

        rr = int(get_value((12, 20), (21, 24), (25, 35)))
        
        if tier == 'Healthy':
            systolic = int(random.uniform(100, 119))
            diastolic = int(random.uniform(60, 79))
        elif tier == 'Moderate':
            systolic = int(random.uniform(120, 139))
            diastolic = int(random.uniform(80, 89))
        else:
            systolic = int(random.uniform(140, 180))
            diastolic = int(random.uniform(90, 120))

        # =============================================================
        # DOCTOR-LEVEL RISK SCORING ENGINE
        # =============================================================
        # A doctor evaluates risk by:
        #   1. Individual Vital Sign Severity (how far from normal?)
        #   2. Number of Abnormal Signs (more = worse prognosis)
        #   3. Dangerous Combinations (e.g., fever + tachycardia = infection)
        #   4. Age-Adjusted Risk (seniors are more vulnerable)
        #   5. Clinical Weight (SpO2 and BP are more life-threatening than BMI)
        # =============================================================

        def lerp(value, range_start, range_end, score_start, score_end):
            """Proportional score: scales linearly from score_start to score_end."""
            if range_end == range_start: return score_end
            t = (value - range_start) / (range_end - range_start)
            t = max(0.0, min(1.0, t))
            return score_start + t * (score_end - score_start)

        # --- PHASE 1: INDIVIDUAL VITAL SIGN PENALTIES ---
        # Each vital sign gets 0 if normal, or a proportional penalty if abnormal.
        # Clinical weight: SpO2 > BP > Temp > HR > RR > BMI
        
        penalties = {}  # Track each penalty for combinatorial logic

        # BMI (max 12 pts) - Lowest clinical urgency
        bmi_penalty = 0.0
        if bmi < 18.5: bmi_penalty = lerp(bmi, 18.5, 14.0, 3, 12)
        elif 25.0 <= bmi < 30.0: bmi_penalty = lerp(bmi, 25.0, 30.0, 3, 10)
        elif bmi >= 30.0: bmi_penalty = lerp(bmi, 30.0, 40.0, 10, 12)
        penalties['bmi'] = bmi_penalty

        # Temperature (max 18 pts) - High clinical urgency
        temp_penalty = 0.0
        if 37.3 <= temp <= 38.0: temp_penalty = lerp(temp, 37.3, 38.0, 5, 12)
        elif temp > 38.0: temp_penalty = lerp(temp, 38.0, 40.0, 12, 18)
        elif temp < 35.0: temp_penalty = lerp(temp, 35.0, 33.0, 12, 18)
        penalties['temp'] = temp_penalty

        # Heart Rate (max 16 pts)
        hr_penalty = 0.0
        if hr < 60: hr_penalty = lerp(hr, 60, 40, 4, 14)
        elif 101 <= hr <= 120: hr_penalty = lerp(hr, 101, 120, 6, 12)
        elif hr > 120: hr_penalty = lerp(hr, 120, 150, 12, 16)
        penalties['hr'] = hr_penalty

        # SpO2 (max 22 pts) - HIGHEST clinical urgency (oxygen = life)
        spo2_penalty = 0.0
        if spo2 <= 89: spo2_penalty = lerp(spo2, 89, 80, 16, 22)
        elif 90 <= spo2 <= 94: spo2_penalty = lerp(spo2, 94, 90, 6, 16)
        elif spo2 == 95: spo2_penalty = 3.0  # Borderline
        penalties['spo2'] = spo2_penalty

        # Respiratory Rate (max 14 pts)
        rr_penalty = 0.0
        if rr < 12: rr_penalty = lerp(rr, 12, 6, 4, 14)
        elif 21 <= rr <= 24: rr_penalty = lerp(rr, 21, 24, 4, 10)
        elif rr > 24: rr_penalty = lerp(rr, 24, 35, 10, 14)
        penalties['rr'] = rr_penalty

        # Blood Pressure (max 20 pts) - Very high clinical urgency
        bp_penalty = 0.0
        if systolic > 180 or diastolic > 120:
            bp_penalty = lerp(max(systolic, diastolic), 180, 200, 16, 20)
        elif systolic >= 140 or diastolic >= 90:
            bp_penalty = lerp(max(systolic, diastolic), 140, 180, 10, 16)
        elif (130 <= systolic <= 139) or (80 <= diastolic <= 89):
            bp_penalty = lerp(max(systolic, diastolic), 130, 140, 5, 10)
        elif (120 <= systolic <= 129) and diastolic < 80:
            bp_penalty = lerp(systolic, 120, 129, 2, 5)
        elif systolic < 90 or diastolic < 60:
            bp_penalty = lerp(min(systolic, diastolic), 90, 50, 5, 18)
        penalties['bp'] = bp_penalty

        # Sum all individual penalties
        base_score = sum(penalties.values())

        # --- PHASE 2: COMBINATORIAL RISK (DOCTOR'S CLINICAL INTUITION) ---
        # A doctor doesn't just add up numbers; combinations matter more.
        combo_bonus = 0.0

        # Count how many vital signs are abnormal (penalty > 0)
        abnormal_count = sum(1 for v in penalties.values() if v > 0)

        # Multiple abnormal signs = exponentially worse prognosis
        if abnormal_count >= 4:
            combo_bonus += 8  # 4+ abnormal vitals = serious
        elif abnormal_count == 3:
            combo_bonus += 4  # 3 abnormal = concerning
        elif abnormal_count == 2:
            combo_bonus += 2  # 2 abnormal = notable

        # --- DANGEROUS CLINICAL COMBINATIONS ---
        
        # Fever + Tachycardia = Possible Infection / Sepsis
        if temp_penalty > 0 and hr_penalty > 0:
            combo_bonus += 3

        # Low SpO2 + High HR = Respiratory Distress (EMERGENCY)
        if spo2_penalty > 0 and hr > 100:
            combo_bonus += 5

        # Low SpO2 + High RR = Body struggling to breathe (EMERGENCY)
        if spo2_penalty > 0 and rr > 20:
            combo_bonus += 4

        # High BP + Obesity = Cardiovascular Risk
        if bp_penalty > 0 and bmi >= 30:
            combo_bonus += 3

        # Fever + Low SpO2 = Possible Pneumonia / Severe Infection
        if temp_penalty > 0 and spo2_penalty > 0:
            combo_bonus += 5

        # Hypertension Crisis + Tachycardia = Cardiac Emergency
        if (systolic > 180 or diastolic > 120) and hr > 100:
            combo_bonus += 6

        # --- PHASE 3: AGE-ADJUSTED RISK ---
        # Seniors are more vulnerable; same vitals = higher risk
        age_modifier = 0.0
        if age_group == 3:  # Senior (60+)
            age_modifier = lerp(age, 60, 90, 3, 10)
            # If senior has ANY abnormal vital, extra concern
            if abnormal_count >= 1:
                age_modifier += 2
        elif age_group == 2:  # Middle-Aged (40-59)
            if abnormal_count >= 2:
                age_modifier = 2  # Slight bump for middle-aged with multiple issues

        # --- PHASE 4: FINAL SCORE ---
        raw_score = base_score + combo_bonus + age_modifier

        # Add slight natural variation (like different doctor opinions, +/- 2 pts)
        noise = random.uniform(-2.0, 2.0)
        raw_score += noise

        total_risk_score = round(min(100, max(0, raw_score)), 1)
        
        # risk_label: Derived from risk_score for display/categorization
        if total_risk_score < 20: 
            risk_label = 0 # Low Risk
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
        
        print(f"✅ Successfully generated {output_file} with Doctor-Level scoring.")
    except Exception as e:
        print(f"❌ Error writing file: {e}")

if __name__ == "__main__":
    generate_health_data(50000)
