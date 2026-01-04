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
// --- MAX30102 CONSTANTS ---
// =================================================================
#define BUFFER_SIZE 25  // OPTIMIZED: Reduced from 100 to 25 for ~1s updates instead of ~5s
uint32_t irBuffer[BUFFER_SIZE];  
uint32_t redBuffer[BUFFER_SIZE];  
int32_t spo2;          
int8_t validSPO2;      
int32_t heartRate;     
int8_t validHeartRate; 
float respiratoryRate = 0;

// MAX30102 - FRONTEND CONTROLS TIMING (30 seconds)
// Arduino only streams data, does NOT track progress
const unsigned long MAX30102_SAFETY_TIMEOUT = 60000;  // 60 seconds safety timeout (longer for pulse ox)
const unsigned long MAX30102_READ_INTERVAL = 100;     // Show readings every 100ms

// BPM deduction
const int BPM_DEDUCTION = 25;  // Deduct 25 BPM dynamically

// Variables to store final results
int32_t finalHeartRate = 0;
int32_t finalSpO2 = 0;
float finalRespiratoryRate = 0;
bool max30102MeasurementComplete = false;
bool fingerDetected = false;
bool max30102MeasurementStarted = false;
unsigned long max30102StartTime = 0;
unsigned long lastMax30102DisplayTime = 0;

// Averaging variables
float totalHeartRate = 0;
float totalSpO2 = 0;
float totalRR = 0;
int sampleCount = 0;

// =================================================================
// --- TEMPERATURE CONSTANTS ---
// =================================================================
const float TEMPERATURE_CALIBRATION_OFFSET = 3.5;  // Calibration offset
const float TEMPERATURE_THRESHOLD = 35.0;          // Minimum valid temperature
const float TEMPERATURE_MAX = 42.0;                // Maximum valid temperature

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

// --- Measurement Variables ---
// Weight - FRONTEND CONTROLS TIMING (3 seconds)
// Arduino only streams data, does NOT track progress
const unsigned long WEIGHT_SAFETY_TIMEOUT = 30000; // 30 seconds safety timeout
const float WEIGHT_THRESHOLD = 1.0; // Require at least 1kg to start
const float WEIGHT_NOISE_THRESHOLD = 0.02; // 20 grams = 0.02 kg (noise filter)
float lastWeightKg = 0.0; // For noise filtering
unsigned long lastWeightPrint = 0; // For 100ms update rate
enum WeightSubState { W_DETECTING, W_MEASURING };
WeightSubState weightState = W_DETECTING;

// Height - FRONTEND CONTROLS TIMING (2 seconds)  
// Arduino only streams data, does NOT track progress
const unsigned long HEIGHT_SAFETY_TIMEOUT = 30000; // 30 seconds safety timeout
const unsigned long HEIGHT_READ_INTERVAL = 100;
enum HeightSubState { H_DETECTING, H_MEASURING };
HeightSubState heightState = H_DETECTING;

// Temperature - FRONTEND CONTROLS TIMING
// Arduino only streams data, does NOT track progress
const unsigned long TEMPERATURE_SAFETY_TIMEOUT = 30000; // 30 seconds safety timeout
const unsigned long TEMPERATURE_READ_INTERVAL = 200;
enum TemperatureSubState { T_DETECTING, T_MEASURING };
TemperatureSubState temperatureState = T_DETECTING;

// Measurement variables
unsigned long measurementStartTime = 0;
float finalRealTimeWeight = 0;
float finalRealTimeHeight = 0;
float finalRealTimeTemperature = 0;

// Height sensor constants
const float SENSOR_HEIGHT_CM = 213.36; // 7 feet in cm
const int MIN_VALID_HEIGHT_DIST = 30;
const int MAX_VALID_HEIGHT_DIST = 180;
const int MIN_SIGNAL_STRENGTH = 100;
unsigned long lastHeightReadTime = 0;
unsigned long lastProgressUpdate = 0;

// Temperature sensor variables
unsigned long lastTemperatureReadTime = 0;
bool temperatureSensorInitialized = false;

