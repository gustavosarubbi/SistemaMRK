from pydantic import BaseModel
from typing import Optional

class RejectionRequest(BaseModel):
    rejection_reason: str




