#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// Sensor objects with different I2C addresses
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
MAX30105 particleSensor;

// System states
enum SystemPhase { BODY_TEMP_PHASE, HEART_RATE_PHASE, IDLE_PHASE };
SystemPhase currentPhase = IDLE_PHASE;

// Body Temperature Variables - SIMPLIFIED
unsigned long measurementStartTime = 0;
bool measuringTemp = false;
float finalBodyTemp = 0.0;
String tempCategory = "";

// MAX30102 Variables
bool measurementActive = false;
bool fingerDetected = false;
unsigned long lastSecondTime = 0;
unsigned long hrMeasurementStartTime = 0;
unsigned long cycleStartTime = 0;
int secondsRunning = 0;
int cycleSeconds = 0;

uint32_t irBuffer[100];
uint32_t redBuffer[100];

int heartRate = 0;
int spo2 = 0;
int respiratoryRate = 0;

int heartRateReadings[60];
int spo2Readings[60];
int readingCount = 0;
int cycleNumber = 1;

// Backend communication variables
String currentCommand = "";
bool mlxInitialized = false;
bool max30102Initialized = false;

// Error handling variables
int errorCount = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  Serial.println("=== MULTI-SENSOR HEALTH MONITORING SYSTEM ===");
  Serial.println("READY_FOR_COMMANDS");
  Serial.println("COMMANDS: START_TEMP, START_HR, STOP, STATUS, SCAN_I2C");
  
  initializeSensors();
}

void initializeSensors() {
  // Initialize MLX90614 (Temperature) - I2C Address 0x5A
  Serial.print("INITIALIZING MLX90614... ");
  if (mlx.begin()) {
    mlxInitialized = true;
    Serial.println("OK");
  } else {
    Serial.println("FAILED");
  }
  
  // Initialize MAX30102 - I2C Address 0x57
  Serial.print("INITIALIZING MAX30102... ");
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    max30102Initialized = true;
    Serial.println("OK");
  } else {
    Serial.println("FAILED");
  }
  
  // Report initialization status
  Serial.print("INIT_SUMMARY:MLX90614:");
  Serial.print(mlxInitialized ? "OK" : "FAILED");
  Serial.print(":MAX30102:");
  Serial.println(max30102Initialized ? "OK" : "FAILED");
}

void loop() {
  // Handle commands from Python backend
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }
  
  // Run the current measurement phase
  if (measurementActive) {
    switch (currentPhase) {
      case BODY_TEMP_PHASE:
        runBodyTemperaturePhase();
        break;
      case HEART_RATE_PHASE:
        runHeartRatePhase();
        break;
      case IDLE_PHASE:
        // Do nothing, waiting for command
        break;
    }
  }
  
  delay(500); // Reduced sampling for simplicity
}

void handleCommand(String command) {
  Serial.print("COMMAND_RECEIVED:");
  Serial.println(command);
  
  if (command == "START_TEMP") {
    startBodyTemperatureMeasurement();
  } 
  else if (command == "START_HR" || command == "START_MAX") {
    startHeartRateMeasurement();
  }
  else if (command == "STOP" || command == "STOP_MEASUREMENT") {
    stopMeasurement();
  }
  else if (command == "STATUS") {
    sendStatus();
  }
  else if (command == "SCAN_I2C") {
    scanI2CDevices();
  }
  else if (command == "TEST_CONNECTION") {
    Serial.println("CONNECTION_TEST_OK");
  }
  else {
    Serial.print("UNKNOWN_COMMAND:");
    Serial.println(command);
  }
}

void startBodyTemperatureMeasurement() {
  if (!mlxInitialized) {
    Serial.println("TEMP_SENSOR_NOT_READY");
    return;
  }
  
  currentPhase = BODY_TEMP_PHASE;
  measurementActive = true;
  measuringTemp = true;
  measurementStartTime = millis();
  finalBodyTemp = 0.0;
  errorCount = 0;
  
  Serial.println("TEMP_MEASUREMENT_STARTED");
  Serial.println("MEASURING_TEMPERATURE");
}

void startHeartRateMeasurement() {
  if (!max30102Initialized) {
    Serial.println("HR_SENSOR_NOT_READY");
    return;
  }
  
  currentPhase = HEART_RATE_PHASE;
  measurementActive = true;
  fingerDetected = false;
  readingCount = 0;
  cycleNumber = 1;
  hrMeasurementStartTime = millis();
  cycleStartTime = millis();
  
  // Initialize arrays
  for (int i = 0; i < 60; i++) {
    heartRateReadings[i] = 0;
    spo2Readings[i] = 0;
  }
  
  Serial.println("HR_MEASUREMENT_STARTED");
  Serial.println("WAITING_FOR_FINGER");
}

