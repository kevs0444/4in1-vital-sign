from flask import Blueprint, jsonify
from datetime import datetime
from sqlalchemy import text
import logging

logger = logging.getLogger(__name__)

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
        "timestamp": datetime.now().isoformat()
    })

@main_bp.route('/db-check', methods=['GET'])
def db_check():
    """Check database connection status"""
    try:
        from app.utils.db import engine
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        
        return jsonify({
            "connected": True,
            "status": "healthy",
            "message": "Database connection successful"
        }), 200
    except Exception as e:
        logger.error(f"Database check failed: {e}")
        return jsonify({
            "connected": False,
            "status": "error",
            "message": f"Database connection failed: {str(e)}"
        }), 500

@main_bp.route('/system-check', methods=['GET'])
def system_check():
    """
    Comprehensive system check that validates all critical components.
    Priority order: Database → Arduino → Auto-Tare
    Returns status for each component and overall system readiness.
    """
    system_status = {
        "timestamp": datetime.now().isoformat(),
        "components": {
            "database": {
                "status": "checking",
                "connected": False,
                "message": "Checking database connection..."
            },
            "arduino": {
                "status": "checking",
                "connected": False,
                "port": None,
                "message": "Checking Arduino connection..."
            },
            "auto_tare": {
                "status": "checking",
                "completed": False,
                "message": "Checking auto-tare status..."
            }
        },
        "overall_status": "checking",
        "system_ready": False,
        "can_proceed": False,
        "message": "Checking system components..."
    }
    
    # Priority 1: Check Arduino Connection
    try:
        from app.routes.sensor_routes import sensor_manager
        
        if sensor_manager.is_connected:
            system_status["components"]["arduino"] = {
                "status": "connected",
                "connected": True,
                "port": sensor_manager.port,
                "message": f"Arduino connected on {sensor_manager.port}"
            }
        else:
            system_status["components"]["arduino"] = {
                "status": "disconnected",
                "connected": False,
                "port": None,
                "message": "Arduino not connected"
            }
    except Exception as e:
        system_status["components"]["arduino"] = {
            "status": "error",
            "connected": False,
            "port": None,
            "message": f"Arduino check failed: {str(e)}"
        }
        print(f"❌ System check: Arduino check failed: {e}")

    # Priority 2: Check Auto-Tare Status (Dependent on Arduino)
    try:
        from app.routes.sensor_routes import sensor_manager
        
        if sensor_manager.auto_tare_completed:
            system_status["components"]["auto_tare"] = {
                "status": "completed",
                "completed": True,
                "message": "Auto-tare calibration completed"
            }
        elif sensor_manager.is_connected:
            system_status["components"]["auto_tare"] = {
                "status": "pending",
                "completed": False,
                "message": "Waiting for auto-tare..."
            }
        else:
            system_status["components"]["auto_tare"] = {
                "status": "not_applicable",
                "completed": False,
                "message": "Requires Arduino connection"
            }
    except Exception as e:
        system_status["components"]["auto_tare"] = {
            "status": "error",
            "completed": False,
            "message": f"Auto-tare check failed: {str(e)}"
        }
        print(f"❌ System check: Auto-tare check failed: {e}")

    # Priority 3: Check Database Connection
    try:
        from app.utils.db import engine
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        
        system_status["components"]["database"] = {
            "status": "connected",
            "connected": True,
            "message": "Database connection active"
        }
    except Exception as e:
        system_status["components"]["database"] = {
            "status": "error",
            "connected": False,
            "message": f"Database connection failed: {str(e)}"
        }
        # We don't return early anymore, so we can report Arduino status too
        print(f"❌ System check: Database connection failed: {e}")
    
    # Determine overall system status
    db_ok = system_status["components"]["database"]["connected"]
    arduino_ok = system_status["components"]["arduino"]["connected"]
    tare_ok = system_status["components"]["auto_tare"]["completed"]
    
    # Determine overall system status
    db_ok = system_status["components"]["database"]["connected"]
    arduino_ok = system_status["components"]["arduino"]["connected"]
    tare_ok = system_status["components"]["auto_tare"]["completed"]
    
    if not db_ok:
        system_status["overall_status"] = "database_error"
        # Even if DB is down, we successfully checked Arduino, so we see that status above.
        system_status["system_ready"] = False
        system_status["can_proceed"] = False # Cannot save data without DB
        system_status["message"] = "Database Error - Measurements cannot be saved"
    elif db_ok and arduino_ok and tare_ok:
        system_status["overall_status"] = "ready"
        system_status["system_ready"] = True
        system_status["can_proceed"] = True
        system_status["message"] = "All systems operational - Ready for use"
    elif db_ok and arduino_ok and not tare_ok:
        system_status["overall_status"] = "waiting_auto_tare"
        system_status["system_ready"] = False
        system_status["can_proceed"] = True
        system_status["message"] = "System connected - Auto-tare in progress..."
    elif db_ok and not arduino_ok:
        system_status["overall_status"] = "offline_mode"
        system_status["system_ready"] = False
        system_status["can_proceed"] = True
        system_status["message"] = "Offline mode - Manual input available"
    else:
        system_status["overall_status"] = "critical_error"
        system_status["system_ready"] = False
        system_status["can_proceed"] = False
        system_status["message"] = "Critical system error - Cannot proceed"
    
    return jsonify(system_status), 200

@main_bp.route('/endpoints', methods=['GET'])
def list_endpoints():
    """List all available API endpoints"""
    endpoints = {
        "main": {
            "GET /api/hello": "Simple hello message",
            "GET /api/status": "API status",
            "GET /api/health": "Health check",
            "GET /api/db-check": "Database health check",
            "GET /api/system-check": "Comprehensive system check",
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