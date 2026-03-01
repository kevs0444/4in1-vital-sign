from flask import Blueprint, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
import google.generativeai as genai 
# from app.utils.helpers import format_response

# Create the Blueprint
juan_ai_bp = Blueprint('juan_ai', __name__)

# --- CONFIGURATION (You will need an API Key for the text part) ---
# For now, we will structure it so it works even without the key (using fallbacks)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') 
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- LAZY LOAD THE "MATH BRAIN" (XGBoost) ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../juan_ai/juan_ai_model.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '../../juan_ai/juan_ai_scaler.pkl')
ENCODER_PATH = os.path.join(os.path.dirname(__file__), '../../juan_ai/juan_ai_gender_encoder.pkl')

risk_model = None
scaler = None
gender_encoder = None
MODEL_LOADED = False

def load_models_if_needed():
    global risk_model, scaler, gender_encoder, MODEL_LOADED
    if MODEL_LOADED:
        return

    print("🧠 Loading Juan AI Models (Lazy Load)...")
    try:
        risk_model = joblib.load(MODEL_PATH)
        scaler = joblib.load(SCALER_PATH)
        gender_encoder = joblib.load(ENCODER_PATH)
        print("✅ Juan AI 'Math Brain' Loaded Successfully!")
        MODEL_LOADED = True
    except Exception as e:
        print(f"⚠️ Warning: Could not load Juan AI models. Using fallback mode. Error: {e}")
        MODEL_LOADED = False

# from app.sensors.weight_compliance_camera import weight_compliance_camera as camera_manager



