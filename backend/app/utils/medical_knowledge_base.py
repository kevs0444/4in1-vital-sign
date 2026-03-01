"""
Juan AI - Medical Knowledge Base
================================
A comprehensive, curated medical knowledge base that powers the offline
advice engine. Instead of basic if/else text, this provides hundreds of
varied, contextual, empathetic medical recommendations organized by:
- Vital sign category
- Severity level (mild, moderate, severe, critical)
- Patient demographics (age group, gender)
- Dangerous combinations

This is what makes the offline engine produce Gemini-quality responses.
"""

import random

# ===================================================================
# BLOOD PRESSURE KNOWLEDGE BASE
# ===================================================================
BP_ADVICE = {
    'crisis': {  # >180/120
        'actions': [
            "Your blood pressure reading is dangerously high. Please seek emergency medical attention immediately.",
            "This blood pressure level requires urgent medical intervention. Visit your nearest emergency room.",
            "A hypertensive crisis has been detected. Immediate medical evaluation is critical.",
            "Your BP is at a dangerous level. Do not delay — contact emergency services or go to the ER now.",
        ],
        'strategies': [
            "While waiting for medical care, sit quietly and try to remain calm.",
            "Do not engage in any physical activity until cleared by a doctor.",
            "If you experience chest pain, vision changes, or severe headache, call emergency services.",
            "Avoid eating salty foods or drinking caffeine while awaiting evaluation.",
        ],
        'tips': [
            "Keep a list of all current medications to share with the emergency team.",
            "Have someone drive you to the hospital — do not drive yourself.",
            "Loosen any tight clothing to help circulation.",
            "Practice slow, deep breathing to help stay calm.",
        ],
        'guidance': [
            "HYPERTENSIVE CRISIS ({sys}/{dia} mmHg). Requires immediate intervention. Rule out end-organ damage.",
            "Critical BP elevation ({sys}/{dia}). Evaluate for hypertensive emergency vs urgency. Assess for proteinuria, cardiac strain.",
            "Severe hypertension ({sys}/{dia}). Screen for acute target organ injury. Consider IV antihypertensive therapy.",
        ]
    },
    'stage2': {  # 140-179/90-119
        'actions': [
            "Your blood pressure is significantly elevated. Schedule a medical appointment this week.",
            "Stage 2 hypertension detected. Consult your doctor about a treatment plan.",
            "High blood pressure at this level may require medication. Please see a healthcare provider.",
            "Your BP readings indicate Stage 2 hypertension. A medical evaluation is strongly recommended.",
        ],
        'strategies': [
            "Record your blood pressure twice daily (morning and evening) for one week to track patterns.",
            "Measure BP at the same time each day, after sitting quietly for 5 minutes.",
            "Keep a blood pressure diary to share with your doctor at your next appointment.",
            "Avoid caffeine and heavy meals for 30 minutes before measuring your BP.",
        ],
        'tips': [
            "Reduce daily sodium intake to less than 2,300mg (about 1 teaspoon of salt).",
            "Try the DASH diet — rich in fruits, vegetables, and low-fat dairy products.",
            "Aim for 150 minutes of moderate physical activity per week.",
            "Reduce stress through meditation, yoga, or regular relaxation exercises.",
            "Limit alcohol consumption to no more than 1-2 drinks per day.",
        ],
        'guidance': [
            "Stage 2 HTN ({sys}/{dia} mmHg). Consider initiating dual antihypertensive therapy per JNC guidelines.",
            "Confirmed Stage 2 hypertension ({sys}/{dia}). Assess cardiovascular risk factors. Lipid panel and renal function recommended.",
            "BP {sys}/{dia}. Evaluate for secondary causes if young patient. Target organ damage screening advised.",
        ]
    },
    'stage1': {  # 130-139/80-89
        'actions': [
            "Your blood pressure is mildly elevated. Monitor it regularly over the coming weeks.",
            "Stage 1 hypertension has been noted. Lifestyle modifications are recommended as a first step.",
            "Your BP readings are above normal. Consider tracking your readings at home.",
            "Blood pressure is in the Stage 1 hypertension range. Discuss with your doctor at your next visit.",
        ],
        'strategies': [
            "Check your blood pressure at least twice a week at the same time.",
            "Monitor for headaches, dizziness, or chest discomfort which may indicate worsening.",
            "Bring your BP log to your next routine doctor appointment.",
            "Consider purchasing a validated home BP monitor for regular tracking.",
        ],
        'tips': [
            "Reduce salt in your cooking and avoid adding extra salt at the table.",
            "Walk briskly for 30 minutes most days of the week.",
            "Maintain a healthy weight — even losing 5 kg can lower your BP significantly.",
            "Limit alcohol and avoid smoking, which worsen blood pressure.",
            "Practice mindfulness or deep breathing to manage daily stress.",
        ],
        'guidance': [
            "Stage 1 HTN ({sys}/{dia}). Lifestyle modification trial for 3-6 months unless elevated ASCVD risk.",
            "Borderline high BP ({sys}/{dia}). Reassess in 3 months with lifestyle intervention. No pharmacotherapy needed initially.",
        ]
    },
    'elevated': {  # 120-129/<80
        'actions': [
            "Your blood pressure is slightly elevated but not yet in the hypertension range.",
            "Blood pressure is trending upward. This is a good time to adopt heart-healthy habits.",
            "Pre-hypertension detected. Early lifestyle changes can prevent it from worsening.",
        ],
        'strategies': [
            "Track your blood pressure monthly to watch for any upward trend.",
            "Schedule a routine check-up to discuss your cardiovascular health.",
        ],
        'tips': [
            "Focus on a diet rich in fruits, vegetables, and whole grains.",
            "Stay physically active — regular exercise helps regulate blood pressure.",
            "Manage stress through healthy outlets like exercise, hobbies, or socializing.",
        ],
        'guidance': [
            "Elevated BP ({sys}/{dia}). Pre-hypertension. Encourage lifestyle modification. Recheck in 3-6 months.",
        ]
    },
    'low': {  # <90/60
        'actions': [
            "Your blood pressure is lower than normal. Consult your doctor if you experience dizziness or fatigue.",
            "Low blood pressure detected. While sometimes normal, it can cause lightheadedness.",
            "Hypotension has been noted. Please discuss this with your healthcare provider.",
        ],
        'strategies': [
            "Rise slowly from sitting or lying positions to prevent dizziness.",
            "Stay well hydrated throughout the day.",
            "If you feel faint, sit or lie down immediately and elevate your legs.",
        ],
        'tips': [
            "Increase your fluid intake, especially water and electrolyte beverages.",
            "Eat smaller, more frequent meals to prevent post-meal blood pressure drops.",
            "Consider compression stockings if dizziness is frequent.",
        ],
        'guidance': [
            "Hypotension ({sys}/{dia}). Evaluate for orthostatic hypotension. Consider underlying causes.",
        ]
    }
}

