from flask import Blueprint, jsonify
from app.sensors.sensor_manager import SensorManager

# Initialize the manager
sensor_manager = SensorManager()

sensor_bp = Blueprint('sensor', __name__)

@sensor_bp.route('/connect', methods=['POST'])
def connect_sensors():
    """Establishes connection to Arduino with auto-tare."""
    connected = sensor_manager.connect()
    return jsonify({
        "connected": connected,
        "port": sensor_manager.port if connected else None,
        "system_mode": "FULLY_INITIALIZED" if sensor_manager.auto_tare_completed else "BASIC",
        "auto_tare_completed": sensor_manager.auto_tare_completed,
        "message": "Connection established with auto-tare" if connected and sensor_manager.auto_tare_completed else "Connection established" if connected else "Connection failed"
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

@sensor_bp.route('/system_status', methods=['GET'])
def get_system_status():
    """Returns detailed system status including sensor readiness."""
    return jsonify(sensor_manager.get_system_status())

@sensor_bp.route('/initialize', methods=['POST'])
def initialize_system():
    """Performs FULL system initialization including weight sensor tare."""
    if not sensor_manager.is_connected:
        return jsonify({"status": "error", "message": "Not connected to Arduino"})
    
    success = sensor_manager.full_initialize()
    return jsonify({
        "status": "success" if success else "warning",
        "message": "Full system initialization complete" if success else "Initialization may be incomplete",
        "full_system_initialized": sensor_manager.full_system_initialized,
        "weight_sensor_ready": sensor_manager.weight_sensor_ready,
        "auto_tare_completed": sensor_manager.auto_tare_completed
    })

@sensor_bp.route('/initialize_weight', methods=['POST'])
def initialize_weight_sensor():
    """Initializes only the weight sensor with tare."""
    if not sensor_manager.is_connected:
        return jsonify({"status": "error", "message": "Not connected to Arduino"})
    
    success = sensor_manager.initialize_weight_sensor()
    return jsonify({
        "status": "success" if success else "warning",
        "message": "Weight sensor initialized" if success else "Weight sensor initialization may be incomplete",
        "weight_sensor_ready": sensor_manager.weight_sensor_ready,
        "auto_tare_completed": sensor_manager.auto_tare_completed
    })

@sensor_bp.route('/tare', methods=['POST'])
def tare_weight_sensor():
    """Performs tare operation on weight sensor."""
    result = sensor_manager.perform_tare()
    return jsonify(result)

@sensor_bp.route('/auto_tare', methods=['POST'])
def auto_tare():
    """Perform automatic tare operation on weight sensor."""
    result = sensor_manager.start_auto_tare()
    return jsonify(result)

@sensor_bp.route('/reset', methods=['POST'])
def reset_measurements():
    """Resets all measurement results."""
    result = sensor_manager.reset_measurements()
    return jsonify(result)

@sensor_bp.route('/reconnect', methods=['POST'])
def force_reconnect():
    """Forces reconnection to Arduino."""
    result = sensor_manager.force_reconnect()
    return jsonify(result)

@sensor_bp.route('/measurements', methods=['GET'])
def get_all_measurements():
    """Returns all completed measurements."""
    return jsonify(sensor_manager.get_measurements())

# Individual sensor routes - WEIGHT & HEIGHT ONLY
@sensor_bp.route('/weight/start', methods=['POST'])
def start_weight():
    result = sensor_manager.start_weight_measurement()
    return jsonify(result)

@sensor_bp.route('/weight/prepare', methods=['POST'])
def prepare_weight():
    result = sensor_manager.prepare_weight_sensor()
    return jsonify(result)

@sensor_bp.route('/weight/shutdown', methods=['POST'])
def shutdown_weight():
    sensor_manager._power_down_sensor("weight")
    return jsonify({"status": "powered_down"})

@sensor_bp.route('/weight/status', methods=['GET'])
def get_weight_status():
    return jsonify(sensor_manager.get_weight_status())

@sensor_bp.route('/height/start', methods=['POST'])
def start_height():
    result = sensor_manager.start_height_measurement()
    return jsonify(result)

@sensor_bp.route('/height/prepare', methods=['POST'])
def prepare_height():
    result = sensor_manager.prepare_height_sensor()
    return jsonify(result)

@sensor_bp.route('/height/shutdown', methods=['POST'])
def shutdown_height():
    sensor_manager._power_down_sensor("height")
    return jsonify({"status": "powered_down"})

@sensor_bp.route('/height/status', methods=['GET'])
def get_height_status():
    return jsonify(sensor_manager.get_height_status())

@sensor_bp.route('/shutdown', methods=['POST'])
def shutdown_sensors():
    """Shuts down all sensors (call this at the end of the flow)."""
    sensor_manager.shutdown_all_sensors()
    return jsonify({"status": "all_sensors_shutdown"})