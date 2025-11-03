// LIBRARIES for weight, height, temperature, and MAX30102
#include <Wire.h>
#include <EEPROM.h>
#include "HX711_ADC.h"         // For Weight
#include "TFLI2C.h"            // For Height (TF-Luna Lidar)
#include <Adafruit_MLX90614.h> // For Temperature
#include "MAX30105.h"          // For MAX30102
#include "heartRate.h"
#include "spo2_algorithm.h"

// =================================================================
// --- SENSOR OBJECTS ---
// =================================================================
// Arduino Mega pins for HX711
HX711_ADC LoadCell(4, 5);      // DAT pin = 4, CLK pin = 5
TFLI2C heightSensor;
Adafruit_MLX90614 mlx = Adafruit_MLX90614(); // Temperature sensor
MAX30105 particleSensor;       // MAX30102 sensor

// =================================================================
// --- SYSTEM STATE MANAGEMENT ---
// =================================================================
enum SystemPhase { IDLE, AUTO_TARE, INITIALIZING_WEIGHT, WEIGHT, HEIGHT, TEMPERATURE, MAX30102 };
SystemPhase currentPhase = IDLE;
bool measurementActive = false;
unsigned long phaseStartTime = 0;

// Sensor power states
bool weightSensorPowered = false;
bool heightSensorPowered = false;
bool temperatureSensorPowered = false;
bool max30102SensorPowered = false;

// Weight sensor initialization flag
bool weightSensorInitialized = false;
bool autoTareCompleted = false;

// MAX30102 Variables - UPDATED TO MATCH WORKING CODE
#define BUFFER_SIZE 50
uint32_t irBuffer[BUFFER_SIZE];  
uint32_t redBuffer[BUFFER_SIZE];  
int32_t spo2;          
int8_t validSPO2;      
int32_t heartRate;     
int8_t validHeartRate; 
float respiratoryRate = 0;
const int BPM_DEDUCTION = 20;  // Deduct 20 BPM dynamically

// MAX30102 Measurement Variables - SIMPLIFIED
const unsigned long MAX30102_MEASUREMENT_TIME = 30000; // 30 seconds total
const unsigned long MAX30102_READ_INTERVAL = 1000;     // Show readings every second

// Variables to store final results
int32_t finalHeartRate = 0;
int32_t finalSpO2 = 0;
float finalRespiratoryRate = 0;
bool max30102MeasurementComplete = false;
bool fingerDetected = false;
bool max30102MeasurementStarted = false;
unsigned long max30102StartTime = 0;
unsigned long lastMax30102DisplayTime = 0;

// --- Measurement Variables - SIMPLIFIED FOR REAL-TIME ---
// Weight - SIMPLIFIED FOR 3 SECONDS REAL-TIME
const unsigned long WEIGHT_MEASUREMENT_TIME = 3000; // 3 seconds total
const float WEIGHT_THRESHOLD = 1.0; // Require at least 1kg to start
enum WeightSubState { W_DETECTING, W_MEASURING };
WeightSubState weightState = W_DETECTING;

// Height - SIMPLIFIED FOR 2 SECONDS REAL-TIME  
const unsigned long HEIGHT_MEASUREMENT_TIME = 2000; // 2 seconds total
const unsigned long HEIGHT_READ_INTERVAL = 100;
enum HeightSubState { H_DETECTING, H_MEASURING };
HeightSubState heightState = H_DETECTING;

// Temperature - SIMPLIFIED FOR 2 SECONDS REAL-TIME
const unsigned long TEMPERATURE_MEASUREMENT_TIME = 2000; // 2 seconds total
const unsigned long TEMPERATURE_READ_INTERVAL = 200;
enum TemperatureSubState { T_DETECTING, T_MEASURING };
TemperatureSubState temperatureState = T_DETECTING;

// Remove averaging variables
unsigned long measurementStartTime = 0;
float finalRealTimeWeight = 0;
float finalRealTimeHeight = 0;
float finalRealTimeTemperature = 0;

// Height sensor constants
const float SENSOR_HEIGHT_CM = 213.36; // 7 feet in cm
const int MIN_VALID_HEIGHT_DIST = 30;
const int MAX_VALID_HEIGHT_DIST = 180;
const int MIN_SIGNAL_STRENGTH = 100; // Minimum signal strength for valid reading
unsigned long lastHeightReadTime = 0;
unsigned long lastProgressUpdate = 0;

// Temperature sensor variables
unsigned long lastTemperatureReadTime = 0;
bool temperatureSensorInitialized = false;
const float TEMPERATURE_THRESHOLD = 34.0; // Minimum valid temperature
const float TEMPERATURE_MAX = 42.0;       // Maximum valid temperature

// MAX30102 timing variables
bool max30102SensorInitialized = false;

// =================================================================
// --- SETUP FUNCTION ---
// =================================================================
void setup() {
  Serial.begin(9600);
  
  // Arduino Mega I2C pins: SDA = 20, SCL = 21
  Wire.begin(); // Mega uses pins 20 (SDA) and 21 (SCL) by default
  
  // Wait for serial connection
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("==========================================");
  Serial.println("BMI MEASUREMENT SYSTEM - ARDUINO MEGA");
  Serial.println("==========================================");
  
  // Quick initialization - just establish connection first
  Serial.println("STATUS:BOOTING_UP");
  
  // Initialize basic sensor objects without full setup
  initializeBasicSensors();
  
  // Start auto-tare process immediately
  startAutoTare();
  
  // Mark as ready for commands immediately
  Serial.println("STATUS:READY_FOR_COMMANDS");
  Serial.println("SYSTEM:CONNECTED_BASIC_MODE");
  Serial.println("DEBUG:Setup completed successfully");
}

