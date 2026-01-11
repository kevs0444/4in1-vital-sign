/**
 * Centralized utility for classifying Vital Sign readings.
 * Based on provided charts and standard medical ranges.
 */

// ============================================================================
// BLOOD PRESSURE
// ============================================================================
/**
 * Classifies Blood Pressure readings based on standard categories.
 * Hierarchy (Top to Bottom):
 * 1. Hypertensive Crisis (>180 / >120)
 * 2. Hypertension Stage 2 (>=140 / >=90)
 * 3. Hypertension Stage 1 (130-139 / 80-89)
 * 4. Elevated (120-129 / <80)
 * 5. Hypotension (<90 / <60)
 * 6. Normal (<120 / <80)
 * 
 * @param {number|string} systolic 
 * @param {number|string} diastolic 
 * @returns {object} { label, color, description, range as string }
 */
export const getBloodPressureStatus = (systolic, diastolic) => {
    const sys = parseFloat(systolic);
    const dia = parseFloat(diastolic);

    if (!systolic || !diastolic || isNaN(sys) || isNaN(dia)) {
        return {
            label: "Not Measured",
            color: "#6b7280", // Gray
            description: "N/A"
        };
    }

    // 1. Hypertensive Crisis
    if (sys > 180 || dia > 120) {
        return {
            label: "Hypertensive Crisis",
            color: "#7f1d1d", // Dark Red
            description: "Consult your doctor immediately"
        };
    }

    // 2. Hypertension Stage 2
    if (sys >= 140 || dia >= 90) {
        return {
            label: "Hypertension Stage 2",
            color: "#dc2626", // Red
            description: "High Blood Pressure"
        };
    }

    // 3. Hypertension Stage 1
    if ((sys >= 130 && sys <= 139) || (dia >= 80 && dia <= 89)) {
        return {
            label: "Hypertension Stage 1",
            color: "#f97316", // Orange
            description: "High Blood Pressure"
        };
    }

    // 4. Elevated
    if (sys >= 120 && sys <= 129 && dia < 80) {
        return {
            label: "Elevated",
            color: "#f59e0b", // Yellow/Amber
            description: "Elevated"
        };
    }

    // 5. Hypotension (Low)
    if (sys < 90 || dia < 60) {
        return {
            label: "Hypotension",
            color: "#3b82f6", // Blue
            description: "Low Blood Pressure"
        };
    }

    // 6. Normal
    if (sys < 120 && dia < 80) {
        return {
            label: "Normal",
            color: "#10b981", // Emerald Green
            description: "Normal Blood Pressure"
        };
    }

    // Default Fallback
    return {
        label: "Normal",
        color: "#10b981",
        description: "Normal Blood Pressure"
    };
};

// ============================================================================
// BODY MASS INDEX (BMI)
// ============================================================================
/**
 * Classifies BMI based on WHO standards.
 * @param {number|string} bmiValue 
 * @returns {object} { label, color, description, range }
 */
export const getBMICategory = (bmiValue) => {
    if (!bmiValue) return { label: 'Not Measured', color: '#6b7280', description: 'N/A', range: 'N/A' };

    const bmi = parseFloat(bmiValue);
    if (isNaN(bmi)) return { label: 'Invalid', color: '#6b7280', description: 'Invalid', range: 'N/A' };

    if (bmi < 18.5) {
        return {
            label: 'Underweight',
            color: '#3b82f6', // Blue
            description: 'Measure < 18.5',
            range: '< 18.5'
        };
    }
    if (bmi >= 18.5 && bmi <= 24.9) {
        return {
            label: 'Normal',
            color: '#10b981', // Green
            description: 'Measure 18.5 - 24.9',
            range: '18.5 - 24.9'
        };
    }
    if (bmi >= 25.0 && bmi <= 29.9) {
        return {
            label: 'Overweight',
            color: '#f59e0b', // Orange/Yellow
            description: 'Measure 25.0 - 29.9',
            range: '25.0 - 29.9'
        };
    }
    // >= 30.0
    return {
        label: 'Obese',
        color: '#ef4444', // Red
        description: 'Measure ≥ 30.0',
        range: '≥ 30.0'
    };
};

// ============================================================================
// BODY TEMPERATURE
// ============================================================================
/**
 * Classifies Body Temperature.
 * @param {number|string} temperature 
 * @returns {object} { label, color, description, range }
 */
