from typing import Any, List, Optional, Dict
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect, func
from sqlalchemy.inspection import inspect as sqlalchemy_inspect
from app.api import deps
from app.models.protheus import CTT010, PAC010, PAD010
from app.db.session import engine_local, SessionLocal
from app.services.validation_service import validation_service
from app.schemas.validation import RejectionRequest

router = APIRouter()

def object_as_dict(obj):
    """Convert SQLAlchemy model instance to dictionary."""
    if not obj:
        return {}
    
    result = {}
    for c in sqlalchemy_inspect(obj).mapper.column_attrs:
        val = getattr(obj, c.key)
        if isinstance(val, bytes):
            try:
                val = val.decode('utf-8', errors='ignore')
            except:
                val = str(val)
        
        if isinstance(val, str):
            val = val.strip()
            
        result[c.key] = val
    return result

def get_table_model(table_name: str):
    """Get the SQLAlchemy model for a table name."""
    table_map = {
        "CTT010": CTT010,
        "PAC010": PAC010,
        "PAD010": PAD010
    }
    return table_map.get(table_name)

def get_primary_key_column(table_name: str):
    """Get the primary key column name for a table."""
    inspector = inspect(engine_local)
    pk_constraint = inspector.get_pk_constraint(table_name)
    if pk_constraint and pk_constraint['constrained_columns']:
        return pk_constraint['constrained_columns'][0]
    return None

