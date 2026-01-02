import sys
import os
sys.path.append(os.getcwd())

from app.utils.db import engine, text

def check_tables():
    tables = ['users', 'measurements', 'recommendations']
    for table in tables:
        print(f"Table: {table}")
        try:
            with engine.connect() as conn:
                result = conn.execute(text(f"DESCRIBE {table}"))
                cols = [row[0] for row in result]
                print(f"Cols: {', '.join(cols)}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    check_tables()
