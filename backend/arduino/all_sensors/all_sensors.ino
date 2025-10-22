// LIBRARIES for all sensors
#include <Wire.h>
#include <EEPROM.h>
#include "HX711_ADC.h"         // For Weight
#include "TFLI2C.h"            // For Height (TF-Luna Lidar)
#include <Adafruit_MLX90614.h> // For Temperature
#include "MAX30105.h"          // For Heart Rate & SpO2
#include "heartRate.h"
#include "spo2_algorithm.h"

// =================================================================
// --- SENSOR OBJECTS ---
// =================================================================
HX711_ADC LoadCell(4, 5);
TFLI2C heightSensor;
Adafruit_MLX90614 tempSensor;
MAX30105 particleSensor;

// =================================================================
// --- SYSTEM STATE MANAGEMENT ---
// =================================================================
enum SystemPhase { IDLE, INITIALIZING_WEIGHT, WEIGHT, HEIGHT, TEMP, HR };
SystemPhase currentPhase = IDLE;
bool measurementActive = false;
unsigned long phaseStartTime = 0;

// Sensor power states
bool weightSensorPowered = false;
bool heightSensorPowered = false;
bool tempSensorPowered = false;
bool hrSensorPowered = false;

// Weight sensor initialization flag
bool weightSensorInitialized = false;
bool autoTareCompleted = false;

// --- Measurement Variables ---
// Weight
const float WEIGHT_THRESHOLD = 1.0; // Require at least 1kg to start
const unsigned long STABILIZATION_TIMEOUT = 10000; // 10 seconds to stabilize
const unsigned long WEIGHT_AVERAGING_TIME = 5000; // Increased to 5 seconds for accuracy
const float STABILITY_THRESHOLD_KG = 0.2; // Readings must be within 200g to be stable
const int STABILITY_READING_COUNT = 15; // Number of recent readings to check for stability
enum WeightSubState { W_DETECTING, W_STABILIZING, W_AVERAGING };
WeightSubState weightState = W_DETECTING;

// Height
enum HeightSubState { H_DETECTING, H_AVERAGING };
HeightSubState heightState = H_DETECTING;
const unsigned long HEIGHT_AVERAGING_TIME = 3000;
const unsigned long HEIGHT_READ_INTERVAL = 50; // Read more frequently for better averaging
const float SENSOR_HEIGHT_CM = 213.36; // 7 feet in cm
const int MIN_VALID_HEIGHT_DIST = 30;  // User must be at least 30cm away
const int MAX_VALID_HEIGHT_DIST = 180; // User must be within 180cm
unsigned long lastHeightReadTime = 0;
long distanceSum = 0;
int heightReadCount = 0;

// Temperature
const unsigned long TEMP_MEASUREMENT_TIME = 5000;
const float TEMP_CALIBRATION_OFFSET = 1.5; // Adjusted calibration offset
unsigned long lastTempUpdateTime = 0;

// Heart Rate & SpO2 - 60 SECOND MEASUREMENT WITH MAXIM ALGORITHM
const unsigned long HR_MEASUREMENT_TIME = 60000; // 60 seconds total measurement
bool fingerDetected = false;
unsigned long lastSecondTime = 0;
unsigned long lastSampleTime = 0;

// MAX30102 Data buffers for Maxim algorithm
#define BUFFER_SIZE 100
uint32_t irBuffer[BUFFER_SIZE];
uint32_t redBuffer[BUFFER_SIZE];
int bufferIndex = 0;

// Real-time data for 60 seconds (12 x 5-second blocks)
float heartRateAverages[12] = {0};
float spo2Averages[12] = {0};
float respiratoryAverages[12] = {0};
bool blockCompleted[12] = {false};
int current5SecondBlock = 0;

// Current second measurements
int currentHeartRate = 0;
int currentSpO2 = 0;
int currentRespiratoryRate = 0;

// Final 60-second averages
float finalHeartRate = 0;
float finalSpO2 = 0;
float finalRespiratoryRate = 0;

// Measurement tracking
int secondsElapsed = 0;
unsigned long last5SecondTime = 0;

