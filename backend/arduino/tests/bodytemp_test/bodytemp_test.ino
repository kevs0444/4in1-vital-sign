/*
  Medical Grade Body Temperature Algorithm (MLX90614)
  ---------------------------------------------------
  Features:
  1. Signal Smoothing: Averages 10 samples to reduce noise.
  2. Calibration Bias: Corrects sensor-to-skin difference.
  3. Dynamic Ambient Compensation: Small offset (≤ +1.0C).
  4. Smart Human Detection.
  5. Fever Classification.
*/

#include <Wire.h>
#include <Adafruit_MLX90614.h>

Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// Settings
const int SAMPLES_PER_READING = 10;
const float HUMAN_MIN_VALID_TEMP = 35.0;
const float HUMAN_MAX_VALID_TEMP = 43.0;

// 🔧 CALIBRATION BIAS (based on your IR thermometer)
const float CALIBRATION_BIAS = 3.5;   // fine-tune ±0.1 if needed

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000);

  Wire.begin();
  Wire.setWireTimeout(3000, true);

  Serial.println("==========================================");
  Serial.println("  SMART BODY TEMP MONITOR (CALIBRATED)");
  Serial.println("==========================================");
  Serial.print("Initializing Sensor... ");

  if (!mlx.begin()) {
    Serial.println("FAILED!");
    Serial.println("ERROR: MLX90614 not detected. Check I2C wiring.");
    while (1);
  }
  Serial.println("SUCCESS!");
  Serial.println("------------------------------------------");
}

/* -------- REDUCED AMBIENT OFFSET (MAX +1.00C) -------- */
float calculateDynamicOffset(float ambientTemp) {

  if (ambientTemp <= 15.0) {
    return 1.0;
  }
  else if (ambientTemp <= 25.0) {
    // Map 15C → 25C : 1.0 → 0.5
    return 1.0 - ((ambientTemp - 15.0) * (0.5 / 10.0));
  }
  else if (ambientTemp <= 30.0) {
    // Map 25C → 30C : 0.5 → 0.2
    return 0.5 - ((ambientTemp - 25.0) * (0.3 / 5.0));
  }
  else {
    return 0.1;
  }
}

void loop() {
  float sumObj = 0;
  float sumAmb = 0;

  // 1. ACQUIRE SAMPLES (Smoothing)
  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    sumObj += mlx.readObjectTempC();
    sumAmb += mlx.readAmbientTempC();
    delay(20);
  }

  float avgObj = sumObj / SAMPLES_PER_READING;
  float avgAmb = sumAmb / SAMPLES_PER_READING;

  // 2. APPLY ALGORITHM
  float offset = calculateDynamicOffset(avgAmb);
  offset = constrain(offset, 0.0, 1.0);   // safety clamp

  float bodyTemp = avgObj + CALIBRATION_BIAS + offset;

  // 3. OUTPUT
  Serial.print("Amb: "); Serial.print(avgAmb, 1);
  Serial.print("C | Raw: "); Serial.print(avgObj, 1);
  Serial.print("C | Bias: +"); Serial.print(CALIBRATION_BIAS, 1);
  Serial.print(" | Offset: +"); Serial.print(offset, 2);

  if (bodyTemp < HUMAN_MIN_VALID_TEMP) {
    Serial.print(" -> READ: "); Serial.print(bodyTemp, 1);
    Serial.println("C [IGNORED: NO HUMAN DETECTED]");
  }
  else if (bodyTemp > HUMAN_MAX_VALID_TEMP) {
    Serial.print(" -> READ: "); Serial.print(bodyTemp, 1);
    Serial.println("C [IGNORED: INVALID HIGH]");
  }
  else {
    Serial.print(" -> BODY: ");
    Serial.print(bodyTemp, 1);
    Serial.print(" C [");

    if (bodyTemp <= 37.2) Serial.print("Normal");
    else if (bodyTemp <= 38.0) Serial.print("Slight fever");
    else Serial.print("Critical");

    Serial.println("]");
  }

  delay(500);
}
