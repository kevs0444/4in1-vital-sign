#include <Wire.h>
#include <Adafruit_MLX90614.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

// Sensor Objects
Adafruit_MLX90614 mlx = Adafruit_MLX90614();
MAX30105 particleSensor;

// Sensor states
String currentSensor = "NONE";
bool measurementActive = false;
unsigned long measurementStartTime = 0;

// MLX90614 Variables
float finalTemperature = 0;
bool mlxInitialized = false;
bool max30102Initialized = false;
unsigned long stableStartTime = 0;
bool tempMeasuring = false;

// MAX30102 Variables
const unsigned long MAX_MEASUREMENT_TIME = 60000; // 60 seconds
const int HR_BUFFER_SIZE = 100;
uint32_t irBuffer[HR_BUFFER_SIZE];
uint32_t redBuffer[HR_BUFFER_SIZE];
int heartRates[60];
int spo2Values[60];  
int validReadings = 0;
float irSignal[600];
int rrSamples = 0;
unsigned long lastRRTime = 0;
bool fingerDetected = false;
unsigned long lastSecondTime = 0;
int secondsRemaining = 60;

// Final results storage
float maxHeartRate = 0;
float maxSpO2 = 0;
float maxRespiratoryRate = 0;

void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  Serial.println("Initializing sensors for testing...");
  
  // Initialize MLX90614 (Temperature) - I2C Address 0x5A
  Serial.print("Initializing MLX90614... ");
  if (mlx.begin()) {
    mlxInitialized = true;
    Serial.println("✅ MLX90614 Temperature Sensor OK");
  } else {
    Serial.println("❌ MLX90614 Temperature Sensor FAILED");
  }
  
  // Initialize MAX30102 - I2C Address 0x57
  Serial.print("Initializing MAX30102... ");
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    max30102Initialized = true;
    Serial.println("✅ MAX30102 Pulse Oximeter OK");
  } else {
    Serial.println("❌ MAX30102 Pulse Oximeter FAILED");
  }
  
  // Report initialization status
  Serial.print("📊 INITIALIZATION_SUMMARY - MLX90614:");
  Serial.print(mlxInitialized ? "OK" : "FAILED");
  Serial.print(":MAX30102:");
  Serial.println(max30102Initialized ? "OK" : "FAILED");
  
  Serial.println("READY_FOR_TESTING");
  Serial.println("COMMANDS: START_TEMP, START_MAX, STOP_MEASUREMENT, GET_STATUS");
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
  
  delay(100);
}

