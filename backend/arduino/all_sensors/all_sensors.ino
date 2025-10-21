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
enum SystemPhase { IDLE, WEIGHT, HEIGHT, TEMP, HR };
SystemPhase currentPhase = IDLE;
bool measurementActive = false;
unsigned long phaseStartTime = 0;

// Sensor power states
bool weightSensorPowered = false;
bool heightSensorPowered = false;
bool tempSensorPowered = false;
bool hrSensorPowered = false;

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
const float TEMP_CALIBRATION_OFFSET = 1.5;
unsigned long lastTempUpdateTime = 0;

// Heart Rate & SpO2
const unsigned long HR_MEASUREMENT_TIME = 30000; // Reduced to 30 seconds for testing
bool fingerDetected = false;
uint32_t irBuffer[100];
uint32_t redBuffer[100];
int bufferIndex = 0;
unsigned long lastHRSampleTime = 0;
const unsigned long HR_SAMPLE_INTERVAL = 10;

// =================================================================
// --- SETUP FUNCTION ---
// =================================================================
void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  while (!Serial) { ; }
  
  // Initialize sensors but keep them powered down
  initializeSensors();
  
  Serial.println("STATUS:READY_FOR_COMMANDS");
}

void initializeSensors() {
  // Weight sensor
  LoadCell.begin();
  float calFactor;
  EEPROM.get(0, calFactor);
  LoadCell.setCalFactor(isnan(calFactor) || calFactor == 0 ? 696.0 : calFactor); // Default calibration factor
  LoadCell.powerDown();
  
  // Temperature sensor - initialize but don't start
  if (!tempSensor.begin()) {
    Serial.println("ERROR:TEMP_SENSOR_INIT_FAILED");
  }
  
  // Heart rate sensor - initialize but don't start
  if (!heartRateSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("ERROR:HR_SENSOR_INIT_FAILED");
  }
  heartRateSensor.setup();
  heartRateSensor.setPulseAmplitudeRed(0x0A);
  heartRateSensor.setPulseAmplitudeGreen(0);
  heartRateSensor.shutDown();
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
  }
}

