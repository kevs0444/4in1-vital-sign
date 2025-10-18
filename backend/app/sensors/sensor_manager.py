import serial
import threading
import time
import re
import random
import math
from typing import Dict, Any, Callable, Optional

class SensorManager:
    def __init__(self, port: str = 'COM3', baudrate: int = 9600, force_simulation: bool = False):
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
        
        # Connection settings - NO FORCE SIMULATION
        self.simulation_mode = force_simulation
        self.force_simulation = force_simulation
        
        # Callbacks
        self.data_callbacks = []
        self.status_callbacks = []
        self.read_thread = None
        self.should_read = False

    def connect(self) -> bool:
        """Connect to Arduino - Returns TRUE only if actually connected"""
        try:
            # Only use simulation if explicitly forced
            if self.force_simulation:
                print("🔧 FORCED SIMULATION MODE: Skipping Arduino connection")
                self.is_connected = True
                self.simulation_mode = True
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
                connected = False
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
                            connected = True
                            break
                        except Exception as port_error:
                            print(f"❌ Failed on port {port}: {port_error}")
                            continue
                
                if not connected:
                    print("❌ All connection attempts failed. No Arduino detected.")
                    self.simulation_mode = False  # No simulation fallback
                    self.is_connected = False
                    return False
                else:
                    return True
                    
        except Exception as e:
            print(f"❌ Critical connection error: {e}")
            self.simulation_mode = False
            self.is_connected = False
            return False

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
        """Parse incoming serial data - UPDATED FOR SIMPLIFIED ARDUINO CODE"""
        print(f"📥 ARDUINO: {data}")
        
        # Temperature measurement patterns - SIMPLIFIED
        if "TEMP_MEASUREMENT_STARTED" in data:
            self.current_phase = "TEMP"
            self.measurement_active = True
            self.temperature = None
            self._trigger_status_callbacks()
            
        elif "MEASURING_TEMPERATURE" in data:
            self._trigger_data_callbacks('status', 'measuring_temperature')
            
        elif "TEMP_DATA:" in data:
            # Format: "TEMP_DATA:36.5"
            match = re.search(r'TEMP_DATA:([\d.]+)', data)
            if match:
                temp = float(match.group(1))
                self.temperature = temp
                self._trigger_data_callbacks('temperature', temp)
                self._trigger_status_callbacks()
                
        elif "TEMP_PROGRESS:" in data:
            # Format: "TEMP_PROGRESS:4"
            match = re.search(r'TEMP_PROGRESS:(\d+)', data)
            if match:
                seconds = int(match.group(1))
                self._trigger_data_callbacks('progress', seconds)
                
        elif "TEMP_FINAL:" in data:
            # Format: "TEMP_FINAL:36.5:Normal"
            match = re.search(r'TEMP_FINAL:([\d.]+):(.+)', data)
            if match:
                self.temperature = float(match.group(1))
                category = match.group(2)
                self.current_phase = "IDLE"
                self.measurement_active = False
                self._trigger_data_callbacks('temperature_final', self.temperature)
                self._trigger_data_callbacks('temperature_category', category)
                self._trigger_status_callbacks()
                
        elif "TEMP_MEASUREMENT_COMPLETE" in data:
            self.current_phase = "IDLE"
            self.measurement_active = False
            self._trigger_data_callbacks('status', 'measurement_complete')
            self._trigger_status_callbacks()

        # MAX30102 measurement patterns
        elif "HR_MEASUREMENT_STARTED" in data:
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
                
        elif "HR_DATA:" in data:
            # Format: "HR_DATA:72:98:16"
            match = re.search(r'HR_DATA:(\d+):(\d+):(\d+)', data)
            if match:
                hr = int(match.group(1))
                spo2 = int(match.group(2))
                rr = int(match.group(3))
                
                self.heart_rate = hr
                self.spo2 = spo2
                self.respiratory_rate = rr
                
                self._trigger_data_callbacks('heart_rate', hr)
                self._trigger_data_callbacks('spo2', spo2)
                self._trigger_data_callbacks('respiratory_rate', rr)
                
        elif "HR_PROGRESS:" in data:
            # Format: "HR_PROGRESS:45"
            match = re.search(r'HR_PROGRESS:(\d+)', data)
            if match:
                seconds = int(match.group(1))
                self._trigger_data_callbacks('progress', seconds)
                
        elif "HR_FINAL:" in data:
            # Format: "HR_FINAL:72.0:65-85:98.0:96-100:16:50"
            match = re.search(r'HR_FINAL:([\d.]+):([\d-]+):([\d.]+):([\d-]+):(\d+):(\d+)', data)
            if match:
                self.heart_rate = float(match.group(1))
                self.spo2 = float(match.group(3))
                self.respiratory_rate = int(match.group(5))
                
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
        elif "MEASUREMENT_STOPPED" in data:
            self.current_phase = "IDLE"
            self.measurement_active = False
            self.finger_detected = False
            self._trigger_status_callbacks()
        elif "TEMP_READING_ERROR" in data:
            self._trigger_data_callbacks('error', 'temperature_sensor_error')
        elif "RESETTING_TEMP_SENSOR" in data:
            self._trigger_data_callbacks('info', 'resetting_temperature_sensor')
        elif "TEMP_TIMEOUT" in data or "HR_TIMEOUT" in data:
            self.current_phase = "IDLE"
            self.measurement_active = False
            self._trigger_data_callbacks('status', 'timeout')
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
        """Get temperature measurement status - SIMPLIFIED"""
        if not self.is_connected:
            return {
                "status": "error",
                "message": "Not connected to Arduino",
                "temperature": None
            }
        
        try:
            # For real Arduino connection, return current state
            if self.simulation_mode:
                # Simulation logic
                elapsed = time.time() - self.measurement_start_time if self.measurement_active else 0
                
                if self.current_phase == "TEMP" and self.measurement_active:
                    if elapsed < 2:
                        return {
                            "status": "starting",
                            "message": "Initializing temperature sensor...",
                            "temperature": None
                        }
                    elif elapsed < 5:
                        # Generate simulated temperature
                        simulated_temp = round(36.5 + random.uniform(-0.3, 0.5), 1)
                        self.temperature = simulated_temp
                        return {
                            "status": "measuring",
                            "message": "Measuring temperature...",
                            "temperature": simulated_temp
                        }
                    else:
                        self.current_phase = "IDLE"
                        self.measurement_active = False
                        return {
                            "status": "completed",
                            "message": "Measurement complete",
                            "temperature": self.temperature
                        }
                else:
                    return {
                        "status": "idle",
                        "message": "Ready for temperature measurement",
                        "temperature": self.temperature
                    }
            else:
                # Real Arduino - return current state based on parsed data
                if self.current_phase == "TEMP" and self.measurement_active:
                    elapsed = time.time() - self.measurement_start_time
                    
                    if elapsed < 1:
                        return {
                            "status": "starting",
                            "message": "Initializing sensor...",
                            "temperature": None
                        }
                    elif self.temperature:
                        return {
                            "status": "measuring",
                            "message": "Measuring temperature...",
                            "temperature": self.temperature
                        }
                    else:
                        return {
                            "status": "measuring",
                            "message": "Measuring temperature...",
                            "temperature": None
                        }
                elif self.temperature:
                    return {
                        "status": "completed",
                        "message": "Measurement complete",
                        "temperature": self.temperature
                    }
                else:
                    return {
                        "status": "idle",
                        "message": "Ready for temperature measurement",
                        "temperature": self.temperature
                    }
                
        except Exception as e:
            return {
                "status": "error",
                "message": f"Error getting temperature status: {str(e)}",
                "temperature": None
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
            return {
                "status": "started",
                "message": "MAX30102 measurement started",
                "simulation": True
            }
        else:
            self._send_command("START_HR")
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
            return "👆 Place finger on sensor"
        elif not self.heart_rate and not self.spo2:
            return "🔄 Stabilizing signal..."
        elif self.heart_rate is None or self.spo2 is None:
            return "📡 Acquiring signal..."
        else:
            return "💓 Measuring vital signs..."

    def stop_measurement(self):
        """Stop current measurement"""
        if self.is_connected and not self.simulation_mode:
            self._send_command("STOP")
        
        self.current_phase = "IDLE"
        self.measurement_active = False
        self.finger_detected = False
        
        return {"status": "Measurement stopped"}

    def get_status(self):
        """Get current sensor status"""
        connected_status = self.is_connected and not self.simulation_mode
        
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
            "port": self.port,
            "hardware_available": connected_status
        }

    def test_connection(self):
        """Test connection"""
        if self.simulation_mode:
            return {
                "status": "simulation", 
                "message": "Running in simulation mode - No hardware connected",
                "simulation": True,
                "connected": False
            }
        elif self.is_connected and self.serial_conn and self.serial_conn.is_open:
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
                "status": "disconnected", 
                "message": "No Arduino hardware connected",
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