# ===================================================================
# HEART RATE KNOWLEDGE BASE
# ===================================================================
HR_ADVICE = {
    'severe_tachy': {  # >120
        'actions': [
            "Your heart rate is very high. Seek medical attention to rule out cardiac issues.",
            "A significantly elevated heart rate has been detected. Please consult a doctor promptly.",
            "Severe tachycardia detected. Medical evaluation is recommended to determine the cause.",
            "Your heart is beating much faster than normal. This warrants a medical check-up.",
        ],
        'strategies': [
            "Rest in a comfortable, seated position and avoid any physical exertion.",
            "Try the Valsalva maneuver: bear down as if having a bowel movement for 10 seconds.",
            "Apply a cold, damp cloth to your face which may help slow your heart rate.",
            "Monitor for chest pain, shortness of breath, or palpitations.",
        ],
        'tips': [
            "Eliminate all caffeine and energy drinks from your diet immediately.",
            "Avoid alcohol and nicotine, which can worsen rapid heart rate.",
            "Ensure you are well-hydrated — dehydration can cause tachycardia.",
            "Practice slow, deep breathing exercises to activate your vagus nerve.",
        ],
        'guidance': [
            "Severe tachycardia ({hr} bpm). Recommend ECG and thyroid function tests. Evaluate for SVT, atrial flutter.",
            "HR {hr} bpm. Rule out dehydration, anemia, thyrotoxicosis, PE. Troponin if chest pain present.",
        ]
    },
    'mild_tachy': {  # 101-120
        'actions': [
            "Your heart rate is elevated. Rest for 15 minutes and recheck.",
            "A mildly elevated heart rate was detected. This may be due to stress, caffeine, or activity.",
            "Your pulse is above the normal resting range. Monitor for any accompanying symptoms.",
        ],
        'strategies': [
            "Recheck your heart rate after sitting quietly for at least 10 minutes.",
            "Track your resting heart rate each morning before getting out of bed.",
            "Note any triggers like caffeine, stress, or lack of sleep.",
        ],
        'tips': [
            "Reduce caffeine intake — try switching to decaf or herbal teas.",
            "Stay well hydrated throughout the day.",
            "Regular aerobic exercise can help lower your resting heart rate over time.",
            "Practice relaxation techniques like progressive muscle relaxation.",
        ],
        'guidance': [
            "Tachycardia ({hr} bpm). Likely sinus tachycardia. Consider anxiety, dehydration, or stimulant use.",
        ]
    },
    'severe_brady': {  # <50
        'actions': [
            "Your heart rate is significantly below normal. Please consult a cardiologist.",
            "A notably low heart rate was detected. Medical evaluation is important.",
            "Bradycardia at this level may cause symptoms. Seek medical advice.",
        ],
        'strategies': [
            "Report any symptoms of dizziness, fainting, extreme fatigue, or confusion to your doctor.",
            "Avoid sudden position changes that might worsen symptoms.",
        ],
        'tips': [
            "Avoid medications that slow heart rate unless prescribed by your doctor.",
            "Stay active with gentle, supervised exercise.",
        ],
        'guidance': [
            "Bradycardia ({hr} bpm). Rule out AV block, sick sinus syndrome. ECG and Holter monitor recommended.",
        ]
    },
    'mild_brady': {  # 50-59
        'actions': [
            "Your heart rate is on the lower side. This may be normal for athletic individuals.",
            "A mildly low heart rate was detected. Usually benign if you are physically active.",
        ],
        'strategies': [
            "Track your resting heart rate over a few days to establish your baseline.",
            "If you experience any lightheadedness or fatigue, consult your doctor.",
        ],
        'tips': [
            "Continue regular physical activity — a low resting HR is common in fit individuals.",
            "Stay well hydrated and maintain a balanced diet.",
        ],
        'guidance': [
            "Mild bradycardia ({hr} bpm). Likely physiologic if asymptomatic athlete. Monitor only.",
        ]
    }
}

