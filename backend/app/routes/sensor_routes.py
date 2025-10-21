from flask import Blueprint, jsonify
from app.sensors.sensor_manager import SensorManager

# Initialize the manager
sensor_manager = SensorManager()

sensor_bp = Blueprint('sensor', __name__)

@sensor_bp.route('/connect', methods=['POST'])
def connect_sensors():
    """Connects to Arduino and initializes sensors."""
    connected = sensor_manager.connect()
    return jsonify({
        "connected": connected,
        "port": sensor_manager.port if connected else None
    })

@sensor_bp.route('/disconnect', methods=['POST'])
def disconnect_sensors():
    """Disconnects from the Arduino and powers down all sensors."""
    sensor_manager.disconnect()
    return jsonify({"status": "disconnected"})

@sensor_bp.route('/status', methods=['GET'])
def get_sensor_status():
    """Returns comprehensive sensor status."""
    return jsonify(sensor_manager.get_status())

# Individual sensor routes
@sensor_bp.route('/weight/start', methods=['POST'])
def start_weight():
    result = sensor_manager.start_weight_measurement()
    return jsonify(result)

@sensor_bp.route('/weight/status', methods=['GET'])
def get_weight_status():
    return jsonify(sensor_manager.get_weight_status())

@sensor_bp.route('/height/start', methods=['POST'])
def start_height():
    result = sensor_manager.start_height_measurement()
    return jsonify(result)

@sensor_bp.route('/height/status', methods=['GET'])
def get_height_status():
    return jsonify(sensor_manager.get_height_status())

@sensor_bp.route('/temperature/start', methods=['POST'])
def start_temperature():
    result = sensor_manager.start_temperature_measurement()
    return jsonify(result)

@sensor_bp.route('/temperature/status', methods=['GET'])
def get_temperature_status():
    return jsonify(sensor_manager.get_temperature_status())

@sensor_bp.route('/max30102/start', methods=['POST'])
def start_max30102():
    result = sensor_manager.start_max30102_measurement()
    return jsonify(result)

@sensor_bp.route('/max30102/status', methods=['GET'])
def get_max30102_status():
    return jsonify(sensor_manager.get_max30102_status())

@sensor_bp.route('/shutdown', methods=['POST'])
def shutdown_sensors():
    """Shuts down all sensors (call this at the end of the flow)."""
    sensor_manager.shutdown_all_sensors()
    return jsonify({"status": "all_sensors_shutdown"})