from sqlalchemy import create_engine, Column, Integer, String, Enum, Date, TIMESTAMP
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import enum

# ---------- DATABASE CONNECTION ----------
# Replace with your actual MySQL credentials if different
DB_URL = "mysql+pymysql://root:_5Cr]92%40@localhost:3306/vital_signs_db"

engine = create_engine(DB_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)
Base = declarative_base()


# ---------- ENUMS ----------
class RoleEnum(enum.Enum):
    Admin = "Admin"
    Doctor = "Doctor"
    Nurse = "Nurse"
    Employee = "Employee"
    Student = "Student"

class SexEnum(enum.Enum):
    Male = "Male"
    Female = "Female"


# ---------- TABLES ----------
class User(Base):
    __tablename__ = "users"

    user_id = Column(String(20), primary_key=True)
    rfid_tag = Column(String(100))
    firstname = Column(String(100))
    lastname = Column(String(100))
    role = Column(Enum(RoleEnum))
    school_number = Column(String(20))  # ✅ added this field
    birthday = Column(Date)
    age = Column(Integer)
    sex = Column(Enum(SexEnum))
    mobile_number = Column(String(15))
    email = Column(String(100))
    password = Column(String(255))
    created_at = Column(TIMESTAMP)


# ---------- TEST CONNECTION ----------
if __name__ == "__main__":
    print("🔄 Connecting to database...")
    Base.metadata.create_all(engine)
    print("✅ Tables created successfully in 'vital_signs_db'!")