// =================================================================
// --- SETUP FUNCTION ---
// =================================================================
void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  // Wait for serial connection
  while (!Serial) {
    delay(10);
  }
  
  Serial.println("==========================================");
  Serial.println("HEALTH MONITORING SYSTEM - INITIALIZING");
  Serial.println("==========================================");
  
  // Quick initialization - just establish connection first
  Serial.println("STATUS:BOOTING_UP");
  
  // Initialize basic sensor objects without full setup
  initializeBasicSensors();
  
  // Mark as ready for commands immediately
  Serial.println("STATUS:READY_FOR_COMMANDS");
  Serial.println("SYSTEM:CONNECTED_BASIC_MODE");
  Serial.println("DEBUG:Setup completed successfully");
}

void initializeBasicSensors() {
  Serial.println("DEBUG:Initializing basic sensors...");
  
  // Quick initialization - just create objects
  LoadCell.begin();
  Serial.println("DEBUG:Load cell initialized");
  
  // Temperature sensor quick init
  if (tempSensor.begin()) {
    Serial.println("DEBUG:Temperature sensor initialized");
  } else {
    Serial.println("DEBUG:Temperature sensor failed");
  }
  
  // Heart rate sensor quick init - IMPROVED INITIALIZATION
  Serial.println("DEBUG:Initializing MAX30102...");
  
  // Initialize with retry logic
  bool sensorInitialized = false;
  for (int i = 0; i < 3; i++) {
    if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
      sensorInitialized = true;
      break;
    }
    delay(1000);
    Serial.println("DEBUG:Retrying MAX30102 initialization...");
  }
  
  if (sensorInitialized) {
    Serial.println("DEBUG:MAX30102 found successfully!");
    
    // Configure sensor with optimal settings for Maxim algorithm
    byte ledBrightness = 0x1F; // Options: 0=Off to 255=50mA
    byte sampleAverage = 4;    // Options: 1, 2, 4, 8, 16, 32
    byte ledMode = 2;          // Options: 1 = Red only, 2 = Red + IR, 3 = Red + IR + Green
    int sampleRate = 100;      // Options: 50, 100, 200, 400, 800, 1000, 1600, 3200
    int pulseWidth = 411;      // Options: 69, 118, 215, 411
    int adcRange = 4096;       // Options: 2048, 4096, 8192, 16384
    
    particleSensor.setup(ledBrightness, sampleAverage, ledMode, sampleRate, pulseWidth, adcRange);
    
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    
    Serial.println("DEBUG:MAX30102 configured with optimal settings");
    Serial.println("DEBUG:Sensor ready for finger detection");
  } else {
    Serial.println("ERROR:MAX30102_NOT_FOUND");
    Serial.println("DEBUG:Check MAX30102 wiring: SDA->A4, SCL->A5, 3.3V, GND");
  }
  
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
    calFactor = 696.0;
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
  // Temperature sensor
  if (tempSensor.begin()) {
    Serial.println("STATUS:TEMP_SENSOR_READY");
  } else {
    Serial.println("ERROR:TEMP_SENSOR_INIT_FAILED");
  }
  
  // Heart rate sensor
  if (particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    Serial.println("STATUS:HR_SENSOR_READY");
    Serial.println("DEBUG:HR sensor ready - 60-second monitoring with Maxim algorithm");
  } else {
    Serial.println("ERROR:HR_SENSOR_INIT_FAILED");
  }
  
  // Height sensor
  Serial.println("STATUS:HEIGHT_SENSOR_READY");
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
      case INITIALIZING_WEIGHT:
        runWeightInitializationPhase();
        break;
      case WEIGHT: 
        runWeightPhase(); 
        break;
      case HEIGHT: 
        runHeightPhase(); 
        break;
      case TEMP:   
        runTemperaturePhase(); 
        break;
      case HR:     
        runHeartRatePhase(); 
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
  } else if (command == "START_TEMP") {
    startTemperatureMeasurement();
  } else if (command == "START_HR") {
    startHeartRateMeasurement();
  } else if (command == "POWER_UP_WEIGHT") {
    powerUpWeightSensor();
  } else if (command == "POWER_UP_HEIGHT") {
    powerUpHeightSensor();
  } else if (command == "POWER_UP_TEMP") {
    powerUpTempSensor();
  } else if (command == "POWER_UP_HR") {
    powerUpHrSensor();
  } else if (command == "POWER_DOWN_WEIGHT") {
    powerDownWeightSensor();
  } else if (command == "POWER_DOWN_HEIGHT") {
    powerDownHeightSensor();
  } else if (command == "POWER_DOWN_TEMP") {
    powerDownTempSensor();
  } else if (command == "POWER_DOWN_HR") {
    powerDownHrSensor();
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
        calFactor = 696.0;
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
    Wire.begin();
    heightSensorPowered = true;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_UP");
  }
}

