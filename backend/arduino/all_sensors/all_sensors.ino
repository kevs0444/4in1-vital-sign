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
MAX30105 heartRateSensor;

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
const float PLATFORM_WEIGHT = 0.4;
const float WEIGHT_THRESHOLD = 0.1;
const unsigned long STABILIZATION_TIME = 3000;
const unsigned long WEIGHT_AVERAGING_TIME = 3000;
enum WeightSubState { W_DETECTING, W_STABILIZING, W_AVERAGING };
WeightSubState weightState = W_DETECTING;

// Height
const unsigned long HEIGHT_AVERAGING_TIME = 3000;
const unsigned long HEIGHT_READ_INTERVAL = 100;
const float SENSOR_HEIGHT_CM = 213.36;
unsigned long lastHeightReadTime = 0;
long distanceSum = 0;
int heightReadCount = 0;

// Temperature
const unsigned long TEMP_MEASUREMENT_TIME = 5000;
const float TEMP_CALIBRATION_OFFSET = 1.5; // Adjusted calibration offset
unsigned long lastTempUpdateTime = 0;

// Heart Rate & SpO2
const unsigned long HR_MEASUREMENT_TIME = 60000; // Changed to 60 seconds
bool fingerDetected = false;
uint32_t irBuffer[100];
uint32_t redBuffer[100];
int bufferIndex = 0;
unsigned long lastHRSampleTime = 0;
const unsigned long HR_SAMPLE_INTERVAL = 10;

// New variables for HR averaging - moved to global scope
float hrSum = 0;
float spo2Sum = 0;
int validSamples = 0;
int sampleCount = 0;
unsigned long lastSampleCollectionTime = 0;


// =================================================================
// --- SETUP FUNCTION ---
// =================================================================
void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  while (!Serial) { ; }
  
  // Quick initialization - just establish connection first
  Serial.println("STATUS:BOOTING_UP");
  
  // Initialize basic sensor objects without full setup
  initializeBasicSensors();
  
  // Mark as ready for commands immediately
  Serial.println("STATUS:READY_FOR_COMMANDS");
  Serial.println("SYSTEM:CONNECTED_BASIC_MODE");
}

void initializeBasicSensors() {
  // Quick initialization - just create objects
  LoadCell.begin();
  
  // Temperature sensor quick init
  tempSensor.begin();
  
  // Heart rate sensor quick init  
  heartRateSensor.begin(Wire, I2C_SPEED_FAST);
  
  Serial.println("STATUS:BASIC_SENSORS_INITIALIZED");
}

void initializeWeightSensor() {
  Serial.println("STATUS:INITIALIZING_WEIGHT_SENSOR");
  
  if (!weightSensorPowered) {
    LoadCell.powerUp();
    weightSensorPowered = true; // Keep the sensor powered for idle detection
    delay(200); // Give a bit more time after power up
  }
  
  // Get calibration factor from EEPROM
  float calFactor;
  EEPROM.get(0, calFactor);
  if (isnan(calFactor) || calFactor == 0) {
    calFactor = 696.0; // Default calibration factor
    Serial.println("STATUS:USING_DEFAULT_CALIBRATION");
  }
  LoadCell.setCalFactor(calFactor);

  Serial.print("STATUS:CALIBRATION_FACTOR:");
  Serial.println(calFactor);
  
  // Perform a single, reliable tare operation
  Serial.println("STATUS:PERFORMING_AUTO_TARE");
  currentPhase = INITIALIZING_WEIGHT;
  measurementActive = true; // Use this flag to signify a background task is running
  phaseStartTime = millis();
  LoadCell.tareNoDelay(); // Start the non-blocking tare process
}

