from typing import Any, List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api import deps
from app.models.protheus import PAC010

router = APIRouter()

@router.get("/{custo}", response_model=List[dict])
def read_movements(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get movements for a specific project (CC).
    """
    # Assuming PAC_CUSTO links to CTT_CUSTO
    movements = db.query(PAC010).filter(PAC010.PAC_CUSTO == custo).all()
    return movements