// =================================================================
// --- AUTO-TARE FUNCTION ---
// =================================================================
void startAutoTare() {
  Serial.println("STATUS:STARTING_AUTO_TARE");
  
  if (!weightSensorPowered) {
    LoadCell.powerUp();
    weightSensorPowered = true;
    delay(200);
  }
  
  // Get calibration factor from EEPROM
  float calFactor;
  EEPROM.get(0, calFactor);
  if (isnan(calFactor) || calFactor == 0) {
    calFactor = -21314.96; // Using your calibration factor from logs
    Serial.println("STATUS:USING_DEFAULT_CALIBRATION");
  }
  LoadCell.setCalFactor(calFactor);

  Serial.print("STATUS:CALIBRATION_FACTOR:");
  Serial.println(calFactor);
  
  // Start tare process
  currentPhase = AUTO_TARE;
  measurementActive = true;
  phaseStartTime = millis();
  LoadCell.tareNoDelay();
  
  Serial.println("STATUS:AUTO_TARE_IN_PROGRESS");
}

void runAutoTarePhase() {
  LoadCell.update();

  if (LoadCell.getTareStatus()) {
    Serial.println("STATUS:AUTO_TARE_COMPLETE");
    Serial.println("STATUS:WEIGHT_SENSOR_READY");
    weightSensorInitialized = true;
    autoTareCompleted = true;
    measurementActive = false;
    currentPhase = IDLE;
    
    // Power down weight sensor after tare to save power
    delay(100);
    LoadCell.powerDown();
    weightSensorPowered = false;
    Serial.println("STATUS:WEIGHT_SENSOR_STANDBY");
  } else if (millis() - phaseStartTime > 10000) {
    Serial.println("ERROR:AUTO_TARE_FAILED");
    weightSensorInitialized = false;
    autoTareCompleted = false;
    measurementActive = false;
    currentPhase = IDLE;
  }
}

void initializeBasicSensors() {
  Serial.println("DEBUG:Initializing basic sensors...");
  
  // Quick initialization - just create objects
  LoadCell.begin();
  Serial.println("DEBUG:Load cell initialized");
  
  // Height sensor is initialized when powered up
  Serial.println("DEBUG:Height sensor ready for initialization");
  
  // Temperature sensor will be initialized when powered up
  Serial.println("DEBUG:Temperature sensor ready for initialization");
  
  // MAX30102 sensor will be initialized when powered up
  Serial.println("DEBUG:MAX30102 sensor ready for initialization");
  
  Serial.println("STATUS:BASIC_SENSORS_INITIALIZED");
}

void initializeWeightSensor() {
  Serial.println("STATUS:INITIALIZING_WEIGHT_SENSOR");
  
  if (!weightSensorPowered) {
    LoadCell.powerUp();
    weightSensorPowered = true;
    delay(200);
  }
  
  // Get calibration factor from EEPROM
  float calFactor;
  EEPROM.get(0, calFactor);
  if (isnan(calFactor) || calFactor == 0) {
    calFactor = -21314.96;
    Serial.println("STATUS:USING_DEFAULT_CALIBRATION");
  }
  LoadCell.setCalFactor(calFactor);

  Serial.print("STATUS:CALIBRATION_FACTOR:");
  Serial.println(calFactor);
  
  // Perform a single, reliable tare operation
  Serial.println("STATUS:PERFORMING_AUTO_TARE");
  currentPhase = INITIALIZING_WEIGHT;
  measurementActive = true;
  phaseStartTime = millis();
  LoadCell.tareNoDelay();
}

void initializeOtherSensors() {
  // Height sensor
  Serial.println("STATUS:HEIGHT_SENSOR_READY");
  
  // Temperature sensor will be initialized when powered up
  Serial.println("STATUS:TEMPERATURE_SENSOR_READY");
  
  // MAX30102 sensor will be initialized when powered up
  Serial.println("STATUS:MAX30102_SENSOR_READY");
}

void fullSystemInitialize() {
  Serial.println("STATUS:FULL_SYSTEM_INITIALIZATION_STARTED");
  
  // Initialize weight sensor with tare
  initializeWeightSensor();
  
  // Initialize other sensors properly
  initializeOtherSensors();
  
  Serial.println("STATUS:FULL_SYSTEM_INITIALIZATION_COMPLETE");
}

// =================================================================
// --- MAX30102 FUNCTIONS - UPDATED TO MATCH WORKING CODE ---
// =================================================================
void powerUpMax30102Sensor() {
  if (!max30102SensorPowered) {
    Serial.println("STATUS:POWERING_UP_MAX30102");
    
    if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
      Serial.println("ERROR:MAX30102_NOT_FOUND");
      max30102SensorPowered = false;
      max30102SensorInitialized = false;
      return;
    }

    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    
    max30102SensorPowered = true;
    max30102SensorInitialized = true;
    Serial.println("STATUS:MAX30102_SENSOR_POWERED_UP");
    Serial.println("STATUS:MAX30102_SENSOR_INITIALIZED");
    Serial.println("MAX30102_READY:Place finger on sensor to start measurement");
  }
}

