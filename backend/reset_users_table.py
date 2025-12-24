from app.utils.db import engine, Base
from app.models.user_model import User
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def reset_users_table():
    print("WARNING: This will drop the 'users' table and recreate it.")
    with engine.connect() as conn:
        try:
            # Disable FK checks
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
            
            # Drop the users table
            conn.execute(text("DROP TABLE IF EXISTS users;"))
            print("✅ Dropped 'users' table.")
            
            # Re-enable FK checks
            conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
            
            # Recreate it using SQLAlchemy Metadata
            User.__table__.create(engine)
            print("✅ Recreated 'users' table with correct schema.")
            
        except Exception as e:
            print(f"❌ Error resetting table: {e}")

if __name__ == "__main__":
    reset_users_table()
