from sqlalchemy import Column, String, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.utils.db import Base
import string
import random
import datetime

def generate_recommendation_id():
    """Generates a custom ID like REC-YYYYMMDD-XXXXXX"""
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    random_str = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"REC-{date_str}-{random_str}"

class Recommendation(Base):
    __tablename__ = "recommendations"

    id = Column(String(30), primary_key=True, unique=True, default=generate_recommendation_id)
    measurement_id = Column(String(30), ForeignKey('measurements.id'), nullable=False)
    user_id = Column(String(20), ForeignKey('users.user_id'), nullable=True)
    
    # Flattened structure
    medical_action = Column(Text, nullable=True)
    preventive_strategy = Column(Text, nullable=True)
    wellness_tips = Column(Text, nullable=True)
    provider_guidance = Column(Text, nullable=True)

    # Relationships
    measurement = relationship("Measurement", back_populates="recommendation")
    user = relationship("User", back_populates="recommendations")

    def __repr__(self):
        return f"<Recommendation(id={self.id}, measurement_id={self.measurement_id})>"
