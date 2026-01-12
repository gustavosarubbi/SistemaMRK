from typing import Any, List, Optional
from datetime import datetime, timedelta
from pydantic import BaseModel
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, select, or_
from app.api import deps
from app.models.protheus import CTT010, PAD010, SC6010, SE2010
from app.models.project_status import ProjectStatus
from app.models.base import Base
from app.schemas.project import ProjectCreate
from app.schemas.notes import ProjectNoteCreate, ProjectNoteUpdate, ProjectNoteResponse
from app.schemas.attachments import ProjectAttachmentResponse
from sqlalchemy.inspection import inspect
import json
import os
import uuid
import shutil
from pathlib import Path

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
    coordinator: Optional[str] = None,
    client: Optional[str] = None,
    status: Optional[str] = None,
    analyst: Optional[str] = None,
    show_finalized: Optional[bool] = None,
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
        
        if coordinator:
            query = query.filter(CTT010.CTT_NOMECO.ilike(f"%{coordinator}%"))
        
        if client:
            query = query.filter(CTT010.CTT_UNIDES.ilike(f"%{client}%"))
        
        if analyst:
            query = query.filter(
                (CTT010.CTT_ANADES.ilike(f"%{analyst}%")) |
                (CTT010.CTT_ANALIS.ilike(f"%{analyst}%"))
            )
        
        if status:
            today_dt = datetime.now()
            today = today_dt.strftime("%Y%m%d")
            
            # Get finalized projects to exclude from rendering_accounts
            finalized_custos_list = []
            try:
                finalized_statuses = db.query(ProjectStatus.CTT_CUSTO).filter(ProjectStatus.is_finalized == True).all()
                finalized_custos_list = [str(status.CTT_CUSTO).strip() for status in finalized_statuses if status.CTT_CUSTO]
            except Exception as e:
                # Se a tabela não existir, continua sem projetos finalizados
                print(f"Aviso: Erro ao consultar projetos finalizados: {str(e)}")
            
            if status == 'in_execution':
                # Em Execução: No período de vigência E não finalizado internamente
                # O usuário solicitou que Vigência tenha prioridade sobre Encerrado ERP.
                query = query.filter(
                    CTT010.CTT_DTINI <= today, 
                    CTT010.CTT_DTFIM >= today
                )
                # Excluir apenas os finalizados internamente (que é um status "forçado")
                if finalized_custos_list:
                    query = query.filter(~CTT010.CTT_CUSTO.in_(finalized_custos_list))

            elif status == 'rendering_accounts':
                # Prestar Contas: Já terminou (End < Today) E não encerrado nem finalizado
                query = query.filter(CTT010.CTT_DTFIM < today)
                # Excluir encerrados
                query = query.filter(
                    or_(
                        CTT010.CTT_DTENC.is_(None),
                        CTT010.CTT_DTENC == '',
                        func.len(CTT010.CTT_DTENC) != 8,
                        CTT010.CTT_DTENC > today
                    )
                )
                # Excluir finalizados
                if finalized_custos_list:
                    query = query.filter(~CTT010.CTT_CUSTO.in_(finalized_custos_list))

            elif status == 'rendering_accounts_60days':
                # Prazo 60 Dias: Terminados há menos de 60 dias E não encerrados nem finalizados
                sixty_days_ago = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
                query = query.filter(
                    CTT010.CTT_DTFIM < today,
                    CTT010.CTT_DTFIM >= sixty_days_ago
                )
                # Excluir encerrados
                query = query.filter(
                    or_(
                        CTT010.CTT_DTENC.is_(None),
                        CTT010.CTT_DTENC == '',
                        func.len(CTT010.CTT_DTENC) != 8,
                        CTT010.CTT_DTENC > today
                    )
                )
                # Excluir finalizados
                if finalized_custos_list:
                    query = query.filter(~CTT010.CTT_CUSTO.in_(finalized_custos_list))
            elif status == 'closed' or status == 'encerrado':
                # Encerrados: Tem CTT_DTENC <= hoje E não finalizado internamente
                # E NÃO está no período de vigência (pois vigência tem prioridade)
                query = query.filter(
                    CTT010.CTT_DTENC.isnot(None),
                    CTT010.CTT_DTENC != '',
                    func.len(CTT010.CTT_DTENC) == 8,
                    CTT010.CTT_DTENC <= today
                )
                # Excluir os que ainda estão em vigência
                query = query.filter(
                    or_(
                        func.trim(CTT010.CTT_DTINI) > today,
                        func.trim(CTT010.CTT_DTFIM) < today
                    )
                )
                # Excluir finalizados para não duplicar
                if finalized_custos_list:
                    query = query.filter(~CTT010.CTT_CUSTO.in_(finalized_custos_list))
            elif status == 'finished':
                # Finalizado: Removido - todos os projetos finalizados vão para "rendering_accounts"
                # Mantido apenas para compatibilidade, mas retorna vazio
                query = query.filter(False)  # Sempre retorna vazio
            elif status == 'finalized':
                # Finalizados: Projetos com is_finalized = True na tabela PROJECT_STATUS
                try:
                    finalized_custos = db.query(ProjectStatus.CTT_CUSTO).filter(ProjectStatus.is_finalized == True).all()
                    finalized_custos_list = [str(status.CTT_CUSTO).strip() for status in finalized_custos if status.CTT_CUSTO]
                    if finalized_custos_list:
                        query = query.filter(CTT010.CTT_CUSTO.in_(finalized_custos_list))
                    else:
                        query = query.filter(False)  # Nenhum projeto finalizado
                except Exception as e:
                    # Se a tabela não existir, retorna vazio
                    print(f"Aviso: Erro ao filtrar projetos finalizados: {str(e)}")
                    query = query.filter(False)
            elif status == 'active':
                # Active + Rendering Accounts
                # Active means: Not Finished (> 60 days past end) AND Not Future (Started) ? 
                # User definition: "active defined by vigencia... and rendering... finished after end+60"
                # So Active = Everything that is NOT (Finished OR Future)? 
                # For now, we assume "Active" means "Current work + Reporting", so we might exclude future.
                # But typically default views show upcoming too. 
                # Let's focus on the "Finished" complaint.
                sixty_days_ago = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
                query = query.filter(
                    CTT010.CTT_DTFIM >= sixty_days_ago,
                    CTT010.CTT_DTFIM != '',
                    CTT010.CTT_DTFIM != None
                )
            elif status == 'all':
                pass # Show everything
            
        else:
            # Default behavior: Show all projects (including those that ended)
            # Não excluir projetos finalizados - todos podem prestar contas
            # Apenas garantir que a data de fim não está vazia
            query = query.filter(
                CTT010.CTT_DTFIM != '',
                CTT010.CTT_DTFIM != None
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
        
        # Filter by finalized status (if show_finalized is provided)
        if show_finalized is not None:
            try:
                finalized_custos = db.query(ProjectStatus.CTT_CUSTO).filter(ProjectStatus.is_finalized == True).all()
                finalized_custos_list = [str(status.CTT_CUSTO).strip() for status in finalized_custos if status.CTT_CUSTO]
                if show_finalized:
                    # Mostrar apenas projetos finalizados
                    if finalized_custos_list:
                        query = query.filter(CTT010.CTT_CUSTO.in_(finalized_custos_list))
                    else:
                        query = query.filter(False)  # Nenhum projeto finalizado
                else:
                    # Excluir projetos finalizados
                    if finalized_custos_list:
                        query = query.filter(~CTT010.CTT_CUSTO.in_(finalized_custos_list))
            except Exception as e:
                # Se a tabela não existir, ignora o filtro
                print(f"Aviso: Erro ao filtrar projetos finalizados: {str(e)}")

        # --- Statistics Calculation (Optimized with SQL Aggregation) ---
        # Calculate stats for the current filter set using SQL aggregation instead of fetching all rows
        # This is MUCH faster, especially with large datasets
        
        stats_query = db.query(CTT010)
        
        # Re-apply all filters EXCEPT status to the stats query
        if search:
            stats_query = stats_query.filter(
                (CTT010.CTT_DESC01.ilike(search_filter)) | 
                (CTT010.CTT_CUSTO.ilike(search_filter)) |
                (CTT010.CTT_NOMECO.ilike(search_filter))
            )
        if coordinator:
            stats_query = stats_query.filter(CTT010.CTT_NOMECO.ilike(f"%{coordinator}%"))
        if client:
            stats_query = stats_query.filter(CTT010.CTT_UNIDES.ilike(f"%{client}%"))
        if start_date:
            d_start_stats = start_date.replace("-", "")
            stats_query = stats_query.filter(CTT010.CTT_DTINI >= d_start_stats)
        if end_date:
            d_end_stats = end_date.replace("-", "")
            stats_query = stats_query.filter(CTT010.CTT_DTINI <= d_end_stats)
        
        # Filter valid dates only (8 characters)
        stats_query = stats_query.filter(
            func.len(CTT010.CTT_DTINI) == 8,
            func.len(CTT010.CTT_DTFIM) == 8
        )
        
        # Get finalized projects (cached via ProjectStatusService)
        from app.services.project_status_service import ProjectStatusService
        finalized_custos = ProjectStatusService._get_finalized_custos(db)
        
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        sixty_days_ago_str = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
        
        # Calculate stats using SQL aggregation (much faster than Python loops)
        total_count = stats_query.count()
        
        # In execution: start <= today <= end (WITHOUT excluding ERP closed, as requested)
        # Excludes only internally finalized
        in_execution_query = stats_query.filter(
            CTT010.CTT_DTINI <= today_str,
            CTT010.CTT_DTFIM >= today_str
        )
        if finalized_custos:
             in_execution_query = in_execution_query.filter(~CTT010.CTT_CUSTO.in_(list(finalized_custos)))
        in_execution_count = in_execution_query.count()
        
        # Not started: start > today
        not_started_query = stats_query.filter(CTT010.CTT_DTINI > today_str)
        not_started_count = not_started_query.count()
        
        # Rendering accounts: end < today AND not finalized AND not closed (CTT_DTENC > hoje ou vazio)
        rendering_query = stats_query.filter(
            CTT010.CTT_DTFIM < today_str,
            or_(
                CTT010.CTT_DTENC.is_(None),
                CTT010.CTT_DTENC == '',
                func.len(CTT010.CTT_DTENC) != 8,
                CTT010.CTT_DTENC > today_str
            )
        )
        rendering_projects = rendering_query.with_entities(CTT010.CTT_CUSTO).all()
        rendering_custos = {str(p.CTT_CUSTO).strip() for p in rendering_projects if p.CTT_CUSTO}
        non_finalized_rendering = rendering_custos - finalized_custos
        rendering_accounts_count = len(non_finalized_rendering)
        
        # Rendering accounts 60 days: ended in last 60 days AND not finalized AND not closed (CTT_DTENC > hoje ou vazio)
        rendering_60days_query = stats_query.filter(
            CTT010.CTT_DTFIM < today_str,
            CTT010.CTT_DTFIM >= sixty_days_ago_str,
            or_(
                CTT010.CTT_DTENC.is_(None),
                CTT010.CTT_DTENC == '',
                func.len(CTT010.CTT_DTENC) != 8,
                CTT010.CTT_DTENC > today_str
            )
        )
        rendering_60days_projects = rendering_60days_query.with_entities(CTT010.CTT_CUSTO).all()
        rendering_60days_custos = {str(p.CTT_CUSTO).strip() for p in rendering_60days_projects if p.CTT_CUSTO}
        non_finalized_rendering_60days = rendering_60days_custos - finalized_custos
        rendering_accounts_60days_count = len(non_finalized_rendering_60days)
        
        # Finalized count
        finalized_query = stats_query.filter(CTT010.CTT_CUSTO.in_(list(finalized_custos))) if finalized_custos else stats_query.filter(False)
        finalized_count = finalized_query.count() if finalized_custos else 0
        
        # Closed count: CTT_DTENC <= today - EXCLUDING in execution and finalized
        closed_query = stats_query.filter(
            CTT010.CTT_DTENC.isnot(None),
            CTT010.CTT_DTENC != '',
            func.len(CTT010.CTT_DTENC) == 8,
            CTT010.CTT_DTENC <= today_str,
            or_(
                func.trim(CTT010.CTT_DTINI) > today_str,
                func.trim(CTT010.CTT_DTFIM) < today_str
            )
        )
        if finalized_custos:
            closed_query = closed_query.filter(~CTT010.CTT_CUSTO.in_(list(finalized_custos)))
        closed_count = closed_query.count()
        
        stats = {
            "total": total_count,
            "in_execution": in_execution_count,
            "rendering_accounts": rendering_accounts_count,
            "rendering_accounts_60days": rendering_accounts_60days_count,
            "not_started": not_started_count,
            "finalized": finalized_count,
            "closed": closed_count
        }
            
        # Get total count for pagination (for the main query)
        total = query.count()
        
        # Get paginated items
        projects = query.order_by(CTT010.CTT_CUSTO).offset(skip).limit(limit).all()
        
        # Optimize: Get all realized and budget values in 2 queries instead of N queries
        # Strip whitespace from custos to avoid matching issues
        custos_list = [str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else None for p in projects]
        custos_list = [c for c in custos_list if c]  # Remove None values
        
        # Get all budget amounts in one query
        # Optimize: Budget is just CTT_SALINI from CTT010, no need to query PAD010
        # This will be handled in the loop below
        
        # Get all realized amounts in one query
        realized_dict = {}
        if custos_list:
            try:
                # Realized = Sum(E2_VALOR) from SE2010 where E2_CUSTO matches
                realized_results = db.query(
                    SE2010.E2_CUSTO,
                    func.sum(func.coalesce(SE2010.E2_VALOR, 0)).label('realized')
                ).filter(
                    SE2010.E2_CUSTO.in_(custos_list),
                    SE2010.D_E_L_E_T_ != '*'
                ).group_by(SE2010.E2_CUSTO).all()
                
                # Handle both Row objects and tuples
                realized_dict = {}
                for row in realized_results:
                    try:
                        custo = row.E2_CUSTO.strip() if hasattr(row, 'E2_CUSTO') else str(row[0]).strip()
                        realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[1] or 0.0)
                        realized_dict[custo] = realized
                    except Exception as e:
                        print(f"Error processing realized row: {e}, row type: {type(row)}")
                        continue
            except Exception as e:
                # Se a tabela SE2010 não existir ainda, retorna dict vazio
                print(f"Warning: SE2010 table not available: {e}")
                realized_dict = {}
        
        # Build response data using pre-fetched values
        data = []
        for p in projects:
            p_dict = object_as_dict(p)
            
            # Get pre-calculated values (use stripped custo for lookup)
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            realized = realized_dict.get(custo_stripped, 0.0)
            
            # Budget is now CTT_SALINI
            budget = float(p.CTT_SALINI or 0.0)
            
            p_dict['realized'] = realized
            p_dict['budget'] = budget
            p_dict['initial_balance'] = budget # Keeping initial_balance as alias for budget/CTT_SALINI for now
            
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
            "total_pages": (total + limit - 1) // limit,
            "stats": stats
        }
    except Exception as e:
        import traceback
        error_msg = f"Error reading projects: {e}"
        print(error_msg)
        traceback.print_exc()  # Print full traceback for debugging
        return {
            "data": [],
            "total": 0,
            "page": page,
            "limit": limit,
            "total_pages": 0,
            "stats": {"total": 0, "in_execution": 0, "rendering_accounts": 0, "rendering_accounts_60days": 0, "not_started": 0}
        }

