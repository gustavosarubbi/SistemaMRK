from typing import Any, List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, Query, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from sqlalchemy import func, select
from app.api import deps
from app.models.protheus import CTT010, PAC010, PAD010, SC6010
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
        
        if status:
            today_dt = datetime.now()
            today = today_dt.strftime("%Y%m%d")
            
            if status == 'in_execution':
                # Vigencia: Start <= Today <= End
                query = query.filter(CTT010.CTT_DTINI <= today, CTT010.CTT_DTFIM >= today)
            elif status == 'rendering_accounts':
                # Prestar Contas: End < Today <= End + 60 days
                # Logically equivalent to: End >= Today - 60 days AND End < Today
                sixty_days_ago = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
                query = query.filter(CTT010.CTT_DTFIM >= sixty_days_ago, CTT010.CTT_DTFIM < today)
            elif status == 'finished':
                # Finalizado: Today > End + 60 days
                # Logically equivalent to: End < Today - 60 days
                sixty_days_ago = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
                query = query.filter(CTT010.CTT_DTFIM < sixty_days_ago)
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
            # Default behavior: Show only active projects
            # Exclude projects finished more than 60 days ago
            today_dt = datetime.now()
            sixty_days_ago = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
            query = query.filter(
                CTT010.CTT_DTFIM >= sixty_days_ago,
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

        # --- Statistics Calculation ---
        # Calculate stats for the current filter set (ignoring the status filter itself to show distribution)
        # Note: We create a separate query object for stats to avoid affecting the main pagination query
        
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
            
        # Get all relevant dates for classification
        # We fetch only necessary columns to minimize load
        all_projects_dates = stats_query.with_entities(CTT010.CTT_DTINI, CTT010.CTT_DTFIM).all()
        
        today_dt = datetime.now()
        today_str = today_dt.strftime("%Y%m%d")
        sixty_days_ago_str = (today_dt - timedelta(days=60)).strftime("%Y%m%d")
        
        stats = {
            "total": len(all_projects_dates),
            "in_execution": 0,
            "rendering_accounts": 0,
            "finished": 0,
            "not_started": 0
        }
        
        for p in all_projects_dates:
            dt_ini = p.CTT_DTINI or ""
            dt_fim = p.CTT_DTFIM or ""
            
            # Skip invalid dates
            if len(dt_ini) != 8 or len(dt_fim) != 8:
                continue
                
            if dt_ini <= today_str and dt_fim >= today_str:
                stats["in_execution"] += 1
            elif dt_fim >= sixty_days_ago_str and dt_fim < today_str:
                stats["rendering_accounts"] += 1
            elif dt_fim < sixty_days_ago_str:
                stats["finished"] += 1
            elif dt_ini > today_str:
                stats["not_started"] += 1
            
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
            # Realized = PAD_APAGAR + PAD_REALIZ where PAD_NATURE > 4 dígitos
            realized_results = db.query(
                PAD010.PAD_CUSTO,
                func.sum(func.coalesce(PAD010.PAD_APAGAR, 0) + func.coalesce(PAD010.PAD_REALIZ, 0)).label('realized')
            ).filter(
                PAD010.PAD_CUSTO.in_(custos_list),
                func.length(PAD010.PAD_NATURE) > 4
            ).group_by(PAD010.PAD_CUSTO).all()
            
            # Handle both Row objects and tuples
            realized_dict = {}
            for row in realized_results:
                try:
                    custo = row.PAD_CUSTO.strip() if hasattr(row, 'PAD_CUSTO') else str(row[0]).strip()
                    realized = float(row.realized or 0.0) if hasattr(row, 'realized') else float(row[1] or 0.0)
                    realized_dict[custo] = realized
                except Exception as e:
                    print(f"Error processing realized row: {e}, row type: {type(row)}")
                    continue
            
            # Get all billing provisions (SC6010) in one query
            # Subtrair provisões de faturamento onde C6_Serie e C8_Nota não estão vazios
            billing_provisions_results = db.query(
                SC6010.C6_CUSTO,
                func.sum(SC6010.C6_PRCVEN).label('billing_provisions')
            ).filter(
                SC6010.C6_CUSTO.in_(custos_list),
                SC6010.D_E_L_E_T_ != '*',
                SC6010.C6_SERIE.isnot(None),
                SC6010.C6_SERIE != '',
                SC6010.C8_NOTA.isnot(None),
                SC6010.C8_NOTA != ''
            ).group_by(SC6010.C6_CUSTO).all()
            
            # Create dict of billing provisions
            billing_provisions_dict = {}
            for row in billing_provisions_results:
                try:
                    custo = row.C6_CUSTO.strip() if hasattr(row, 'C6_CUSTO') else str(row[0]).strip()
                    provisions = float(row.billing_provisions or 0.0) if hasattr(row, 'billing_provisions') else float(row[1] or 0.0)
                    billing_provisions_dict[custo] = provisions
                except Exception as e:
                    print(f"Error processing billing provisions row: {e}, row type: {type(row)}")
                    continue
            
            # Subtrair provisões do realizado
            for custo in realized_dict:
                if custo in billing_provisions_dict:
                    realized_dict[custo] -= billing_provisions_dict[custo]
        
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
            "stats": {"total": 0, "in_execution": 0, "rendering_accounts": 0, "finished": 0, "not_started": 0}
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
    # Realized = Sum(PAD_APAGAR + PAD_REALIZ) where length(PAD_NATURE) > 4 dígitos
    realized = db.query(func.sum(func.coalesce(PAD010.PAD_APAGAR, 0) + func.coalesce(PAD010.PAD_REALIZ, 0)))\
        .filter(
            PAD010.PAD_CUSTO == custo,
            func.length(PAD010.PAD_NATURE) > 4
        )\
        .scalar() or 0.0
    
    # Add Budget from CTT010.CTT_SALINI
    budget = float(project.CTT_SALINI or 0.0)
    
    # Subtrair provisões de faturamento (SC6010)
    # Soma dos C6_PRCVEN onde C6_Serie e C8_Nota não estão vazios
    billing_provisions = db.query(func.sum(SC6010.C6_PRCVEN))\
        .filter(
            SC6010.C6_CUSTO == custo,
            SC6010.D_E_L_E_T_ != '*',
            SC6010.C6_SERIE.isnot(None),
            SC6010.C6_SERIE != '',
            SC6010.C8_NOTA.isnot(None),
            SC6010.C8_NOTA != ''
        )\
        .scalar() or 0.0
    
    # Realizado ajustado = Realizado - Provisões de Faturamento
    realized_adjusted = float(realized) - float(billing_provisions)
    
    p_dict['realized'] = realized_adjusted
    p_dict['budget'] = budget
    p_dict['initial_balance'] = budget
    p_dict['billing_provisions'] = float(billing_provisions)  # Provisões que foram subtraídas
    
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
    """
    # Verificar se o projeto existe
    project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
    if not project:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    
    # Buscar todos os registros de faturamento do projeto
    # Filtrar apenas onde C6_Serie e C8_Nota não estão vazios
    billing_records = db.query(SC6010)\
        .filter(
            SC6010.C6_CUSTO == custo,
            SC6010.D_E_L_E_T_ != '*',
            SC6010.C6_SERIE.isnot(None),
            SC6010.C6_SERIE != '',
            SC6010.C8_NOTA.isnot(None),
            SC6010.C8_NOTA != ''
        )\
        .order_by(SC6010.C6_ITEM)\
        .all()
    
    # Converter para dicionário
    billing_list = []
    total_billing = 0.0
    
    for record in billing_records:
        billing_dict = object_as_dict(record)
        billing_value = float(record.C6_PRCVEN or 0.0)
        total_billing += billing_value
        billing_dict['C6_PRCVEN'] = billing_value
        billing_list.append(billing_dict)
    
    return {
        "project_code": custo,
        "project_name": project.CTT_DESC01 or "",
        "billing_records": billing_list,
        "total_billing": total_billing,
        "count": len(billing_list)
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
