// LIBRARIES for weight and height only
#include <Wire.h>
#include <EEPROM.h>
#include "HX711_ADC.h"         // For Weight
#include "TFLI2C.h"            // For Height (TF-Luna Lidar)

// =================================================================
// --- SENSOR OBJECTS ---
// =================================================================
HX711_ADC LoadCell(4, 5);
TFLI2C heightSensor;

// =================================================================
// --- SYSTEM STATE MANAGEMENT ---
// =================================================================
enum SystemPhase { IDLE, AUTO_TARE, INITIALIZING_WEIGHT, WEIGHT, HEIGHT };
SystemPhase currentPhase = IDLE;
bool measurementActive = false;
unsigned long phaseStartTime = 0;

// Sensor power states
bool weightSensorPowered = false;
bool heightSensorPowered = false;

// Weight sensor initialization flag
bool weightSensorInitialized = false;
bool autoTareCompleted = false;

// --- Measurement Variables ---
// Weight - OPTIMIZED FOR 3 SECONDS
const float WEIGHT_THRESHOLD = 1.0; // Require at least 1kg to start
const unsigned long STABILIZATION_TIMEOUT = 5000; // Reduced to 5 seconds
const unsigned long WEIGHT_AVERAGING_TIME = 3000; // 3 seconds for weight
const float STABILITY_THRESHOLD_KG = 0.3; // Slightly increased threshold for faster detection
const int STABILITY_READING_COUNT = 10; // Reduced number of readings for faster detection
enum WeightSubState { W_DETECTING, W_STABILIZING, W_AVERAGING };
WeightSubState weightState = W_DETECTING;

// Height - OPTIMIZED FOR 2 SECONDS
enum HeightSubState { H_DETECTING, H_AVERAGING };
HeightSubState heightState = H_DETECTING;
const unsigned long HEIGHT_AVERAGING_TIME = 2000; // 2 seconds for height
const unsigned long HEIGHT_READ_INTERVAL = 50;
const float SENSOR_HEIGHT_CM = 213.36; // 7 feet in cm
const int MIN_VALID_HEIGHT_DIST = 30;
const int MAX_VALID_HEIGHT_DIST = 180;
const int MIN_SIGNAL_STRENGTH = 100; // Minimum signal strength for valid reading
unsigned long lastHeightReadTime = 0;
long distanceSum = 0;
int heightReadCount = 0;

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
  Serial.println("BMI MEASUREMENT SYSTEM - INITIALIZING");
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
  } else if (command == "POWER_UP_WEIGHT") {
    powerUpWeightSensor();
  } else if (command == "POWER_UP_HEIGHT") {
    powerUpHeightSensor();
  } else if (command == "POWER_DOWN_WEIGHT") {
    powerDownWeightSensor();
  } else if (command == "POWER_DOWN_HEIGHT") {
    powerDownHeightSensor();
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
    Wire.begin();
    // TF-Luna doesn't need explicit begin() - just power up and it's ready
    heightSensorPowered = true;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_UP");
    
    // Test the height sensor to make sure it's working
    int16_t testDistance, testStrength, testTemp;
    if (heightSensor.getData(testDistance, testStrength, testTemp, 0x10)) {
      Serial.println("STATUS:HEIGHT_SENSOR_TEST_PASSED");
    } else {
      Serial.println("WARNING:HEIGHT_SENSOR_INITIAL_READ_FAILED");
    }
  }
}

void powerDownHeightSensor() {
  if (heightSensorPowered) {
    heightSensorPowered = false;
    Serial.println("STATUS:HEIGHT_SENSOR_POWERED_DOWN");
  }
}

