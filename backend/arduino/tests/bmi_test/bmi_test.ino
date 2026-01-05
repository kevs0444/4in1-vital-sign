#include <Wire.h>
#include <EEPROM.h>
#include "HX711_ADC.h"
#include "TFLI2C.h"

// Weight Sensor
HX711_ADC LoadCell(4, 5); // DT=4, SCK=5
float calFactor = -21330.55;

// Height Sensor
TFLI2C heightSensor;
const float SENSOR_HEIGHT_CM = 213.36; // 7 feet

const unsigned long READ_INTERVAL = 100;
unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  Serial.println("==========================================");
  Serial.println("BMI SENSORS TEST (WEIGHT & HEIGHT)");
  Serial.println("==========================================");
  
  // Initialize Weight
  Serial.println("Initializing Weight Sensor...");
  LoadCell.begin();
  LoadCell.start(2000, true); // 2000ms stabilizing time, do tare
  LoadCell.setCalFactor(calFactor);
  LoadCell.setSamplesInUse(2); // Fast response
  if (LoadCell.getTareTimeoutFlag()) {
    Serial.println("❌ Weight Sensor Timeout. Check wiring.");
  } else {
    Serial.println("✅ Weight Sensor Ready & Tared.");
  }

  // Initialize Height needs no special init for TFLI2C usually, just Wire.begin()
  Serial.println("✅ Height Sensor (TF-Luna) Ready (assuming I2C connected).");
}

void loop() {
  LoadCell.update(); // Must be called frequently
  
  unsigned long currentTime = millis();
  
  if (currentTime - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentTime;
    
    // Read Weight
    float weight = LoadCell.getData();
    if (weight < 0) weight = 0.0;
    
    // Read Height
    int16_t tfDist = 0;
    int16_t tfFlux = 0;
    int16_t tfTemp = 0;
    heightSensor.getData(tfDist, tfFlux, tfTemp, 0x10); // Default address 0x10
    
    float heightCm = 0;
    if (tfDist > 0 && tfDist < 250) { // Valid range
        heightCm = SENSOR_HEIGHT_CM - tfDist;
        if (heightCm < 0) heightCm = 0;
    }
    
    // Print in format compatible with Backend regex
    Serial.print("DEBUG:Weight reading: ");
    Serial.println(weight, 2);
    
    Serial.print("DEBUG:Height reading: ");
    Serial.println(heightCm, 1);
  }
}
