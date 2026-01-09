#include <Wire.h>
#include <LiquidCrystal_I2C.h>

// LCD (change address if needed)
LiquidCrystal_I2C lcd(0x27, 16, 2);

// Pins
const int buttonPin = 4;
const int ledPin = 3;

// Variables
String command = "";
int ledBrightness = 100;   // Adjust brightness here (0–255)

void setup() {
  // Serial
  Serial.begin(115200);
  Serial.println("Ready!");
  Serial.println("Type 'start' to turn device ON");
  Serial.println("Type 'done' to turn device OFF");

  // Pins
  pinMode(buttonPin, INPUT);   // High impedance (button released)
  pinMode(ledPin, OUTPUT);

  // LED ON with set brightness
  analogWrite(ledPin, ledBrightness);

  // LCD init
  lcd.init();
  lcd.backlight();
  lcd.clear(); // Clear any existing text
  lcd.setCursor(0, 0);
  lcd.print("System Ready");
  lcd.setCursor(0, 1);
  lcd.print("Waiting...");
}

void loop() {
  // 1. Check for Serial Commands from PC (Python)
  if (Serial.available() > 0) {
    command = Serial.readStringUntil('\n');
    command.trim();

    if (command.equalsIgnoreCase("start")) {
      simulateButtonTap();
      showStatus("DEVICE ON", "Measuring...");
      Serial.println("Button pressed - Device turning ON...");
    }
    else if (command.equalsIgnoreCase("OFF")) {
      // Explicit OFF command - tap button to turn device off
      simulateButtonTap();
      showStatus("DEVICE OFF", "Error Recovery");
      Serial.println("OFF command - Device turning OFF...");
    }
    else if (command.equalsIgnoreCase("done")) {
      simulateButtonTap();
      showStatus("DEVICE OFF", "Goodbye");
      Serial.println("Button pressed - Device turning OFF...");
    }
    else if (command.startsWith("RESULT:")) {
      String res = command.substring(7); // Remove "RESULT:"
      showStatus("BP Result:", res.c_str());
    }
    else if (command.startsWith("INFLATING:")) {
      String val = command.substring(10);
      showStatus("Inflating...", (val + " mmHg").c_str());
    }
    else if (command.startsWith("DEFLATING:")) {
      String val = command.substring(10);
      showStatus("Deflating...", (val + " mmHg").c_str());
    }
    else if (command.startsWith("STATUS:")) {
       String stat = command.substring(7);
       showStatus("Status:", stat.c_str());
    }
    else if (command.startsWith("ERROR")) {
       showStatus("Error Detected", "Press Btn Again");
    }
    else if (command.equalsIgnoreCase("LCD_IDLE")) {
       showStatus("System Ready", "Waiting...");
    }
    else if (command.equalsIgnoreCase("LCD_BP_READY")) {
       showStatus("Blood Pressure", "Ready...");
    }
  }

  // 2. Monitor Physical Button (Active LOW)
  // If the user presses the physical button on the BP monitor, this pin goes LOW.
  // We report this to the PC so the UI knows a measurement has started manually.
  // Note: We only check if we are in INPUT mode (High Impedance) to avoid reading our own output.
  // (pinMode is set to INPUT in setup and after simulateButtonTap)
  if (digitalRead(buttonPin) == LOW) {
     delay(50); // Debounce
     if (digitalRead(buttonPin) == LOW) {
        Serial.println("MANUAL_START");
        showStatus("Manual Start", "Monitoring...");
        
        // Wait until button is released to prevent spamming
        while(digitalRead(buttonPin) == LOW) { delay(10); } 
        delay(100);
     }
  }
}

void simulateButtonTap() {
  pinMode(buttonPin, OUTPUT);
  digitalWrite(buttonPin, LOW);   // Press to simulate grounded button press
  delay(100);

  pinMode(buttonPin, INPUT);      // Release into High Impedance
  delay(100);
}

void showStatus(const char* line1, const char* line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}