export const getTemperatureStatus = (temperature) => {
    if (!temperature || temperature === "--" || temperature === "--.-") return { label: 'Not Measured', color: '#6b7280', description: 'N/A', range: 'N/A' };

    const temp = parseFloat(temperature);
    if (isNaN(temp)) return { label: 'Invalid', color: '#6b7280', description: 'Invalid', range: 'N/A' };

    if (temp < 35.0) {
        return {
            label: "Hypothermia",
            color: "#3b82f6", // Blue
            description: "Temperature < 35.0°C",
            range: "< 35.0°C"
        };
    }

    if (temp >= 35.0 && temp <= 37.2) {
        return {
            label: "Normal",
            color: "#10b981", // Green
            description: "35.0°C – 37.2°C",
            range: "35.0 - 37.2°C"
        };
    }

    if (temp >= 37.3 && temp <= 38.0) {
        return {
            label: "Slight fever",
            color: "#f59e0b", // Yellow/Orange
            description: "37.3°C – 38.0°C",
            range: "37.3 - 38.0°C"
        };
    }

    return {
        label: "Critical",
        color: "#dc2626", // Red
        description: "Above 38.0°C",
        range: "> 38.0°C"
    };
};

// ============================================================================
// HEART RATE
// ============================================================================
/**
 * Classifies Heart Rate.
 * @param {number|string} heartRate 
 * @returns {object} { label, color, description, range }
 */
export const getHeartRateStatus = (heartRate) => {
    if (!heartRate || heartRate === "--" || heartRate === "N/A") return { label: 'Not Measured', color: '#6b7280', description: 'N/A', range: 'N/A' };

    const hr = parseFloat(heartRate);
    if (isNaN(hr)) return { label: 'Invalid', color: '#6b7280', description: 'Invalid', range: 'N/A' };

    if (hr < 60) {
        return {
            label: "Low",
            color: "#3b82f6", // Blue
            description: "Below 60 BPM",
            range: "< 60 BPM"
        };
    }
    if (hr >= 60 && hr <= 100) {
        return {
            label: "Normal",
            color: "#10b981", // Green
            description: "60–100 BPM",
            range: "60 - 100 BPM"
        };
    }
    if (hr >= 101 && hr <= 120) {
        return {
            label: "Elevated",
            color: "#f59e0b", // Yellow/Orange
            description: "101–120 BPM",
            range: "101 - 120 BPM"
        };
    }
    return {
        label: "Critical",
        color: "#dc2626", // Red
        description: "Above 120 BPM",
        range: "> 120 BPM"
    };
};

// ============================================================================
// SpO2 (Oxygen Saturation)
// ============================================================================
/**
 * Classifies SpO2.
 * @param {number|string} spo2Val 
 * @returns {object} { label, color, description, range }
 */
export const getSPO2Status = (spo2Val) => {
    if (!spo2Val || spo2Val === "--" || spo2Val === "N/A") return { label: 'Not Measured', color: '#6b7280', description: 'N/A', range: 'N/A' };

    const spo2 = parseFloat(spo2Val);
    if (isNaN(spo2)) return { label: 'Invalid', color: '#6b7280', description: 'Invalid', range: 'N/A' };

    if (spo2 <= 89) {
        return {
            label: "Critical",
            color: "#dc2626", // Red
            description: "89% or below",
            range: "≤ 89%"
        };
    }
    if (spo2 >= 90 && spo2 <= 94) {
        return {
            label: "Low",
            color: "#f59e0b", // Yellow/Orange
            description: "90% – 94% (Needs monitoring)",
            range: "90% – 94%"
        };
    }
    return {
        label: "Normal",
        color: "#10b981", // Green
        description: "95% – 100%",
        range: "95% – 100%"
    };
};

// ============================================================================
// RESPIRATORY RATE
// ============================================================================
/**
 * Classifies Respiratory Rate.
 * @param {number|string} rrVal 
 * @returns {object} { label, color, description, range }
 */
export const getRespiratoryStatus = (rrVal) => {
    if (!rrVal || rrVal === "--" || rrVal === "N/A") return { label: 'Not Measured', color: '#6b7280', description: 'N/A', range: 'N/A' };

    const rr = parseFloat(rrVal);
    if (isNaN(rr)) return { label: 'Invalid', color: '#6b7280', description: 'Invalid', range: 'N/A' };

    if (rr < 12) {
        return {
            label: "Low",
            color: "#3b82f6", // Blue
            description: "Below 12 bpm",
            range: "< 12 bpm"
        };
    }
    if (rr >= 12 && rr <= 20) {
        return {
            label: "Normal",
            color: "#10b981", // Green
            description: "12–20 bpm",
            range: "12–20 bpm"
        };
    }
    if (rr >= 21 && rr <= 24) {
        return {
            label: "Elevated",
            color: "#f59e0b", // Yellow/Orange
            description: "21–24 bpm",
            range: "21–24 bpm"
        };
    }
    return {
        label: "Critical",
        color: "#dc2626", // Red
        description: "Above 24 bpm",
        range: "> 24 bpm"
    };
};
