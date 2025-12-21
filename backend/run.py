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
    print("\n" + "="*50)
    print("🚀 STARTING HEALTH MONITORING SYSTEM BACKEND")
    print("="*50)
    print("📍 API available at: http://127.0.0.1:5000")
    print("📋 Waiting for frontend connection...")
    print("="*50 + "\n")
    
    # Disable reloader to prevent double execution and confusion
    app.run(debug=True, host='127.0.0.1', port=5000, use_reloader=False)