# ===================================================================
# OXYGEN SATURATION (SpO2) KNOWLEDGE BASE
# ===================================================================
SPO2_ADVICE = {
    'severe': {  # <90
        'actions': [
            "Your oxygen level is critically low. Seek emergency medical care immediately.",
            "Dangerously low oxygen saturation detected. You may need supplemental oxygen.",
            "SpO2 below 90% is a medical emergency. Please go to the nearest emergency department.",
            "Your body is not getting enough oxygen. Immediate medical attention is critical.",
        ],
        'strategies': [
            "Sit upright to maximize lung expansion — do not lie flat.",
            "Take slow, deep breaths through your nose and exhale through pursed lips.",
            "Open windows or move to an area with good ventilation if possible.",
            "Do not perform any physical activity until your oxygen levels are evaluated.",
        ],
        'tips': [
            "If you have a history of lung disease, contact your pulmonologist immediately.",
            "Keep calm — anxiety can increase oxygen demand.",
            "Have someone stay with you until medical help arrives.",
        ],
        'guidance': [
            "Critical hypoxia (SpO2: {spo2}%). Immediate supplemental O2. Consider ABG, chest imaging. Evaluate for PE, pneumonia, ARDS.",
            "SpO2 {spo2}%. Respiratory failure threshold. Intubation readiness. Assess work of breathing.",
        ]
    },
    'moderate': {  # 90-94
        'actions': [
            "Your oxygen levels are below the normal range. Please consult your doctor soon.",
            "Low oxygen saturation detected. A medical evaluation is recommended.",
            "SpO2 is lower than ideal. This should be investigated by a healthcare provider.",
            "Your oxygen level needs attention. Schedule a medical appointment promptly.",
        ],
        'strategies': [
            "Practice deep breathing exercises 3-4 times daily to improve oxygen intake.",
            "Sleep with your head elevated on an extra pillow.",
            "Avoid smoking and secondhand smoke exposure completely.",
            "Monitor your SpO2 if you have a home pulse oximeter.",
        ],
        'tips': [
            "Ensure your living and sleeping areas are well-ventilated.",
            "Stay moderately active — light walking can help improve lung function.",
            "Avoid high altitudes until your oxygen levels normalize.",
            "Consider breathing exercises like diaphragmatic breathing or box breathing.",
        ],
        'guidance': [
            "Moderate hypoxia (SpO2: {spo2}%). Pulmonary workup recommended. Consider spirometry, CXR.",
            "SpO2 {spo2}%. Evaluate for COPD exacerbation, pneumonia, or cardiac cause. Home O2 assessment if persistent.",
        ]
    }
}

