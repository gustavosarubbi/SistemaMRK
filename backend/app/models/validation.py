from sqlalchemy import Column, String, DateTime, Integer, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.sql import func

Base = declarative_base()

class ValidationStatus(Base):
    __tablename__ = "VALIDATION_STATUS"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    table_name = Column(String(50), nullable=False, index=True)
    record_id = Column(String(100), nullable=False, index=True)
    status = Column(String(20), nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    validated_at = Column(DateTime, nullable=True)
    validated_by = Column(String(100), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    
    # Composite index for faster lookups
    __table_args__ = (
        {'extend_existing': True},
    )