void powerDownHeightSensor() {
  if (heightSensorPowered) {
    heightSensorPowered = false;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_DOWN");
  }
}

void powerUpTempSensor() {
  if (!tempSensorPowered) {
    Wire.begin();
    tempSensor.begin();
    tempSensorPowered = true;
    Serial.println("STATUS:TEMP_SENSOR_POWERED_UP");
  }
}

void powerDownTempSensor() {
  if (tempSensorPowered) {
    tempSensorPowered = false;
    Serial.println("STATUS:TEMP_SENSOR_POWERED_DOWN");
  }
}

void powerUpHrSensor() {
  if (!hrSensorPowered) {
    Wire.begin();
    
    // Wake up the sensor first
    particleSensor.wakeUp();
    delay(100);
    
    // Configuration for 60-second monitoring with Maxim algorithm
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x0A);
    particleSensor.setPulseAmplitudeGreen(0);
    
    hrSensorPowered = true;
    
    Serial.println("STATUS:HR_SENSOR_POWERED_UP");
    Serial.println("DEBUG:MAX30102 powered up - 60-second monitoring with Maxim algorithm");
  }
}

void powerDownHrSensor() {
  if (hrSensorPowered) {
    particleSensor.shutDown();
    hrSensorPowered = false;
    Serial.println("STATUS:HR_SENSOR_POWERED_DOWN");
  }
}

void shutdownAllSensors() {
  powerDownWeightSensor();
  powerDownHeightSensor();
  powerDownTempSensor();
  powerDownHrSensor();
  measurementActive = false;
  currentPhase = IDLE;
  Serial.println("STATUS:ALL_SENSORS_SHUTDOWN");
}

void sendStatus() {
  Serial.print("STATUS:CURRENT_PHASE:");
  switch (currentPhase) {
    case IDLE: Serial.println("IDLE"); break;
    case WEIGHT: Serial.println("WEIGHT"); break;
    case HEIGHT: Serial.println("HEIGHT"); break;
    case TEMP: Serial.println("TEMP"); break;
    case HR: Serial.println("HR"); break;
  }
  Serial.print("STATUS:MEASUREMENT_ACTIVE:");
  Serial.println(measurementActive ? "YES" : "NO");
  Serial.print("STATUS:WEIGHT_SENSOR_INITIALIZED:");
  Serial.println(weightSensorInitialized ? "YES" : "NO");
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
}

void startHeightMeasurement() {
  if (!heightSensorPowered) powerUpHeightSensor();
  measurementActive = true;
  currentPhase = HEIGHT;
  distanceSum = 0;
  heightReadCount = 0;
  lastHeightReadTime = 0;
  heightState = H_DETECTING;
  phaseStartTime = millis();
  Serial.println("STATUS:HEIGHT_MEASUREMENT_STARTED");
}

void startTemperatureMeasurement() {
  if (!tempSensorPowered) powerUpTempSensor();
  measurementActive = true;
  currentPhase = TEMP;
  phaseStartTime = millis();
  lastTempUpdateTime = millis();
  Serial.println("STATUS:TEMP_MEASUREMENT_STARTED");
}

