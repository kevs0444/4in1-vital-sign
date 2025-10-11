from flask import Flask
from flask_cors import CORS

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Configuration
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    
    # Register blueprints
    from app.routes.main_routes import main_bp
    from app.routes.sensor_routes import sensor_bp
    
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(sensor_bp, url_prefix='/api/sensor')
    
    return app