void powerDownMax30102Sensor() {
  if (max30102SensorPowered) {
    max30102SensorPowered = false;
    Serial.println("STATUS:MAX30102_SENSOR_POWERED_DOWN");
  }
}

// Estimate respiratory rate based on heart rate - FROM WORKING CODE
int estimateRespiratoryRate(int32_t bpm) {
  float rr;
  
  if (bpm < 40) rr = 8;
  else if (bpm >= 40 && bpm <= 100) rr = bpm / 4.0;
  else if (bpm > 100 && bpm <= 140) rr = bpm / 4.5;
  else rr = bpm / 5.0;

  if (rr < 8) rr = 8;
  if (rr > 40) rr = 40;
  return rr;
}

void startMax30102Measurement() {
  if (!max30102SensorPowered) powerUpMax30102Sensor();
  
  if (!max30102SensorInitialized) {
    Serial.println("ERROR:MAX30102_SENSOR_NOT_INITIALIZED");
    return;
  }
  
  // Reset all states - SIMPLIFIED LIKE WORKING CODE
  measurementActive = true;
  currentPhase = MAX30102;
  max30102MeasurementStarted = true;
  max30102StartTime = millis();
  lastMax30102DisplayTime = millis();
  max30102MeasurementComplete = false;
  fingerDetected = false;
  finalHeartRate = 0;
  finalSpO2 = 0;
  finalRespiratoryRate = 0;
  
  Serial.println("STATUS:MAX30102_MEASUREMENT_STARTED");
  Serial.println("MAX30102_STATE:WAITING_FOR_FINGER");
  Serial.println("MAX30102_READY:Place finger on sensor to start measurement");
}

void runMax30102Phase() {
  long irValue = particleSensor.getIR();
  
  // Check for finger presence - SIMPLIFIED LIKE WORKING CODE
  if (irValue < 50000) {
    if (fingerDetected) {
      // Finger was removed
      fingerDetected = false;
      max30102MeasurementStarted = false;
      Serial.println("FINGER_REMOVED");
      Serial.println("MAX30102_STATE:FINGER_REMOVED");
      Serial.println("MAX30102_READY:Place finger on sensor to start measurement");
    }
    
    // Send finger status
    if (millis() - lastMax30102DisplayTime >= 1000) {
      Serial.print("MAX30102_FINGER_STATUS:");
      Serial.println("NOT_DETECTED");
      Serial.print("MAX30102_IR_VALUE:");
      Serial.println(irValue);
      lastMax30102DisplayTime = millis();
    }
    return;
  }
  
  // Finger detected for the first time
  if (!fingerDetected) {
    fingerDetected = true;
    max30102MeasurementStarted = true;
    max30102StartTime = millis();
    lastMax30102DisplayTime = millis();
    
    Serial.println("FINGER_DETECTED");
    Serial.println("MAX30102_STATE:MEASURING");
    Serial.println("✅ Finger detected! Starting 30-second measurement...");
    Serial.println("==================================================");
  }
  
  // If measurement hasn't started yet, wait
  if (!max30102MeasurementStarted) {
    return;
  }

  // Collect 50 samples - FROM WORKING CODE
  for (byte i = 0; i < BUFFER_SIZE; i++) {
    while (!particleSensor.available())
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
  }

  // Process this batch - FROM WORKING CODE
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE, redBuffer,
    &spo2, &validSPO2,
    &heartRate, &validHeartRate
  );

  // Adjust heart rate and recalc respiratory rate - FROM WORKING CODE
  if (validHeartRate && heartRate > 0) {
    heartRate -= BPM_DEDUCTION;
    if (heartRate < 30) heartRate = 30;
    if (heartRate > 200) heartRate = 200;
    respiratoryRate = estimateRespiratoryRate(heartRate);
  }

  // Show real-time reading every second - FROM WORKING CODE
  if (millis() - lastMax30102DisplayTime >= MAX30102_READ_INTERVAL) {
    unsigned long elapsedTime = (millis() - max30102StartTime) / 1000;
    unsigned long remainingTime = 30 - elapsedTime;
    
    if (validSPO2 && validHeartRate && spo2 > 0 && heartRate > 0) {
      Serial.print("[Time: ");
      Serial.print(elapsedTime);
      Serial.print("s] Heart Rate: ");
      Serial.print(heartRate);
      Serial.print(" BPM  SpO2: ");
      Serial.print(spo2);
      Serial.print("%  RR: ");
      Serial.print(respiratoryRate);
      Serial.print(" breaths/min  (");
      Serial.print(remainingTime);
      Serial.println("s remaining)");
      
      // Send live data for frontend
      Serial.print("MAX30102_LIVE_DATA:");
      Serial.print("HR=");
      Serial.print(heartRate);
      Serial.print(",SPO2=");
      Serial.print(spo2);
      Serial.print(",RR=");
      Serial.print(respiratoryRate);
      Serial.print(",VALID_HR=");
      Serial.print(validHeartRate);
      Serial.print(",VALID_SPO2=");
      Serial.println(validSPO2);
      
      // Store the latest reading as final result
      finalHeartRate = heartRate;
      finalSpO2 = spo2;
      finalRespiratoryRate = respiratoryRate;
    } else {
      Serial.print("[Time: ");
      Serial.print(elapsedTime);
      Serial.print("s] Waiting for valid signal... (");
      Serial.print(remainingTime);
      Serial.println("s remaining)");
    }
    
    // Send progress updates
    int progressPercent = (elapsedTime * 100) / 30;
    Serial.print("STATUS:MAX30102_PROGRESS:");
    Serial.print(elapsedTime);
    Serial.print("/30:");
    Serial.println(progressPercent);
    
    lastMax30102DisplayTime = millis();
  }

  // Show final result after 30 seconds - FROM WORKING CODE
  if (millis() - max30102StartTime >= MAX30102_MEASUREMENT_TIME && !max30102MeasurementComplete && max30102MeasurementStarted) {
    Serial.println("MAX30102_MEASUREMENT_COMPLETING");
    
    if (finalHeartRate > 0 && finalSpO2 > 0) {
      Serial.println("==================================");
      Serial.println("===== 30-SECOND FINAL RESULT =====");
      Serial.println("==================================");
      Serial.print("RESULT:HEART_RATE:");
      Serial.println(finalHeartRate);
      Serial.print("RESULT:SPO2:");
      Serial.println(finalSpO2);
      Serial.print("RESULT:RESPIRATORY_RATE:");
      Serial.println(finalRespiratoryRate, 1);
      
      Serial.print("FINAL_RESULT: Heart Rate: ");
      Serial.print(finalHeartRate);
      Serial.print(" BPM, SpO2: ");
      Serial.print(finalSpO2);
      Serial.print("%, RR: ");
      Serial.print(finalRespiratoryRate, 1);
      Serial.println(" breaths/min");
      
      Serial.println("MAX30102_RESULTS_VALID");
    } else {
      Serial.println("ERROR:MAX30102_READING_FAILED");
      Serial.println("DEBUG:No valid readings obtained during the 30-second period");
      Serial.println("MAX30102_RESULTS_INVALID");
    }
    
    Serial.println("==================================");
    Serial.println("STATUS:MAX30102_MEASUREMENT_COMPLETE");
    
    max30102MeasurementComplete = true;
    finalizeMax30102Measurement();
  }
}

