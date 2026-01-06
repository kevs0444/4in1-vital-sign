# Testing Phases & Strategy

This document outlines the testing strategy for verifying the 4-in-1 Vital Sign Kiosk functionality, ensuring the "Slave Mode" architecture is respected where the frontend (Master) controls all sensor operations.

## Phase 1: Body Temperature
**Sensor**: MLX90614
**Goal**: Verify accurate temperature readings and power management.

### Manual Testing
1.  **Sketch**: `backend/arduino/tests/bodytemp_test/bodytemp_test.ino`
2.  **Procedure**:
    *   Upload the sketch.
    *   Verify object and ambient temperature readings.

### Integration Testing
1.  **Sketch**: `all_sensors.ino`
2.  **Procedure**:
    *   Send `START_TEMPERATURE`.
    *   Verify readings flow.
    *   Send `POWER_DOWN_TEMPERATURE`.
    *   Verify sensor powers off/stops streaming.

---

## Phase 2: MAX30102 (HR, SpO2, RR)
**Sensor**: MAX30102
**Goal**: Verify finger detection and reliable vital sign calculation.

### Manual Testing
1.  **Sketch**: `backend/arduino/tests/max30102_test/max30102_test.ino`
2.  **Procedure**:
    *   Upload the sketch.
    *   Place finger on sensor.
    *   Verify `HeartRate`, `SpO2`, and `RespiratoryRate` values.
    *   Lift finger -> Verify "No Finger" detection.

### Integration Testing
1.  **Sketch**: `all_sensors.ino`
2.  **Procedure**:
    *   Send `START_MAX30102`.
    *   Place finger.
    *   Verify data stream.
    *   Send `POWER_DOWN_MAX30102`.
    *   Verify shutdown.

---

## Phase 3: BMI (Weight & Height)
**Sensors**: HX711 (Weight), TF-Luna (Height)
**Goal**: Verify that weight and height can be measured independently or sequentially under frontend control.

### Manual Testing
1.  **Sketch**: `backend/arduino/tests/bmi_test/bmi_test.ino`
2.  **Procedure**:
    *   Upload the sketch.
    *   Open Serial Monitor (115200 baud).
    *   Verify raw weight and height readings are streaming.
    *   Check for stability and noise.

### Integration Testing (Kiosk Mode)
1.  **Sketch**: `backend/arduino/all_sensors/all_sensors.ino`
2.  **Procedure**:
    *   Ensure NO data streams by default (Slave Mode).
    *   Send command `START_WEIGHT` -> Verify streaming starts.
    *   Send command `POWER_DOWN_WEIGHT` -> Verify streaming stops.
    *   Repeat for Height (`START_HEIGHT`, `POWER_DOWN_HEIGHT`).
