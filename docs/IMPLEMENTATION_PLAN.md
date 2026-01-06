# Sensor Verification and Testing Plan

## Goal Description
The goal is to verify and document the sensor testing phases, starting with BMI, then Body Temperature, and finally MAX30102. We need to ensure the Arduino code (`all_sensors.ino`) acts as a reliable slave device ("Kiosk Mode") that powers sensors on/off upon request and streams data only when asked. We will also create manual test sketches for each sensor.

## User Review Required
- [ ] Review the proposed testing phases and manual test codes.

## Proposed Changes

### Documentation
#### [NEW] [TESTING_PHASES.md](file:///c:/Users/VitalSign/Documents/4in1-vital-sign/docs/TESTING_PHASES.md)
- Create a document outlining the testing strategy:
    1.  **BMI Phase**: Weight (HX711) + Height (TF-Luna).
    2.  **Body Temperature Phase**: MLX90614.
    3.  **MAX30102 Phase**: HR/SpO2/RR.
- Include instructions on how to use the manual test sketches in `backend/arduino/tests/`.

#### [NEW] [ISSUES.md](file:///c:/Users/VitalSign/Documents/4in1-vital-sign/docs/ISSUES.md)
- List current known issues or items to verify (e.g., ensuring sensors power down correctly, reusability for new users).

### Bug Fixing & Debugging
#### [DEBUG] Frontend Data Reflection & Saving
- **BMI (`BMI.jsx`)**: Investigate `pollWeight` and `pollHeight`. Verify regex parsing in `bmi_manager.py`. Ensure data is passed to `handleContinue`.
- **BodyTemp (`BodyTemp.jsx`)**: Verify `startMonitoring` loop. Check `bodytemp_manager.py` parsing.
- **MAX30102 (`Max30102.jsx`)**: Verify `startPolling` and `live_data` updates. Check `max30102_manager.py` parsing.

### Arduino Code
#### [MODIFY] [all_sensors.ino](file:///c:/Users/VitalSign/Documents/4in1-vital-sign/backend/arduino/all_sensors/all_sensors.ino)
- Verify `handleCommand` covers all sensors.
- Ensure power management (powerUp/powerDown) is implemented for all sensors to support "reusable" sessions.
- Check "Slave Mode" logic: essentially ensuring `loop()` only runs measurements when `measurementActive` is true (triggered by command).

### Frontend Code (Master Logic)
#### [MODIFY] [BodyTemp.jsx](file:///c:/Users/VitalSign/Documents/4in1-vital-sign/frontend/src/pages/MeasurementFlow/BodyTemp/BodyTemp.jsx)
- **Goal**: Enforce "Frontend Master" by sending shutdown command when measurement completes.
- **Change**: Call `sensorAPI.shutdownTemperature()` inside `handleMeasurementComplete`.

#### [MODIFY] [Max30102.jsx](file:///c:/Users/VitalSign/Documents/4in1-vital-sign/frontend/src/pages/MeasurementFlow/Max30102/Max30102.jsx)
- **Goal**: Clean up redundant commands.
- **Change**: Consolidate `stop` and `shutdown` calls to ensure clear "Stop" signal is sent to Arduino.

#### [MODIFY] [Standby.jsx](file:///c:/Users/VitalSign/Documents/4in1-vital-sign/frontend/src/pages/Standby/Standby.jsx)
- **Goal**: Ensure COMPLETE sensor shutdown on new user/reset.
- **Change**: Update `clearAllMeasurementData` to call `sensorAPI.shutdownAll()` instead of individual shutdowns.

### Flow & Robustness Verification
- **Inactivity**: Verify `InactivityWrapper` redirects to Standby and triggers `shutdownAll`.
- **Cancellation**: Verify "Back/Exit" buttons on `BMI`, `BodyTemp`, `Max30102` call shutdown APIs before navigating away.
- **New User**: Confirm `Standby` effectively clears all state (React state + Backend sensors) for the next user.

#### [MODIFY/VERIFY] Test Sketches
- `backend/arduino/tests/bmi_test/bmi_test.ino`
- `backend/arduino/tests/bodytemp_test/bodytemp_test.ino`
- `backend/arduino/tests/max30102_test/max30102_test.ino`
- Ensure these sketches correspond to the "manual test" request.

## Verification Plan
### Manual Verification
- The user will upload the test sketches to the Arduino to verify hardware.
- The user will upload `all_sensors.ino` and use the serial monitor or backend to send commands like `START_WEIGHT`, `POWER_DOWN_WEIGHT` to verify the state machine.
