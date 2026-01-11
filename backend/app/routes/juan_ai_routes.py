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
        if 18 <= age <= 24: age_group = 0
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
            
            # Predict Probabilities (returns array like [[0.8, 0.15, 0.05]])
            # Predict Probabilities (returns array like [[0.8, 0.15, ...]])
            # Class 0=Normal, 1=Mild, 2=Moderate, 3=High, 4=Critical
            probs = risk_model.predict_proba(input_scaled)[0]
            
            # Calculate a blended "Score" from 0-100 based on probabilities
            # Weighted average centers: Normal(10), Mild(30), Mod(50), High(70), Critical(90)
            risk_score = (probs[0] * 10) + (probs[1] * 30) + (probs[2] * 50) + (probs[3] * 70) + (probs[4] * 90)
            risk_score = int(round(risk_score))  # Convert to whole number integer

            # --- POST-PROCESSING: KEY VITALS RISK BOOSTER (SELECTIVE) ---
            # ONLY apply boosters for fields that were actually measured (not imputed).
            
            # BP Booster
            if "BP" not in imputed_fields:
                if (systolic >= 180 or diastolic >= 120):
                    risk_score = max(risk_score, 40.0) # Hypertensive Crisis
                elif (systolic >= 140 or diastolic >= 90):
                    risk_score = max(risk_score, 30.0) # Stage 2
                elif (systolic >= 130 or diastolic >= 80):
                    risk_score = max(risk_score, 20.0) # Stage 1
                elif (systolic >= 120 and diastolic < 80):
                    risk_score = max(risk_score, 15.0) # Elevated
                elif (systolic < 90 or diastolic < 60):
                    risk_score = max(risk_score, 15.0) # Hypotension

            # SpO2 Booster
            if "SpO2" not in imputed_fields:
                if (spo2 <= 89):
                    risk_score = max(risk_score, 40.0) # Critical
                elif (spo2 <= 94):
                    risk_score = max(risk_score, 15.0) # Low

            # Heart Rate Booster
            if "HR" not in imputed_fields:
                if (hr > 120):
                     risk_score = max(risk_score, 40.0) # Critical
                elif (hr > 100 or hr < 60):
                     risk_score = max(risk_score, 15.0) # Low/Elevated

            # Temp Booster
            if "Temp" not in imputed_fields:
                if (temp > 38.0):
                     risk_score = max(risk_score, 40.0) # Critical
                elif (temp >= 37.3):
                     risk_score = max(risk_score, 15.0) # Slight Fever
                elif (temp < 35.0):
                     risk_score = max(risk_score, 40.0) # Hypothermia

            # RR Booster (Only if RR provided explicitly)
            # RR is typically part of SpO2/HR sensors or manual
            if data.get('respiratoryRate') not in [0, None, "", "N/A"]:
                if (rr > 24):
                    risk_score = max(risk_score, 40.0)
                elif (rr >= 21 or rr < 12):
                    risk_score = max(risk_score, 15.0)

            # BMI Booster
            if "BMI" not in imputed_fields:
                if (bmi >= 30):
                    risk_score = max(risk_score, 40.0) # Obese
                elif (bmi >= 25 or bmi < 18.5):
                    risk_score = max(risk_score, 15.0) # Overweight / Underweight

            # Age & Gender Factors (Always applicable as Profile Data)
            if age >= 60: risk_score += 5
            if age_group == 3: risk_score += 5 
            if gender_numeric == 0: risk_score += 2


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

        # Map Score to Risk Level Class (4 Tiers)
        if risk_score < 20: risk_level = "Normal"
        elif risk_score < 50: risk_level = "Moderate Risk"
        elif risk_score < 75: risk_level = "High Risk"
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
    ENHANCED OFFLINE BRAIN (SMART DYNAMIC ENGINE)
    Uses complex rule-based logic to simulate an intelligent medical assistant.
    Generates varied, context-aware advice without external AI.
    """
    import random
    
    # --- 1. PARSE & NORMALIZE ---
    try:
        sys = float(vitals.get('systolic', 0)); dia = float(vitals.get('diastolic', 0))
        spo2 = float(vitals.get('spo2', 0)); hr = float(vitals.get('heartRate', 0))
        temp = float(vitals.get('temperature', 0)); bmi = float(vitals.get('bmi', 0))
        rr = float(vitals.get('respiratoryRate', 0))
    except:
        sys=0; dia=0; spo2=0; hr=0; temp=0; bmi=0; rr=0

    # Lists to populate
    actions = []; strategies = []; tips = []; guide = []

    # --- 2. INTELLIGENT RULE ENGINE ---

    # A. Hypertension Logic
    if sys >= 140 or dia >= 90:
        actions.append(random.choice([
            "Consult a doctor immediately regarding high blood pressure.",
            "Urgent medical evaluation for hypertension is recommended.",
            "Schedule an appointment to manage your blood pressure."
        ]))
        strategies.append(random.choice([
            "Measure BP daily at the same time.",
            "Keep a 7-day blood pressure log.",
            "Avoid caffeine and stress before measuring."
        ]))
        tips.append("Reduce sodium intake to <2300mg/day.")
        guide.append(f"Pt presents with Stage 2 HTN ({int(sys)}/{int(dia)}).")
    
    elif sys >= 120 or dia >= 80:
        actions.append("Monitor blood pressure regularly.")
        strategies.append("Check BP twice a week.")
        tips.append("Limit alcohol and salty foods.")
        guide.append("Pt shows elevated BP/Stage 1 signs.")

    # B. Tachycardia / Bradycardia
    if hr > 100:
        actions.append("Heart rate is unusually high (Tachycardia).")
        strategies.append("Monitor pulse after resting for 15 mins.")
        tips.append("Reduce caffeine and stay hydrated.")
        guide.append(f"Tachycardia detected ({int(hr)} bpm).")
    elif 0 < hr < 60:
        if "athlete" not in str(vitals).lower(): # Simple check
            actions.append("Heart rate is lower than normal.")
            guide.append(f"Bradycardia detected ({int(hr)} bpm).")

    # C. Hypoxia (SpO2)
    if 0 < spo2 < 95:
        actions.append(random.choice([
            "Seek medical attention for low oxygen saturation.",
            "SpO2 levels indicate potential hypoxia.",
            "Consult a pulmonologist if shortness of breath occurs."
        ]))
        strategies.append("Practice deep breathing exercises.")
        guide.append(f"Hypoxia concern (SpO2: {int(spo2)}%).")

    # D. Fever
    if temp > 38.0:
        actions.append("High fever detected. Seek medical care.")
        strategies.append("Monitor temp every 4 hours.")
        tips.append("Stay hydrated and rest.")
        guide.append(f"Febrile ({temp}C). Rule out infection.")
    elif temp > 37.5:
        actions.append("Mild fever detected.")
        strategies.append("Monitor for other symptoms.")

    # E. Obesity / Weight
    if bmi >= 30:
        actions.append("Consult a nutritionist for weight management.")
        strategies.append("Aim for a 5-10% weight reduction.")
        tips.append("Prioritize whole foods over processed ones.")
        guide.append(f"Obese Class (BMI {bmi}).")
    elif 25 <= bmi < 30:
        tips.append("Increase daily physical activity to 30 mins.")
        # F. Respiratory Rate (RR)
    if rr > 24:
        actions.append("Respiratory rate is critically high.")
        guide.append(f"Tachypnea ({int(rr)}/min).")
    elif rr < 12 and rr > 0:
        actions.append("Respiratory rate is low.")
        guide.append(f"Bradypnea ({int(rr)}/min).")

    # G. Age & Gender Context
    if age > 60:
        strategies.append("Ensure fall-prevention measures at home.")
        if sys < 110: tips.append("Stand up slowly to prevent dizziness.")
    
    if gender.lower() == 'female' and age > 50:
        tips.append("Consider calcium-rich foods for bone health.")
    
    guide.append(f"Patient is a {age}-year-old {gender.lower()}.")

    # --- 3. COMBINATORIAL LOGIC (THE "SMART" PART) ---
    
    # High BP + Obese
    if (sys >= 130 or dia >= 80) and bmi >= 30:
        strategies.append("Weight loss may significantly lower your BP.")
        tips.append("DASH diet is recommended for hypertension.")
        guide.append("Co-morbid: HTN + Obesity.")

    # Fever + High HR
    if temp > 37.5 and hr > 100:
        actions.append("Combination of Fever and High HR requires attention.")
        guide.append("SIRS criteria potential (Fever + Tach).")

    # --- 4. FALLBACKS & CLEANUP ---
    
    # If healthy (Normal Fallbacks)
    if not actions:
        actions.append(random.choice([
            "Maintain current healthy lifestyle.",
            "No immediate medical actions needed.",
            "Vital signs are within normal limits."
        ]))
        guide.append("Vitals WNL. Routine screening.")

    if not strategies:
        strategies.append("Continue annual health check-ups.")
    
    if not tips:
        tips.append("Drink 8 glasses of water daily.")
        tips.append("Aim for 7-8 hours of sleep.")

    # Shuffle and Limit (Dynamic feel)
    random.shuffle(strategies)
    random.shuffle(tips)

    return {
        "medical_actions": actions[:3],
        "preventive_strategies": strategies[:3],
        "wellness_tips": tips[:3],
        "provider_guidance": guide[:5]
    }