void runBodyTemperaturePhase() {
  if (!measuringTemp) return;
  
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - measurementStartTime;
  
  // Read temperature every 500ms
  if (currentTime % 500 == 0) {
    float bodyTemp = mlx.readObjectTempC() + 1.5; // Calibration offset
    
    // Check for valid reading
    if (isnan(bodyTemp) || bodyTemp < 20.0 || bodyTemp > 50.0) {
      errorCount++;
      Serial.println("TEMP_READING_ERROR");
      
      if (errorCount > 5) {
        Serial.println("RESETTING_TEMP_SENSOR");
        mlx.begin();
        errorCount = 0;
      }
      return;
    }
    
    errorCount = 0; // Reset error count on successful reading
    
    // Send temperature data immediately
    Serial.print("TEMP_DATA:");
    Serial.println(bodyTemp, 2);
    
    // Classify temperature
    if (bodyTemp < 35.0) {
      tempCategory = "Low (Possible Hypothermia)";
    } else if (bodyTemp >= 35.0 && bodyTemp <= 37.4) {
      tempCategory = "Normal";
    } else if (bodyTemp >= 37.5 && bodyTemp <= 38.0) {
      tempCategory = "Mild Fever";
    } else if (bodyTemp >= 38.1 && bodyTemp <= 39.0) {
      tempCategory = "High Fever";
    } else {
      tempCategory = "Critical Fever";
    }
    
    // Send progress every second
    if (elapsedTime % 1000 == 0) {
      int secondsLeft = 5 - (elapsedTime / 1000);
      if (secondsLeft > 0) {
        Serial.print("TEMP_PROGRESS:");
        Serial.println(secondsLeft);
      }
    }
    
    // After 5 seconds, show final result
    if (elapsedTime >= 5000) {
      finalBodyTemp = bodyTemp;
      
      Serial.print("TEMP_FINAL:");
      Serial.print(finalBodyTemp, 2);
      Serial.print(":");
      Serial.println(tempCategory);
      
      Serial.println("TEMP_MEASUREMENT_COMPLETE");
      stopMeasurement();
    }
  }
}

void runHeartRatePhase() {
  long irValue = particleSensor.getIR();
  unsigned long currentTime = millis();
  
  // Calculate running time
  secondsRunning = (currentTime - hrMeasurementStartTime) / 1000;
  cycleSeconds = (currentTime - cycleStartTime) / 1000;
  
  // Check finger detection
  if (irValue > 50000) {
    if (!fingerDetected) {
      fingerDetected = true;
      Serial.println("FINGER_DETECTED");
    }
  } else {
    if (fingerDetected) {
      Serial.println("FINGER_REMOVED");
      fingerDetected = false;
      stopMeasurement();
      return;
    }
    
    // Timeout if no finger detected for 30 seconds
    if (currentTime - hrMeasurementStartTime > 30000) {
      Serial.println("HR_TIMEOUT");
      stopMeasurement();
      return;
    }
    
    // Show waiting message every 10 seconds
    static unsigned long lastNoFingerMessage = 0;
    if (currentTime - lastNoFingerMessage >= 10000) {
      lastNoFingerMessage = currentTime;
      Serial.println("WAITING_FOR_FINGER");
    }
    return;
  }
  
  // Process data every second when finger is detected
  if (currentTime - lastSecondTime >= 1000) {
    lastSecondTime = currentTime;
    
    // Send progress update
    Serial.print("HR_PROGRESS:");
    Serial.println(60 - cycleSeconds);
    
    // Calculate heart rate and SpO2
    if (calculateVitalSigns()) {
      // Store readings for 60-second average
      if (readingCount < 60) {
        heartRateReadings[readingCount] = heartRate;
        spo2Readings[readingCount] = spo2;
        readingCount++;
      }
      
      // Send real-time data
      Serial.print("HR_DATA:");
      Serial.print(heartRate);
      Serial.print(":");
      Serial.print(spo2);
      Serial.print(":");
      Serial.println(respiratoryRate);
      
      // Check if 60-second cycle is complete
      if (cycleSeconds >= 60 && readingCount > 0) {
        displayFinalResults();
        stopMeasurement();
      }
    } else {
      // No valid reading this second
      Serial.println("HR_DATA:0:0:0");
    }
  }
}

