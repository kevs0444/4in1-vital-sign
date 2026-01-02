import sys
import os
sys.path.append(os.getcwd())

from app.utils.db import engine, text

def migrate():
    cmds = [
        "ALTER TABLE users ADD COLUMN middlename VARCHAR(100) AFTER firstname;",
        "ALTER TABLE users ADD COLUMN suffix VARCHAR(20) AFTER lastname;",
        "ALTER TABLE measurements ADD COLUMN respiratory_rate INTEGER AFTER spo2;"
    ]
    
    with engine.connect() as conn:
        for cmd in cmds:
            print(f"Executing: {cmd}")
            try:
                conn.execute(text(cmd))
                conn.commit()
                print(" ✅ Success")
            except Exception as e:
                print(f" ❌ Error: {e}")

if __name__ == "__main__":
    migrate()