@router.post("/", response_model=dict)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Create new project.
    """
    # Check if exists
    existing = db.query(CTT010).filter(CTT010.CTT_CUSTO == project_in.custo).first()
    if existing:
        raise HTTPException(status_code=400, detail="Já existe um projeto com este código de custo.")
    
    try:
        # Map fields
        # YYYY-MM-DD -> YYYYMMDD
        dt_ini = project_in.data_inicio.replace("-", "") if project_in.data_inicio else ""
        dt_fim = project_in.data_fim.replace("-", "") if project_in.data_fim else ""
        
        db_obj = CTT010(
            CTT_CUSTO=project_in.custo,
            CTT_DESC01=project_in.descricao,
            CTT_UNIDES=project_in.unidade,
            CTT_DTINI=dt_ini,
            CTT_DTFIM=dt_fim,
            CTT_NOMECO=project_in.coordenador,
            CTT_CLASSE=project_in.classe,
            CTT_BLOQ=project_in.bloqueado,
            CTT_DEPDES=project_in.departamento,
            CTT_ANADES=project_in.analista,
            CTT_SALINI=project_in.saldo_inicial
        )
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        return object_as_dict(db_obj)
    except Exception as e:
        db.rollback()
        print(f"Error creating project: {e}")
        raise HTTPException(status_code=500, detail=f"Erro ao criar projeto: {str(e)}")

@router.get("/options", response_model=dict)
def get_project_options(
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get options for creating new projects (coordinators, units, etc)
    """
    try:
        # Fetch distinct coordinators
        coordinators = db.query(CTT010.CTT_NOMECO).distinct().filter(
            CTT010.CTT_NOMECO != None, 
            CTT010.CTT_NOMECO != ""
        ).order_by(CTT010.CTT_NOMECO).all()
        coordinators_list = [c[0] for c in coordinators if c[0]]

        # Fetch distinct units
        units = db.query(CTT010.CTT_UNIDES).distinct().filter(
            CTT010.CTT_UNIDES != None, 
            CTT010.CTT_UNIDES != ""
        ).order_by(CTT010.CTT_UNIDES).all()
        units_list = [u[0] for u in units if u[0]]
        
        # Fetch distinct analysts (from CTT_ANADES or CTT_ANALIS)
        analysts_anades = db.query(CTT010.CTT_ANADES).distinct().filter(
            CTT010.CTT_ANADES != None,
            CTT010.CTT_ANADES != ""
        ).all()
        analysts_analis = db.query(CTT010.CTT_ANALIS).distinct().filter(
            CTT010.CTT_ANALIS != None,
            CTT010.CTT_ANALIS != ""
        ).all()
        
        # Combine and deduplicate analysts
        analysts_set = set()
        for a in analysts_anades:
            if a[0]:
                analysts_set.add(a[0])
        for a in analysts_analis:
            if a[0]:
                analysts_set.add(a[0])
        analysts_list = sorted(list(analysts_set))
        
        return {
            "coordinators": coordinators_list,
            "units": units_list,
            "analysts": analysts_list
        }
    except Exception as e:
        print(f"Error fetching options: {e}")
        return {
            "coordinators": [],
            "units": []
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
    try:
        # Decodificar o custo caso tenha sido codificado na URL
        from urllib.parse import unquote
        custo_decoded = unquote(custo) if custo else ""
        
        # Trim o custo para remover espaços em branco
        custo_trimmed = custo_decoded.strip() if custo_decoded else ""
        
        if not custo_trimmed:
            raise HTTPException(status_code=400, detail="Código do projeto não fornecido")
        
        # Buscar o projeto - tenta múltiplas variações devido a possíveis espaços no banco
        project = None
        
        # 1. Tenta busca exata primeiro
        project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo_decoded).first()
        
        # 2. Se não encontrou, tenta com o custo trimmed
        if not project and custo_trimmed != custo_decoded:
            project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo_trimmed).first()
        
        # 3. Se ainda não encontrou, tenta busca com LIKE (ignora espaços no início/fim)
        if not project:
            # Busca projetos que começam ou terminam com o custo (pode ter espaços)
            candidates = db.query(CTT010).filter(
                CTT010.CTT_CUSTO.like(f'%{custo_trimmed}%')
            ).all()
            
            # Verifica se algum projeto encontrado realmente corresponde (strip no Python)
            for candidate in candidates:
                if candidate.CTT_CUSTO and str(candidate.CTT_CUSTO).strip() == custo_trimmed:
                    project = candidate
                    break
        
        if not project:
            raise HTTPException(status_code=404, detail=f"Projeto com código '{custo_trimmed}' não encontrado")
        
        # Usar o CTT_CUSTO do projeto encontrado para garantir consistência
        project_custo = project.CTT_CUSTO
    except HTTPException:
        raise
    except Exception as e:
        print(f"Erro ao buscar projeto '{custo}': {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erro ao buscar projeto: {str(e)}")
        
    p_dict = object_as_dict(project)
    
    # Add realized amount
    # Realized = Sum(E2_VALOR) from SE2010 where E2_CUSTO matches
    try:
        realized = db.query(func.sum(func.coalesce(SE2010.E2_VALOR, 0)))\
            .filter(
                SE2010.E2_CUSTO == project_custo,
                SE2010.D_E_L_E_T_ != '*'
            )\
            .scalar() or 0.0
    except Exception as e:
        # Se a tabela SE2010 não existir ainda, retorna 0
        print(f"Warning: SE2010 table not available: {e}")
        realized = 0.0
    
    # Add Budget from CTT010.CTT_SALINI
    budget = float(project.CTT_SALINI or 0.0)
    
    p_dict['realized'] = float(realized)
    p_dict['budget'] = budget
    p_dict['initial_balance'] = budget
    
    # Verificar status de finalização (opcional - pode não existir a tabela ainda)
    try:
        project_status = db.query(ProjectStatus).filter(ProjectStatus.CTT_CUSTO == project_custo).first()
        p_dict['is_finalized'] = project_status.is_finalized if project_status else False
        p_dict['finalized_at'] = project_status.finalized_at.isoformat() if project_status and project_status.finalized_at else None
        p_dict['finalized_by'] = project_status.finalized_by if project_status else None
    except Exception as e:
        # Se a tabela não existir, retorna valores padrão
        print(f"Aviso: Tabela PROJECT_STATUS não encontrada ou erro ao consultar: {str(e)}")
        p_dict['is_finalized'] = False
        p_dict['finalized_at'] = None
        p_dict['finalized_by'] = None
    
    return p_dict