# ===================================================================
# TEMPERATURE KNOWLEDGE BASE
# ===================================================================
TEMP_ADVICE = {
    'high_fever': {  # >=39.0
        'actions': [
            "You have a high fever. Seek medical evaluation to determine the underlying cause.",
            "A significant fever has been detected. Medical attention is recommended.",
            "High body temperature detected. Please consult a doctor, especially if symptoms persist.",
            "Your fever is considerably elevated. A healthcare visit is strongly advised today.",
        ],
        'strategies': [
            "Monitor your temperature every 2 hours and record the readings.",
            "Take an appropriate dose of acetaminophen (paracetamol) if no contraindications.",
            "Watch for warning signs: stiff neck, rash, difficulty breathing, or persistent vomiting.",
            "Seek emergency care if the fever does not respond to medication within 2 hours.",
        ],
        'tips': [
            "Stay well hydrated — drink water, clear broths, and electrolyte solutions.",
            "Wear light, breathable clothing and use a light blanket.",
            "Take a lukewarm (not cold) sponge bath to help lower your temperature.",
            "Rest as much as possible to allow your body to fight the infection.",
        ],
        'guidance': [
            "High fever ({temp}C). Rule out bacterial infection, UTI, pneumonia. CBC, blood cultures if persistent >48hrs.",
            "Febrile ({temp}C). Assess for source. Consider empiric antibiotics if systemic signs present.",
        ]
    },
    'moderate_fever': {  # 38.0-38.9
        'actions': [
            "A moderate fever has been detected. Monitor closely and rest.",
            "Your temperature is above normal. This may indicate your body is fighting an infection.",
            "Moderate fever noted. Keep track of your symptoms over the next 24 hours.",
        ],
        'strategies': [
            "Check your temperature every 4 hours.",
            "If the fever persists for more than 48 hours, consult your doctor.",
            "Note any other symptoms like sore throat, cough, or body aches.",
        ],
        'tips': [
            "Stay hydrated with water, herbal teas, and clear soups.",
            "Rest and avoid strenuous activities.",
            "A lukewarm bath can help you feel more comfortable.",
            "Eat light, nutritious meals even if your appetite is reduced.",
        ],
        'guidance': [
            "Moderate fever ({temp}C). Likely infectious etiology. Symptomatic management. Follow-up if >48hrs.",
        ]
    },
    'low_grade': {  # 37.3-37.9
        'actions': [
            "A mild fever has been detected. This is usually not serious but worth monitoring.",
            "You have a slightly elevated temperature. Keep an eye on it over the next day.",
            "Low-grade fever noted. Your body may be fighting a mild infection.",
        ],
        'strategies': [
            "Monitor for any progression or additional symptoms.",
            "Continue with your normal routine unless you feel unwell.",
            "Recheck your temperature tomorrow morning.",
        ],
        'tips': [
            "Drink plenty of fluids to stay hydrated.",
            "Get a good night's sleep to support your immune system.",
            "Eat fruits rich in vitamin C to boost immune function.",
        ],
        'guidance': [
            "Low-grade fever ({temp}C). Likely viral or stress-related. Observe and reassess in 24-48hrs.",
        ]
    },
    'hypothermia': {  # <35.0
        'actions': [
            "Your body temperature is below normal. Please warm up gradually and monitor.",
            "Hypothermia risk detected. Ensure you are in a warm environment.",
        ],
        'strategies': [
            "Wrap yourself in warm blankets and drink warm (not hot) beverages.",
            "Move to a warmer environment. Avoid cold exposure.",
        ],
        'tips': [
            "Layer your clothing and cover your head to retain body heat.",
            "Eat warm, calorie-rich foods to generate body heat.",
        ],
        'guidance': [
            "Hypothermia risk ({temp}C). Evaluate for environmental exposure, hypothyroidism, or sepsis (paradoxical).",
        ]
    }
}

