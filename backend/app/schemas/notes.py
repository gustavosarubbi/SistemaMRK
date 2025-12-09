from typing import Optional
from pydantic import BaseModel
from datetime import datetime

class ProjectNoteBase(BaseModel):
    content: str

class ProjectNoteCreate(ProjectNoteBase):
    pass

class ProjectNoteUpdate(BaseModel):
    content: str

class ProjectNoteResponse(BaseModel):
    id: str
    project_id: str
    content: str
    author: str
    created_at: str
    updated_at: Optional[str] = None

    class Config:
        from_attributes = True

