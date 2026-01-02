import sys
import os
sys.path.append(os.getcwd())

from app.utils.db import engine, text

def check_tables():
    tables = ['users', 'measurements', 'recommendations']
    for table in tables:
        print(f"\nColumns in '{table}':")
        try:
            with engine.connect() as conn:
                result = conn.execute(text(f"DESCRIBE {table}"))
                for row in result:
                    print(f" - {row[0]}: {row[1]}")
        except Exception as e:
            print(f" ❌ Error describing {table}: {e}")

if __name__ == "__main__":
    check_tables()
