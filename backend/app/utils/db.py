from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError

# ---------- DATABASE CONNECTION ----------
# Use the exact password without quotes that works in mysql command line
DB_URL = "mysql+pymysql://root:_5Cr%5D92%40@localhost:3306/vital_signs_db"

print("🔧 Database configuration:")
print("   Database: vital_signs_db")
print("   User: root")
print("   Password: _5Cr]92@ (URL encoded)")

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