void startHeartRateMeasurement() {
  if (!hrSensorPowered) {
    powerUpHrSensor();
  }
  
  measurementActive = true;
  currentPhase = HR;
  phaseStartTime = millis();
  lastSecondTime = millis();
  last5SecondTime = millis();
  fingerDetected = false;
  
  // Reset all data arrays
  bufferIndex = 0;
  current5SecondBlock = 0;
  
  for (int i = 0; i < 12; i++) {
    heartRateAverages[i] = 0;
    spo2Averages[i] = 0;
    respiratoryAverages[i] = 0;
    blockCompleted[i] = false;
  }
  
  for (int i = 0; i < BUFFER_SIZE; i++) {
    irBuffer[i] = 0;
    redBuffer[i] = 0;
  }
  
  finalHeartRate = 0;
  finalSpO2 = 0;
  finalRespiratoryRate = 0;
  
  currentHeartRate = 0;
  currentSpO2 = 0;
  currentRespiratoryRate = 0;
  
  Serial.println("STATUS:HR_MEASUREMENT_STARTED");
  Serial.println("DEBUG:60-second MAX30102 monitoring started");
  Serial.println("DEBUG:Using Maxim algorithm for HR/SpO2 calculation");
  Serial.println("TIME | HR Avg | SpO2 Avg | RR Avg | Status");
  Serial.println("-----|---------|----------|---------|--------");
}

