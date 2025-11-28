from typing import Any, List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.api import deps
from app.models.protheus import CTT010, PAC010, PAD010
from app.models.base import Base
from app.schemas.project import ProjectCreate
from sqlalchemy.inspection import inspect

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
        
        if start_date:
            # Convert YYYY-MM-DD to YYYYMMDD
            d_start = start_date.replace("-", "")
            query = query.filter(CTT010.CTT_DTINI >= d_start)
            
        if end_date:
            d_end = end_date.replace("-", "")
            # Filter by start date up to this end date, or actual end date?
            # Assuming we want projects that started before or on this date
            query = query.filter(CTT010.CTT_DTINI <= d_end)
            
        # Get total count for pagination
        total = query.count()
        
        # Get paginated items
        projects = query.order_by(CTT010.CTT_CUSTO).offset(skip).limit(limit).all()
        
        # Optimize: Get all realized and budget values in 2 queries instead of N queries
        # Strip whitespace from custos to avoid matching issues
        custos_list = [str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else None for p in projects]
        custos_list = [c for c in custos_list if c]  # Remove None values
        
        # Get all realized amounts in one query
        realized_dict = {}
        if custos_list:
            realized_results = db.query(
                PAC010.PAC_CUSTO,
                func.sum(PAC010.PAC_VALOR).label('realized')
            ).filter(PAC010.PAC_CUSTO.in_(custos_list))\
             .group_by(PAC010.PAC_CUSTO).all()
            # Handle both Row objects and tuples
            realized_dict = {}
            for row in realized_results:
                try:
                    custo = row.PAC_CUSTO.strip() if hasattr(row, 'PAC_CUSTO') else str(row[0]).strip()
                    realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[1] or 0.0)
                    realized_dict[custo] = realized
                except Exception as e:
                    print(f"Error processing realized row: {e}, row type: {type(row)}")
                    continue
        
        # Get all budget amounts in one query
        budget_dict = {}
        if custos_list:
            budget_results = db.query(
                PAD010.PAD_CUSTO,
                func.sum(PAD010.PAD_ORCADO).label('budget')
            ).filter(PAD010.PAD_CUSTO.in_(custos_list))\
             .group_by(PAD010.PAD_CUSTO).all()
            # Handle both Row objects and tuples
            budget_dict = {}
            for row in budget_results:
                try:
                    custo = row.PAD_CUSTO.strip() if hasattr(row, 'PAD_CUSTO') else str(row[0]).strip()
                    budget = float(row.budget or 0.0) if hasattr(row, 'budget') else float(row[1] or 0.0)
                    budget_dict[custo] = budget
                except Exception as e:
                    print(f"Error processing budget row: {e}, row type: {type(row)}")
                    continue
        
        # Build response data using pre-fetched values
        data = []
        for p in projects:
            p_dict = object_as_dict(p)
            
            # Get pre-calculated values (use stripped custo for lookup)
            custo_stripped = str(p.CTT_CUSTO).strip() if p.CTT_CUSTO else ""
            realized = realized_dict.get(custo_stripped, 0.0)
            budget = budget_dict.get(custo_stripped, 0.0)
            
            p_dict['realized'] = realized
            p_dict['budget'] = budget
            p_dict['initial_balance'] = p.CTT_SALINI or 0.0
            
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
            "total_pages": (total + limit - 1) // limit
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
            "total_pages": 0
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
        
        return {
            "coordinators": coordinators_list,
            "units": units_list
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
    project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
    if not project:
        return {} 
        
    p_dict = object_as_dict(project)
    
    # Add realized amount
    realized = db.query(func.sum(PAC010.PAC_VALOR))\
        .filter(PAC010.PAC_CUSTO == custo)\
        .scalar() or 0.0
    
    # Add Budget from PAD010
    budget = db.query(func.sum(PAD010.PAD_ORCADO))\
        .filter(PAD010.PAD_CUSTO == custo)\
        .scalar() or 0.0
    
    p_dict['realized'] = float(realized)
    p_dict['budget'] = float(budget)
    p_dict['initial_balance'] = project.CTT_SALINI or 0.0
    
    return p_dict
