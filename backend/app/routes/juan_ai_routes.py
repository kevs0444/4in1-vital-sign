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
        # We need to match the EXACT order used in training
        # Features: ['age', 'age_group', 'gender', 'bmi', 'temp', 'spo2', 'hr', 'systolic', 'diastolic', 'rr']
        
        # --- SAFE DEFAULTS (IMPUTATION) ---
        # If a user is "only using BP", we default other values to "Normal/Healthy".
        # This isolates the risk prediction to ONLY the abnormal metrics the user actually measured.
        
        age = data.get('age') or 30 # Default to 30 if missing
        gender_str = data.get('sex', 'Male') 
        
        bmi = data.get('bmi')
        if not bmi or bmi == 0: bmi = 22.0 # Normal BMI
        
        temp = data.get('temperature')
        if not temp or temp == 0: temp = 36.5 # Normal Temp
        
        spo2 = data.get('spo2')
        if not spo2 or spo2 == 0: spo2 = 98 # Normal SpO2
        
        hr = data.get('heartRate')
        if not hr or hr == 0: hr = 75 # Normal Heart Rate
        
        systolic = data.get('systolic')
        diastolic = data.get('diastolic')
        if not systolic or systolic == 0: systolic = 115 # Normal BP
        if not diastolic or diastolic == 0: diastolic = 75 # Normal BP

        rr = data.get('respiratoryRate')
        if not rr or rr == 0: rr = 16 # Normal Respiratory Rate

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
            # Class 0=Low, 1=Moderate, 2=High
            probs = risk_model.predict_proba(input_scaled)[0]
            
            # Calculate a blended "Score" from 0-100 based on probabilities
            # (Low*0 + Mod*50 + High*100)
            risk_score = (probs[0] * 0) + (probs[1] * 50) + (probs[2] * 100)
            risk_score = int(round(risk_score))  # Convert to whole number integer

            # --- POST-PROCESSING: KEY VITALS RISK BOOSTER ---
            # If the user only provided partial data (e.g. only BP), the model might see 5 "Healthy" 
            # imputed values and 1 "Bad" value, resulting in a low score.
            # We must force-boost the score if any provided metric is critical.
            
            # BP Booster
            if (systolic >= 140 or diastolic >= 90):
                # Stage 2 Hypertension: Moderate-High (45+)
                risk_score = max(risk_score, 45.0)
            elif (systolic >= 130 or diastolic >= 80):
                 # Stage 1 Hypertension: Moderate (30+)
                risk_score = max(risk_score, 30.0)
            elif (systolic >= 120 and diastolic < 80):
                 # Elevated: Mild Risk (15+)
                risk_score = max(risk_score, 15.0)

            if (systolic >= 180 or diastolic >= 120):
                # Hypertensive Crisis: Critical (80+)
                risk_score = max(risk_score, 80.0)

            # SpO2 Booster
            if (spo2 < 95):
                risk_score = max(risk_score, 55.0)
            if (spo2 < 90):
                 risk_score = max(risk_score, 85.0)

            # Heart Rate Booster
            if (hr > 120 or hr < 50):
                 risk_score = max(risk_score, 50.0)
            elif (hr > 100 or hr < 60):
                 risk_score = max(risk_score, 25.0)

            # Temp Booster - High
            if (temp > 38.0):
                 risk_score = max(risk_score, 50.0)
            elif (temp > 37.5):
                 # Low grade fever: Moderate (25+)
                 risk_score = max(risk_score, 25.0)

            # Temp Booster - Low (Hypothermia)
            if (temp < 35.0):
                 # Moderate-Severe Hypothermia: High Risk (55+)
                 risk_score = max(risk_score, 55.0)
            elif (temp < 36.0):
                 # Mild Hypothermia: Moderate Risk (30+)
                 risk_score = max(risk_score, 30.0)

            if risk_score < 20: risk_level = "Low Risk"
            elif risk_score < 50: risk_level = "Moderate Risk"
            elif risk_score < 75: risk_level = "High Risk"
            else: risk_level = "Critical Risk"
            
            print(f"✅ Juan AI Prediction Complete!")
            print(f"   📊 Risk Score: {risk_score}%")
            print(f"   🏷️ Risk Level: {risk_level}")
        else:
            # Fallback Logic if model isn't trained yet
            print("⚠️ Model not loaded, using fallback logic")
            risk_score = 50 # Default
            risk_level = "Moderate Risk (Fallback)"

        
        # --- STEP 2: GENERATE ADVICE (LANGUAGE BRAIN) ---
        recommendations = generate_dynamic_advice(age, gender_str, risk_level, risk_score, data)

        return jsonify({
            'success': True,
            'risk_score': risk_score,
            'risk_level': risk_level,
            'recommendations': recommendations
        })

    except Exception as e:
        print(f"❌ Error in Juan AI: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'message': str(e)}), 500

def generate_dynamic_advice(age, gender, risk_level, score, vitals):
    """
    OFFLINE AI ENGINE (Rule-Based Expert System)
    Constructs dynamic text advice based on specific vital sign combinations.
    Does not require external APIs.
    """
    
    # --- 1. GATHER CONTEXT ---
    
    # Parse Vitals
    try:
        bmi = float(vitals.get('bmi', 0))
        temp = float(vitals.get('temperature', 0))
        spo2 = float(vitals.get('spo2', 0))
        hr = float(vitals.get('heartRate', 0))
        sys = float(vitals.get('systolic', 0))
        dia = float(vitals.get('diastolic', 0))
        rr = float(vitals.get('respiratoryRate', 0))
        age = int(age) if age else 30
    except:
        return get_fallback_advice(score)

    is_senior = age >= 60
    is_child = age < 18

def generate_dynamic_advice(age, gender, risk_level, score, vitals):
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

            # Construct a rich prompt
            prompt = f"""
            You are "Juan AI", an advanced medical assistant.
            Patient: {age} year old {gender}.
            Current Vitals:
            - BMI: {vitals.get('bmi', 'N/A')}
            - Temp: {vitals.get('temperature', 'N/A')} C
            - SpO2: {vitals.get('spo2', 'N/A')}%
            - Heart Rate: {vitals.get('heartRate', 'N/A')} bpm
            - BP: {vitals.get('systolic', 'N/A')}/{vitals.get('diastolic', 'N/A')} mmHg
            
            Risk Assessment: {risk_level} (Score: {score}/100)
            
            Task: Provide 4 short, empathetic, professional sections of advice.
            Output must be VALID JSON with these exact keys:
            "medical_action", "preventive_strategy", "wellness_tips", "provider_guidance"
            
            Content Guidelines:
            - medical_action: Immediate recommended action (e.g. "Consult cardiologist").
            - preventive_strategy: What to do this week.
            - wellness_tips: Diet/Lifestyle.
            - provider_guidance: A summary for the doctor.
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
    ENHANCED OFFLINE BRAIN
    Uses randomized templates to simulate 'Generative AI' locally.
    This creates a dynamic feel without needing heavy local LLMs.
    """
    import random
    
    medical_actions = []
    strategies = []
    wellness = []
    guidance = []

    # Parse Vitals Safely
    try:
        sys = float(vitals.get('systolic', 0))
        dia = float(vitals.get('diastolic', 0))
        spo2 = float(vitals.get('spo2', 0))
        hr = float(vitals.get('heartRate', 0))
        temp = float(vitals.get('temperature', 0))
        bmi = float(vitals.get('bmi', 0))
    except:
        sys=0; dia=0; spo2=0; hr=0; temp=0; bmi=0

    # --- 1. RANDOMIZED TEMPLATES (The "AI" Feel) ---
    
    # BP Logic
    if sys >= 140 or dia >= 90:
        medical_actions.append(random.choice([
            "Blood pressure is significantly elevated. Consult a doctor to rule out hypertension.",
            "High blood pressure detected. Medical evaluation is strongly advised.",
            "Your BP readings indicate Stage 2 Hypertension. Please see a physician."
        ]))
        strategies.append(random.choice([
            "Begin monitoring BP twice daily (morning and night).",
            "Track your blood pressure daily for the next 7 days.",
            "Keep a log of your BP readings to show your doctor."
        ]))
        wellness.append("Reduce sodium (salt) intake drastically.")
    elif sys >= 120 or dia >= 80:
        medical_actions.append("Blood pressure is slightly elevated.")
        strategies.append("Monitor BP daily for one week.")
    
    # SpO2 Logic
    if 0 < spo2 < 95:
        medical_actions.append(random.choice([
            "Oxygen saturation is below normal levels.",
            "SpO2 levels are lower than expected.",
            "Detected signs of potential hypoxia (low oxygen)."
        ]))
        strategies.append("Practice deep breathing exercises.")
    
    # Heart Rate Logic
    if hr > 100:
        medical_actions.append("Tachycardia (fast heart rate) detected.")
        strategies.append("Rest for 15 minutes and retake measurement.")
        wellness.append("Practice stress-reduction techniques like meditation.")
    elif 0 < hr < 60:
         medical_actions.append("Bradycardia (slow heart rate) detected.")

    # BMI Logic
    if bmi > 30:
        wellness.append(random.choice([
            "Focus on a calorie-controlled diet rich in vegetables.",
            "Consider a structured weight management plan.",
            "Aim for 150 minutes of moderate activity per week."
        ]))

    # High Risk Score Overrides
    if score >= 75:
        medical_actions.insert(0, random.choice([
            "URGENT: Critical health parameters detected.",
            "ATTENTION: Your aggregated risk score is high.",
            "WARNING: Multiple vitals are out of safe ranges."
        ]))
    
    # Defaults (Healthy User)
    if not medical_actions: 
        medical_actions.append(random.choice([
            "Vital signs are within normal ranges.",
            "No immediate medical concerns detected.",
            "You appear to be in good health based on these metrics."
        ]))
    if not strategies: 
        strategies.append(random.choice([
            "Continue routine health monitoring.",
            "Keep up your current health habits.",
            "Maintain your regular check-up schedule."
        ]))
    if not wellness: 
        wellness.append("Maintain a balanced diet and aim for 7-8 hours of sleep.")
    if not guidance: 
        guidance.append(f"Patient is currently stable (Risk Score: {score}).")

    return {
        "medical_action": " ".join(medical_actions),
        "preventive_strategy": " ".join(strategies),
        "wellness_tips": " ".join(wellness),
        "provider_guidance": " ".join(guidance)
    }
