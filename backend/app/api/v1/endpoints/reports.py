from typing import Any, Dict, Optional, List
from fastapi import APIRouter, Depends, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from datetime import datetime, timedelta
from app.api import deps
from app.models.protheus import CTT010, PAD010, SC6010, SE2010
from app.core.cache import cache
import hashlib
import json

router = APIRouter()

# TTL do cache em segundos (2 minutos)
CACHE_TTL = 120

def generate_cache_key(start_date: Optional[str], end_date: Optional[str], endpoint: str = "reports_financial") -> str:
    """Gera uma chave única de cache baseada nos parâmetros."""
    key_data = {
        "start_date": start_date or "",
        "end_date": end_date or "",
        "endpoint": endpoint
    }
    key_string = json.dumps(key_data, sort_keys=True)
    return f"{endpoint}:{hashlib.md5(key_string.encode()).hexdigest()}"

@router.get("/financial", response_model=Dict[str, Any])
def get_financial_reports(
    response: Response,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
) -> Any:
    """
    Get comprehensive financial reports with KPIs, variance analysis, evolution, billing status, profitability, and alerts.
    """
    # Gera chave de cache
    cache_key = generate_cache_key(start_date, end_date)
    
    # Tenta obter do cache
    cached_result = cache.get(cache_key)
    if cached_result is not None:
        response.headers["X-Cache"] = "HIT"
        response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
        return cached_result
    
    # Cache miss - processa dados
    response.headers["X-Cache"] = "MISS"
    response.headers["Cache-Control"] = f"public, max-age={CACHE_TTL}"
    
    try:
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        
        # Build filters based on CTT010 dates
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        
        # Get all projects matching filters
        if filters:
            projects_query = db.query(CTT010).filter(*filters)
        else:
            projects_query = db.query(CTT010)
        
        projects = projects_query.all()
        custos_list = [str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else "" for p in projects]
        custos_list = [c for c in custos_list if c]
        
        # 1. KPIs Financeiros
        total_budget = 0.0
        total_realized = 0.0
        
        if custos_list:
            # Total Budget (Orçado) - CTT_SALINI
            budget_results = db.query(
                CTT010.CTT_CUSTO,
                CTT010.CTT_SALINI
            ).filter(CTT010.CTT_CUSTO.in_(custos_list)).all()
            
            for row in budget_results:
                custo = str(row.CTT_CUSTO).strip() if row.CTT_CUSTO else ""
                budget = float(row.CTT_SALINI or 0.0)
                total_budget += budget
            
            # Total Realized - Sum of E2_VALOR from SE2010
            try:
                realized_results = db.query(
                    SE2010.E2_CUSTO,
                    func.sum(func.coalesce(SE2010.E2_VALOR, 0)).label('realized')
                ).filter(
                    SE2010.E2_CUSTO.in_(custos_list),
                    SE2010.D_E_L_E_T_ != '*'
                ).group_by(SE2010.E2_CUSTO).all()
                
                realized_dict = {}
                for row in realized_results:
                    try:
                        custo = row.E2_CUSTO.strip() if hasattr(row, 'E2_CUSTO') else str(row[0]).strip()
                        realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[1] or 0.0)
                        realized_dict[custo] = realized
                    except:
                        continue
                
                total_realized = sum(realized_dict.values())
            except Exception as e:
                # Se a tabela SE2010 não existir ainda, retorna 0
                print(f"Warning: SE2010 table not available: {e}")
                total_realized = 0.0
            
            # Total Billing (Faturamento) - Sum of all C6_PRCVEN from SC6010
            try:
                total_billing = db.query(func.sum(SC6010.C6_PRCVEN))\
                    .filter(
                        SC6010.C6_CUSTO.in_(custos_list),
                        SC6010.D_E_L_E_T_ != '*'
                    )\
                    .scalar() or 0.0
            except Exception as e:
                # Se a tabela SC6010 não existir ainda, retorna 0
                print(f"Warning: SC6010 table not available: {e}")
                total_billing = 0.0
        else:
            total_billing = 0.0
        
        balance = total_realized - total_budget
        financial_balance = float(total_realized - total_billing)
        variance_percent = (total_realized / total_budget * 100) if total_budget > 0 else 0.0
        
        kpis = {
            "total_budget": total_budget,
            "total_realized": total_realized,
            "total_billing": float(total_billing),
            "balance": balance,
            "financial_balance": financial_balance,
            "variance_percent": variance_percent
        }
        
        # 2. Análise de Variações
        variance_analysis = []
        over_budget_projects = []
        under_budget_projects = []
        
        if custos_list:
            for p in projects:
                custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
                if not custo_stripped:
                    continue
                
                budget = float(p.CTT_SALINI or 0.0)
                realized = realized_dict.get(custo_stripped, 0.0)
                variance = realized - budget
                variance_pct = (variance / budget * 100) if budget > 0 else 0.0
                
                variance_analysis.append({
                    "project_id": custo_stripped,
                    "project_name": p.CTT_DESC01 or "Sem Nome",
                    "budget": budget,
                    "realized": realized,
                    "variance": variance,
                    "variance_percent": variance_pct
                })
                
                if variance > 0:  # Acima do orçado
                    over_budget_projects.append({
                        "project_id": custo_stripped,
                        "project_name": p.CTT_DESC01 or "Sem Nome",
                        "budget": budget,
                        "realized": realized,
                        "variance": variance,
                        "variance_percent": variance_pct,
                        "usage_percent": (realized / budget * 100) if budget > 0 else 0.0
                    })
                elif variance < 0:  # Abaixo do orçado
                    under_budget_projects.append({
                        "project_id": custo_stripped,
                        "project_name": p.CTT_DESC01 or "Sem Nome",
                        "budget": budget,
                        "realized": realized,
                        "variance": variance,
                        "variance_percent": variance_pct,
                        "usage_percent": (realized / budget * 100) if budget > 0 else 0.0
                    })
        
        # Sort by variance (absolute value)
        over_budget_projects.sort(key=lambda x: abs(x["variance"]), reverse=True)
        under_budget_projects.sort(key=lambda x: abs(x["variance"]), reverse=True)
        
        # 3. Evolução Temporal (últimos 12 meses)
        evolution_data = []
        for i in range(12):
            month_date = today_dt - timedelta(days=30 * (11 - i))
            month_start = month_date.replace(day=1).strftime("%Y%m%d")
            
            # Calculate last day of month
            if month_date.month == 12:
                month_end_date = month_date.replace(year=month_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end_date = month_date.replace(month=month_date.month + 1, day=1) - timedelta(days=1)
            month_end_str = month_end_date.strftime("%Y%m%d")
            
            # Projects that were active in this month
            month_projects = db.query(CTT010.CTT_CUSTO).filter(
                CTT010.CTT_DTINI <= month_end_str,
                or_(
                    CTT010.CTT_DTFIM >= month_start,
                    CTT010.CTT_DTFIM == None
                )
            ).all()
            
            month_custos = [str(p[0]).strip() for p in month_projects if p[0]]
            
            month_budget = 0.0
            month_realized = 0.0
            
            if month_custos:
                # Budget for projects active in this month
                month_budget_results = db.query(
                    CTT010.CTT_CUSTO,
                    CTT010.CTT_SALINI
                ).filter(CTT010.CTT_CUSTO.in_(month_custos)).all()
                
                for row in month_budget_results:
                    month_budget += float(row.CTT_SALINI or 0.0)
                
                # Realized for this month (from SE2010 using E2_BAIXA or E2_EMISSAO)
                try:
                    month_realized_results = db.query(
                        func.sum(SE2010.E2_VALOR)
                    ).filter(
                        SE2010.E2_CUSTO.in_(month_custos),
                        or_(
                            SE2010.E2_BAIXA >= month_start,
                            SE2010.E2_EMISSAO >= month_start
                        ),
                        or_(
                            SE2010.E2_BAIXA <= month_end_str,
                            SE2010.E2_EMISSAO <= month_end_str
                        ),
                        or_(
                            SE2010.D_E_L_E_T_.is_(None),
                            SE2010.D_E_L_E_T_ == '',
                            SE2010.D_E_L_E_T_ != '*'
                        )
                    ).scalar() or 0.0
                    month_realized = float(month_realized_results)
                except Exception:
                    month_realized = 0.0
            
            evolution_data.append({
                "month": month_date.strftime("%Y-%m"),
                "month_label": month_date.strftime("%b/%Y"),
                "budget": month_budget,
                "realized": month_realized
            })
        
        # 4. Status de Faturamento
        billing_status = {
            "total_provisions": 0.0,
            "billed": 0.0,
            "pending": 0.0
        }
        
        if custos_list:
            # Total provisions
            total_provisions = db.query(
                func.sum(SC6010.C6_PRCVEN)
            ).filter(
                SC6010.C6_CUSTO.in_(custos_list),
                SC6010.D_E_L_E_T_ != '*'
            ).scalar() or 0.0
            
            # Billed (série e nota não vazios)
            billed = db.query(
                func.sum(SC6010.C6_PRCVEN)
            ).filter(
                SC6010.C6_CUSTO.in_(custos_list),
                SC6010.D_E_L_E_T_ != '*',
                SC6010.C6_SERIE.isnot(None),
                SC6010.C6_SERIE != '',
                SC6010.C6_NOTA.isnot(None),
                SC6010.C6_NOTA != ''
            ).scalar() or 0.0
            
            # Pending (série OU nota vazios)
            pending = db.query(
                func.sum(SC6010.C6_PRCVEN)
            ).filter(
                SC6010.C6_CUSTO.in_(custos_list),
                SC6010.D_E_L_E_T_ != '*',
                or_(
                    SC6010.C6_SERIE.is_(None),
                    SC6010.C6_SERIE == '',
                    SC6010.C6_NOTA.is_(None),
                    SC6010.C6_NOTA == ''
                )
            ).scalar() or 0.0
            
            billing_status = {
                "total_provisions": float(total_provisions),
                "billed": float(billed),
                "pending": float(pending)
            }
        
        # 5. Rentabilidade
        profitability_by_project = []
        profitability_by_coordinator = {}
        profitability_by_client = {}
        
        if custos_list:
            for p in projects:
                custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
                if not custo_stripped:
                    continue
                
                budget = float(p.CTT_SALINI or 0.0)
                realized = realized_dict.get(custo_stripped, 0.0)
                profit = realized - budget
                profit_percent = (profit / budget * 100) if budget > 0 else 0.0
                
                profitability_by_project.append({
                    "project_id": custo_stripped,
                    "project_name": p.CTT_DESC01 or "Sem Nome",
                    "coordinator": p.CTT_NOMECO or "Sem Coordenador",
                    "client": p.CTT_UNIDES or "Sem Cliente",
                    "budget": budget,
                    "realized": realized,
                    "profit": profit,
                    "profit_percent": profit_percent
                })
                
                # By coordinator
                coordinator = p.CTT_NOMECO or "Sem Coordenador"
                if coordinator not in profitability_by_coordinator:
                    profitability_by_coordinator[coordinator] = {
                        "budget": 0.0,
                        "realized": 0.0,
                        "profit": 0.0,
                        "project_count": 0
                    }
                profitability_by_coordinator[coordinator]["budget"] += budget
                profitability_by_coordinator[coordinator]["realized"] += realized
                profitability_by_coordinator[coordinator]["profit"] += profit
                profitability_by_coordinator[coordinator]["project_count"] += 1
                
                # By client
                client = p.CTT_UNIDES or "Sem Cliente"
                if client not in profitability_by_client:
                    profitability_by_client[client] = {
                        "budget": 0.0,
                        "realized": 0.0,
                        "profit": 0.0,
                        "project_count": 0
                    }
                profitability_by_client[client]["budget"] += budget
                profitability_by_client[client]["realized"] += realized
                profitability_by_client[client]["profit"] += profit
                profitability_by_client[client]["project_count"] += 1
        
        # Calculate profit percent for aggregations
        for coordinator in profitability_by_coordinator:
            coord_data = profitability_by_coordinator[coordinator]
            coord_data["profit_percent"] = (coord_data["profit"] / coord_data["budget"] * 100) if coord_data["budget"] > 0 else 0.0
        
        for client in profitability_by_client:
            client_data = profitability_by_client[client]
            client_data["profit_percent"] = (client_data["profit"] / client_data["budget"] * 100) if client_data["budget"] > 0 else 0.0
        
        # Sort profitability
        profitability_by_project.sort(key=lambda x: x["profit"], reverse=True)
        
        # 6. Alertas Críticos
        alerts = []
        
        # Projetos acima do orçado
        for proj in over_budget_projects[:10]:  # Top 10
            alerts.append({
                "type": "over_budget",
                "severity": "high",
                "title": "Projeto acima do orçado",
                "message": f"{proj['project_name']} está {proj['variance_percent']:.1f}% acima do orçado",
                "project_id": proj["project_id"],
                "project_name": proj["project_name"],
                "value": proj["variance"]
            })
        
        # Projetos críticos (próximos do fim)
        critical_projects = []
        for p in projects:
            if not p.CTT_DTFIM:
                continue
            
            try:
                dt_fim = datetime.strptime(p.CTT_DTFIM, "%Y%m%d")
                days_until_end = (dt_fim - today_dt).days
                
                if 0 <= days_until_end <= 30:  # Próximos 30 dias
                    custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
                    budget = float(p.CTT_SALINI or 0.0)
                    realized = realized_dict.get(custo_stripped, 0.0)
                    
                    critical_projects.append({
                        "project_id": custo_stripped,
                        "project_name": p.CTT_DESC01 or "Sem Nome",
                        "days_until_end": days_until_end,
                        "budget": budget,
                        "realized": realized,
                        "usage_percent": (realized / budget * 100) if budget > 0 else 0.0
                    })
            except:
                continue
        
        critical_projects.sort(key=lambda x: x["days_until_end"])
        
        for proj in critical_projects[:10]:  # Top 10
            alerts.append({
                "type": "critical",
                "severity": "medium",
                "title": "Projeto crítico",
                "message": f"{proj['project_name']} termina em {proj['days_until_end']} dias",
                "project_id": proj["project_id"],
                "project_name": proj["project_name"],
                "value": proj["days_until_end"]
            })
        
        # Faturamentos pendentes
        if billing_status["pending"] > 0:
            alerts.append({
                "type": "pending_billing",
                "severity": "high",
                "title": "Faturamentos pendentes",
                "message": f"R$ {billing_status['pending']:,.2f} em faturamentos pendentes",
                "value": billing_status["pending"]
            })
        
        # Projetos com baixa execução
        low_execution_projects = []
        for p in projects:
            if not p.CTT_DTINI or not p.CTT_DTFIM:
                continue
            
            try:
                dt_ini = datetime.strptime(p.CTT_DTINI, "%Y%m%d")
                dt_fim = datetime.strptime(p.CTT_DTFIM, "%Y%m%d")
                total_days = (dt_fim - dt_ini).days
                elapsed_days = (today_dt - dt_ini).days
                
                if total_days > 0 and elapsed_days > 0:
                    progress_percent = (elapsed_days / total_days) * 100
                    
                    if progress_percent >= 50:  # Mais de 50% do tempo passou
                        custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
                        budget = float(p.CTT_SALINI or 0.0)
                        realized = realized_dict.get(custo_stripped, 0.0)
                        usage_percent = (realized / budget * 100) if budget > 0 else 0.0
                        
                        if usage_percent < 20:  # Menos de 20% executado
                            low_execution_projects.append({
                                "project_id": custo_stripped,
                                "project_name": p.CTT_DESC01 or "Sem Nome",
                                "progress_percent": progress_percent,
                                "usage_percent": usage_percent,
                                "budget": budget,
                                "realized": realized
                            })
            except:
                continue
        
        for proj in low_execution_projects[:10]:  # Top 10
            alerts.append({
                "type": "low_execution",
                "severity": "medium",
                "title": "Baixa execução",
                "message": f"{proj['project_name']} tem apenas {proj['usage_percent']:.1f}% executado após {proj['progress_percent']:.1f}% do tempo",
                "project_id": proj["project_id"],
                "project_name": proj["project_name"],
                "value": proj["usage_percent"]
            })
        
        # Top 10 projetos por orçado
        top_projects_by_budget = sorted(
            profitability_by_project,
            key=lambda x: x["budget"],
            reverse=True
        )[:10]
        
        # Top 10 projetos por realizado
        top_projects_by_realized = sorted(
            profitability_by_project,
            key=lambda x: x["realized"],
            reverse=True
        )[:10]
        
        result = {
            "kpis": kpis,
            "variance_analysis": {
                "over_budget": over_budget_projects[:10],
                "under_budget": under_budget_projects[:10],
                "total_over": len(over_budget_projects),
                "total_under": len(under_budget_projects)
            },
            "evolution": evolution_data,
            "billing_status": billing_status,
            "profitability": {
                "by_project": profitability_by_project[:20],
                "by_coordinator": dict(list(profitability_by_coordinator.items())[:10]),
                "by_client": dict(list(profitability_by_client.items())[:10])
            },
            "alerts": alerts,
            "top_projects": {
                "by_budget": top_projects_by_budget,
                "by_realized": top_projects_by_realized
            },
            "critical_projects": critical_projects[:20],
            "low_execution_projects": low_execution_projects[:20]
        }
        
        # Cache result
        cache.set(cache_key, result, ttl=CACHE_TTL)
        
        return result
        
    except Exception as e:
        import traceback
        error_msg = f"Error generating financial reports: {e}"
        print(error_msg)
        traceback.print_exc()
        return {
            "kpis": {
                "total_budget": 0.0,
                "total_realized": 0.0,
                "balance": 0.0,
                "variance_percent": 0.0
            },
            "variance_analysis": {
                "over_budget": [],
                "under_budget": [],
                "total_over": 0,
                "total_under": 0
            },
            "evolution": [],
            "billing_status": {
                "total_provisions": 0.0,
                "billed": 0.0,
                "pending": 0.0
            },
            "profitability": {
                "by_project": [],
                "by_coordinator": {},
                "by_client": {}
            },
            "alerts": [],
            "top_projects": {
                "by_budget": [],
                "by_realized": []
            },
            "critical_projects": [],
            "low_execution_projects": []
        }