@router.get("/stats", response_model=dict)
def get_validation_stats(
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Get validation statistics for all tables."""
    try:
        stats = validation_service.get_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter estatísticas: {str(e)}")

@router.get("/project/{custo}", response_model=dict)
def get_project_for_validation(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Get a complete project with all related data for validation."""
    try:
        # Get project
        project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
        if not project:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        project_dict = object_as_dict(project)
        
        # Get validation status
        val_status = validation_service.get_validation_status("CTT010", custo)
        project_dict["validation_status"] = val_status
        
        # Get related movements (PAC010)
        movements = db.query(PAC010).filter(PAC010.PAC_CUSTO == custo).all()
        movements_list = []
        for mov in movements:
            mov_dict = object_as_dict(mov)
            mov_id = str(mov.R_E_C_N_O_)
            mov_val_status = validation_service.get_validation_status("PAC010", mov_id)
            mov_dict["validation_status"] = mov_val_status
            movements_list.append(mov_dict)
        
        # Get related budgets (PAD010)
        budgets = db.query(PAD010).filter(PAD010.PAD_CUSTO == custo).all()
        budgets_list = []
        for budget in budgets:
            budget_dict = object_as_dict(budget)
            budget_id = str(budget.R_E_C_N_O_)
            budget_val_status = validation_service.get_validation_status("PAD010", budget_id)
            budget_dict["validation_status"] = budget_val_status
            budgets_list.append(budget_dict)
        
        # Calculate totals
        total_movements = sum(m.PAC_VALOR or 0 for m in movements)
        total_budget = sum(b.PAD_ORCADO or 0 for b in budgets)
        total_realized = sum(b.PAD_REALIZ or 0 for b in budgets)
        
        return {
            "project": project_dict,
            "movements": movements_list,
            "budgets": budgets_list,
            "summary": {
                "total_movements": float(total_movements),
                "total_budget": float(total_budget),
                "total_realized": float(total_realized),
                "movements_count": len(movements_list),
                "budgets_count": len(budgets_list),
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter projeto: {str(e)}")

@router.post("/project/{custo}/approve-all", response_model=dict)
def approve_project_all(
    custo: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Approve project and all related movements and budgets."""
    try:
        # Get project
        project = db.query(CTT010).filter(CTT010.CTT_CUSTO == custo).first()
        if not project:
            raise HTTPException(status_code=404, detail="Projeto não encontrado")
        
        project_dict = object_as_dict(project)
        
        # Approve and migrate project
        success = validation_service.migrate_to_validated("CTT010", project_dict)
        if not success:
            raise HTTPException(status_code=500, detail="Erro ao migrar projeto")
        validation_service.update_validation_status("CTT010", custo, "APPROVED", current_user)
        
        # Get and approve movements
        movements = db.query(PAC010).filter(PAC010.PAC_CUSTO == custo).all()
        approved_movements = 0
        for mov in movements:
            mov_dict = object_as_dict(mov)
            mov_id = str(mov.R_E_C_N_O_)
            mov_status = validation_service.get_validation_status("PAC010", mov_id)
            
            # Only approve if not already approved
            if mov_status.get("status") != "APPROVED":
                success = validation_service.migrate_to_validated("PAC010", mov_dict)
                if success:
                    validation_service.update_validation_status("PAC010", mov_id, "APPROVED", current_user)
                    approved_movements += 1
        
        # Get and approve budgets
        budgets = db.query(PAD010).filter(PAD010.PAD_CUSTO == custo).all()
        approved_budgets = 0
        for budget in budgets:
            budget_dict = object_as_dict(budget)
            budget_id = str(budget.R_E_C_N_O_)
            budget_status = validation_service.get_validation_status("PAD010", budget_id)
            
            # Only approve if not already approved
            if budget_status.get("status") != "APPROVED":
                success = validation_service.migrate_to_validated("PAD010", budget_dict)
                if success:
                    validation_service.update_validation_status("PAD010", budget_id, "APPROVED", current_user)
                    approved_budgets += 1
        
        return {
            "message": "Projeto e registros relacionados aprovados com sucesso",
            "project_id": custo,
            "approved_movements": approved_movements,
            "approved_budgets": approved_budgets
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao aprovar projeto: {str(e)}")

@router.get("/{table}", response_model=dict)
def list_pending_records(
    table: str,
    db: Session = Depends(deps.get_db),
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=100),
    search: Optional[str] = None,
    status: Optional[str] = Query(None, regex="^(PENDING|APPROVED|REJECTED)$"),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """List records for validation with pagination and filters."""
    if table not in ["CTT010", "PAC010", "PAD010"]:
        raise HTTPException(status_code=400, detail="Tabela inválida")
    
    try:
        model = get_table_model(table)
        if not model:
            raise HTTPException(status_code=400, detail="Modelo não encontrado")
        
        skip = (page - 1) * limit
        
        # Base query
        query = db.query(model)
        
        # Apply search filter
        if search:
            search_filter = f"%{search}%"
            if table == "CTT010":
                query = query.filter(
                    (CTT010.CTT_DESC01.ilike(search_filter)) |
                    (CTT010.CTT_CUSTO.ilike(search_filter)) |
                    (CTT010.CTT_NOMECO.ilike(search_filter))
                )
            elif table == "PAC010":
                query = query.filter(
                    (PAC010.PAC_CUSTO.ilike(search_filter)) |
                    (PAC010.PAC_HISTOR.ilike(search_filter))
                )
            elif table == "PAD010":
                query = query.filter(
                    (PAD010.PAD_CUSTO.ilike(search_filter)) |
                    (PAD010.PAD_DESCRI.ilike(search_filter))
                )
        
        # Get all records first to filter by validation status
        all_records = query.all()
        
        # Filter by validation status
        filtered_records = []
        for record in all_records:
            pk_column = get_primary_key_column(table)
            if pk_column:
                record_id = getattr(record, pk_column)
                val_status = validation_service.get_validation_status(table, str(record_id))
                
                if status:
                    if val_status and val_status.get("status") == status:
                        filtered_records.append(record)
                else:
                    # Default: show only PENDING
                    if not val_status or val_status.get("status") == "PENDING":
                        filtered_records.append(record)
        
        # Paginate
        total = len(filtered_records)
        paginated_records = filtered_records[skip:skip + limit]
        
        # Convert to dicts and add validation status
        data = []
        for record in paginated_records:
            record_dict = object_as_dict(record)
            pk_column = get_primary_key_column(table)
            if pk_column:
                record_id = getattr(record, pk_column)
                val_status = validation_service.get_validation_status(table, str(record_id))
                record_dict["validation_status"] = val_status
            data.append(record_dict)
        
        return {
            "data": data,
            "total": total,
            "page": page,
            "limit": limit,
            "total_pages": (total + limit - 1) // limit
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar registros: {str(e)}")

@router.get("/{table}/{record_id}", response_model=dict)
def get_record(
    table: str,
    record_id: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Get a specific record by ID."""
    if table not in ["CTT010", "PAC010", "PAD010"]:
        raise HTTPException(status_code=400, detail="Tabela inválida")
    
    try:
        model = get_table_model(table)
        if not model:
            raise HTTPException(status_code=400, detail="Modelo não encontrado")
        
        pk_column = get_primary_key_column(table)
        if not pk_column:
            raise HTTPException(status_code=500, detail="Chave primária não encontrada")
        
        # Handle different primary key types
        try:
            if table == "PAC010" or table == "PAD010":
                record_id_int = int(record_id)
                record = db.query(model).filter(getattr(model, pk_column) == record_id_int).first()
            else:
                record = db.query(model).filter(getattr(model, pk_column) == record_id).first()
        except ValueError:
            raise HTTPException(status_code=400, detail="ID de registro inválido")
        
        if not record:
            raise HTTPException(status_code=404, detail="Registro não encontrado")
        
        record_dict = object_as_dict(record)
        val_status = validation_service.get_validation_status(table, record_id)
        record_dict["validation_status"] = val_status
        
        return record_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter registro: {str(e)}")

@router.put("/{table}/{record_id}", response_model=dict)
def update_record(
    table: str,
    record_id: str,
    updates: Dict[str, Any],
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Update a record's fields."""
    if table not in ["CTT010", "PAC010", "PAD010"]:
        raise HTTPException(status_code=400, detail="Tabela inválida")
    
    try:
        success = validation_service.update_record(table, record_id, updates)
        if not success:
            raise HTTPException(status_code=404, detail="Registro não encontrado ou não pôde ser atualizado")
        
        # Return updated record
        model = get_table_model(table)
        pk_column = get_primary_key_column(table)
        
        try:
            if table == "PAC010" or table == "PAD010":
                record_id_int = int(record_id)
                record = db.query(model).filter(getattr(model, pk_column) == record_id_int).first()
            else:
                record = db.query(model).filter(getattr(model, pk_column) == record_id).first()
        except ValueError:
            raise HTTPException(status_code=400, detail="ID de registro inválido")
        
        if not record:
            raise HTTPException(status_code=404, detail="Registro não encontrado após atualização")
        
        record_dict = object_as_dict(record)
        val_status = validation_service.get_validation_status(table, record_id)
        record_dict["validation_status"] = val_status
        
        return record_dict
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao atualizar registro: {str(e)}")

@router.post("/{table}/{record_id}/approve", response_model=dict)
def approve_record(
    table: str,
    record_id: str,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Approve a record and migrate it to validated database."""
    if table not in ["CTT010", "PAC010", "PAD010"]:
        raise HTTPException(status_code=400, detail="Tabela inválida")
    
    try:
        # Get the record
        model = get_table_model(table)
        pk_column = get_primary_key_column(table)
        
        try:
            if table == "PAC010" or table == "PAD010":
                record_id_int = int(record_id)
                record = db.query(model).filter(getattr(model, pk_column) == record_id_int).first()
            else:
                record = db.query(model).filter(getattr(model, pk_column) == record_id).first()
        except ValueError:
            raise HTTPException(status_code=400, detail="ID de registro inválido")
        
        if not record:
            raise HTTPException(status_code=404, detail="Registro não encontrado")
        
        # Convert to dict
        record_dict = object_as_dict(record)
        
        # Migrate to validated database
        success = validation_service.migrate_to_validated(table, record_dict)
        if not success:
            raise HTTPException(status_code=500, detail="Erro ao migrar registro para banco validado")
        
        # Update validation status
        validation_service.update_validation_status(
            table, 
            record_id, 
            "APPROVED", 
            current_user
        )
        
        return {
            "message": "Registro aprovado e migrado com sucesso",
            "record_id": record_id,
            "table": table
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao aprovar registro: {str(e)}")

@router.post("/{table}/{record_id}/reject", response_model=dict)
def reject_record(
    table: str,
    record_id: str,
    rejection_data: RejectionRequest,
    db: Session = Depends(deps.get_db),
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """Reject a record with a reason."""
    if table not in ["CTT010", "PAC010", "PAD010"]:
        raise HTTPException(status_code=400, detail="Tabela inválida")
    
    try:
        # Check if record exists
        model = get_table_model(table)
        pk_column = get_primary_key_column(table)
        
        try:
            if table == "PAC010" or table == "PAD010":
                record_id_int = int(record_id)
                record = db.query(model).filter(getattr(model, pk_column) == record_id_int).first()
            else:
                record = db.query(model).filter(getattr(model, pk_column) == record_id).first()
        except ValueError:
            raise HTTPException(status_code=400, detail="ID de registro inválido")
        
        if not record:
            raise HTTPException(status_code=404, detail="Registro não encontrado")
        
        rejection_reason = rejection_data.rejection_reason
        
        # Update validation status
        success = validation_service.update_validation_status(
            table, 
            record_id, 
            "REJECTED", 
            current_user,
            rejection_reason
        )
        
        if not success:
            raise HTTPException(status_code=500, detail="Erro ao atualizar status de validação")
        
        return {
            "message": "Registro rejeitado com sucesso",
            "record_id": record_id,
            "table": table,
            "rejection_reason": rejection_reason
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao rejeitar registro: {str(e)}")
