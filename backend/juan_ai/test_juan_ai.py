import requests
import copy

print("--- Testing Juan AI with all 15 Combinations ---")
url = "http://localhost:5000/api/juan-ai/predict-risk"

# Base moderate patient
base_payload = {
    "age": 45,
    "sex": "Male",
    "bmi": 28.0,
    "temperature": 37.8,
    "spo2": 96,
    "heartRate": 85,
    "systolic": 145,
    "diastolic": 95,
    "respiratoryRate": 18
}

print(f"Base Patient Details: Age {base_payload['age']}, {base_payload['sex']}")
print("Iterating through all 15 valid module combinations (At least 1 required):\n")

for i in range(1, 16):
    payload = copy.deepcopy(base_payload)
    
    # 0th bit: Max30102 (SpO2, HR, RR)
    has_max = (i & 1) == 0
    # 1st bit: BP
    has_bp = (i & 2) == 0
    # 2nd bit: Temp
    has_temp = (i & 4) == 0
    # 3rd bit: BMI
    has_bmi = (i & 8) == 0
    
    combination_name = []
    
    if not has_max:
        del payload["spo2"]
        del payload["heartRate"]
        del payload["respiratoryRate"]
    else:
        combination_name.append("Max30102")
        
    if not has_bp:
        del payload["systolic"]
        del payload["diastolic"]
    else:
        combination_name.append("BP")

    if not has_temp:
        del payload["temperature"]
    else:
        combination_name.append("Temp")

    if not has_bmi:
        del payload["bmi"]
    else:
        combination_name.append("BMI")

    if len(combination_name) == 0:
        continue # Skip the impossible 0-module state
    else:
        combo_str = " + ".join(combination_name)

    resp = requests.post(url, json=payload)
    if resp.status_code == 200:
        data = resp.json()
        print(f"[{i}/15] Combo: {combo_str:<40} => Risk Score: {data.get('risk_score')}%")
    else:
        print(f"[{i}/15] Combo: {combo_str:<40} => Failed! ({resp.status_code})")
