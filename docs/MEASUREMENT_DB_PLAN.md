# Measurement Database Implementation Plan

## 1. Professional Standard for Missing Data
**Question:** What if the user only selects one measurement (e.g., body temp) and the others are null? What is the professional standard?

**Answer:** 
The professional standard for database design in medical/scientific applications is to use **`NULL`** for data that was not collected or is not applicable. 
*   **Never use `0`**: In vital signs, a value of `0` typically has a specific physical meaning (e.g., 0°C temperature, 0 BPM heart rate), which would be factually incorrect and potentially dangerous if interpreted as a real reading.
*   **Use `NULL`**: This correctly signifies "absence of value" or "not measured".

## 2. Database Schema Design

We will introduce a new table `measurements` (or `vital_signs`) to store historical data.

### New Model: `Measurement`
**File:** `backend/app/models/measurement_model.py`

| Column Name | Data Type | Nullable | Description |
| :--- | :--- | :--- | :--- |
| `id` | `Integer` | No | Primary Key, Auto-increment |
| `user_id` | `String(20)` | Yes | Foreign Key to `users.user_id`. Nullable for "Guest" users if needed. |
| `created_at` | `DateTime` | No | Timestamp of the measurement |
| `temperature` | `Float` | **Yes** | Body Temperature in Celsius |
| `systolic` | `Integer` | **Yes** | Systolic Blood Pressure (mmHg) |
| `diastolic` | `Integer` | **Yes** | Diastolic Blood Pressure (mmHg) |
| `heart_rate` | `Integer` | **Yes** | Heart Rate / Pulse (BPM) |
| `spo2` | `Integer` | **Yes** | Oxygen Saturation (%) |
| `weight` | `Float` | **Yes** | Weight in kg |
| `height` | `Float` | **Yes** | Height in cm (optional, but good for BMI recalc) |
| `bmi` | `Float` | **Yes** | Calculated BMI |
| `risk_category`| `String` | **Yes** | "Low Risk", "High Risk", etc. (from AI) |
| `risk_level` | `Float` | **Yes** | Raw risk score (e.g., 0.15) |

### Update Model: `User`
**File:** `backend/app/models/user_model.py`
*   Add relationship: `measurements = relationship("Measurement", back_populates="user", cascade="all, delete-orphan")`

## 3. API Implementation Plan

### A. Create Model File
Create the SQLAlchemy model in `backend/app/models/measurement_model.py` using the schema defined above.

### B. Update Database Initialization
Ensure `backend/app/utils/db.py` or `backend/run.py` imports the new model so that `Base.metadata.create_all(bind=engine)` creates the table on startup.

### C. Create Save Route
**File:** `backend/app/routes/measurement_routes.py`
Create a new Blueprint `measurement_bp`.

**Endpoint:** `POST /measurements/save`
**Logic:**
1.  Receive JSON payload.
2.  Validate `user_id` (if provided).
3.  Create `Measurement` object using `.get('key')` which returns `None` (NULL) by default if the key is missing.
    ```python
    new_measurement = Measurement(
        user_id=data.get('user_id'),
        temperature=data.get('temperature'), # Will be None if missing
        systolic=data.get('systolic'),       # Will be None if missing
        # ... etc
    )
    ```
4.  Commit to database.
5.  Return success.

## 4. Why this approach?
*   **Flexibility:** Allows users to measure just one thing (e.g., just Weight) without breaking the database constraint.
*   **Integrity:** Distinguishes between "Healthy Low Heart Rate" and "Not Measured".
*   **Scalability:** Ready for analytics (e.g., "Show me my temperature trend over the last month").

## 5. Next Steps
1.  Approve this plan.
2.  I will generate `backend/app/models/measurement_model.py`.
3.  I will update `backend/app/models/user_model.py`.
4.  I will create the routes to save this data.