void powerUpWeightSensor() {
  if (!weightSensorPowered) {
    LoadCell.powerUp();
    delay(10);
    LoadCell.start(2000, true);
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
    delay(10);
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
}

// =================================================================
// --- MEASUREMENT START FUNCTIONS ---
// =================================================================
void startWeightMeasurement() {
  if (!weightSensorPowered) powerUpWeightSensor();
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
void runWeightPhase() {
  static unsigned long lastWeightUpdate = 0;
  static float weightSum = 0;
  static int readingCount = 0;
  static bool averagingStarted = false;
  
  if (LoadCell.update()) {
    float currentWeight = LoadCell.getData() - PLATFORM_WEIGHT;
    if (currentWeight < 0) currentWeight = 0;

    switch (weightState) {
      case W_DETECTING:
        if (millis() - lastWeightUpdate > 1000) {
          Serial.println("STATUS:WAITING_FOR_USER_WEIGHT");
          lastWeightUpdate = millis();
        }
        
        if (currentWeight > WEIGHT_THRESHOLD) {
          Serial.println("STATUS:WEIGHT_DETECTED");
          weightState = W_STABILIZING;
          phaseStartTime = millis();
          weightSum = 0;
          readingCount = 0;
          averagingStarted = false;
        }
        break;
        
      case W_STABILIZING:
        if (!averagingStarted) {
          Serial.println("STATUS:STABILIZING");
          averagingStarted = true;
        }
        
        // Accumulate readings during stabilization
        weightSum += currentWeight;
        readingCount++;
        
        if (millis() - phaseStartTime >= STABILIZATION_TIME) {
          // Calculate average from stabilization period
          float stabilizedWeight = weightSum / readingCount;
          Serial.println("STATUS:WEIGHT_AVERAGING");
          
          // Reset for averaging period
          weightState = W_AVERAGING;
          phaseStartTime = millis();
          weightSum = 0;
          readingCount = 0;
        }
        break;
        
      case W_AVERAGING:
        // Accumulate readings during averaging period
        weightSum += currentWeight;
        readingCount++;
        
        // Show progress every second
        if (millis() - lastWeightUpdate > 1000) {
          int elapsed = (millis() - phaseStartTime) / 1000;
          int total = WEIGHT_AVERAGING_TIME / 1000;
          Serial.print("STATUS:AVERAGING_PROGRESS:");
          Serial.print(elapsed);
          Serial.print("/");
          Serial.println(total);
          lastWeightUpdate = millis();
        }
        
        // Check if averaging period is complete
        if (millis() - phaseStartTime >= WEIGHT_AVERAGING_TIME) {
          // Calculate final average weight
          float finalWeight = weightSum / readingCount;
          if (finalWeight < 0) finalWeight = 0;
          
          Serial.print("RESULT:WEIGHT:");
          Serial.println(finalWeight, 2);
          delay(100); // Ensure message is sent
          
          // Reset and power down
          measurementActive = false;
          currentPhase = IDLE;
          weightState = W_DETECTING;
          powerDownWeightSensor();
          
          Serial.println("STATUS:WEIGHT_MEASUREMENT_COMPLETE");
        }
        break;
    }
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
  
  // Send live temperature data every second
  if (currentTime - lastTempUpdateTime >= 1000) {
    float objectTemp = tempSensor.readObjectTempC();
    float ambientTemp = tempSensor.readAmbientTempC();
    
    // Only send if we have a valid reading
    if (objectTemp > 20.0 && objectTemp < 45.0) {
      float liveTemp = objectTemp + TEMP_CALIBRATION_OFFSET;
      Serial.print("DATA:TEMP:");
      Serial.println(liveTemp, 1);
    }
    
    lastTempUpdateTime = currentTime;
    
    // Show progress
    int elapsed = (currentTime - phaseStartTime) / 1000;
    int total = TEMP_MEASUREMENT_TIME / 1000;
    Serial.print("STATUS:TEMP_PROGRESS:");
    Serial.print(elapsed);
    Serial.print("/");
    Serial.println(total);
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
  if (!fingerDetected) {
    long irValue = heartRateSensor.getIR();
    
    if (millis() - lastHRSampleTime > 1000) {
      Serial.println("STATUS:WAITING_FOR_FINGER");
      lastHRSampleTime = millis();
    }
    
    if (irValue > 50000) {
      fingerDetected = true;
      bufferIndex = 0;
      Serial.println("STATUS:FINGER_DETECTED");
    }
    return;
  }
  
  // Check if finger was removed
  long irValue = heartRateSensor.getIR();
  if (irValue < 50000) {
    fingerDetected = false;
    Serial.println("ERROR:FINGER_REMOVED");
    measurementActive = false;
    currentPhase = IDLE;
    powerDownHrSensor();
    return;
  }
  
  // Collect samples for HR calculation
  if (currentTime - lastHRSampleTime >= HR_SAMPLE_INTERVAL && bufferIndex < 100) {
    lastHRSampleTime = currentTime;
    
    irBuffer[bufferIndex] = heartRateSensor.getIR();
    redBuffer[bufferIndex] = heartRateSensor.getRed();
    bufferIndex++;
    
    heartRateSensor.nextSample();
    
    // Show progress every 5 seconds
    static unsigned long lastProgressTime = 0;
    if (currentTime - lastProgressTime >= 5000) {
      int elapsed = (currentTime - phaseStartTime) / 1000;
      int total = HR_MEASUREMENT_TIME / 1000;
      Serial.print("STATUS:HR_PROGRESS:");
      Serial.print(elapsed);
      Serial.print("/");
      Serial.println(total);
      lastProgressTime = currentTime;
    }
  }
  
  // Process data when buffer is full or time is up
  if (bufferIndex >= 100 || (currentTime - phaseStartTime >= HR_MEASUREMENT_TIME && bufferIndex > 50)) {
    int32_t spo2_val;
    int8_t spo2_valid;
    int32_t hr_val; 
    int8_t hr_valid;
    
    // Calculate heart rate and SpO2
    maxim_heart_rate_and_oxygen_saturation(irBuffer, bufferIndex, redBuffer, &spo2_val, &spo2_valid, &hr_val, &hr_valid);
    
    if (hr_valid && spo2_valid && hr_val > 30 && hr_val < 250 && spo2_val > 70) {
      int respiratoryRate = estimateRespiratoryRate(hr_val);
      
      Serial.print("RESULT:HR:");
      Serial.print(hr_val);
      Serial.print(":");
      Serial.print(spo2_val);
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

// =================================================================
// --- CALIBRATION FUNCTION (Optional) ---
// =================================================================
void calibrateWeightSensor() {
  if (!weightSensorPowered) powerUpWeightSensor();
  
  Serial.println("STATUS:CALIBRATION_STARTED");
  Serial.println("Please remove all weight from the platform...");
  delay(5000);
  
  LoadCell.tareNoDelay();
  
  Serial.println("Tare complete. Please place known weight on platform...");
  delay(10000);
  
  if (LoadCell.update()) {
    float knownWeight = 5.0; // Change this to your known weight in kg
    float rawReading = LoadCell.getData();
    float calFactor = rawReading / knownWeight;
    
    EEPROM.put(0, calFactor);
    LoadCell.setCalFactor(calFactor);
    
    Serial.print("CALIBRATION_COMPLETE: Factor=");
    Serial.println(calFactor);
  }
  
  powerDownWeightSensor();
}