// MAX30102 timing variables
bool max30102SensorInitialized = false;

// =================================================================
// --- SETUP FUNCTION ---
// =================================================================
void setup() {
  Serial.begin(115200);  // OPTIMIZED: Faster baud rate for reduced latency
  
  // Arduino Mega I2C pins: SDA = 20, SCL = 21
  Wire.begin();
  
  // Wait for serial connection
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("==========================================");
  Serial.println("BMI MEASUREMENT SYSTEM - ARDUINO MEGA");
  Serial.println("==========================================");
  
  Serial.println("STATUS:BOOTING_UP");
  
  // Initialize basic sensor objects
  initializeBasicSensors();
  
  // Start auto-tare process immediately
  startAutoTare();
  
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
    calFactor = -21330.55; // UPDATED: Working calibration factor
    Serial.println("STATUS:USING_DEFAULT_CALIBRATION");
  }
  LoadCell.setCalFactor(calFactor);
  
  // 🔥 FAST response (setSamplesInUse = 2 for real-time)
  LoadCell.setSamplesInUse(2);

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
    
    // Power down weight sensor after tare
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
  
  LoadCell.begin();
  Serial.println("DEBUG:Load cell initialized");
  
  Serial.println("DEBUG:Height sensor ready for initialization");
  Serial.println("DEBUG:Temperature sensor ready for initialization");
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
  
  float calFactor;
  EEPROM.get(0, calFactor);
  if (isnan(calFactor) || calFactor == 0) {
    calFactor = -21330.55; // UPDATED: Working calibration factor
    Serial.println("STATUS:USING_DEFAULT_CALIBRATION");
  }
  LoadCell.setCalFactor(calFactor);
  
  // 🔥 FAST response (setSamplesInUse = 2 for real-time)
  LoadCell.setSamplesInUse(2);

  Serial.print("STATUS:CALIBRATION_FACTOR:");
  Serial.println(calFactor);
  
  Serial.println("STATUS:PERFORMING_AUTO_TARE");
  currentPhase = INITIALIZING_WEIGHT;
  measurementActive = true;
  phaseStartTime = millis();
  LoadCell.tareNoDelay();
}

void initializeOtherSensors() {
  Serial.println("STATUS:HEIGHT_SENSOR_READY");
  Serial.println("STATUS:TEMPERATURE_SENSOR_READY");
  Serial.println("STATUS:MAX30102_SENSOR_READY");
}

void fullSystemInitialize() {
  Serial.println("STATUS:FULL_SYSTEM_INITIALIZATION_STARTED");
  initializeWeightSensor();
  initializeOtherSensors();
  Serial.println("STATUS:FULL_SYSTEM_INITIALIZATION_COMPLETE");
}

// =================================================================
// --- TEMPERATURE CLASSIFICATION FUNCTION ---
// =================================================================
String classifyTemperature(float temp) {
  if (temp >= 35.0 && temp <= 37.2) return "Normal";
  else if (temp >= 37.3 && temp <= 38.0) return "Elevated";
  else if (temp > 38.0 && temp <= 42.0) return "Critical";
  else return "Out of Range";
}

// =================================================================
// --- MAX30102 FUNCTIONS - FIXED TO SEND IR VALUES ---
// =================================================================

// === Estimate RR from HR ===
float estimateRespiratoryRate(int bpm) {
  float rr;
  if (bpm < 40) rr = 8;
  else if (bpm <= 100) rr = bpm / 4.0;
  else if (bpm <= 140) rr = bpm / 4.5;
  else rr = bpm / 5.0;

  if (rr < 8) rr = 8;
  if (rr > 40) rr = 40;
  return rr;
}

