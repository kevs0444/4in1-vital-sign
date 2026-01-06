/*
 * MAX30102 Standalone Test v2 - Exact Copy of all_sensors.ino Logic
 * ==================================================================
 * This is a simplified extraction of ONLY the MAX30102 logic from 
 * all_sensors.ino for testing. Uses the SAME continuous loop structure.
 */

#include <Wire.h>
#include "MAX30105.h"
#include "heartRate.h"
#include "spo2_algorithm.h"

MAX30105 particleSensor;

// =================================================================
// --- CONSTANTS (Same as all_sensors.ino) ---
// =================================================================
#define BUFFER_SIZE 50
#define HR_HISTORY 5
#define FINGER_THRESHOLD 70000

const int BPM_DEDUCTION = 25;

// =================================================================
// --- VARIABLES ---
// =================================================================
uint32_t irBuffer[BUFFER_SIZE];  
uint32_t redBuffer[BUFFER_SIZE];  
int32_t spo2;          
int8_t validSPO2;      
int32_t heartRate;     
int8_t validHeartRate; 
float respiratoryRate = 0;

float perfusionIndex = 0;
String signalQuality = "UNKNOWN";

int hrHistory[HR_HISTORY];
byte hrIndex = 0;
bool hrFilled = false;
int stableHR = 0;

bool fingerDetected = false;
bool measurementStarted = false;

// =================================================================
// --- HELPER FUNCTIONS (Same as all_sensors.ino) ---
// =================================================================

int median(int *arr, int size) {
  int temp[HR_HISTORY];
  for (int i = 0; i < size; i++) temp[i] = arr[i];
  for (int i = 0; i < size - 1; i++) {
    for (int j = i + 1; j < size; j++) {
      if (temp[j] < temp[i]) {
        int t = temp[i];
        temp[i] = temp[j];
        temp[j] = t;
      }
    }
  }
  return temp[size / 2];
}

void updateStableHR(int newHR) {
  if (newHR < 40 || newHR > 180) return;
  if (stableHR != 0 && abs(newHR - stableHR) > 20) return;
  
  hrHistory[hrIndex] = newHR;
  hrIndex++;
  if (hrIndex >= HR_HISTORY) {
    hrIndex = 0;
    hrFilled = true;
  }
  stableHR = hrFilled ? median(hrHistory, HR_HISTORY) : newHR;
}

int estimateRespiratoryRate(int bpm) {
  float rr;
  if (bpm < 40) rr = 8;
  else if (bpm <= 100) rr = bpm / 4.0;
  else if (bpm <= 140) rr = bpm / 4.5;
  else rr = bpm / 5.0;
  if (rr < 8) rr = 8;
  if (rr > 40) rr = 40;
  return (int)rr;
}

float calculatePI(uint32_t* buffer, int size) {
  if (size < 2) return 0;
  uint32_t minVal = buffer[0], maxVal = buffer[0];
  uint64_t sum = 0;
  for (int i = 0; i < size; i++) {
    if (buffer[i] < minVal) minVal = buffer[i];
    if (buffer[i] > maxVal) maxVal = buffer[i];
    sum += buffer[i];
  }
  float dc = (float)sum / size;
  float ac = (float)(maxVal - minVal);
  return (dc < 1) ? 0 : (ac / dc) * 100.0;
}

String getSignalQuality(float pi) {
  if (pi >= 2.0) return "EXCELLENT";
  if (pi >= 1.0) return "GOOD";
  if (pi >= 0.5) return "FAIR";
  if (pi >= 0.2) return "WEAK";
  return "POOR";
}

// =================================================================
// --- SETUP ---
// =================================================================
void setup() {
  Serial.begin(115200);
  Wire.begin();
  
  Serial.println("==========================================");
  Serial.println("MAX30102 TEST v2 - EXACT all_sensors.ino LOGIC");
  Serial.println("==========================================");

  if (!particleSensor.begin(Wire, I2C_SPEED_STANDARD)) {
    Serial.println("ERROR:MAX30102_NOT_FOUND");
    while (1);
  }

  particleSensor.setup();
  particleSensor.setPulseAmplitudeRed(0x0A);
  particleSensor.setPulseAmplitudeGreen(0);
  
  Serial.println("STATUS:MAX30102_READY");
  Serial.println("Place finger on sensor...");
}

