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
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)],
    force=True
)

logging.getLogger('werkzeug').setLevel(logging.INFO)
logging.getLogger('sqlalchemy').setLevel(logging.WARNING)

from app import create_app
from app.utils.db import engine, text

app, socketio = create_app()

# ============================================================
# PRE-INITIALIZATION: Load AI Models and Discover Cameras
# This speeds up the Clearance page significantly
# ============================================================
def pre_initialize_ai_and_cameras():
    print("\n🔧 PRE-INITIALIZING AI MODELS AND CAMERAS...")
    
    # 1. Pre-load AI Models (Singleton - only loads once)
    try:
        # LEGACY: Removed to support Unified Clearance Manager
        # from ai_camera.detection.dual_camera_detect import ComplianceDetector
        # detector = ComplianceDetector()
        # from app.sensors.weight_compliance_camera import weight_compliance_camera
        # from app.sensors.wearables_compliance_camera import wearables_compliance_camera
        print("   ✅ Legacy pre-load disabled (using ClearanceManager)")
    except Exception as e:
        print(f"   ⚠️ Pre-load failed: {e}")
    
    # 2. Discover available cameras
    try:
        import cv2
        print("   📷 Discovering cameras...")
        available_cameras = []
        for i in range(5):  # Check indices 0-4
            cap = cv2.VideoCapture(i, cv2.CAP_ANY)
            if cap.isOpened():
                ret, _ = cap.read()
                if ret:
                    available_cameras.append(i)
                    print(f"      Found camera at index {i}")
                cap.release()
        
        # Store in app config for frontend to query
        app.config['AVAILABLE_CAMERAS'] = available_cameras
        print(f"   ✅ Cameras discovered: {available_cameras}")
    except Exception as e:
        print(f"   ⚠️ Camera discovery failed: {e}")
        app.config['AVAILABLE_CAMERAS'] = [0, 2]  # Fallback defaults

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🚀 STARTING HEALTH MONITORING SYSTEM BACKEND")
    print("="*50)
    
    # Pre-initialize function is DISABLED per user request (moved to Clearance page)
    # pre_initialize_ai_and_cameras()
    
    print("\n📍 API available at: http://127.0.0.1:5000")
    print("🔌 WebSocket available at: ws://127.0.0.1:5000")
    print("📋 Real-time updates ENABLED")
    print("="*50 + "\n")
    
    socketio.run(app, debug=True, host='0.0.0.0', port=5000, use_reloader=False, allow_unsafe_werkzeug=True)