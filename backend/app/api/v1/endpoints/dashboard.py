from typing import Any, Dict, Optional
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
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get aggregated dashboard data.
    """
    try:
        # Build filters based on CTT010 dates
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)

        # 1. Total Projects count
        total_projects = db.query(func.count(CTT010.CTT_CUSTO))\
            .filter(*filters)\
            .scalar() or 0
        
        # Get custos that match the date filter first (to avoid collation issues in JOINs)
        custos_list = []
        if filters:
            custos_query = db.query(CTT010.CTT_CUSTO).filter(*filters)
            custos_list = [row[0] for row in custos_query.all()]
        
        # 2. Total Budget (Orçado) - PAD010.PAD_ORCADO
        if filters and custos_list:
            total_budget = db.query(func.sum(PAD010.PAD_ORCADO))\
                .filter(PAD010.PAD_CUSTO.in_(custos_list))\
                .scalar() or 0.0
        elif not filters:
            total_budget = db.query(func.sum(PAD010.PAD_ORCADO)).scalar() or 0.0
        else:
            total_budget = 0.0
        
        # 3. Total Realized (Realizado) - Sum of all PAC_VALOR
        if filters and custos_list:
            total_realized = db.query(func.sum(PAC010.PAC_VALOR))\
                .filter(PAC010.PAC_CUSTO.in_(custos_list))\
                .scalar() or 0.0
        elif not filters:
            total_realized = db.query(func.sum(PAC010.PAC_VALOR)).scalar() or 0.0
        else:
            total_realized = 0.0
        
        # 4. Top Projects by Budget
        # Aggregate budget by custo first, then join with CTT010 to get description
        if filters and custos_list:
            # Get budget aggregated by custo
            budget_by_custo = db.query(
                PAD010.PAD_CUSTO,
                func.sum(PAD010.PAD_ORCADO).label('budget')
            ).filter(PAD010.PAD_CUSTO.in_(custos_list))\
            .group_by(PAD010.PAD_CUSTO)\
            .order_by(func.sum(PAD010.PAD_ORCADO).desc())\
            .limit(5).all()
            
            # Get descriptions for these custos
            custos_for_top = [row[0] for row in budget_by_custo]
            descriptions_query = db.query(CTT010.CTT_CUSTO, CTT010.CTT_DESC01)\
                .filter(CTT010.CTT_CUSTO.in_(custos_for_top)).all()
            descriptions = {row[0]: row[1] for row in descriptions_query}
            
            top_projects_query = [
                (descriptions.get(custo, "Sem Nome"), budget)
                for custo, budget in budget_by_custo
            ]
        elif not filters:
            # Get budget aggregated by custo
            budget_by_custo = db.query(
                PAD010.PAD_CUSTO,
                func.sum(PAD010.PAD_ORCADO).label('budget')
            ).group_by(PAD010.PAD_CUSTO)\
            .order_by(func.sum(PAD010.PAD_ORCADO).desc())\
            .limit(5).all()
            
            # Get descriptions for these custos
            custos_for_top = [row[0] for row in budget_by_custo]
            descriptions_query = db.query(CTT010.CTT_CUSTO, CTT010.CTT_DESC01)\
                .filter(CTT010.CTT_CUSTO.in_(custos_for_top)).all()
            descriptions = {row[0]: row[1] for row in descriptions_query}
            
            top_projects_query = [
                (descriptions.get(custo, "Sem Nome"), budget)
                for custo, budget in budget_by_custo
            ]
        else:
            top_projects_query = []
        
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
        import traceback
        error_msg = f"Error generating dashboard summary: {e}"
        print(error_msg)
        traceback.print_exc()  # Print full traceback for debugging
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
