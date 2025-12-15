"""
Serviço para cálculo de KPIs do dashboard.
"""
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime
from app.models.protheus import CTT010, PAD010, SE2010, SC6010
from app.core.cache import cache
import hashlib
import json

class KpiService:
    """Serviço para cálculo de KPIs."""
    
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
    def _build_date_filters(start_date: Optional[str], end_date: Optional[str]):
        """Constrói filtros de data para queries."""
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        return filters
    
    @staticmethod
    def get_total_projects(db: Session, start_date: Optional[str], end_date: Optional[str]) -> int:
        """Calcula total de projetos no período."""
        cache_key = KpiService._generate_cache_key("kpi_total_projects", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        filters = KpiService._build_date_filters(start_date, end_date)
        total = db.query(func.count(CTT010.CTT_CUSTO)).filter(*filters).scalar() or 0
        cache.set(cache_key, total, ttl_seconds=KpiService.CACHE_TTL)
        return total
    
    @staticmethod
    def get_total_budget(db: Session, start_date: Optional[str], end_date: Optional[str]) -> float:
        """
        Calcula orçamento total usando JOIN em vez de .in_(list).
        Mais eficiente, especialmente com muitos projetos.
        """
        cache_key = KpiService._generate_cache_key("kpi_total_budget", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            # Use JOIN instead of .in_(list) for better performance
            filters = KpiService._build_date_filters(start_date, end_date)
            
            if filters:
                # Join CTT010 with PAD010 and filter by date
                # Note: Budget is now CTT_SALINI from CTT010, not PAD010
                # But keeping PAD010 for backward compatibility if needed
                total_budget = db.query(func.sum(CTT010.CTT_SALINI))\
                    .filter(*filters)\
                    .scalar() or 0.0
            else:
                # No date filters - sum all budgets
                total_budget = db.query(func.sum(CTT010.CTT_SALINI)).scalar() or 0.0
        except Exception as e:
            print(f"Warning: Error calculating total budget: {e}")
            total_budget = 0.0
        
        cache.set(cache_key, total_budget, ttl_seconds=KpiService.CACHE_TTL)
        return float(total_budget)
    
    @staticmethod
    def get_total_realized(db: Session, start_date: Optional[str], end_date: Optional[str]) -> float:
        """
        Calcula total realizado usando JOIN em vez de .in_(list).
        Mais eficiente, especialmente com muitos projetos.
        """
        cache_key = KpiService._generate_cache_key("kpi_total_realized", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            filters = KpiService._build_date_filters(start_date, end_date)
            
            if filters:
                # Use JOIN instead of .in_(list) for better performance
                # Join SE2010 with CTT010 to filter by date
                total_realized = db.query(func.sum(SE2010.E2_VALOR))\
                    .join(CTT010, SE2010.E2_CUSTO == CTT010.CTT_CUSTO)\
                    .filter(
                        *filters,
                        SE2010.D_E_L_E_T_ != '*'
                    )\
                    .scalar() or 0.0
            else:
                # No date filters - sum all realized
                total_realized = db.query(func.sum(SE2010.E2_VALOR))\
                    .filter(SE2010.D_E_L_E_T_ != '*')\
                    .scalar() or 0.0
        except Exception as e:
            print(f"Warning: SE2010 table not available or error: {e}")
            total_realized = 0.0
        
        cache.set(cache_key, total_realized, ttl_seconds=KpiService.CACHE_TTL)
        return float(total_realized)
    
    @staticmethod
    def get_total_billing(db: Session, start_date: Optional[str], end_date: Optional[str]) -> float:
        """
        Calcula total de faturamento usando JOIN em vez de .in_(list).
        Mais eficiente, especialmente com muitos projetos.
        """
        cache_key = KpiService._generate_cache_key("kpi_total_billing", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        try:
            filters = KpiService._build_date_filters(start_date, end_date)
            
            if filters:
                # Use JOIN instead of .in_(list) for better performance
                # Join SC6010 with CTT010 to filter by date
                total_billing = db.query(func.sum(SC6010.C6_PRCVEN))\
                    .join(CTT010, SC6010.C6_CUSTO == CTT010.CTT_CUSTO)\
                    .filter(
                        *filters,
                        SC6010.D_E_L_E_T_ != '*',
                        SC6010.C6_SERIE.isnot(None),
                        SC6010.C6_SERIE != '',
                        SC6010.C6_NOTA.isnot(None),
                        SC6010.C6_NOTA != ''
                    )\
                    .scalar() or 0.0
            else:
                # No date filters - sum all billing
                total_billing = db.query(func.sum(SC6010.C6_PRCVEN))\
                    .filter(
                        SC6010.D_E_L_E_T_ != '*',
                        SC6010.C6_SERIE.isnot(None),
                        SC6010.C6_SERIE != '',
                        SC6010.C6_NOTA.isnot(None),
                        SC6010.C6_NOTA != ''
                    )\
                    .scalar() or 0.0
        except Exception as e:
            print(f"Warning: SC6010 table not available or error: {e}")
            total_billing = 0.0
        
        cache.set(cache_key, total_billing, ttl_seconds=KpiService.CACHE_TTL)
        return float(total_billing)
    
    @staticmethod
    def calculate_all_kpis(db: Session, start_date: Optional[str], end_date: Optional[str]) -> Dict[str, Any]:
        """Calcula todos os KPIs de uma vez (otimizado)."""
        cache_key = KpiService._generate_cache_key("kpi_all", start_date, end_date)
        cached = cache.get(cache_key)
        if cached is not None:
            return cached
        
        total_projects = KpiService.get_total_projects(db, start_date, end_date)
        total_budget = KpiService.get_total_budget(db, start_date, end_date)
        total_realized = KpiService.get_total_realized(db, start_date, end_date)
        total_billing = KpiService.get_total_billing(db, start_date, end_date)
        
        balance = float(total_budget - total_realized)
        financial_balance = float(total_realized - total_billing) if total_billing > 0 else 0.0
        
        result = {
            "total_projects": total_projects,
            "total_budget": total_budget,
            "total_realized": total_realized,
            "total_billing": total_billing,
            "balance": balance,
            "financial_balance": financial_balance
        }
        
        cache.set(cache_key, result, ttl_seconds=KpiService.CACHE_TTL)
        return result

