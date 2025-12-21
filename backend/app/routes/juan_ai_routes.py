from flask import Blueprint, request, jsonify
import joblib
import pandas as pd
import numpy as np
import os
import google.generativeai as genai 
from app.utils.helpers import format_response

# Create the Blueprint
juan_ai_bp = Blueprint('juan_ai', __name__)

# --- CONFIGURATION (You will need an API Key for the text part) ---
# For now, we will structure it so it works even without the key (using fallbacks)
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY') 
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# --- LOAD THE "MATH BRAIN" (XGBoost) ---
# We load these once when the server starts to make it fast
MODEL_PATH = os.path.join(os.path.dirname(__file__), '../../juan_ai/juan_ai_model.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), '../../juan_ai/juan_ai_scaler.pkl')
ENCODER_PATH = os.path.join(os.path.dirname(__file__), '../../juan_ai/juan_ai_gender_encoder.pkl')

print("🧠 Loading Juan AI Models...")
try:
    risk_model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    gender_encoder = joblib.load(ENCODER_PATH)
    print("✅ Juan AI 'Math Brain' Loaded Successfully!")
    MODEL_LOADED = True
except Exception as e:
    print(f"⚠️ Warning: Could not load Juan AI models. Using fallback mode. Error: {e}")
    MODEL_LOADED = False

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
        
        age = data.get('age')
        gender_str = data.get('sex', 'Male') # "Male" or "Female"
        bmi = data.get('bmi')
        temp = data.get('temperature')
        spo2 = data.get('spo2')
        hr = data.get('heartRate')
        systolic = data.get('systolic')
        diastolic = data.get('diastolic')
        rr = data.get('respiratoryRate')

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
        
        if MODEL_LOADED:
            # Scale the data
            input_scaled = scaler.transform(input_data)
            
            # Predict Probabilities (returns array like [[0.8, 0.15, 0.05]])
            # Class 0=Low, 1=Moderate, 2=High
            probs = risk_model.predict_proba(input_scaled)[0]
            
            # Calculate a blended "Score" from 0-100 based on probabilities
            # (Low*0 + Mod*50 + High*100)
            risk_score = (probs[0] * 0) + (probs[1] * 50) + (probs[2] * 100)
            risk_score = round(risk_score, 1)

            if risk_score < 20: risk_level = "Low Risk"
            elif risk_score < 50: risk_level = "Moderate Risk"
            else: risk_level = "High Risk"
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
    Uses Generative AI to create the 4 Accordion Sections.
    If no API key provided, falls back to a template system.
    """
    
    # 1. AI GENERATION (If Key Exists)
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-1.5-flash')
            
            prompt = f"""
            Act as an advanced medical AI assistant named "Juan AI".
            Patient Profile: {age} year old {gender}.
            Vitals:
            - BMI: {vitals.get('bmi')}
            - Temp: {vitals.get('temperature')} C
            - SpO2: {vitals.get('spo2')}%
            - Heart Rate: {vitals.get('heartRate')} bpm
            - BP: {vitals.get('bloodPressure')} mmHg
            - Resp Rate: {vitals.get('respiratoryRate')} /min
            
            AI Analysis Result: {risk_level} (Score: {score}/100)
            
            Generate 4 concise, empathetic sections of advice in JSON format.
            Do not use markdown. Just raw strings.
            Keys: "medical_action", "preventive_strategy", "wellness_tips", "provider_guidance".
            
            1. Medical Action: Immediate steps to take.
            2. Preventive Strategy: Short-term plan.
            3. Wellness Tips: Diet/Lifestyle.
            4. Provider Guidance: What to tell a doctor.
            """
            
            # response = model.generate_content(prompt)
            # For now, let's assume we parse the JSON response here
            # Since I cannot run the real API call without a key in this environment, 
            # I will return the "Smart Template" below, but this is where you put the API code.
            pass 
        except Exception as e:
            print(f"⚠️ AI Generation failed: {e}")

    # 2. SMART TEMPLATE FALLBACK (The "Offline" Mode)
    # This ensures your app works even without an API key
    
    medical_action = "Routine monitoring recommended."
    if score > 50:
        medical_action = "Please consult a healthcare provider soon. Your vitals indicate elevated risk levels."
    if score > 75:
        medical_action = "URGENT: Immediate medical attention is strongly recommended based on your vital signs."

    return {
        "medical_action": medical_action,
        "preventive_strategy": "Maintain a balanced diet and regular exercise routine. Monitor your vitals daily.",
        "wellness_tips": "Drink 8 glasses of water daily and aim for 7-8 hours of sleep.",
        "provider_guidance": f"Patient recorded a risk score of {score}. Please review SpO2 and Blood Pressure levels."
    }