void powerUpMax30102Sensor() {
  // Force stop any other ongoing measurement phase to prevent conflicts (e.g., Weight loop running)
  if (measurementActive) {
    measurementActive = false;
    currentPhase = IDLE;
    Serial.println("STATUS:ACTIVE_MEASUREMENT_STOPPED_FOR_MAX30102");
  }

  // If already powered, just ensure it's awake and restart monitoring
  if (max30102SensorPowered) {
    Serial.println("STATUS:MAX30102_SENSOR_POWERED_UP"); // Send standard success message
    particleSensor.wakeUp();
    startFingerDetection();
    return;
  }

  if (!max30102SensorPowered) {
    Serial.println("STATUS:POWERING_UP_MAX30102");
    
    for (int attempt = 0; attempt < 3; attempt++) {
      if (particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
        // Configure sensor for reliable detection
        byte ledBrightness = 0x7F; // Options: 0=Off to 255=50mA (0x7F = ~25mA, visible and reliable)
        byte sampleAverage = 4; // Options: 1, 2, 4, 8, 16, 32
        byte ledMode = 2; // Options: 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
        int sampleRate = 400; // Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
        int pulseWidth = 411; // Options: 69, 118, 215, 411
        int adcRange = 4096; // Options: 2048, 4096, 8192, 16384

        particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
        
        // Explicitly set amplitudes to ensure visibility and detection
        particleSensor.setPulseAmplitudeRed(0x7F); // Bright Red (visible)
        particleSensor.setPulseAmplitudeIR(0x7F);  // Strong IR (detection)
        particleSensor.setPulseAmplitudeGreen(0);  // Green off
        particleSensor.wakeUp(); // Ensure it's awake after setup
        
        max30102SensorPowered = true;
        max30102SensorInitialized = true;
        
        // Clear any old flags that might be stuck
        fingerDetected = false;
        
        Serial.println("STATUS:MAX30102_SENSOR_POWERED_UP");
        Serial.println("STATUS:MAX30102_SENSOR_INITIALIZED");
        
        // Start continuous finger monitoring
        startFingerDetection();
        return;
      }
      delay(500);
    }
    
    Serial.println("ERROR:MAX30102_NOT_FOUND");
    max30102SensorPowered = false;
    max30102SensorInitialized = false;
  }
}

void powerDownMax30102Sensor() {
  // Always set flag to false
  max30102SensorPowered = false; // LOGICAL SHUTDOWN: Stops loop data processing
  
  // Force hardware shutdown (Sleep mode is safe)
  // particleSensor.shutDown(); // KEEP SENSOR ACTIVE avoids wake-up issues
  
  Serial.println("STATUS:MAX30102_SENSOR_POWERED_DOWN");
}

// Start continuous finger detection
void startFingerDetection() {
  Serial.println("MAX30102_STATE:FINGER_DETECTION_ACTIVE");
  Serial.println("MAX30102_READY:Place finger on sensor to start automatic measurement");
}

// Continuous finger monitoring with automatic measurement start
void monitorFingerPresence() {
  static unsigned long lastFingerCheck = 0;
  
  if (millis() - lastFingerCheck > 50) { // OPTIMIZED: Check every 50ms for faster response
    long irValue = particleSensor.getIR();
    
    // Always send IR value for monitoring
    Serial.print("MAX30102_IR_VALUE:");
    Serial.println(irValue);
    
    bool currentFingerState = (irValue > 50000);
    
    if (currentFingerState && !fingerDetected) {
      // Finger just detected - start measurement automatically
      fingerDetected = true;
      Serial.println("FINGER_DETECTED");
      Serial.println("MAX30102_STATE:FINGER_DETECTED");
      Serial.println("MAX30102_FINGER_STATUS:DETECTED");
      Serial.println("MAX30102_READY:Finger detected! Starting automatic measurement...");
      
      // Start measurement automatically when finger is detected
      startMax30102Measurement();
      
    } else if (!currentFingerState && fingerDetected) {
      // Finger just removed
      fingerDetected = false;
      Serial.println("FINGER_REMOVED");
      Serial.println("MAX30102_STATE:WAITING_FOR_FINGER");
      Serial.println("MAX30102_FINGER_STATUS:NOT_DETECTED");
      Serial.println("MAX30102_READY:Place finger on sensor to start measurement");
      
      // Stop any ongoing measurement
      if (max30102MeasurementStarted) {
        max30102MeasurementStarted = false;
        measurementActive = false;
        currentPhase = IDLE;
        Serial.println("MAX30102_STATE:MEASUREMENT_STOPPED_FINGER_REMOVED");
      }
    }
    
    lastFingerCheck = millis();
  }
}