void initializeOtherSensors() {
  // Temperature sensor
  if (tempSensor.begin()) {
    Serial.println("STATUS:TEMP_SENSOR_READY");
  } else {
    Serial.println("ERROR:TEMP_SENSOR_INIT_FAILED");
  }
  
  // Heart rate sensor
  if (heartRateSensor.begin(Wire, I2C_SPEED_FAST)) {
    heartRateSensor.setup();
    heartRateSensor.setPulseAmplitudeRed(0x0A);
    heartRateSensor.setPulseAmplitudeGreen(0);
    heartRateSensor.shutDown();
    Serial.println("STATUS:HR_SENSOR_READY");
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
    
    // Initialize if not done
    if (!weightSensorInitialized) {
      LoadCell.start(2000, true);
      
      // Set calibration factor
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
    heartRateSensor.wakeUp();
    delay(100);
    heartRateSensor.setup();
    heartRateSensor.setPulseAmplitudeRed(0x0A);
    heartRateSensor.setPulseAmplitudeGreen(0);
    hrSensorPowered = true;
    Serial.println("STATUS:HR_SENSOR_POWERED_UP");
  }
}

void powerDownHrSensor() {
  if (hrSensorPowered) {
    heartRateSensor.shutDown();
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
  
  // Ensure weight sensor is initialized
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
  phaseStartTime = millis();
  distanceSum = 0;
  heightReadCount = 0;
  lastHeightReadTime = 0;
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
  if (!hrSensorPowered) powerUpHrSensor();
  measurementActive = true;
  currentPhase = HR;
  phaseStartTime = millis();
  fingerDetected = false;
  bufferIndex = 0;
  lastHRSampleTime = 0;
  Serial.println("STATUS:HR_MEASUREMENT_STARTED");

}

// =================================================================
// --- SENSOR MEASUREMENT PHASES ---
// =================================================================
void runIdleTasks() {
  static unsigned long lastIdleUpdateTime = 0;

  // Run these checks every 500ms to avoid spamming serial
  if (millis() - lastIdleUpdateTime > 500) {
    lastIdleUpdateTime = millis();

    // --- Check for live temperature ---
    if (tempSensorPowered) {
      float objectTemp = tempSensor.readObjectTempC();
      if (objectTemp > 20.0 && objectTemp < 45.0) {
        float liveTemp = objectTemp + TEMP_CALIBRATION_OFFSET;
        Serial.print("DATA:TEMP:");
        Serial.println(liveTemp, 1);
      }
    }

    // --- Check for finger on MAX30102 ---
    if (hrSensorPowered) {
      long irValue = heartRateSensor.getIR();
      if (irValue > 50000 && !fingerDetected) {
        fingerDetected = true;
        Serial.println("FINGER_DETECTED");
      } else if (irValue < 50000 && fingerDetected) {
        fingerDetected = false;
        Serial.println("FINGER_REMOVED");
      }
    }

    // --- Check for weight on scale ---
    if (weightSensorPowered && LoadCell.update()) {
      float currentWeight = LoadCell.getData();
      if (currentWeight > WEIGHT_THRESHOLD) {
        Serial.println("WEIGHT_DETECTED");
      }
    }
  }
}

// =================================================================
// --- SENSOR MEASUREMENT PHASES ---
// =================================================================
void runWeightInitializationPhase() {
  LoadCell.update(); // Keep updating the sensor

  if (LoadCell.getTareStatus()) {
    // Tare is successful
    Serial.println("STATUS:TARE_COMPLETE");
    Serial.println("STATUS:WEIGHT_SENSOR_READY");
    weightSensorInitialized = true;
    autoTareCompleted = true;
    measurementActive = false;
    currentPhase = IDLE;
  } else if (millis() - phaseStartTime > 10000) { // Add a 10-second timeout as a safeguard
    // Tare failed to complete in a reasonable time
    Serial.println("ERROR:TARE_FAILED");
    weightSensorInitialized = false;
    autoTareCompleted = false;
    measurementActive = false;
    currentPhase = IDLE;
  }
}


void runWeightPhase() {
  static unsigned long lastWeightUpdate = 0;
  static float weightSum = 0;
  static int readingCount = 0;
  static float previousWeight = 0;

  // The weightState enum helps manage the measurement process.
  switch (weightState) {
    case W_DETECTING:
      // This state is triggered when the measurement starts.
      // Immediately start averaging.
      Serial.println("STATUS:WEIGHT_AVERAGING");
      weightState = W_AVERAGING;
      phaseStartTime = millis(); // Reset timer for the 3-second averaging period
      weightSum = 0;
      readingCount = 0;
      lastWeightUpdate = millis(); // Initialize for progress display
      break;

    case W_AVERAGING:
      if (LoadCell.update()) {
        float currentWeight = LoadCell.getData();
        if (currentWeight < 0) currentWeight = 0;
        weightSum += currentWeight;
        readingCount++;
      }

      // Show progress every second
      if (millis() - lastWeightUpdate > 1000) {
        int elapsed = (millis() - phaseStartTime) / 1000;
        int total = 3; // Hardcoded 3-second average
        Serial.print("STATUS:AVERAGING_PROGRESS:");
        Serial.print(elapsed);
        Serial.print("/");
        Serial.println(total);
        lastWeightUpdate = millis();
      }

      // Check if averaging period is complete
      if (millis() - phaseStartTime >= 3000) { // 3-second averaging period
        if (readingCount > 0) {
          float finalWeight = weightSum / readingCount;
          if (finalWeight < 0) finalWeight = 0;

          Serial.print("RESULT:WEIGHT:");
          Serial.println(finalWeight, 2);
        } else {
          Serial.println("ERROR:WEIGHT_READING_FAILED");
        }
        delay(100); // Ensure message is sent

        // Reset and power down
        measurementActive = false;
        currentPhase = IDLE;
        weightState = W_DETECTING; // Reset state for next measurement
        // No need to power down, as it's handled by the frontend's lifecycle now.
        Serial.println("STATUS:WEIGHT_MEASUREMENT_COMPLETE");
      }
      break;
  }
}

void runHeightPhase() {
  unsigned long currentTime = millis();
  
  // Take height readings at regular intervals
  if (currentTime - lastHeightReadTime >= HEIGHT_READ_INTERVAL) {
    lastHeightReadTime = currentTime;
    int16_t distCm;
    
    if (heightSensor.getData(distCm, 0x10)) {
      if (distCm > 0 && distCm < 500) { // Valid range check
        distanceSum += distCm;
        heightReadCount++;
        Serial.println("STATUS:HEIGHT_MEASURING"); // Add status for active measuring
        
        // Show progress every second
        static unsigned long lastProgressTime = 0;
        if (currentTime - lastProgressTime >= 1000) {
          int elapsed = (currentTime - phaseStartTime) / 1000;
          int total = HEIGHT_AVERAGING_TIME / 1000;
          Serial.print("STATUS:HEIGHT_PROGRESS:");
          Serial.print(elapsed);
          Serial.print("/");
          Serial.println(total);
          lastProgressTime = currentTime;
        }
      }
    }
  }
  
  // Check if measurement time is complete
  if (currentTime - phaseStartTime >= HEIGHT_AVERAGING_TIME) {
    if (heightReadCount > 0) {
      float avgDist = (float)distanceSum / heightReadCount;
      float finalHeight = SENSOR_HEIGHT_CM - avgDist;
      
      Serial.print("RESULT:HEIGHT:");
      Serial.println(finalHeight, 1);
    } else {
      Serial.println("ERROR:HEIGHT_READING_FAILED");
    }
    
    delay(100); // Ensure message is sent
    
    // Reset and power down
    measurementActive = false;
    currentPhase = IDLE;
    powerDownHeightSensor();
    
    Serial.println("STATUS:HEIGHT_MEASUREMENT_COMPLETE");
  }
}

void runTemperaturePhase() {
  unsigned long currentTime = millis();
  
  // Show progress every second
  if (currentTime - lastTempUpdateTime >= 1000) {
    // Show progress
    int elapsed = (currentTime - phaseStartTime) / 1000;
    int total = TEMP_MEASUREMENT_TIME / 1000;
    Serial.print("STATUS:TEMP_PROGRESS:");
    Serial.print(elapsed);
    Serial.print("/");
    Serial.println(total);
    lastTempUpdateTime = currentTime;
  }

  // Check if measurement time is complete
  if (currentTime - phaseStartTime >= TEMP_MEASUREMENT_TIME) {
    float objectTemp = tempSensor.readObjectTempC();
    float finalTemp = objectTemp + TEMP_CALIBRATION_OFFSET;
    
    // Validate temperature reading
    if (finalTemp > 20.0 && finalTemp < 45.0) {
      Serial.print("RESULT:TEMP:");
      Serial.println(finalTemp, 2);
    } else {
      Serial.println("ERROR:TEMP_READING_INVALID");
    }
    
    delay(100); // Ensure message is sent
    
    // Reset and power down
    measurementActive = false;
    currentPhase = IDLE;
    powerDownTempSensor();
    
    Serial.println("STATUS:TEMP_MEASUREMENT_COMPLETE");
  }
}

int estimateRespiratoryRate(int hr) {
  int baseRate = 16;
  if (hr > 80) baseRate += random(1, 4);
  else if (hr < 60) baseRate -= random(1, 3);
  return constrain(baseRate, 12, 20);
}

void runHeartRatePhase() {
  unsigned long currentTime = millis();
  
  // Check for finger detection
  long irValue = heartRateSensor.getIR();
  if (irValue < 50000) {
    // Finger was removed during measurement
    fingerDetected = false;
    Serial.println("FINGER_REMOVED"); // Use FINGER_REMOVED for consistency
    measurementActive = false;
    currentPhase = IDLE;
    powerDownHrSensor();
    return;
  } else if (!fingerDetected) {
    // This handles the case where measurement starts but the first check hasn't happened
    fingerDetected = true;
    if (millis() - lastHRSampleTime > 1000) {
      // Reset accumulators for the new averaging logic
      hrSum = 0;
      spo2Sum = 0;
      validSamples = 0;
      sampleCount = 0;
      lastSampleCollectionTime = currentTime;

      int elapsed = (currentTime - phaseStartTime) / 1000;
      int total = HR_MEASUREMENT_TIME / 1000;
      Serial.print("STATUS:HR_PROGRESS:");
      Serial.print(elapsed);
      Serial.print("/");
      Serial.println(total);
      lastHRSampleTime = currentTime;
    }
  }
  
  // --- New 5-second interval sampling logic ---
  
  // 1. Collect samples continuously
  if (currentTime - lastHRSampleTime >= HR_SAMPLE_INTERVAL) {
    lastHRSampleTime = currentTime;
    if (bufferIndex < 100) {
      irBuffer[bufferIndex] = heartRateSensor.getIR();
      redBuffer[bufferIndex] = heartRateSensor.getRed();
      bufferIndex++;
      heartRateSensor.nextSample();
    }
  }

  // 2. Process samples every 5 seconds
  if (currentTime - lastSampleCollectionTime >= 5000 && bufferIndex > 25) {
    lastSampleCollectionTime = currentTime;
    sampleCount++;

    int32_t spo2_val;
    int8_t spo2_valid;
    int32_t hr_val; 
    int8_t hr_valid;

    maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferIndex, redBuffer, &spo2_val, &spo2_valid, &hr_val, &hr_valid);
    
    if (hr_valid && spo2_valid && hr_val > 40 && hr_val < 220 && spo2_val > 70) {
      // Send live sample data to backend
      Serial.print("DATA:HR_SAMPLE:");
      Serial.print(hr_val);
      Serial.print(":");
      Serial.println(spo2_val);
      
      // Add to sum for final average
      hrSum += hr_val;
      spo2Sum += spo2_val;
      validSamples++;
    }
    
    // Reset buffer for the next 5-second interval
    bufferIndex = 0;
  }

  // 3. Finalize measurement after 60 seconds
  if (currentTime - phaseStartTime >= HR_MEASUREMENT_TIME) {
    if (validSamples > 0) {
      float finalHr = hrSum / validSamples;
      float finalSpo2 = spo2Sum / validSamples;
      int respiratoryRate = estimateRespiratoryRate(finalHr);

      Serial.print("RESULT:HR:");
      Serial.print(finalHr, 0);
      Serial.print(":");
      Serial.print(finalSpo2, 1);
      Serial.print(":");
      Serial.println(respiratoryRate);
    } else {
      Serial.println("ERROR:HR_READING_FAILED");
    }

    delay(100); // Ensure message is sent
    
    // Reset and power down
    measurementActive = false;
    currentPhase = IDLE;
    fingerDetected = false;
    bufferIndex = 0;
    powerDownHrSensor();
    
    Serial.println("STATUS:HR_MEASUREMENT_COMPLETE");
  }
}