void shutdownAllSensors() {
  powerDownWeightSensor();
  powerDownHeightSensor();
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
  Serial.println("DEBUG:3-second weight measurement started");
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
  Serial.println("DEBUG:2-second height measurement started");
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

      if (millis() - lastProgressUpdate > 500) {
        int elapsed = (millis() - stateStartTime) / 1000;
        int total = WEIGHT_AVERAGING_TIME / 1000;
        int progressPercent = (elapsed * 100) / total;
        Serial.print("STATUS:AVERAGING_PROGRESS:");
        Serial.print(elapsed);
        Serial.print("/");
        Serial.print(total);
        Serial.print(":");
        Serial.println(progressPercent);
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
  static unsigned long lastHeightRead = 0;
  unsigned long currentTime = millis();

  // Read height data more frequently for better averaging
  if (currentTime - lastHeightRead >= HEIGHT_READ_INTERVAL) {
    int16_t distance, strength, temperature;
    
    if (heightSensor.getData(distance, strength, temperature, 0x10)) {
      Serial.print("DEBUG:Height reading - Distance:");
      Serial.print(distance);
      Serial.print("cm, Strength:");
      Serial.print(strength);
      Serial.print(", Temp:");
      Serial.println(temperature);
      
      if (distance > MIN_VALID_HEIGHT_DIST && distance < MAX_VALID_HEIGHT_DIST && strength > MIN_SIGNAL_STRENGTH) {
        distanceSum += distance;
        heightReadCount++;
        Serial.print("DEBUG:Valid height sample - Count:");
        Serial.println(heightReadCount);
      } else {
        Serial.print("DEBUG:Invalid height reading - ");
        if (distance <= MIN_VALID_HEIGHT_DIST) Serial.print("too close, ");
        if (distance >= MAX_VALID_HEIGHT_DIST) Serial.print("too far, ");
        if (strength <= MIN_SIGNAL_STRENGTH) Serial.print("weak signal");
        Serial.println();
      }
    } else {
      Serial.println("DEBUG:Height sensor read failed - no data received");
    }
    lastHeightRead = currentTime;
  }

  if (currentTime - lastProgressUpdate >= 1000) {
    int elapsed = (currentTime - phaseStartTime) / 1000;
    int total = HEIGHT_AVERAGING_TIME / 1000;
    int progressPercent = (elapsed * 100) / total;
    Serial.print("STATUS:HEIGHT_PROGRESS:");
    Serial.print(elapsed);
    Serial.print("/");
    Serial.print(total);
    Serial.print(":");
    Serial.println(progressPercent);
    lastProgressUpdate = currentTime;
  }

  if (currentTime - phaseStartTime >= HEIGHT_AVERAGING_TIME) {
    if (heightReadCount > 0) {
      float avgDistance = (float)distanceSum / heightReadCount;
      float finalHeight = SENSOR_HEIGHT_CM - avgDistance;
      
      Serial.print("DEBUG:Height calculation - AvgDistance:");
      Serial.print(avgDistance);
      Serial.print("cm, FinalHeight:");
      Serial.print(finalHeight);
      Serial.print("cm, Samples:");
      Serial.println(heightReadCount);
      
      if (finalHeight > 100 && finalHeight < 220) {
        Serial.print("RESULT:HEIGHT:");
        Serial.println(finalHeight, 1);
      } else {
        Serial.println("ERROR:HEIGHT_READING_OUT_OF_RANGE");
        Serial.print("DEBUG:Calculated height ");
        Serial.print(finalHeight);
        Serial.println("cm is outside valid range (100-220cm)");
      }
    } else {
      Serial.println("ERROR:HEIGHT_READING_FAILED");
      Serial.println("DEBUG:No valid height samples collected");
      
      // Try to get a single reading as fallback
      int16_t distance, strength, temperature;
      if (heightSensor.getData(distance, strength, temperature, 0x10)) {
        float fallbackHeight = SENSOR_HEIGHT_CM - distance;
        if (fallbackHeight > 100 && fallbackHeight < 220 && strength > MIN_SIGNAL_STRENGTH) {
          Serial.print("RESULT:HEIGHT:");
          Serial.println(fallbackHeight, 1);
          Serial.println("DEBUG:Used fallback single reading");
        } else {
          Serial.println("DEBUG:Fallback reading also invalid");
        }
      }
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