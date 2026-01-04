import logging

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

    def process_data(self, data):
        if "STATUS:TEMPERATURE_SENSOR_POWERED_UP" in data:
            self.sensor_ready = True
            
        elif "STATUS:TEMPERATURE_MEASUREMENT_STARTED" in data:
            self.active = True
            self.live_data['status'] = 'detecting'
            
        elif "STATUS:TEMPERATURE_MEASUREMENT_COMPLETE" in data:
            self.active = False
            self.live_data['status'] = 'complete'
            
        # "DEBUG:Temperature reading: XX.XX"
        elif data.startswith("DEBUG:Temperature reading:"):
            try:
                val = float(data.split(":")[2].strip())
                self.live_data['current'] = val
                self.live_data['status'] = 'measuring'
                print(f"🌡️ Live BodyTemp: {val} °C")
            except:
                pass
                
        # Result "RESULT:TEMPERATURE:XX.XX"
        elif data.startswith("RESULT:TEMPERATURE:"):
            try:
                val = float(data.split(":")[2])
                self.measurement = val
                self.live_data['status'] = 'complete'
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
