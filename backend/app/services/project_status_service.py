"""
Serviço para cálculo de status de projetos.
"""
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from app.models.protheus import CTT010, SE2010
from app.models.project_status import ProjectStatus
from app.core.cache import cache
import hashlib
import json

class ProjectStatusService:
    """Serviço para cálculo de status de projetos."""
    
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
    def _get_finalized_custos(db: Session) -> set:
        """Obtém conjunto de custos finalizados com cache."""
        cache_key = "finalized_custos_set"
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            finalized_statuses = db.query(ProjectStatus.CTT_CUSTO).filter(
                ProjectStatus.is_finalized == True
            ).all()
            result = {str(status.CTT_CUSTO).strip() for status in finalized_statuses if status.CTT_CUSTO}
            # Cache por 5 minutos (mais longo que stats porque muda menos frequentemente)
            cache.set(cache_key, result, ttl_seconds=300)
            return result
        except Exception as e:
            print(f"Aviso: Erro ao consultar projetos finalizados: {str(e)}")
            return set()
    
    @staticmethod
    def calculate_status_stats(
        db: Session, 
        start_date: Optional[str], 
        end_date: Optional[str]
    ) -> Dict[str, int]:
        """
        Calcula estatísticas de status de projetos usando SQL agregado.
        Muito mais rápido que buscar todos os projetos e processar em Python.
        """
        cache_key = ProjectStatusService._generate_cache_key("status_stats", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        sixty_days_ago_str = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
        thirty_days_later_str = (today_dt + timedelta(days=30)).strftime("%Y%m%d")
        
        # Get finalized custos once (cached)
        finalized_custos = ProjectStatusService._get_finalized_custos(db)
        
        # Build base query with filters
        from sqlalchemy import func, case, and_, or_, text
        from sqlalchemy.sql import literal
        
        base_query = db.query(CTT010)
        
        # Apply date filters
        if start_date:
            d_start = start_date.replace("-", "")
            base_query = base_query.filter(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            base_query = base_query.filter(CTT010.CTT_DTINI <= d_end)
        
        # Filter valid dates only (8 characters)
        base_query = base_query.filter(
            func.len(CTT010.CTT_DTINI) == 8,
            func.len(CTT010.CTT_DTFIM) == 8
        )
        
        # Use SQL CASE WHEN for efficient aggregation
        # This calculates all stats in a single query instead of fetching all rows
        
        # For finalized projects exclusion, we need to check if CTT_CUSTO is in finalized_custos
        # Since we can't easily do this in pure SQL without a subquery, we'll use a hybrid approach:
        # 1. Calculate stats for all projects
        # 2. Subtract finalized projects from rendering_accounts
        
        # Calculate in_execution (projects where start <= today <= end)
        in_execution_query = base_query.filter(
            CTT010.CTT_DTINI <= today_str,
            CTT010.CTT_DTFIM >= today_str
        )
        in_execution_count = in_execution_query.count()
        
        # Calculate ending_soon (in execution AND ending within 30 days)
        ending_soon_query = base_query.filter(
            CTT010.CTT_DTINI <= today_str,
            CTT010.CTT_DTFIM >= today_str,
            CTT010.CTT_DTFIM <= thirty_days_later_str
        )
        ending_soon_count = ending_soon_query.count()
        
        # Calculate not_started (start > today)
        not_started_query = base_query.filter(CTT010.CTT_DTINI > today_str)
        not_started_count = not_started_query.count()
        
        # Calculate rendering_accounts (end < today AND not finalized)
        rendering_query = base_query.filter(CTT010.CTT_DTFIM < today_str)
        
        # Get all rendering projects to filter out finalized ones
        rendering_projects = rendering_query.with_entities(CTT010.CTT_CUSTO).all()
        rendering_custos = {str(p.CTT_CUSTO).strip() for p in rendering_projects if p.CTT_CUSTO}
        
        # Filter out finalized projects
        non_finalized_rendering = rendering_custos - finalized_custos
        rendering_accounts_count = len(non_finalized_rendering)
        
        # Calculate rendering_accounts_60days (ended in last 60 days AND not finalized)
        rendering_60days_query = base_query.filter(
            CTT010.CTT_DTFIM < today_str,
            CTT010.CTT_DTFIM >= sixty_days_ago_str
        )
        rendering_60days_projects = rendering_60days_query.with_entities(CTT010.CTT_CUSTO).all()
        rendering_60days_custos = {str(p.CTT_CUSTO).strip() for p in rendering_60days_projects if p.CTT_CUSTO}
        non_finalized_rendering_60days = rendering_60days_custos - finalized_custos
        rendering_accounts_60days_count = len(non_finalized_rendering_60days)
        
        status_stats = {
            "in_execution": in_execution_count,
            "ending_soon": ending_soon_count,
            "rendering_accounts": rendering_accounts_count,
            "rendering_accounts_60days": rendering_accounts_60days_count,
            "not_started": not_started_count
        }
        
        cache.set(cache_key, status_stats, ttl_seconds=ProjectStatusService.CACHE_TTL)
        return status_stats
    
    @staticmethod
    def get_projects_in_execution(
        db: Session,
        start_date: Optional[str],
        end_date: Optional[str],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Obtém lista de projetos em execução."""
        cache_key = ProjectStatusService._generate_cache_key(
            f"projects_in_execution_{limit}", start_date, end_date
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        
        query = db.query(CTT010).filter(
            CTT010.CTT_DTINI <= today_str,
            CTT010.CTT_DTFIM >= today_str
        )
        if filters:
            query = query.filter(*filters)
        
        in_execution_projects = query.limit(limit).all()
        
        # Get realized values in batch
        in_execution_custos = [
            str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else "" 
            for p in in_execution_projects
        ]
        in_execution_custos = [c for c in in_execution_custos if c]
        
        realized_dict = {}
        if in_execution_custos:
            try:
                from sqlalchemy import func
                realized_results = db.query(
                    SE2010.E2_CUSTO,
                    func.sum(SE2010.E2_VALOR).label('realized')
                ).filter(
                    SE2010.E2_CUSTO.in_(in_execution_custos),
                    SE2010.D_E_L_E_T_ != '*'
                ).group_by(SE2010.E2_CUSTO).all()
                
                for row in realized_results:
                    try:
                        custo = row.E2_CUSTO.strip() if hasattr(row, 'E2_CUSTO') else str(row[0]).strip()
                        realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[1] or 0.0)
                        realized_dict[custo] = realized
                    except:
                        continue
            except Exception as e:
                print(f"Warning: SE2010 table not available: {e}")
        
        result = []
        for p in in_execution_projects:
            try:
                fim_date = datetime.strptime(p.CTT_DTFIM or "", "%Y%m%d")
                days_remaining = (fim_date - today_dt).days
            except:
                days_remaining = None
            
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            budget = float(p.CTT_SALINI or 0.0)
            realized = realized_dict.get(custo_stripped, 0.0)
            usage_percent = (realized / budget * 100) if budget > 0 else 0.0
            
            result.append({
                "id": custo_stripped,
                "name": (p.CTT_DESC01 or "Sem Nome").strip(),
                "daysRemaining": days_remaining,
                "budget": float(budget),
                "realized": float(realized),
                "usage_percent": float(usage_percent),
                "status": "in_execution"
            })
        
        # Sort by days remaining
        result.sort(key=lambda x: x["daysRemaining"] if x["daysRemaining"] is not None else 9999)
        
        cache.set(cache_key, result, ttl_seconds=ProjectStatusService.CACHE_TTL)
        return result
    
    @staticmethod
    def get_projects_ending_soon(
        db: Session,
        start_date: Optional[str],
        end_date: Optional[str],
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Obtém lista de projetos finalizando em breve."""
        cache_key = ProjectStatusService._generate_cache_key(
            f"projects_ending_soon_{limit}", start_date, end_date
        )
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        thirty_days_later = (today_dt + timedelta(days=30)).strftime("%Y%m%d")
        
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        
        query = db.query(CTT010).filter(
            CTT010.CTT_DTINI <= today_str,
            CTT010.CTT_DTFIM >= today_str,
            CTT010.CTT_DTFIM <= thirty_days_later
        )
        if filters:
            query = query.filter(*filters)
        
        ending_soon_projects = query.all()
        ending_soon_filtered = []
        
        for p in ending_soon_projects:
            try:
                fim_date = datetime.strptime(p.CTT_DTFIM or "", "%Y%m%d")
                days_remaining = (fim_date - today_dt).days
                if 0 <= days_remaining <= 30:
                    ending_soon_filtered.append((p, days_remaining))
            except:
                continue
        
        # Sort and limit
        ending_soon_filtered.sort(key=lambda x: x[1])
        ending_soon_filtered = ending_soon_filtered[:limit]
        
        # Get realized values in batch
        ending_soon_custos = [
            str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else "" 
            for p, _ in ending_soon_filtered
        ]
        ending_soon_custos = [c for c in ending_soon_custos if c]
        
        realized_dict = {}
        if ending_soon_custos:
            try:
                from sqlalchemy import func
                realized_results = db.query(
                    SE2010.E2_CUSTO,
                    func.sum(SE2010.E2_VALOR).label('realized')
                ).filter(
                    SE2010.E2_CUSTO.in_(ending_soon_custos),
                    SE2010.D_E_L_E_T_ != '*'
                ).group_by(SE2010.E2_CUSTO).all()
                
                for row in realized_results:
                    try:
                        custo = row.E2_CUSTO.strip() if hasattr(row, 'E2_CUSTO') else str(row[0]).strip()
                        realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[1] or 0.0)
                        realized_dict[custo] = realized
                    except:
                        continue
            except Exception as e:
                print(f"Warning: SE2010 table not available: {e}")
        
        result = []
        for p, days_remaining in ending_soon_filtered:
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            budget = float(p.CTT_SALINI or 0.0)
            realized = realized_dict.get(custo_stripped, 0.0)
            usage_percent = (realized / budget * 100) if budget > 0 else 0.0
            
            result.append({
                "id": custo_stripped,
                "name": (p.CTT_DESC01 or "Sem Nome").strip(),
                "daysRemaining": days_remaining,
                "budget": float(budget),
                "realized": float(realized),
                "usage_percent": float(usage_percent),
                "status": "ending_soon"
            })
        
        cache.set(cache_key, result, ttl_seconds=ProjectStatusService.CACHE_TTL)
        return result