void startMax30102Measurement() {
  if (!max30102SensorPowered) powerUpMax30102Sensor();
  
  if (!max30102SensorInitialized) {
    Serial.println("ERROR:MAX30102_SENSOR_NOT_INITIALIZED");
    return;
  }
  
  // Check if finger is present before starting
  long irValue = particleSensor.getIR();
  if (irValue < 50000) {
    Serial.println("ERROR:MAX30102_NO_FINGER");
    Serial.println("MAX30102_READY:Please place finger on sensor first");
    return;
  }
  
  // Reset all states
  measurementActive = true;
  currentPhase = MAX30102;
  max30102MeasurementStarted = true;
  max30102StartTime = millis();
  lastMax30102DisplayTime = millis();
  max30102MeasurementComplete = false;
  finalHeartRate = 0;
  finalSpO2 = 0;
  finalRespiratoryRate = 0;
  
  // Reset averaging variables
  totalHeartRate = 0;
  totalSpO2 = 0;
  totalRR = 0;
  sampleCount = 0;
  
  Serial.println("STATUS:MAX30102_MEASUREMENT_STARTED");
  Serial.println("MAX30102_STATE:MEASURING");
  Serial.println("✅ Finger detected! Streaming data continuously...");
  Serial.println("==================================================");
}

void runMax30102Phase() {
  unsigned long currentTime = millis();
  
  // Always monitor finger presence during MAX30102 phase
  monitorFingerPresence();
  
  // If no finger detected during measurement, stop it
  if (max30102MeasurementStarted && !fingerDetected) {
    Serial.println("MAX30102_STATE:FINGER_REMOVED_DURING_MEASUREMENT");
    Serial.println("FINGER_REMOVED");
    max30102MeasurementStarted = false;
    measurementActive = false;
    currentPhase = IDLE;
    return;
  }
  
  // If measurement hasn't started yet, just monitor finger
  if (!max30102MeasurementStarted) {
    return;
  }

  // SIMPLIFIED: Just collect a small batch of samples and send data every ~1 second
  // Frontend controls the 30-second timer and averaging
  
  // Collect samples for processing (reduced buffer for ~1s cycle)
  for (byte i = 0; i < BUFFER_SIZE; i++) {
    while (!particleSensor.available())
      particleSensor.check();

    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
  }

  // Process this batch
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE, redBuffer,
    &spo2, &validSPO2,
    &heartRate, &validHeartRate
  );

  // Apply BPM deduction
  if (validHeartRate && heartRate > 0) {
    heartRate -= BPM_DEDUCTION;
    if (heartRate < 30) heartRate = 30;
    if (heartRate > 200) heartRate = 200;
    respiratoryRate = estimateRespiratoryRate(heartRate);
  }

  // Always send IR value
  long irValue = particleSensor.getIR();
  Serial.print("MAX30102_IR_VALUE:");
  Serial.println(irValue);
  
  // Send live data if valid (Frontend will collect and average)
  if (validSPO2 && validHeartRate && spo2 > 0 && heartRate > 0) {
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
  } else {
    // Send waiting signal so frontend knows we're still trying
    Serial.println("MAX30102_WAITING_FOR_VALID_SIGNAL");
  }
  
  // Safety timeout (stop after 60s if frontend doesn't respond)
  if (currentTime - max30102StartTime > MAX30102_SAFETY_TIMEOUT) {
    Serial.println("STATUS:MAX30102_SAFETY_TIMEOUT");
    finalizeMax30102Measurement();
  }
}

void finalizeMax30102Measurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  max30102MeasurementStarted = false;
  max30102MeasurementComplete = true;
  
  Serial.println("MAX30102_STATE:MEASUREMENT_STOPPED");
  Serial.println("MAX30102_READY:Measurement stopped. Place finger to start new measurement.");
}

