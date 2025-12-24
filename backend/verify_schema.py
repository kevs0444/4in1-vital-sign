from app.utils.db import engine
from sqlalchemy import text
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def verify_schema():
    with engine.connect() as conn:
        result = conn.execute(text("DESCRIBE users;"))
        columns = result.fetchall()
        print("\n--- Current Users Table Columns ---")
        for col in columns:
            print(f"- {col[0]} ({col[1]})")
        print("-----------------------------------\n")

if __name__ == "__main__":
    verify_schema()
