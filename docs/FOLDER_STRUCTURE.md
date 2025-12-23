# Project Folder Structure (Auto-Generated)

Values are based on actual file system scan as of 2025-12-24.

## 4IN1-VITAL-SIGN/

```
4IN1-VITAL-SIGN/
│
├── backend/
│   │
│   ├── ai_camera/                       # 📸 AI Camera Detection
│   │   ├── detection/
│   │   │   └── dual_camera_detect.py
│   │   ├── models/
│   │   │   ├── wearables.pt
│   │   │   ├── weight.pt
│   │   │   └── yolo11n.pt
│   │   └── requirements.txt
│   │
│   ├── app/
│   │   ├── models/
│   │   │   ├── __init__.py
│   │   │   ├── user_model.py
│   │   │   └── verification_code_model.py
│   │   │
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── admin_routes.py
│   │   │   ├── bp_ai_camera.py
│   │   │   ├── camera_routes.py
│   │   │   ├── forgot_password_routes.py
│   │   │   ├── juan_ai_routes.py
│   │   │   ├── login_routes.py
│   │   │   ├── main_routes.py
│   │   │   ├── print_routes.py
│   │   │   ├── register_routes.py
│   │   │   ├── sensor_routes.py
│   │   │   └── share_routes.py
│   │   │
│   │   ├── sensors/
│   │   │   ├── __init__.py
│   │   │   ├── all_sensors_controller.py
│   │   │   ├── bp_sensor_controller.py
│   │   │   ├── camera_manager.py
│   │   │   └── sensor_manager.py
│   │   │
│   │   ├── utils/
│   │   │   ├── __init__.py
│   │   │   ├── db.py
│   │   │   └── helpers.py
│   │   │
│   │   ├── __init__.py
│   │   └── config.py
│   │
│   ├── arduino/
│   │   ├── all_sensors/
│   │   │   └── all_sensors.ino
│   │   └── bp_sensors/
│   │       └── bp_sensor.ino
│   │
│   ├── juan_ai/                         # 🧠 Juan AI Training (New)
│   │   ├── HOW_TO_TRAIN_ON_COLAB.md
│   │   ├── generate_dataset.py
│   │   ├── juan_ai_dataset.csv
│   │   ├── juan_ai_model.pkl
│   │   └── train_model.py
│   │
│   ├── run.py
│   └── requirements.txt
│
├── frontend/
│   │
│   ├── public/
│   │   ├── index.html
│   │   ├── logo.png
│   │   └── manifest.json
│   │
│   ├── src/
│   │   ├── assets/
│   │   │   ├── fonts/
│   │   │   ├── icons/
│   │   │   └── images/
│   │   │
│   │   ├── components/
│   │   │   ├── Button/
│   │   │   ├── Cards/
│   │   │   ├── Footer/
│   │   │   ├── Header/
│   │   │   └── InactivityWrapper/
│   │   │
│   │   ├── pages/
│   │   │   ├── Dashboards/
│   │   │   │   ├── Admin/
│   │   │   │   ├── Doctor/
│   │   │   │   ├── Employee/
│   │   │   │   ├── Nurse/
│   │   │   │   └── Student/
│   │   │   │
│   │   │   ├── ForgotPassword/
│   │   │   │   ├── ForgotPassword.jsx
│   │   │   │   └── ForgotPassword.css
│   │   │   │
│   │   │   ├── Login/
│   │   │   │   ├── Login.jsx
│   │   │   │   └── Login.css
│   │   │   │
│   │   │   ├── MeasurementFlow/
│   │   │   │   ├── AILoading/
│   │   │   │   ├── BloodPressure/
│   │   │   │   ├── BMI/
│   │   │   │   ├── BodyTemp/
│   │   │   │   ├── Checklist/
│   │   │   │   ├── Max30102/
│   │   │   │   ├── MeasurementWelcome/
│   │   │   │   ├── Result/
│   │   │   │   ├── Saving/
│   │   │   │   ├── Sharing/
│   │   │   │   ├── Starting/
│   │   │   │   └── main-components-measurement.css
│   │   │   │
│   │   │   ├── NotFound/
│   │   │   │
│   │   │   ├── RegisterFlow/
│   │   │   │   ├── RegisterDataSaved/
│   │   │   │   ├── RegisterPersonalInfo/
│   │   │   │   ├── RegisterRole/
│   │   │   │   ├── RegisterTapID/
│   │   │   │   └── RegisterWelcome/
│   │   │   │
│   │   │   └── Standby/
│   │   │
│   │   ├── utils/
│   │   │   ├── afkHandler.js
│   │   │   ├── api.js
│   │   │   ├── auth.js
│   │   │   ├── checklistNavigation.js
│   │   │   ├── roleUtils.js
│   │   │   └── utils.js
│   │   │
│   │   ├── App.js
│   │   ├── index.js
│   │   ├── routes.js
│   │   ├── setupProxy.js
│   │   └── style.css
│   │
│   ├── package.json
│   ├── package-lock.json
│   └── README.md
```
