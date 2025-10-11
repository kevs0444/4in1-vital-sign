#include <Wire.h>
#include <Adafruit_MLX90614.h>

// Sensor Objects
Adafruit_MLX90614 mlx = Adafruit_MLX90614();

// Sensor states
String currentSensor = "NONE";
bool measurementActive = false;
unsigned long measurementStartTime = 0;
float finalTemperature = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  Serial.println("Initializing sensors for testing...");
  
  // Initialize MLX90614 (Temperature) - FOCUS ON THIS
  if (mlx.begin()) {
    Serial.println("✅ MLX90614 Temperature Sensor OK");
  } else {
    Serial.println("❌ MLX90614 Temperature Sensor FAILED");
    while(1); // Stop if temperature sensor fails
  }
  
  // Other sensors - commented out for testing
  Serial.println("⚠️  Other sensors disabled - Body Temp focus only");
  
  Serial.println("READY_FOR_TESTING");
  Serial.println("COMMANDS: START_TEMP, STOP_MEASUREMENT, GET_STATUS");
}

void loop() {
  // Wait for command from Python backend
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }
  
  // If measurement is active, read the current sensor
  if (measurementActive) {
    readCurrentSensor();
  }
  
  delay(500); // Slower loop for testing
}

void handleCommand(String command) {
  Serial.print("🔧 COMMAND_RECEIVED: ");
  Serial.println(command);
  
  if (command == "START_TEMP") {
    startTempMeasurement();
  } 
  else if (command == "STOP_MEASUREMENT") {
    stopMeasurement();
  }
  else if (command == "GET_STATUS") {
    sendStatus();
  }
  else if (command == "TEST_CONNECTION") {
    Serial.println("💚 CONNECTION_TEST_OK");
  }
  else {
    Serial.print("❌ UNKNOWN_COMMAND: ");
    Serial.println(command);
  }
}

void startTempMeasurement() {
  currentSensor = "TEMP";
  measurementActive = true;
  measurementStartTime = millis();
  finalTemperature = 0;
  
  Serial.println("🌡️ TEMP_MEASUREMENT_STARTED");
  Serial.println("📝 Place sensor on forehead for accurate reading...");
}

void stopMeasurement() {
  measurementActive = false;
  currentSensor = "NONE";
  Serial.println("🛑 MEASUREMENT_STOPPED");
}

void readCurrentSensor() {
  if (currentSensor == "TEMP") {
    readTemperature();
  }
}

// In the readTemperature() function, modify the detection logic:
void readTemperature() {
  float ambientTemp = mlx.readAmbientTempC();
  float objectTemp = mlx.readObjectTempC();
  float bodyTemp = objectTemp + 1.9; // Calibration offset
  
  // Send raw data for debugging
  Serial.print("📊 RAW_DATA - Ambient:");
  Serial.print(ambientTemp);
  Serial.print("C, Object:");
  Serial.print(objectTemp);
  Serial.print("C, Calibrated:");
  Serial.print(bodyTemp);
  Serial.println("C");
  
  // Enhanced detection logic
  bool humanDetected = (bodyTemp >= 35.0 && bodyTemp <= 38.0);
  bool sensorContact = (objectTemp > ambientTemp + 2.0); // Object temp significantly higher than ambient
  
  if (humanDetected && sensorContact) {
    Serial.print("👤 HUMAN_DETECTED - Temp:");
    Serial.print(bodyTemp, 1);
    Serial.println("C");
    
    // Send intermediate data
    Serial.print("📈 TEMP_DATA:");
    Serial.print(bodyTemp, 1);
    Serial.println(":C");
    
    // Wait 5 seconds for stable reading, then send final
    if (millis() - measurementStartTime >= 5000) {
      finalTemperature = bodyTemp;
      Serial.print("✅ TEMP_FINAL:");
      Serial.print(finalTemperature, 1);
      Serial.println(":C");
      Serial.println("🎯 TEMP_MEASUREMENT_COMPLETE");
      stopMeasurement();
    }
  } else {
    if (!sensorContact) {
      Serial.println("❌ TEMP_NO_CONTACT - Ensure sensor is touching forehead");
    } else if (!humanDetected) {
      Serial.println("❌ TEMP_OUT_OF_RANGE - Check sensor placement");
    }
    
    // Send no user detected status
    Serial.println("🚫 NO_USER_DETECTED");
    
    // If no contact for 10 seconds, auto-stop
    if (millis() - measurementStartTime > 10000) {
      Serial.println("🕒 TEMP_TIMEOUT - No human detected");
      stopMeasurement();
    }
  }
}

void sendStatus() {
  Serial.print("📊 STATUS:");
  Serial.print(currentSensor);
  Serial.print(":");
  Serial.print(measurementActive ? "MEASURING" : "IDLE");
  Serial.print(":FINAL_TEMP:");
  Serial.println(finalTemperature, 1);
}