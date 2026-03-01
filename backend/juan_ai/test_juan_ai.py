import requests

print("--- Testing API Endpoint ---")
url = "http://localhost:5000/api/juan_ai/predict-risk"

# Test 1: Completely Healthy
healthy_payload = {
    "age": 25,
    "sex": "Female",
    "bmi": 21.0,
    "temperature": 36.5,
    "spo2": 98,
    "heartRate": 75,
    "systolic": 115,
    "diastolic": 75,
    "respiratoryRate": 16
}

resp = requests.post(url, json=healthy_payload)
print("Healthy Patient Response:")
if resp.status_code == 200:
    data = resp.json()
    print(f"Risk Score: {data.get('risk_score')}% - {data.get('risk_level')}")
else:
    print(f"Failed: {resp.status_code}")

# Test 2: Moderate Risk (1 critical, 1 mild off)
mod_payload = {
    "age": 45,
    "sex": "Male",
    "bmi": 28.0, # overweight
    "temperature": 37.8, # mild fever
    "spo2": 96,
    "heartRate": 85,
    "systolic": 145, # high BP
    "diastolic": 95,
    "respiratoryRate": 18
}

resp2 = requests.post(url, json=mod_payload)
print("\nModerate Patient Response:")
if resp2.status_code == 200:
    data = resp2.json()
    print(f"Risk Score: {data.get('risk_score')}% - {data.get('risk_level')}")
else:
    print(f"Failed: {resp2.status_code}")

# Test 3: Critical Patient
crit_payload = {
    "age": 70,
    "sex": "Male",
    "bmi": 35.0,
    "temperature": 39.5,
    "spo2": 85,
    "heartRate": 130,
    "systolic": 185,
    "diastolic": 110,
    "respiratoryRate": 28
}

resp3 = requests.post(url, json=crit_payload)
print("\nCritical Patient Response:")
if resp3.status_code == 200:
    data = resp3.json()
    print(f"Risk Score: {data.get('risk_score')}% - {data.get('risk_level')}")
else:
    print(f"Failed: {resp3.status_code}")
    
