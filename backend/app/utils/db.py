from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError

import os

# ---------- DATABASE CONNECTION ----------
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '_5Cr%5D92%40') # Default to encoded fallback if missing
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '3306')
DB_NAME = os.getenv('DB_NAME', 'vital_signs_db')

DB_URL = f"mysql+pymysql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

print("🔧 Database configuration:")
print(f"   Database: {DB_NAME}")
print(f"   User: {DB_USER}")
print("   Password: [HIDDEN]")

try:
    engine = create_engine(
        DB_URL,
        echo=True,
        pool_pre_ping=True,
        pool_recycle=280,
    )
    
    # Test connection immediately using text() for raw SQL
    with engine.connect() as conn:
        result = conn.execute(text("SELECT DATABASE() as db_name, NOW() as server_time"))
        db_info = result.fetchone()
        # Access tuple by index since it's not a dictionary
        print(f"✅ Connected to database: {db_info[0]}")
        print(f"✅ Server time: {db_info[1]}")
    
    print("✅ Database engine created successfully")
    
except Exception as e:
    print(f"❌ Error creating database engine: {e}")
    raise

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        db.rollback()
        raise e
    finally:
        db.close()