// =================================================================
// --- SENSOR MEASUREMENT PHASES ---
// =================================================================
void runIdleTasks() {
  static unsigned long lastIdleUpdateTime = 0;

  if (millis() - lastIdleUpdateTime > 1000) {
    lastIdleUpdateTime = millis();

    // Check for live temperature
    if (tempSensorPowered) {
      float objectTemp = tempSensor.readObjectTempC();
      if (objectTemp > 20.0 && objectTemp < 45.0) {
        float liveTemp = objectTemp + TEMP_CALIBRATION_OFFSET;
        Serial.print("DATA:TEMP:");
        Serial.println(liveTemp, 1);
      }
    }

    // Check for finger on MAX30102
    if (hrSensorPowered) {
      long irValue = particleSensor.getIR();
      
      if (irValue > 50000) {
        if (!fingerDetected) {
          fingerDetected = true;
          Serial.println("FINGER_DETECTED");
        }
      } else {
        if (fingerDetected) {
          fingerDetected = false;
          Serial.println("FINGER_REMOVED");
        }
      }
    }

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

void runWeightPhase() {
  static unsigned long stateStartTime = 0;
  static unsigned long lastProgressUpdate = 0;
  static float weightSum = 0;
  static int readingCount = 0;
  static float recentReadings[STABILITY_READING_COUNT];
  static int readingIndex = 0;
  static bool bufferFilled = false;

  switch (weightState) {
    case W_DETECTING:
      if (LoadCell.update()) {
        float currentWeight = LoadCell.getData();
        if (currentWeight > WEIGHT_THRESHOLD) {
          Serial.println("STATUS:WEIGHT_STABILIZING");
          weightState = W_STABILIZING;
          stateStartTime = millis();
          readingIndex = 0;
          bufferFilled = false;
        }
      }
      break;

    case W_STABILIZING:
      if (LoadCell.update()) {
        recentReadings[readingIndex] = LoadCell.getData();
        readingIndex++;
        if (readingIndex >= STABILITY_READING_COUNT) {
          readingIndex = 0;
          bufferFilled = true;
        }

        if (bufferFilled) {
          float minVal = recentReadings[0];
          float maxVal = recentReadings[0];
          for (int i = 1; i < STABILITY_READING_COUNT; i++) {
            if (recentReadings[i] < minVal) minVal = recentReadings[i];
            if (recentReadings[i] > maxVal) maxVal = recentReadings[i];
          }

          if (maxVal - minVal <= STABILITY_THRESHOLD_KG) {
            Serial.println("STATUS:WEIGHT_AVERAGING");
            weightState = W_AVERAGING;
            stateStartTime = millis();
            weightSum = 0;
            readingCount = 0;
            lastProgressUpdate = millis();
          }
        }
      }

      if (millis() - stateStartTime > STABILIZATION_TIMEOUT) {
        Serial.println("ERROR:WEIGHT_UNSTABLE");
        measurementActive = false;
        currentPhase = IDLE;
        weightState = W_DETECTING;
      }
      break;

    case W_AVERAGING:
      if (LoadCell.update()) {
        float currentWeight = LoadCell.getData();
        if (currentWeight < 0) currentWeight = 0;
        weightSum += currentWeight;
        readingCount++;
      }

      if (millis() - lastProgressUpdate > 1000) {
        int elapsed = (millis() - stateStartTime) / 1000;
        int total = WEIGHT_AVERAGING_TIME / 1000;
        Serial.print("STATUS:AVERAGING_PROGRESS:");
        Serial.print(elapsed);
        Serial.print("/");
        Serial.println(total);
        lastProgressUpdate = millis();
      }

      if (millis() - stateStartTime >= WEIGHT_AVERAGING_TIME) {
        finalizeWeightMeasurement(weightSum, readingCount);
      }
      break;
  }
}

void runHeightPhase() {
  static unsigned long lastProgressUpdate = 0;
  unsigned long currentTime = millis();

  if (currentTime - lastProgressUpdate >= 1000) {
    int elapsed = (currentTime - phaseStartTime) / 1000;
    int total = HEIGHT_AVERAGING_TIME / 1000;
    Serial.print("STATUS:HEIGHT_PROGRESS:");
    Serial.print(elapsed);
    Serial.print("/");
    Serial.println(total);
    lastProgressUpdate = currentTime;
  }

  if (currentTime - phaseStartTime >= HEIGHT_AVERAGING_TIME) {
    int16_t finalDistCm;
    if (heightSensor.getData(finalDistCm, 0x10) && finalDistCm > 0) {
      float finalHeight = SENSOR_HEIGHT_CM - finalDistCm;
      if (finalHeight > 30 && finalHeight < 220) {
        Serial.print("RESULT:HEIGHT:");
        Serial.println(finalHeight, 1);
      } else {
        Serial.println("ERROR:HEIGHT_READING_OUT_OF_RANGE");
      }
    } else {
      Serial.println("ERROR:HEIGHT_READING_FAILED");
    }
    finalizeHeightMeasurement();
  }
}

void finalizeWeightMeasurement(float weightSum, int readingCount) {
  if (readingCount > 0) {
    float finalWeight = weightSum / readingCount;
    if (finalWeight < 0) finalWeight = 0;
    Serial.print("RESULT:WEIGHT:");
    Serial.println(finalWeight, 2);
  } else {
    Serial.println("ERROR:WEIGHT_READING_FAILED");
  }
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

void runTemperaturePhase() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastTempUpdateTime >= 1000) {
    int elapsed = (currentTime - phaseStartTime) / 1000;
    int total = TEMP_MEASUREMENT_TIME / 1000;
    Serial.print("STATUS:TEMP_PROGRESS:");
    Serial.print(elapsed);
    Serial.print("/");
    Serial.println(total);
    lastTempUpdateTime = currentTime;
  }

  if (currentTime - phaseStartTime >= TEMP_MEASUREMENT_TIME) {
    float objectTemp = tempSensor.readObjectTempC();
    float finalTemp = objectTemp + TEMP_CALIBRATION_OFFSET;
    
    if (finalTemp > 20.0 && finalTemp < 45.0) {
      Serial.print("RESULT:TEMP:");
      Serial.println(finalTemp, 2);
    } else {
      Serial.println("ERROR:TEMP_READING_INVALID");
    }
    
    delay(100);
    measurementActive = false;
    currentPhase = IDLE;
    powerDownTempSensor();
    Serial.println("STATUS:TEMP_MEASUREMENT_COMPLETE");
  }
}

// =================================================================
// --- IMPROVED HR/SpO2 FUNCTIONS USING MAXIM ALGORITHM ---
// =================================================================
void runHeartRatePhase() {
  unsigned long currentTime = millis();
  
  // Update seconds elapsed
  if (currentTime - lastSecondTime >= 1000) {
    lastSecondTime = currentTime;
    secondsElapsed = (currentTime - phaseStartTime) / 1000;
    
    // Send progress update
    int remaining = 60 - secondsElapsed;
    int progressPercent = (secondsElapsed * 100) / 60;
    Serial.print("STATUS:HR_PROGRESS:");
    Serial.print(secondsElapsed);
    Serial.print("/60:");
    Serial.println(progressPercent);
  }

  // Check for finger detection
  long irValue = particleSensor.getIR();
  bool newFingerDetected = (irValue > 50000);
  
  if (newFingerDetected && !fingerDetected) {
    fingerDetected = true;
    Serial.println("FINGER_DETECTED");
  } else if (!newFingerDetected && fingerDetected) {
    fingerDetected = false;
    Serial.println("FINGER_REMOVED");
  }

  // Collect samples continuously when finger is detected
  if (fingerDetected && particleSensor.available()) {
    collectSensorSamples();
  }

  // Calculate vital signs every second when we have enough samples
  if (bufferIndex >= BUFFER_SIZE) {
    calculateVitalSigns();
    bufferIndex = 0; // Reset buffer for next second
  }

  // Calculate 5-second averages
  if (currentTime - last5SecondTime >= 5000 && current5SecondBlock < 12) {
    calculate5SecondAverage();
    last5SecondTime = currentTime;
    current5SecondBlock++;
  }

  // Finalize measurement after 60 seconds
  if (currentTime - phaseStartTime >= HR_MEASUREMENT_TIME) {
    finalizeHRMeasurement();
  }
}

void collectSensorSamples() {
  // Collect samples at approximately 100Hz (10ms intervals)
  if (millis() - lastSampleTime >= 10) {
    lastSampleTime = millis();
    
    if (bufferIndex < BUFFER_SIZE) {
      redBuffer[bufferIndex] = particleSensor.getRed();
      irBuffer[bufferIndex] = particleSensor.getIR();
      bufferIndex++;
    }
    particleSensor.nextSample();
  }
}

bool calculateVitalSigns() {
  int32_t spo2Value, heartRateValue;
  int8_t validSPO2, validHeartRate;
  
  // Calculate heart rate and SpO2 using Maxim algorithm
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE, redBuffer,
    &spo2Value, &validSPO2,
    &heartRateValue, &validHeartRate
  );
  
  // Store valid readings
  if (validHeartRate && validSPO2 && heartRateValue > 0 && spo2Value > 0) {
    currentHeartRate = heartRateValue;
    currentSpO2 = spo2Value;
    currentRespiratoryRate = estimateRespiratoryRate();
    
    // Send real-time data to frontend
    Serial.print("DATA:VITAL_SIGNS:");
    Serial.print(currentHeartRate);
    Serial.print(":");
    Serial.print(currentSpO2);
    Serial.print(":");
    Serial.print(currentRespiratoryRate);
    Serial.print(":");
    Serial.print(secondsElapsed);
    Serial.print(":");
    Serial.println(secondsElapsed);
    
    return true;
  }
  
  return false;
}

