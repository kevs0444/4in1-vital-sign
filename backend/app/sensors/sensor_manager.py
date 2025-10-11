import serial
import threading
import time
import re
import random
from typing import Dict, Any, Callable, Optional

class SensorManager:
    def __init__(self, port: str = 'COM3', baudrate: int = 9600, force_simulation: bool = True):
        self.port = port
        self.baudrate = baudrate
        self.serial_conn = None
        self.is_connected = False
        self.current_phase = "IDLE"
        self.measurement_active = False
        
        # Measurement results
        self.temperature = None
        self.heart_rate = None
        self.spo2 = None
        self.respiratory_rate = None
        self.finger_detected = False
        
        # Measurement timing
        self.measurement_start_time = 0
        self.measurement_duration = 60
        
        # Force simulation mode for testing
        self.simulation_mode = force_simulation
        if force_simulation:
            self.is_connected = True
            print("🔧 SIMULATION MODE: Force enabled for testing")
        
        # Callbacks
        self.data_callbacks = []
        self.status_callbacks = []
        self.read_thread = None
        self.should_read = False

    def connect(self) -> bool:
        """Connect to Arduino"""
        try:
            if self.simulation_mode:
                print("🔧 SIMULATION MODE: Skipping actual Arduino connection")
                self.is_connected = True
                return True
            
            print(f"🔌 Attempting to connect to Arduino on {self.port}...")
            
            try:
                self.serial_conn = serial.Serial(
                    port=self.port,
                    baudrate=self.baudrate,
                    timeout=1
                )
                time.sleep(2)
                self.is_connected = True
                self.simulation_mode = False
                self.start_reading()
                print(f"✅ Connected to Arduino on {self.port}")
                return True
            except Exception as e:
                print(f"❌ Failed to connect to Arduino on {self.port}: {e}")
                
                # Try alternative ports
                common_ports = ['COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8']
                for port in common_ports:
                    if port != self.port:
                        try:
                            print(f"🔄 Trying alternative port: {port}")
                            self.serial_conn = serial.Serial(
                                port=port,
                                baudrate=self.baudrate,
                                timeout=1
                            )
                            self.port = port
                            self.is_connected = True
                            self.simulation_mode = False
                            self.start_reading()
                            print(f"✅ Connected to Arduino on {port}")
                            return True
                        except:
                            continue
                
                print("🔧 All connection attempts failed. Enabling simulation mode...")
                self.simulation_mode = True
                self.is_connected = True
                return True
                
        except Exception as e:
            print(f"❌ Critical connection error: {e}")
            self.simulation_mode = True
            self.is_connected = True
            return True

    def disconnect(self):
        """Disconnect from Arduino"""
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
        """Start background thread for reading serial data"""
        if not self.simulation_mode and self.serial_conn:
            self.should_read = True
            self.read_thread = threading.Thread(target=self._read_serial)
            self.read_thread.daemon = True
            self.read_thread.start()

    def _read_serial(self):
        """Background thread for reading serial data"""
        while self.should_read and self.serial_conn and self.serial_conn.is_open:
            try:
                if self.serial_conn.in_waiting > 0:
                    line = self.serial_conn.readline().decode('utf-8').strip()
                    if line:
                        self._parse_serial_data(line)
            except Exception as e:
                print(f"❌ Serial read error: {e}")
                time.sleep(0.1)

    def _parse_serial_data(self, data: str):
        """Parse incoming serial data"""
        print(f"📥 ARDUINO: {data}")
        
        # Temperature measurement patterns
        if "TEMP_MEASUREMENT_STARTED" in data:
            self.current_phase = "TEMP"
            self.measurement_active = True
            self._trigger_status_callbacks()
            
        elif "TEMP_DATA:" in data:
            # Format: "TEMP_DATA:36.5:C"
            match = re.search(r'TEMP_DATA:([\d.]+):C', data)
            if match:
                temp = float(match.group(1))
                self.temperature = temp
                self._trigger_data_callbacks('temperature', temp)
                
        elif "TEMP_FINAL:" in data:
            # Format: "TEMP_FINAL:36.5:C"
            match = re.search(r'TEMP_FINAL:([\d.]+):C', data)
            if match:
                self.temperature = float(match.group(1))
                self.current_phase = "IDLE"
                self.measurement_active = False
                self._trigger_data_callbacks('temperature_final', self.temperature)
                self._trigger_status_callbacks()
                
        # MAX30102 measurement patterns
        elif "MAX30102_MEASUREMENT_STARTED" in data:
            self.current_phase = "MAX"
            self.measurement_active = True
            self.measurement_start_time = time.time()
            self._trigger_status_callbacks()
            
        elif "FINGER_DETECTED" in data:
            self.finger_detected = True
            self._trigger_data_callbacks('finger_status', 'detected')
            self._trigger_status_callbacks()
            
        elif "FINGER_REMOVED" in data:
            self.finger_detected = False
            self._trigger_data_callbacks('finger_status', 'removed')
            self._trigger_status_callbacks()
            
        elif "WAITING_FOR_FINGER" in data:
            self.finger_detected = False
            self._trigger_data_callbacks('finger_status', 'waiting')
            self._trigger_status_callbacks()
                
        elif "MAX_DATA" in data:
            # Format: "MAX_DATA - HR:72:BPM:SPO2:98:PERCENT"
            hr_match = re.search(r'HR:(\d+):BPM', data)
            spo2_match = re.search(r'SPO2:(\d+):PERCENT', data)
            
            if hr_match:
                hr = int(hr_match.group(1))
                self.heart_rate = hr
                self._trigger_data_callbacks('heart_rate', hr)
            if spo2_match:
                spo2 = int(spo2_match.group(1))
                self.spo2 = spo2
                self._trigger_data_callbacks('spo2', spo2)
                
        elif "MAX_PROGRESS:" in data:
            # Format: "MAX_PROGRESS:45:SECONDS"
            match = re.search(r'MAX_PROGRESS:(\d+):SECONDS', data)
            if match:
                seconds = int(match.group(1))
                self._trigger_data_callbacks('progress', seconds)
                
        elif "MAX_FINAL" in data:
            # Format: "MAX_FINAL - HR:72.0:BPM:SPO2:98.0:PERCENT:RR:16.0:BPM"
            hr_match = re.search(r'HR:([\d.]+):BPM', data)
            spo2_match = re.search(r'SPO2:([\d.]+):PERCENT', data)
            rr_match = re.search(r'RR:([\d.]+):BPM', data)
            
            if hr_match:
                self.heart_rate = float(hr_match.group(1))
            if spo2_match:
                self.spo2 = float(spo2_match.group(1))
            if rr_match:
                self.respiratory_rate = float(rr_match.group(1))
                
            self.current_phase = "IDLE"
            self.measurement_active = False
            self.finger_detected = False
            self._trigger_data_callbacks('max_final', {
                'heart_rate': self.heart_rate,
                'spo2': self.spo2,
                'respiratory_rate': self.respiratory_rate
            })
            self._trigger_status_callbacks()
            
        # Status and error patterns
        elif "HUMAN_DETECTED" in data:
            self._trigger_data_callbacks('contact_status', 'detected')
        elif "NO_USER_DETECTED" in data:
            self._trigger_data_callbacks('contact_status', 'no_contact')
        elif "MEASUREMENT_STOPPED" in data:
            self.current_phase = "IDLE"
            self.measurement_active = False
            self.finger_detected = False
            self._trigger_status_callbacks()

    def start_temperature_measurement(self):
        """Start temperature measurement"""
        if not self.is_connected:
            return {"error": "Not connected to Arduino"}
        
        if self.measurement_active:
            return {"error": "Another measurement in progress"}
        
        self.current_phase = "TEMP"
        self.measurement_active = True
        self.measurement_start_time = time.time()
        self.temperature = None
        
        if self.simulation_mode:
            print("🌡️ SIMULATION: Starting temperature measurement")
            return {
                "status": "started", 
                "message": "Temperature measurement started",
                "simulation": True
            }
        else:
            self._send_command("START_TEMP")
            return {"status": "started", "message": "Temperature measurement started"}

    def get_temperature_status(self):
        """Get temperature measurement status"""
        # Always return connected status in simulation mode
        if self.simulation_mode:
            if self.current_phase == "TEMP" and self.measurement_active:
                elapsed = time.time() - self.measurement_start_time
                
                if elapsed < 2:
                    return {
                        "status": "starting",
                        "message": "Initializing temperature sensor...",
                        "temperature": None
                    }
                elif elapsed < 5:
                    simulated_temp = 36.5 + random.uniform(-0.3, 0.5)
                    self.temperature = round(simulated_temp, 1)
                    return {
                        "status": "measuring",
                        "message": "Measuring temperature...",
                        "temperature": self.temperature
                    }
                else:
                    final_temp = 36.8
                    self.temperature = final_temp
                    self.current_phase = "IDLE"
                    self.measurement_active = False
                    return {
                        "status": "completed",
                        "message": "Temperature measurement complete",
                        "temperature": final_temp
                    }
            else:
                return {
                    "status": "idle",
                    "message": "Ready for temperature measurement",
                    "temperature": self.temperature
                }
        else:
            # Real Arduino code
            if self.serial_conn and self.serial_conn.in_waiting > 0:
                line = self.serial_conn.readline().decode('utf-8').strip()
                if line:
                    self._parse_serial_data(line)
            
            # Return current status based on parsed data
            if self.current_phase == "TEMP" and self.measurement_active:
                elapsed = time.time() - self.measurement_start_time
                
                if elapsed < 3:
                    return {
                        "status": "starting",
                        "message": "Initializing sensor...",
                        "temperature": None
                    }
                elif elapsed < 8:
                    return {
                        "status": "measuring",
                        "message": "Measuring temperature...",
                        "temperature": self.temperature
                    }
                else:
                    # Timeout or completion
                    self.measurement_active = False
                    self.current_phase = "IDLE"
                    return {
                        "status": "completed" if self.temperature else "timeout",
                        "message": "Measurement complete" if self.temperature else "Measurement timeout",
                        "temperature": self.temperature
                    }
            else:
                return {
                    "status": "idle",
                    "message": "Ready for measurement",
                    "temperature": self.temperature
                }

    def start_max30102_measurement(self):
        """Start MAX30102 measurement"""
        if not self.is_connected:
            return {"error": "Not connected to Arduino"}
        
        if self.measurement_active:
            return {"error": "Another measurement in progress"}
            
        # Reset previous measurements
        self.heart_rate = None
        self.spo2 = None
        self.respiratory_rate = None
        self.finger_detected = False
        
        self.current_phase = "MAX"
        self.measurement_active = True
        self.measurement_start_time = time.time()
        
        if self.simulation_mode:
            print("💓 SIMULATION: Starting MAX30102 measurement")
            # Simulate finger detection after 2 seconds
            def simulate_finger_detection():
                time.sleep(2)
                self.finger_detected = True
                self._trigger_status_callbacks()
            
            threading.Thread(target=simulate_finger_detection, daemon=True).start()
            
            return {
                "status": "started",
                "message": "MAX30102 measurement started",
                "simulation": True
            }
        else:
            self._send_command("START_MAX")
            return {
                "status": "started",
                "message": "MAX30102 measurement started"
            }

    def get_max30102_status(self):
        """Get MAX30102 measurement status"""
        if not self.is_connected:
            return {
                "status": "error",
                "message": "Not connected to Arduino",
                "heart_rate": None,
                "spo2": None,
                "respiratory_rate": None,
                "finger_detected": False,
                "progress_seconds": 60
            }
        
        try:
            # Calculate progress
            progress_seconds = 60
            if self.current_phase == "MAX" and self.measurement_active:
                elapsed = time.time() - self.measurement_start_time
                progress_seconds = max(0, 60 - int(elapsed))
                
                # Auto-complete after 60 seconds in simulation
                if self.simulation_mode and elapsed >= 60:
                    self.heart_rate = random.randint(65, 85)
                    self.spo2 = round(97 + random.uniform(0, 2), 1)
                    self.respiratory_rate = random.randint(12, 18)
                    self.current_phase = "IDLE"
                    self.measurement_active = False
                    self.finger_detected = False
            
            return {
                "current_phase": self.current_phase,
                "measurement_active": self.measurement_active,
                "heart_rate": self.heart_rate,
                "spo2": self.spo2,
                "respiratory_rate": self.respiratory_rate,
                "finger_detected": self.finger_detected,
                "progress_seconds": progress_seconds,
                "message": self._get_max30102_message()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error getting MAX30102 status: {str(e)}",
                "heart_rate": None,
                "spo2": None,
                "respiratory_rate": None,
                "finger_detected": False,
                "progress_seconds": 60
            }

    def _get_max30102_message(self):
        """Get appropriate message for MAX30102 status"""
        if not self.measurement_active:
            return "Ready for measurement"
        elif not self.finger_detected:
            return "Waiting for finger detection"
        elif self.heart_rate or self.spo2:
            return "Measuring vital signs..."
        else:
            return "Initializing sensor..."

    def stop_measurement(self):
        """Stop current measurement"""
        if self.is_connected and not self.simulation_mode:
            self._send_command("STOP_MEASUREMENT")
        
        self.current_phase = "IDLE"
        self.measurement_active = False
        self.finger_detected = False
        
        return {"status": "Measurement stopped"}

    def get_status(self):
        """Get current sensor status"""
        # In simulation mode, always report as connected
        connected_status = self.is_connected or self.simulation_mode
        
        return {
            "connected": connected_status,
            "simulation_mode": self.simulation_mode,
            "current_phase": self.current_phase,
            "measurement_active": self.measurement_active,
            "temperature": self.temperature,
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "respiratory_rate": self.respiratory_rate,
            "finger_detected": self.finger_detected,
            "port": self.port
        }

    def test_connection(self):
        """Test connection"""
        if self.simulation_mode:
            return {
                "status": "connected", 
                "message": "Simulation mode active - Ready for testing",
                "simulation": True,
                "connected": True
            }
        elif self.is_connected:
            try:
                self._send_command("TEST_CONNECTION")
                return {
                    "status": "connected", 
                    "message": "Arduino communication OK",
                    "connected": True
                }
            except Exception as e:
                return {
                    "status": "error", 
                    "message": f"Arduino communication failed: {e}",
                    "connected": False
                }
        else:
            return {
                "status": "error", 
                "message": "Not connected to Arduino",
                "connected": False
            }

    def get_all_measurements(self):
        """Get all completed measurements"""
        return {
            "temperature": self.temperature,
            "heart_rate": self.heart_rate,
            "spo2": self.spo2,
            "respiratory_rate": self.respiratory_rate,
            "timestamp": time.time(),
            "simulation_mode": self.simulation_mode
        }

    def _send_command(self, command: str):
        """Send command to Arduino"""
        try:
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write(f"{command}\n".encode('utf-8'))
                print(f"📤 SENT: {command}")
        except Exception as e:
            print(f"❌ Failed to send command: {e}")

    def add_data_callback(self, callback: Callable):
        """Add callback for real-time data updates"""
        self.data_callbacks.append(callback)

    def add_status_callback(self, callback: Callable):
        """Add callback for status updates"""
        self.status_callbacks.append(callback)

    def _trigger_data_callbacks(self, data_type: str, value: Any):
        """Trigger all data callbacks"""
        for callback in self.data_callbacks:
            try:
                callback(data_type, value)
            except Exception as e:
                print(f"❌ Callback error: {e}")

    def _trigger_status_callbacks(self):
        """Trigger all status callbacks"""
        status = self.get_status()
        for callback in self.status_callbacks:
            try:
                callback(status)
            except Exception as e:
                print(f"❌ Callback error: {e}")