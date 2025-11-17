from flask import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/hello', methods=['GET'])
def hello():
    return jsonify({"message": "Hello from 4 in Juan Vital Signs API!"})

@main_bp.route('/status', methods=['GET'])
def status():
    return jsonify({
        "status": "operational",
        "service": "4 in Juan Vital Signs API",
        "version": "1.0.0"
    })

@main_bp.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "healthy",
        "timestamp": "2024-01-01T00:00:00Z"
    })

@main_bp.route('/endpoints', methods=['GET'])
def list_endpoints():
    """List all available API endpoints"""
    endpoints = {
        "main": {
            "GET /api/hello": "Simple hello message",
            "GET /api/status": "API status",
            "GET /api/health": "Health check",
            "GET /api/endpoints": "List all endpoints"
        },
        "sensor": {
            "POST /api/sensor/connect": "Connect to Arduino",
            "GET /api/sensor/status": "Get sensor status",
            "POST /api/sensor/temperature/start": "Start temperature measurement",
            "POST /api/sensor/max30102/start": "Start MAX30102 measurement",
            "POST /api/sensor/measurement/stop": "Stop all measurements",
            "GET /api/sensor/measurements": "Get all measurements"
        },
        "register": {
            "POST /api/register/register": "Register new user",
            "POST /api/register/check-id": "Check ID availability",
            "GET /api/register/test-connection": "Test registration connection",
            "GET /api/register/users": "Get all users (for testing)"
        }
    }
    return jsonify(endpoints)