import logging
import re

logger = logging.getLogger(__name__)

class Max30102Manager:
    def __init__(self, serial_interface):
        self.serial = serial_interface
        self.serial.register_listener(self.process_data)
        
        self.sensor_ready = False
        self.active = False
        self.finger_detected = False
        
        self.measurements = {
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None
        }
        
        self.live_data = {
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None,
            'ir_value': 0,
            'status': 'idle',
            'progress': 0,
            'finger_detected': False
        }

    def process_data(self, data):
        if "STATUS:MAX30102_SENSOR_POWERED_UP" in data:
            self.sensor_ready = True
            
        elif "FINGER_DETECTED" in data or "Finger Detected" in data:
            self.finger_detected = True
            self.live_data['finger_detected'] = True
            self.active = True # Implicit start
            
        elif "FINGER_REMOVED" in data:
            self.finger_detected = False
            self.live_data['finger_detected'] = False
            self.active = False

        # IR Value "MAX30102_IR_VALUE:12345"
        elif data.startswith("MAX30102_IR_VALUE:"):
            try:
                parts = data.split(":")
                val = int(parts[1])
                self.live_data['ir_value'] = val
            except:
                pass

        # Emoji-based data "❤️ HR: 75 💨 RR: 18"
        if "❤️ HR:" in data:
            try:
                # Simple extraction
                hr = re.search(r'❤️ HR:\s*(\d+)', data)
                if hr: self.live_data['heart_rate'] = int(hr.group(1))
                
                spo2 = re.search(r'🩸 SpO2:\s*(\d+)', data)
                if spo2: self.live_data['spo2'] = int(spo2.group(1))
                
                rr = re.search(r'💨 RR:\s*([\d.]+)', data)
                if rr: self.live_data['respiratory_rate'] = float(rr.group(1))
                
                self.active = True
                self.live_data['status'] = 'measuring'
            except:
                pass

    def start_measurement(self):
        self.measurements = {'heart_rate': None, 'spo2': None, 'respiratory_rate': None}
        self.serial.send_command("START_MAX30102")
        return {"status": "success"}

    def stop_measurement(self):
        self.active = False
        self.serial.send_command("STOP_MAX30102")

    def get_status(self):
        return {
            "ready": self.sensor_ready,
            "active": self.active,
            "finger_detected": self.finger_detected,
            "live_data": self.live_data,
            "measurements": self.measurements
        }

    def reset(self):
        self.measurements = {'heart_rate': None, 'spo2': None, 'respiratory_rate': None}
        self.live_data = {
            'heart_rate': None,
            'spo2': None,
            'respiratory_rate': None,
            'ir_value': 0,
            'status': 'idle',
            'progress': 0,
            'finger_detected': False
        }
