"""Chat endpoint for agent interactions."""

import json
import re
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from app.agent.ideas_agent import IDEAS_AGENT
from app.agent.code_agent import CODE_AGENT
from app.agent.paper_agent import PAPER_AGENT
from app.agent.state import AgentState
from app.db.supabase import (
    get_shared_contexts,
    insert_message,
    is_supabase_available,
)
from app.auth.clerk_auth import get_current_user

router = APIRouter(prefix="/chat", tags=["chat"])

AGENTS = {
    "ideas": IDEAS_AGENT,
    "code": CODE_AGENT,
    "paper": PAPER_AGENT,
}


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    folder_id: str
    folder_type: str  # "ideas" | "code" | "paper"
    session_id: str
    user_id: str
    messages: list[ChatMessage]


async def event_generator(
    agent,
    state: AgentState,
    folder_id: str,
    folder_type: str,
    session_id: str,
) -> AsyncGenerator[str, None]:
    """Generate SSE events from the agent stream."""
    full_content = ""
    
    try:
        async for event in agent.astream_events(state, version="v2"):
            if event["event"] == "on_chat_model_stream":
                delta = event["data"]["chunk"].content
                if delta:
                    full_content += delta
                    yield f"data: {json.dumps({'delta': delta})}\n\n"

        # Parse <shareable> tag from Ideas agent
        is_shareable = False
        summary = None
        
        if folder_type == "ideas":
            match = re.search(r"<shareable>(.*?)</shareable>", full_content, re.DOTALL)
            is_shareable = bool(match)
            summary = match.group(1).strip() if match else None
        
        # Clean content by removing <shareable> tags
        clean_content = re.sub(r"<shareable>.*?</shareable>", "", full_content, flags=re.DOTALL).strip()
        
        # Persist assistant message if Supabase is available
        if is_supabase_available():
            try:
                insert_message(
                    folder_id=folder_id,
                    role="assistant",
                    content=clean_content,
                    is_shareable=is_shareable
                )
            except Exception as e:
                # Log but don't fail the stream
                print(f"Failed to save message: {e}")

        # Send shareable notification if applicable
        if is_shareable and summary:
            yield f"data: {json.dumps({'shareable': summary})}\n\n"
        
        yield "data: [DONE]\n\n"
    
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@router.post("")
async def chat(req: ChatRequest):
    """Stream chat responses from the appropriate agent."""
    # Validate folder type
    if req.folder_type not in AGENTS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid folder_type: {req.folder_type}. Must be one of: {list(AGENTS.keys())}"
        )
    
    # Load pinned contexts for code/paper folders
    pinned = []
    if req.folder_type in ("code", "paper"):
        if is_supabase_available():
            pinned = get_shared_contexts(req.session_id, req.folder_type)
    
    # Convert messages to LangChain format
    lc_messages = []
    for m in req.messages:
        if m.role == "user":
            lc_messages.append(HumanMessage(content=m.content))
        elif m.role == "assistant":
            lc_messages.append(AIMessage(content=m.content))
    
    # Build agent state
    state: AgentState = {
        "messages": lc_messages,
        "folder_type": req.folder_type,
        "folder_id": req.folder_id,
        "session_id": req.session_id,
        "pinned_contexts": pinned,
    }
    
    agent = AGENTS[req.folder_type]
    
    return StreamingResponse(
        event_generator(agent, state, req.folder_id, req.folder_type, req.session_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
