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
        
        # System initialization status - start with basic connection
        self.connection_established = False
        self.basic_mode = True  # Start in basic mode, full init later
        self.full_system_initialized = False
        self.weight_sensor_ready = False
        self.temperature_sensor_ready = False
        self.height_sensor_ready = False
        self.hr_sensor_ready = False
        self.auto_tare_completed = False
        
        self.force_simulation = force_simulation
        self.read_thread = None
        self.should_read = False
        
        # Sensor power states
        self.sensor_states = {
            "weight": "OFF",
            "height": "OFF", 
            "temperature": "OFF",
            "max30102": "OFF"
        }

    def connect(self) -> bool:
        """
        Connects to the Arduino - BASIC CONNECTION ONLY.
        Full initialization happens separately.
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
                
                # Listen for basic ready signal (quick timeout)
                start_time = time.time()
                
                while time.time() - start_time < 5.0: # Quick 5-second timeout
                    if self.serial_conn.in_waiting > 0:
                        line = self.serial_conn.readline().decode('utf-8').strip()
                        if line:
                            print(f"   ... Arduino: {line}")
                            
                            # Parse basic status
                            self._parse_serial_data(line)
                            
                            if "READY_FOR_COMMANDS" in line:
                                self.is_connected = True
                                self.connection_established = True
                                self.port = port
                                self.start_reading()
                                print(f"✅ BASIC CONNECTION successful on {port}!")
                                print("💡 System is in BASIC MODE - full initialization needed")
                                return True
                
                # If basic connection not found, try next port
                self.serial_conn.close()
                print(f"🟡 Port {port} not responding with basic handshake.")

            except serial.SerialException as e:
                print(f"⚪ Port {port} not available: {e}")
                continue

        print("❌ Connection Failed. No Arduino found on any scanned port.")
        self.is_connected = False
        return False

    def full_initialize(self) -> bool:
        """
        Performs full system initialization including weight sensor tare.
        This is called AFTER basic connection is established.
        """
        if not self.is_connected:
            print("❌ Cannot initialize - not connected to Arduino")
            return False
        
        print("🚀 Starting FULL SYSTEM INITIALIZATION...")
        self._send_command("FULL_INITIALIZE")
        
        # Wait for initialization to complete
        start_time = time.time()
        while time.time() - start_time < 15.0: # 15 second timeout for full init
            if self.full_system_initialized:
                print("✅ FULL SYSTEM INITIALIZATION COMPLETE!")
                self.basic_mode = False
                return True
            time.sleep(0.5)
        
        print("⚠️ Full initialization timeout - system may be in basic mode")
        return False

    def initialize_weight_sensor(self) -> bool:
        """
        Initializes only the weight sensor with tare.
        """
        if not self.is_connected:
            print("❌ Cannot initialize weight sensor - not connected")
            return False
        
        print("⚖️ Initializing weight sensor...")
        self._send_command("INITIALIZE_WEIGHT")
        
        # Wait for weight sensor to be ready
        start_time = time.time()
        while time.time() - start_time < 10.0:
            if self.weight_sensor_ready:
                print("✅ Weight sensor initialized and ready!")
                return True
            time.sleep(0.5)
        
        print("⚠️ Weight sensor initialization timeout")
        return False

    def disconnect(self):
        """Disconnects from the Arduino and powers down all sensors."""
        self.shutdown_all_sensors()
        self.should_read = False
        if self.read_thread and self.read_thread.is_alive():
            self.read_thread.join(timeout=2)
        if self.serial_conn and self.serial_conn.is_open:
            self.serial_conn.close()
        self.is_connected = False
        self.current_phase = "IDLE"
        self.measurement_active = False
        self.connection_established = False
        self.basic_mode = True
        self.full_system_initialized = False
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
            self.current_measurement_status = status.lower()
            
            # Track system initialization
            if "booting_up" in self.current_measurement_status:
                self.basic_mode = True
            elif "basic_sensors_initialized" in self.current_measurement_status:
                self.basic_mode = True
            elif "full_system_initialization_complete" in self.current_measurement_status:
                self.full_system_initialized = True
                self.basic_mode = False
            elif "weight_sensor_ready" in self.current_measurement_status:
                self.weight_sensor_ready = True
            elif "temp_sensor_ready" in self.current_measurement_status:
                self.temperature_sensor_ready = True
            elif "height_sensor_ready" in self.current_measurement_status:
                self.height_sensor_ready = True
            elif "hr_sensor_ready" in self.current_measurement_status:
                self.hr_sensor_ready = True
            elif "tare_complete" in self.current_measurement_status:
                self.auto_tare_completed = True
            
            # Update measurement state based on status
            if "complete" in self.current_measurement_status:
                self.measurement_active = False
                self.current_phase = "IDLE"
            elif "started" in self.current_measurement_status:
                self.measurement_active = True

        elif prefix == "RESULT":
            sensor = parts[1] if len(parts) > 1 else ""
            if sensor == "WEIGHT": 
                self.weight = float(parts[2]) if len(parts) > 2 else 0
                self.sensor_states["weight"] = "COMPLETE"
                self.measurement_active = False
                self.current_phase = "IDLE"
                print(f"✅ Weight measurement completed: {self.weight} kg")
            elif sensor == "HEIGHT": 
                self.height = float(parts[2]) if len(parts) > 2 else 0
                self.sensor_states["height"] = "COMPLETE"
                self.measurement_active = False
                self.current_phase = "IDLE"
                print(f"✅ Height measurement completed: {self.height} cm")
            elif sensor == "TEMP": 
                value = float(parts[2]) if len(parts) > 2 else 0
                self.temperature = value
                self.live_temperature = value
                self.sensor_states["temperature"] = "COMPLETE"
                self.measurement_active = False
                self.current_phase = "IDLE"
                print(f"✅ Temperature measurement completed: {self.temperature} °C")
            elif sensor == "HR":
                self.heart_rate = float(parts[2]) if len(parts) > 2 else None
                self.spo2 = float(parts[3]) if len(parts) > 3 else None
                self.respiratory_rate = float(parts[4]) if len(parts) > 4 else None
                self.sensor_states["max30102"] = "COMPLETE"
                self.measurement_active = False
                self.current_phase = "IDLE"
                print(f"✅ HR measurement completed: HR={self.heart_rate}, SpO2={self.spo2}, RR={self.respiratory_rate}")
        
        elif prefix == "DATA":
            sensor = parts[1] if len(parts) > 1 else ""
            value = parts[2] if len(parts) > 2 else "0"
            if sensor == "TEMP":
                self.live_temperature = float(value)

        elif prefix == "ERROR":
            self.current_measurement_status = "error"
            print(f"🚨 Arduino Error: {':'.join(parts[1:])}")

        elif prefix == "SYSTEM":
            system_msg = parts[1] if len(parts) > 1 else ""
            if "connected_basic_mode" in system_msg:
                self.basic_mode = True
                self.connection_established = True

    def _send_command(self, command: str):
        """Sends a command to the Arduino."""
        if self.is_connected and self.serial_conn:
            try:
                self.serial_conn.write(f"{command}\n".encode('utf-8'))
                print(f"📤 SENT: {command}")
            except Exception as e:
                print(f"❌ Failed to send command: {e}")

    def _start_generic_measurement(self, phase: str, command: str, sensor_type: str):
        """A generic helper to start any measurement phase."""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        # Allow measurements in basic mode, but warn about weight sensor
        if sensor_type == "weight" and not self.weight_sensor_ready and self.basic_mode:
            print("⚠️ Weight measurement in basic mode - sensor may not be tared")
            # Continue anyway, but warn user
            
        if self.measurement_active:
            return {"status": "error", "message": "Another measurement is in progress"}
        
        # Reset previous measurement result
        if phase == "WEIGHT": 
            self.weight = None
        elif phase == "HEIGHT": 
            self.height = None
        elif phase == "TEMP": 
            self.temperature = None
            self.live_temperature = None
        elif phase == "HR":
            self.heart_rate = None
            self.spo2 = None
            self.respiratory_rate = None
        
        # Power up the requested sensor
        self._power_up_sensor(sensor_type)
        
        self.current_phase = phase
        self.measurement_active = True
        self.current_measurement_status = "initializing"
        
        self._send_command(command)
        
        message = f"{phase} measurement initiated"
        if self.basic_mode and sensor_type == "weight":
            message += " (BASIC MODE - weight may not be accurate)"
            
        return {"status": "started", "message": message}

    def _power_up_sensor(self, sensor_type: str):
        """Powers up a specific sensor."""
        power_commands = {
            "weight": "POWER_UP_WEIGHT",
            "height": "POWER_UP_HEIGHT", 
            "temperature": "POWER_UP_TEMP",
            "max30102": "POWER_UP_HR"
        }
        if sensor_type in power_commands:
            self._send_command(power_commands[sensor_type])
            self.sensor_states[sensor_type] = "ACTIVE"
            print(f"🔋 Powered up {sensor_type} sensor")

    def _power_down_sensor(self, sensor_type: str):
        """Powers down a specific sensor."""
        power_commands = {
            "weight": "POWER_DOWN_WEIGHT",
            "height": "POWER_DOWN_HEIGHT",
            "temperature": "POWER_DOWN_TEMP", 
            "max30102": "POWER_DOWN_HR"
        }
        if sensor_type in power_commands:
            self._send_command(power_commands[sensor_type])
            if self.sensor_states[sensor_type] != "COMPLETE":
                self.sensor_states[sensor_type] = "OFF"
            print(f"🔌 Powered down {sensor_type} sensor")

    def shutdown_all_sensors(self):
        """Completely shuts down all sensors."""
        for sensor_type in self.sensor_states.keys():
            if self.sensor_states[sensor_type] in ["ACTIVE", "COMPLETE"]:
                self._power_down_sensor(sensor_type)
        self._send_command("SHUTDOWN_ALL")
        for sensor_type in self.sensor_states.keys():
            self.sensor_states[sensor_type] = "OFF"
        self.measurement_active = False
        self.current_phase = "IDLE"
        print("🔌 All sensors shut down")

    def perform_tare(self):
        """Performs tare operation on weight sensor."""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        self._send_command("TARE_WEIGHT")
        return {"status": "started", "message": "Tare operation initiated"}

    def get_system_status(self):
        """Returns comprehensive system status."""
        return {
            "connected": self.is_connected,
            "connection_established": self.connection_established,
            "system_mode": "BASIC" if self.basic_mode else "FULLY_INITIALIZED",
            "full_system_initialized": self.full_system_initialized,
            "sensors_ready": {
                "weight": self.weight_sensor_ready,
                "temperature": self.temperature_sensor_ready,
                "height": self.height_sensor_ready,
                "max30102": self.hr_sensor_ready
            },
            "auto_tare_completed": self.auto_tare_completed,
            "current_phase": self.current_phase,
            "measurement_active": self.measurement_active,
            "sensor_states": self.sensor_states
        }

    # --- Public Methods for API Routes ---
    
    def get_status(self) -> Dict[str, Any]:
        """Returns the overall status of the sensor manager."""
        return {
            "connected": self.is_connected,
            "port": self.port if self.is_connected else None,
            "current_phase": self.current_phase,
            "measurement_active": self.measurement_active,
            "system_mode": "BASIC" if self.basic_mode else "FULLY_INITIALIZED",
            "full_system_initialized": self.full_system_initialized,
            "weight_sensor_ready": self.weight_sensor_ready,
            "auto_tare_completed": self.auto_tare_completed,
            "sensor_states": self.sensor_states
        }

    def start_weight_measurement(self):
        return self._start_generic_measurement("WEIGHT", "START_WEIGHT", "weight")

    def get_weight_status(self):
        return {
            "status": self.current_measurement_status, 
            "weight": self.weight,
            "measurement_active": self.measurement_active,
            "sensor_ready": self.weight_sensor_ready,
            "auto_tare_completed": self.auto_tare_completed
        }

    def start_height_measurement(self):
        return self._start_generic_measurement("HEIGHT", "START_HEIGHT", "height")

    def get_height_status(self):
        return {
            "status": self.current_measurement_status, 
            "height": self.height,
            "measurement_active": self.measurement_active,
            "sensor_ready": self.height_sensor_ready
        }
        
    def start_temperature_measurement(self):
        return self._start_generic_measurement("TEMP", "START_TEMP", "temperature")

    def get_temperature_status(self):
        return {
            "status": self.current_measurement_status, 
            "temperature": self.temperature,
            "live_temperature": self.live_temperature,
            "measurement_active": self.measurement_active,
            "sensor_ready": self.temperature_sensor_ready
        }

    def start_max30102_measurement(self):
        return self._start_generic_measurement("HR", "START_HR", "max30102")

    def get_max30102_status(self):
        return {
            "status": self.current_measurement_status, 
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "respiratory_rate": self.respiratory_rate,
            "measurement_active": self.measurement_active,
            "sensor_ready": self.hr_sensor_ready
        }

    def get_measurements(self):
        """Returns all completed measurements."""
        return {
            "weight": self.weight,
            "height": self.height,
            "temperature": self.temperature,
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "respiratory_rate": self.respiratory_rate
        }

    def reset_measurements(self):
        """Resets all measurement results."""
        self.weight = None
        self.height = None
        self.temperature = None
        self.heart_rate = None
        self.spo2 = None
        self.respiratory_rate = None
        self.live_temperature = None
        
        # Reset sensor states but keep readiness flags
        for sensor_type in self.sensor_states.keys():
            if self.sensor_states[sensor_type] == "COMPLETE":
                self.sensor_states[sensor_type] = "OFF"
        
        print("📊 All measurements reset")
        return {"status": "success", "message": "All measurements reset"}

    def force_reconnect(self):
        """Forces reconnection to Arduino."""
        self.disconnect()
        time.sleep(2)
        return self.connect()