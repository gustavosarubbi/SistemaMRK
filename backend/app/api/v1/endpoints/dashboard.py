from typing import Any, Dict
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api import deps
from app.models.protheus import CTT010, PAC010, PAD010

router = APIRouter()

@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get aggregated dashboard data.
    """
    try:
        # 1. Total Projects count
        # Use select count(*) to be safe
        total_projects = db.query(func.count(CTT010.CTT_CUSTO)).scalar() or 0
        
        # 2. Total Budget (Orçado) - PAD010.PAD_ORCADO
        # Check for NULLs
        total_budget = db.query(func.sum(PAD010.PAD_ORCADO)).scalar() or 0.0
        
        # 3. Total Realized (Realizado) - Sum of all PAC_VALOR
        # PAC010 can be huge, sum might be slow. Ensure index on VALOR if possible, but usually it's full scan.
        # If slow, we might need a materialized view or pre-calc table.
        total_realized = db.query(func.sum(PAC010.PAC_VALOR)).scalar() or 0.0
        
        # 4. Top Projects by Budget
        top_projects_query = db.query(
            CTT010.CTT_DESC01, 
            func.sum(PAD010.PAD_ORCADO).label('budget')
        ).join(PAD010, PAD010.PAD_CUSTO == CTT010.CTT_CUSTO)\
        .group_by(CTT010.CTT_DESC01)\
        .order_by(func.sum(PAD010.PAD_ORCADO).desc())\
        .limit(5).all()
        
        top_projects = [
            {"name": (p[0] or "Sem Nome").strip(), "value": p[1] or 0.0} for p in top_projects_query
        ]
        
        return {
            "kpis": {
                "total_projects": total_projects,
                "total_budget": float(total_budget),
                "total_realized": float(total_realized),
                "balance": float(total_budget - total_realized)
            },
            "charts": {
                "top_projects": top_projects,
            }
        }
    except Exception as e:
        print(f"Error generating dashboard summary: {e}")
        return {
            "kpis": {
                "total_projects": 0,
                "total_budget": 0.0,
                "total_realized": 0.0,
                "balance": 0.0
            },
            "charts": {
                "top_projects": [],
            }
        }
