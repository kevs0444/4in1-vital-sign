from sqlalchemy import Column, Integer, String, Enum, Date, TIMESTAMP
from sqlalchemy.sql import func
from app.utils.db import Base
import enum

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

    user_id = Column(Integer, primary_key=True, autoincrement=True)
    rfid_tag = Column(String(100), nullable=False)
    firstname = Column(String(100), nullable=False)
    lastname = Column(String(100), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    birthday = Column(Date, nullable=False)
    age = Column(Integer, nullable=False)
    sex = Column(Enum(SexEnum), nullable=False)
    mobile_number = Column(String(15), nullable=False)
    email = Column(String(100), nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())
