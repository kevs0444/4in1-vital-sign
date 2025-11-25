import serial
import time
import threading
from serial.tools import list_ports
import re
import logging

# Configure logger
logger = logging.getLogger(__name__)

class SensorManager:
    def __init__(self):
        self.serial_conn = None
        self.is_connected = False
        self.port = None
        self.baudrate = 9600
        
        # Sensor status flags
        self.weight_sensor_ready = False
        self.height_sensor_ready = False
        self.temperature_sensor_ready = False
        self.max30102_sensor_ready = False
        self.auto_tare_completed = False
        self.full_system_initialized = False
        
        # Measurement results
        self.measurements = {
            'weight': None,
            'height': None,
            'temperature': None,
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None
        }
        
        # Real-time data
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
                'total': 2
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
                'ir_value': 0,
                'sensor_prepared': False,
                'measurement_started': False,
                'final_result_shown': False
            }
        }
        
        # Measurement activity flags
        self._weight_measurement_active = False
        self._height_measurement_active = False
        self._temperature_measurement_active = False
        self._max30102_measurement_active = False
        
        # Threading
        self._listener_thread = None
        self._stop_listener = False

    def connect(self):
        """Connect to Arduino and initialize"""
        try:
            arduino_port = self._find_arduino_port()
            if not arduino_port:
                print("❌ Arduino port not found")
                return False, "Arduino port not found"

            self.port = arduino_port
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1,
                write_timeout=1
            )

            # Wait for Arduino reset
            print("⏳ Waiting for auto-tare completion...")
            logger.info("SYSTEM: Waiting for auto-tare completion...")
            time.sleep(3)
            
            if self.auto_tare_completed:
                print("✅ Auto-tare completed successfully")
            else:
                print("⚠️ Auto-tare status not received yet (might be delayed)")
            
            self.is_connected = True
            self._start_data_listener()
            
            logger.info(f"SUCCESS: Connected to {self.port}")
            print("\n" + "="*40)
            print(f"✅ ARDUINO: CONNECTED TO {self.port}")
            print("="*40 + "\n")
            
            return True, f"Connected to {self.port}"

        except Exception as e:
            logger.error(f"Connection error: {e}")
            print(f"❌ Connection error: {e}")
            self.is_connected = False
            return False, f"Connection failed: {str(e)}"

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
        """Listen for incoming serial data"""
        while not self._stop_listener and self.is_connected:
            try:
                if self.serial_conn and self.serial_conn.in_waiting:
                    line = self.serial_conn.readline().decode('utf-8', errors='ignore').strip()
                    if line:
                        self._parse_serial_data(line)
                time.sleep(0.01)
            except Exception as e:
                logger.error(f"Serial listener error: {e}")
                time.sleep(0.1)

    def _parse_serial_data(self, data):
        """Parse incoming serial data"""
        logger.info(f"ARDUINO: {data}")

        # ==================== SYSTEM STATUS ====================
        if data.startswith("STATUS:"):
            status_type = data[7:]
            
            if "AUTO_TARE_COMPLETE" in status_type:
                self.auto_tare_completed = True
                self.weight_sensor_ready = True
                logger.info("✅ Auto-tare completed")
                print("\n" + "="*40)
                print("✅ ARDUINO: AUTO TARE COMPLETED")
                print("="*40 + "\n")
                
            elif "WEIGHT_SENSOR_READY" in status_type:
                self.weight_sensor_ready = True
                logger.info("✅ Weight sensor ready")
                print("✅ ARDUINO: WEIGHT SENSOR READY")
                
            elif "MAX30102_SENSOR_INITIALIZED" in status_type:
                self.max30102_sensor_ready = True
                self.live_data['max30102']['sensor_prepared'] = True
                logger.info("✅ MAX30102 sensor initialized")
                
            elif "FULL_SYSTEM_INITIALIZATION_COMPLETE" in status_type:
                self.full_system_initialized = True
                logger.info("✅ Full system initialized")

        # ==================== MEASUREMENT RESULTS ====================
        elif data.startswith("RESULT:WEIGHT:"):
            try:
                weight = float(data.split(":")[2])
                self.measurements['weight'] = weight
                self.live_data['weight']['current'] = weight
                self.live_data['weight']['progress'] = 100
                self.live_data['weight']['status'] = 'complete'
                logger.info(f"✅ Weight result: {weight} kg")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing weight: {e}")

        elif data.startswith("RESULT:HEIGHT:"):
            try:
                height = float(data.split(":")[2])
                self.measurements['height'] = height
                self.live_data['height']['current'] = height
                self.live_data['height']['progress'] = 100
                self.live_data['height']['status'] = 'complete'
                logger.info(f"✅ Height result: {height} cm")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing height: {e}")

        elif data.startswith("RESULT:TEMPERATURE:"):
            try:
                temperature = float(data.split(":")[2])
                self.measurements['temperature'] = temperature
                self.live_data['temperature']['current'] = temperature
                self.live_data['temperature']['progress'] = 100
                self.live_data['temperature']['status'] = 'complete'
                logger.info(f"✅ Temperature result: {temperature} °C")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing temperature: {e}")

        elif data.startswith("RESULT:HEART_RATE:"):
            try:
                heart_rate = int(data.split(":")[2])
                self.measurements['heart_rate'] = heart_rate
                self.live_data['max30102']['heart_rate'] = heart_rate
                logger.info(f"✅ Heart rate result: {heart_rate} BPM")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing heart rate: {e}")

        elif data.startswith("RESULT:SPO2:"):
            try:
                spo2 = int(data.split(":")[2])
                self.measurements['spo2'] = spo2
                self.live_data['max30102']['spo2'] = spo2
                logger.info(f"✅ SpO2 result: {spo2}%")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing SpO2: {e}")

        elif data.startswith("RESULT:RESPIRATORY_RATE:"):
            try:
                respiratory_rate = float(data.split(":")[2])
                self.measurements['respiratory_rate'] = respiratory_rate
                self.live_data['max30102']['respiratory_rate'] = respiratory_rate
                logger.info(f"✅ Respiratory rate result: {respiratory_rate} breaths/min")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing respiratory rate: {e}")

        # ==================== MAX30102 SPECIFIC ====================
        elif data.startswith("MAX30102_IR_VALUE:"):
            try:
                ir_value = int(data.split(":")[1])
                self.live_data['max30102']['ir_value'] = ir_value
                # Don't print every IR value to avoid spam
            except ValueError:
                pass

        elif data == "FINGER_DETECTED":
            self.live_data['max30102']['finger_detected'] = True
            self.live_data['max30102']['measurement_started'] = True
            self._max30102_measurement_active = True
            logger.info("✅ Finger detected - Automatic measurement starting")

        elif data == "FINGER_REMOVED":
            self.live_data['max30102']['finger_detected'] = False
            self.live_data['max30102']['measurement_started'] = False
            self._max30102_measurement_active = False
            logger.info("⚠️ Finger removed - Measurement stopped")

        elif data.startswith("MAX30102_LIVE_DATA:"):
            try:
                parts = data.split(":")[1].split(",")
                data_dict = {}
                for part in parts:
                    key, value = part.split("=")
                    data_dict[key] = value
                
                if 'HR' in data_dict and data_dict['HR'] != '0':
                    hr = int(data_dict['HR'])
                    self.live_data['max30102']['heart_rate'] = hr
                    logger.info(f"💓 Live Heart Rate: {hr} BPM")
                
                if 'SPO2' in data_dict and data_dict['SPO2'] != '0':
                    spo2 = int(data_dict['SPO2'])
                    self.live_data['max30102']['spo2'] = spo2
                    logger.info(f"🩸 Live SpO2: {spo2}%")
                
                if 'RR' in data_dict and data_dict['RR'] != '0':
                    rr = float(data_dict['RR'])
                    self.live_data['max30102']['respiratory_rate'] = rr
                    logger.info(f"🌬️ Live Respiratory Rate: {rr} breaths/min")
                    
            except (ValueError, IndexError) as e:
                logger.error(f"Error parsing MAX30102 live data: {e}")

        elif data == "MAX30102_RESULTS_VALID":
            logger.info("✅ MAX30102 results are valid")
            self._max30102_measurement_active = False
            self.live_data['max30102']['status'] = 'complete'
            self.live_data['max30102']['final_result_shown'] = True

        elif data == "MAX30102_RESULTS_INVALID":
            logger.info("❌ MAX30102 results are invalid")
            self._max30102_measurement_active = False
            self.live_data['max30102']['status'] = 'error'

        # ==================== PROGRESS UPDATES ====================
        elif data.startswith("STATUS:WEIGHT_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                elapsed = int(progress_parts[2].split("/")[0])
                total = int(progress_parts[2].split("/")[1])
                progress_percent = int(progress_parts[3])
                
                self.live_data['weight']['elapsed'] = elapsed
                self.live_data['weight']['total'] = total
                self.live_data['weight']['progress'] = progress_percent
                self.live_data['weight']['status'] = 'measuring'
                
                logger.info(f"⚖️ Weight progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing weight progress: {e}")

        elif data.startswith("STATUS:HEIGHT_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                elapsed = int(progress_parts[2].split("/")[0])
                total = int(progress_parts[2].split("/")[1])
                progress_percent = int(progress_parts[3])
                
                self.live_data['height']['elapsed'] = elapsed
                self.live_data['height']['total'] = total
                self.live_data['height']['progress'] = progress_percent
                self.live_data['height']['status'] = 'measuring'
                
                logger.info(f"📏 Height progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing height progress: {e}")

        elif data.startswith("STATUS:TEMPERATURE_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                elapsed = int(progress_parts[2].split("/")[0])
                total = int(progress_parts[2].split("/")[1])
                progress_percent = int(progress_parts[3])
                
                self.live_data['temperature']['elapsed'] = elapsed
                self.live_data['temperature']['total'] = total
                self.live_data['temperature']['progress'] = progress_percent
                self.live_data['temperature']['status'] = 'measuring'
                
                logger.info(f"🌡️ Temperature progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing temperature progress: {e}")

        elif data.startswith("STATUS:MAX30102_PROGRESS:"):
            try:
                progress_parts = data.split(":")
                elapsed = int(progress_parts[2].split("/")[0])
                total = int(progress_parts[2].split("/")[1])
                progress_percent = int(progress_parts[3])
                
                self.live_data['max30102']['elapsed'] = elapsed
                self.live_data['max30102']['total'] = total
                self.live_data['max30102']['progress'] = progress_percent
                self.live_data['max30102']['status'] = 'measuring'
                
                logger.info(f"❤️ MAX30102 progress: {elapsed}/{total}s ({progress_percent}%)")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing MAX30102 progress: {e}")

        # ==================== MEASUREMENT STATUS ====================
        elif data.startswith("STATUS:WEIGHT_MEASUREMENT_STARTED"):
            self._weight_measurement_active = True
            self.live_data['weight']['status'] = 'detecting'
            self.live_data['weight']['progress'] = 0
            self.live_data['weight']['elapsed'] = 0
            logger.info("⚖️ Weight measurement started")

        elif data.startswith("STATUS:HEIGHT_MEASUREMENT_STARTED"):
            self._height_measurement_active = True
            self.live_data['height']['status'] = 'detecting'
            self.live_data['height']['progress'] = 0
            self.live_data['height']['elapsed'] = 0
            logger.info("📏 Height measurement started")

        elif data.startswith("STATUS:TEMPERATURE_MEASUREMENT_STARTED"):
            self._temperature_measurement_active = True
            self.live_data['temperature']['status'] = 'detecting'
            self.live_data['temperature']['progress'] = 0
            self.live_data['temperature']['elapsed'] = 0
            logger.info("🌡️ Temperature measurement started")

        elif data.startswith("STATUS:MAX30102_MEASUREMENT_STARTED"):
            self._max30102_measurement_active = True
            self.live_data['max30102']['status'] = 'detecting'
            self.live_data['max30102']['progress'] = 0
            self.live_data['max30102']['elapsed'] = 0
            self.live_data['max30102']['measurement_started'] = True
            logger.info("❤️ MAX30102 measurement started")

        elif data.startswith("STATUS:WEIGHT_MEASUREMENT_COMPLETE"):
            self._weight_measurement_active = False
            if self.live_data['weight']['status'] != 'complete':
                self.live_data['weight']['status'] = 'complete'
            logger.info("✅ Weight measurement complete")

        elif data.startswith("STATUS:HEIGHT_MEASUREMENT_COMPLETE"):
            self._height_measurement_active = False
            if self.live_data['height']['status'] != 'complete':
                self.live_data['height']['status'] = 'complete'
            logger.info("✅ Height measurement complete")

        elif data.startswith("STATUS:TEMPERATURE_MEASUREMENT_COMPLETE"):
            self._temperature_measurement_active = False
            if self.live_data['temperature']['status'] != 'complete':
                self.live_data['temperature']['status'] = 'complete'
            logger.info("✅ Temperature measurement complete")

        elif data.startswith("STATUS:MAX30102_MEASUREMENT_COMPLETE"):
            self._max30102_measurement_active = False
            if self.live_data['max30102']['status'] != 'complete':
                self.live_data['max30102']['status'] = 'complete'
            logger.info("✅ MAX30102 measurement complete")

        # ==================== LIVE DATA ====================
        elif data.startswith("DEBUG:Weight reading:"):
            try:
                weight_match = re.search(r'Weight reading: ([\d.]+)', data)
                if weight_match:
                    current_weight = float(weight_match.group(1))
                    self.live_data['weight']['current'] = current_weight
                    logger.info(f"⚖️ Live weight: {current_weight} kg")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing live weight: {e}")

        elif data.startswith("DEBUG:Height reading:"):
            try:
                height_match = re.search(r'Height reading: ([\d.]+)', data)
                if height_match:
                    current_height = float(height_match.group(1))
                    self.live_data['height']['current'] = current_height
                    logger.info(f"📏 Live height: {current_height} cm")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing live height: {e}")

        elif data.startswith("DEBUG:Temperature reading:"):
            try:
                temp_match = re.search(r'Temperature reading: ([\d.]+)', data)
                if temp_match:
                    current_temp = float(temp_match.group(1))
                    self.live_data['temperature']['current'] = current_temp
                    logger.info(f"🌡️ Live temperature: {current_temp} °C")
            except (IndexError, ValueError) as e:
                logger.error(f"Error parsing live temperature: {e}")

        # ==================== ERROR HANDLING ====================
        elif data.startswith("ERROR:"):
            logger.error(f"❌ {data}")

        elif data.startswith("WARNING:"):
            logger.warning(f"⚠️ {data}")

    def disconnect(self):
        """Disconnect from Arduino"""
        try:
            self._stop_listener = True
            if self._listener_thread:
                self._listener_thread.join(timeout=1)
            
            if self.serial_conn and self.serial_conn.is_open:
                self.serial_conn.write("SHUTDOWN_ALL\n".encode())
                time.sleep(1)
                self.serial_conn.close()
                
            self.is_connected = False
            self.port = None
            logger.info("Disconnected from Arduino")
            return True, "Disconnected successfully"
            
        except Exception as e:
            logger.error(f"Error during disconnect: {e}")
            return False, f"Disconnect failed: {str(e)}"

    # ==================== PUBLIC METHODS ====================
    
    def get_system_status(self):
        """Get system status"""
        return {
            "connected": self.is_connected,
            "connection_established": self.is_connected,
            "sensors_ready": {
                "weight": self.weight_sensor_ready,
                "height": True,  # Height sensor is always ready when connected
                "temperature": self.temperature_sensor_ready,
                "max30102": self.max30102_sensor_ready
            },
            "auto_tare_completed": self.auto_tare_completed,
            "system_mode": "FULLY_INITIALIZED" if self.auto_tare_completed else "BASIC"
        }

    def get_measurements(self):
        """Get all measurements"""
        return self.measurements

    def reset_measurements(self):
        """Reset all measurements"""
        self.measurements = {
            'weight': None,
            'height': None,
            'temperature': None,
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None
        }
        
        # Reset live data but keep sensor prepared status
        sensor_prepared = self.live_data['max30102']['sensor_prepared']
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
                'total': 2
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
                'ir_value': 0,
                'sensor_prepared': sensor_prepared,
                'measurement_started': False,
                'final_result_shown': False
            }
        }
        
        return {"status": "success", "message": "Measurements reset"}

    def start_weight_measurement(self):
        """Start weight measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_WEIGHT\n".encode())
            return {"status": "success", "message": "Weight measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start weight measurement: {str(e)}"}

    def start_height_measurement(self):
        """Start height measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_HEIGHT\n".encode())
            return {"status": "success", "message": "Height measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start height measurement: {str(e)}"}

    def start_temperature_measurement(self):
        """Start temperature measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_TEMPERATURE\n".encode())
            return {"status": "success", "message": "Temperature measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start temperature measurement: {str(e)}"}

    def start_max30102_measurement(self):
        """Start MAX30102 measurement"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("START_MAX30102\n".encode())
            return {"status": "success", "message": "MAX30102 measurement started"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to start MAX30102 measurement: {str(e)}"}

    def prepare_max30102_sensor(self):
        """Prepare MAX30102 sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_MAX30102\n".encode())
            time.sleep(2)  # Wait for sensor to initialize
            return {"status": "success", "message": "MAX30102 sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare MAX30102 sensor: {str(e)}"}

    def get_max30102_status(self):
        """Get MAX30102 sensor status"""
        status = {
            "status": self.live_data['max30102']['status'],
            "measurement_active": self._max30102_measurement_active,
            "heart_rate": self.live_data['max30102']['heart_rate'],
            "spo2": self.live_data['max30102']['spo2'],
            "respiratory_rate": self.live_data['max30102']['respiratory_rate'],
            "finger_detected": self.live_data['max30102']['finger_detected'],
            "progress": self.live_data['max30102']['progress'],
            "elapsed": self.live_data['max30102']['elapsed'],
            "total_time": self.live_data['max30102']['total'],
            "ir_value": self.live_data['max30102']['ir_value'],
            "sensor_prepared": self.live_data['max30102']['sensor_prepared'],
            "measurement_started": self.live_data['max30102']['measurement_started'],
            "final_result_shown": self.live_data['max30102']['final_result_shown'],
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
            
        return status

    def shutdown_all_sensors(self):
        """Shutdown all sensors"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("SHUTDOWN_ALL\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "All sensors shutdown"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to shutdown sensors: {str(e)}"}

    # ==================== ADDITIONAL SENSOR METHODS ====================
    
    def prepare_weight_sensor(self):
        """Prepare weight sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_WEIGHT\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Weight sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare weight sensor: {str(e)}"}

    def shutdown_weight_sensor(self):
        """Shutdown weight sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_DOWN_WEIGHT\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Weight sensor shutdown"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to shutdown weight sensor: {str(e)}"}

    def get_weight_status(self):
        """Get weight sensor status"""
        status = {
            "status": self.live_data['weight']['status'],
            "measurement_active": self._weight_measurement_active,
            "weight": self.measurements['weight'],
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

    def prepare_height_sensor(self):
        """Prepare height sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_HEIGHT\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Height sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare height sensor: {str(e)}"}

    def shutdown_height_sensor(self):
        """Shutdown height sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_DOWN_HEIGHT\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Height sensor shutdown"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to shutdown height sensor: {str(e)}"}

    def get_height_status(self):
        """Get height sensor status"""
        status = {
            "status": self.live_data['height']['status'],
            "measurement_active": self._height_measurement_active,
            "height": self.measurements['height'],
            "live_data": self.live_data['height'],
            "message": "Height sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        else:
            status.update({"status": "ready", "message": "Height sensor ready"})
            
        return status

    def prepare_temperature_sensor(self):
        """Prepare temperature sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_UP_TEMPERATURE\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Temperature sensor prepared"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to prepare temperature sensor: {str(e)}"}

    def shutdown_temperature_sensor(self):
        """Shutdown temperature sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_DOWN_TEMPERATURE\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "Temperature sensor shutdown"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to shutdown temperature sensor: {str(e)}"}

    def get_temperature_status(self):
        """Get temperature sensor status"""
        status = {
            "status": self.live_data['temperature']['status'],
            "measurement_active": self._temperature_measurement_active,
            "temperature": self.measurements['temperature'],
            "live_temperature": self.live_data['temperature']['current'],
            "live_data": self.live_data['temperature'],
            "sensor_prepared": self.temperature_sensor_ready,
            "message": "Temperature sensor status"
        }
        
        if not self.is_connected:
            status.update({"status": "disconnected", "message": "Not connected to Arduino"})
        elif not self.temperature_sensor_ready:
            status.update({"status": "not_ready", "message": "Temperature sensor not initialized"})
        else:
            status.update({"status": "ready", "message": "Temperature sensor ready"})
            
        return status

    def shutdown_max30102_sensor(self):
        """Shutdown MAX30102 sensor"""
        if not self.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
        
        try:
            self.serial_conn.write("POWER_DOWN_MAX30102\n".encode())
            time.sleep(1)
            return {"status": "success", "message": "MAX30102 sensor shutdown"}
        except Exception as e:
            return {"status": "error", "message": f"Failed to shutdown MAX30102 sensor: {str(e)}"}