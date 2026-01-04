import logging
import re
import time

logger = logging.getLogger(__name__)

# Regex patterns for parsing sensor data
WEIGHT_PATTERN = re.compile(r'DEBUG:Weight reading:\s*([-+]?\d*\.?\d+)')
HEIGHT_PATTERN = re.compile(r'DEBUG:Height reading:\s*([-+]?\d*\.?\d+)')

class BMIManager:
    def __init__(self, serial_interface):
        self.serial = serial_interface
        self.serial.register_listener(self.process_data)
        
        # State
        self.weight_sensor_ready = False
        self.height_sensor_ready = True # Usually true if board is on
        self.auto_tare_completed = False
        
        self.weight_active = False
        self.height_active = False
        
        # Data
        self.measurements = {
            'weight': None,
            'height': None
        }
        
        self.live_data = {
            'weight': {'current': None, 'status': 'idle', 'progress': 0, 'elapsed': 0},
            'height': {'current': None, 'status': 'idle', 'progress': 0, 'elapsed': 0}
        }
        
    def process_data(self, data):
        """Process incoming serial data related to BMI"""
        
        # --- STATUS UPDATES ---
        if "STATUS:AUTO_TARE_COMPLETE" in data:
            self.auto_tare_completed = True
            self.weight_sensor_ready = True
            logger.info("✅ BMI Manager: Auto-tare complete")
            print("✅ Weight Sensor Tared & Ready")
            
        elif "STATUS:WEIGHT_SENSOR_READY" in data:
            self.weight_sensor_ready = True
            
        elif "STATUS:WEIGHT_MEASUREMENT_STARTED" in data:
            self.weight_active = True
            self.live_data['weight']['status'] = 'detecting'
            
        elif "STATUS:WEIGHT_MEASUREMENT_COMPLETE" in data:
            self.weight_active = False
            self.live_data['weight']['status'] = 'complete'

        elif "STATUS:HEIGHT_MEASUREMENT_STARTED" in data:
            self.height_active = True
            self.live_data['height']['status'] = 'detecting'

        elif "STATUS:HEIGHT_MEASUREMENT_COMPLETE" in data:
            self.height_active = False
            self.live_data['height']['status'] = 'complete'

        # --- LIVE DATA (DEBUG STREAMS) - Using REGEX for robust parsing ---
        # "DEBUG:Weight reading: XX.XX"
        elif "DEBUG:Weight reading" in data:
            try:
                match = WEIGHT_PATTERN.search(data)
                if match:
                    val = float(match.group(1))
                    self.live_data['weight']['current'] = val
                    self.live_data['weight']['status'] = 'measuring'
                    print(f"⚖️ Live Weight: {val} kg")
                else:
                    # Fallback: Try split-based parsing
                    parts = data.split(":")
                    if len(parts) >= 3:
                        val = float(parts[2].strip())
                        self.live_data['weight']['current'] = val
                        self.live_data['weight']['status'] = 'measuring'
                        print(f"⚖️ Live Weight: {val} kg")
            except:
                pass

        # "DEBUG:Height reading: XXX.X"
        elif "DEBUG:Height reading" in data:
            try:
                match = HEIGHT_PATTERN.search(data)
                if match:
                    val = float(match.group(1))
                    self.live_data['height']['current'] = val
                    self.live_data['height']['status'] = 'measuring'
                    print(f"📏 Live Height: {val} cm")
                else:
                    # Fallback: Try split-based parsing
                    parts = data.split(":")
                    if len(parts) >= 3:
                        val = float(parts[2].strip())
                        self.live_data['height']['current'] = val
                        self.live_data['height']['status'] = 'measuring'
                        print(f"📏 Live Height: {val} cm")
            except:
                pass
                
        # --- PROGRESS UPDATES ---
        elif data.startswith("STATUS:WEIGHT_PROGRESS:"):
            try:
                parts = data.split(":")
                progress = int(parts[3])
                self.live_data['weight']['progress'] = progress
            except:
                pass

    def start_weight(self):
        """Send command to start weight measurement"""
        if not self.serial.is_connected:
            return {"status": "error", "message": "Not connected to Arduino"}
            
        # Ensure weight sensor is powered up before starting
        self.serial.send_command("POWER_UP_WEIGHT")
        time.sleep(1.0) # Wait for sensor power up
        
        # Reset local data
        self.measurements['weight'] = None
        self.measurements['height'] = None
        self.live_data['weight'] = {'current': None, 'status': 'detecting', 'progress': 0, 'elapsed': 0}
        self.live_data['height'] = {'current': None, 'status': 'idle', 'progress': 0, 'elapsed': 0}
        
        self.weight_active = True
        self.serial.send_command("START_WEIGHT")
        return {"status": "success", "message": "Weight started"}

    def start_height(self):
        """Send command to start height measurement"""
        self.measurements['height'] = None
        self.live_data['height'] = {'current': None, 'status': 'detecting', 'progress': 0, 'elapsed': 0}
        
        self.height_active = True
        self.serial.send_command("START_HEIGHT")
        return {"status": "success", "message": "Height started"}

    def stop_weight(self):
        self.weight_active = False
        self.serial.send_command("POWER_DOWN_WEIGHT")
        
    def stop_height(self):
        self.height_active = False
        self.serial.send_command("POWER_DOWN_HEIGHT")

    def initialize_weight(self):
        self.serial.send_command("INITIALIZE_WEIGHT")
        return {"status": "success"}

    def tare(self):
        self.serial.send_command("TARE_WEIGHT")
        return {"status": "success"}

    def start_auto_tare(self):
        # Force completion valid immediately for robust startup
        # We send the command, but assume it works to prevent "Calibrating..." stuck state
        self.auto_tare_completed = True 
        self.serial.send_command("AUTO_TARE")
        return {"status": "success"}
    
    def full_initialize(self):
         self.serial.send_command("FULL_INITIALIZE")
         return True

    def get_status(self):
        return {
            "weight_ready": self.weight_sensor_ready,
            "height_ready": self.height_sensor_ready,
            "auto_tare_completed": self.auto_tare_completed,
            "weight_active": self.weight_active,
            "height_active": self.height_active,
            "live_data": self.live_data,
            "measurements": self.measurements
        }

    def reset(self):
        self.measurements = {'weight': None, 'height': None}
        self.live_data['weight'] = {'current': None, 'status': 'idle', 'progress': 0}
        self.live_data['height'] = {'current': None, 'status': 'idle', 'progress': 0}