# ===================================================================
# BMI KNOWLEDGE BASE (Asian Standards)
# ===================================================================
BMI_ADVICE = {
    'obese_II': {  # >=30 Asian
        'actions': [
            "Your BMI indicates obesity. A structured weight management plan with medical guidance is recommended.",
            "Based on your BMI, consulting a nutritionist and your doctor about a comprehensive plan would be beneficial.",
            "Your weight is in a range that increases health risks. A medical evaluation for metabolic health is advised.",
        ],
        'strategies': [
            "Set a realistic initial goal of losing 5-10% of your current body weight.",
            "Work with a dietitian to create a sustainable, personalized meal plan.",
            "Start with low-impact exercise like walking, swimming, or cycling for 30 minutes daily.",
        ],
        'tips': [
            "Replace sugary drinks with water, herbal tea, or infused water.",
            "Eat more protein and fiber to stay fuller for longer.",
            "Use smaller plates to help with portion control.",
            "Avoid eating late at night — try to finish dinner 3 hours before bed.",
            "Cook meals at home more often to control ingredients and portions.",
        ],
        'guidance': [
            "Obesity (BMI {bmi}, Asian classification). Screen for metabolic syndrome, T2DM, dyslipidemia. HbA1c, lipid panel.",
        ]
    },
    'obese_I': {  # 25-29.9 Asian
        'actions': [
            "Your BMI is above the healthy range for your population. Weight management is recommended.",
            "Based on Asian BMI standards, you are in the obese category. Discussing this with your doctor is important.",
        ],
        'strategies': [
            "Aim for at least 150 minutes of moderate physical activity per week.",
            "Keep a food diary for one week to identify areas for improvement.",
            "Set small, achievable goals — like losing 0.5 kg per week.",
        ],
        'tips': [
            "Prioritize whole foods — vegetables, lean meats, and whole grains.",
            "Reduce portion sizes gradually rather than skipping meals.",
            "Walk 10,000 steps per day as a sustainable fitness goal.",
            "Choose steamed or grilled foods over fried options.",
        ],
        'guidance': [
            "Obese Class I by Asian standards (BMI {bmi}). Lifestyle modification primary. Comorbidity screening recommended.",
        ]
    },
    'overweight': {  # 23-24.9 Asian
        'actions': [
            "Your BMI is slightly above the ideal range. Small lifestyle adjustments can help.",
            "You are in the overweight category by Asian standards. Preventive action is recommended.",
        ],
        'strategies': [
            "Increase your daily physical activity — even 30 minutes of brisk walking helps.",
            "Monitor your weight weekly to catch any upward trends early.",
        ],
        'tips': [
            "Choose water over sugary or sweetened beverages.",
            "Add more vegetables to each meal to increase fiber and reduce calories.",
            "Take the stairs instead of the elevator whenever possible.",
        ],
        'guidance': [
            "Overweight by Asian BMI standards (BMI {bmi}). Lifestyle counseling. Preventive approach.",
        ]
    },
    'underweight': {  # <18.5
        'actions': [
            "Your BMI suggests you are underweight. A nutritional assessment may be helpful.",
            "You may not be getting enough calories or nutrients. Consider consulting a nutritionist.",
        ],
        'strategies': [
            "Eat smaller, more frequent meals throughout the day (5-6 meals).",
            "Track your daily caloric intake to ensure you are meeting your needs.",
        ],
        'tips': [
            "Include calorie-dense, healthy foods like nuts, avocados, and olive oil.",
            "Add protein to every meal — eggs, chicken, fish, legumes, or dairy.",
            "Pair strength training with increased nutrition to build healthy muscle mass.",
        ],
        'guidance': [
            "Underweight (BMI {bmi}). Screen for malnutrition, thyroid disorders, malabsorption. CBC, albumin, TSH.",
        ]
    }
}

