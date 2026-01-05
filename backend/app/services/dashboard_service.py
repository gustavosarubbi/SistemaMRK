"""
Serviço principal do dashboard que orquestra outros serviços.
"""
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from app.services.kpi_service import KpiService
from app.services.project_status_service import ProjectStatusService
from app.services.chart_data_service import ChartDataService
from app.core.cache import cache
import hashlib
import json

class DashboardService:
    """Serviço principal do dashboard."""
    
    CACHE_TTL = 120  # 2 minutos
    
    @staticmethod
    def _generate_cache_key(start_date: Optional[str], end_date: Optional[str]) -> str:
        """Gera chave de cache única."""
        key_data = {
            "start_date": start_date or "",
            "end_date": end_date or "",
            "endpoint": "dashboard_summary"
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return f"dashboard_summary:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    @staticmethod
    def get_summary(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Obtém resumo completo do dashboard.
        Usa cache e orquestra outros serviços.
        """
        cache_key = DashboardService._generate_cache_key(start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            # Get KPIs
            kpis = KpiService.calculate_all_kpis(db, start_date, end_date)
            
            # Get status stats
            status_stats = ProjectStatusService.calculate_status_stats(db, start_date, end_date)
            
            # Add status counts to KPIs
            kpis["in_execution"] = status_stats["in_execution"]
            kpis["ending_soon"] = status_stats["ending_soon"]
            
            # Get projects
            projects_in_execution = ProjectStatusService.get_projects_in_execution(
                db, start_date, end_date, limit=10
            )
            projects_ending_soon = ProjectStatusService.get_projects_ending_soon(
                db, start_date, end_date, limit=10
            )
            
            # Get chart data
            charts = {
                "top_projects": ChartDataService.get_top_projects(db, start_date, end_date),
                "trend": ChartDataService.get_trend_data(db, start_date, end_date),
                "status_distribution": ChartDataService.get_status_distribution(db, start_date, end_date),
                "execution_by_percent": ChartDataService.get_execution_by_percent(db, start_date, end_date)
            }
            
            result = {
                "kpis": kpis,
                "charts": charts,
                "status_stats": status_stats,
                "projects_in_execution": projects_in_execution,
                "projects_ending_soon": projects_ending_soon
            }
            
            # Cache result
            cache.set(cache_key, result, ttl_seconds=DashboardService.CACHE_TTL)
            return result
            
        except Exception as e:
            import traceback
            error_msg = f"Error generating dashboard summary: {e}"
            print(error_msg)
            traceback.print_exc()
            
            # Return empty structure on error
            return {
                "kpis": {
                    "total_projects": 0,
                    "total_budget": 0.0,
                    "total_realized": 0.0,
                    "total_billing": 0.0,
                    "balance": 0.0,
                    "financial_balance": 0.0,
                    "in_execution": 0,
                    "ending_soon": 0
                },
                "charts": {
                    "top_projects": [],
                    "trend": [],
                    "status_distribution": [],
                    "execution_by_percent": []
                },
                "status_stats": {
                    "in_execution": 0,
                    "ending_soon": 0,
                    "rendering_accounts": 0,
                    "rendering_accounts_60days": 0,
                    "not_started": 0
                },
                "projects_in_execution": [],
                "projects_ending_soon": []
            }
    
    @staticmethod
    def get_kpis_only(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Obtém apenas KPIs."""
        kpis = KpiService.calculate_all_kpis(db, start_date, end_date)
        status_stats = ProjectStatusService.calculate_status_stats(db, start_date, end_date)
        kpis["in_execution"] = status_stats["in_execution"]
        kpis["ending_soon"] = status_stats["ending_soon"]
        return kpis
    
    @staticmethod
    def get_projects_only(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        limit: int = 10
    ) -> Dict[str, Any]:
        """Obtém apenas projetos."""
        return {
            "projects_in_execution": ProjectStatusService.get_projects_in_execution(
                db, start_date, end_date, limit
            ),
            "projects_ending_soon": ProjectStatusService.get_projects_ending_soon(
                db, start_date, end_date, limit
            )
        }
    
    @staticmethod
    def get_charts_only(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, Any]:
        """Obtém apenas dados de gráficos."""
        return {
            "top_projects": ChartDataService.get_top_projects(db, start_date, end_date),
            "trend": ChartDataService.get_trend_data(db, start_date, end_date),
            "status_distribution": ChartDataService.get_status_distribution(db, start_date, end_date),
            "execution_by_percent": ChartDataService.get_execution_by_percent(db, start_date, end_date)
        }
    
    @staticmethod
    def get_status_stats_only(
        db: Session,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Dict[str, int]:
        """Obtém apenas estatísticas de status."""
        return ProjectStatusService.calculate_status_stats(db, start_date, end_date)


