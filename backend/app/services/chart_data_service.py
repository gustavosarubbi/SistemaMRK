"""
Serviço para geração de dados para gráficos.
"""
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from datetime import datetime, timedelta
from app.models.protheus import CTT010, PAD010, SE2010
from app.core.cache import cache
import hashlib
import json

class ChartDataService:
    """Serviço para geração de dados de gráficos."""
    
    CACHE_TTL = 120  # 2 minutos
    
    @staticmethod
    def _generate_cache_key(prefix: str, start_date: Optional[str], end_date: Optional[str]) -> str:
        """Gera chave de cache única."""
        key_data = {
            "prefix": prefix,
            "start_date": start_date or "",
            "end_date": end_date or "",
        }
        key_string = json.dumps(key_data, sort_keys=True)
        return f"{prefix}:{hashlib.md5(key_string.encode()).hexdigest()}"
    
    @staticmethod
    def get_top_projects(
        db: Session,
        start_date: Optional[str],
        end_date: Optional[str],
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """
        Obtém top projetos por orçamento usando JOIN em vez de .in_(list).
        Mais eficiente, especialmente com muitos projetos.
        """
        cache_key = ChartDataService._generate_cache_key(f"top_projects_{limit}", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        
        # Use JOIN instead of .in_(list) for better performance
        # Budget is now CTT_SALINI from CTT010, not PAD010
        # But keeping PAD010 logic for backward compatibility
        try:
            if filters:
                # Join CTT010 with PAD010 and filter by date, then aggregate
                budget_by_custo = db.query(
                    CTT010.CTT_CUSTO,
                    CTT010.CTT_DESC01,
                    func.sum(CTT010.CTT_SALINI).label('budget')
                ).filter(*filters)\
                .group_by(CTT010.CTT_CUSTO, CTT010.CTT_DESC01)\
                .order_by(func.sum(CTT010.CTT_SALINI).desc())\
                .limit(limit).all()
            else:
                # No date filters
                budget_by_custo = db.query(
                    CTT010.CTT_CUSTO,
                    CTT010.CTT_DESC01,
                    func.sum(CTT010.CTT_SALINI).label('budget')
                ).group_by(CTT010.CTT_CUSTO, CTT010.CTT_DESC01)\
                .order_by(func.sum(CTT010.CTT_SALINI).desc())\
                .limit(limit).all()
        except Exception as e:
            print(f"Warning: Error getting top projects: {e}")
            budget_by_custo = []
        
        result = [
            {
                "name": (row.CTT_DESC01 or "Sem Nome").strip() if hasattr(row, 'CTT_DESC01') else "Sem Nome",
                "value": float(row.budget or 0.0) if hasattr(row, 'budget') else float(row[2] or 0.0)
            }
            for row in budget_by_custo
        ]
        
        cache.set(cache_key, result, ttl_seconds=ChartDataService.CACHE_TTL)
        return result
    
    @staticmethod
    def get_status_distribution(
        db: Session,
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> List[Dict[str, Any]]:
        """Obtém distribuição de status para gráfico de pizza."""
        from app.services.project_status_service import ProjectStatusService
        
        status_stats = ProjectStatusService.calculate_status_stats(db, start_date, end_date)
        
        return [
            {"name": "Em Execução", "value": status_stats["in_execution"], "color": "#10b981"},
            {"name": "Finalizando", "value": status_stats["ending_soon"], "color": "#f59e0b"},
            {"name": "Prestar Contas", "value": status_stats["rendering_accounts"], "color": "#f97316"},
            {"name": "Não Iniciados", "value": status_stats["not_started"], "color": "#9ca3af"},
        ]
    
    @staticmethod
    def get_execution_by_percent(
        db: Session,
        start_date: Optional[str],
        end_date: Optional[str]
    ) -> List[Dict[str, Any]]:
        """
        Obtém distribuição de execução por faixa percentual usando JOIN.
        Mais eficiente que buscar listas e usar .in_().
        """
        cache_key = ChartDataService._generate_cache_key("execution_by_percent", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        
        # Get projects with budget using JOIN for realized values
        try:
            if filters:
                # Use JOIN to get projects with realized values in one query
                projects_with_realized = db.query(
                    CTT010.CTT_CUSTO,
                    CTT010.CTT_SALINI,
                    func.coalesce(func.sum(SE2010.E2_VALOR), 0).label('realized')
                ).outerjoin(
                    SE2010,
                    and_(
                        SE2010.E2_CUSTO == CTT010.CTT_CUSTO,
                        SE2010.D_E_L_E_T_ != '*'
                    )
                ).filter(*filters)\
                .group_by(CTT010.CTT_CUSTO, CTT010.CTT_SALINI)\
                .all()
            else:
                # No date filters
                projects_with_realized = db.query(
                    CTT010.CTT_CUSTO,
                    CTT010.CTT_SALINI,
                    func.coalesce(func.sum(SE2010.E2_VALOR), 0).label('realized')
                ).outerjoin(
                    SE2010,
                    and_(
                        SE2010.E2_CUSTO == CTT010.CTT_CUSTO,
                        SE2010.D_E_L_E_T_ != '*'
                    )
                ).group_by(CTT010.CTT_CUSTO, CTT010.CTT_SALINI)\
                .all()
        except Exception as e:
            print(f"Warning: Error getting execution by percent: {e}")
            projects_with_realized = []
        
        execution_ranges = {
            "0-25%": {"count": 0, "total_budget": 0.0},
            "25-50%": {"count": 0, "total_budget": 0.0},
            "50-75%": {"count": 0, "total_budget": 0.0},
            "75-100%": {"count": 0, "total_budget": 0.0},
            ">100%": {"count": 0, "total_budget": 0.0},
        }
        
        for row in projects_with_realized:
            budget = float(row.CTT_SALINI or 0.0) if hasattr(row, 'CTT_SALINI') else float(row[1] or 0.0)
            if budget <= 0:
                continue
            
            realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[2] or 0.0)
            usage_percent = (realized / budget * 100) if budget > 0 else 0.0
            
            if usage_percent <= 25:
                execution_ranges["0-25%"]["count"] += 1
                execution_ranges["0-25%"]["total_budget"] += budget
            elif usage_percent <= 50:
                execution_ranges["25-50%"]["count"] += 1
                execution_ranges["25-50%"]["total_budget"] += budget
            elif usage_percent <= 75:
                execution_ranges["50-75%"]["count"] += 1
                execution_ranges["50-75%"]["total_budget"] += budget
            elif usage_percent <= 100:
                execution_ranges["75-100%"]["count"] += 1
                execution_ranges["75-100%"]["total_budget"] += budget
            else:
                execution_ranges[">100%"]["count"] += 1
                execution_ranges[">100%"]["total_budget"] += budget
        
        result = [
            {"range": k, "count": v["count"], "total_budget": float(v["total_budget"])}
            for k, v in execution_ranges.items()
        ]
        
        cache.set(cache_key, result, ttl_seconds=ChartDataService.CACHE_TTL)
        return result
    
    @staticmethod
    def get_trend_data(
        db: Session,
        start_date: Optional[str],
        end_date: Optional[str],
        months: int = 6
    ) -> List[Dict[str, Any]]:
        """Obtém dados de tendência (últimos N meses)."""
        cache_key = ChartDataService._generate_cache_key(f"trend_data_{months}", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        today_dt = datetime.now()
        trend_data = []
        
        for i in range(months):
            month_date = today_dt - timedelta(days=30 * (months - 1 - i))
            month_start = month_date.replace(day=1).strftime("%Y%m%d")
            
            # Calculate last day of month
            if month_date.month == 12:
                month_end_date = month_date.replace(year=month_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end_date = month_date.replace(month=month_date.month + 1, day=1) - timedelta(days=1)
            month_end_str = month_end_date.strftime("%Y%m%d")
            
            # Apply date filters if they exist
            if start_date:
                d_start = start_date.replace("-", "")
                if month_start < d_start:
                    month_start = d_start
            if end_date:
                d_end = end_date.replace("-", "")
                if month_end_str > d_end:
                    month_end_str = d_end
            
            # Use JOIN to get budget and realized in one query (more efficient)
            try:
                # Budget from CTT010.CTT_SALINI and Realized from SE2010.E2_VALOR using JOIN
                month_data = db.query(
                    func.sum(CTT010.CTT_SALINI).label('budget'),
                    func.coalesce(func.sum(SE2010.E2_VALOR), 0).label('realized')
                ).outerjoin(
                    SE2010,
                    and_(
                        SE2010.E2_CUSTO == CTT010.CTT_CUSTO,
                        SE2010.D_E_L_E_T_ != '*'
                    )
                ).filter(
                    CTT010.CTT_DTINI >= month_start,
                    CTT010.CTT_DTINI <= month_end_str
                ).first()
                
                month_budget = float(month_data.budget or 0.0) if month_data else 0.0
                month_realized = float(month_data.realized or 0.0) if month_data else 0.0
            except Exception as e:
                print(f"Warning: Error getting trend data for month: {e}")
                month_budget = 0.0
                month_realized = 0.0
            
            # Month name in Portuguese
            month_names = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", 
                          "Jul", "Ago", "Set", "Out", "Nov", "Dez"]
            month_name = month_names[month_date.month - 1]
            
            trend_data.append({
                "month": month_name,
                "budget": float(month_budget),
                "realized": float(month_realized)
            })
        
        cache.set(cache_key, trend_data, ttl_seconds=ChartDataService.CACHE_TTL)
        return trend_data