# ===================================================================
# RESPIRATORY RATE KNOWLEDGE BASE
# ===================================================================
RR_ADVICE = {
    'tachypnea': {  # >24
        'actions': [
            "Your breathing rate is rapid. This may indicate respiratory distress or an underlying issue.",
            "Tachypnea detected. Please seek medical evaluation if you feel short of breath.",
            "Rapid breathing has been noted. Medical attention is recommended to determine the cause.",
        ],
        'strategies': [
            "Practice pursed-lip breathing: inhale through nose for 4 counts, exhale through pursed lips for 6 counts.",
            "Rest in a comfortable, upright position to ease breathing.",
            "Monitor for any worsening breathlessness, chest pain, or blue discoloration of lips.",
        ],
        'tips': [
            "Stay in a well-ventilated area with fresh air.",
            "Avoid exertion until your breathing rate normalizes.",
            "Practice relaxation techniques to reduce anxiety-related fast breathing.",
        ],
        'guidance': [
            "Tachypnea ({rr}/min). Evaluate for pneumonia, PE, metabolic acidosis, anxiety. CXR if indicated.",
        ]
    },
    'elevated': {  # 21-24
        'actions': [
            "Your respiratory rate is slightly elevated. Monitor for any breathing difficulties.",
            "Breathing rate is above normal range. This may be due to exertion, anxiety, or mild illness.",
        ],
        'strategies': [
            "Practice controlled breathing exercises to help regulate your rate.",
            "Note whether your breathing rate returns to normal after resting for 10 minutes.",
        ],
        'tips': [
            "Stay calm and practice deep, slow breathing.",
            "Ensure your environment has good air quality and ventilation.",
        ],
        'guidance': [
            "Mildly elevated RR ({rr}/min). Consider anxiety, pain, or early respiratory process. Reassess.",
        ]
    },
    'bradypnea': {  # <12
        'actions': [
            "Your breathing rate is slower than normal. Please monitor for drowsiness or confusion.",
            "A low respiratory rate was detected. This should be evaluated if persistent.",
        ],
        'strategies': [
            "Stay alert and report any excessive drowsiness to your healthcare provider.",
            "Ensure you are not taking medications that may suppress breathing.",
        ],
        'tips': [
            "Sit upright to promote better lung expansion.",
            "Stay in an area with fresh, well-circulated air.",
        ],
        'guidance': [
            "Bradypnea ({rr}/min). Evaluate medication effects (opioids, sedatives), CNS pathology.",
        ]
    }
}

