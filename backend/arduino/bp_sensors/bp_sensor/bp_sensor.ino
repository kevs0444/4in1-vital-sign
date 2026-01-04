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
  if (Serial.available() > 0) {
    command = Serial.readStringUntil('\n');
    command.trim();

    if (command.equalsIgnoreCase("start")) {
      simulateButtonTap();
      showStatus("DEVICE ON", "Measuring...");
      Serial.println("Button pressed - Device turning ON...");
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
    else if (command.startsWith("STATUS:")) {
       String stat = command.substring(7); // Remove "STATUS:"
       showStatus("Status:", stat.c_str());
    }
    else if (command.startsWith("LIVE:")) {
       String val = command.substring(5); // Remove "LIVE:"
       // Show live systolic updating on second line, changing only the number
       // Assuming line 1 is "Measuring..." or similar
       lcd.setCursor(0, 1);
       lcd.print("Val:            "); // Clear line slightly
       lcd.setCursor(5, 1);
       lcd.print(val + " mmHg"); 
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