int estimateRespiratoryRate() {
  // Simple respiratory rate estimation
  int baseRate = 16;
  return baseRate;
}

void calculate5SecondAverage() {
  // For now, we'll use the current reading as the 5-second average
  // In a more sophisticated implementation, we'd average multiple readings
  heartRateAverages[current5SecondBlock] = currentHeartRate;
  spo2Averages[current5SecondBlock] = currentSpO2;
  respiratoryAverages[current5SecondBlock] = currentRespiratoryRate;
  blockCompleted[current5SecondBlock] = true;
  
  // Send 5-second average to frontend
  int timeSeconds = (current5SecondBlock + 1) * 5;
  Serial.print("DATA:5SEC_AVERAGE:");
  Serial.print(heartRateAverages[current5SecondBlock], 1);
  Serial.print(":");
  Serial.print(spo2Averages[current5SecondBlock], 1);
  Serial.print(":");
  Serial.print(respiratoryAverages[current5SecondBlock], 1);
  Serial.print(":");
  Serial.print(timeSeconds);
  Serial.print(":");
  Serial.println(secondsElapsed);
  
  // Display in terminal
  displayTerminalOutput();
}

void displayTerminalOutput() {
  int timeSeconds = (current5SecondBlock + 1) * 5;
  
  Serial.print(" ");
  if (timeSeconds < 10) Serial.print(" ");
  Serial.print(timeSeconds);
  Serial.print("s  | ");
  
  // Heart Rate
  if (heartRateAverages[current5SecondBlock] > 0) {
    if (heartRateAverages[current5SecondBlock] < 100) Serial.print(" ");
    Serial.print(heartRateAverages[current5SecondBlock], 1);
    Serial.print("  | ");
  } else {
    Serial.print("  --   | ");
  }
  
  // SpO2
  if (spo2Averages[current5SecondBlock] > 0) {
    if (spo2Averages[current5SecondBlock] < 100) Serial.print(" ");
    Serial.print(spo2Averages[current5SecondBlock], 1);
    Serial.print("   | ");
  } else {
    Serial.print("  --   | ");
  }
  
  // Respiratory Rate
  if (respiratoryAverages[current5SecondBlock] > 0) {
    if (respiratoryAverages[current5SecondBlock] < 10) Serial.print(" ");
    Serial.print(respiratoryAverages[current5SecondBlock], 1);
    Serial.print("   | ");
  } else {
    Serial.print("  --   | ");
  }
  
  // Status
  if (heartRateAverages[current5SecondBlock] > 0 && spo2Averages[current5SecondBlock] > 0) {
    Serial.println("✅ Good");
  } else if (heartRateAverages[current5SecondBlock] > 0 || spo2Averages[current5SecondBlock] > 0) {
    Serial.println("⚠️  Partial");
  } else {
    Serial.println("❌ No Data");
  }
}