# ===================================================================
# COMBINATION KNOWLEDGE BASE
# ===================================================================
COMBO_ADVICE = {
    'sirs': {  # Fever + Tachycardia
        'actions': [
            "The combination of fever and rapid heartbeat may indicate a systemic infection. Seek medical evaluation today.",
            "Fever with elevated heart rate can be a sign of your body fighting a significant infection. Please see a doctor.",
        ],
        'strategies': [
            "Have a same-day medical assessment. Do not wait to see if symptoms resolve on their own.",
            "Monitor for additional warning signs: chills, rapid breathing, confusion, or skin changes.",
        ],
        'tips': [
            "Stay hydrated with electrolyte drinks and water.",
            "Do not take anti-inflammatory medications without consulting a doctor first.",
        ],
        'guidance': [
            "SIRS criteria concern: Fever ({temp}C) + Tachycardia ({hr} bpm). Screen for sepsis. Lactate, blood cultures, CBC.",
        ]
    },
    'respiratory_distress': {  # Low SpO2 + High RR
        'actions': [
            "Low oxygen with rapid breathing is a sign of respiratory distress. Seek immediate medical care.",
            "Your body is struggling to maintain adequate oxygen. Emergency medical evaluation is needed.",
        ],
        'strategies': [
            "Sit fully upright — do not lie flat. This position helps your lungs work better.",
            "If available, use supplemental oxygen as previously prescribed.",
        ],
        'tips': [
            "Open windows for maximum fresh air circulation.",
            "Stay as calm as possible — panic increases oxygen demand.",
        ],
        'guidance': [
            "Respiratory distress: SpO2 {spo2}% + RR {rr}/min. Immediate O2, ABG, CXR. Assess for ARDS, PE, pneumonia.",
        ]
    },
    'metabolic_syndrome': {  # High BP + Obesity
        'actions': [
            "High blood pressure combined with elevated weight puts you at increased cardiovascular risk.",
            "The combination of hypertension and obesity is a key marker for metabolic syndrome.",
        ],
        'strategies': [
            "Losing just 5% of your body weight can significantly improve your blood pressure.",
            "Follow the DASH diet, which is proven to lower both weight and blood pressure.",
        ],
        'tips': [
            "Replace processed and fast food with home-cooked meals rich in vegetables.",
            "Walk for 30 minutes after your largest meal each day.",
        ],
        'guidance': [
            "Metabolic syndrome risk: HTN ({sys}/{dia}) + BMI {bmi}. Screen for T2DM, dyslipidemia. Fasting glucose, HbA1c, lipid panel.",
        ]
    },
    'cv_strain': {  # High BP + Tachycardia
        'actions': [
            "Elevated blood pressure with a fast heart rate puts strain on your cardiovascular system. Seek evaluation.",
            "The combination of high BP and rapid pulse increases cardiac workload. Medical assessment is recommended.",
        ],
        'strategies': [
            "Avoid all physical exertion until evaluated by a doctor.",
            "Practice deep, slow breathing to help reduce sympathetic nervous system activation.",
        ],
        'tips': [
            "Avoid stimulants like caffeine, nicotine, and energy drinks.",
            "Stay well hydrated and rest in a comfortable position.",
        ],
        'guidance': [
            "Cardiovascular strain: HTN ({sys}/{dia}) + Tachycardia ({hr} bpm). ECG, troponin if chest pain. Evaluate cardiac workload.",
        ]
    }
}

