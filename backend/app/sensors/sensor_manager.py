import logging
import time
import threading
from app.config import Config
from .managers.serial_interface import SerialInterface
from .managers.bmi_manager import BMIManager
from .managers.bodytemp_manager import BodyTempManager
from .managers.max30102_manager import Max30102Manager

logger = logging.getLogger(__name__)

class SensorManager:
    def __init__(self):
        self.serial_interface = SerialInterface()
        self.bmi_manager = BMIManager(self.serial_interface)
        self.temp_manager = BodyTempManager(self.serial_interface)
        self.max30102_manager = Max30102Manager(self.serial_interface)
        self.baudrate = Config.SERIAL_BAUDRATE

    @property
    def is_connected(self):
        return self.serial_interface.is_connected
    
    @property
    def port(self):
        return self.serial_interface.port

    @property
    def auto_tare_completed(self):
        return self.bmi_manager.auto_tare_completed

    @property
    def weight_sensor_ready(self):
        return self.bmi_manager.weight_sensor_ready

    @property
    def temperature_sensor_ready(self):
        return self.temp_manager.sensor_ready

    @property
    def max30102_sensor_ready(self):
        return self.max30102_manager.sensor_ready

    @property
    def full_system_initialized(self):
        # Infer from sub-managers
        return self.bmi_manager.weight_sensor_ready and self.temp_manager.sensor_ready and self.max30102_manager.sensor_ready

    def connect(self):
        result, message = self.serial_interface.connect()
        if result:
            time.sleep(3) # Increased from 2s to 3s to ensure Mega is ready
            # Explicitly trigger Auto-Tare on connection to ensure calibration
            logger.info("Triggering initial Auto-Tare...")
            self.start_auto_tare()
            return True, message
        return False, message

    def disconnect(self):
        return self.serial_interface.disconnect()

    def force_reconnect(self):
        self.disconnect()
        time.sleep(1)
        return self.connect()

    # ==================== FACADE METHODS ====================

    def get_system_status(self):
        bmi_status = self.bmi_manager.get_status()
        temp_status = self.temp_manager.get_status()
        max_status = self.max30102_manager.get_status()
        
        return {
            "connected": self.is_connected,
            "connection_established": self.is_connected,
            "sensors_ready": {
                "weight": bmi_status["weight_ready"],
                "height": bmi_status["height_ready"],
                "temperature": temp_status["ready"],
                "max30102": max_status["ready"]
            },
            "auto_tare_completed": bmi_status["auto_tare_completed"],
            "system_mode": "FULLY_INITIALIZED" if bmi_status["auto_tare_completed"] else "BASIC"
        }

    def get_measurements(self):
        measurements = {}
        measurements.update(self.bmi_manager.measurements)
        measurements['temperature'] = self.temp_manager.measurement
        measurements.update(self.max30102_manager.measurements)
        return measurements

    def reset_measurements(self):
        self.bmi_manager.reset()
        self.temp_manager.reset()
        self.max30102_manager.reset()
        self.shutdown_all_sensors()
        return {"status": "success", "message": "Measurements reset"}

    # --- Initialization & Tare ---
    def full_initialize(self):
        return self.bmi_manager.full_initialize()

    def initialize_weight_sensor(self):
        return self.bmi_manager.initialize_weight()

    def perform_tare(self):
        return self.bmi_manager.tare()

    def start_auto_tare(self):
        return self.bmi_manager.start_auto_tare()

    # --- Weight ---
    def start_weight_measurement(self):
        return self.bmi_manager.start_weight()

    def prepare_weight_sensor(self):
        # Alias to start/ensure powered
        return self.bmi_manager.start_weight()

    def shutdown_weight_sensor(self):
        return self.bmi_manager.stop_weight()
    
    def shutdown_weight(self): # Dual alias
        return self.bmi_manager.stop_weight()

    def get_weight_status(self):
        status = self.bmi_manager.get_status()
        return {
            "live_data": status["live_data"]["weight"],
            "status": status["live_data"]["weight"]["status"]
        }

    # --- Height ---
    def start_height_measurement(self):
        return self.bmi_manager.start_height()

    def prepare_height_sensor(self):
        return self.bmi_manager.start_height()

    def shutdown_height_sensor(self):
        return self.bmi_manager.stop_height()

    def shutdown_height(self):
        return self.bmi_manager.stop_height()

    def get_height_status(self):
        status = self.bmi_manager.get_status()
        return {
            "live_data": status["live_data"]["height"],
            "status": status["live_data"]["height"]["status"]
        }

    # --- Temperature ---
    def start_temperature_measurement(self):
        return self.temp_manager.start_measurement()

    def prepare_temperature_sensor(self):
        return self.temp_manager.start_measurement()

    def shutdown_temperature_sensor(self):
        return self.temp_manager.stop_measurement()

    def shutdown_temperature(self):
        return self.temp_manager.stop_measurement()

    def get_temperature_status(self):
        status = self.temp_manager.get_status()
        return {
            "live_data": status["live_data"],
            "status": status["live_data"]["status"],
            "temperature": status["measurement"],
            "live_temperature": status["live_data"]["current"]
        }

    # --- MAX30102 ---
    def start_max30102_measurement(self):
        return self.max30102_manager.start_measurement()

    def prepare_max30102_sensor(self):
        return self.max30102_manager.prepare_sensor()

    def shutdown_max30102_sensor(self):
        return self.max30102_manager.shutdown_sensor()
        
    def stop_max30102_measurement(self):
        return self.max30102_manager.stop_measurement()

    def get_max30102_status(self):
        status = self.max30102_manager.get_status()
        
        # Flatten the response for frontend convenience
        response = status["live_data"].copy()
        
        # Add high-level flags from manager
        response["sensor_prepared"] = status["ready"]
        response["measurement_started"] = status["active"]
        
        # Ensure finger_detected is consistent
        response["finger_detected"] = status["finger_detected"]
        
        return response

    def shutdown_all_sensors(self):
        # Reset internal state
        self.bmi_manager.reset()
        self.temp_manager.reset()
        self.max30102_manager.reset()
        
        # Power down hardware
        self.serial_interface.send_command("POWER_DOWN_WEIGHT")
        self.serial_interface.send_command("POWER_DOWN_HEIGHT")
        self.serial_interface.send_command("POWER_DOWN_TEMPERATURE")
        self.serial_interface.send_command("POWER_DOWN_MAX30102")
        
        return {"status": "success"}