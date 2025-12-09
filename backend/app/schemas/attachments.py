from typing import Optional
from pydantic import BaseModel

class ProjectAttachmentResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    category: str  # 'contract' | 'invoice' | 'report' | 'other'
    size: int
    uploaded_by: str
    uploaded_at: str
    url: str

    class Config:
        from_attributes = True

