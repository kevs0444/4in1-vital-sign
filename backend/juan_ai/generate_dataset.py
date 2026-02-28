import csv
import random

def generate_health_data(num_samples=50000):
    """
    Generates synthetic health data for training Juan AI.
    
    STRATIFIED GENERATION: Produces ~20% per risk tier (Low, Mild, Moderate, High, Critical).
    DOCTOR-LEVEL SCORING: Proportional penalties, combinatorial risk, age-adjusted.
    RRL-ALIGNED: All thresholds match healthStatus.js (Asian BMI, AHA/PHA BP).
    """
    
    print(f"Generating {num_samples} patient records (Balanced 5-Tier + Doctor-Level Scoring)...")

    headers = ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr', 'risk_score', 'risk_label']
    
    data = []
    per_tier = num_samples // 5  # 10,000 per tier

    # ===================================================================
    # HELPER: Generate a vital sign value that is either normal or abnormal
    # ===================================================================
    def normal_bmi(): return round(random.uniform(18.5, 22.9), 1)
    def abnormal_bmi(): return round(random.choice([random.uniform(14.0, 18.4), random.uniform(23.0, 24.9), random.uniform(25.0, 40.0)]), 1)
    
    def normal_temp(): return round(random.uniform(35.0, 37.2), 1)
    def mild_temp(): return round(random.uniform(37.3, 38.0), 1)
    def critical_temp(): return round(random.uniform(38.1, 40.0), 1)
    
    def normal_hr(): return int(random.uniform(60, 100))
    def mild_hr(): return int(random.uniform(101, 120))
    def critical_hr(): return int(random.uniform(121, 150))
    
    def normal_spo2(): return int(random.uniform(95, 100))
    def mild_spo2(): return int(random.uniform(90, 94))
    def critical_spo2(): return int(random.uniform(85, 89))
    
    def normal_rr(): return int(random.uniform(12, 20))
    def mild_rr(): return int(random.uniform(21, 24))
    def critical_rr(): return int(random.uniform(25, 35))
    
    def normal_bp(): return int(random.uniform(100, 119)), int(random.uniform(60, 79))
    def mild_bp(): return int(random.uniform(120, 139)), int(random.uniform(75, 89))
    def critical_bp(): return int(random.uniform(140, 185)), int(random.uniform(90, 125))

    def lerp(value, range_start, range_end, score_start, score_end):
        if range_end == range_start: return score_end
        t = (value - range_start) / (range_end - range_start)
        t = max(0.0, min(1.0, t))
        return score_start + t * (score_end - score_start)

    def score_patient(age, age_group, bmi, temp, spo2, hr, rr, systolic, diastolic):
        """Doctor-level risk scoring engine."""
        penalties = {}

        # BMI (Asian Standard, max 18 pts)
        p = 0.0
        if bmi < 18.5: p = lerp(bmi, 18.5, 14.0, 8, 16)
        elif 23.0 <= bmi <= 24.9: p = lerp(bmi, 23.0, 24.9, 6, 12)
        elif bmi >= 25.0: p = lerp(bmi, 25.0, 40.0, 12, 18)
        penalties['bmi'] = p

        # Temperature (max 22 pts)
        p = 0.0
        if temp < 35.0: p = lerp(temp, 35.0, 33.0, 15, 22)
        elif 37.3 <= temp <= 38.0: p = lerp(temp, 37.3, 38.0, 10, 15)
        elif temp > 38.0: p = lerp(temp, 38.0, 40.0, 15, 22)
        penalties['temp'] = p

        # Heart Rate (max 22 pts)
        p = 0.0
        if hr < 60: p = lerp(hr, 60, 40, 10, 18)
        elif 101 <= hr <= 120: p = lerp(hr, 101, 120, 12, 17)
        elif hr > 120: p = lerp(hr, 120, 150, 17, 22)
        penalties['hr'] = p

        # SpO2 (max 28 pts)
        p = 0.0
        if spo2 <= 89: p = lerp(spo2, 89, 80, 20, 28)
        elif 90 <= spo2 <= 94: p = lerp(spo2, 94, 90, 10, 20)
        penalties['spo2'] = p

        # Respiratory Rate (max 18 pts)
        p = 0.0
        if rr < 12: p = lerp(rr, 12, 6, 8, 16)
        elif 21 <= rr <= 24: p = lerp(rr, 21, 24, 8, 14)
        elif rr > 24: p = lerp(rr, 24, 35, 14, 18)
        penalties['rr'] = p

        # Blood Pressure (max 24 pts)
        p = 0.0
        if systolic > 180 or diastolic > 120: p = lerp(max(systolic, diastolic), 180, 200, 18, 24)
        elif systolic >= 140 or diastolic >= 90: p = lerp(max(systolic, diastolic), 140, 180, 12, 18)
        elif (130 <= systolic <= 139) or (80 <= diastolic <= 89): p = lerp(max(systolic, diastolic), 130, 140, 8, 12)
        elif (120 <= systolic <= 129) and diastolic < 80: p = lerp(systolic, 120, 129, 4, 8)
        elif systolic < 90 or diastolic < 60: p = lerp(min(systolic, diastolic), 90, 50, 8, 20)
        penalties['bp'] = p

        base_score = sum(penalties.values())

        # Combinatorial Risk
        combo = 0.0
        abnormal_count = sum(1 for v in penalties.values() if v > 0)
        if abnormal_count >= 4: combo += 10
        elif abnormal_count == 3: combo += 5
        elif abnormal_count == 2: combo += 3

        if penalties['temp'] > 0 and penalties['hr'] > 0: combo += 4
        if penalties['spo2'] > 0 and hr > 100: combo += 6
        if penalties['spo2'] > 0 and rr > 20: combo += 5
        if penalties['bp'] > 0 and bmi >= 25: combo += 4
        if penalties['temp'] > 0 and penalties['spo2'] > 0: combo += 6
        if (systolic > 180 or diastolic > 120) and hr > 100: combo += 7

        # Age modifier
        age_mod = 0.0
        if age_group == 3:
            age_mod = lerp(age, 60, 90, 3, 10)
            if abnormal_count >= 1: age_mod += 3
        elif age_group == 2:
            if abnormal_count >= 2: age_mod = 3

        raw = base_score + combo + age_mod + random.uniform(-2.0, 2.0)
        return int(round(min(100, max(0, raw))))

    # ===================================================================
    # STRATIFIED GENERATION: Generate patients targeting each risk tier
    # ===================================================================
    # Tier 0 (Low 0-19): ALL vitals normal
    # Tier 1 (Mild 20-39): 1 vital mildly abnormal
    # Tier 2 (Moderate 40-59): 2 vitals abnormal OR 1 critical
    # Tier 3 (High 60-79): 3 vitals abnormal, mix mild+critical
    # Tier 4 (Critical 80-100): 4+ vitals critical
    # ===================================================================

    for target_tier in range(5):
        generated = 0
        attempts = 0
        max_attempts = per_tier * 20  # Safety valve

        while generated < per_tier and attempts < max_attempts:
            attempts += 1

            age = random.randint(16, 90)
            gender = random.choice(['Male', 'Female'])
            if 16 <= age <= 24: age_group = 0
            elif 25 <= age <= 39: age_group = 1
            elif 40 <= age <= 59: age_group = 2
            else: age_group = 3

            # Generate vitals based on target tier
            if target_tier == 0:  # LOW RISK: All normal
                bmi = normal_bmi()
                temp = normal_temp()
                hr = normal_hr()
                spo2 = normal_spo2()
                rr = normal_rr()
                systolic, diastolic = normal_bp()

            elif target_tier == 1:  # MILD RISK: 1 vital mildly off
                bmi = normal_bmi()
                temp = normal_temp()
                hr = normal_hr()
                spo2 = normal_spo2()
                rr = normal_rr()
                systolic, diastolic = normal_bp()

                # Pick 1 random vital to make abnormal
                pick = random.choice(['bmi', 'temp', 'hr', 'spo2', 'rr', 'bp'])
                if pick == 'bmi': bmi = abnormal_bmi()
                elif pick == 'temp': temp = mild_temp()
                elif pick == 'hr': hr = mild_hr()
                elif pick == 'spo2': spo2 = mild_spo2()
                elif pick == 'rr': rr = mild_rr()
                elif pick == 'bp': systolic, diastolic = mild_bp()

            elif target_tier == 2:  # MODERATE RISK: 2 vitals off or 1 critical
                bmi = normal_bmi()
                temp = normal_temp()
                hr = normal_hr()
                spo2 = normal_spo2()
                rr = normal_rr()
                systolic, diastolic = normal_bp()

                picks = random.sample(['bmi', 'temp', 'hr', 'spo2', 'rr', 'bp'], 2)
                for pick in picks:
                    severity = random.choice(['mild', 'critical'])
                    if pick == 'bmi': bmi = abnormal_bmi()
                    elif pick == 'temp': temp = mild_temp() if severity == 'mild' else critical_temp()
                    elif pick == 'hr': hr = mild_hr() if severity == 'mild' else critical_hr()
                    elif pick == 'spo2': spo2 = mild_spo2() if severity == 'mild' else critical_spo2()
                    elif pick == 'rr': rr = mild_rr() if severity == 'mild' else critical_rr()
                    elif pick == 'bp': systolic, diastolic = mild_bp() if severity == 'mild' else critical_bp()

            elif target_tier == 3:  # HIGH RISK: 3 vitals off
                bmi = normal_bmi()
                temp = normal_temp()
                hr = normal_hr()
                spo2 = normal_spo2()
                rr = normal_rr()
                systolic, diastolic = normal_bp()

                picks = random.sample(['bmi', 'temp', 'hr', 'spo2', 'rr', 'bp'], 3)
                for pick in picks:
                    severity = random.choice(['mild', 'critical', 'critical'])  # bias critical
                    if pick == 'bmi': bmi = abnormal_bmi()
                    elif pick == 'temp': temp = mild_temp() if severity == 'mild' else critical_temp()
                    elif pick == 'hr': hr = mild_hr() if severity == 'mild' else critical_hr()
                    elif pick == 'spo2': spo2 = mild_spo2() if severity == 'mild' else critical_spo2()
                    elif pick == 'rr': rr = mild_rr() if severity == 'mild' else critical_rr()
                    elif pick == 'bp': systolic, diastolic = mild_bp() if severity == 'mild' else critical_bp()

            else:  # CRITICAL RISK: 4+ vitals critical
                bmi = normal_bmi()
                temp = normal_temp()
                hr = normal_hr()
                spo2 = normal_spo2()
                rr = normal_rr()
                systolic, diastolic = normal_bp()

                num_bad = random.choice([4, 5, 6])
                picks = random.sample(['bmi', 'temp', 'hr', 'spo2', 'rr', 'bp'], min(num_bad, 6))
                for pick in picks:
                    if pick == 'bmi': bmi = abnormal_bmi()
                    elif pick == 'temp': temp = critical_temp()
                    elif pick == 'hr': hr = critical_hr()
                    elif pick == 'spo2': spo2 = critical_spo2()
                    elif pick == 'rr': rr = critical_rr()
                    elif pick == 'bp': systolic, diastolic = critical_bp()

            # Score the patient
            risk_score = score_patient(age, age_group, bmi, temp, spo2, hr, rr, systolic, diastolic)

            # Check if score falls in target tier range
            tier_ranges = [(0, 19), (20, 39), (40, 59), (60, 79), (80, 100)]
            low, high = tier_ranges[target_tier]

            if low <= risk_score <= high:
                # Assign label
                if risk_score < 20: risk_label = 0
                elif risk_score < 40: risk_label = 1
                elif risk_score < 60: risk_label = 2
                elif risk_score < 80: risk_label = 3
                else: risk_label = 4

                data.append([age, age_group, gender, bmi, temp, spo2, hr, systolic, diastolic, rr, risk_score, risk_label])
                generated += 1

        print(f"  Tier {target_tier} ({['Low','Mild','Moderate','High','Critical'][target_tier]}): {generated} records")

    # Shuffle so tiers aren't in order
    random.shuffle(data)

    # Save to CSV
    output_file = 'juan_ai_dataset.csv'
    try:
        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(data)
        
        print(f"✅ Successfully generated {output_file} with BALANCED 5-Tier distribution.")
    except Exception as e:
        print(f"❌ Error writing file: {e}")

if __name__ == "__main__":
    generate_health_data(50000)