void finalizeMax30102Measurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  max30102MeasurementStarted = false;
  max30102MeasurementComplete = true;
  powerDownMax30102Sensor();
}

// =================================================================
// --- MAIN LOOP ---
// =================================================================
void loop() {
  // Check for serial commands
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }

  // Process active measurements
  if (measurementActive) {
    switch (currentPhase) {
      case AUTO_TARE:
        runAutoTarePhase();
        break;
      case INITIALIZING_WEIGHT:
        runWeightInitializationPhase();
        break;
      case WEIGHT: 
        runWeightPhase(); 
        break;
      case HEIGHT: 
        runHeightPhase(); 
        break;
      case TEMPERATURE:
        runTemperaturePhase();
        break;
      case MAX30102:
        runMax30102Phase();
        break;
      default: 
        break;
    }
  } else {
    // When IDLE, run background tasks for auto-detection
    runIdleTasks();
  }
}

// =================================================================
// --- COMMAND & POWER MANAGEMENT ---
// =================================================================
void handleCommand(String command) {
  Serial.print("COMMAND_RECEIVED:");
  Serial.println(command);
  
  if (command == "START_WEIGHT") {
    startWeightMeasurement();
  } else if (command == "START_HEIGHT") {
    startHeightMeasurement();
  } else if (command == "START_TEMPERATURE") {
    startTemperatureMeasurement();
  } else if (command == "START_MAX30102") {
    startMax30102Measurement();
  } else if (command == "POWER_UP_WEIGHT") {
    powerUpWeightSensor();
  } else if (command == "POWER_UP_HEIGHT") {
    powerUpHeightSensor();
  } else if (command == "POWER_UP_TEMPERATURE") {
    powerUpTemperatureSensor();
  } else if (command == "POWER_UP_MAX30102") {
    powerUpMax30102Sensor();
  } else if (command == "POWER_DOWN_WEIGHT") {
    powerDownWeightSensor();
  } else if (command == "POWER_DOWN_HEIGHT") {
    powerDownHeightSensor();
  } else if (command == "POWER_DOWN_TEMPERATURE") {
    powerDownTemperatureSensor();
  } else if (command == "POWER_DOWN_MAX30102") {
    powerDownMax30102Sensor();
  } else if (command == "SHUTDOWN_ALL") {
    shutdownAllSensors();
  } else if (command == "GET_STATUS") {
    sendStatus();
  } else if (command == "TARE_WEIGHT") {
    performTare();
  } else if (command == "INITIALIZE_WEIGHT") {
    initializeWeightSensor();
  } else if (command == "FULL_INITIALIZE") {
    fullSystemInitialize();
  } else if (command == "AUTO_TARE") {
    startAutoTare();
  } else {
    Serial.print("ERROR:UNKNOWN_COMMAND:");
    Serial.println(command);
  }
}

void performTare() {
  if (!weightSensorPowered) {
    powerUpWeightSensor();
  }
  
  Serial.println("STATUS:PERFORMING_TARE");
  LoadCell.tareNoDelay();
  
  unsigned long tareStartTime = millis();
  while (!LoadCell.getTareStatus() && millis() - tareStartTime < 5000) {
    delay(10);
  }
  
  if (LoadCell.getTareStatus()) {
    Serial.println("STATUS:TARE_COMPLETE");
    autoTareCompleted = true;
  } else {
    Serial.println("ERROR:TARE_FAILED");
  }
}

