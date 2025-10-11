from flask import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/hello')
def hello():
    return jsonify({"message": "Hello from Flask!", "status": "connected"})

@main_bp.route('/status')
def status():
    return jsonify({
        "status": "connected", 
        "service": "MediScan Backend",
        "version": "1.0.0"
    })

@main_bp.route('/health')
def health_check():
    return jsonify({"status": "healthy"})