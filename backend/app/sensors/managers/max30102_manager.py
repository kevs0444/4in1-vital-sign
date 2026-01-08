import logging
import re
import time

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
            'pi': None,              # Perfusion Index (Medical Grade)
            'signal_quality': None,  # EXCELLENT/GOOD/FAIR/WEAK/POOR
            'status': 'idle',
            'progress': 0,
            'finger_detected': False,
            'stable_hr': None
        }
        self.last_log_time = 0

    def process_data(self, data):
        # --- POWER STATUS (SLAVE LOGIC) ---
        if "STATUS:MAX30102_SENSOR_POWERED_UP" in data:
            self.sensor_ready = True
            self.active = True
            logger.info("=== ❤️ MAX30102 SENSOR POWERED UP ===")
            
        elif "STATUS:MAX30102_SENSOR_POWERED_DOWN" in data:
            self.active = False
            self.sensor_ready = False
            self.live_data['status'] = 'idle'
            logger.info("=== ❤️ MAX30102 SENSOR POWERED DOWN ===")

        elif "STATUS:MAX30102_MEASUREMENT_STARTED" in data:
            self.active = True
            logger.info("=== ❤️ MAX30102 MEASUREMENT STARTED ===")
            
        elif "STATUS:MAX30102_MEASUREMENT_COMPLETE" in data:
            self.active = False
            logger.info("=== ✅ MAX30102 MEASUREMENT COMPLETE ===")
            
        elif "FINGER_DETECTED" in data or "Finger Detected" in data:
            if not self.finger_detected: # Prevent duplicate logs
                self.finger_detected = True
                self.live_data['finger_detected'] = True
                # Reset live metrics to prevent stale data
                self.live_data['heart_rate'] = None
                self.live_data['spo2'] = None
                self.live_data['respiratory_rate'] = None
                self.live_data['stable_hr'] = None
                print("\n🔔🔔🔔 [NOTIFY USER] FINGER DETECTED 🔔🔔🔔\n", flush=True)
            
        elif "FINGER_REMOVED" in data:
            if self.finger_detected: # Prevent duplicate logs
                self.finger_detected = False
                self.live_data['finger_detected'] = False
                self.live_data['heart_rate'] = None
                self.live_data['spo2'] = None
                self.live_data['respiratory_rate'] = None
                self.live_data['stable_hr'] = None
                print("\n⚠️⚠️⚠️ [NOTIFY USER] FINGER REMOVED ⚠️⚠️⚠️\n", flush=True)

        # IR Value "MAX30102_IR_VALUE:12345" - Just log the value, DO NOT detect finger here
        # Arduino is the SINGLE SOURCE OF TRUTH for finger detection via FINGER_DETECTED/REMOVED messages
        elif data.startswith("MAX30102_IR_VALUE:"):
            try:
                parts = data.split(":")
                val = int(parts[1])
                self.live_data['ir_value'] = val
                # No debounce logic here - Arduino handles it
            except:
                pass

        # "MAX30102_LIVE_DATA:HR=75,SPO2=98,RR=18.5..."
        elif "MAX30102_LIVE_DATA:" in data:
            try:
                content = data.split("MAX30102_LIVE_DATA:")[1]
                pairs = content.split(',')
                for pair in pairs:
                    if '=' in pair:
                        key, value = pair.split('=')
                        if key == 'HR':
                            hr = int(value)
                            self.live_data['heart_rate'] = hr
                            self.live_data['stable_hr'] = hr
                        elif key == 'SPO2':
                            self.live_data['spo2'] = int(value)
                        elif key == 'RR':
                            self.live_data['respiratory_rate'] = float(value)
                        elif key == 'PI':
                            self.live_data['pi'] = float(value)
                        elif key == 'QUALITY':
                            self.live_data['signal_quality'] = value
                
                self.live_data['status'] = 'measuring'
                # NOTE: finger_detected is set from explicit FINGER_DETECTED message, not from data
                # This ensures we follow the backend's status flow exactly
                
                # Throttled Logging (1Hz)
                current_time = time.time()
                if current_time - self.last_log_time > 1.0:
                    hr = self.live_data.get('heart_rate', '--')
                    spo2 = self.live_data.get('spo2', '--')
                    rr = self.live_data.get('respiratory_rate', '--')
                    quality = self.live_data.get('signal_quality', '--')
                    
                    print(f"❤️ HR: {hr} BPM | SpO2: {spo2}% | RR: {rr} | Quality: {quality}", flush=True)
                    self.last_log_time = current_time
                
            except Exception as e:
                pass

        # Legacy Emoji support "❤️ HR: 75" - ONLY if not handled by new format
        elif "❤️ HR:" in data:
            return # Ignore legacy if present to avoid double-processing/logging

    def prepare_sensor(self):
        """Power up and prepare sensor - immediate return, frontend polls for readiness"""
        logger.info("Preparing MAX30102 Sensor...")
        
        # Reset state before preparing (handles re-init after shutdown)
        self.sensor_ready = False
        self.finger_detected = False
        self.active = False
        self.live_data['status'] = 'initializing'
        
        # Reset debounce counters for fresh session
        self.ir_detection_counter = 0
        self.ir_removal_counter = 0
        
        self.serial.send_command("POWER_UP_MAX30102")
        
        # Return immediately - frontend polls getStatus which will show sensor_ready
        # when Arduino sends confirmation (no blocking/waiting)
        logger.info("MAX30102 power-up command sent - frontend will poll for readiness")
        return {"status": "success", "message": "MAX30102 sensor preparing"}

    def start_measurement(self):
        """Start measurement (Arduino will auto-start when finger detected)"""
        self.measurements = {'heart_rate': None, 'spo2': None, 'respiratory_rate': None}
        # Flatten live_data into the response for easier frontend parsing
        status = self.live_data.copy()
        status['active'] = self.active
        status['sensor_ready'] = self.sensor_ready
        status['finger_detected'] = self.finger_detected
        
        # Debug: Print what we are sending to frontend
        # print("API_RESPONSE_DEBUG:", status) 
        
        print(status)
        return status

    def stop_measurement(self):
        """Stop MAX30102 measurement"""
        self.active = False
        self.sensor_ready = False 
        self.finger_detected = False
        self.live_data['finger_detected'] = False
        self.live_data['status'] = 'stopped'
        self.serial.send_command("POWER_DOWN_MAX30102")
        return {"status": "success", "message": "MAX30102 measurement stopped"}

    def shutdown_sensor(self):
        """Shutdown MAX30102 sensor - power down completely"""
        self.active = False
        self.sensor_ready = False
        self.finger_detected = False
        self.live_data['finger_detected'] = False
        self.live_data['status'] = 'shutdown'
        self.serial.send_command("POWER_DOWN_MAX30102")
        return {"status": "success", "message": "MAX30102 sensor shutdown"}

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
            'pi': None,
            'signal_quality': None,
            'status': 'idle',
            'progress': 0,
            'finger_detected': False,
            'stable_hr': None
        }