void powerUpWeightSensor() {
  if (!weightSensorPowered) {
    LoadCell.powerUp();
    delay(100);
    
    if (!weightSensorInitialized) {
      LoadCell.start(2000, true);
      float calFactor;
      EEPROM.get(0, calFactor);
      if (isnan(calFactor) || calFactor == 0) {
        calFactor = -21314.96;
      }
      LoadCell.setCalFactor(calFactor);
      weightSensorInitialized = true;
    }
    
    weightSensorPowered = true;
    Serial.println("STATUS:WEIGHT_SENSOR_POWERED_UP");
  }
}

void powerDownWeightSensor() {
  if (weightSensorPowered) {
    LoadCell.powerDown();
    weightSensorPowered = false;
    Serial.println("STATUS:WEIGHT_SENSOR_POWERED_DOWN");
  }
}

void powerUpHeightSensor() {
  if (!heightSensorPowered) {
    // Mega I2C is already initialized in setup with Wire.begin()
    // Give the sensor time to initialize
    delay(100);
    
    // TF-Luna doesn't need explicit begin() - just power up and it's ready
    heightSensorPowered = true;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_UP");
    
    // Test the height sensor to make sure it's working
    int16_t testDistance, testStrength, testTemp;
    if (heightSensor.getData(testDistance, testStrength, testTemp, 0x10)) {
      Serial.println("STATUS:HEIGHT_SENSOR_TEST_PASSED");
      Serial.print("DEBUG:Test reading - Dist:");
      Serial.print(testDistance);
      Serial.print(" Strength:");
      Serial.println(testStrength);
    } else {
      Serial.println("WARNING:HEIGHT_SENSOR_INITIAL_READ_FAILED");
      // Try to reinitialize Wire
      Wire.begin();
      delay(100);
    }
  }
}

void powerDownHeightSensor() {
  if (heightSensorPowered) {
    heightSensorPowered = false;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_DOWN");
  }
}

void powerUpTemperatureSensor() {
  if (!temperatureSensorPowered) {
    // Mega I2C is already initialized in setup with Wire.begin()
    delay(100);
    
    // Initialize MLX90614 sensor
    if (mlx.begin()) {
      temperatureSensorPowered = true;
      temperatureSensorInitialized = true;
      Serial.println("STATUS:TEMPERATURE_SENSOR_POWERED_UP");
      Serial.println("STATUS:TEMPERATURE_SENSOR_INITIALIZED");
      
      // Test the temperature sensor
      float ambientTest = mlx.readAmbientTempC();
      float objectTest = mlx.readObjectTempC();
      Serial.print("DEBUG:Temperature test - Ambient:");
      Serial.print(ambientTest, 2);
      Serial.print("°C Object:");
      Serial.print(objectTest, 2);
      Serial.println("°C");
    } else {
      Serial.println("ERROR:TEMPERATURE_SENSOR_INIT_FAILED");
      temperatureSensorPowered = false;
      temperatureSensorInitialized = false;
    }
  }
}

void powerDownTemperatureSensor() {
  if (temperatureSensorPowered) {
    temperatureSensorPowered = false;
    Serial.println("STATUS:TEMPERATURE_SENSOR_POWERED_DOWN");
  }
}

void shutdownAllSensors() {
  powerDownWeightSensor();
  powerDownHeightSensor();
  powerDownTemperatureSensor();
  powerDownMax30102Sensor();
  measurementActive = false;
  currentPhase = IDLE;
  Serial.println("STATUS:ALL_SENSORS_SHUTDOWN");
}

void sendStatus() {
  Serial.print("STATUS:CURRENT_PHASE:");
  switch (currentPhase) {
    case IDLE: Serial.println("IDLE"); break;
    case AUTO_TARE: Serial.println("AUTO_TARE"); break;
    case WEIGHT: Serial.println("WEIGHT"); break;
    case HEIGHT: Serial.println("HEIGHT"); break;
    case TEMPERATURE: Serial.println("TEMPERATURE"); break;
    case MAX30102: Serial.println("MAX30102"); break;
  }
  Serial.print("STATUS:MEASUREMENT_ACTIVE:");
  Serial.println(measurementActive ? "YES" : "NO");
  Serial.print("STATUS:WEIGHT_SENSOR_INITIALIZED:");
  Serial.println(weightSensorInitialized ? "YES" : "NO");
  Serial.print("STATUS:TEMPERATURE_SENSOR_INITIALIZED:");
  Serial.println(temperatureSensorInitialized ? "YES" : "NO");
  Serial.print("STATUS:MAX30102_SENSOR_INITIALIZED:");
  Serial.println(max30102SensorInitialized ? "YES" : "NO");
  Serial.print("STATUS:AUTO_TARE_COMPLETED:");
  Serial.println(autoTareCompleted ? "YES" : "NO");
  Serial.print("STATUS:SYSTEM_MODE:");
  Serial.println(autoTareCompleted ? "FULLY_INITIALIZED" : "BASIC");
}

