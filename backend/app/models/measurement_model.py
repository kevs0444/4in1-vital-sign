from sqlalchemy import Column, String, Float, DateTime, Integer, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.utils.db import Base
import string
import random
import datetime

def generate_measurement_id():
    """Generates a custom ID like MEAS-YYYYMMDD-XXXXXX"""
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"MEAS-{date_str}-{random_str}"

class Measurement(Base):
    __tablename__ = "measurements"

    id = Column(String(30), primary_key=True, unique=True, default=generate_measurement_id)
    user_id = Column(String(20), ForeignKey('users.user_id'), nullable=True) # Nullable for guest users
    
    # Timestamp of the measurement
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Vital Signs
    temperature = Column(Float, nullable=True) # Celsius
    systolic = Column(Integer, nullable=True) # mmHg
    diastolic = Column(Integer, nullable=True) # mmHg
    heart_rate = Column(Integer, nullable=True) # BPM
    spo2 = Column(Integer, nullable=True) # %
    respiratory_rate = Column(Integer, nullable=True) # BPM
    weight = Column(Float, nullable=True) # kg
    height = Column(Float, nullable=True) # cm
    bmi = Column(Float, nullable=True) 

    # AI Analysis Results
    risk_level = Column(Float, nullable=True) # Raw score
    risk_category = Column(String(50), nullable=True) # "Low", "Medium", "High"

    # Sharing Status
    email_sent = Column(Integer, default=0) 
    receipt_printed = Column(Integer, default=0) 

    # Relationships
    user = relationship("User", back_populates="measurements")
    recommendation = relationship("Recommendation", back_populates="measurement", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Measurement(id={self.id}, user_id={self.user_id}, date={self.created_at})>"
