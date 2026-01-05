#include <Wire.h>
#include <Adafruit_MLX90614.h>

// Initialize sensor object
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

const unsigned long READ_INTERVAL = 100;
unsigned long lastReadTime = 0;

void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  Serial.println("==========================================");
  Serial.println("BODY TEMPERATURE SENSOR TEST - MLX90614");
  Serial.println("==========================================");
  
  if (!mlx.begin()) {
    Serial.println("❌ Error connecting to MLX sensor. Check wiring.");
    while (1);
  }
  
  Serial.println("✅ MLX90614 Initialized.");
}

void loop() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastReadTime >= READ_INTERVAL) {
    lastReadTime = currentTime;
    
    // Read temperature
    float objTemp = mlx.readObjectTempC();
    float ambTemp = mlx.readAmbientTempC();
    
    // Apply calibration offset
    float calibratedTemp = objTemp + 3.5; // Calibration offset from all_sensors.ino
    
    Serial.print("DEBUG:Temperature reading: ");
    Serial.println(calibratedTemp, 2);
    
    // Optional: Print Ambient for debugging
    // Serial.print(" (Ambient: "); Serial.print(ambTemp); Serial.println(")");
  }
}
