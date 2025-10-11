from app import create_app

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting Health Monitoring System Backend...")
    print("📍 API available at: http://127.0.0.1:5000")
    print("📋 Available endpoints:")
    print("   GET  /api/hello")
    print("   GET  /api/status")
    print("   GET  /api/health")
    print("   POST /api/sensor/connect")
    print("   GET  /api/sensor/status")
    print("   POST /api/sensor/temperature/start")
    print("   POST /api/sensor/max30102/start")
    print("   POST /api/sensor/measurement/stop")
    print("   GET  /api/sensor/measurements")
    print("")
    
    app.run(debug=True, host='127.0.0.1', port=5000)