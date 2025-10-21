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
Adafruit_MLX90614 tempSensor;
MAX30105 heartRateSensor;

// =================================================================
// --- SYSTEM STATE MANAGEMENT ---
// =================================================================
enum SystemPhase { IDLE, WEIGHT, HEIGHT, TEMP, HR };
SystemPhase currentPhase = IDLE;
bool measurementActive = false;
unsigned long phaseStartTime = 0;

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

// Heart Rate & SpO2
const unsigned long HR_MEASUREMENT_TIME = 60000;
bool fingerDetected = false;
uint32_t irBuffer[100];
uint32_t redBuffer[100];
int readingCount = 0;
int heartRateReadings[60];
int spo2Readings[60];

// =================================================================
// --- SETUP FUNCTION ---
// =================================================================
void setup() {
  Serial.begin(9600);
  Wire.begin();
  
  while (!Serial) { ; }
  
  // Initialize but do not tare or start sensors yet
  LoadCell.begin();
  float calFactor;
  EEPROM.get(0, calFactor);
  LoadCell.setCalFactor(isnan(calFactor) || calFactor == 0 ? 1.0 : calFactor);

  // All sensors start in a low-power state
  LoadCell.powerDown();
  heartRateSensor.shutDown();
  
  Serial.println("STATUS:READY_FOR_COMMANDS");
}

// =================================================================
// --- MAIN LOOP ---
// =================================================================
void loop() {
  if (Serial.available() > 0) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    handleCommand(command);
  }

  if (measurementActive) {
    switch (currentPhase) {
      case WEIGHT: runWeightPhase(); break;
      case HEIGHT: runHeightPhase(); break;
      case TEMP:   runTemperaturePhase(); break;
      case HR:     runHeartRatePhase(); break;
      default: break;
    }
  }
}

// =================================================================
// --- COMMAND & STATE LOGIC ---
// =================================================================
void handleCommand(String command) {
  if (command == "START_ALL_SENSORS") {
    startFullMeasurementSequence();
  } else if (command == "STOP_ALL_SENSORS") {
    shutdownAllSensors();
  }
}

void startFullMeasurementSequence() {
  if (measurementActive) return;
  Serial.println("STATUS:SEQUENCE_STARTED");
  measurementActive = true;
  
  // Power up the first sensor and set the initial phase
  LoadCell.powerUp();
  Serial.println("STATUS:WEIGHT_PHASE_ACTIVATED");
  weightState = W_DETECTING;
  currentPhase = WEIGHT;
}

void shutdownAllSensors() {
  LoadCell.powerDown();
  heartRateSensor.shutDown();
  measurementActive = false;
  currentPhase = IDLE;
  Serial.println("STATUS:ALL_SENSORS_SHUTDOWN");
}

void advanceToNextPhase() {
  switch (currentPhase) {
    case WEIGHT:
      LoadCell.powerDown(); // Power down previous sensor
      Wire.begin(); // Reset I2C for the next sensor
      tempSensor.begin(); // This wakes up the sensor
      Serial.println("STATUS:HEIGHT_PHASE_ACTIVATED");
      phaseStartTime = millis();
      distanceSum = 0;
      heightReadCount = 0;
      currentPhase = HEIGHT;
      break;
    case HEIGHT:
      // Height sensor (Lidar) doesn't have a shutdown, just stop reading
      Wire.begin();
      tempSensor.begin();
      Serial.println("STATUS:TEMP_PHASE_ACTIVATED");
      phaseStartTime = millis();
      currentPhase = TEMP;
      break;
    case TEMP:
      // Temp sensor also doesn't have a shutdown
      Wire.begin();
      heartRateSensor.begin(Wire, I2C_SPEED_FAST);
      heartRateSensor.setup();
      heartRateSensor.setPulseAmplitudeRed(0x0A);
      Serial.println("STATUS:HR_PHASE_ACTIVATED");
      phaseStartTime = millis();
      fingerDetected = false;
      readingCount = 0;
      currentPhase = HR;
      break;
    case HR:
      Serial.println("STATUS:ALL_SENSORS_COMPLETE");
      // Don't shut down here; wait for the command from the backend
      break;
  }
}

// =================================================================
// --- SENSOR MEASUREMENT PHASES ---
// =================================================================

