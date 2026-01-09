# app/__init__.py
from flask import Flask, send_from_directory, request
from flask_cors import CORS
import logging
import sys
import os

# Global socketio instance for export
socketio = None

def create_app():
    # Define correct path to frontend build: backend/app/../../frontend/build
    base_dir = os.path.dirname(os.path.abspath(__file__))
    frontend_build_dir = os.path.join(base_dir, '../../frontend/build')
    
    app = Flask(__name__, static_folder=frontend_build_dir, static_url_path='/')
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
    
    # Register blueprints with Dual Paths (API prefix + Root overlay)
    
    app.register_blueprint(main_bp, url_prefix='/api')
    app.register_blueprint(main_bp, url_prefix='/', name='main_alias') # Unique name required

    app.register_blueprint(sensor_bp, url_prefix='/api/sensor')
    app.register_blueprint(sensor_bp, url_prefix='/sensor', name='sensor_alias')

    app.register_blueprint(register_bp, url_prefix='/api/register')
    app.register_blueprint(register_bp, url_prefix='/register', name='register_alias')

    app.register_blueprint(login_bp, url_prefix='/api/login')
    app.register_blueprint(login_bp, url_prefix='/login', name='login_alias')
    
    from app.routes.forgot_password_routes import forgot_password_bp
    app.register_blueprint(forgot_password_bp, url_prefix='/api/auth')
    app.register_blueprint(forgot_password_bp, url_prefix='/auth', name='auth_alias')
    
    from app.routes.camera_routes import camera_bp
    app.register_blueprint(camera_bp, url_prefix='/api/camera')
    app.register_blueprint(camera_bp, url_prefix='/camera', name='camera_alias')

    from app.routes.print_routes import print_bp
    app.register_blueprint(print_bp, url_prefix='/api/print')
    app.register_blueprint(print_bp, url_prefix='/print', name='print_alias')

    from app.routes.admin_routes import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(admin_bp, url_prefix='/admin', name='admin_alias') 

    from app.routes.share_routes import share_bp
    app.register_blueprint(share_bp, url_prefix='/api/share')
    app.register_blueprint(share_bp, url_prefix='/share', name='share_alias')

    from app.routes.juan_ai_routes import juan_ai_bp
    app.register_blueprint(juan_ai_bp, url_prefix='/api/juan-ai')
    app.register_blueprint(juan_ai_bp, url_prefix='/juan-ai', name='juan_ai_alias')
    
    from app.routes.bp_ai_camera import bp_ai_camera_bp
    app.register_blueprint(bp_ai_camera_bp, url_prefix='/api/bp-camera')
    app.register_blueprint(bp_ai_camera_bp, url_prefix='/bp-camera', name='bp_camera_alias')

    # NEW: Unified Clearance Route
    from app.routes.clearance_routes import clearance_bp
    app.register_blueprint(clearance_bp, url_prefix='/api/clearance')
    app.register_blueprint(clearance_bp, url_prefix='/clearance', name='clearance_alias')

    # NEW: Dedicated BP Sensor Controller Routes
    from app.routes.bp_routes import bp_routes
    app.register_blueprint(bp_routes)  # Already has url_prefix='/api/bp'
    app.register_blueprint(bp_routes, url_prefix='/bp', name='bp_alias')

    # Wearables Camera Routes (Camera Index 1 - for watch, bag, cap, ID detection)
    # Wearables Camera Routes - DEPRECATED (Now unified in camera_routes)
    # from app.routes.wearables_camera import wearables_routes
    # app.register_blueprint(wearables_routes)
    # app.register_blueprint(wearables_routes, url_prefix='/wearables', name='wearables_alias')
    
    # Backwards compatibility: Also register at /api/aux for existing frontend calls
    # app.register_blueprint(wearables_routes, url_prefix='/api/aux', name='wearables_aux_compat')
    # app.register_blueprint(wearables_routes, url_prefix='/aux', name='aux_alias')

    from app.routes.measurement_routes import measurement_bp
    app.register_blueprint(measurement_bp, url_prefix='/api/measurements')
    app.register_blueprint(measurement_bp, url_prefix='/measurements', name='measurements_alias')

    from app.routes.user_routes import user_bp
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(user_bp, url_prefix='/users', name='users_alias')

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
    from app.models import User, Measurement, Recommendation, VerificationCode
    try:
        # checkfirst=True means it won't error if tables already exist
        Base.metadata.create_all(bind=engine, checkfirst=True)
        print("✅ Database tables verified/created")
    except Exception as e:
        print(f"⚠️ Database table check failed (non-critical): {e}")
    print("-"*40 + "\n")

    # ==================== FRONTEND SERVING ====================
    
    @app.before_request
    def ws_ignorer():
        """Silence React HMR WebSocket errors"""
        if request.path == '/ws':
            return "", 200

    # Serve React App for any non-API routes
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def serve(path):
        if path.startswith('api'):
            return jsonify({'error': 'Not Found'}), 404
            
        if path != "" and os.path.exists(os.path.join(app.static_folder, path)):
            return send_from_directory(app.static_folder, path)
        else:
            # Fallback to index.html for SPA routing
            if os.path.exists(os.path.join(app.static_folder, 'index.html')):
                 return send_from_directory(app.static_folder, 'index.html')
            else:
                 return "Frontend build not found. Please run 'npm run build' in frontend directory.", 404

    # ==================== WEBSOCKET SETUP ====================
    print("\n" + "="*60)
    print("🔌 PRIORITY 4: WEBSOCKET (REAL-TIME) SETUP")
    print("="*60)
    from app.websocket_events import init_socketio
    global socketio
    socketio = init_socketio(app)
    print("✅ WebSocket server ready for real-time updates")
    print("="*60 + "\n")

    print("="*60)
    print("🚀 BACKEND SERVER is READY and RUNNING")
    print(f"📂 Serving Frontend from: {app.static_folder}")

    # Print Camera Map
    print("-"*60)
    print("📷 CAMERAS DETECTED & ASSIGNED:")
    try:
        from app.utils.camera_config import CameraConfig
        config = CameraConfig.load()
        print(f"   🦶 Weight/Feet:    Index {config.get('weight_index', '?')}")
        print(f"   👕 Wearables:      Index {config.get('wearables_index', '?')}")
        print(f"   🩸 Blood Pressure: Index {config.get('bp_index', '?')}")
    except Exception as e:
         print(f"   ⚠️ Camera Config Error: {e}")
    print("-"*60)

    print("="*60)
    print("📍 API available at: http://127.0.0.1:5000")

    print("🔌 WebSocket available at: ws://127.0.0.1:5000")
    print("="*60 + "\n")
    sys.stdout.flush()
    
    return app, socketio