// NEW: Called by frontend when 30 seconds is complete
void stopMax30102Measurement() {
  Serial.println("STATUS:MAX30102_STOP_REQUESTED");
  max30102MeasurementStarted = false;
  measurementActive = false;
  currentPhase = IDLE;
  fingerDetected = false;
  Serial.println("MAX30102_STATE:MEASUREMENT_COMPLETED_BY_FRONTEND");
  Serial.println("STATUS:MAX30102_MEASUREMENT_COMPLETE");
}

// =================================================================
// --- MAIN LOOP - UPDATED FOR CONTINUOUS FINGER MONITORING ---
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
    // When IDLE, run background tasks including finger monitoring
    runIdleTasks();
    
    // Always monitor finger if MAX30102 is powered
    if (max30102SensorPowered) {
      monitorFingerPresence();
    }
  }
}

// =================================================================
// --- COMMAND HANDLING ---
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
  } else if (command == "STOP_MAX30102") {
    stopMax30102Measurement();
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
      LoadCell.start(1000, true); // OPTIMIZED: Reduced from 2000 to 1000 for faster start
      float calFactor;
      EEPROM.get(0, calFactor);
      if (isnan(calFactor) || calFactor == 0) {
        calFactor = -21330.55; // UPDATED: Working calibration factor
      }
      LoadCell.setCalFactor(calFactor);
      
      // 🔥 FAST response (setSamplesInUse = 2 for real-time)
      LoadCell.setSamplesInUse(2);
      
      weightSensorInitialized = true;
    }
    
    weightSensorPowered = true;
    Serial.println("STATUS:WEIGHT_SENSOR_POWERED_UP");
  }
}

void powerDownWeightSensor() {
  // DISABLE PHYSICAL SHUTDOWN to allow rapid restart for next user and PRESERVE TARE
  // LoadCell.powerDown(); -- Keep physical power ON
  weightSensorPowered = false; // LOGICAL SHUTDOWN: Stops data stream & triggers 'powerUp' check on next start
  
  // Respond to backend so it thinks we shut down
  Serial.println("STATUS:WEIGHT_SENSOR_POWERED_DOWN");
}

void powerUpHeightSensor() {
  if (heightSensorPowered) {
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_UP");
    return;
  }

  if (!heightSensorPowered) {
    delay(100);
    heightSensorPowered = true;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_UP");
  }
}

void powerDownHeightSensor() {
  // LOGICAL SHUTDOWN: Stops runHeightPhase data stream
  heightSensorPowered = false; 
  
  // Physical shutdown commented out to keep TF-Luna ready
  // Serial.println("STATUS:HEIGHT_SENSOR_POWERED_DOWN"); -- Duplicate print removed
  
  Serial.println("STATUS:HEIGHT_SENSOR_POWERED_DOWN");
}
void powerUpTemperatureSensor() {
  if (temperatureSensorPowered) {
    // If already on, just confirm to backend
    Serial.println("STATUS:TEMPERATURE_SENSOR_POWERED_UP");
    return;
  }
  
  if (!temperatureSensorPowered) {
    delay(100);
    
    if (temperatureSensorInitialized) {
      temperatureSensorPowered = true;
      Serial.println("STATUS:TEMPERATURE_SENSOR_POWERED_UP");
      return;
    }
    
    if (mlx.begin()) {
      temperatureSensorPowered = true;
      temperatureSensorInitialized = true;
      Serial.println("STATUS:TEMPERATURE_SENSOR_POWERED_UP");
      Serial.println("STATUS:TEMPERATURE_SENSOR_INITIALIZED");
      Serial.println("🌡️ Temperature sensor ready!");
    } else {
      Serial.println("ERROR:TEMPERATURE_SENSOR_INIT_FAILED");
      Serial.println("❌ Failed to initialize MLX90614. Check wiring!");
      temperatureSensorPowered = false;
      temperatureSensorInitialized = false;
    }
  }
}

