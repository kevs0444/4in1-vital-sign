import math
import numpy as np

def apply_clinical_guardrails(ai_base_score, vital_signs):
    """
    Applies dynamic, penalty-based clinical guardrails to the AI's base risk score.
    The AI score is trusted as the foundation, and penalties are added for
    abnormal vital signs. Penalties scale up if fewer sensor modules are active.
    
    Thresholds are perfectly synchronized with frontend/src/utils/healthStatus.js
    
    Args:
        ai_base_score (int): The raw 0-100 score from the XGBoost model.
        vital_signs (dict): Dictionary containing bmi, temp, spo2, hr, systolic, diastolic, rr
        
    Returns:
        tuple: (final_risk_score, list_of_penalty_strings, total_penalty_applied)
    """
    
    bmi = vital_signs.get('bmi', np.nan)
    temp = vital_signs.get('temp', np.nan)
    spo2 = vital_signs.get('spo2', np.nan)
    hr = vital_signs.get('hr', np.nan)
    systolic = vital_signs.get('systolic', np.nan)
    diastolic = vital_signs.get('diastolic', np.nan)
    rr = vital_signs.get('rr', np.nan)
    
    total_penalty = 0
    penalties = []

    # ── Detect which of the 4 modules are active ──
    has_bmi  = not (np.isnan(bmi) if isinstance(bmi, float) else False)
    has_temp = not (np.isnan(temp) if isinstance(temp, float) else False)
    has_max  = not (np.isnan(spo2) if isinstance(spo2, float) else False)  # MAX30102 = SpO2 + HR + RR
    has_bp   = not (np.isnan(systolic) if isinstance(systolic, float) else False)

    active_modules = sum([has_bmi, has_temp, has_max, has_bp])
    active_modules = max(active_modules, 1)  # Safety: at least 1

    # Dynamic multiplier: fewer modules → bigger penalties per module
    multiplier = 4.0 / active_modules

    # ── BASE PENALTIES (multiplied by dynamic multiplier) ──

    # BMI Penalties (healthStatus.js categories)
    if has_bmi:
        if bmi >= 25:
            p = int(round(3 * multiplier))
            total_penalty += p
            penalties.append(f"BMI {bmi} Obese → +{p}%")
        elif bmi >= 23:
            p = int(round(2 * multiplier))
            total_penalty += p
            penalties.append(f"BMI {bmi} Overweight → +{p}%")
        elif bmi < 18.5 and bmi > 0:
            p = int(round(3 * multiplier))
            total_penalty += p
            penalties.append(f"BMI {bmi} Underweight → +{p}%")

    # Temperature Penalties
    if has_temp:
        if temp > 38.0:
            p = int(round(8 * multiplier))
            total_penalty += p
            penalties.append(f"Temp {temp}°C Critical → +{p}%")
        elif temp >= 37.3:
            p = int(round(4 * multiplier))
            total_penalty += p
            penalties.append(f"Temp {temp}°C Slight Fever → +{p}%")
        elif temp < 35.0 and temp > 0:
            p = int(round(6 * multiplier))
            total_penalty += p
            penalties.append(f"Temp {temp}°C Hypothermia → +{p}%")

    # SpO2 Penalties
    if has_max:
        if spo2 > 0 and spo2 <= 89:
            p = int(round(20 * multiplier))
            total_penalty += p
            penalties.append(f"SpO2 {spo2}% Critical → +{p}%")
        elif spo2 > 0 and spo2 <= 94:
            p = int(round(10 * multiplier))
            total_penalty += p
            penalties.append(f"SpO2 {spo2}% Low → +{p}%")

        # HR Penalties
        if hr > 120:
            p = int(round(15 * multiplier))
            total_penalty += p
            penalties.append(f"HR {hr} Critical → +{p}%")
        elif hr >= 101:
            p = int(round(8 * multiplier))
            total_penalty += p
            penalties.append(f"HR {hr} Elevated → +{p}%")
        elif hr > 0 and hr < 60:
            p = int(round(6 * multiplier))
            total_penalty += p
            penalties.append(f"HR {hr} Low → +{p}%")

        # RR Penalties
        if rr > 24:
            p = int(round(10 * multiplier))
            total_penalty += p
            penalties.append(f"RR {rr} Critical → +{p}%")
        elif rr >= 21:
            p = int(round(5 * multiplier))
            total_penalty += p
            penalties.append(f"RR {rr} Elevated → +{p}%")
        elif rr > 0 and rr < 12:
            p = int(round(5 * multiplier))
            total_penalty += p
            penalties.append(f"RR {rr} Low → +{p}%")

    # Blood Pressure Penalties (sys & dia checked independently)
    if has_bp:
        bp_base = 0
        bp_label = "Normal"
        if systolic > 180 or diastolic > 120:
            bp_base = 18; bp_label = "Crisis"
        elif systolic >= 140 or diastolic >= 90:
            bp_base = 12; bp_label = "Stage 2"
        elif (130 <= systolic <= 139) or (80 <= diastolic <= 89):
            bp_base = 8; bp_label = "Stage 1"
        elif 120 <= systolic <= 129 and diastolic < 80:
            bp_base = 4; bp_label = "Elevated"
        elif systolic > 0 and (systolic < 90 or diastolic < 60):
            bp_base = 6; bp_label = "Hypotension"
        
        if bp_base > 0:
            p = int(round(bp_base * multiplier))
            total_penalty += p
            penalties.append(f"BP {systolic}/{diastolic} {bp_label} → +{p}%")

    # Apply penalties to AI base score
    final_score = ai_base_score + total_penalty
    
    # Strictly bound between 0 and 100
    final_score = min(100, max(0, final_score))
    
    return final_score, penalties, total_penalty, multiplier
