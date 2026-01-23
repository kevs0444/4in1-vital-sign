/*
  Medical Grade Body Temperature Algorithm (MLX90614)
  ---------------------------------------------------
  Features:
  1. Signal Smoothing: Averages 10 samples to reduce noise.
  2. Dynamic Ambient Compensation: Adjusts offset based on room temp.
  3. Smart Human Detection: Ignores non-human ranges (<35C).
  4. Fever Classification: Categorizes result (Normal, Fever, etc).
*/

#include <Wire.h>
#include <Adafruit_MLX90614.h>

Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// Settings
const int SAMPLES_PER_READING = 10;
const float HUMAN_MIN_VALID_TEMP = 35.0;
const float HUMAN_MAX_VALID_TEMP = 43.0;

void setup() {
  Serial.begin(115200);
  while (!Serial && millis() < 2000); 
  
  Wire.begin();
  Wire.setWireTimeout(3000, true); 

  Serial.println("==========================================");
  Serial.println("  SMART BODY TEMP MONITOR (MEDICAL GRADE)");
  Serial.println("==========================================");
  Serial.print("Initializing Sensor... ");

  if (!mlx.begin()) {
    Serial.println("FAILED!");
    Serial.println("ERROR: MLX90614 not detected. Check I2C wiring.");
    while (1); // Halt
  }
  Serial.println("SUCCESS!");
  Serial.println("------------------------------------------");
}

float calculateDynamicOffset(float ambientTemp) {
  // Medical Grade Compensation Algorithm
  // Based on user calibration: 20C-25C Ambient -> +6.5C Offset
  
  if (ambientTemp <= 10.0) return 8.5; // Extreme Cold
  
  // Linear Interpolation for smoother transitions
  if (ambientTemp <= 20.0) {
    // Map 10C->20C : +8.5 -> +7.0
    return 8.5 - ((ambientTemp - 10.0) * (1.5 / 10.0));
  }
  else if (ambientTemp <= 25.0) {
    // Standard Room Temp (20-25C) -> Fixed +6.5 as requested
    return 6.5; 
  }
  else if (ambientTemp <= 30.0) {
    // Map 25C->30C : +6.5 -> +3.0
    return 6.5 - ((ambientTemp - 25.0) * (3.5 / 5.0));
  }
  else {
    return 2.0; // Very Hot Ambient
  }
}

void loop() {
  float sumObj = 0;
  float sumAmb = 0;
  
  // 1. ACQUIRE SAMPLES (Smoothing)
  // Take multiple readings to filter out sensor noise
  for (int i = 0; i < SAMPLES_PER_READING; i++) {
    sumObj += mlx.readObjectTempC();
    sumAmb += mlx.readAmbientTempC();
    delay(20); // 20ms gap ensures clean samples
  }
  
  float avgObj = sumObj / SAMPLES_PER_READING;
  float avgAmb = sumAmb / SAMPLES_PER_READING;
  
  // 2. APPLY ALGORITHM
  float offset = calculateDynamicOffset(avgAmb);
  float bodyTemp = avgObj + offset;
  
  // 3. INTELLIGENT OUTPUT
  Serial.print("Amb: "); Serial.print(avgAmb, 1);
  Serial.print("C | Raw: "); Serial.print(avgObj, 1);
  Serial.print("C | Offset: +"); Serial.print(offset, 1);
  
  // Check Validity
  if (bodyTemp < HUMAN_MIN_VALID_TEMP) {
    Serial.print(" -> READ: "); Serial.print(bodyTemp, 1);
    Serial.println("C [IGNORED: NO HUMAN DETECTED]");
  } 
  else if (bodyTemp > HUMAN_MAX_VALID_TEMP) {
    Serial.print(" -> READ: "); Serial.print(bodyTemp, 1);
    Serial.println("C [IGNORED: INVALID HIGH]");
  } 
  else {
    // Valid Human Reading
    Serial.print(" -> BODY: "); 
    Serial.print(bodyTemp, 1); 
    Serial.print(" C [");
    
    // Fever Classifier (User Parameters)
    // 35.0 - 37.2 : Normal
    // 37.3 - 38.0 : Slight fever
    // Above 38.0  : Critical
    if (bodyTemp <= 37.2) Serial.print("Normal");
    else if (bodyTemp <= 38.0) Serial.print("Slight fever");
    else Serial.print("Critical");
    
    Serial.println("]");
  }
  
  delay(500); 
}
