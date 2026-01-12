from sqlalchemy import Column, String, Float, DateTime, Integer, Text
from app.models.base import Base
from sqlalchemy.sql import func

class OFXTransaction(Base):
    __tablename__ = "OFX_TRANSACTIONS"
    
    id = Column(Integer, primary_key=True, autoincrement=True)
    bank_id = Column(String(20))
    acct_id = Column(String(50))
    trn_type = Column(String(20))
    dt_posted = Column(DateTime)
    amount = Column(Float)
    fitid = Column(String(100), unique=True, index=True)
    check_num = Column(String(50))
    memo = Column(Text)
    balance = Column(Float, nullable=True)
    project_id = Column(String(50), index=True) # ID of the associated project (CTT_CUSTO)
    
    # Validation fields
    validation_status = Column(String(20), default="PENDING") # PENDING, VALIDATED, DISCREPANCY
    validation_notes = Column(Text)
    validated_at = Column(DateTime)
    
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
