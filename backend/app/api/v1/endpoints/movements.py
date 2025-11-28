from typing import Any, List
import logging
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from sqlalchemy.inspection import inspect
from app.api import deps
from app.models.protheus import PAC010

logger = logging.getLogger(__name__)

router = APIRouter()

def object_as_dict(obj):
    """
    Converts an SQLAlchemy model instance into a dictionary.
    Handles potential serialization issues by ensuring values are JSON compatible if needed.
    """
    if not obj:
        return {}
    
    result = {}
    for c in inspect(obj).mapper.column_attrs:
        val = getattr(obj, c.key)
        # Handle potential bytes/binary data from legacy DBs that might break JSON
        if isinstance(val, bytes):
            try:
                val = val.decode('utf-8', errors='ignore')
            except:
                val = str(val)
        
        # Clean strings (Protheus often has trailing spaces)
        if isinstance(val, str):
            val = val.strip()
            
        result[c.key] = val
    return result

@router.get("/{custo}", response_model=List[dict])
def read_movements(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get movements for a specific project (CC).
    """
    try:
        # Filter by PAC_CUSTO and exclude deleted records
        # In Protheus, D_E_L_E_T_ = 'D' means deleted, None/''/' ' means active
        movements = db.query(PAC010)\
            .filter(PAC010.PAC_CUSTO == custo)\
            .filter(or_(
                PAC010.D_E_L_E_T_.is_(None),
                PAC010.D_E_L_E_T_ == '',
                PAC010.D_E_L_E_T_ != 'D'
            ))\
            .order_by(PAC010.PAC_DATA.desc())\
            .all()
        
        # Convert SQLAlchemy objects to dictionaries
        result = [object_as_dict(mov) for mov in movements]
        return result
    except Exception as e:
        # Log error and return empty list
        logger.error(f"Error reading movements for {custo}: {e}", exc_info=True)
        return []

