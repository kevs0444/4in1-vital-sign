/*
  TF-Luna Lidar (Success I2C) - Height Sensor Test
  
  Note: TFLI2C library requires explicit address (0x10 is default).
*/

#include <Wire.h>
#include <TFLI2C.h>

TFLI2C tflI2C;

int16_t  tfDist;    // distance in centimeters
int16_t  tfFlux;    // signal quality
int16_t  tfTemp;    // temperature

// Manual Height Offset (Sensor Mount Height in cm)
// e.g. 7ft = 213cm
const float SENSOR_MOUNT_HEIGHT_CM = 213.36;

void setup() {
  Serial.begin(115200);
  delay(100); // Give serial time
  
  Wire.begin();
  Wire.setWireTimeout(3000, true); // Prevent infinite hang if bus is locked
  
  Serial.println("==================================");
  Serial.println("HEIGHT SENSOR TEST (TF-LUNA)");
  Serial.println("==================================");
  
  // I2C Scanner for confirmation
  Serial.println("DEBUG: Scanning for TF-Luna (Expect 0x10)...");
  Wire.beginTransmission(0x10);
  if (Wire.endTransmission() == 0) {
    Serial.println("SUCCESS: Device found at 0x10!");
  } else {
    Serial.println("ERROR: No device at 0x10. Check wiring.");
  }
  Serial.println("==================================");
}

void loop() {
  // Pass address 0x10 explicitly
  if(tflI2C.getData(tfDist, tfFlux, tfTemp, 0x10)) {
      Serial.print("Dist: ");
      Serial.print(tfDist);
      Serial.print(" cm");
      
      Serial.print(" | Signal: ");
      Serial.print(tfFlux);
      
      Serial.print(" | Calc Height: ");
      float height = SENSOR_MOUNT_HEIGHT_CM - tfDist;
      
      // Convert to Feet/Inches
      float heightInFeet = height / 30.48;
      int feet = (int)heightInFeet;
      int inches = (int)((heightInFeet - feet) * 12);
      
      Serial.print(height, 1);
      Serial.print(" cm  [ ");
      Serial.print(feet);
      Serial.print("'");
      Serial.print(inches);
      Serial.println("\" ]");
  } else {
    // If fail, print a dot just to show it's alive
    Serial.print("."); 
  }
  
  delay(100);
}
