# Refactoring Plan: Modular Sensor Management & BMI Synchronization

## Objective
Refactor the monolithic `sensor_manager.py` into modular managers and synchronize `BMI.jsx` with the Arduino's initialization/calibration flow.

## 1. Backend Refactoring (Modularization)
We will split `sensor_manager.py` into specialized managers to improve organization and maintainability.

### New Structure
*   `backend/app/sensors/managers/base_manager.py`: Base class for common sensor logic.
*   `backend/app/sensors/managers/serial_interface.py`: Handles raw serial communication (singleton pattern).
*   `backend/app/sensors/managers/bmi_manager.py`: Handles Weight and Height sensors (commands: `START_WEIGHT`, `START_HEIGHT`, `AUTO_TARE`).
*   `backend/app/sensors/managers/bodytemp_manager.py`: Handles Temperature sensor.
*   `backend/app/sensors/managers/max30102_manager.py`: Handles Heart Rate/SpO2 sensor.
*   `backend/app/sensors/sensor_manager.py`: The main coordinator (Facade) that the Flask app talks to. It will delegate calls to the specific managers.

## 2. Arduino & Frontend Synchronization (BMI Focus)
The Arduino firmware performs an `AUTO_TARE` sequence on boot (`setup() -> startAutoTare()`). The frontend must respect this phase to ensure accurate weight measurements.

### Workflow Update for `BMI.jsx`
Currently, `BMI.jsx` jumps straight to "Measuring Weight". We will introduce a "System Preparation" phase.

**New Flow:**
1.  **Mount**: `BMI.jsx` checks system status.
2.  **Calibration Phase**:
    *   If the system is newly connected or explicitly requires it, show "Calibrating Sensors... Please wait".
    *   Wait for `AUTO_TARE_COMPLETE` signal (or check flag).
3.  **Instruction Phase**: Only AFTER calibration is complete, speak "Step 1: Step on the scale".
4.  **Weight Phase**: Identical to current implementation (3s stability).
5.  **Height Phase**: Identical to current implementation (2s stability).

### Backend Changes
*   Expose `auto_tare_completed` status more explicitly via the API.
*   Ensure `BMIManager` handles the `AUTO_TARE` events from Arduino.

## Implementation Tasks via "Start from Start"
1.  **Create Manager Directory Structure**: Setup folders and `__init__.py`.
2.  **Migrate Weight/Height Logic**: Move logic from `sensor_manager.py` to `bmi_manager.py`.
3.  **Migrate Other Sensors**: Move Temp and Max30102 logic.
4.  **Update Main Sensor Manager**: specific methods will call `self.bmi_manager.start_weight()`, etc.
5.  **Refactor `BMI.jsx`**:
    *   Add `PHASE.CALIBRATING`.
    *   Add logic to poll status until `auto_tare_completed` is true.
    *   Ensure smooth transition to `PHASE.WEIGHT`.

## File Changes
*   `backend/app/sensors/sensor_manager.py`: Heavy refactoring (deletion of code moved to sub-managers).
*   `backend/app/sensors/managers/*`: New files.
*   `frontend/src/pages/MeasurementFlow/BMI/BMI.jsx`: Logic update for calibration handling.
