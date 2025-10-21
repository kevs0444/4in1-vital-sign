from flask import Blueprint, jsonify
from app.sensors.sensor_manager import SensorManager

# Initialize the manager. The port is discovered automatically.
sensor_manager = SensorManager()

sensor_bp = Blueprint('sensor', __name__)

@sensor_bp.route('/connect', methods=['POST'])
def connect_sensors():
    """Tells the manager to start its auto-scanning and connection process."""
    connected = sensor_manager.connect()
    return jsonify({
        "connected": connected,
        "port": sensor_manager.port if connected else None
    })

@sensor_bp.route('/disconnect', methods=['POST'])
def disconnect_sensors():
    """Disconnects from the Arduino."""
    sensor_manager.disconnect()
    return jsonify({"status": "disconnected"})

# ✅ NEW: Single route to start the entire measurement sequence
@sensor_bp.route('/start_all', methods=['POST'])
def start_all_measurements():
    result = sensor_manager.start_full_sequence()
    return jsonify(result)

# ✅ NEW: Single route to stop all sensors at the end of the flow
@sensor_bp.route('/stop_all', methods=['POST'])
def stop_all_measurements():
    result = sensor_manager.stop_full_sequence()
    return jsonify(result)

# The status routes remain, as the frontend will poll them for data
@sensor_bp.route('/status/weight', methods=['GET'])
def get_weight_status():
    return jsonify(sensor_manager.get_weight_status())
    
@sensor_bp.route('/status/height', methods=['GET'])
def get_height_status():
    return jsonify(sensor_manager.get_height_status())
    
@sensor_bp.route('/status/temperature', methods=['GET'])
def get_temperature_status():
    return jsonify(sensor_manager.get_temperature_status())

@sensor_bp.route('/status/max30102', methods=['GET'])
def get_max30102_status():
    return jsonify(sensor_manager.get_max30102_status())
