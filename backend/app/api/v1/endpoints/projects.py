from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.api import deps
from app.models.protheus import CTT010, PAC010, PAD010
from app.models.base import Base
from sqlalchemy.inspection import inspect

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

@router.get("/", response_model=dict)
def read_projects(
    db: Session = Depends(deps.get_db),
    page: int = 1,
    limit: int = 10,
    search: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Retrieve projects (CTT010) with pagination and budget usage info.
    """
    try:
        # Calculate skip
        skip = (page - 1) * limit
        
        # Base query
        query = db.query(CTT010)
        
        # Apply filters
        if search:
            search_filter = f"%{search}%"
            query = query.filter(
                (CTT010.CTT_DESC01.ilike(search_filter)) | 
                (CTT010.CTT_CUSTO.ilike(search_filter)) |
                (CTT010.CTT_NOMECO.ilike(search_filter))
            )
        
        if start_date:
            # Convert YYYY-MM-DD to YYYYMMDD
            d_start = start_date.replace("-", "")
            query = query.filter(CTT010.CTT_DTINI >= d_start)
            
        if end_date:
            d_end = end_date.replace("-", "")
            # Filter by start date up to this end date, or actual end date?
            # Assuming we want projects that started before or on this date
            query = query.filter(CTT010.CTT_DTINI <= d_end)
            
        # Get total count for pagination
        total = query.count()
        
        # Get paginated items
        projects = query.order_by(CTT010.CTT_CUSTO).offset(skip).limit(limit).all()
        
        # Enhance with realized budget (PAC010 sum)
        # Doing this in a loop for the page items is generally okay for small page sizes (10-50)
        # For larger datasets, a joined subquery would be more efficient
        data = []
        for p in projects:
            p_dict = object_as_dict(p)
            
            # Calculate realized amount
            realized = db.query(func.sum(PAC010.PAC_VALOR))\
                .filter(PAC010.PAC_CUSTO == p.CTT_CUSTO)\
                .scalar() or 0.0
                
            # Calculate Budget from PAD010
            budget = db.query(func.sum(PAD010.PAD_ORCADO))\
                .filter(PAD010.PAD_CUSTO == p.CTT_CUSTO)\
                .scalar() or 0.0
                
            p_dict['realized'] = float(realized)
            p_dict['budget'] = float(budget)
            p_dict['initial_balance'] = p.CTT_SALINI or 0.0 # Legacy/Fallback
            
            # Calculate percentage
            if budget > 0:
                p_dict['usage_percent'] = (realized / budget) * 100
            else:
                p_dict['usage_percent'] = 0.0
                
            data.append(p_dict)

        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    except Exception as e:
        print(f"Error reading projects: {e}")
        return {
            "data": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0
        }

@router.get("/{custo}", response_model=dict)
def read_project(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get specific project by Custo code.
    """
    project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
    if not project:
        return {} 
        
    p_dict = object_as_dict(project)
    
    # Add realized amount
    realized = db.query(func.sum(PAC010.PAC_VALOR))\
        .filter(PAC010.PAC_CUSTO == custo)\
        .scalar() or 0.0
    
    # Add Budget from PAD010
    budget = db.query(func.sum(PAD010.PAD_ORCADO))\
        .filter(PAD010.PAD_CUSTO == custo)\
        .scalar() or 0.0
    
    p_dict['realized'] = float(realized)
    p_dict['budget'] = float(budget)
    p_dict['initial_balance'] = project.CTT_SALINI or 0.0
    
    return p_dict
