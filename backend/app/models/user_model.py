from sqlalchemy import Column, Integer, String, Enum, Date, DateTime
from sqlalchemy.orm import relationship
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
    rfid_tag = Column(String(100), unique=True, nullable=True)  # Unique RFID per user
    firstname = Column(String(100), nullable=False)
    lastname = Column(String(100), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    school_number = Column(String(20), unique=True, nullable=True)  # Unique school number
    birthday = Column(Date, nullable=True)
    age = Column(Integer, nullable=False)
    sex = Column(Enum(SexEnum), nullable=False)
    mobile_number = Column(String(15), unique=True, nullable=False)  # Unique mobile number
    email = Column(String(100), unique=True, nullable=False)  # Unique email
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime)

    # Relationship to VerificationCode
    verification_codes = relationship("VerificationCode", back_populates="user", cascade="all, delete-orphan")

    # Relationship to Measurement
    measurements = relationship("Measurement", back_populates="user", cascade="all, delete-orphan")

    # Relationship to Recommendation
    recommendations = relationship("Recommendation", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(user_id={self.user_id}, name='{self.firstname} {self.lastname}', role={self.role})>"