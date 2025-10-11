from flask import Blueprint, jsonify, request
from app.sensors.sensor_manager import SensorManager
import time
import random

# Initialize sensor manager with simulation mode enabled
sensor_manager = SensorManager(port='COM3', force_simulation=True)

sensor_bp = Blueprint('sensor', __name__)

@sensor_bp.route('/connect', methods=['POST', 'OPTIONS'])
def connect_sensors():
    """Connect to Arduino"""
    if request.method == 'OPTIONS':
        return '', 200
        
    data = request.get_json() or {}
    port = data.get('port', 'COM3')
    
    sensor_manager.port = port
    connected = sensor_manager.connect()
    
    return jsonify({
        "connected": connected,
        "port": port
    })

@sensor_bp.route('/disconnect', methods=['POST'])
def disconnect_sensors():
    """Disconnect from Arduino"""
    sensor_manager.disconnect()
    return jsonify({"status": "disconnected"})

@sensor_bp.route('/status', methods=['GET'])
def get_sensor_status():
    """Get current sensor status"""
    try:
        status = sensor_manager.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({
            "error": f"Failed to get sensor status: {str(e)}",
            "connected": False,
            "simulation_mode": True
        })

@sensor_bp.route('/test', methods=['POST'])
def test_connection():
    """Test Arduino connection"""
    result = sensor_manager.test_connection()
    return jsonify(result)

# ==================== TEMPERATURE ROUTES ====================

@sensor_bp.route('/temperature/start', methods=['POST'])
def start_temperature_measurement():
    """Start temperature measurement phase"""
    result = sensor_manager.start_temperature_measurement()
    return jsonify(result)

@sensor_bp.route('/temperature/data', methods=['GET'])
def get_temperature_data():
    """Get temperature data"""
    return jsonify({
        "temperature": sensor_manager.temperature,
        "status": "idle"
    })

@sensor_bp.route('/temperature/status', methods=['GET'])
def get_temperature_status():
    """Get temperature measurement status"""
    try:
        status = sensor_manager.get_temperature_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error getting temperature status: {str(e)}",
            "temperature": None
        })

# ==================== MAX30102 ROUTES ====================

@sensor_bp.route('/max30102/start', methods=['POST'])
def start_max30102_measurement():
    """Start MAX30102 measurement phase"""
    result = sensor_manager.start_max30102_measurement()
    return jsonify(result)

@sensor_bp.route('/max30102/data', methods=['GET'])
def get_max30102_data():
    """Get MAX30102 real-time data"""
    return jsonify({
        "heart_rate": sensor_manager.heart_rate,
        "spo2": sensor_manager.spo2,
        "respiratory_rate": sensor_manager.respiratory_rate,
        "finger_detected": sensor_manager.finger_detected
    })

@sensor_bp.route('/max30102/status', methods=['GET'])
def get_max30102_status():
    """Get MAX30102 measurement status"""
    try:
        status = sensor_manager.get_max30102_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Error getting MAX30102 status: {str(e)}",
            "heart_rate": None,
            "spo2": None,
            "respiratory_rate": None,
            "finger_detected": False,
            "progress_seconds": 60
        })

# ==================== COMMON ROUTES ====================

@sensor_bp.route('/measurement/stop', methods=['POST'])
def stop_measurement():
    """Stop current measurement"""
    result = sensor_manager.stop_measurement()
    return jsonify(result)

@sensor_bp.route('/measurements', methods=['GET'])
def get_all_measurements():
    """Get all completed measurements"""
    measurements = sensor_manager.get_all_measurements()
    return jsonify(measurements)

# ==================== SIMULATION ROUTES ====================

@sensor_bp.route('/simulate/temperature', methods=['POST'])
def simulate_temperature_measurement():
    """Simulate temperature measurement for testing"""
    data = request.get_json() or {}
    action = data.get('action', 'start')
    
    if action == 'start':
        sensor_manager.current_phase = "TEMP"
        sensor_manager.measurement_active = True
        sensor_manager.measurement_start_time = time.time()
        sensor_manager.temperature = None
        
        return jsonify({
            "status": "started",
            "message": "Temperature measurement simulation started"
        })
    
    elif action == 'complete':
        simulated_temp = round(36.5 + random.uniform(-0.3, 0.5), 1)
        sensor_manager.temperature = simulated_temp
        sensor_manager.current_phase = "IDLE"
        sensor_manager.measurement_active = False
        
        return jsonify({
            "status": "completed",
            "message": "Temperature measurement simulation completed",
            "temperature": simulated_temp
        })
    
    elif action == 'error':
        sensor_manager.current_phase = "IDLE"
        sensor_manager.measurement_active = False
        
        return jsonify({
            "status": "error",
            "message": "Simulated measurement error",
            "temperature": None
        })

@sensor_bp.route('/simulate/max30102', methods=['POST'])
def simulate_max30102_measurement():
    """Simulate MAX30102 measurement for testing"""
    data = request.get_json() or {}
    action = data.get('action', 'start')
    
    if action == 'start':
        sensor_manager.current_phase = "MAX"
        sensor_manager.measurement_active = True
        sensor_manager.measurement_start_time = time.time()
        sensor_manager.finger_detected = True
        sensor_manager.heart_rate = None
        sensor_manager.spo2 = None
        sensor_manager.respiratory_rate = None
        
        return jsonify({
            "status": "started",
            "message": "MAX30102 measurement simulation started",
            "finger_detected": True
        })
    
    elif action == 'complete':
        sensor_manager.heart_rate = random.randint(65, 85)
        sensor_manager.spo2 = round(97 + random.uniform(0, 2), 1)
        sensor_manager.respiratory_rate = random.randint(12, 18)
        sensor_manager.current_phase = "IDLE"
        sensor_manager.measurement_active = False
        sensor_manager.finger_detected = False
        
        return jsonify({
            "status": "completed",
            "message": "MAX30102 measurement simulation completed",
            "heart_rate": sensor_manager.heart_rate,
            "spo2": sensor_manager.spo2,
            "respiratory_rate": sensor_manager.respiratory_rate
        })

# Health check endpoint
@sensor_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({"status": "healthy", "service": "sensor_manager"})