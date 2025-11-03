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
        self.temperature_sensor_ready = False
        self.max30102_sensor_ready = False
        self.auto_tare_completed = False
        
        self.measurements = {
            'weight': None,
            'height': None,
            'temperature': None,
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None
        }
        self._data_buffer = ""
        self._listener_thread = None
        self._stop_listener = False
        self._weight_measurement_active = False
        self._height_measurement_active = False
        self._temperature_measurement_active = False
        self._max30102_measurement_active = False
        
        # Real-time measurement data
        self.live_data = {
            'weight': {
                'current': None,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 3
            },
            'height': {
                'current': None,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 2
            },
            'temperature': {
                'current': None,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 2,
                'ready_threshold': 34.0
            },
            'max30102': {
                'heart_rate': None,
                'spo2': None,
                'respiratory_rate': None,
                'finger_detected': False,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 30,
                'sensor_prepared': False
            }
        }

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

        # ==================== MAX30102 PARSING - UPDATED ====================
        
        # MAX30102 finger status
        if data.startswith("MAX30102_FINGER_STATUS:"):
            status = data.split(":")[1].strip()
            self.live_data['max30102']['finger_detected'] = (status == "DETECTED")
            print(f"👆 MAX30102 Finger: {status}")

        # MAX30102 IR value
        elif data.startswith("MAX30102_IR_VALUE:"):
            try:
                ir_value = int(data.split(":")[1])
                print(f"📊 MAX30102 IR Value: {ir_value}")
            except ValueError:
                pass

        # MAX30102 state changes
        elif data.startswith("MAX30102_STATE:"):
            state = data.split(":")[1]
            print(f"🔄 MAX30102 State: {state}")
            if state == "WAITING_FOR_FINGER":
                self.live_data['max30102']['status'] = 'detecting'
            elif state == "MEASURING":
                self.live_data['max30102']['status'] = 'measuring'
                self._max30102_measurement_active = True
            elif state == "FINGER_REMOVED":
                self.live_data['max30102']['status'] = 'detecting'
                self.live_data['max30102']['finger_detected'] = False
                self._max30102_measurement_active = False

        # MAX30102 ready message
        elif data.startswith("MAX30102_READY:"):
            message = data.split(":")[1]
            print(f"✅ MAX30102: {message}")
            self.max30102_sensor_ready = True
            self.live_data['max30102']['sensor_prepared'] = True

        # MAX30102 live data (more frequent updates)
        elif data.startswith("MAX30102_LIVE_DATA:"):
            try:
                # Parse: HR=75,SPO2=98,RR=16,VALID_HR=1,VALID_SPO2=1
                parts = data.split(":")[1].split(",")
                data_dict = {}
                for part in parts:
                    key, value = part.split("=")
                    data_dict[key] = value
                
                if 'HR' in data_dict:
                    hr = int(data_dict['HR'])
                    self.live_data['max30102']['heart_rate'] = hr
                    self.measurements['heart_rate'] = hr
                    print(f"💓 Live Heart Rate: {hr} BPM")
                
                if 'SPO2' in data_dict:
                    spo2 = int(data_dict['SPO2'])
                    self.live_data['max30102']['spo2'] = spo2
                    self.measurements['spo2'] = spo2
                    print(f"🩸 Live SpO2: {spo2}%")
                
                if 'RR' in data_dict:
                    rr = float(data_dict['RR'])
                    self.live_data['max30102']['respiratory_rate'] = rr
                    self.measurements['respiratory_rate'] = rr
                    print(f"🌬️ Live Respiratory Rate: {rr} breaths/min")
                    
            except (ValueError, IndexError) as e:
                print(f"Error parsing MAX30102 live data: {e}")

        # MAX30102 measurement completing
        elif data == "MAX30102_MEASUREMENT_COMPLETING":
            print("⏳ MAX30102 measurement completing...")

        # MAX30102 results validity
        elif data == "MAX30102_RESULTS_VALID":
            print("✅ MAX30102 results are valid")
            self._max30102_measurement_active = False
            self.live_data['max30102']['status'] = 'complete'

        elif data == "MAX30102_RESULTS_INVALID":
            print("❌ MAX30102 results are invalid")
            self._max30102_measurement_active = False
            self.live_data['max30102']['status'] = 'error'

        # MAX30102 finger detection
        elif data == "FINGER_DETECTED":
            self.live_data['max30102']['finger_detected'] = True
            print("✅ Finger detected on MAX30102")
            self.live_data['max30102']['status'] = 'measuring'
            self._max30102_measurement_active = True

        elif data == "FINGER_REMOVED":
            self.live_data['max30102']['finger_detected'] = False
            print("⚠️ Finger removed from MAX30102")
            self.live_data['max30102']['status'] = 'detecting'
            self._max30102_measurement_active = False

        # ==================== WEIGHT SENSOR PARSING ====================
        
        # Weight measurement result
        elif data.startswith("RESULT:WEIGHT:"):
            try:
                weight = float(data.split(":")[2])
                self.measurements['weight'] = weight
                self._weight_measurement_active = False
                self.live_data['weight']['current'] = weight
                self.live_data['weight']['progress'] = 100
                self.live_data['weight']['status'] = 'complete'
                print(f"✅ FINAL WEIGHT RESULT: {weight} kg")
            except (IndexError, ValueError) as e:
                print(f"Error parsing weight: {e}")

        # ==================== HEIGHT SENSOR PARSING ====================
        
        # Height measurement result
        elif data.startswith("RESULT:HEIGHT:"):
            try:
                height = float(data.split(":")[2])
                self.measurements['height'] = height
                self._height_measurement_active = False
                self.live_data['height']['current'] = height
                self.live_data['height']['progress'] = 100
                self.live_data['height']['status'] = 'complete'
                print(f"✅ FINAL HEIGHT RESULT: {height} cm")
            except (IndexError, ValueError) as e:
                print(f"Error parsing height: {e}")

        # ==================== TEMPERATURE SENSOR PARSING ====================
        
        # Temperature measurement result
        elif data.startswith("RESULT:TEMPERATURE:"):
            try:
                temperature = float(data.split(":")[2])
                self.measurements['temperature'] = temperature
                self._temperature_measurement_active = False
                self.live_data['temperature']['current'] = temperature
                self.live_data['temperature']['progress'] = 100
                self.live_data['temperature']['status'] = 'complete'
                print(f"✅ FINAL TEMPERATURE RESULT: {temperature} °C")
            except (IndexError, ValueError) as e:
                print(f"Error parsing temperature: {e}")

        # ==================== MAX30102 FINAL RESULTS ====================
        
        # MAX30102 measurement results
        elif data.startswith("RESULT:HEART_RATE:"):
            try:
                heart_rate = int(data.split(":")[2])
                self.measurements['heart_rate'] = heart_rate
                self.live_data['max30102']['heart_rate'] = heart_rate
                print(f"✅ FINAL HEART RATE RESULT: {heart_rate} BPM")
            except (IndexError, ValueError) as e:
                print(f"Error parsing heart rate: {e}")

        elif data.startswith("RESULT:SPO2:"):
            try:
                spo2 = int(data.split(":")[2])
                self.measurements['spo2'] = spo2
                self.live_data['max30102']['spo2'] = spo2
                print(f"✅ FINAL SPO2 RESULT: {spo2}%")
            except (IndexError, ValueError) as e:
                print(f"Error parsing SpO2: {e}")

        elif data.startswith("RESULT:RESPIRATORY_RATE:"):
            try:
                respiratory_rate = float(data.split(":")[2])
                self.measurements['respiratory_rate'] = respiratory_rate
                self.live_data['max30102']['respiratory_rate'] = respiratory_rate
                print(f"✅ FINAL RESPIRATORY RATE RESULT: {respiratory_rate} breaths/min")
            except (IndexError, ValueError) as e:
                print(f"Error parsing respiratory rate: {e}")

        # ==================== PROGRESS UPDATES ====================
        
        # Progress updates for MAX30102
        elif data.startswith("STATUS:MAX30102_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                if len(progress_parts) >= 4:
                    elapsed = int(progress_parts[2].split("/")[0])
                    total = int(progress_parts[2].split("/")[1])
                    progress_percent = int(progress_parts[3])
                    
                    self.live_data['max30102']['elapsed'] = elapsed
                    self.live_data['max30102']['total'] = total
                    self.live_data['max30102']['progress'] = progress_percent
                    self.live_data['max30102']['status'] = 'measuring'
                    
                    print(f"❤️ MAX30102 progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                print(f"Error parsing MAX30102 progress: {e}")

        # Progress updates for weight
        elif data.startswith("STATUS:WEIGHT_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                if len(progress_parts) >= 4:
                    elapsed = int(progress_parts[2].split("/")[0])
                    total = int(progress_parts[2].split("/")[1])
                    progress_percent = int(progress_parts[3])
                    
                    self.live_data['weight']['elapsed'] = elapsed
                    self.live_data['weight']['total'] = total
                    self.live_data['weight']['progress'] = progress_percent
                    self.live_data['weight']['status'] = 'measuring'
                    
                    print(f"⚖️ Weight progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                print(f"Error parsing weight progress: {e}")

        # Progress updates for height
        elif data.startswith("STATUS:HEIGHT_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                if len(progress_parts) >= 4:
                    elapsed = int(progress_parts[2].split("/")[0])
                    total = int(progress_parts[2].split("/")[1])
                    progress_percent = int(progress_parts[3])
                    
                    self.live_data['height']['elapsed'] = elapsed
                    self.live_data['height']['total'] = total
                    self.live_data['height']['progress'] = progress_percent
                    self.live_data['height']['status'] = 'measuring'
                    
                    print(f"📏 Height progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                print(f"Error parsing height progress: {e}")

        # Progress updates for temperature
        elif data.startswith("STATUS:TEMPERATURE_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                if len(progress_parts) >= 4:
                    elapsed = int(progress_parts[2].split("/")[0])
                    total = int(progress_parts[2].split("/")[1])
                    progress_percent = int(progress_parts[3])
                    
                    self.live_data['temperature']['elapsed'] = elapsed
                    self.live_data['temperature']['total'] = total
                    self.live_data['temperature']['progress'] = progress_percent
                    self.live_data['temperature']['status'] = 'measuring'
                    
                    print(f"🌡️ Temperature progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                print(f"Error parsing temperature progress: {e}")

        # ==================== LIVE DATA UPDATES ====================
        
        # Real-time data from MAX30102 (alternative format)
        elif "Heart Rate:" in data and "SpO2:" in data and data.startswith("["):
            try:
                # Parse format: "[Time: 5s] Heart Rate: 75 BPM  SpO2: 98%  RR: 16 breaths/min  (25s remaining)"
                hr_match = re.search(r'Heart Rate:\s*(\d+)', data)
                spo2_match = re.search(r'SpO2:\s*(\d+)', data)
                rr_match = re.search(r'RR:\s*([\d.]+)', data)
                time_match = re.search(r'Time:\s*(\d+)', data)
                
                if hr_match:
                    self.live_data['max30102']['heart_rate'] = int(hr_match.group(1))
                if spo2_match:
                    self.live_data['max30102']['spo2'] = int(spo2_match.group(1))
                if rr_match:
                    self.live_data['max30102']['respiratory_rate'] = float(rr_match.group(1))
                if time_match:
                    self.live_data['max30102']['elapsed'] = int(time_match.group(1))
                    progress_percent = (int(time_match.group(1)) * 100) // 30
                    self.live_data['max30102']['progress'] = progress_percent
                    
            except (ValueError, IndexError) as e:
                print(f"Error parsing MAX30102 real-time data: {e}")

        # Live weight readings during detection/measuring
        elif data.startswith("DEBUG:Weight reading:"):
            try:
                weight_match = re.search(r'Weight reading: ([\d.]+)', data)
                if weight_match:
                    current_weight = float(weight_match.group(1))
                    self.live_data['weight']['current'] = current_weight
                    print(f"⚖️ Live weight: {current_weight} kg")
            except (IndexError, ValueError) as e:
                print(f"Error parsing live weight: {e}")

        # Live height readings
        elif data.startswith("DEBUG:Height reading:"):
            try:
                height_match = re.search(r'Height reading: ([\d.]+)', data)
                if height_match:
                    current_height = float(height_match.group(1))
                    self.live_data['height']['current'] = current_height
                    print(f"📏 Live height: {current_height} cm")
            except (IndexError, ValueError) as e:
                print(f"Error parsing live height: {e}")

        # Live temperature readings
        elif data.startswith("DEBUG:Temperature reading:"):
            try:
                temp_match = re.search(r'Temperature reading: ([\d.]+)', data)
                if temp_match:
                    current_temp = float(temp_match.group(1))
                    self.live_data['temperature']['current'] = current_temp
                    print(f"🌡️ Live temperature: {current_temp} °C")
            except (IndexError, ValueError) as e:
                print(f"Error parsing live temperature: {e}")

        # Valid height detection
        elif data.startswith("DEBUG:Valid height detected:"):
            try:
                height_match = re.search(r'Valid height detected: ([\d.]+)', data)
                if height_match:
                    current_height = float(height_match.group(1))
                    self.live_data['height']['current'] = current_height
                    print(f"✅ Valid height: {current_height} cm")
            except (IndexError, ValueError) as e:
                print(f"Error parsing valid height: {e}")

        # Valid temperature detection
        elif data.startswith("DEBUG:Valid temperature detected:"):
            try:
                temp_match = re.search(r'Valid temperature detected: ([\d.]+)', data)
                if temp_match:
                    current_temp = float(temp_match.group(1))
                    self.live_data['temperature']['current'] = current_temp
                    print(f"✅ Valid temperature: {current_temp} °C")
            except (IndexError, ValueError) as e:
                print(f"Error parsing valid temperature: {e}")

        # ==================== SYSTEM STATUS UPDATES ====================
        
        # System status updates
        elif data.startswith("STATUS:AUTO_TARE_COMPLETE"):
            self.auto_tare_completed = True
            self.weight_sensor_ready = True
            print("✅ Auto-tare completed")

        elif data.startswith("STATUS:WEIGHT_SENSOR_READY"):
            self.weight_sensor_ready = True
            print("✅ Weight sensor ready")

        elif data.startswith("STATUS:TEMPERATURE_SENSOR_INITIALIZED"):
            self.temperature_sensor_ready = True
            print("✅ Temperature sensor initialized")

        # MAX30102 status updates
        elif data.startswith("STATUS:MAX30102_SENSOR_INITIALIZED"):
            self.max30102_sensor_ready = True
            self.live_data['max30102']['sensor_prepared'] = True
            print("✅ MAX30102 sensor initialized")

        elif data.startswith("STATUS:FULL_SYSTEM_INITIALIZATION_COMPLETE"):
            self.full_system_initialized = True
            print("✅ Full system initialization complete")

        # ==================== MEASUREMENT STATUS UPDATES ====================
        
        # Measurement status updates
        elif data.startswith("STATUS:WEIGHT_MEASUREMENT_STARTED"):
            self._weight_measurement_active = True
            self.live_data['weight']['status'] = 'detecting'
            self.live_data['weight']['progress'] = 0
            self.live_data['weight']['elapsed'] = 0
            print("⚖️ Weight measurement started")

        elif data.startswith("STATUS:HEIGHT_MEASUREMENT_STARTED"):
            self._height_measurement_active = True
            self.live_data['height']['status'] = 'detecting'
            self.live_data['height']['progress'] = 0
            self.live_data['height']['elapsed'] = 0
            print("📏 Height measurement started")

        elif data.startswith("STATUS:TEMPERATURE_MEASUREMENT_STARTED"):
            self._temperature_measurement_active = True
            self.live_data['temperature']['status'] = 'detecting'
            self.live_data['temperature']['progress'] = 0
            self.live_data['temperature']['elapsed'] = 0
            print("🌡️ Temperature measurement started")

        # MAX30102 measurement status
        elif data.startswith("STATUS:MAX30102_MEASUREMENT_STARTED"):
            self._max30102_measurement_active = True
            self.live_data['max30102']['status'] = 'detecting'
            self.live_data['max30102']['progress'] = 0
            self.live_data['max30102']['elapsed'] = 0
            print("❤️ MAX30102 measurement started")

        # Real-time measuring states
        elif data.startswith("STATUS:WEIGHT_MEASURING"):
            self.live_data['weight']['status'] = 'measuring'
            print("⚖️ Weight measuring in progress")

        elif data.startswith("STATUS:HEIGHT_MEASURING"):
            self.live_data['height']['status'] = 'measuring'
            print("📏 Height measuring in progress")

        elif data.startswith("STATUS:TEMPERATURE_MEASURING"):
            self.live_data['temperature']['status'] = 'measuring'
            print("🌡️ Temperature measuring in progress")

        # MAX30102 measuring state
        elif data.startswith("STATUS:MAX30102_MEASURING"):
            self.live_data['max30102']['status'] = 'measuring'
            print("❤️ MAX30102 measuring in progress")

        elif data.startswith("STATUS:WEIGHT_MEASUREMENT_COMPLETE"):
            self._weight_measurement_active = False
            if self.live_data['weight']['status'] != 'complete':
                self.live_data['weight']['status'] = 'complete'
            print("✅ Weight measurement complete")

        elif data.startswith("STATUS:HEIGHT_MEASUREMENT_COMPLETE"):
            self._height_measurement_active = False
            if self.live_data['height']['status'] != 'complete':
                self.live_data['height']['status'] = 'complete'
            print("✅ Height measurement complete")

        elif data.startswith("STATUS:TEMPERATURE_MEASUREMENT_COMPLETE"):
            self._temperature_measurement_active = False
            if self.live_data['temperature']['status'] != 'complete':
                self.live_data['temperature']['status'] = 'complete'
            print("✅ Temperature measurement complete")

        # MAX30102 measurement complete
        elif data.startswith("STATUS:MAX30102_MEASUREMENT_COMPLETE"):
            self._max30102_measurement_active = False
            if self.live_data['max30102']['status'] != 'complete':
                self.live_data['max30102']['status'] = 'complete'
            print("✅ MAX30102 measurement complete")

        # ==================== FINAL RESULT DISPLAY ====================
        
        # Final result display
        elif data.startswith("FINAL_RESULT:"):
            print(f"📊 {data}")

        # ==================== ERROR HANDLING ====================
        
        # Error handling
        elif data.startswith("ERROR:"):
            print(f"❌ {data}")

        elif data.startswith("WARNING:"):
            print(f"⚠️ {data}")

        # Command received
        elif data.startswith("COMMAND_RECEIVED:"):
            print(f"📨 {data}")

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
            "temperature_sensor_ready": self.temperature_sensor_ready,
            "max30102_sensor_ready": self.max30102_sensor_ready,
            "auto_tare_completed": self.auto_tare_completed,
            "measurements": self.measurements,
            "live_data": self.live_data
        }

    def get_system_status(self):
        """Get detailed system status"""
        if not self.is_connected:
            return {
                "connected": False,
                "connection_established": False,
                "sensors_ready": {
                    "weight": False,
                    "height": False,
                    "temperature": False,
                    "max30102": False
                },
                "auto_tare_completed": False,
                "system_mode": "DISCONNECTED"
            }

        return {
            "connected": self.is_connected,
            "connection_established": True,
            "sensors_ready": {
                "weight": self.weight_sensor_ready,
                "height": True,  # Height sensor is always ready when connected
                "temperature": self.temperature_sensor_ready,
                "max30102": self.max30102_sensor_ready
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
            'height': None,
            'temperature': None,
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None
        }
        # Reset live data
        self.live_data = {
            'weight': {
                'current': None,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 3
            },
            'height': {
                'current': None,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 2
            },
            'temperature': {
                'current': None,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 2,
                'ready_threshold': 34.0
            },
            'max30102': {
                'heart_rate': None,
                'spo2': None,
                'respiratory_rate': None,
                'finger_detected': False,
                'progress': 0,
                'status': 'idle',
                'elapsed': 0,
                'total': 30,
                'sensor_prepared': self.live_data['max30102']['sensor_prepared']
            }
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

    # ==================== INDIVIDUAL SENSOR CONTROL METHODS ====================
    
    def start_weight_measurement(self):
        """Start weight measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_WEIGHT\n".encode())
            self._weight_measurement_active = True
            # Reset live data for new measurement
            self.live_data['weight'] = {
                'current': None,
                'progress': 0,
                'status': 'detecting',
                'elapsed': 0,
                'total': 3
            }
            # Clear previous measurement
            self.measurements['weight'] = None
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

    def start_height_measurement(self):
        """Start height measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_HEIGHT\n".encode())
            self._height_measurement_active = True
            # Reset live data for new measurement
            self.live_data['height'] = {
                'current': None,
                'progress': 0,
                'status': 'detecting',
                'elapsed': 0,
                'total': 2
            }
            # Clear previous measurement
            self.measurements['height'] = None
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

    def start_temperature_measurement(self):
        """Start temperature measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_TEMPERATURE\n".encode())
            self._temperature_measurement_active = True
            # Reset live data for new measurement
            self.live_data['temperature'] = {
                'current': None,
                'progress': 0,
                'status': 'detecting',
                'elapsed': 0,
                'total': 2,
                'ready_threshold': 34.0
            }
            # Clear previous measurement
            self.measurements['temperature'] = None
            return {"status": "success", "message": "Temperature measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start temperature measurement: {str(e)}"}

    def prepare_temperature_sensor(self):
        """Prepare temperature sensor for measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_TEMPERATURE\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Temperature sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare temperature sensor: {str(e)}"}

    # MAX30102 sensor methods
    def start_max30102_measurement(self):
        """Start MAX30102 measurement (heart rate, SpO2, respiratory rate)"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_MAX30102\n".encode())
            self._max30102_measurement_active = True
            # Reset live data for new measurement
            self.live_data['max30102'] = {
                'heart_rate': None,
                'spo2': None,
                'respiratory_rate': None,
                'finger_detected': False,
                'progress': 0,
                'status': 'detecting',
                'elapsed': 0,
                'total': 30,
                'sensor_prepared': self.live_data['max30102']['sensor_prepared']
            }
            # Clear previous measurements
            self.measurements['heart_rate'] = None
            self.measurements['spo2'] = None
            self.measurements['respiratory_rate'] = None
            return {"status": "success", "message": "MAX30102 measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start MAX30102 measurement: {str(e)}"}

    def prepare_max30102_sensor(self):
        """Prepare MAX30102 sensor for measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_MAX30102\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "MAX30102 sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare MAX30102 sensor: {str(e)}"}

    def shutdown_weight(self):
        """Shutdown weight sensor"""
        self._weight_measurement_active = False
        self.live_data['weight']['status'] = 'idle'
        self._power_down_sensor("weight")
        return {"status": "powered_down"}

    def get_weight_status(self):
        """Get weight sensor status"""
        status = {
            "status": "unknown",
            "measurement_active": self._weight_measurement_active,
            "weight": self.measurements.get('weight'),
            "live_data": self.live_data['weight'],
            "message": "Weight sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        elif not self.weight_sensor_ready:
            status.update({"status": "not_ready", "message": "Weight sensor not initialized"})
        else:
            status.update({"status": "ready", "message": "Weight sensor ready"})
            
        return status

    def shutdown_height(self):
        """Shutdown height sensor"""
        self._height_measurement_active = False
        self.live_data['height']['status'] = 'idle'
        self._power_down_sensor("height")
        return {"status": "powered_down"}

    def get_height_status(self):
        """Get height sensor status"""
        status = {
            "status": "unknown",
            "measurement_active": self._height_measurement_active,
            "height": self.measurements.get('height'),
            "live_data": self.live_data['height'],
            "message": "Height sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        else:
            status.update({"status": "ready", "message": "Height sensor ready"})
            
        return status

    def shutdown_temperature(self):
        """Shutdown temperature sensor"""
        self._temperature_measurement_active = False
        self.live_data['temperature']['status'] = 'idle'
        self._power_down_sensor("temperature")
        return {"status": "powered_down"}

    def get_temperature_status(self):
        """Get temperature sensor status"""
        status = {
            "status": "unknown",
            "measurement_active": self._temperature_measurement_active,
            "temperature": self.measurements.get('temperature'),
            "live_temperature": self.live_data['temperature']['current'],
            "live_data": self.live_data['temperature'],
            "ready_threshold": 34.0,
            "sensor_prepared": self.temperature_sensor_ready,
            "is_ready_for_measurement": self.temperature_sensor_ready,
            "message": "Temperature sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        elif not self.temperature_sensor_ready:
            status.update({"status": "not_ready", "message": "Temperature sensor not initialized"})
        else:
            status.update({"status": "ready", "message": "Temperature sensor ready"})
            
        return status

    # MAX30102 status method
    def get_max30102_status(self):
        """Get MAX30102 sensor status"""
        status = {
            "status": "unknown",
            "measurement_active": self._max30102_measurement_active,
            "heart_rate": self.live_data['max30102']['heart_rate'],
            "spo2": self.live_data['max30102']['spo2'],
            "respiratory_rate": self.live_data['max30102']['respiratory_rate'],
            "finger_detected": self.live_data['max30102']['finger_detected'],
            "progress": self.live_data['max30102']['progress'],
            "status": self.live_data['max30102']['status'],
            "elapsed": self.live_data['max30102']['elapsed'],
            "total_time": self.live_data['max30102']['total'],
            "sensor_prepared": self.live_data['max30102']['sensor_prepared'],
            "final_results": {
                "heart_rate": self.measurements['heart_rate'],
                "spo2": self.measurements['spo2'],
                "respiratory_rate": self.measurements['respiratory_rate']
            },
            "message": "MAX30102 sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        elif not self.max30102_sensor_ready:
            status.update({"status": "not_ready", "message": "MAX30102 sensor not initialized"})
        else:
            status.update({"status": self.live_data['max30102']['status'], "message": "MAX30102 sensor ready"})
            
        return status

    def shutdown_max30102(self):
        """Shutdown MAX30102 sensor"""
        self._max30102_measurement_active = False
        self.live_data['max30102']['status'] = 'idle'
        self._power_down_sensor("max30102")
        return {"status": "powered_down"}

    def _power_down_sensor(self, sensor_type):
        """Power down specific sensor"""
        if not self.is_connected:
            return
        
        try:
            if sensor_type == "weight":
                self.serial_conn.write("POWER_DOWN_WEIGHT\n".encode())
            elif sensor_type == "height":
                self.serial_conn.write("POWER_DOWN_HEIGHT\n".encode())
            elif sensor_type == "temperature":
                self.serial_conn.write("POWER_DOWN_TEMPERATURE\n".encode())
            elif sensor_type == "max30102":
                self.serial_conn.write("POWER_DOWN_MAX30102\n".encode())
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
            self._temperature_measurement_active = False
            self._max30102_measurement_active = False
            self.live_data['weight']['status'] = 'idle'
            self.live_data['height']['status'] = 'idle'
            self.live_data['temperature']['status'] = 'idle'
            self.live_data['max30102']['status'] = 'idle'
        except Exception as e:
            print(f"Error shutting down sensors: {e}")