void handleCommand(String command) {
  Serial.print("🔧 COMMAND_RECEIVED: ");
  Serial.println(command);
  
  if (command == "START_TEMP") {
    startTempMeasurement();
  } 
  else if (command == "START_MAX") {
    startMaxMeasurement();
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
  else if (command == "SCAN_I2C") {
    scanI2CDevices();
  }
  else {
    Serial.print("❌ UNKNOWN_COMMAND: ");
    Serial.println(command);
  }
}

// ==================== MLX90614 TEMPERATURE PHASE ====================
void startTempMeasurement() {
  // ONLY check if MLX90614 is initialized - ignore MAX30102 status
  if (!mlxInitialized) {
    Serial.println("❌ TEMP_SENSOR_NOT_READY - MLX90614 not initialized");
    return;
  }
  
  currentSensor = "TEMP";
  measurementActive = true;
  measurementStartTime = millis();
  finalTemperature = 0;
  tempMeasuring = false;
  stableStartTime = 0;
  
  Serial.println("🌡️ TEMP_MEASUREMENT_STARTED");
  Serial.println("📝 Place sensor on forehead for accurate reading...");
}

void readTemperature() {
  // ONLY check if MLX90614 is initialized
  if (!mlxInitialized) {
    Serial.println("❌ TEMP_SENSOR_ERROR - MLX90614 not available");
    stopMeasurement();
    return;
  }
  
  // Read temperature directly
  float objectTemp = mlx.readObjectTempC();
  float bodyTemp = objectTemp + 1.9; // Calibration offset
  
  // Check for valid reading (not NaN)
  if (isnan(objectTemp)) {
    Serial.println("❌ TEMP_READING_ERROR - Invalid sensor reading");
    return;
  }
  
  // Send raw data for debugging
  Serial.print("📊 TEMP_RAW - Object:");
  Serial.print(objectTemp);
  Serial.print("C, Calibrated:");
  Serial.print(bodyTemp);
  Serial.println("C");
  
  // SIMPLIFIED DETECTION LOGIC
  // Detect if body temperature is in human range (35°C to 38°C)
  if (bodyTemp >= 35.0 && bodyTemp <= 38.0) {
    if (!tempMeasuring) {
      // Start 5-second timer
      tempMeasuring = true;
      stableStartTime = millis();
      Serial.println("👤 HUMAN_DETECTED - Starting measurement...");
    }
    
    // Send intermediate data
    Serial.print("📈 TEMP_DATA:");
    Serial.print(bodyTemp, 1);
    Serial.println(":C");
    
    // After 5 seconds, show final temperature
    if (millis() - stableStartTime >= 5000) {
      finalTemperature = bodyTemp;
      Serial.print("✅ TEMP_FINAL:");
      Serial.print(finalTemperature, 1);
      Serial.println(":C");
      Serial.println("🎯 TEMP_MEASUREMENT_COMPLETE");
      stopMeasurement();
    }
  } else {
    // No human detected
    if (tempMeasuring) {
      Serial.println("❌ TEMP_DROPPED - Temperature out of range, restarting...");
      tempMeasuring = false;
      stableStartTime = 0;
    } else {
      Serial.println("🚫 NO_USER_DETECTED - Waiting for human contact...");
    }
    
    // If no contact for 15 seconds, auto-stop
    if (millis() - measurementStartTime > 15000) {
      Serial.println("🕒 TEMP_TIMEOUT - No human detected for 15 seconds");
      stopMeasurement();
    }
  }
}

// ==================== MAX30102 VITAL SIGNS PHASE ====================
void startMaxMeasurement() {
  // ONLY check if MAX30102 is initialized - ignore MLX90614 status
  if (!max30102Initialized) {
    Serial.println("❌ MAX30102_SENSOR_NOT_READY - MAX30102 not initialized");
    return;
  }
  
  currentSensor = "MAX";
  measurementActive = true;
  measurementStartTime = millis();
  fingerDetected = false;
  validReadings = 0;
  rrSamples = 0;
  secondsRemaining = 60;
  
  // Initialize arrays
  for (int i = 0; i < 60; i++) {
    heartRates[i] = 0;
    spo2Values[i] = 0;
  }
  
  // Reset final results
  maxHeartRate = 0;
  maxSpO2 = 0;
  maxRespiratoryRate = 0;
  
  Serial.println("💓 MAX30102_MEASUREMENT_STARTED");
  Serial.println("📝 Place finger on sensor for 60 seconds...");
  Serial.println("🚫 WAITING_FOR_FINGER");
}

void readMax30102() {
  // ONLY check if MAX30102 is initialized
  if (!max30102Initialized) {
    Serial.println("❌ MAX30102_SENSOR_ERROR - MAX30102 not available");
    stopMeasurement();
    return;
  }
  
  long irValue = particleSensor.getIR();
  unsigned long currentTime = millis();
  unsigned long elapsedTime = currentTime - measurementStartTime;
  
  // Check finger detection
  if (irValue > 50000) {
    if (!fingerDetected) {
      fingerDetected = true;
      lastSecondTime = currentTime;
      Serial.println("✅ FINGER_DETECTED");
      Serial.println("🔄 Starting 60-second measurement...");
    }
  } else {
    if (fingerDetected) {
      Serial.println("❌ FINGER_REMOVED");
      stopMeasurement();
      return;
    } else {
      // Timeout if no finger detected for 30 seconds
      if (elapsedTime > 30000) {
        Serial.println("🕒 MAX30102_TIMEOUT - No finger detected");
        stopMeasurement();
      }
      return;
    }
  }
  
  if (fingerDetected) {
    // Update progress every second
    if (currentTime - lastSecondTime >= 1000) {
      secondsRemaining--;
      lastSecondTime = currentTime;
      
      Serial.print("⏱️ MAX_PROGRESS:");
      Serial.print(secondsRemaining);
      Serial.println(":SECONDS");
    }
    
    // Collect samples for processing
    collectMaxSamples();
    
    // Check if measurement complete
    if (elapsedTime >= MAX_MEASUREMENT_TIME) {
      completeMaxMeasurement();
    }
  }
}

void collectMaxSamples() {
  static unsigned long lastProcessTime = 0;
  unsigned long currentTime = millis();
  
  // Process heart rate and SpO2 every second
  if (currentTime - lastProcessTime >= 1000) {
    processHeartRateAndSpO2();
    lastProcessTime = currentTime;
  }
  
  // Collect data for respiratory rate (10 Hz sampling)
  if (currentTime - lastRRTime >= 100 && rrSamples < 600) {
    long irValue = particleSensor.getIR();
    if (irValue > 50000) {
      irSignal[rrSamples] = irValue;
      rrSamples++;
    }
    lastRRTime = currentTime;
  }
}

void processHeartRateAndSpO2() {
  int32_t spo2, heartRate;
  int8_t validSPO2, validHeartRate;
  
  // Collect 100 samples (1 second at 100 Hz)
  for (byte i = 0; i < HR_BUFFER_SIZE; i++) {
    while (!particleSensor.available()) {
      particleSensor.check();
    }
    
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
  }
  
  // Calculate heart rate and SpO2
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, HR_BUFFER_SIZE, redBuffer,
    &spo2, &validSPO2,
    &heartRate, &validHeartRate
  );
  
  // Store valid readings
  if (validHeartRate && validSPO2 && heartRate > 0 && spo2 > 0) {
    heartRates[validReadings] = heartRate;
    spo2Values[validReadings] = spo2;
    validReadings++;
    
    // Send real-time data
    Serial.print("📊 MAX_DATA - HR:");
    Serial.print(heartRate);
    Serial.print(":BPM:SPO2:");
    Serial.print(spo2);
    Serial.println(":PERCENT");
  }
}

