from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class SessionCreate(BaseModel):
    topic: str = Field(..., min_length=1, max_length=500)
    module: str = Field(default="ideas", pattern="^(ideas|coding|paper)$")


class SessionResponse(BaseModel):
    id: str
    user_id: str
    topic: str
    module: str
    created_at: str
    updated_at: str


class SessionListResponse(BaseModel):
    sessions: list[SessionResponse]
