from app import create_app
from app.utils.db import engine, text

# Test database connection
try:
    with engine.connect() as conn:
        result = conn.execute(text("SELECT DATABASE() as db_name"))
        db_name = result.fetchone()[0]  # Access by index
        print(f"✅ Database connected: {db_name}")
except Exception as e:
    print(f"❌ Database connection failed: {e}")
    exit(1)

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting Health Monitoring System Backend...")
    print("📍 API available at: http://127.0.0.1:5000")
    print("📋 Available endpoints:")
    
    # Main endpoints
    print("   MAIN:")
    print("     GET  /api/hello")
    print("     GET  /api/status")
    print("     GET  /api/health")
    print("     GET  /api/endpoints")
    
    # Sensor endpoints
    print("   SENSOR:")
    print("     POST /api/sensor/connect")
    print("     GET  /api/sensor/status")
    print("     POST /api/sensor/temperature/start")
    print("     POST /api/sensor/max30102/start")
    print("     POST /api/sensor/measurement/stop")
    print("     GET  /api/sensor/measurements")
    
    # Registration endpoints
    print("   REGISTER:")
    print("     POST /api/register/register")
    print("     POST /api/register/check-id")
    print("     GET  /api/register/test-connection")
    print("     GET  /api/register/users")
    
    app.run(debug=True, host='127.0.0.1', port=5000)