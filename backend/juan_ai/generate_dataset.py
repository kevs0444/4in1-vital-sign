import csv
import random
import numpy as np

def generate_health_data(num_samples=50000):
    """
    Generates synthetic health data for training Juan AI.
    
    SCORE-LEVEL BALANCED GENERATION:
      - Targets every integer score from 0 to 100 (~495 samples each).
      - Ensures the model can predict ANY score, not just tier averages.
    DOCTOR-LEVEL SCORING: Proportional penalties, combinatorial risk, age-adjusted.
    RRL-ALIGNED: All thresholds match healthStatus.js (Asian BMI, AHA/PHA BP).
    """
    
    print(f"Generating {num_samples} patient records (Score-Level Balanced 0-100)...")

    headers = ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr', 'risk_score']
    
    data = []
    per_score = num_samples // 101  # ~495 per score value

    # ===================================================================
    # HELPER: Generate vital sign values at different severity levels
    # ===================================================================
    def get_val_or_nan(val, chance=0.2):
        return np.nan if random.random() < chance else val
    
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
    
    def normal_bp():        return int(random.uniform(100, 119)), int(random.uniform(60, 79))   # Normal: <120 / <80
    def elevated_bp():      return int(random.uniform(120, 129)), int(random.uniform(60, 79))   # Elevated: 120-129 / <80
    def stage1_sys_bp():    return int(random.uniform(130, 139)), int(random.uniform(60, 79))   # Stage 1 sys only
    def stage1_dia_bp():    return int(random.uniform(90, 119)),  int(random.uniform(80, 89))   # Stage 1 dia only (e.g. 102/87)
    def stage1_both_bp():   return int(random.uniform(130, 139)), int(random.uniform(80, 89))   # Stage 1 both
    def stage2_bp():        return int(random.uniform(140, 179)), int(random.uniform(90, 119))   # Stage 2: >=140 / >=90
    def crisis_bp():        return int(random.uniform(181, 200)), int(random.uniform(121, 140))  # Crisis: >180 / >120
    def hypotension_bp():   return int(random.uniform(60, 89)),   int(random.uniform(40, 59))   # Low: <90 / <60
    
    # Randomly pick a mild BP pattern (includes isolated systolic OR diastolic elevation)
    def mild_bp():
        return random.choice([elevated_bp, stage1_sys_bp, stage1_dia_bp, stage1_both_bp])()
    # Randomly pick a critical BP pattern
    def critical_bp():
        return random.choice([stage2_bp, crisis_bp])()

    def lerp(value, range_start, range_end, score_start, score_end):
        if range_end == range_start: return score_end
        t = (value - range_start) / (range_end - range_start)
        t = max(0.0, min(1.0, t))
        return score_start + t * (score_end - score_start)

    def score_patient(age, age_group, bmi, temp, spo2, hr, rr, systolic, diastolic):
        """
        Weighted Risk Scoring Engine (aligned with healthStatus.js categories).
        
        Each vital sign is scored on a 0-100% severity scale, then multiplied by its
        clinical weight. The weighted sum directly produces the final risk score (0-100).
        
        Weights (from medical prioritization):
          SpO2:              25%
          Heart Rate:        18%
          Blood Pressure:    18%
          Respiratory Rate:  13%
          Temperature:       10%
          BMI:                8%
          Age/Age Group:      8%
        """

        # --- BMI Severity (0-100%) --- healthStatus.js: <18.5 Underweight, 18.5-22.9 Normal, 23-24.9 Overweight, >=25 Obese
        bmi_sev = 0.0
        if bmi >= 25:             bmi_sev = lerp(bmi, 25.0, 40.0, 50, 100)    # Obese: 50-100%
        elif bmi >= 23:           bmi_sev = lerp(bmi, 23.0, 24.9, 20, 50)     # Overweight: 20-50%
        elif bmi < 18.5:          bmi_sev = lerp(bmi, 18.5, 14.0, 30, 80)     # Underweight: 30-80%

        # --- Temperature Severity (0-100%) --- healthStatus.js: <35.0 Hypothermia, 35.0-37.2 Normal, 37.3-38.0 Slight Fever, >38.0 Critical
        temp_sev = 0.0
        if temp > 38.0:           temp_sev = lerp(temp, 38.0, 40.0, 60, 100)  # Critical: 60-100%
        elif temp >= 37.3:        temp_sev = lerp(temp, 37.3, 38.0, 30, 60)   # Slight Fever: 30-60%
        elif temp < 35.0:         temp_sev = lerp(temp, 35.0, 33.0, 50, 90)   # Hypothermia: 50-90%

        # --- SpO2 Severity (0-100%) --- healthStatus.js: <=89 Critical, 90-94 Low, 95-100 Normal
        spo2_sev = 0.0
        if spo2 <= 89:            spo2_sev = lerp(spo2, 89, 80, 70, 100)      # Critical: 70-100%
        elif spo2 <= 94:          spo2_sev = lerp(spo2, 94, 90, 30, 70)       # Low: 30-70%

        # --- Heart Rate Severity (0-100%) --- healthStatus.js: <60 Low, 60-100 Normal, 101-120 Elevated, >120 Critical
        hr_sev = 0.0
        if hr > 120:              hr_sev = lerp(hr, 120, 150, 70, 100)        # Critical: 70-100%
        elif hr >= 101:           hr_sev = lerp(hr, 101, 120, 30, 70)         # Elevated: 30-70%
        elif hr < 60:             hr_sev = lerp(hr, 60, 40, 30, 80)           # Low: 30-80%

        # --- Respiratory Rate Severity (0-100%) --- healthStatus.js: <12 Low, 12-20 Normal, 21-24 Elevated, >24 Critical
        rr_sev = 0.0
        if rr > 24:               rr_sev = lerp(rr, 24, 35, 60, 100)         # Critical: 60-100%
        elif rr >= 21:            rr_sev = lerp(rr, 21, 24, 25, 60)          # Elevated: 25-60%
        elif rr < 12:             rr_sev = lerp(rr, 12, 6, 30, 80)           # Low: 30-80%

        # --- Blood Pressure Severity (0-100%) --- Score sys & dia INDEPENDENTLY, take worst
        # healthStatus.js: <120/<80 Normal, 120-129/<80 Elevated, 130-139/80-89 Stage1, >=140/>=90 Stage2, >180/>120 Crisis
        sys_sev = 0.0
        if systolic > 180:        sys_sev = lerp(systolic, 180, 200, 80, 100) # Crisis: 80-100%
        elif systolic >= 140:     sys_sev = lerp(systolic, 140, 180, 50, 80)  # Stage 2: 50-80%
        elif 130 <= systolic <= 139: sys_sev = lerp(systolic, 130, 139, 30, 50) # Stage 1: 30-50%
        elif 120 <= systolic <= 129: sys_sev = lerp(systolic, 120, 129, 15, 30) # Elevated: 15-30%
        elif systolic < 90 and systolic > 0: sys_sev = lerp(systolic, 90, 50, 30, 80)  # Hypotension: 30-80%

        dia_sev = 0.0
        if diastolic > 120:       dia_sev = lerp(diastolic, 120, 140, 80, 100) # Crisis: 80-100%
        elif diastolic >= 90:     dia_sev = lerp(diastolic, 90, 120, 50, 80)   # Stage 2: 50-80%
        elif 80 <= diastolic <= 89: dia_sev = lerp(diastolic, 80, 89, 30, 50)  # Stage 1: 30-50%
        elif diastolic < 60 and diastolic > 0: dia_sev = lerp(diastolic, 60, 30, 30, 80) # Hypotension: 30-80%

        bp_sev = max(sys_sev, dia_sev)  # Whichever is worse wins

        # --- Age Severity (0-100%) --- Older patients have amplified risk
        age_sev = 0.0
        if age_group == 3:    age_sev = lerp(age, 60, 90, 40, 100)   # Senior 60+: 40-100%
        elif age_group == 2:  age_sev = lerp(age, 40, 59, 15, 40)    # Middle-Aged 40-59: 15-40%
        elif age_group == 1:  age_sev = lerp(age, 25, 39, 5, 15)     # Adult 25-39: 5-15%
        # Young Adult 16-24: 0% (baseline)

        # --- WEIGHTED SUM (directly produces 0-100 risk score) ---
        raw = (
            (spo2_sev * 0.25) +   # SpO2:    25% weight
            (hr_sev   * 0.18) +   # HR:      18% weight
            (bp_sev   * 0.18) +   # BP:      18% weight
            (rr_sev   * 0.13) +   # RR:      13% weight
            (temp_sev * 0.10) +   # Temp:    10% weight
            (bmi_sev  * 0.08) +   # BMI:      8% weight
            (age_sev  * 0.08)     # Age:      8% weight
        )

        # --- Combinatorial risk bonus (dangerous combos stack) ---
        combo = 0.0
        abnormal = sum(1 for s in [bmi_sev, temp_sev, spo2_sev, hr_sev, rr_sev, bp_sev] if s > 0)
        if abnormal >= 4: combo += 8
        elif abnormal == 3: combo += 4

        # Specific dangerous combinations
        if temp_sev > 0 and hr_sev > 0: combo += 3         # Fever + Tachycardia (SIRS)
        if spo2_sev > 0 and hr_sev > 0: combo += 5         # Low O2 + Fast HR
        if spo2_sev > 0 and rr_sev > 0: combo += 4         # Low O2 + Fast breathing
        if bp_sev > 0 and bmi_sev > 0: combo += 3          # HTN + Obesity
        if temp_sev > 0 and spo2_sev > 0: combo += 5       # Fever + Low O2
        if bp_sev >= 80 and hr_sev > 0: combo += 5         # Crisis BP + Tachycardia

        final = raw + combo
        return final

    # ===================================================================
    # GENERATION STRATEGY:
    # For each target score 0-100, generate vitals, compute the raw
    # medical score, then adjust with noise to hit the target exactly.
    # This ensures every score from 0 to 100 is balanced in the dataset.
    # ===================================================================

    vitals_options = ['bmi', 'temp', 'hr', 'spo2', 'rr', 'bp']

    def generate_vitals_for_tier(target_score):
        """Generate vitals appropriate for a target score range."""
        
        # Base vitals
        bmi = normal_bmi(); temp = normal_temp(); hr = normal_hr()
        spo2 = normal_spo2(); rr = normal_rr(); systolic, diastolic = normal_bp()

        if target_score < 20:
            pass # Keep normals
        elif target_score < 40:
            # 1 vital mildly off
            bmi = normal_bmi(); temp = normal_temp(); hr = normal_hr()
            spo2 = normal_spo2(); rr = normal_rr(); systolic, diastolic = normal_bp()
            pick = random.choice(vitals_options)
            if pick == 'bmi': bmi = abnormal_bmi()
            elif pick == 'temp': temp = mild_temp()
            elif pick == 'hr': hr = mild_hr()
            elif pick == 'spo2': spo2 = mild_spo2()
            elif pick == 'rr': rr = mild_rr()
            elif pick == 'bp': systolic, diastolic = mild_bp()
        elif target_score < 60:
            # 2 vitals off
            picks = random.sample(vitals_options, 2)
            for pick in picks:
                severity = random.choice(['mild', 'critical'])
                if pick == 'bmi': bmi = abnormal_bmi()
                elif pick == 'temp': temp = mild_temp() if severity == 'mild' else critical_temp()
                elif pick == 'hr': hr = mild_hr() if severity == 'mild' else critical_hr()
                elif pick == 'spo2': spo2 = mild_spo2() if severity == 'mild' else critical_spo2()
                elif pick == 'rr': rr = mild_rr() if severity == 'mild' else critical_rr()
                elif pick == 'bp': systolic, diastolic = mild_bp() if severity == 'mild' else critical_bp()
        elif target_score < 80:
            # 3 vitals off, bias critical
            picks = random.sample(vitals_options, 3)
            for pick in picks:
                severity = random.choice(['mild', 'critical', 'critical'])
                if pick == 'bmi': bmi = abnormal_bmi()
                elif pick == 'temp': temp = mild_temp() if severity == 'mild' else critical_temp()
                elif pick == 'hr': hr = mild_hr() if severity == 'mild' else critical_hr()
                elif pick == 'spo2': spo2 = mild_spo2() if severity == 'mild' else critical_spo2()
                elif pick == 'rr': rr = mild_rr() if severity == 'mild' else critical_rr()
                elif pick == 'bp': systolic, diastolic = mild_bp() if severity == 'mild' else critical_bp()
        else:
            # 4+ vitals critical
            num_bad = random.choice([4, 5, 6])
            picks = random.sample(vitals_options, min(num_bad, 6))
            for pick in picks:
                if pick == 'bmi': bmi = abnormal_bmi()
                elif pick == 'temp': temp = critical_temp()
                elif pick == 'hr': hr = critical_hr()
                elif pick == 'spo2': spo2 = critical_spo2()
                elif pick == 'rr': rr = critical_rr()
                elif pick == 'bp': systolic, diastolic = critical_bp()

        # Force one of the 15 possible combinations evenly
        # 0 modules selected is impossible in the flow
        combination_id = random.randint(1, 15)
        
        # 0th bit: Max30102 (SpO2, HR, RR)
        # 1st bit: Blood Pressure (Sys, Dia)
        # 2nd bit: Temperature (Temp)
        # 3rd bit: BMI (BMI)
        
        has_max = (combination_id & 1) == 0      # 0/1   (0 means we have it, 50% chance)
        has_bp = (combination_id & 2) == 0       # 0/2   
        has_temp = (combination_id & 4) == 0     # 0/4   
        has_bmi = (combination_id & 8) == 0      # 0/8   

        # Critical override: If the patient is critically ill (target_score > 60), 
        # they are far less likely to skip tests in reality. We override 60% of skips.
        if target_score > 60:
            if random.random() < 0.60: has_max = True
            if random.random() < 0.60: has_bp = True
            if random.random() < 0.60: has_temp = True
            if random.random() < 0.60: has_bmi = True

        if not has_bmi: bmi = np.nan
        if not has_temp: temp = np.nan
        if not has_max:
            spo2 = np.nan
            hr = np.nan
            rr = np.nan
        if not has_bp:
            systolic = np.nan
            diastolic = np.nan

        return bmi, temp, spo2, hr, rr, systolic, diastolic

    # Generate data targeting each score 0..100
    for target_score in range(101):
        generated = 0
        attempts = 0
        max_attempts = per_score * 200  # Safety valve (generous for hard scores)

        while generated < per_score and attempts < max_attempts:
            attempts += 1

            age = random.randint(16, 90)
            gender = random.choice(['Male', 'Female'])
            if 16 <= age <= 24: age_group = 0
            elif 25 <= age <= 39: age_group = 1
            elif 40 <= age <= 59: age_group = 2
            else: age_group = 3

            bmi, temp, spo2, hr, rr, systolic, diastolic = generate_vitals_for_tier(target_score)

            # Get the raw medical score
            raw_score = score_patient(age, age_group, bmi, temp, spo2, hr, rr, systolic, diastolic)
            
            # Add wider noise to fill score gaps from weighted formula
            noisy_score = raw_score + random.uniform(-10.0, 10.0)
            final_score = int(round(min(100, max(0, noisy_score))))

            # Accept if it matches target score exactly
            if final_score == target_score:
                data.append([age, age_group, gender, bmi, temp, spo2, hr, systolic, diastolic, rr, final_score])
                generated += 1

        print(f"  Score {target_score:3d}%: {generated} records (took {attempts} attempts)")

    # Shuffle so scores aren't in order
    random.shuffle(data)

    # Save to CSV
    output_file = 'juan_ai_dataset.csv'
    try:
        with open(output_file, 'w', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            writer.writerows(data)
        
        total = len(data)
        print(f"\nGenerated {total} total records.")
        print(f"Score coverage: {len(set(row[10] for row in data))} unique scores out of 101 possible.")
        print(f"Successfully saved to {output_file}!")
    except Exception as e:
        print(f"Error writing file: {e}")

if __name__ == "__main__":
    generate_health_data(50000)
