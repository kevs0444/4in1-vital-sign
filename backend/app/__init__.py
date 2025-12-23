# app/__init__.py
from flask import Flask
from flask_cors import CORS
import logging
import sys

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Force configure root logger
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.INFO)
    
    # Remove existing handlers to avoid duplicates -- DISABLED to preserve run.py config
    # for handler in root_logger.handlers[:]:
    #     root_logger.removeHandler(handler)
        
    # Create console handler with formatting
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    console_handler.setFormatter(formatter)
    
    # Add handler to root logger - DISABLED (run.py already adds one)
    # root_logger.addHandler(console_handler)
    
    # Also ensure app.logger uses this
    app.logger.handlers = []
    app.logger.propagate = True
    
    # Enable werkzeug to show HTTP requests
    logging.getLogger('werkzeug').setLevel(logging.INFO)
    
    logging.info("✅ Logging configured successfully - Backend starting...")
    
    # Configuration
    app.config['SECRET_KEY'] = 'your-secret-key-here'
    
    # Register blueprints
    from app.routes.main_routes import main_bp
    from app.routes.sensor_routes import sensor_bp
    from app.routes.register_routes import register_bp
    from app.routes.login_routes import login_bp
    
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(sensor_bp, url_prefix='/api/sensor')
    app.register_blueprint(register_bp, url_prefix='/api/register')
    app.register_blueprint(login_bp, url_prefix='/api/login')
    
    from app.routes.forgot_password_routes import forgot_password_bp
    app.register_blueprint(forgot_password_bp, url_prefix='/api/auth')
    
    from app.routes.camera_routes import camera_bp
    app.register_blueprint(camera_bp, url_prefix='/api/camera')

    from app.routes.print_routes import print_bp
    app.register_blueprint(print_bp, url_prefix='/api/print')

    from app.routes.admin_routes import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/admin')

    from app.routes.share_routes import share_bp
    app.register_blueprint(share_bp, url_prefix='/api/share')

    from app.routes.juan_ai_routes import juan_ai_bp
    app.register_blueprint(juan_ai_bp, url_prefix='/api/juan-ai')
    
    from app.routes.bp_ai_camera import bp_ai_camera_bp
    app.register_blueprint(bp_ai_camera_bp, url_prefix='/api/bp-camera')

    from app.routes.measurement_routes import measurement_bp
    app.register_blueprint(measurement_bp, url_prefix='/api/measurements')

    # --- PRIORITY 1: ARDUINO CONNECTION & AUTO-TARE ---
    from app.routes.sensor_routes import sensor_manager
    print("\n" + "="*60)
    print("🔌 PRIORITY 1: ARDUINO CONNECTION & AUTO-TARE")
    print("="*60)
    if not sensor_manager.is_connected:
        print("⏳ Attempting to connect to Arduino...")
        try:
            connected, message = sensor_manager.connect()
            if connected:
                print(f"✅ Arduino connected: {message}")
            else:
                print(f"⚠️ Arduino not found: {message}")
        except Exception as e:
            print(f"⚠️ Arduino auto-connect failed: {e}")
    else:
        print("✅ Arduino already connected")
    print("="*60 + "\n")

    # --- PRIORITY 2: DATABASE TABLES (Fallback creation if needed) ---
    print("🗄️ PRIORITY 2: DATABASE TABLES")
    print("-"*40)
    from app.utils.db import engine, Base
    from app.models.user_model import User
    from app.models.measurement_model import Measurement
    from app.models.recommendation_model import Recommendation
    
    try:
        # checkfirst=True means it won't error if tables already exist
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("✅ Database tables verified/created")
    except Exception as e:
        print(f"⚠️ Database table check failed (non-critical): {e}")
    print("-"*40 + "\n")

    print("="*60)
    print("🚀 BACKEND SERVER is READY and RUNNING")
    print("="*60)
    print("📍 API available at: http://127.0.0.1:5000")
    print("="*60 + "\n")
    sys.stdout.flush()
    
    return app