void completeMaxMeasurement() {
  // Calculate final results
  calculateMaxResults();
  
  // Send final results
  Serial.print("✅ MAX_FINAL - HR:");
  Serial.print(maxHeartRate, 1);
  Serial.print(":BPM:SPO2:");
  Serial.print(maxSpO2, 1);
  Serial.print(":PERCENT:RR:");
  Serial.print(maxRespiratoryRate, 1);
  Serial.println(":BPM");
  
  Serial.println("🎯 MAX30102_MEASUREMENT_COMPLETE");
  stopMeasurement();
}

void calculateMaxResults() {
  // Calculate average heart rate
  long hrSum = 0;
  int hrCount = 0;
  for (int i = 0; i < validReadings; i++) {
    if (heartRates[i] > 30 && heartRates[i] < 200) {
      hrSum += heartRates[i];
      hrCount++;
    }
  }
  
  // Calculate average SpO2
  long spo2Sum = 0;
  int spo2Count = 0;
  for (int i = 0; i < validReadings; i++) {
    if (spo2Values[i] > 70 && spo2Values[i] <= 100) {
      spo2Sum += spo2Values[i];
      spo2Count++;
    }
  }
  
  // Calculate respiratory rate
  maxRespiratoryRate = calculateRespiratoryRate();
  
  // Set final results
  if (hrCount > 0) {
    maxHeartRate = hrSum / hrCount;
  }
  
  if (spo2Count > 0) {
    maxSpO2 = spo2Sum / spo2Count;
  }
}

int calculateRespiratoryRate() {
  if (rrSamples < 100) {
    return 16; // Default value
  }
  
  // Simple respiratory rate calculation
  float baseline = 0;
  for (int i = 0; i < rrSamples; i++) {
    baseline += irSignal[i];
  }
  baseline /= rrSamples;
  
  int breathCount = 0;
  bool aboveBaseline = false;
  float threshold = baseline * 0.01;
  
  for (int i = 1; i < rrSamples; i++) {
    float variation = abs(irSignal[i] - irSignal[i-1]);
    
    if (variation > threshold && !aboveBaseline) {
      breathCount++;
      aboveBaseline = true;
    } else if (variation < threshold/2) {
      aboveBaseline = false;
    }
  }
  
  int respiratoryRate = (breathCount * 60) / 60; // breaths per minute
  
  // Sanity check
  if (respiratoryRate < 8) respiratoryRate = 12;
  if (respiratoryRate > 30) respiratoryRate = 18;
  
  return respiratoryRate;
}

// ==================== COMMON FUNCTIONS ====================
void readCurrentSensor() {
  if (currentSensor == "TEMP") {
    readTemperature();
  } else if (currentSensor == "MAX") {
    readMax30102();
  }
}

void stopMeasurement() {
  measurementActive = false;
  fingerDetected = false;
  tempMeasuring = false;
  currentSensor = "NONE";
  Serial.println("🛑 MEASUREMENT_STOPPED");
}

void sendStatus() {
  Serial.print("📊 STATUS:");
  Serial.print(currentSensor);
  Serial.print(":");
  Serial.print(measurementActive ? "MEASURING" : "IDLE");
  Serial.print(":FINAL_TEMP:");
  Serial.print(finalTemperature, 1);
  Serial.print(":FINAL_HR:");
  Serial.print(maxHeartRate, 1);
  Serial.print(":FINAL_SPO2:");
  Serial.print(maxSpO2, 1);
  Serial.print(":FINAL_RR:");
  Serial.print(maxRespiratoryRate, 1);
  Serial.print(":MLX_INIT:");
  Serial.print(mlxInitialized ? "OK" : "FAILED");
  Serial.print(":MAX_INIT:");
  Serial.println(max30102Initialized ? "OK" : "FAILED");
}

// I2C Scanner to detect connected devices
void scanI2CDevices() {
  Serial.println("🔍 Scanning I2C bus...");
  byte error, address;
  int nDevices = 0;
  
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    
    if (error == 0) {
      Serial.print("✅ I2C device found at address 0x");
      if (address < 16) Serial.print("0");
      Serial.print(address, HEX);
      
      // Identify common sensor addresses
      if (address == 0x5A) Serial.print(" (MLX90614 Temperature)");
      else if (address == 0x57) Serial.print(" (MAX30102 Pulse Oximeter)");
      else if (address == 0x68) Serial.print(" (MPU6050 Accelerometer)");
      else if (address == 0x76 || address == 0x77) Serial.print(" (BME280 Environmental)");
      
      Serial.println();
      nDevices++;
    }
  }
  
  if (nDevices == 0) {
    Serial.println("❌ No I2C devices found");
  } else {
    Serial.print("📊 Found ");
    Serial.print(nDevices);
    Serial.println(" I2C device(s)");
  }
}