from app.utils.db import engine, get_db
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def check_data():
    with engine.connect() as conn:
        print("\n--- Current Data in Users Table ---")
        try:
            # Select * to see whatever columns actually exist
            result = conn.execute(text("SELECT * FROM users"))
            keys = result.keys()
            print(f"Columns: {keys}")
            
            rows = result.fetchall()
            for row in rows:
                print(row)
        except Exception as e:
            print(f"Error reading data: {e}")
        print("-----------------------------------\n")

if __name__ == "__main__":
    check_data()
