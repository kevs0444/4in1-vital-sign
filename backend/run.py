from app import create_app

app = create_app()

if __name__ == '__main__':
    print("🚀 Starting MediScan Flask Server...")
    print("📍 Server running on: http://localhost:5000")
    print("🔧 Body Temperature API ready for testing!")
    print("📡 Endpoints:")
    print("   - http://localhost:5000/api/status")
    print("   - http://localhost:5000/api/sensor/temp/start")
    print("   - http://localhost:5000/api/sensor/temp/data")
    
    app.run(debug=True, host='0.0.0.0', port=5000)