from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta
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
        
        # Calculate status statistics
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        sixty_days_ago_str = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
        
        # Get all projects with dates for status calculation
        stats_query = db.query(CTT010.CTT_DTINI, CTT010.CTT_DTFIM)
        if filters:
            stats_query = stats_query.filter(*filters)
        
        all_projects_dates = stats_query.all()
        
        status_stats = {
            "in_execution": 0,
            "ending_soon": 0,
            "rendering_accounts": 0,
            "finished": 0,
            "not_started": 0
        }
        
        projects_in_execution_list = []
        projects_ending_soon_list = []
        
        for p in all_projects_dates:
            dt_ini = p.CTT_DTINI or ""
            dt_fim = p.CTT_DTFIM or ""
            
            if len(dt_ini) != 8 or len(dt_fim) != 8:
                continue
            
            # Calculate days remaining
            try:
                fim_date = datetime.strptime(dt_fim, "%Y%m%d")
                days_until_end = (fim_date - today_dt).days
            except:
                days_until_end = None
            
            # In execution
            if dt_ini <= today_str and dt_fim >= today_str:
                status_stats["in_execution"] += 1
                # Check if ending soon (last 30 days)
                if days_until_end is not None and 0 <= days_until_end <= 30:
                    status_stats["ending_soon"] += 1
            # Past end date - classify as rendering_accounts or finished
            elif dt_fim < today_str:
                # If ended less than 60 days ago -> rendering_accounts
                if dt_fim >= sixty_days_ago_str:
                    status_stats["rendering_accounts"] += 1
                # If ended more than 60 days ago -> finished
                else:
                    status_stats["finished"] += 1
            # Not started
            elif dt_ini > today_str:
                status_stats["not_started"] += 1
        
        # Get projects in execution with details (limited to 10)
        if filters:
            in_execution_query = db.query(CTT010).filter(
                CTT010.CTT_DTINI <= today_str,
                CTT010.CTT_DTFIM >= today_str,
                *filters
            )
        else:
            in_execution_query = db.query(CTT010).filter(
                CTT010.CTT_DTINI <= today_str,
                CTT010.CTT_DTFIM >= today_str
            )
        
        in_execution_projects = in_execution_query.limit(10).all()
        
        for p in in_execution_projects:
            try:
                fim_date = datetime.strptime(p.CTT_DTFIM or "", "%Y%m%d")
                days_remaining = (fim_date - today_dt).days
            except:
                days_remaining = None
            
            # Get budget and realized
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            budget = float(p.CTT_SALINI or 0.0)
            realized = db.query(func.sum(PAC010.PAC_VALOR))\
                .filter(PAC010.PAC_CUSTO == custo_stripped)\
                .scalar() or 0.0
            
            usage_percent = (realized / budget * 100) if budget > 0 else 0.0
            
            projects_in_execution_list.append({
                "id": custo_stripped,
                "name": (p.CTT_DESC01 or "Sem Nome").strip(),
                "daysRemaining": days_remaining,
                "budget": float(budget),
                "realized": float(realized),
                "usage_percent": float(usage_percent),
                "status": "in_execution"
            })
        
        # Sort by days remaining (ascending - most urgent first)
        projects_in_execution_list.sort(key=lambda x: x["daysRemaining"] if x["daysRemaining"] is not None else 9999)
        
        # Get projects ending soon (last 30 days, limited to 10)
        if filters:
            ending_soon_query = db.query(CTT010).filter(
                CTT010.CTT_DTINI <= today_str,
                CTT010.CTT_DTFIM >= today_str,
                *filters
            )
        else:
            ending_soon_query = db.query(CTT010).filter(
                CTT010.CTT_DTINI <= today_str,
                CTT010.CTT_DTFIM >= today_str
            )
        
        ending_soon_projects = ending_soon_query.all()
        ending_soon_filtered = []
        
        for p in ending_soon_projects:
            try:
                fim_date = datetime.strptime(p.CTT_DTFIM or "", "%Y%m%d")
                days_remaining = (fim_date - today_dt).days
                if 0 <= days_remaining <= 30:
                    ending_soon_filtered.append((p, days_remaining))
            except:
                continue
        
        # Sort by days remaining and take top 10
        ending_soon_filtered.sort(key=lambda x: x[1])
        ending_soon_filtered = ending_soon_filtered[:10]
        
        for p, days_remaining in ending_soon_filtered:
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            budget = float(p.CTT_SALINI or 0.0)
            realized = db.query(func.sum(PAC010.PAC_VALOR))\
                .filter(PAC010.PAC_CUSTO == custo_stripped)\
                .scalar() or 0.0
            
            usage_percent = (realized / budget * 100) if budget > 0 else 0.0
            
            projects_ending_soon_list.append({
                "id": custo_stripped,
                "name": (p.CTT_DESC01 or "Sem Nome").strip(),
                "daysRemaining": days_remaining,
                "budget": float(budget),
                "realized": float(realized),
                "usage_percent": float(usage_percent),
                "status": "ending_soon"
            })
        
        # Status distribution for pie chart
        status_distribution = [
            {"name": "Em Execução", "value": status_stats["in_execution"], "color": "#10b981"},
            {"name": "Finalizando", "value": status_stats["ending_soon"], "color": "#f59e0b"},
            {"name": "Prestar Contas", "value": status_stats["rendering_accounts"], "color": "#f97316"},
            {"name": "Finalizados", "value": status_stats["finished"], "color": "#6b7280"},
            {"name": "Não Iniciados", "value": status_stats["not_started"], "color": "#9ca3af"},
        ]
        
        # Execution by percent ranges
        execution_ranges = {
            "0-25%": {"count": 0, "total_budget": 0.0},
            "25-50%": {"count": 0, "total_budget": 0.0},
            "50-75%": {"count": 0, "total_budget": 0.0},
            "75-100%": {"count": 0, "total_budget": 0.0},
            ">100%": {"count": 0, "total_budget": 0.0},
        }
        
        # Get all projects with budget and realized for execution ranges
        if filters and custos_list:
            projects_for_ranges = db.query(CTT010.CTT_CUSTO, CTT010.CTT_SALINI)\
                .filter(CTT010.CTT_CUSTO.in_(custos_list))\
                .all()
        elif not filters:
            projects_for_ranges = db.query(CTT010.CTT_CUSTO, CTT010.CTT_SALINI).all()
        else:
            projects_for_ranges = []
        
        for p in projects_for_ranges:
            custo = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            budget = float(p.CTT_SALINI or 0.0)
            if budget <= 0:
                continue
            
            realized = db.query(func.sum(PAC010.PAC_VALOR))\
                .filter(PAC010.PAC_CUSTO == custo)\
                .scalar() or 0.0
            
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
        
        execution_by_percent = [
            {"range": k, "count": v["count"], "total_budget": float(v["total_budget"])}
            for k, v in execution_ranges.items()
        ]
        
        # Trend data - last 6 months
        trend_data = []
        for i in range(6):
            month_date = today_dt - timedelta(days=30 * (5 - i))
            month_start = month_date.replace(day=1).strftime("%Y%m%d")
            
            # Calculate last day of month
            if month_date.month == 12:
                month_end_date = month_date.replace(year=month_date.year + 1, month=1, day=1) - timedelta(days=1)
            else:
                month_end_date = month_date.replace(month=month_date.month + 1, day=1) - timedelta(days=1)
            month_end_str = month_end_date.strftime("%Y%m%d")
            
            # Projects started in this month
            month_projects_query = db.query(CTT010.CTT_CUSTO)\
                .filter(CTT010.CTT_DTINI >= month_start)\
                .filter(CTT010.CTT_DTINI <= month_end_str)
            
            if filters:
                # Apply date filters if they exist
                if start_date:
                    d_start = start_date.replace("-", "")
                    if month_start < d_start:
                        month_start = d_start
                if end_date:
                    d_end = end_date.replace("-", "")
                    if month_end_str > d_end:
                        month_end_str = d_end
            
            month_projects = month_projects_query.all()
            month_custos = [row[0] for row in month_projects]
            
            if month_custos:
                month_budget = db.query(func.sum(PAD010.PAD_ORCADO))\
                    .filter(PAD010.PAD_CUSTO.in_(month_custos))\
                    .scalar() or 0.0
                month_realized = db.query(func.sum(PAC010.PAC_VALOR))\
                    .filter(PAC010.PAC_CUSTO.in_(month_custos))\
                    .scalar() or 0.0
            else:
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
        
        return {
            "kpis": {
                "total_projects": total_projects,
                "total_budget": float(total_budget),
                "total_realized": float(total_realized),
                "balance": float(total_budget - total_realized),
                "in_execution": status_stats["in_execution"],
                "ending_soon": status_stats["ending_soon"]
            },
            "charts": {
                "top_projects": top_projects,
                "trend": trend_data,
                "status_distribution": status_distribution,
                "execution_by_percent": execution_by_percent
            },
            "status_stats": status_stats,
            "projects_in_execution": projects_in_execution_list,
            "projects_ending_soon": projects_ending_soon_list
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
                "balance": 0.0,
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
                "finished": 0,
                "not_started": 0
            },
            "projects_in_execution": [],
            "projects_ending_soon": []
        }

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
    """
    try:
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        sixty_days_ago_str = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
        
        # Build base filters
        filters = []
        if start_date:
            d_start = start_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI >= d_start)
        if end_date:
            d_end = end_date.replace("-", "")
            filters.append(CTT010.CTT_DTINI <= d_end)
        
        # Build query based on type
        query = db.query(CTT010)
        
        if type == "in_execution":
            query = query.filter(
                CTT010.CTT_DTINI <= today_str,
                CTT010.CTT_DTFIM >= today_str
            )
        elif type == "ending_soon":
            # Projects ending in next 30 days
            thirty_days_later = (today_dt + timedelta(days=30)).strftime("%Y%m%d")
            query = query.filter(
                CTT010.CTT_DTINI <= today_str,
                CTT010.CTT_DTFIM >= today_str,
                CTT010.CTT_DTFIM <= thirty_days_later
            )
        elif type == "overdue":
            # Overdue não existe mais como categoria separada
            # Retornar projetos em prestação de contas que estão próximos do limite (últimos 15 dias do prazo de 60)
            # Ou projetos com execução > 100%
            # Por enquanto, retornar vazio - pode ser implementado como "críticos" depois
            return {
                "data": [],
                "total": 0,
                "limit": limit,
                "offset": offset
            }
        else:
            return {
                "data": [],
                "total": 0,
                "limit": limit,
                "offset": offset
            }
        
        # Apply date filters
        if filters:
            query = query.filter(*filters)
        
        # Get total count
        total = query.count()
        
        # Get projects with pagination
        projects = query.offset(offset).limit(limit).all()
        
        # Build response data
        result = []
        for p in projects:
            try:
                fim_date = datetime.strptime(p.CTT_DTFIM or "", "%Y%m%d")
                days_remaining = (fim_date - today_dt).days
            except:
                days_remaining = None
            
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            budget = float(p.CTT_SALINI or 0.0)
            realized = db.query(func.sum(PAC010.PAC_VALOR))\
                .filter(PAC010.PAC_CUSTO == custo_stripped)\
                .scalar() or 0.0
            
            usage_percent = (realized / budget * 100) if budget > 0 else 0.0
            
            result.append({
                "id": custo_stripped,
                "name": (p.CTT_DESC01 or "Sem Nome").strip(),
                "daysRemaining": days_remaining,
                "budget": float(budget),
                "realized": float(realized),
                "usage_percent": float(usage_percent),
                "status": type
            })
        
        # Sort results
        if sort_by == "days_remaining":
            result.sort(key=lambda x: x["daysRemaining"] if x["daysRemaining"] is not None else 9999)
        elif sort_by == "budget":
            result.sort(key=lambda x: x["budget"], reverse=True)
        elif sort_by == "usage_percent":
            result.sort(key=lambda x: x["usage_percent"], reverse=True)
        elif sort_by == "name":
            result.sort(key=lambda x: x["name"])
        
        return {
            "data": result,
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
