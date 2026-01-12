from pydantic import BaseModel
from datetime import datetime
from typing import List, Optional, Dict, Any

class OFXTransactionBase(BaseModel):
    bank_id: str
    acct_id: str
    trn_type: str
    dt_posted: datetime
    amount: float
    fitid: str
    check_num: Optional[str] = None
    memo: str
    balance: Optional[float] = None
    project_id: Optional[str] = None

class OFXTransactionCreate(OFXTransactionBase):
    pass

class OFXTransactionSchema(OFXTransactionBase):
    id: int
    validation_status: str
    validation_notes: Optional[str] = None
    validated_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class OFXUploadResponse(BaseModel):
    total_processed: int
    new_records: int
    already_exists: int

class OFXValidationSummary(BaseModel):
    total_transactions: int
    validated: int
    discrepancies: int
    pending: int

class OFXAssociateRequest(BaseModel):
    project_id: str

class OFXTransactionListResponse(BaseModel):
    total: int
    data: List[OFXTransactionSchema]
    skip: int
    limit: int
    stats: Optional[Dict[str, Any]] = None