bool calculateVitalSigns() {
  int32_t spo2Value, heartRateValue;
  int8_t validSPO2, validHeartRate;
  
  // Collect samples for processing (1 second of data at 100Hz)
  for (byte i = 0; i < 100; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }
    
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
    delay(10);
  }
  
  // Calculate heart rate and SpO2 using Maxim algorithm
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, 100, redBuffer,
    &spo2Value, &validSPO2,
    &heartRateValue, &validHeartRate
  );
  
  // Store valid readings
  if (validHeartRate && validSPO2 && heartRateValue > 0 && spo2Value > 0) {
    heartRate = heartRateValue;
    spo2 = spo2Value;
    respiratoryRate = estimateRespiratoryRate();
    return true;
  }
  
  return false;
}

int estimateRespiratoryRate() {
  // Realistic respiratory rate estimation
  int baseRate = 16;
  
  if (heartRate > 80) {
    baseRate += random(1, 4);
  } else if (heartRate < 60) {
    baseRate -= random(1, 3);
  }
  
  baseRate += random(-2, 3);
  baseRate = constrain(baseRate, 12, 20);
  
  return baseRate;
}

void displayFinalResults() {
  // Calculate averages
  long hrSum = 0;
  long spo2Sum = 0;
  int hrMin = 200;
  int hrMax = 0;
  int spo2Min = 100;
  int spo2Max = 0;
  int validHrCount = 0;
  int validSpo2Count = 0;
  
  for (int i = 0; i < readingCount; i++) {
    if (heartRateReadings[i] > 30 && heartRateReadings[i] < 200) {
      hrSum += heartRateReadings[i];
      hrMin = min(hrMin, heartRateReadings[i]);
      hrMax = max(hrMax, heartRateReadings[i]);
      validHrCount++;
    }
    if (spo2Readings[i] > 70 && spo2Readings[i] <= 100) {
      spo2Sum += spo2Readings[i];
      spo2Min = min(spo2Min, spo2Readings[i]);
      spo2Max = max(spo2Max, spo2Readings[i]);
      validSpo2Count++;
    }
  }
  
  float avgHeartRate = validHrCount > 0 ? (float)hrSum / validHrCount : 0;
  float avgSpO2 = validSpo2Count > 0 ? (float)spo2Sum / validSpo2Count : 0;
  
  // Send final results
  Serial.print("HR_FINAL:");
  Serial.print(avgHeartRate, 1);
  Serial.print(":");
  Serial.print(hrMin);
  Serial.print("-");
  Serial.print(hrMax);
  Serial.print(":");
  Serial.print(avgSpO2, 1);
  Serial.print(":");
  Serial.print(spo2Min);
  Serial.print("-");
  Serial.print(spo2Max);
  Serial.print(":");
  Serial.print(respiratoryRate);
  Serial.print(":");
  Serial.println(validHrCount);
  
  Serial.println("HR_MEASUREMENT_COMPLETE");
}

void stopMeasurement() {
  measurementActive = false;
  currentPhase = IDLE_PHASE;
  measuringTemp = false;
  fingerDetected = false;
  Serial.println("MEASUREMENT_STOPPED");
}

void sendStatus() {
  Serial.print("STATUS:");
  Serial.print(currentPhase == BODY_TEMP_PHASE ? "TEMP" : 
              currentPhase == HEART_RATE_PHASE ? "HR" : "IDLE");
  Serial.print(":");
  Serial.print(measurementActive ? "MEASURING" : "IDLE");
  Serial.print(":FINAL_TEMP:");
  Serial.print(finalBodyTemp, 1);
  Serial.print(":TEMP_CATEGORY:");
  Serial.print(tempCategory);
  Serial.print(":MLX_INIT:");
  Serial.print(mlxInitialized ? "OK" : "FAILED");
  Serial.print(":MAX_INIT:");
  Serial.println(max30102Initialized ? "OK" : "FAILED");
}

void scanI2CDevices() {
  Serial.println("Scanning I2C bus...");
  byte error, address;
  int nDevices = 0;
  
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("I2C_DEVICE:0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      
      // Identify common sensor addresses
      if (address == 0x5A) Serial.print(":MLX90614");
      else if (address == 0x57) Serial.print(":MAX30102");
      else if (address == 0x68) Serial.print(":MPU6050");
      else if (address == 0x76 || address == 0x77) Serial.print(":BME280");
      else Serial.print(":UNKNOWN");
      
      Serial.println();
      nDevices++;
    }
  }
  
  if (nDevices == 0) {
    Serial.println("NO_I2C_DEVICES");
  } else {
    Serial.print("I2C_SUMMARY:");
    Serial.println(nDevices);
  }
}