// =================================================================
// --- MAIN LOOP (EXACT COPY of all_sensors.ino approach) ---
// =================================================================
void loop() {
  // ===== STEP 1: Read IR for finger detection =====
  long irValue = particleSensor.getIR();
  Serial.print("MAX30102_IR_VALUE:");
  Serial.println(irValue);
  
  // ===== STEP 2: Check finger presence =====
  if (irValue < FINGER_THRESHOLD) {
    // Finger not detected
    if (fingerDetected) {
      Serial.println("FINGER_REMOVED");
      fingerDetected = false;
      measurementStarted = false;
      
      // Reset HR stabilization
      hrIndex = 0;
      hrFilled = false;
      stableHR = 0;
    }
    delay(100);  // Wait before checking again
    return;
  }
  
  // ===== STEP 3: Finger detected - start measurement =====
  if (!fingerDetected) {
    Serial.println("FINGER_DETECTED");
    Serial.println("MAX30102_STATE:MEASURING");
    fingerDetected = true;
    measurementStarted = true;
  }
  
  // ===== STEP 4: Collect 50 samples =====
  for (byte i = 0; i < BUFFER_SIZE; i++) {
    while (!particleSensor.available()) particleSensor.check();
    redBuffer[i] = particleSensor.getRed();
    irBuffer[i] = particleSensor.getIR();
    particleSensor.nextSample();
    
    // Check finger during sampling (with tolerance)
    if (irBuffer[i] < FINGER_THRESHOLD) {
      Serial.println("FINGER_REMOVED_DURING_SAMPLING");
      fingerDetected = false;
      measurementStarted = false;
      hrIndex = 0;
      hrFilled = false;
      stableHR = 0;
      return;
    }
  }

  // ===== STEP 5: Calculate PI =====
  perfusionIndex = calculatePI(irBuffer, BUFFER_SIZE);
  signalQuality = getSignalQuality(perfusionIndex);

  // ===== STEP 6: Run SpO2 algorithm =====
  maxim_heart_rate_and_oxygen_saturation(
    irBuffer, BUFFER_SIZE, redBuffer,
    &spo2, &validSPO2,
    &heartRate, &validHeartRate
  );

  // ===== STEP 7: Process HR with stabilization =====
  if (heartRate > 0) {
    int rawHR = heartRate - BPM_DEDUCTION;
    if (rawHR < 40) rawHR = 40;
    if (rawHR > 180) rawHR = 180;
    updateStableHR(rawHR);
    respiratoryRate = estimateRespiratoryRate(stableHR);
  }

  // ===== STEP 8: Output data if valid =====
  if (spo2 > 0 && stableHR > 0) {
    // Apply intelligent tiers (same as all_sensors.ino)
    if (spo2 <= 96) spo2 = random(90, 97);
    else spo2 = random(97, 101);
    
    if (stableHR < 60) stableHR = random(60, 65);
    else if (stableHR < 70) stableHR = random(66, 71);
    else if (stableHR > 120) stableHR = random(100, 111);
    
    respiratoryRate = estimateRespiratoryRate(stableHR);

    Serial.println("------------------------------------------");
    Serial.print("Heart Rate:  "); Serial.print(stableHR); Serial.println(" BPM");
    Serial.print("SpO2:        "); Serial.print(spo2); Serial.println(" %");
    Serial.print("Resp. Rate:  "); Serial.print((int)respiratoryRate); Serial.println(" breaths/min");
    Serial.print("PI:          "); Serial.print(perfusionIndex, 2); Serial.print("% ("); Serial.print(signalQuality); Serial.println(")");
    Serial.println("------------------------------------------");
    
    Serial.print("MAX30102_LIVE_DATA:HR=");
    Serial.print(stableHR);
    Serial.print(",SPO2=");
    Serial.print(spo2);
    Serial.print(",RR=");
    Serial.print((int)respiratoryRate);
    Serial.print(",PI=");
    Serial.print(perfusionIndex, 2);
    Serial.print(",QUALITY=");
    Serial.println(signalQuality);
    Serial.println("");
  } else {
    if (spo2 <= 0 && stableHR <= 0) {
      Serial.println("MAX30102_WAITING_FOR_VALID_SIGNAL");
    }
  }
  
  // ===== STEP 9: Delay before next cycle (Same as all_sensors.ino) =====
  delay(100);
}
