from flask import Blueprint, jsonify

main_bp = Blueprint('main', __name__)

@main_bp.route('/hello')
def hello():
    return jsonify({"message": "Hello from Flask!", "status": "success"})

@main_bp.route('/status')
def status():
    return jsonify({"status": "running", "service": "Health Monitoring System"})

@main_bp.route('/health')
def health():
    return jsonify({"status": "healthy"})