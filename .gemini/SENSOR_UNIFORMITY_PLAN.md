# Sensor Uniformity & Power Management Fix Plan

## Objective
Make all sensors (MAX30102, Weight, Height, Temperature) stream data at **uniform 100ms intervals** and fix logical power management.

## Current Issues

### 1. Inconsistent Data Streaming Intervals
- **MAX30102**: ~250ms (Arduino processes 50 samples)
- **Weight**: ~100ms (correct)
- **Height**: ~100ms (correct)
- **Temperature**: ~200ms
- **Frontend polling**: varies between components

### 2. Power Management
- **MAX30102**: Has proper power on/off (Arduino keeps sensor active)
- **Weight**: Missing POWER_UP_WEIGHT command in Arduino
- **Height**: Missing POWER_UP_HEIGHT command in Arduino
- **Temperature**: Missing POWER_UP_TEMPERATURE command in Arduino

## Solution Plan

### Phase 1: Arduino - Standardize Streaming (100ms)
- [ ] MAX30102: Reduce sample buffer from 50 to 25 for faster processing
- [ ] Weight: Keep 100ms (already correct)
- [ ] Height: Keep 100ms (already correct)
- [ ] Temperature: Reduce from 200ms to 100ms

### Phase 2: Arduino - Fix Power Management
- [ ] Weight: Remove physical powerDown (keep LOGICAL flag only)
- [ ] Height: Remove physical powerDown (keep LOGICAL flag only)
- [ ] Temperature: Remove physical powerDown (keep LOGICAL flag only)
- [ ] All: Power flags control data streaming, not hardware

### Phase 3: Backend - Standardize Logging
- [ ] All managers: Uniform log format
- [ ] All managers: Same data structure
- [ ] All managers: Same response format

### Phase 4: Frontend - Uniform 100ms Polling
- [ ] MAX30102.jsx: Change to 100ms polling
- [ ] BMI components: Ensure 100ms polling
- [ ] Temperature: Ensure 100ms polling
- [ ] Maintenance.jsx: Ensure 100ms polling for testing

## Implementation Details

### Arduino Changes

#### runMax30102Phase() - Line ~535
```cpp
// BEFORE: 50 samples = ~250ms
for (byte i = 0; i < BUFFER_SIZE; i++) { ... }

// AFTER: 25 samples = ~100ms
for (byte i = 0; i < 25; i++) { ... }
```

#### runTemperaturePhase() - Line ~1050
```cpp
// BEFORE: 200ms interval
#define TEMPERATURE_READ_INTERVAL 200

// AFTER: 100ms interval
  if (currentTime - lastTemperatureRead >= 100) { ... }
```

#### powerDownWeightSensor() - Line ~871
```cpp
// BEFORE: LoadCell.powerDown(); (commented out already)

// KEEP: weightSensorPowered = false (LOGICAL ONLY)
```

### Backend Changes

#### All Managers: Response Format
```python
{
  "sensor_ready": bool,
  "active": bool,
  "current": float,  # Current reading
  "status": string,  # "idle", "detecting", "measuring", "complete"
  "progress": int    # 0-100
}
```

### Frontend Changes

#### All Components: 100ms Polling
```javascript
// Standardized polling
setInterval(async () => {
  const data = await sensorAPI.getXXXStatus();
  updateUI(data);
}, 100); // UNIFORM 100ms
```

## Expected Results

### 1. Uniform Data Flow
- All sensors stream at 100ms
- Frontend polls at 100ms
- Smooth, consistent UI updates

### 2. Clean Power Management
- Arduino keeps all sensors physically ON
- Logical flags control data streaming
- No re-initialization delays

### 3. Better User Experience
- Instant sensor response
- No "warming up" delays
- Consistent measurement feel

## Files to Modify

### Arduino (1 file)
- [ ] `backend/arduino/all_sensors/all_sensors.ino`
  - MAX30102: Reduce buffer
  - Temperature: 100ms interval
  - Power: Already logical-only

### Backend (4 files)
- [ ] `app/sensors/managers/max30102_manager.py`
- [ ] `app/sensors/managers/bmi_manager.py`
- [ ] `app/sensors/managers/temperature_manager.py` (if exists)
- [ ] `app/sensors/sensor_manager.py`

### Frontend (5+ files)
- [ ] `pages/MeasurementFlow/Max30102/Max30102.jsx`
- [ ] `pages/MeasurementFlow/BMI/BMI.jsx` (or Weight component)
- [ ] `pages/MeasurementFlow/Height/Height.jsx`
- [ ] `pages/MeasurementFlow/BodyTemperature/BodyTemperature.jsx`
- [ ] `pages/Dashboards/Admin/Maintenance/Maintenance.jsx`

## Testing Checklist

After implementation:
- [ ] MAX30102: Data updates smoothly every 100ms
- [ ] Weight: Data updates every 100ms
- [ ] Height: Data updates every 100ms
- [ ] Temperature: Data updates every 100ms
- [ ] Power commands: No timeout errors
- [ ] Transitions: Smooth between measurements
- [ ] Maintenance page: All sensors testable

## Priority Order

1. **HIGHEST**: Fix Arduino power management (prevents timeouts)
2. **HIGH**: Standardize Arduino streaming to 100ms
3. **MEDIUM**: Update frontend polling to 100ms
4. **LOW**: Backend log formatting

Let's implement these changes systematically!