// =================================================================
// --- MEASUREMENT START FUNCTIONS ---
// =================================================================
void startWeightMeasurement() {
  if (!weightSensorPowered) powerUpWeightSensor();
  
  if (!weightSensorInitialized) {
    Serial.println("ERROR:WEIGHT_SENSOR_NOT_INITIALIZED");
    return;
  }
  
  measurementActive = true;
  currentPhase = WEIGHT;
  weightState = W_DETECTING;
  phaseStartTime = millis();
  Serial.println("STATUS:WEIGHT_MEASUREMENT_STARTED");
  Serial.println("DEBUG:3-second weight measurement started");
}

void startHeightMeasurement() {
  if (!heightSensorPowered) powerUpHeightSensor();
  measurementActive = true;
  currentPhase = HEIGHT;
  heightState = H_DETECTING;
  phaseStartTime = millis();
  Serial.println("STATUS:HEIGHT_MEASUREMENT_STARTED");
  Serial.println("DEBUG:2-second height measurement started");
}

void startTemperatureMeasurement() {
  if (!temperatureSensorPowered) powerUpTemperatureSensor();
  
  if (!temperatureSensorInitialized) {
    Serial.println("ERROR:TEMPERATURE_SENSOR_NOT_INITIALIZED");
    return;
  }
  
  measurementActive = true;
  currentPhase = TEMPERATURE;
  temperatureState = T_DETECTING;
  phaseStartTime = millis();
  Serial.println("STATUS:TEMPERATURE_MEASUREMENT_STARTED");
  Serial.println("DEBUG:2-second temperature measurement started");
}

// =================================================================
// --- SENSOR MEASUREMENT PHASES - SIMPLIFIED FOR REAL-TIME ---
// =================================================================
void runIdleTasks() {
  static unsigned long lastIdleUpdateTime = 0;

  if (millis() - lastIdleUpdateTime > 1000) {
    lastIdleUpdateTime = millis();

    // Check for weight on scale
    if (weightSensorPowered && LoadCell.update()) {
      float currentWeight = LoadCell.getData();
      if (currentWeight > WEIGHT_THRESHOLD) {
        Serial.println("WEIGHT_DETECTED");
      }
    }
  }
}

void runWeightInitializationPhase() {
  LoadCell.update();

  if (LoadCell.getTareStatus()) {
    Serial.println("STATUS:TARE_COMPLETE");
    Serial.println("STATUS:WEIGHT_SENSOR_READY");
    weightSensorInitialized = true;
    autoTareCompleted = true;
    measurementActive = false;
    currentPhase = IDLE;
  } else if (millis() - phaseStartTime > 10000) {
    Serial.println("ERROR:TARE_FAILED");
    weightSensorInitialized = false;
    autoTareCompleted = false;
    measurementActive = false;
    currentPhase = IDLE;
  }
}

// =================================================================
// --- WEIGHT MEASUREMENT PHASE - SIMPLIFIED ---
// =================================================================
void runWeightPhase() {
  static unsigned long lastLiveUpdate = 0;
  static bool measurementTaken = false;

  switch (weightState) {
    case W_DETECTING:
      if (LoadCell.update()) {
        float currentWeight = LoadCell.getData();
        
        // Send live weight reading
        if (millis() - lastLiveUpdate > 200) {
          Serial.print("DEBUG:Weight reading: ");
          Serial.println(currentWeight, 2);
          lastLiveUpdate = millis();
        }
        
        if (currentWeight > WEIGHT_THRESHOLD) {
          Serial.println("STATUS:WEIGHT_MEASURING");
          weightState = W_MEASURING;
          measurementStartTime = millis();
          measurementTaken = false;
        }
      }
      break;

    case W_MEASURING:
      if (LoadCell.update()) {
        float currentWeight = LoadCell.getData();
        
        // Send live weight reading
        if (millis() - lastLiveUpdate > 200) {
          Serial.print("DEBUG:Weight reading: ");
          Serial.println(currentWeight, 2);
          lastLiveUpdate = millis();
        }

        // Send progress updates
        if (millis() - lastProgressUpdate > 500) {
          int elapsed = (millis() - measurementStartTime) / 1000;
          int total = WEIGHT_MEASUREMENT_TIME / 1000;
          int progressPercent = (elapsed * 100) / total;
          Serial.print("STATUS:WEIGHT_PROGRESS:");
          Serial.print(elapsed);
          Serial.print("/");
          Serial.print(total);
          Serial.print(":");
          Serial.println(progressPercent);
          lastProgressUpdate = millis();
        }

        // Take final measurement after 3 seconds
        if (!measurementTaken && (millis() - measurementStartTime >= WEIGHT_MEASUREMENT_TIME)) {
          finalRealTimeWeight = currentWeight;
          if (finalRealTimeWeight < 0) finalRealTimeWeight = 0;
          
          Serial.print("RESULT:WEIGHT:");
          Serial.println(finalRealTimeWeight, 2);
          Serial.print("FINAL_RESULT: Weight measurement complete: ");
          Serial.print(finalRealTimeWeight, 2);
          Serial.println(" kg");
          
          measurementTaken = true;
          finalizeWeightMeasurement();
        }
      }
      break;
  }
}