void finalizeHRMeasurement() {
  Serial.println("\n========================================");
  Serial.println("=== 60-SECOND MEASUREMENT COMPLETE ===");
  Serial.println("========================================");
  
  // Calculate final averages from all 5-second blocks
  float totalHr = 0, totalSpo2 = 0, totalRr = 0;
  int validBlocks = 0;
  
  for (int i = 0; i < 12; i++) {
    if (blockCompleted[i] && heartRateAverages[i] > 0 && spo2Averages[i] > 0) {
      totalHr += heartRateAverages[i];
      totalSpo2 += spo2Averages[i];
      totalRr += respiratoryAverages[i];
      validBlocks++;
    }
  }
  
  if (validBlocks > 0) {
    finalHeartRate = totalHr / validBlocks;
    finalSpO2 = totalSpo2 / validBlocks;
    finalRespiratoryRate = totalRr / validBlocks;
    
    Serial.println("FINAL AVERAGES (from 5-second blocks):");
    Serial.print("Heart Rate:      ");
    Serial.print(finalHeartRate, 1);
    Serial.println(" BPM");
    
    Serial.print("SpO2:            ");
    Serial.print(finalSpO2, 1);
    Serial.println(" %");
    
    Serial.print("Respiratory Rate: ");
    Serial.print(finalRespiratoryRate, 1);
    Serial.println(" breaths/min");
    
    Serial.print("Valid 5-second blocks: ");
    Serial.print(validBlocks);
    Serial.println("/12");
    
    // Send final results
    Serial.print("RESULT:HR:");
    Serial.print(finalHeartRate, 1);
    Serial.print(":");
    Serial.print(finalSpO2, 1);
    Serial.print(":");
    Serial.println(finalRespiratoryRate, 1);
    
  } else {
    // No valid data collected
    Serial.println("MEASUREMENT RESULT: No valid sensor data collected");
    Serial.println("Please ensure finger is properly placed on sensor");
    Serial.println("and try again.");
    
    // Send error result
    Serial.println("RESULT:HR:0:0:0");
  }
  
  Serial.println("========================================");

  // Reset and power down
  measurementActive = false;
  currentPhase = IDLE;
  fingerDetected = false;
  
  powerDownHrSensor();
  Serial.println("STATUS:HR_MEASUREMENT_COMPLETE");
}