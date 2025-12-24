from app.utils.db import engine
from sqlalchemy import text
import sys
import os

# Ensure we can import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def update_schema():
    print("Starting schema update...")
    with engine.connect() as conn:
        # 1. Add approval_status
        try:
            print("Attempting to add 'approval_status' column...")
            # Check if column exists first to avoid error spam? Or just try/except.
            # Simple ALTER IGNORE is not standard.
            conn.execute(text("ALTER TABLE users ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved';"))
            print("✅ Added 'approval_status' column.")
        except Exception as e:
            print(f"ℹ️ Note on adding 'approval_status': {e}")

        # 2. Drop mobile_number
        try:
            print("Attempting to drop 'mobile_number' column...")
            conn.execute(text("ALTER TABLE users DROP COLUMN mobile_number;"))
            print("✅ Dropped 'mobile_number' column.")
        except Exception as e:
            print(f"ℹ️ Note on dropping 'mobile_number': {e}")
            
        conn.commit()
        print("Schema update process finished.")

if __name__ == "__main__":
    update_schema()