@router.get("/{custo}/billing", response_model=dict)
def get_project_billing(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Get billing data (faturamento) for a specific project from SC6010.
    Returns all billing entries with C6_PRCVEN where C6_Serie and C8_Nota are not empty.
    Also returns total_provisions (all), billed (with serie and nota), and pending (without serie or nota).
    """
    # Verificar se o projeto existe
    project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # 1. Total de todas as provisões (faturadas + pendentes)
    total_provisions = db.query(func.sum(SC6010.C6_PRCVEN))\
        .filter(
            SC6010.C6_CUSTO == custo,
            SC6010.D_E_L_E_T_ != '*'
        )\
        .scalar() or 0.0
    
    # 2. Provisões faturadas (com série e nota)
    billed = db.query(func.sum(SC6010.C6_PRCVEN))\
        .filter(
            SC6010.C6_CUSTO == custo,
            SC6010.D_E_L_E_T_ != '*',
            SC6010.C6_SERIE.isnot(None),
            SC6010.C6_SERIE != '',
            SC6010.C6_NOTA.isnot(None),
            SC6010.C6_NOTA != ''
        )\
        .scalar() or 0.0
    
    # 3. Provisões pendentes (sem série ou nota)
    pending = db.query(func.sum(SC6010.C6_PRCVEN))\
        .filter(
            SC6010.C6_CUSTO == custo,
            SC6010.D_E_L_E_T_ != '*',
            or_(
                SC6010.C6_SERIE.is_(None),
                SC6010.C6_SERIE == '',
                SC6010.C6_NOTA.is_(None),
                SC6010.C6_NOTA == ''
            )
        )\
        .scalar() or 0.0
    
    # Buscar todos os registros de faturamento do projeto (apenas faturadas)
    # Filtrar apenas onde C6_Serie e C6_Nota não estão vazios
    billing_records = db.query(SC6010)\
        .filter(
            SC6010.C6_CUSTO == custo,
            SC6010.D_E_L_E_T_ != '*',
            SC6010.C6_SERIE.isnot(None),
            SC6010.C6_SERIE != '',
            SC6010.C6_NOTA.isnot(None),
            SC6010.C6_NOTA != ''
        )\
        .order_by(SC6010.C6_ITEM)\
        .all()
    
    # Converter para dicionário
    billing_list = []
    total_billing = float(billed)  # Mantido para compatibilidade
    
    for record in billing_records:
        billing_dict = object_as_dict(record)
        billing_value = float(record.C6_PRCVEN or 0.0)
        billing_dict['C6_PRCVEN'] = billing_value
        billing_list.append(billing_dict)
    
    return {
        "project_code": custo,
        "project_name": project.CTT_DESC01 or "",
        "billing_records": billing_list,
        "total_billing": total_billing,  # Mantido para compatibilidade (apenas faturadas)
        "total_provisions": float(total_provisions),  # Todas as provisões
        "billed": float(billed),  # Provisões faturadas
        "pending": float(pending),  # Provisões pendentes
        "count": len(billing_list)  # Quantidade de parcelas faturadas
    }

# ==================== NOTES ENDPOINTS ====================

# Diretório para armazenar dados JSON (usar caminho absoluto baseado no diretório do projeto)
BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent.parent  # Volta até a raiz do projeto
DATA_DIR = BASE_DIR / "backend" / "data"
NOTES_FILE = DATA_DIR / "project_notes.json"
ATTACHMENTS_DIR = DATA_DIR / "attachments"
ATTACHMENTS_FILE = DATA_DIR / "project_attachments.json"

# Garantir que os diretórios existam
DATA_DIR.mkdir(parents=True, exist_ok=True)
ATTACHMENTS_DIR.mkdir(parents=True, exist_ok=True)

def load_notes() -> dict:
    """Carrega notas do arquivo JSON"""
    if NOTES_FILE.exists():
        try:
            with open(NOTES_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_notes(notes: dict):
    """Salva notas no arquivo JSON"""
    with open(NOTES_FILE, 'w', encoding='utf-8') as f:
        json.dump(notes, f, ensure_ascii=False, indent=2)

def load_attachments() -> dict:
    """Carrega anexos do arquivo JSON"""
    if ATTACHMENTS_FILE.exists():
        try:
            with open(ATTACHMENTS_FILE, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_attachments(attachments: dict):
    """Salva anexos no arquivo JSON"""
    with open(ATTACHMENTS_FILE, 'w', encoding='utf-8') as f:
        json.dump(attachments, f, ensure_ascii=False, indent=2)

@router.get("/{project_id}/notes", response_model=List[ProjectNoteResponse])
def get_project_notes(
    project_id: str,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Lista todas as notas de um projeto"""
    notes = load_notes()
    project_notes = notes.get(project_id, [])
    return project_notes

@router.post("/{project_id}/notes", response_model=ProjectNoteResponse)
def create_project_note(
    project_id: str,
    note_in: ProjectNoteCreate,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Cria uma nova nota para o projeto"""
    notes = load_notes()
    
    if project_id not in notes:
        notes[project_id] = []
    
    note_id = str(uuid.uuid4())
    now = datetime.utcnow().isoformat()
    
    new_note = {
        "id": note_id,
        "project_id": project_id,
        "content": note_in.content,
        "author": current_user,
        "created_at": now,
        "updated_at": None
    }
    
    notes[project_id].append(new_note)
    save_notes(notes)
    
    return new_note

@router.put("/{project_id}/notes/{note_id}", response_model=ProjectNoteResponse)
def update_project_note(
    project_id: str,
    note_id: str,
    note_in: ProjectNoteUpdate,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Atualiza uma nota existente"""
    notes = load_notes()
    
    if project_id not in notes:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    note_index = None
    for i, note in enumerate(notes[project_id]):
        if note["id"] == note_id:
            note_index = i
            break
    
    if note_index is None:
        raise HTTPException(status_code=404, detail="Nota não encontrada")
    
    notes[project_id][note_index]["content"] = note_in.content
    notes[project_id][note_index]["updated_at"] = datetime.utcnow().isoformat()
    
    save_notes(notes)
    
    return notes[project_id][note_index]

@router.delete("/{project_id}/notes/{note_id}")
def delete_project_note(
    project_id: str,
    note_id: str,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Deleta uma nota"""
    notes = load_notes()
    
    if project_id not in notes:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    notes[project_id] = [n for n in notes[project_id] if n["id"] != note_id]
    save_notes(notes)
    
    return {"message": "Nota deletada com sucesso"}

# ==================== ATTACHMENTS ENDPOINTS ====================

@router.get("/{project_id}/attachments", response_model=List[ProjectAttachmentResponse])
def get_project_attachments(
    project_id: str,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Lista todos os anexos de um projeto"""
    attachments = load_attachments()
    project_attachments = attachments.get(project_id, [])
    return project_attachments

@router.post("/{project_id}/attachments", response_model=ProjectAttachmentResponse)
def upload_project_attachment(
    project_id: str,
    file: UploadFile = File(...),
    category: str = Form(...),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Faz upload de um anexo para o projeto"""
    # Validar categoria
    valid_categories = ['contract', 'invoice', 'report', 'other']
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Categoria inválida. Use uma de: {', '.join(valid_categories)}")
    
    attachments = load_attachments()
    
    if project_id not in attachments:
        attachments[project_id] = []
    
    # Gerar ID único
    attachment_id = str(uuid.uuid4())
    
    # Salvar arquivo
    file_extension = Path(file.filename).suffix
    saved_filename = f"{attachment_id}{file_extension}"
    file_path = ATTACHMENTS_DIR / saved_filename
    
    try:
        with open(file_path, 'wb') as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar arquivo: {str(e)}")
    
    # Obter tamanho do arquivo
    file_size = file_path.stat().st_size
    
    # Criar registro do anexo
    now = datetime.utcnow().isoformat()
    new_attachment = {
        "id": attachment_id,
        "project_id": project_id,
        "filename": file.filename,
        "category": category,
        "size": file_size,
        "uploaded_by": current_user,
        "uploaded_at": now,
        "url": f"/api/projects/{project_id}/attachments/{attachment_id}/download"
    }
    
    attachments[project_id].append(new_attachment)
    save_attachments(attachments)
    
    return new_attachment

@router.get("/{project_id}/attachments/{attachment_id}/download")
def download_project_attachment(
    project_id: str,
    attachment_id: str,
    current_user: str = Depends(deps.get_current_user),
):
    """Baixa um anexo"""
    from fastapi.responses import FileResponse
    import mimetypes
    
    attachments = load_attachments()
    
    if project_id not in attachments:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    attachment = None
    for att in attachments[project_id]:
        if att["id"] == attachment_id:
            attachment = att
            break
    
    if not attachment:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    
    # Encontrar arquivo salvo
    file_path = None
    for file in ATTACHMENTS_DIR.iterdir():
        if file.stem == attachment_id:
            file_path = file
            break
    
    if not file_path or not file_path.exists():
        raise HTTPException(status_code=404, detail="Arquivo não encontrado no servidor")
    
    # Detectar tipo MIME
    mime_type, _ = mimetypes.guess_type(attachment["filename"])
    if not mime_type:
        mime_type = 'application/octet-stream'
    
    return FileResponse(
        path=str(file_path),
        filename=attachment["filename"],
        media_type=mime_type
    )

@router.delete("/{project_id}/attachments/{attachment_id}")
def delete_project_attachment(
    project_id: str,
    attachment_id: str,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Deleta um anexo"""
    attachments = load_attachments()
    
    if project_id not in attachments:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # Encontrar e remover anexo
    attachment_to_delete = None
    for att in attachments[project_id]:
        if att["id"] == attachment_id:
            attachment_to_delete = att
            break
    
    if not attachment_to_delete:
        raise HTTPException(status_code=404, detail="Anexo não encontrado")
    
    # Remover arquivo físico
    for file in ATTACHMENTS_DIR.iterdir():
        if file.stem == attachment_id:
            try:
                file.unlink()
            except:
                pass  # Continua mesmo se não conseguir deletar o arquivo
            break
    
    # Remover do JSON
    attachments[project_id] = [a for a in attachments[project_id] if a["id"] != attachment_id]
    save_attachments(attachments)
    
    return {"message": "Anexo deletado com sucesso"}

class ProjectFinalizationStatus(BaseModel):
    is_finalized: bool

@router.put("/{custo}/finalization-status", response_model=dict)
def update_project_finalization_status(
    custo: str,
    status: ProjectFinalizationStatus,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Atualiza o status de finalização do projeto.
    Se is_finalized=True, marca o projeto como finalizado.
    Se is_finalized=False, marca o projeto como pendente (ainda presta contas).
    """
    # Verificar se o projeto existe
    project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # Buscar ou criar registro de status
    try:
        project_status = db.query(ProjectStatus).filter(ProjectStatus.CTT_CUSTO == custo).first()
        
        if not project_status:
            project_status = ProjectStatus(
                CTT_CUSTO=custo,
                is_finalized=status.is_finalized,
                finalized_by=current_user if status.is_finalized else None,
                finalized_at=datetime.now() if status.is_finalized else None
            )
            db.add(project_status)
        else:
            project_status.is_finalized = status.is_finalized
            if status.is_finalized:
                project_status.finalized_at = datetime.now()
                project_status.finalized_by = current_user
            else:
                project_status.finalized_at = None
                project_status.finalized_by = None
        
        db.commit()
        db.refresh(project_status)
        
        return {
            "message": "Status de finalização atualizado com sucesso",
            "is_finalized": project_status.is_finalized,
            "finalized_at": project_status.finalized_at.isoformat() if project_status.finalized_at else None,
            "finalized_by": project_status.finalized_by
        }
    except Exception as e:
        db.rollback()
        error_msg = str(e)
        if "PROJECT_STATUS" in error_msg or "Nome de objeto inválido" in error_msg:
            raise HTTPException(
                status_code=500, 
                detail="A tabela PROJECT_STATUS não foi criada no banco de dados. Execute o script backend/scripts/create_project_status_table.sql para criar a tabela."
            )
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar status de finalização: {str(e)}")
