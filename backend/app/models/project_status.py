from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.models.base import Base

class ProjectStatus(Base):
    """Tabela para armazenar o status de finalização dos projetos"""
    __tablename__ = "PROJECT_STATUS"
    
    CTT_CUSTO = Column(String(50), primary_key=True, index=True)
    is_finalized = Column(Boolean, default=False, nullable=False)
    finalized_at = Column(DateTime(timezone=True), nullable=True)
    finalized_by = Column(String(100), nullable=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())



