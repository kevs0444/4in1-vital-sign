import logging
import time

logger = logging.getLogger(__name__)

class BodyTempManager:
    def __init__(self, serial_interface):
        self.serial = serial_interface
        self.serial.register_listener(self.process_data)
        
        self.sensor_ready = False
        self.active = False
        self.measurement = None
        self.live_data = {
            'current': None,
            'status': 'idle',
            'progress': 0
        }
        self.last_log_time = 0

    def process_data(self, data):
        # Slave Logic: Update internal state based on Arduino's reported state
        if "STATUS:TEMPERATURE_SENSOR_POWERED_UP" in data:
            self.sensor_ready = True
            self.active = True # Logically active/listening
            logger.info("=== 🌡️ TEMPERATURE SENSOR POWERED UP ===")
            
        elif "STATUS:TEMPERATURE_SENSOR_POWERED_DOWN" in data:
            self.active = False
            self.sensor_ready = False
            logger.info("=== 🌡️ TEMPERATURE SENSOR POWERED DOWN ===")

        elif "STATUS:TEMPERATURE_MEASUREMENT_STARTED" in data:
            self.active = True
            self.live_data['status'] = 'detecting'
            logger.info("=== 🌡️ MEASUREMENT STARTED ===")
            
        elif "STATUS:TEMPERATURE_MEASUREMENT_COMPLETE" in data:
            self.active = False
            self.live_data['status'] = 'complete'
            logger.info("=== ✅ MEASUREMENT COMPLETE ===")
            
        # "DEBUG:Temperature reading: XX.XX"
        elif "Temperature reading:" in data:
            try:
                # Robust parsing: handle spaces and prefixes
                clean_data = data.replace("DEBUG:", "").replace("Temperature reading:", "").strip()
                val = float(clean_data)
                
                self.live_data['current'] = val
                self.live_data['status'] = 'measuring'
                
                # Throttled logging (1Hz) to avoid flooding terminal
                current_time = time.time()
                if current_time - self.last_log_time > 1.0:
                    print(f"🌡️ Live BodyTemp: {val} °C", flush=True)
                    self.last_log_time = current_time
            except Exception as e:
                pass
                
        # Result "RESULT:TEMPERATURE:XX.XX"
        elif data.startswith("RESULT:TEMPERATURE:"):
            try:
                val = float(data.split(":")[2])
                self.measurement = val
                self.live_data['status'] = 'complete'
                logger.info(f"=== 🌡️ FINAL RESULT: {val} °C ===")
            except:
                pass

    def start_measurement(self):
        self.measurement = None
        self.active = True
        self.serial.send_command("START_TEMPERATURE")
        return {"status": "success"}

    def stop_measurement(self):
        self.active = False
        self.serial.send_command("POWER_DOWN_TEMPERATURE")

    def get_status(self):
        return {
            "ready": self.sensor_ready,
            "active": self.active,
            "live_data": self.live_data,
            "measurement": self.measurement
        }
    
    def reset(self):
        self.measurement = None
        self.live_data = {'current': None, 'status': 'idle', 'progress': 0}