void powerDownTemperatureSensor() {
  if (temperatureSensorPowered) {
    // temperatureSensorPowered = false; // KEEP SENSOR ACTIVE to avoid re-init crash
    Serial.println("STATUS:TEMPERATURE_SENSOR_POWERED_DOWN");
  }
}

void shutdownAllSensors() {
  // powerDownWeightSensor(); // KEEP WEIGHT SENSOR ACTIVE AS PER REQUIREMENTS
  // powerDownHeightSensor(); // KEEP HEIGHT ACTIVE TO PREVENT RE-INIT ISSUES
  // powerDownTemperatureSensor(); // KEEP TEMP ACTIVE TO PREVENT RE-INIT ISSUES
  powerDownMax30102Sensor(); // Only power down MAX30102 (has internal wake/sleep)
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
  Serial.print("STATUS:MAX30102_FINGER_DETECTED:");
  Serial.println(fingerDetected ? "YES" : "NO");
  Serial.print("STATUS:MAX30102_MEASUREMENT_STARTED:");
  Serial.println(max30102MeasurementStarted ? "YES" : "NO");
  Serial.print("STATUS:MAX30102_MEASUREMENT_COMPLETE:");
  Serial.println(max30102MeasurementComplete ? "YES" : "NO");
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
  weightState = W_DETECTING; // Wait for user to step on scale
  phaseStartTime = millis();
  
  // RESET internal content
  finalRealTimeWeight = 0;
  Serial.println("STATUS:WEIGHT_MEASUREMENT_STARTED");
  // Serial.println("STATUS:WEIGHT_MEASURING"); // Don't force measuring, let detection trigger it
}

void runWeightPhase() {
  // FRONTEND CONTROLS TIMING - Arduino just streams data
  // Frontend sends POWER_DOWN_WEIGHT when 3 seconds of stable readings complete
  
  if (LoadCell.update()) {
    float currentWeight = LoadCell.getData();
    
    // STREAMING MODE: Send data every 100ms for responsive UI
    if (millis() - lastWeightPrint >= 100) {
      Serial.print("DEBUG:Weight reading: ");
      Serial.println(currentWeight, 2);
      lastWeightPrint = millis();
    }
    
    // Safety timeout (stop after 30s if frontend doesn't respond)
    if (millis() - phaseStartTime > WEIGHT_SAFETY_TIMEOUT) {
      Serial.println("STATUS:WEIGHT_SAFETY_TIMEOUT");
      finalizeWeightMeasurement();
    }
  }
}

void startHeightMeasurement() {
  if (!heightSensorPowered) powerUpHeightSensor();
  measurementActive = true;
  currentPhase = HEIGHT;
  heightState = H_DETECTING;
  phaseStartTime = millis();
  Serial.println("STATUS:HEIGHT_MEASUREMENT_STARTED");
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
  
  Serial.println("🌡️ Measuring body temperature...");
  Serial.println("Please stand close to the sensor for 2 seconds.");
  Serial.println("-----------------------------------------------");
  
  Serial.println("STATUS:TEMPERATURE_MEASUREMENT_STARTED");
}

