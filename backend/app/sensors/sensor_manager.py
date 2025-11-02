import serial
import time
import threading
from serial.tools import list_ports
import re

class SensorManager:
    def __init__(self):
        self.serial_conn = None
        self.is_connected = False
        self.port = None
        self.baudrate = 9600
        self.basic_mode = True
        self.full_system_initialized = False
        self.weight_sensor_ready = False
        self.auto_tare_completed = False
        self.measurements = {
            'weight': None,
            'height': None
        }
        self._data_buffer = ""
        self._listener_thread = None
        self._stop_listener = False
        self._weight_measurement_active = False
        self._height_measurement_active = False

    def connect(self):
        """Establish connection and initialize sensors with auto-tare"""
        try:
            # Try to find Arduino port
            arduino_port = self._find_arduino_port()
            if not arduino_port:
                print("ERROR: Arduino not found")
                return False

            self.port = arduino_port
            print(f"Attempting to connect to {self.port} at {self.baudrate} baud")

            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1,
                write_timeout=1
            )

            # Wait for connection to stabilize
            time.sleep(2)
            
            # Clear any pending data
            self.serial_conn.reset_input_buffer()
            
            self.is_connected = True
            print(f"SUCCESS: Connected to {self.port}")

            # Start data listener
            self._start_data_listener()

            # Wait for Arduino to be ready
            time.sleep(3)
            
            # Start auto-tare process
            print("Starting auto-tare process...")
            tare_result = self.start_auto_tare()
            if tare_result['status'] == 'success':
                self.auto_tare_completed = True
                self.weight_sensor_ready = True
                print("Auto-tare completed successfully")
            else:
                print(f"Auto-tare warning: {tare_result.get('message', 'Unknown error')}")

            return self.is_connected

        except Exception as e:
            print(f"Connection error: {e}")
            self.is_connected = False
            return False

    def start_auto_tare(self):
        """Start automatic tare process for weight sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("AUTO_TARE\n".encode())
            time.sleep(0.5)
            
            # Monitor for tare completion
            start_time = time.time()
            while time.time() - start_time < 15:  # 15 second timeout
                status = self.get_system_status()
                if status.get('auto_tare_completed'):
                    return {"status": "success", "message": "Auto-tare completed successfully"}
                elif status.get('weight_sensor_ready'):
                    return {"status": "success", "message": "Weight sensor ready"}
                time.sleep(1)
            
            return {"status": "warning", "message": "Auto-tare may not have completed"}
            
        except Exception as e:
            return {"status": "error", "message": f"Auto-tare failed: {str(e)}"}

    def _find_arduino_port(self):
        """Find Arduino port automatically"""
        ports = list_ports.comports()
        for port in ports:
            if 'arduino' in port.description.lower() or 'ch340' in port.description.lower():
                return port.device
            if 'USB' in port.description or 'Serial' in port.description:
                return port.device
        return None

    def _start_data_listener(self):
        """Start background thread to listen for serial data"""
        self._stop_listener = False
        self._listener_thread = threading.Thread(target=self._listen_serial)
        self._listener_thread.daemon = True
        self._listener_thread.start()

    def _listen_serial(self):
        """Listen for incoming serial data and parse it"""
        while not self._stop_listener and self.is_connected:
            try:
                if self.serial_conn and self.serial_conn.in_waiting:
                    line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        self._parse_serial_data(line)
            except Exception as e:
                print(f"Serial listener error: {e}")
                time.sleep(0.1)

    def _parse_serial_data(self, data):
        """Parse incoming serial data and update measurements"""
        print(f"ARDUINO: {data}")  # Debug print

        # Weight measurement result
        if data.startswith("RESULT:WEIGHT:"):
            try:
                weight = float(data.split(":")[2])
                self.measurements['weight'] = weight
                self._weight_measurement_active = False
                print(f"Weight measured: {weight} kg")
            except (IndexError, ValueError) as e:
                print(f"Error parsing weight: {e}")

        # Height measurement result
        elif data.startswith("RESULT:HEIGHT:"):
            try:
                height = float(data.split(":")[2])
                self.measurements['height'] = height
                self._height_measurement_active = False
                print(f"Height measured: {height} cm")
            except (IndexError, ValueError) as e:
                print(f"Error parsing height: {e}")

        # System status updates
        elif data.startswith("STATUS:AUTO_TARE_COMPLETE"):
            self.auto_tare_completed = True
            self.weight_sensor_ready = True

        elif data.startswith("STATUS:WEIGHT_SENSOR_READY"):
            self.weight_sensor_ready = True

        elif data.startswith("STATUS:FULL_SYSTEM_INITIALIZATION_COMPLETE"):
            self.full_system_initialized = True

        # Measurement status updates
        elif data.startswith("STATUS:WEIGHT_MEASUREMENT_STARTED"):
            self._weight_measurement_active = True

        elif data.startswith("STATUS:HEIGHT_MEASUREMENT_STARTED"):
            self._height_measurement_active = True

        elif data.startswith("STATUS:WEIGHT_MEASUREMENT_COMPLETE"):
            self._weight_measurement_active = False

        elif data.startswith("STATUS:HEIGHT_MEASUREMENT_COMPLETE"):
            self._height_measurement_active = False

    def disconnect(self):
        """Disconnect from Arduino and cleanup"""
        try:
            self._stop_listener = True
            if self._listener_thread:
                self._listener_thread.join(timeout=1)
            
            if self.serial_conn and self.serial_conn.is_open:
                # Send shutdown command
                self.serial_conn.write("SHUTDOWN_ALL\n".encode())
                time.sleep(1)
                self.serial_conn.close()
                
            self.is_connected = False
            self.port = None
            print("Disconnected from Arduino")
            
        except Exception as e:
            print(f"Error during disconnect: {e}")

    def get_status(self):
        """Get current sensor manager status"""
        return {
            "connected": self.is_connected,
            "port": self.port,
            "basic_mode": self.basic_mode,
            "full_system_initialized": self.full_system_initialized,
            "weight_sensor_ready": self.weight_sensor_ready,
            "auto_tare_completed": self.auto_tare_completed,
            "measurements": self.measurements
        }

    def get_system_status(self):
        """Get detailed system status"""
        if not self.is_connected:
            return {
                "connected": False,
                "connection_established": False,
                "sensors_ready": {
                    "weight": False,
                    "height": False
                },
                "auto_tare_completed": False,
                "system_mode": "DISCONNECTED"
            }

        return {
            "connected": self.is_connected,
            "connection_established": True,
            "sensors_ready": {
                "weight": self.weight_sensor_ready,
                "height": True  # Height sensor is always ready when connected
            },
            "auto_tare_completed": self.auto_tare_completed,
            "system_mode": "FULLY_INITIALIZED" if self.auto_tare_completed else "BASIC"
        }

    def full_initialize(self):
        """Perform full system initialization"""
        if not self.is_connected:
            return False
        
        try:
            self.serial_conn.write("FULL_INITIALIZE\n".encode())
            time.sleep(2)
            
            # Wait for initialization to complete
            start_time = time.time()
            while time.time() - start_time < 20:
                if self.full_system_initialized:
                    return True
                time.sleep(1)
            
            return self.full_system_initialized
            
        except Exception as e:
            print(f"Full initialization error: {e}")
            return False

    def initialize_weight_sensor(self):
        """Initialize only the weight sensor"""
        if not self.is_connected:
            return False
        
        try:
            self.serial_conn.write("INITIALIZE_WEIGHT\n".encode())
            time.sleep(2)
            
            # Wait for weight sensor to be ready
            start_time = time.time()
            while time.time() - start_time < 15:
                if self.weight_sensor_ready:
                    return True
                time.sleep(1)
            
            return self.weight_sensor_ready
            
        except Exception as e:
            print(f"Weight sensor initialization error: {e}")
            return False

    def perform_tare(self):
        """Perform tare operation on weight sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("TARE_WEIGHT\n".encode())
            time.sleep(0.5)
            
            # Wait for tare completion
            start_time = time.time()
            while time.time() - start_time < 10:
                if self.auto_tare_completed:
                    return {"status": "success", "message": "Tare completed successfully"}
                time.sleep(1)
            
            return {"status": "warning", "message": "Tare may not have completed"}
            
        except Exception as e:
            return {"status": "error", "message": f"Tare failed: {str(e)}"}

    def reset_measurements(self):
        """Reset all measurement results"""
        self.measurements = {
            'weight': None,
            'height': None
        }
        return {"status": "success", "message": "Measurements reset"}

    def force_reconnect(self):
        """Force reconnection to Arduino"""
        self.disconnect()
        time.sleep(2)
        success = self.connect()
        return {"status": "success" if success else "error", "reconnected": success}

    def get_measurements(self):
        """Return all completed measurements"""
        return self.measurements

    # Individual sensor control methods
    def start_weight_measurement(self):
        """Start weight measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_WEIGHT\n".encode())
            self._weight_measurement_active = True
            return {"status": "success", "message": "Weight measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start weight measurement: {str(e)}"}

    def prepare_weight_sensor(self):
        """Prepare weight sensor for measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_WEIGHT\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Weight sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare weight sensor: {str(e)}"}

    def shutdown_weight(self):
        """Shutdown weight sensor"""
        self._weight_measurement_active = False
        self._power_down_sensor("weight")
        return {"status": "powered_down"}

    def get_weight_status(self):
        """Get weight sensor status"""
        status = {
            "status": "unknown",
            "measurement_active": self._weight_measurement_active,
            "weight": self.measurements.get('weight'),
            "message": "Weight sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        elif not self.weight_sensor_ready:
            status.update({"status": "not_ready", "message": "Weight sensor not initialized"})
        else:
            status.update({"status": "ready", "message": "Weight sensor ready"})
            
        return status

    def start_height_measurement(self):
        """Start height measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_HEIGHT\n".encode())
            self._height_measurement_active = True
            return {"status": "success", "message": "Height measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start height measurement: {str(e)}"}

    def prepare_height_sensor(self):
        """Prepare height sensor for measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_HEIGHT\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Height sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare height sensor: {str(e)}"}

    def shutdown_height(self):
        """Shutdown height sensor"""
        self._height_measurement_active = False
        self._power_down_sensor("height")
        return {"status": "powered_down"}

    def get_height_status(self):
        """Get height sensor status"""
        status = {
            "status": "unknown",
            "measurement_active": self._height_measurement_active,
            "height": self.measurements.get('height'),
            "message": "Height sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        else:
            status.update({"status": "ready", "message": "Height sensor ready"})
            
        return status

    def _power_down_sensor(self, sensor_type):
        """Power down specific sensor"""
        if not self.is_connected:
            return
        
        try:
            if sensor_type == "weight":
                self.serial_conn.write("POWER_DOWN_WEIGHT\n".encode())
            elif sensor_type == "height":
                self.serial_conn.write("POWER_DOWN_HEIGHT\n".encode())
        except Exception as e:
            print(f"Error powering down {sensor_type}: {e}")

    def shutdown_all_sensors(self):
        """Shutdown all sensors"""
        if not self.is_connected:
            return
        
        try:
            self.serial_conn.write("SHUTDOWN_ALL\n".encode())
            time.sleep(1)
            self._weight_measurement_active = False
            self._height_measurement_active = False
        except Exception as e:
            print(f"Error shutting down sensors: {e}")