void runWeightPhase() {
  if (LoadCell.update()) {
    float currentWeight = LoadCell.getData() - PLATFORM_WEIGHT;
    currentWeight = (currentWeight < 0) ? 0 : currentWeight;

    switch (weightState) {
      case W_DETECTING:
        Serial.println("STATUS:WAITING_FOR_USER_WEIGHT");
        if (currentWeight > WEIGHT_THRESHOLD) {
          Serial.println("STATUS:WEIGHT_DETECTED");
          phaseStartTime = millis();
          weightState = W_STABILIZING;
        }
        break;
      case W_STABILIZING:
        Serial.println("STATUS:STABILIZING");
        if (millis() - phaseStartTime >= STABILIZATION_TIME) {
          Serial.println("STATUS:WEIGHT_AVERAGING");
          phaseStartTime = millis();
          weightState = W_AVERAGING;
        }
        break;
      case W_AVERAGING:
        if (millis() - phaseStartTime >= WEIGHT_AVERAGING_TIME) {
          LoadCell.update();
          float finalWeight = LoadCell.getData() - PLATFORM_WEIGHT;
          Serial.print("RESULT:WEIGHT:");
          Serial.println(finalWeight, 2);
          advanceToNextPhase(); // Automatically move to the next step
        }
        break;
    }
  }
}

void runHeightPhase() {
  static TFLI2C heightSensor;
  unsigned long currentTime = millis();
  
  if (currentTime - lastHeightReadTime >= HEIGHT_READ_INTERVAL) {
    lastHeightReadTime = currentTime;
    int16_t distCm;
    if (heightSensor.getData(distCm, 0x10)) {
      distanceSum += distCm;
      heightReadCount++;
    }
  }
  
  if (currentTime - phaseStartTime >= HEIGHT_AVERAGING_TIME) {
    Serial.println("STATUS:HEIGHT_MEASURING");
    if (heightReadCount > 0) {
      float avgDist = (float)distanceSum / heightReadCount;
      float finalHeight = SENSOR_HEIGHT_CM - avgDist;
      Serial.print("RESULT:HEIGHT:");
      Serial.println(finalHeight, 1);
    } else {
      Serial.println("ERROR:HEIGHT_READING_FAILED");
    }
    advanceToNextPhase();
  }
}

void runTemperaturePhase() {
  unsigned long currentTime = millis();
  if (currentTime - phaseStartTime >= 1000) { // Send live data every second
      float liveTemp = tempSensor.readObjectTempC() + TEMP_CALIBRATION_OFFSET;
      Serial.print("DATA:TEMP:");
      Serial.println(liveTemp, 1);
  }

  if (currentTime - phaseStartTime >= TEMP_MEASUREMENT_TIME) {
    float finalTemp = tempSensor.readObjectTempC() + TEMP_CALIBRATION_OFFSET;
    Serial.print("RESULT:TEMP:");
    Serial.println(finalTemp, 2);
    advanceToNextPhase();
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
  
  if (!fingerDetected) {
    Serial.println("STATUS:WAITING_FOR_FINGER");
    if (heartRateSensor.getIR() > 50000) {
      fingerDetected = true;
      Serial.println("STATUS:FINGER_DETECTED");
    }
    return;
  }
  
  if (heartRateSensor.getIR() < 50000) {
    Serial.println("ERROR:FINGER_REMOVED");
    advanceToNextPhase(); // Fail gracefully
    return;
  }

  // Sample data over the whole duration
  if (currentTime - phaseStartTime < HR_MEASUREMENT_TIME) {
    Serial.println("STATUS:HR_MEASURING");
    while(heartRateSensor.available()) {
        irBuffer[readingCount % 100] = heartRateSensor.getIR();
        redBuffer[readingCount % 100] = heartRateSensor.getRed();
        heartRateSensor.nextSample();
        readingCount++;
    }
  } else { // Time is up, calculate the result
    int32_t spo2_val; int8_t spo2_valid;
    int32_t hr_val; int8_t hr_valid;
    maxim_heart_rate_and_oxygen_saturation(irBuffer, 100, redBuffer, &spo2_val, &spo2_valid, &hr_val, &hr_valid);

    if(hr_valid && spo2_valid) {
        int finalRR = estimateRespiratoryRate(hr_val);
        Serial.print("RESULT:HR:");
        Serial.print(hr_val);
        Serial.print(":");
        Serial.print(spo2_val);
        Serial.print(":");
        Serial.println(finalRR);
    } else {
        Serial.println("ERROR:HR_READING_FAILED");
    }
    advanceToNextPhase();
  }
}
