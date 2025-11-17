from sqlalchemy import Column, Integer, String, Enum, Date, DateTime
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

    user_id = Column(String(20), primary_key=True)
    rfid_tag = Column(String(100), nullable=False)
    firstname = Column(String(100), nullable=False)
    lastname = Column(String(100), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    school_number = Column(String(20), nullable=True)
    birthday = Column(Date, nullable=True)
    age = Column(Integer, nullable=False)
    sex = Column(Enum(SexEnum), nullable=False)
    mobile_number = Column(String(15), nullable=False)
    email = Column(String(100), nullable=False)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime)  # Changed to DateTime

    def __repr__(self):
        return f"<User(user_id={self.user_id}, name='{self.firstname} {self.lastname}', role={self.role})>"