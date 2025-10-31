from sqlalchemy import create_engine

# ✅ Correct format (no double @)
DB_URL = "mysql+pymysql://root:_5Cr]92@@localhost:3306/vital_signs_db"

# ❌ WRONG: "mysql+pymysql://root:_5Cr]92@@localhost..."
# That double '@' breaks parsing.

# 🩵 Corrected version (single @):
DB_URL = "mysql+pymysql://root:_5Cr]92%40@localhost:3306/vital_signs_db"
# Note: %40 is URL encoding for '@' — we need this since your password has '@'

engine = create_engine(DB_URL, echo=True)

def get_connection():
    try:
        conn = engine.connect()
        print("✅ Connected to MySQL via SQLAlchemy!")
        return conn
    except Exception as e:
        print("❌ SQLAlchemy connection failed:", e)
