from pydantic import BaseModel, Field
from typing import Optional


class RecallRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500)
    session_id: Optional[str] = None
    limit: int = Field(default=5, ge=1, le=20)


class RecallResponse(BaseModel):
    hits: list[dict]
    query: str