# ===================================================================
# HEALTHY / LOW RISK KNOWLEDGE BASE
# ===================================================================
HEALTHY_ADVICE = {
    'excellent': {  # score < 5
        'actions': [
            "All your vital signs are within excellent range. Great job maintaining your health!",
            "Your health assessment shows excellent results. Keep up your current healthy habits.",
            "Vital signs look excellent. No immediate health concerns detected.",
        ],
        'strategies': [
            "Continue annual health check-ups for ongoing preventive care.",
            "Maintain your current lifestyle and health habits.",
            "Consider advanced preventive screenings appropriate for your age.",
        ],
        'tips': [
            "Stay active with at least 150 minutes of moderate exercise per week.",
            "Maintain a balanced diet rich in whole foods, lean proteins, and vegetables.",
            "Prioritize 7-8 hours of quality sleep each night.",
            "Stay socially active — strong social connections benefit both mental and physical health.",
        ],
        'guidance': [
            "All vitals within normal limits. Excellent health status. Routine age-appropriate screening only.",
        ]
    },
    'good': {  # score 5-14
        'actions': [
            "Your vital signs are within the normal range. Continue your healthy lifestyle.",
            "No significant health concerns detected. Keep monitoring your health regularly.",
            "Your health assessment is reassuring. Maintain your current healthy routines.",
        ],
        'strategies': [
            "Schedule routine check-ups every 6-12 months for preventive care.",
            "Keep a record of your vital signs to track any changes over time.",
        ],
        'tips': [
            "Stay active with daily exercise — even 30 minutes of walking makes a difference.",
            "Drink at least 8 glasses of water daily.",
            "Include fruits and vegetables in every meal.",
            "Manage stress through hobbies, exercise, or mindfulness practices.",
        ],
        'guidance': [
            "Vitals within normal limits. Low risk profile. Routine preventive care recommended.",
        ]
    },
    'borderline': {  # score 15-19
        'actions': [
            "Your vital signs are generally normal with minor variations. No immediate action needed.",
            "Results are mostly within normal range. Continue monitoring and maintain healthy habits.",
        ],
        'strategies': [
            "Maintain a balanced diet and regular exercise routine.",
            "Consider tracking your vitals monthly for early detection of any changes.",
        ],
        'tips': [
            "Drink 8 glasses of water daily and aim for 7-8 hours of sleep.",
            "Add more movement to your daily routine — take walks, stretch, or use stairs.",
            "Reduce intake of processed foods, sugar, and excess salt.",
        ],
        'guidance': [
            "Vitals near-normal range. Borderline findings may warrant observation. Preventive lifestyle recommended.",
        ]
    }
}

# ===================================================================
# AGE & GENDER KNOWLEDGE BASE
# ===================================================================
AGE_GENDER_ADVICE = {
    'senior': {
        'strategies': [
            "Ensure fall-prevention measures at home — remove loose rugs and improve lighting.",
            "Have your medications reviewed annually for potential interactions or side effects.",
            "Consider yearly cognitive screening as part of routine health maintenance.",
        ],
        'tips': [
            "Consider calcium and vitamin D supplementation for bone health.",
            "Stay socially active — isolation can impact both mental and physical health.",
            "Engage in balance exercises like tai chi to reduce fall risk.",
        ]
    },
    'female_postmenopausal': {
        'strategies': [
            "Discuss bone density screening with your doctor.",
            "Include weight-bearing exercises to maintain bone strength.",
        ],
        'tips': [
            "Prioritize calcium-rich foods: dairy, leafy greens, fortified foods.",
            "Consider discussing hormone health with your healthcare provider.",
        ]
    },
    'young_adult': {
        'tips': [
            "Build healthy habits now — they become the foundation for lifelong health.",
            "Stay active with a mix of cardio and strength training.",
        ]
    }
}


def select_advice(pool, vitals_data=None, count=2):
    """Randomly select from a pool of advice, formatting with patient data."""
    items = random.sample(pool, min(count, len(pool)))
    if vitals_data:
        items = [item.format(**vitals_data) for item in items]
    return items
