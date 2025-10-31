from sqlalchemy import create_engine, Column, String, Integer, Date, Enum, TIMESTAMP
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base, sessionmaker
import enum

# Database URL (password @ encoded as %40)
DB_URL = "mysql+pymysql://root:_5Cr]92%40@localhost:3306/vital_signs_db"

engine = create_engine(DB_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()

class RoleEnum(enum.Enum):
    Admin = "Admin"
    Doctor = "Doctor"
    Nurse = "Nurse"
    Employee = "Employee"
    Student = "Student"

class SexEnum(enum.Enum):
    Male = "Male"
    Female = "Female"

class User(Base):
    __tablename__ = "users"
    user_id = Column(String(20), primary_key=True)   # e.g. student/employee ID
    rfid_tag = Column(String(100), unique=True)
    firstname = Column(String(100))
    lastname = Column(String(100))
    role = Column(Enum(RoleEnum))
    birthday = Column(Date)
    age = Column(Integer)
    sex = Column(Enum(SexEnum))
    mobile_number = Column(String(15))
    email = Column(String(100), unique=True)
    password = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

def get_connection():
    try:
        conn = engine.connect()
        print("✅ Connected to MySQL via SQLAlchemy!")
        return conn
    except Exception as e:
        print("❌ Connection failed:", e)
        return None

def get_db_session():
    try:
        return SessionLocal()
    except Exception as e:
        print("❌ Error creating DB session:", e)
        return None

if __name__ == "__main__":
    Base.metadata.create_all(engine)
    get_connection()
