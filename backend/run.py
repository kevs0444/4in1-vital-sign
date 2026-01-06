import logging
import sys
import os

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded environment variables from .env")
except ImportError:
    print("⚠️ python-dotenv not installed, assuming environment variables are set manually")

# Configure logging IMMEDIATELY, before anything else
# This ensures we capture everything and output to stdout
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True
)

# Configure logging levels for dependencies
# Changed werkzeug to INFO so we can see HTTP requests
logging.getLogger('werkzeug').setLevel(logging.INFO)
logging.getLogger('sqlalchemy').setLevel(logging.WARNING)

from app import create_app
from app.utils.db import engine, text

# Test database connection - DISABLED to prioritize Arduino/Server startup
# try:
#     with engine.connect() as conn:
#         result = conn.execute(text("SELECT DATABASE() as db_name"))
#         db_name = result.fetchone()[0]  # Access by index
#         print(f"✅ Database connected: {db_name}")
# except Exception as e:
#     print(f"❌ Database connection failed: {e}")
#     # Don't exit, let the app try to start anyway
#     # exit(1)

app, socketio = create_app()

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 STARTING HEALTH MONITORING SYSTEM BACKEND")
    print("="*50)
    print("📍 API available at: http://127.0.0.1:5000")
    print("🔌 WebSocket available at: ws://127.0.0.1:5000")
    print("📋 Real-time updates ENABLED")
    print("="*50 + "\n")
    from app.utils.camera_config import CameraConfig

    print("\n" + "="*50)
    print("📷 CHECKING CAMERA CONFIGURATION")
    print("="*50)
    roles = [("weight", "Weight Compliance"), ("bp", "Blood Pressure"), ("wearables", "Wearables Compliance")]
    
    # Force auto-detection if enabled in config
    CameraConfig.autodetect_indices()
    
    for role_key, role_label in roles:
        # This will trigger the name-based resolution we just added
        idx = CameraConfig.get_index(role_key)
        config = CameraConfig.load()
        name = config.get(f"{role_key}_name", "Unknown")
        
        if idx is not None:
            print(f"   ✅ {role_label:<20} : Index {idx} (mapped to '{name}')")
        else:
            print(f"   ❌ {role_label:<20} : NOT FOUND (looking for '{name}')")
            
    print("="*50 + "\n")
    
    # Use socketio.run() instead of app.run() for WebSocket support
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, use_reloader=False, allow_unsafe_werkzeug=True)