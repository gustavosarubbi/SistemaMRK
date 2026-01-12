from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api import deps
from app.services.ofx_service import ofx_service
from app.schemas.ofx import OFXTransactionCreate, OFXTransactionSchema, OFXUploadResponse, OFXValidationSummary, OFXAssociateRequest, OFXTransactionListResponse
from datetime import datetime

router = APIRouter()

@router.post("/upload", response_model=OFXUploadResponse)
def upload_transactions(
    transactions: List[OFXTransactionCreate],
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Upload parsed OFX transactions to the Audit database.
    """
    try:
        result = ofx_service.save_transactions(transactions)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar transações: {str(e)}")

@router.get("/transactions", response_model=OFXTransactionListResponse)
def list_transactions(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    min_amount: Optional[float] = None,
    max_amount: Optional[float] = None,
    project_id: Optional[str] = None,
    search: Optional[str] = None,
    trn_type: Optional[str] = None,
    validation_status: Optional[str] = None,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    List transactions from the Audit database with advanced filters.
    """
    try:
        transactions = ofx_service.get_transactions(
            skip=skip, 
            limit=limit,
            start_date=start_date,
            end_date=end_date,
            min_amount=min_amount,
            max_amount=max_amount,
            project_id=project_id,
            search=search,
            trn_type=trn_type,
            validation_status=validation_status
        )
        return transactions
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao listar transações: {str(e)}")

@router.put("/transactions/{tx_id}/associate", response_model=dict)
def associate_transaction(
    tx_id: int,
    request: OFXAssociateRequest,
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Associate a transaction with a project.
    """
    success = ofx_service.associate_project(tx_id, request.project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Transação não encontrada")
    return {"message": "Associação realizada com sucesso"}

@router.post("/auto-match", response_model=dict)
def auto_match_transactions(
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Run auto-matching logic for unassociated transactions.
    """
    try:
        count = ofx_service.auto_match_projects()
        return {"matched_count": count}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro no auto-match: {str(e)}")

@router.post("/validate", response_model=OFXValidationSummary)
def validate_transactions(
    current_user: str = Depends(deps.get_current_user),
) -> Any:
    """
    Run validation for all pending transactions.
    """
    try:
        summary = ofx_service.validate_all_pending()
        return summary
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao validar transações: {str(e)}")
