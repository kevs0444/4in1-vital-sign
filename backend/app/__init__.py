from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for React frontend

    # Import blueprints
    from .routes.main_routes import main_bp
    from .routes.sensor_routes import sensor_bp
    
    # Register blueprints
    app.register_blueprint(main_bp, url_prefix="/api")
    app.register_blueprint(sensor_bp, url_prefix="/api")
    
    return app