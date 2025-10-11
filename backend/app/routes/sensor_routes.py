from flask import Blueprint, jsonify
from ..sensors.sensor_manager import sensor_manager

sensor_bp = Blueprint('sensor', __name__)

@sensor_bp.route('/sensor/temp/start', methods=['POST'])
def start_temperature():
    """Start temperature measurement"""
    try:
        result = sensor_manager.start_measurement('temp')
        return jsonify(result)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensor_bp.route('/sensor/temp/data', methods=['GET'])
def get_temperature_data():
    """Get temperature data"""
    try:
        data = sensor_manager.get_measurement('temp')
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensor_bp.route('/sensor/temp/status', methods=['GET'])
def get_temperature_status():
    """Get current temperature measurement status with detailed detection info"""
    try:
        status = sensor_manager.get_temperature_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensor_bp.route('/sensor/stop', methods=['POST'])
def stop_measurement():
    """Stop current measurement"""
    try:
        sensor_manager.stop_measurement()
        return jsonify({'status': 'stopped'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensor_bp.route('/sensor/status', methods=['GET'])
def get_sensor_status():
    """Get sensor manager status"""
    try:
        status = sensor_manager.get_status()
        return jsonify(status)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@sensor_bp.route('/sensor/test', methods=['POST'])
def test_connection():
    """Test Arduino connection"""
    try:
        if sensor_manager.connect():
            return jsonify({'status': 'connected', 'message': 'Arduino communication OK'})
        else:
            return jsonify({'error': 'Failed to connect to Arduino'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500