@juan_ai_bp.route('/predict-risk', methods=['POST'])
def predict_risk():
    """
    Step 1: Analyzes the 9 Parameters to get a Risk Score.
    Step 2: Generates Dynamic Text Recommendations.
    """
    try:
        data = request.get_json()
        print("🔍 Juan AI Analysis Request:", data)

        # 1. Extract 9 Parameters from Frontend Data
        
        HEALTHY_DEFAULTS = {
            'bmi': 22.0, 'temp': 36.6, 'spo2': 98.0, 'hr': 75.0, 
            'sys': 115.0, 'dia': 75.0, 'rr': 16.0
        }

        def get_val(key, default):
            try:
                val = data.get(key)
                if val is None or val == "" or val == "N/A": return default
                return float(val)
            except: return default

        age = int(data.get('age', 30))
        gender_str = data.get('sex', 'Male')
        
        # --- PARTIAL DATA IMPUTATION LOGIC ---
        # We assume Healthy Defaults for any sensor NOT measured.
        # This isolates the risk prediction to ONLY the measured values.
        # No need to retrain; the model sees "Perfect Health + High Fever" -> "High Risk".
        
        bmi = get_val('bmi', HEALTHY_DEFAULTS['bmi'])
        temp = get_val('temperature', HEALTHY_DEFAULTS['temp'])
        spo2 = get_val('spo2', HEALTHY_DEFAULTS['spo2'])
        hr = get_val('heartRate', HEALTHY_DEFAULTS['hr'])
        systolic = get_val('systolic', HEALTHY_DEFAULTS['sys'])
        diastolic = get_val('diastolic', HEALTHY_DEFAULTS['dia'])
        rr = get_val('respiratoryRate', HEALTHY_DEFAULTS['rr'])

        # Identify imputed fields for logging
        imputed_fields = []
        if data.get('bmi') in [0, None, "", "N/A"]: imputed_fields.append("BMI")
        if data.get('temperature') in [0, None, "", "N/A"]: imputed_fields.append("Temp")
        if data.get('spo2') in [0, None, "", "N/A"]: imputed_fields.append("SpO2")
        if data.get('heartRate') in [0, None, "", "N/A"]: imputed_fields.append("HR")
        if data.get('systolic') in [0, None, "", "N/A"]: imputed_fields.append("BP")

        if imputed_fields:
            print(f"ℹ️  [Partial Data Mode] Using Healthy Defaults for: {', '.join(imputed_fields)}")
        else:
            print("✅ [Full Data Mode] All vital signs valid.")

        # Feature Engineering: Age Group
        if 16 <= age <= 24: age_group = 0
        elif 25 <= age <= 39: age_group = 1
        elif 40 <= age <= 59: age_group = 2
        else: age_group = 3 # Senior

        # Encode Gender
        # Note: In training we used LabelEncoder. Male=0/1 depending on data. 
        # Safest is to use the loaded encoder, or hardcode if we know the mapping.
        # Let's try to use the encoder if loaded
        try:
            gender_numeric = gender_encoder.transform([gender_str])[0]
        except:
             # Fallback if encoder fails or gender string doesn't match
            gender_numeric = 0 if gender_str.lower() == 'male' else 1

        # Prepare Input Array for Model
        # MUST MATCH: ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr']
        input_data = pd.DataFrame([[
            age, age_group, gender_numeric, bmi, temp, spo2, hr, systolic, diastolic, rr
        ]], columns=['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr'])

        # --- STEP 1: CALCULATE RISK (MATH BRAIN) ---
        risk_score = 0
        risk_level = "Unknown"
        
        if not MODEL_LOADED:
            load_models_if_needed()

        if MODEL_LOADED:
            # Scale the data
            input_scaled = scaler.transform(input_data)
            
            # Direct Continuous Prediction (returns an array like [54.2])
            raw_prediction = risk_model.predict(input_scaled)[0]
            risk_score = int(round(raw_prediction))  # Convert to whole number integer

            # --- POST-PROCESSING: REMOVED MANUAL BOOSTERS ---
            # User requested to rely ONLY on the AI Model's prediction.
            # No manual if/else overrides here.


            # Validate Risk Score limits
        risk_score = min(100, max(0, risk_score))
        
        # --- DATA QUALITY METRICS (THESIS VALIDATION) ---
        # Calculate how "complete" the assessment is.
        
        # The 10 AI Model Parameters are:
        # 1. Age (Profile - Always Included)
        # 2. Age Group (Profile - Always Included)
        # 3. Gender (Profile - Always Included)
        # 4. BMI (Sensor)
        # 5. Temp (Sensor)
        # 6. SpO2 (Sensor)
        # 7. HR (Sensor)
        # 8. Systolic BP (Sensor - counts as "BP")
        # 9. Diastolic BP (Sensor - counts as "BP")
        # 10. RR (Sensor)
        
        # Profile parameters are ALWAYS included (3)
        profile_params_count = 3  # Age, Age Group, Gender
        
        # Sensor categories: BMI, Temp, SpO2, HR, BP (sys+dia=1), RR
        # Note: RR is derived from MAX30102, same as SpO2/HR
        total_sensor_categories = 5  # BMI, Temp, SpO2/HR/RR (MAX30102), BP
        
        # Count how many sensor categories were measured (not imputed)
        measured_sensors = total_sensor_categories - len(imputed_fields)
        
        # Total parameters used = Profile (3) + Measured Sensors
        total_parameters_used = profile_params_count + measured_sensors
        
        # Max possible parameters = Profile (3) + All Sensors (5)
        max_parameters = profile_params_count + total_sensor_categories
        
        data_quality_score = round((total_parameters_used / max_parameters) * 100, 1)
        
        confidence_metrics = {
            'is_partial_data': len(imputed_fields) > 0,
            'data_quality_score': data_quality_score,
            'imputed_fields': imputed_fields,
            'active_sensors_count': measured_sensors,  # Legacy: Just the sensor count
            'total_parameters_used': total_parameters_used,  # New: Profile + Sensors
            'max_parameters': max_parameters,  # New: Maximum possible
            'profile_params': ['Age', 'Age Group', 'Gender'],  # Always included
            'measured_sensors': [s for s in ['BMI', 'Temp', 'SpO2', 'HR', 'BP'] if s not in imputed_fields]
        }
        
        print(f"📊 Confidence Metrics: {confidence_metrics}")

        # Map Score to Risk Level Class (5 Tiers)
        if risk_score < 20: risk_level = "Low Risk"
        elif risk_score < 40: risk_level = "Mild Risk"
        elif risk_score < 60: risk_level = "Moderate Risk"
        elif risk_score < 80: risk_level = "High Risk"
        else: risk_level = "Critical Risk"
        
        print(f"✅ Juan AI Prediction Complete!")
        print(f"   📊 Risk Score: {risk_score}%")
        print(f"   🏷️ Risk Level: {risk_level}")

        # --- STEP 2: GENERATE ADVICE (LANGUAGE BRAIN) ---
        recommendations = generate_dynamic_advice(age, gender_str, age_group, risk_level, risk_score, data)

        return jsonify({
            'success': True,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'confidence_metrics': confidence_metrics, # New thesis-grade metadata
            'recommendations': recommendations
        })

    except Exception as e:
        print(f"❌ Error in Juan AI: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500


def generate_dynamic_advice(age, gender, age_group, risk_level, score, vitals):
    """
    HYBRID AI ENGINE
    1. Tries to use Google Gemini for high-quality, personalized text.
    2. Falls back to Expert System (Rules) if internet/API fails.
    """
    
    # --- 1. TRY ONLINE AI (GEMINI) ---
    if GEMINI_API_KEY:
        try:
            # --- SMART MODEL DISCOVERY ---
            # Instead of guessing names, let's ask the API what is available for this Key.
            available_models = []
            try:
                for m in genai.list_models():
                    if 'generateContent' in m.supported_generation_methods:
                        available_models.append(m.name)
            except Exception as e:
                print(f"⚠️ Juan AI: Could not list models ({e}).")

            print(f"🧠 Juan AI: Accessed Models -> {available_models}")

            # Priority List: Try to find the best one from the available list
            # We prefer Flash (fastest/free-est), then Pro.
            selected_model_name = None
            
            # Helper to find a partial match
            def find_model(substring):
                for m_name in available_models:
                    if substring in m_name: return m_name
                return None

            if find_model('flash'): selected_model_name = find_model('flash')
            elif find_model('pro'): selected_model_name = find_model('pro')
            elif available_models: selected_model_name = available_models[0] # Pick ANYTHING

            if selected_model_name:
                print(f"🧠 Juan AI: Auto-Selected Model -> '{selected_model_name}'")
                model = genai.GenerativeModel(selected_model_name)
            else:
                # If list failed or was empty, Fallback to 'gemini-1.5-flash' blindly
                print("⚠️ Juan AI: No models listed. Trying default 'gemini-1.5-flash'...")
                model = genai.GenerativeModel('gemini-1.5-flash')

            # Map age_group to text
            age_group_map = {0: "Young Adult (18-24)", 1: "Adult (25-39)", 2: "Middle-Aged (40-59)", 3: "Senior (60+)"}
            age_group_str = age_group_map.get(age_group, "Unknown")

            # Construct a rich prompt
            prompt = f"""
            You are "Juan AI", an advanced medical assistant.
            Patient: {age} year old {gender}.
            Age Group: {age_group_str}
            
            Current Vitals:
            - BMI: {vitals.get('bmi', 'N/A')}
            - Temp: {vitals.get('temperature', 'N/A')} C
            - SpO2: {vitals.get('spo2', 'N/A')}%
            - Heart Rate: {vitals.get('heartRate', 'N/A')} bpm
            - BP: {vitals.get('systolic', 'N/A')}/{vitals.get('diastolic', 'N/A')} mmHg
            - Respiratory Rate: {vitals.get('respiratoryRate', 'N/A')} bpm
            
            Risk Assessment: {risk_level} (Score: {score}/100)
            
            Task: Provide 4 short, empathetic, professional sections of advice.
            Output must be VALID JSON with these exact keys:
            "medical_actions", "preventive_strategies", "wellness_tips", "provider_guidance"
            
            Content Guidelines (CRITICAL: KEEP IT SHORT):
            - medical_actions: List of immediate actions. MAX 6 WORDS per item. (e.g. "Consult cardiologist immediately", "Monitor BP daily").
            - preventive_strategies: What to do this week. MAX 6 WORDS per item.
            - wellness_tips: Diet/Lifestyle. MAX 6 WORDS per item.
            - provider_guidance: Points for doctor. MAX 10 WORDS.
            """
            
            # Call API
            response = model.generate_content(prompt, generation_config={"response_mime_type": "application/json"})
            
            # Parse Response
            import json
            advice = json.loads(response.text)
            print("✅ Juan AI: Received Dynamic Advice from Google!")
            return advice

        except Exception as e:
            print(f"⚠️ Juan AI Online Failed ({e}). Switching to Offline Brain.")
    
    # --- 2. FALLBACK TO OFFLINE EXPERT SYSTEM ---
    return generate_offline_advice(age, gender, risk_level, score, vitals)

def generate_offline_advice(age, gender, risk_level, score, vitals):
    """
    SMART OFFLINE MEDICAL ADVICE ENGINE (v3 - Knowledge Base Powered)
    
    Uses a comprehensive medical knowledge base with hundreds of varied,
    contextual templates — similar to what Gemini API would produce.
    
    How it works:
    1. Analyzes each vital sign's deviation from normal
    2. Selects the correct severity category from the knowledge base
    3. Randomly picks from pools of varied advice (never the same twice)
    4. Detects dangerous combinations and adds combo-specific advice
    5. Adds age/gender-specific recommendations
    6. Sorts everything by clinical severity (most critical first)
    """
    import random
    from app.utils.medical_knowledge_base import (
        BP_ADVICE, HR_ADVICE, SPO2_ADVICE, TEMP_ADVICE, BMI_ADVICE, RR_ADVICE,
        COMBO_ADVICE, HEALTHY_ADVICE, AGE_GENDER_ADVICE, select_advice
    )

    # --- 1. PARSE VITALS ---
    try:
        sys_bp = float(vitals.get('systolic', 0)); dia_bp = float(vitals.get('diastolic', 0))
        spo2 = float(vitals.get('spo2', 0)); hr = float(vitals.get('heartRate', 0))
        temp = float(vitals.get('temperature', 0)); bmi = float(vitals.get('bmi', 0))
        rr = float(vitals.get('respiratoryRate', 0))
    except:
        sys_bp=0; dia_bp=0; spo2=0; hr=0; temp=0; bmi=0; rr=0

    # Template data for formatting
    fmt = {'sys': int(sys_bp), 'dia': int(dia_bp), 'spo2': int(spo2), 'hr': int(hr),
           'temp': temp, 'bmi': bmi, 'rr': int(rr), 'age': age, 'gender': gender}

    # Collect all findings as (severity_score, category, actions, strategies, tips, guidance)
    findings = []

    # --- 2. ANALYZE EACH VITAL AGAINST KNOWLEDGE BASE ---

    # Blood Pressure
    if sys_bp > 0 or dia_bp > 0:
        bp_cat = None; sev = 0
        if sys_bp > 180 or dia_bp > 120: bp_cat = 'crisis'; sev = 95
        elif sys_bp >= 140 or dia_bp >= 90: bp_cat = 'stage2'; sev = 65
        elif sys_bp >= 130 or dia_bp >= 80: bp_cat = 'stage1'; sev = 40
        elif sys_bp >= 120: bp_cat = 'elevated'; sev = 20
        elif sys_bp < 90 or dia_bp < 60: bp_cat = 'low'; sev = 50
        if bp_cat:
            kb = BP_ADVICE[bp_cat]
            findings.append((sev, 'bp',
                select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
                select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # Heart Rate
    if hr > 0:
        hr_cat = None; sev = 0
        if hr > 120: hr_cat = 'severe_tachy'; sev = 75
        elif hr > 100: hr_cat = 'mild_tachy'; sev = 40
        elif hr < 50: hr_cat = 'severe_brady'; sev = 55
        elif hr < 60: hr_cat = 'mild_brady'; sev = 20
        if hr_cat:
            kb = HR_ADVICE[hr_cat]
            findings.append((sev, 'hr',
                select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
                select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # SpO2
    if spo2 > 0:
        spo2_cat = None; sev = 0
        if spo2 < 90: spo2_cat = 'severe'; sev = 90
        elif spo2 < 95: spo2_cat = 'moderate'; sev = 55
        if spo2_cat:
            kb = SPO2_ADVICE[spo2_cat]
            findings.append((sev, 'spo2',
                select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
                select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # Temperature
    if temp > 0:
        temp_cat = None; sev = 0
        if temp >= 39.0: temp_cat = 'high_fever'; sev = 80
        elif temp > 38.0: temp_cat = 'moderate_fever'; sev = 50
        elif temp > 37.3: temp_cat = 'low_grade'; sev = 25
        elif temp < 35.0: temp_cat = 'hypothermia'; sev = 60
        if temp_cat:
            kb = TEMP_ADVICE[temp_cat]
            findings.append((sev, 'temp',
                select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
                select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # BMI
    if bmi > 0:
        bmi_cat = None; sev = 0
        if bmi >= 30: bmi_cat = 'obese_II'; sev = 60
        elif bmi >= 25: bmi_cat = 'obese_I'; sev = 40
        elif bmi >= 23: bmi_cat = 'overweight'; sev = 20
        elif bmi < 18.5: bmi_cat = 'underweight'; sev = 30
        if bmi_cat:
            kb = BMI_ADVICE[bmi_cat]
            findings.append((sev, 'bmi',
                select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
                select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # Respiratory Rate
    if rr > 0:
        rr_cat = None; sev = 0
        if rr > 24: rr_cat = 'tachypnea'; sev = 60
        elif rr > 20: rr_cat = 'elevated'; sev = 30
        elif rr < 12: rr_cat = 'bradypnea'; sev = 30
        if rr_cat:
            kb = RR_ADVICE[rr_cat]
            findings.append((sev, 'rr',
                select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
                select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # --- 3. DANGEROUS COMBINATIONS ---
    active_cats = [f[1] for f in findings]

    if 'temp' in active_cats and 'hr' in active_cats and temp > 37.5 and hr > 100:
        kb = COMBO_ADVICE['sirs']
        findings.append((85, 'combo',
            select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
            select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    if 'spo2' in active_cats and 'rr' in active_cats and spo2 < 95 and rr > 20:
        kb = COMBO_ADVICE['respiratory_distress']
        findings.append((90, 'combo',
            select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
            select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    if 'bp' in active_cats and 'bmi' in active_cats and (sys_bp >= 130 or dia_bp >= 80) and bmi >= 25:
        kb = COMBO_ADVICE['metabolic_syndrome']
        findings.append((70, 'combo',
            select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
            select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    if 'bp' in active_cats and 'hr' in active_cats and sys_bp >= 140 and hr > 100:
        kb = COMBO_ADVICE['cv_strain']
        findings.append((88, 'combo',
            select_advice(kb['actions'], fmt, 1), select_advice(kb['strategies'], fmt, 1),
            select_advice(kb['tips'], fmt, 1), select_advice(kb['guidance'], fmt, 1)))

    # --- 4. AGE & GENDER ---
    if age > 60 and findings:
        ag = AGE_GENDER_ADVICE['senior']
        findings.append((15, 'age', [],
            select_advice(ag['strategies'], fmt, 1), select_advice(ag['tips'], fmt, 1), []))

    if gender.lower() == 'female' and age > 50:
        ag = AGE_GENDER_ADVICE['female_postmenopausal']
        findings.append((10, 'gender', [],
            select_advice(ag['strategies'], fmt, 1), select_advice(ag['tips'], fmt, 1), []))

    if age <= 24:
        ag = AGE_GENDER_ADVICE['young_adult']
        findings.append((5, 'age', [], [], select_advice(ag['tips'], fmt, 1), []))

    # --- 5. SORT BY SEVERITY & ASSEMBLE ---
    findings.sort(key=lambda x: x[0], reverse=True)

    actions = []; strategies = []; tips = []; guide = []
    for sev, cat, a_list, s_list, t_list, g_list in findings:
        for a in a_list:
            if a not in actions: actions.append(a)
        for s in s_list:
            if s not in strategies: strategies.append(s)
        for t in t_list:
            if t not in tips: tips.append(t)
        for g in g_list:
            if g not in guide: guide.append(g)

    # --- 6. HEALTHY FALLBACK ---
    if not findings:
        h_cat = 'excellent' if score < 5 else 'good' if score < 15 else 'borderline'
        kb = HEALTHY_ADVICE[h_cat]
        actions = select_advice(kb['actions'], fmt, 1)
        strategies = select_advice(kb['strategies'], fmt, 1)
        tips = select_advice(kb['tips'], fmt, 2)
        guide = select_advice(kb['guidance'], fmt, 1)

    return {
        "medical_actions": actions[:4],
        "preventive_strategies": strategies[:4],
        "wellness_tips": tips[:4],
        "provider_guidance": guide[:6]
    }


