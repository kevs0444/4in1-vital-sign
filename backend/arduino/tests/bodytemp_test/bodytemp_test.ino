/*
  MLX90614 Body Temperature Sensor Test
  Includes safety check for boot loops.
*/

#include <Wire.h>
#include <Adafruit_MLX90614.h>

Adafruit_MLX90614 mlx = Adafruit_MLX90614();

void setup() {
  Serial.begin(115200);
  
  // Wait for serial
  while (!Serial && millis() < 2000); 
  
  Serial.println("\n==================================");
  Serial.println("BODY TEMP SENSOR TEST (MLX90614)");
  Serial.println("==================================");

  Wire.begin();
  Wire.setWireTimeout(3000, true); // Safety for I2C hangs

  Serial.print("STATUS: Initializing MLX90614... ");
  
  if (!mlx.begin()) {
    Serial.println("FAILED!");
    Serial.println("ERROR: Sensor not found. Check wiring (SDA/SCL) and Power.");
    // Don't halt, just warn
  } else {
    Serial.println("SUCCESS!");
  }
  
  Serial.println("==================================");
}

void loop() {
  // Read both Object (Body/Face) and Ambient temp
  float objTemp = mlx.readObjectTempC();
  float ambTemp = mlx.readAmbientTempC();

  // Calibration Offset (e.g., +3.5C for skin-to-body calc)
  const float CALIBRATION_OFFSET = 3.5;
  
  Serial.print("Ambient: "); 
  Serial.print(ambTemp); 
  Serial.print(" C");
  
  Serial.print("\tObject: "); 
  Serial.print(objTemp); 
  Serial.print(" C");
  
  Serial.print("\t| Body Est: ");
  Serial.print(objTemp + CALIBRATION_OFFSET);
  Serial.println(" C");
  
  // Safe delay
  delay(500);
}
