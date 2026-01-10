/*
  BMI Sensor Test (Weight + Height)
  - Weight: HX711_ADC (Pins 4, 5)
  - Height: TFLI2C (I2C) (TF-Luna Lidar)
  
  Use this to verify both sensors work together without the full system overhead.
*/

#include <Wire.h>
#include <HX711_ADC.h>
#include <TFLI2C.h> // Changed to system include style

// --- WEIGHT SENSOR ---
const int HX711_dout = 4;
const int HX711_sck = 5;
HX711_ADC LoadCell(HX711_dout, HX711_sck);

// Calibration Factor (User Provided)
float calibrationFactor = 21333.55; 

// --- HEIGHT SENSOR ---
TFLI2C heightSensor;
int16_t tfDist;    // Distance in cm
int16_t tfFlux;    // Signal strength/quality
int16_t tfTemp;    // Internal chip temp

// --- TIMING ---
unsigned long lastPrintTime = 0;
const int PRINT_INTERVAL = 500; // 500ms update rate

void setup() {
  Serial.begin(115200);
  delay(100);
  Serial.println("\n==========================================");
  Serial.println("BMI SENSOR TEST (WEIGHT + HEIGHT)");
  Serial.println("==========================================");

  // 1. Initialize I2C
  Wire.begin();
  // Wire.setWireTimeout(3000, true); // Uncomment if I2C hangs

  // --- I2C SCANNER (Debug) ---
  Serial.println("DEBUG: Scanning I2C bus...");
  int devicesFound = 0;
  for (byte address = 1; address < 127; address++) {
    Wire.beginTransmission(address);
    byte error = Wire.endTransmission();
    if (error == 0) {
      Serial.print("DEBUG: I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      Serial.println("  !");
      devicesFound++;
    }
  }
  if (devicesFound == 0) Serial.println("DEBUG: No I2C devices found\n");
  else Serial.println("DEBUG: I2C Scan Complete\n");
  // ---------------------------

  // 2. Initialize Weight Sensor
  Serial.println("STATUS:INITIALIZING_WEIGHT...");
  LoadCell.begin();
  
  unsigned long stabilizingtime = 2000;
  boolean _tare = true;
  LoadCell.start(stabilizingtime, _tare);
  
  if (LoadCell.getTareTimeoutFlag()) {
    Serial.println("ERROR:WEIGHT_SENSOR_TIMEOUT - Check wiring (Pins 4, 5)");
  } else {
    LoadCell.setCalFactor(calibrationFactor);
    LoadCell.setSamplesInUse(2); // Fast response
    Serial.println("STATUS:WEIGHT_SENSOR_READY");
  }

  // 3. Initialize Height Sensor
  Serial.println("STATUS:INITIALIZING_HEIGHT...");
  // Try a dummy read to wake it up
  if(heightSensor.getData(tfDist, tfFlux, tfTemp, 0x10)) {
     Serial.println("STATUS:HEIGHT_SENSOR_DETECTED");
  } else {
     Serial.println("WARNING:HEIGHT_SENSOR_NOT_RESPONDING");
  }
  
  Serial.println("==========================================");
  Serial.println("COMMANDS:");
  Serial.println(" 't' -> Tare Weight");
  Serial.println("==========================================");
}

void loop() {
  // --- READ WEIGHT ---
  static boolean newDataReady = 0;
  if (LoadCell.update()) newDataReady = true;

  // --- READ/PRINT LOOP ---
  if (millis() - lastPrintTime > PRINT_INTERVAL) {
    
    // Get Weight
    float weightKg = LoadCell.getData();
    
    // Get Height
    bool heightSuccess = heightSensor.getData(tfDist, tfFlux, tfTemp, 0x10);
    
    // Print Combined Data
    Serial.print("Weight: ");
    Serial.print(weightKg, 2);
    Serial.print(" kg");
    
    Serial.print("  |  Height (Dist): ");
    if (heightSuccess && tfDist > 0) {
       Serial.print(tfDist);
       Serial.print(" cm");
       // Calculate Height (Assuming Sensor @ 213.36cm / 7ft)
       float measuredHeight = 213.36 - tfDist;
       Serial.print(" (Calc: ");
       Serial.print(measuredHeight, 1);
       Serial.print(" cm)");
    } else {
       Serial.print("ERROR/Range");
    }
    
    Serial.print("  |  Flux: ");
    Serial.print(tfFlux);
    
    Serial.println();
    
    lastPrintTime = millis();
  }

  // --- SERIAL COMMANDS ---
  if (Serial.available() > 0) {
    char inByte = Serial.read();
    if (inByte == 't') {
      LoadCell.tareNoDelay();
      Serial.println("...Taring...");
    }
  }
}
