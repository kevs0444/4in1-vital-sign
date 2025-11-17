# app/__init__.py
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
    from app.routes.register_routes import register_bp
    from app.routes.login_routes import login_bp  # Add this line
    
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(sensor_bp, url_prefix='/api/sensor')
    app.register_blueprint(register_bp, url_prefix='/api/register')
    app.register_blueprint(login_bp, url_prefix='/api/login')  # Add this line
    
    return app