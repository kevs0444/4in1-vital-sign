/*
  Standalone Weight Sensor Test
  - Uses HX711_ADC library
  - Use this to verify hardware connection and raw values
*/

#include <HX711_ADC.h>

// Pins (Matches all_sensors.ino)
const int HX711_dout = 4;
const int HX711_sck = 5;

// Constructor
HX711_ADC LoadCell(HX711_dout, HX711_sck);

const float calVal = 20503.32; // Adjust if needed
unsigned long t = 0;

void setup() {
  Serial.begin(57600);
  delay(10);
  Serial.println("\nStarting Weight Sensor Test...");

  LoadCell.begin();
  unsigned long stabilizingtime = 2000;
  boolean _tare = true;

  LoadCell.start(stabilizingtime, _tare);
  if (LoadCell.getTareTimeoutFlag()) {
    Serial.println("Timeout, check MCU>HX711 wiring and pin designations");
    while (1);
  }
  else {
    LoadCell.setCalFactor(calVal);
    Serial.println("Startup is complete");
  }
}

void loop() {
  static boolean newDataReady = 0;
  const int serialPrintInterval = 0; // increase value to slow down serial print activity

  // check for new data/start next conversion:
  if (LoadCell.update()) newDataReady = true;

  // get smoothed value from the dataset:
  if (newDataReady) {
    if (millis() > t + serialPrintInterval) {
      float i = LoadCell.getData();
      Serial.print("Load_cell output val: ");
      Serial.println(i);
      newDataReady = 0;
      t = millis();
    }
  }

  // Monitor serial commands (for simple tare)
  if (Serial.available() > 0) {
    char inByte = Serial.read();
    if (inByte == 't') LoadCell.tareNoDelay(); 
  }

  // Check if last tare operation is complete
  if (LoadCell.getTareStatus() == true) {
    Serial.println("Tare complete");
  }
}
