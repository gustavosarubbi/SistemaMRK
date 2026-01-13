from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import List, Any, Optional
from app.api import deps
from app.services.faturamento_service import faturamento_service

router = APIRouter()

@router.get("/", response_model=List[Any])
def get_faturamento(
    db: Session = Depends(deps.get_db),
    custo: Optional[str] = Query(None, description="Filtrar por centro de custo/projeto"),
    start_date: Optional[str] = Query(None, description="Data inicial (YYYYMMDD)"),
    end_date: Optional[str] = Query(None, description="Data final (YYYYMMDD)")
):
    """
    Retorna os dados de faturamento categorizados com filtros.
    """
    return faturamento_service.get_faturamento_data(
        db, 
        custo=custo, 
        start_date=start_date, 
        end_date=end_date
    )