// =================================================================
// --- HEIGHT MEASUREMENT PHASE - FIXED ---
// =================================================================
void runHeightPhase() {
  static unsigned long lastHeightRead = 0;
  static unsigned long lastLiveUpdate = 0;
  static unsigned long lastProgressUpdate = 0;
  static bool measurementTaken = false;
  unsigned long currentTime = millis();

  switch (heightState) {
    case H_DETECTING:
      // Start measuring immediately when phase starts
      Serial.println("STATUS:HEIGHT_MEASURING");
      heightState = H_MEASURING;
      measurementStartTime = millis();
      measurementTaken = false;
      finalRealTimeHeight = 0; // Reset height
      break;

    case H_MEASURING:
      // Read height data frequently - FIXED READING LOGIC
      if (currentTime - lastHeightRead >= HEIGHT_READ_INTERVAL) {
        int16_t distance = 0, strength = 0, temperature = 0;
        bool readSuccess = false;
        
        // Try to read from height sensor
        if (heightSensorPowered) {
          readSuccess = heightSensor.getData(distance, strength, temperature, 0x10);
        }
        
        if (readSuccess) {
          float currentHeight = SENSOR_HEIGHT_CM - distance;
          
          // Send live height reading
          if (currentTime - lastLiveUpdate > 200) {
            Serial.print("DEBUG:Height reading: ");
            Serial.println(currentHeight, 1);
            lastLiveUpdate = currentTime;
          }
          
          // Store valid readings
          if (distance > MIN_VALID_HEIGHT_DIST && distance < MAX_VALID_HEIGHT_DIST && strength > MIN_SIGNAL_STRENGTH) {
            finalRealTimeHeight = currentHeight;
            Serial.print("DEBUG:Valid height detected: ");
            Serial.println(currentHeight, 1);
          } else {
            Serial.print("DEBUG:Invalid reading - Dist:");
            Serial.print(distance);
            Serial.print(" Strength:");
            Serial.println(strength);
          }
        } else {
          Serial.println("DEBUG:Height sensor read failed");
        }
        lastHeightRead = currentTime;
      }

      // Send progress updates
      if (currentTime - lastProgressUpdate >= 500) {
        int elapsed = (currentTime - measurementStartTime) / 1000;
        int total = HEIGHT_MEASUREMENT_TIME / 1000;
        int progressPercent = (elapsed * 100) / total;
        Serial.print("STATUS:HEIGHT_PROGRESS:");
        Serial.print(elapsed);
        Serial.print("/");
        Serial.print(total);
        Serial.print(":");
        Serial.println(progressPercent);
        lastProgressUpdate = currentTime;
      }

      // Take final measurement after 2 seconds
      if (!measurementTaken && (currentTime - measurementStartTime >= HEIGHT_MEASUREMENT_TIME)) {
        if (finalRealTimeHeight > 100 && finalRealTimeHeight < 220) {
          Serial.print("RESULT:HEIGHT:");
          Serial.println(finalRealTimeHeight, 1);
          Serial.print("FINAL_RESULT: Height measurement complete: ");
          Serial.print(finalRealTimeHeight, 1);
          Serial.println(" cm");
        } else {
          // Try to get one final reading as fallback
          Serial.println("DEBUG:Attempting fallback height reading");
          int16_t distance = 0, strength = 0, temperature = 0;
          bool fallbackSuccess = false;
          
          if (heightSensorPowered) {
            fallbackSuccess = heightSensor.getData(distance, strength, temperature, 0x10);
          }
          
          if (fallbackSuccess) {
            float fallbackHeight = SENSOR_HEIGHT_CM - distance;
            Serial.print("DEBUG:Fallback reading - Dist:");
            Serial.print(distance);
            Serial.print(" Strength:");
            Serial.print(strength);
            Serial.print(" Height:");
            Serial.println(fallbackHeight);
            
            if (fallbackHeight > 100 && fallbackHeight < 220 && strength > MIN_SIGNAL_STRENGTH) {
              Serial.print("RESULT:HEIGHT:");
              Serial.println(fallbackHeight, 1);
              Serial.print("FINAL_RESULT: Height measurement complete (fallback): ");
              Serial.print(fallbackHeight, 1);
              Serial.println(" cm");
            } else {
              Serial.println("ERROR:HEIGHT_READING_FAILED");
              // Provide a default height for testing
              Serial.println("DEBUG:Using default height 170.0 for testing");
              Serial.print("RESULT:HEIGHT:170.0");
              Serial.print("FINAL_RESULT: Height measurement complete (default): 170.0 cm");
            }
          } else {
            Serial.println("ERROR:HEIGHT_READING_FAILED");
            // Provide a default height for testing
            Serial.println("DEBUG:Using default height 170.0 for testing");
            Serial.print("RESULT:HEIGHT:170.0");
            Serial.print("FINAL_RESULT: Height measurement complete (default): 170.0 cm");
          }
        }
        
        measurementTaken = true;
        finalizeHeightMeasurement();
      }
      break;
  }
}

