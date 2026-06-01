"""Chat endpoint for agent interactions."""

import json
import re
import logging
from typing import AsyncGenerator

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage, AIMessage

from app.agent.state import AgentState
from app.agent.prompts import IDEAS_PROMPT, CODE_PROMPT, PAPER_PROMPT
from app.agent.base import build_agent, create_traced_agent
from app.agent.tools import TOOL_LIST
from app.db.supabase import (
    get_shared_contexts,
    insert_message,
    is_supabase_available,
)
from app.auth.clerk_auth import get_current_user
from app.config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/chat", tags=["chat"])

settings = get_settings()

# Prompt mapping
_PROMPTS = {
    "ideas": IDEAS_PROMPT,
    "code": CODE_PROMPT,
    "paper": PAPER_PROMPT,
}

# Lazy-loading agent registry with tools
_AGENT_GETTERS = {
    "ideas": lambda: build_agent(IDEAS_PROMPT, tools=TOOL_LIST),
    "code": lambda: build_agent(CODE_PROMPT, tools=TOOL_LIST),
    "paper": lambda: build_agent(PAPER_PROMPT, tools=TOOL_LIST),
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
    user_id: str = None,
) -> AsyncGenerator[str, None]:
    """Generate SSE events from the agent stream."""
    full_content = ""
    tool_outputs = {}  # Store tool outputs by tool name

    # Get LangSmith callbacks if enabled
    callbacks = []
    if settings.langsmith_callback_enabled and settings.langsmith_configured:
        from app.observability.langsmith import get_langsmith_callbacks
        callbacks = get_langsmith_callbacks(
            session_id=session_id,
            folder_type=folder_type,
            user_id=user_id
        )

    try:
        # Use astream_events with callbacks if available - pass full state
        config = {"callbacks": callbacks} if callbacks else {}

        async for event in agent.astream_events(state, config=config, version="v2"):
            if event["event"] == "on_chat_model_stream":
                delta = event["data"]["chunk"].content
                if delta:
                    full_content += delta
                    yield f"data: {json.dumps({'delta': delta})}\n\n"
            elif event["event"] == "on_tool_start":
                tool_name = event["data"].get("input", {}).get("name", "unknown")
                logger.debug(f"Tool called: {tool_name}")
            elif event["event"] == "on_tool_end":
                tool_name = event["name"]
                tool_output = event["data"].get("output", {})
                # Store the tool output for later
                if isinstance(tool_output, dict):
                    tool_outputs[tool_name] = tool_output
                elif isinstance(tool_output, str):
                    try:
                        tool_outputs[tool_name] = json.loads(tool_output)
                    except:
                        tool_outputs[tool_name] = {"raw": tool_output}
                logger.debug(f"Tool finished: {tool_name}")

        # Check for papers from search_papers_tavily
        if "search_papers_tavily" in tool_outputs:
            papers_data = tool_outputs["search_papers_tavily"]
            if "new_papers" in papers_data and papers_data["new_papers"]:
                yield f"data: {json.dumps({'papers': papers_data})}\n\n"

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
    if req.folder_type not in _AGENT_GETTERS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid folder_type: {req.folder_type}. Must be one of: {list(_AGENT_GETTERS.keys())}"
        )
    
    # Save user message first if Supabase is available
    user_msg_id = None
    if is_supabase_available():
        try:
            user_msg_id = insert_message(
                folder_id=req.folder_id,
                role="user",
                content=req.messages[-1].content if req.messages else "",
                is_shareable=False
            )
        except Exception as e:
            print(f"Failed to save user message: {e}")
    
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
        "remaining_steps": 50,  # Max iterations for tool calls
    }
    
    agent = _AGENT_GETTERS[req.folder_type]()
    
    return StreamingResponse(
        event_generator(agent, state, req.folder_id, req.folder_type, req.session_id, req.user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
