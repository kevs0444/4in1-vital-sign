#include <Wire.h>
#include <LiquidCrystal_I2C.h>

/*
 * BP Sensor Test (Arduino Nano)
 * =============================
 * Functionality:
 * 1. Control BP Monitor Power/Start via Serial ('start' / 'done')
 * 2. Control BP Monitor via Physical Button (Pin 2)
 * 3. Display status on I2C LCD
 */

// LCD (change address if needed, usually 0x27 or 0x3F)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Pins
const int bpControlPin = 4;      // Connected to BP Monitor's button traces
const int ledPin = 3;            // Status LED
const int manualButtonPin = 2;   // Physical test button (Input Pullup)

// Variables
String command = "";
int ledBrightness = 100;

void setup() {
  // Serial
  Serial.begin(115200);
  Serial.println("==================================");
  Serial.println("BP SENSOR TEST - ARDUINO NANO");
  Serial.println("Type 'start' to turn device ON");
  Serial.println("Type 'done' to turn device OFF");
  Serial.println("Or press Manual Button (Pin 2)");
  Serial.println("==================================");

  // Pins
  pinMode(bpControlPin, INPUT);   // Start High Impedance (Floating)
  pinMode(ledPin, OUTPUT);
  pinMode(manualButtonPin, INPUT_PULLUP); // Active LOW

  // LED ON
  analogWrite(ledPin, ledBrightness);

  // LCD init
  lcd.init();
  lcd.backlight();
  lcd.clear(); 
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");
}

void loop() {
  // 1. Check Serial Commands
  if (Serial.available() > 0) {
    command = Serial.readStringUntil('\n');
    command.trim();

    if (command.equalsIgnoreCase("start")) {
      Serial.println("RX: 'start' -> Toggling BP...");
      simulateButtonTap();
      showStatus("DEVICE ON", "Measuring...");
    }
    else if (command.equalsIgnoreCase("done")) {
      Serial.println("RX: 'done' -> Toggling BP...");
      simulateButtonTap();
      showStatus("DEVICE OFF", "Goodbye");
    }
    // Display Helpers
    else if (command.startsWith("RESULT:")) {
      String res = command.substring(7);
      showStatus("BP Result:", res.c_str());
    }
    else if (command.startsWith("STATUS:")) {
       String stat = command.substring(7);
       showStatus("Status:", stat.c_str());
    }
    else if (command.startsWith("LIVE:")) {
       String val = command.substring(5);
       lcd.setCursor(0, 1);
       lcd.print("Val:            ");
       lcd.setCursor(5, 1);
       lcd.print(val + " mmHg"); 
    }
  }

  // 2. Check Manual Button
  if (digitalRead(manualButtonPin) == LOW) {
    delay(50); // Simple Debounce
    if (digitalRead(manualButtonPin) == LOW) {
      Serial.println("🔘 Manual Button Pressed -> Toggling BP...");
      simulateButtonTap();
      showStatus("MANUAL TRIGGER", "Toggling...");
      
      // Wait for release to prevent repeated triggers
      while(digitalRead(manualButtonPin) == LOW); 
      delay(200);
    }
  }
}

// Function to simulate pressing the BP monitor's physical button
// by temporarily grounding the pin connected to the switch traces.
void simulateButtonTap() {
  pinMode(bpControlPin, OUTPUT);
  digitalWrite(bpControlPin, LOW);   // Press (Ground potential)
  delay(100);                        // Hold for 100ms
  
  pinMode(bpControlPin, INPUT);      // Release (High Impedance)
  delay(100);
}

void showStatus(const char* line1, const char* line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}
