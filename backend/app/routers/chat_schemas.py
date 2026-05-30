from __future__ import annotations

from typing import Literal

from langchain_core.messages import AIMessage, HumanMessage
from pydantic import BaseModel, Field


FolderType = Literal["ideas", "code", "paper"]
MessageRole = Literal["user", "assistant"]


class ChatMessage(BaseModel):
    role: MessageRole
    content: str = Field(..., min_length=1, max_length=20000)


class ChatRequest(BaseModel):
    folder_id: str
    folder_type: FolderType
    session_id: str
    user_id: str
    messages: list[ChatMessage]


class ShareEvent(BaseModel):
    shareable: str


def to_langchain_messages(msgs: list[ChatMessage]):
    lc = []
    for m in msgs:
        if m.role == "user":
            lc.append(HumanMessage(content=m.content))
        else:
            lc.append(AIMessage(content=m.content))
    return lc