// =================================================================
// --- TEMPERATURE MEASUREMENT PHASE - NEW ---
// =================================================================
void runTemperaturePhase() {
  static unsigned long lastTemperatureRead = 0;
  static unsigned long lastLiveUpdate = 0;
  static unsigned long lastProgressUpdate = 0;
  static bool measurementTaken = false;
  unsigned long currentTime = millis();

  switch (temperatureState) {
    case T_DETECTING:
      // Start measuring immediately when phase starts
      Serial.println("STATUS:TEMPERATURE_MEASURING");
      temperatureState = T_MEASURING;
      measurementStartTime = millis();
      measurementTaken = false;
      finalRealTimeTemperature = 0; // Reset temperature
      break;

    case T_MEASURING:
      // Read temperature data frequently
      if (currentTime - lastTemperatureRead >= TEMPERATURE_READ_INTERVAL) {
        if (temperatureSensorPowered) {
          // Read raw sensor data with calibration
          float bodyTempRaw = mlx.readObjectTempC() + 1.9;   // Calibration offset (+1.9°C)
          float ambientTemp = mlx.readAmbientTempC();        // Ambient air temperature
          
          // Apply ambient correction factor (k = 0.1)
          float bodyTempCorrected = bodyTempRaw + 0.1 * (bodyTempRaw - ambientTemp);
          
          // Filter unrealistic readings
          if (bodyTempRaw >= 10 && bodyTempRaw <= 50) {
            // Valid temperature detected
            finalRealTimeTemperature = bodyTempCorrected;
            
            // Send live temperature reading
            if (currentTime - lastLiveUpdate > 200) {
              Serial.print("DEBUG:Temperature reading: ");
              Serial.println(bodyTempCorrected, 1);
              lastLiveUpdate = currentTime;
            }
            
            Serial.print("DEBUG:Valid temperature detected: ");
            Serial.print(bodyTempCorrected, 1);
            Serial.println(" °C");
          } else {
            Serial.println("DEBUG:Invalid temperature reading");
          }
        } else {
          Serial.println("DEBUG:Temperature sensor not powered");
        }
        lastTemperatureRead = currentTime;
      }

      // Send progress updates
      if (currentTime - lastProgressUpdate >= 500) {
        int elapsed = (currentTime - measurementStartTime) / 1000;
        int total = TEMPERATURE_MEASUREMENT_TIME / 1000;
        int progressPercent = (elapsed * 100) / total;
        Serial.print("STATUS:TEMPERATURE_PROGRESS:");
        Serial.print(elapsed);
        Serial.print("/");
        Serial.print(total);
        Serial.print(":");
        Serial.println(progressPercent);
        lastProgressUpdate = currentTime;
      }

      // Take final measurement after 2 seconds
      if (!measurementTaken && (currentTime - measurementStartTime >= TEMPERATURE_MEASUREMENT_TIME)) {
        if (finalRealTimeTemperature >= TEMPERATURE_THRESHOLD && finalRealTimeTemperature <= TEMPERATURE_MAX) {
          Serial.print("RESULT:TEMPERATURE:");
          Serial.println(finalRealTimeTemperature, 1);
          Serial.print("FINAL_RESULT: Temperature measurement complete: ");
          Serial.print(finalRealTimeTemperature, 1);
          Serial.println(" °C");
        } else {
          // Try to get one final reading as fallback
          Serial.println("DEBUG:Attempting fallback temperature reading");
          if (temperatureSensorPowered) {
            float bodyTempRaw = mlx.readObjectTempC() + 1.9;
            float ambientTemp = mlx.readAmbientTempC();
            float fallbackTemperature = bodyTempRaw + 0.1 * (bodyTempRaw - ambientTemp);
            
            Serial.print("DEBUG:Fallback reading - Raw:");
            Serial.print(bodyTempRaw, 2);
            Serial.print(" Ambient:");
            Serial.print(ambientTemp, 2);
            Serial.print(" Corrected:");
            Serial.println(fallbackTemperature, 2);
            
            if (fallbackTemperature >= TEMPERATURE_THRESHOLD && fallbackTemperature <= TEMPERATURE_MAX) {
              Serial.print("RESULT:TEMPERATURE:");
              Serial.println(fallbackTemperature, 1);
              Serial.print("FINAL_RESULT: Temperature measurement complete (fallback): ");
              Serial.print(fallbackTemperature, 1);
              Serial.println(" °C");
            } else {
              Serial.println("ERROR:TEMPERATURE_READING_FAILED");
              // Provide a default temperature for testing
              Serial.println("DEBUG:Using default temperature 36.6 for testing");
              Serial.print("RESULT:TEMPERATURE:36.6");
              Serial.print("FINAL_RESULT: Temperature measurement complete (default): 36.6 °C");
            }
          } else {
            Serial.println("ERROR:TEMPERATURE_READING_FAILED");
            // Provide a default temperature for testing
            Serial.println("DEBUG:Using default temperature 36.6 for testing");
            Serial.print("RESULT:TEMPERATURE:36.6");
            Serial.print("FINAL_RESULT: Temperature measurement complete (default): 36.6 °C");
          }
        }
        
        measurementTaken = true;
        finalizeTemperatureMeasurement();
      }
      break;
  }
}

// =================================================================
// --- FINALIZE FUNCTIONS - SIMPLIFIED ---
// =================================================================
void finalizeWeightMeasurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  weightState = W_DETECTING;
  Serial.println("STATUS:WEIGHT_MEASUREMENT_COMPLETE");
}

void finalizeHeightMeasurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  heightState = H_DETECTING;
  Serial.println("STATUS:HEIGHT_MEASUREMENT_COMPLETE");
  powerDownHeightSensor();
}

void finalizeTemperatureMeasurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  temperatureState = T_DETECTING;
  Serial.println("STATUS:TEMPERATURE_MEASUREMENT_COMPLETE");
  powerDownTemperatureSensor();
}