import serial
import threading
import time
import re
from typing import Dict, Any

class SensorManager:
    def __init__(self, port: str = 'COM3', baudrate: int = 9600, force_simulation: bool = False):
        self.port = port
        self.baudrate = baudrate
        self.serial_conn = None
        self.is_connected = False
        self.current_phase = "IDLE"
        self.measurement_active = False
        
        # FINAL measurement results
        self.weight = None
        self.height = None
        self.temperature = None
        self.heart_rate = None
        self.spo2 = None
        self.respiratory_rate = None
        
        # LIVE data for ongoing measurements
        self.live_temperature = None
        
        # Detailed status for multi-step measurements
        self.current_measurement_status = "idle" 
        
        self.force_simulation = force_simulation
        self.read_thread = None
        self.should_read = False

    def connect(self) -> bool:
        """
        Connects to the Arduino.
        IMPROVED: Now automatically scans common COM ports and listens patiently
        for the handshake message.
        """
        if self.is_connected:
            return True

        # Expanded list of common ports for Windows
        common_ports = ['COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'COM10', 'COM11', 'COM12']
        
        for port in common_ports:
            try:
                print(f"🔌 Attempting to connect to Arduino on {port}...")
                self.serial_conn = serial.Serial(port, self.baudrate, timeout=1)
                
                # Give the Arduino time to reset
                time.sleep(2)
                
                # Listen for the handshake for a moment instead of just one line
                start_time = time.time()
                while time.time() - start_time < 2.0: # Listen for 2 seconds
                    if self.serial_conn.in_waiting > 0:
                        line = self.serial_conn.readline().decode('utf-8').strip()
                        print(f"   ... Arduino on {port} says: {line}") # Debug print
                        if "READY_FOR_COMMANDS" in line:
                            self.is_connected = True
                            self.port = port # Save the working port
                            self.start_reading()
                            print(f"✅ Connection successful on {port}!")
                            return True
                
                # If handshake not found after listening, close and try next port
                self.serial_conn.close()
                print(f"🟡 Port {port} is active but did not send ready signal.")

            except serial.SerialException:
                # This port doesn't exist or is in use, which is normal.
                print(f"⚪ Port {port} not available. Trying next...")
                continue

        print("❌ Connection Failed. No Arduino found on any scanned port.")
        self.is_connected = False
        return False

    def disconnect(self):
        """Disconnects from the Arduino."""
        self.should_read = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=2)
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
        self.is_connected = False
        self.current_phase = "IDLE"
        self.measurement_active = False
        print("🔌 Disconnected from Arduino")

    def start_reading(self):
        """Starts a background thread to read data from the serial port."""
        if self.is_connected and (not self.read_thread or not self.read_thread.is_alive()):
            self.should_read = True
            self.read_thread = threading.Thread(target=self._read_serial)
            self.read_thread.daemon = True
            self.read_thread.start()

    def _read_serial(self):
        """The actual work of reading and parsing serial data, running in a thread."""
        while self.should_read and self.serial_conn and self.serial_conn.is_open:
            try:
                if self.serial_conn.in_waiting > 0:
                    line = self.serial_conn.readline().decode('utf-8').strip()
                    if line:
                        self._parse_serial_data(line)
            except Exception as e:
                print(f"❌ Serial read error: {e}")
                self.is_connected = False # Assume connection is lost on error
                break

    def _parse_serial_data(self, data: str):
        """Parses incoming messages from the Arduino and updates the manager's state."""
        print(f"📥 ARDUINO: {data}")
        parts = data.split(':')
        prefix = parts[0]

        if prefix == "STATUS":
            status = parts[1] if len(parts) > 1 else ""
            self.current_measurement_status = status.lower() # Using consistent underscore format
            if "measurement_complete" in self.current_measurement_status:
                self.measurement_active = False
                self.current_phase = "IDLE"
                self.current_measurement_status = "completed"

        elif prefix == "RESULT":
            sensor = parts[1] if len(parts) > 1 else ""
            if sensor == "WEIGHT": self.weight = float(parts[2]) if len(parts) > 2 else 0
            elif sensor == "HEIGHT": self.height = float(parts[2]) if len(parts) > 2 else 0
            elif sensor == "TEMP": 
                value = float(parts[2]) if len(parts) > 2 else 0
                self.temperature = value
                self.live_temperature = value
            elif sensor == "HR":
                self.heart_rate = float(parts[2]) if len(parts) > 2 else None
                self.spo2 = float(parts[3]) if len(parts) > 3 else None
                self.respiratory_rate = float(parts[4]) if len(parts) > 4 else None
        
        elif prefix == "DATA":
            sensor = parts[1] if len(parts) > 1 else ""
            value = parts[2] if len(parts) > 2 else "0"
            if sensor == "TEMP":
                self.live_temperature = float(value)

        elif prefix == "ERROR":
            self.current_measurement_status = "error"
            print(f"🚨 Arduino Error: {':'.join(parts[1:])}")

    def _send_command(self, command: str):
        """Sends a command to the Arduino."""
        # ✅ FIX: Corrected the typo here from 'is_serial_conn' to 'serial_conn'
        if self.is_connected and self.serial_conn:
            try:
                self.serial_conn.write(f"{command}\n".encode('utf-8'))
                print(f"📤 SENT: {command}")
            except Exception as e:
                print(f"❌ Failed to send command: {e}")

    def _start_generic_measurement(self, phase: str, command: str):
        """A generic helper to start any measurement phase."""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        if self.measurement_active:
            return {"status": "error", "message": "Another measurement is in progress"}
        
        self.current_phase = phase
        self.measurement_active = True
        self.current_measurement_status = "initializing"
        
        if phase == "WEIGHT": self.weight = None
        elif phase == "HEIGHT": self.height = None
        elif phase == "TEMP": 
            self.temperature = None
            self.live_temperature = None
        elif phase == "HR":
            self.heart_rate = None
            self.spo2 = None
            self.respiratory_rate = None
        
        self._send_command(command)
        return {"status": "started", "message": f"{phase} measurement initiated"}

    # --- Public Methods for API Routes ---
    
    def get_status(self) -> Dict[str, Any]:
        """Returns the overall status of the sensor manager."""
        return {
            "connected": self.is_connected,
            "port": self.port if self.is_connected else None,
            "current_phase": self.current_phase,
            "measurement_active": self.measurement_active,
        }

    def start_weight_measurement(self):
        return self._start_generic_measurement("WEIGHT", "START_WEIGHT")

    def get_weight_status(self):
        return {"status": self.current_measurement_status, "weight": self.weight}

    def start_height_measurement(self):
        return self._start_generic_measurement("HEIGHT", "START_HEIGHT")

    def get_height_status(self):
        return {"status": self.current_measurement_status, "height": self.height}
        
    def start_temperature_measurement(self):
        return self._start_generic_measurement("TEMP", "START_TEMP")

    def get_temperature_status(self):
        return {
            "status": self.current_measurement_status, 
            "temperature": self.temperature,
            "live_temperature": self.live_temperature
        }

    def start_max30102_measurement(self):
        return self._start_generic_measurement("HR", "START_HR")

    def get_max30102_status(self):
        return {
            "status": self.current_measurement_status, 
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "respiratory_rate": self.respiratory_rate
        }

# ✅ FIX: Removed the extra '}' that was causing the syntax error