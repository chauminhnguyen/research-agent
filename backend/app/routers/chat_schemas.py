from pydantic import BaseModel, Field
from typing import Literal, Optional


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=4000)
    session_id: str
    module: Literal["ideas", "coding", "paper"] = "ideas"


class ChatResponse(BaseModel):
    content: str
    module: str
    session_id: str
