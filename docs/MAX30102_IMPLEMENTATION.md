# MAX30102 Sensor Implementation Guide

## 🧪 STANDALONE TEST FILE

**Location:** `backend/arduino/test/max30102_test/max30102_test.ino`

Upload this standalone test to your Arduino to verify the sensor works correctly before using the main `all_sensors.ino`. Open Serial Monitor at **115200 baud**.

**Expected Output:**
```
>>> FINGER DETECTED <<<
Collecting samples... DONE
Time: 5 seconds
  Heart Rate:       72 BPM
  SpO2:             98 %
  Respiratory Rate: 18 breaths/min
MAX30102_LIVE_DATA:HR=72,SPO2=98,RR=18,VALID_HR=1,VALID_SPO2=1
```

---

## Overview
This document outlines the complete implementation logic for the MAX30102 pulse oximeter sensor across the system (Arduino, Backend, Frontend).

---

## 📋 Implementation Checklist

### ✅ Arduino Logic (`all_sensors.ino`)

| Feature | Status | Description |
|---------|--------|-------------|
| Buffer Size | ✅ | `BUFFER_SIZE = 100` for accurate readings |
| BPM Deduction | ✅ | `BPM_DEDUCTION = 25` applied to reduce inflated readings |
| Heart Rate Range | ✅ | Clamped to 30-200 BPM |
| Respiratory Rate Estimation | ✅ | Derived from HR using physiological ratios |
| Finger Detection Threshold | ✅ | IR value > 70,000 = finger detected |
| Instant Finger Removal | ✅ | Checked on every sample in buffer loop |
| No Timeout Break | ✅ | Buffer loop waits for all 100 samples |

### ✅ Backend Logic (`max30102_manager.py`)

| Feature | Status | Description |
|---------|--------|-------------|
| Serial Parsing | ✅ | Parses `MAX30102_LIVE_DATA:HR=X,SPO2=X,RR=X` |
| Finger Status | ✅ | Tracks `FINGER_DETECTED` / `FINGER_REMOVED` |
| Live Data Storage | ✅ | Stores HR, SpO2, RR in manager state |
| Status Endpoint | ✅ | `/sensor/max30102/status` returns all data |

### ✅ Frontend Logic (`Max30102.jsx`)

| Feature | Status | Description |
|---------|--------|-------------|
| Polling Rate | ✅ | 200ms polling interval |
| Debounce Time | ✅ | 50ms for instant finger removal detection |
| Reset on Removal | ✅ | Progress resets to 0% on finger removal |
| Data Collection | ✅ | Collects readings over 30 seconds |
| Final Averaging | ✅ | Computes average of all valid readings |

---

## 🔧 Arduino Implementation Details

### Constants
```cpp
#define BUFFER_SIZE 100          // Samples per batch
#define HR_HISTORY 5             // Median filter size
const int BPM_DEDUCTION = 25;    // Calibration offset
const unsigned long MAX30102_SAFETY_TIMEOUT = 60000; // 60s safety
```

### Respiratory Rate Estimation (User Logic)
```cpp
int estimateRespiratoryRate(int32_t bpm) {
  float rr;
  
  if (bpm < 40) rr = 8;
  else if (bpm >= 40 && bpm <= 100) rr = bpm / 4.0;
  else if (bpm > 100 && bpm <= 140) rr = bpm / 4.5;
  else rr = bpm / 5.0;

  if (rr < 8) rr = 8;
  if (rr > 40) rr = 40;
  return (int)rr;
}
```

### Heart Rate Calibration
```cpp
// After getting raw heartRate from algorithm:
heartRate -= BPM_DEDUCTION;  // Subtract 25 BPM
if (heartRate < 30) heartRate = 30;
if (heartRate > 200) heartRate = 200;
```

### Data Output Format
```
MAX30102_IR_VALUE:123456           // Raw IR for finger detection
FINGER_DETECTED                     // Finger placed
MAX30102_LIVE_DATA:HR=72,SPO2=98,RR=18,VALID_HR=1,VALID_SPO2=1
FINGER_REMOVED                      // Finger lifted
```

---

## 🔄 Data Flow

```
┌─────────────┐    Serial    ┌─────────────┐    HTTP/API    ┌─────────────┐
│   Arduino   │ ───────────► │   Backend   │ ─────────────► │  Frontend   │
│ MAX30102    │              │   Python    │                │   React     │
└─────────────┘              └─────────────┘                └─────────────┘

1. Arduino collects 100 samples
2. Runs SpO2 algorithm
3. Applies BPM calibration (-25)
4. Calculates RR from HR
5. Sends MAX30102_LIVE_DATA via Serial
6. Backend parses and stores data
7. Frontend polls /max30102/status every 200ms
8. Frontend displays live values
9. After 30s, frontend computes final average
```

---

## ⚡ Finger Removal Behavior

### Arduino Response
- **Detection**: IR value checked on EVERY sample in buffer loop
- **Threshold**: IR < 70,000 = finger removed
- **Action**: Immediately stops measurement, sends `FINGER_REMOVED`

### Frontend Response
- **Debounce**: 50ms (near-instant)
- **Action**: Calls `invalidateMeasurement()`
  - Stops timer
  - Resets progress to 0%
  - Clears all readings
  - Resets display to "--"

### Re-insertion Behavior
- Frontend calls `resetAndStartMeasurement()`
- Measurement restarts from 0 (fresh start)
- NO resume functionality (by design)

---

## 🐛 Known Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No data from sensor | Buffer loop exiting early | Removed timeout break |
| High BPM readings | Raw sensor inflation | Apply -25 BPM deduction |
| Progress not resetting | Function scope error | Fixed JS syntax |
| False finger detection | Low IR threshold | Raised to 70,000 |

---

## 📁 File Locations

| Component | File Path |
|-----------|-----------|
| Arduino | `backend/arduino/all_sensors/all_sensors.ino` |
| Backend Manager | `backend/app/sensors/managers/max30102_manager.py` |
| Backend Routes | `backend/app/routes/sensor_routes.py` |
| Frontend Page | `frontend/src/pages/MeasurementFlow/Max30102/Max30102.jsx` |
| Frontend API | `frontend/src/utils/api.js` |

---

## 🧪 Testing Checklist

- [ ] Sensor detects finger correctly (IR > 70k)
- [ ] Measurement starts automatically on finger detection
- [ ] Live HR, SpO2, RR values update on screen
- [ ] Progress bar advances smoothly
- [ ] Removing finger resets progress to 0%
- [ ] Re-inserting finger starts fresh measurement
- [ ] 30-second measurement completes with final values
- [ ] Values are within physiological ranges

---

*Last Updated: 2026-01-05*
