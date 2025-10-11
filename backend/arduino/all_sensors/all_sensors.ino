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
  
  // Initialize MLX90614 (Temperature)
  if (mlx.begin()) {
    Serial.println("✅ MLX90614 Temperature Sensor OK");
  } else {
    Serial.println("❌ MLX90614 Temperature Sensor FAILED");
  }
  
  // Initialize MAX30102
  Serial.print("Initializing MAX30102... ");
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    Serial.println("✅ MAX30102 Pulse Oximeter OK");
  } else {
    Serial.println("❌ MAX30102 Pulse Oximeter FAILED");
  }
  
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
  else {
    Serial.print("❌ UNKNOWN_COMMAND: ");
    Serial.println(command);
  }
}

// ==================== MLX90614 TEMPERATURE PHASE ====================
void startTempMeasurement() {
  currentSensor = "TEMP";
  measurementActive = true;
  measurementStartTime = millis();
  finalTemperature = 0;
  
  Serial.println("🌡️ TEMP_MEASUREMENT_STARTED");
  Serial.println("📝 Place sensor on forehead for accurate reading...");
}

void readTemperature() {
  float ambientTemp = mlx.readAmbientTempC();
  float objectTemp = mlx.readObjectTempC();
  float bodyTemp = objectTemp + 1.9; // Calibration offset
  
  // Send raw data for debugging
  Serial.print("📊 TEMP_RAW - Ambient:");
  Serial.print(ambientTemp);
  Serial.print("C, Object:");
  Serial.print(objectTemp);
  Serial.print("C, Calibrated:");
  Serial.print(bodyTemp);
  Serial.println("C");
  
  // Enhanced detection logic
  bool humanDetected = (bodyTemp >= 35.0 && bodyTemp <= 38.0);
  bool sensorContact = (objectTemp > ambientTemp + 2.0);
  
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

// ==================== MAX30102 VITAL SIGNS PHASE ====================
void startMaxMeasurement() {
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
  Serial.println(maxRespiratoryRate, 1);
}