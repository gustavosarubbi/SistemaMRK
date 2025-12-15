from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from app.api import deps
from app.services.dashboard_service import DashboardService
from app.core.cache import cache

router = APIRouter()

# TTL do cache em segundos (2 minutos)
CACHE_TTL = 120

@router.delete("/cache/clear")
def clear_dashboard_cache(
    current_user: str = Depends(deps.get_current_user),
) -> Dict[str, Any]:
    """
    Limpa o cache do dashboard.
    Útil quando dados foram atualizados e precisam ser recalculados.
    """
    cache.cleanup_expired()
    return {
        "message": "Cache do dashboard limpo com sucesso",
        "status": "success"
    }

@router.get("/summary", response_model=Dict[str, Any])
def get_dashboard_summary(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get aggregated dashboard data with caching.
    Mantido para compatibilidade com frontend existente.
    """
    result = DashboardService.get_summary(db, start_date, end_date)
    
    # Adiciona headers de cache HTTP
    response.headers["X-Cache"] = "MISS"  # Serviço já gerencia cache internamente
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
    
    return result

@router.get("/kpis", response_model=Dict[str, Any])
def get_dashboard_kpis(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get only KPIs data.
    Otimizado para carregamento rápido da aba principal.
    """
    kpis = DashboardService.get_kpis_only(db, start_date, end_date)
    
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
    return kpis

@router.get("/projects", response_model=Dict[str, Any])
def get_dashboard_projects(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    limit: int = 10,
) -> Any:
    """
    Get only projects data (in execution and ending soon).
    Otimizado para carregamento da seção de projetos.
    """
    projects = DashboardService.get_projects_only(db, start_date, end_date, limit)
    
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
    return projects

@router.get("/charts", response_model=Dict[str, Any])
def get_dashboard_charts(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get only chart data.
    Otimizado para carregamento da seção de análises.
    """
    charts = DashboardService.get_charts_only(db, start_date, end_date)
    
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
    return charts

@router.get("/status-stats", response_model=Dict[str, int])
def get_dashboard_status_stats(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get only status statistics.
    Otimizado para carregamento rápido de estatísticas.
    """
    stats = DashboardService.get_status_stats_only(db, start_date, end_date)
    
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
    return stats

@router.get("/projects-list", response_model=Dict[str, Any])
def get_projects_list(
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    type: str = "in_execution",
    limit: int = 10,
    offset: int = 0,
    sort_by: str = "days_remaining",
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get list of projects for lazy loading.
    Types: in_execution, ending_soon
    Sort options: days_remaining, budget, usage_percent, name
    
    Mantido para compatibilidade com sidebar de projetos.
    """
    from app.services.project_status_service import ProjectStatusService
    
    try:
        # Get projects based on type
        if type == "in_execution":
            all_projects = ProjectStatusService.get_projects_in_execution(
                db, start_date, end_date, limit=1000
            )
        elif type == "ending_soon":
            all_projects = ProjectStatusService.get_projects_ending_soon(
                db, start_date, end_date, limit=1000
            )
        else:
            return {
                "data": [],
                "total": 0,
                "limit": limit,
                "offset": offset
            }
        
        total = len(all_projects)
        
        # Sort results
        if sort_by == "days_remaining":
            all_projects.sort(key=lambda x: x["daysRemaining"] if x["daysRemaining"] is not None else 9999)
        elif sort_by == "budget":
            all_projects.sort(key=lambda x: x["budget"], reverse=True)
        elif sort_by == "usage_percent":
            all_projects.sort(key=lambda x: x["usage_percent"], reverse=True)
        elif sort_by == "name":
            all_projects.sort(key=lambda x: x["name"])
        
        # Apply pagination
        projects = all_projects[offset:offset + limit]
        
        return {
            "data": projects,
            "total": total,
            "limit": limit,
            "offset": offset
        }
    except Exception as e:
        import traceback
        error_msg = f"Error getting projects list: {e}"
        print(error_msg)
        traceback.print_exc()
        return {
            "data": [],
            "total": 0,
            "limit": limit,
            "offset": offset
        }