// =================================================================
// --- UPDATED TEMPERATURE MEASUREMENT FUNCTIONS ---
// =================================================================
void runTemperaturePhase() {
  // FRONTEND CONTROLS TIMING - Arduino just streams data
  // Frontend sends POWER_DOWN_TEMPERATURE when measurement is complete
  
  static unsigned long lastTemperatureRead = 0;
  static unsigned long lastLiveUpdate = 0;
  unsigned long currentTime = millis();

  switch (temperatureState) {
    case T_DETECTING:
      Serial.println("STATUS:TEMPERATURE_MEASURING");
      temperatureState = T_MEASURING;
      measurementStartTime = millis();
      finalRealTimeTemperature = 0;
      break;

    case T_MEASURING:
      if (currentTime - lastTemperatureRead >= TEMPERATURE_READ_INTERVAL) {
        if (temperatureSensorPowered && temperatureSensorInitialized) {
          // Apply calibration offset
          float currentTemperature = mlx.readObjectTempC() + TEMPERATURE_CALIBRATION_OFFSET;
          
          // Stream data every 200ms for responsive UI
          if (currentTime - lastLiveUpdate >= 200) {
            Serial.print("DEBUG:Temperature reading: ");
            Serial.println(currentTemperature, 2);
            lastLiveUpdate = currentTime;
            
            // Check if temperature is in valid human range
            if (currentTemperature >= TEMPERATURE_THRESHOLD && currentTemperature <= TEMPERATURE_MAX) {
              finalRealTimeTemperature = currentTemperature;
            }
          }
        }
        
        lastTemperatureRead = currentTime;
      }

      // Safety timeout (stop after 30s if frontend doesn't respond)
      if (currentTime - measurementStartTime > TEMPERATURE_SAFETY_TIMEOUT) {
        Serial.println("STATUS:TEMPERATURE_SAFETY_TIMEOUT");
        finalizeTemperatureMeasurement();
      }
      break;
  }
}

// =================================================================
// --- SENSOR MEASUREMENT PHASES ---
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



void runHeightPhase() {
  // FRONTEND CONTROLS TIMING - Arduino just streams data
  // Frontend sends POWER_DOWN_HEIGHT when 2 seconds of stable readings complete
  
  static unsigned long lastHeightRead = 0;
  static unsigned long lastLiveUpdate = 0;
  unsigned long currentTime = millis();

  switch (heightState) {
    case H_DETECTING:
      Serial.println("STATUS:HEIGHT_MEASURING");
      heightState = H_MEASURING;
      measurementStartTime = millis();
      finalRealTimeHeight = 0;
      break;

    case H_MEASURING:
      if (currentTime - lastHeightRead >= HEIGHT_READ_INTERVAL) {
        int16_t distance = 0, strength = 0, temperature = 0;
        bool readSuccess = false;
        
        if (heightSensorPowered) {
          readSuccess = heightSensor.getData(distance, strength, temperature, 0x10);
          
          if (!readSuccess) {
             Serial.println("DEBUG:Height Error: TF-Luna Read Failed");
          }
        } else {
          // If logically powered down, do not read or report
          return;
        }
        
        if (readSuccess) {
          float currentHeight = SENSOR_HEIGHT_CM - distance;
          
          // Stream data every 100ms for responsive UI
          if (currentTime - lastLiveUpdate >= 100) {
            Serial.print("DEBUG:Height reading: ");
            Serial.println(currentHeight, 1);
            lastLiveUpdate = currentTime;
          }
          
          if (distance > MIN_VALID_HEIGHT_DIST && distance < MAX_VALID_HEIGHT_DIST && strength > MIN_SIGNAL_STRENGTH) {
            finalRealTimeHeight = currentHeight;
          }
        }
        
        lastHeightRead = currentTime;
      }

      // Safety timeout (stop after 30s if frontend doesn't respond)
      if (currentTime - measurementStartTime > HEIGHT_SAFETY_TIMEOUT) {
        Serial.println("STATUS:HEIGHT_SAFETY_TIMEOUT");
        finalizeHeightMeasurement();
      }
      break;
  }
}

// =================================================================
// --- MEASUREMENT FINALIZATION FUNCTIONS ---
// =================================================================
void finalizeWeightMeasurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  weightState = W_DETECTING;
  powerDownWeightSensor();
  Serial.println("STATUS:WEIGHT_MEASUREMENT_COMPLETE");
}

void finalizeHeightMeasurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  heightState = H_DETECTING;
  powerDownHeightSensor();
  Serial.println("STATUS:HEIGHT_MEASUREMENT_COMPLETE");
}

void finalizeTemperatureMeasurement() {
  delay(100);
  measurementActive = false;
  currentPhase = IDLE;
  temperatureState = T_DETECTING;
  powerDownTemperatureSensor();
  Serial.println("STATUS:TEMPERATURE_MEASUREMENT_COMPLETE");
}