from sqlalchemy import Column, Integer, String, Enum, DateTime, Boolean, ForeignKey, TIMESTAMP
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.utils.db import Base
import enum
import datetime
import random

class VerificationTypeEnum(enum.Enum):
    email = "email"
    mobile = "mobile"

def generate_verification_code_id():
    """Generate custom OTP ID in format: YYYY-XXXXXX-OTP (e.g., 2024-123456-OTP)"""
    year = datetime.datetime.now().year
    random_digits = ''.join([str(random.randint(0, 9)) for _ in range(6)])
    return f"{year}-{random_digits}-OTP"

class VerificationCode(Base):
    __tablename__ = "verification_codes"

    code_id = Column(String(20), primary_key=True, unique=True, default=generate_verification_code_id)
    user_id = Column(String(20), ForeignKey('users.user_id'), nullable=False)
    otp_code = Column(String(6), nullable=False)
    verification_type = Column(Enum(VerificationTypeEnum), nullable=False, default=VerificationTypeEnum.email)
    identifier = Column(String(100), nullable=False) # email or mobile number
    is_used = Column(Boolean, default=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(TIMESTAMP, server_default=func.now())

    # Relationship to User
    user = relationship("User", back_populates="verification_codes")

    def __repr__(self):
        return f"<VerificationCode(code_id='{self.code_id}', code='{self.otp_code}', user_id='{self.user_id}', type='{self.verification_type}')>"
