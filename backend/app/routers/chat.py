import json
from typing import AsyncGenerator
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from langchain_core.messages import HumanMessage

from app.auth.clerk_auth import get_current_user
from app.routers.chat_schemas import ChatRequest, ChatResponse
from app.agent.graph import graph
from app.agent.state import AgentState
from app.memory.agent_memory import AgentMemory

router = APIRouter(prefix="/v1/chat", tags=["chat"])
memory = AgentMemory()


def build_state(request: ChatRequest, user: dict) -> AgentState:
    return AgentState(
        messages=[HumanMessage(content=request.message)],
        session_id=request.session_id,
        user_id=user["id"],
        active_topic=request.message[:100],
        module=request.module,
        tool_results=[],
        memory_context=[]
    )


async def event_generator(state: AgentState, request: ChatRequest, user_id: str) -> AsyncGenerator[str, None]:
    try:
        memory.save_chat_turn(
            session_id=request.session_id,
            role="user",
            message=request.message,
            user_id=user_id
        )
        
        async for event in graph.astream_events(state, version="v1"):
            event_type = event.get("event")
            
            if event_type == "on_chat_model_stream":
                token = event.get("data", {}).get("chunk", {}).content
                if token:
                    yield f"data: {json.dumps({'type': 'token', 'content': token})}\n\n"
            
            elif event_type == "on_chat_model_end":
                response = event.get("data", {}).get("output", {})
                if hasattr(response, "content"):
                    memory.save_chat_turn(
                        session_id=request.session_id,
                        role="assistant",
                        message=response.content,
                        user_id=user_id
                    )
        
        yield f"data: {json.dumps({'type': 'done', 'content': ''})}\n\n"
    
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"


@router.post("/invoke", response_model=ChatResponse)
async def invoke(request: ChatRequest, user: dict = Depends(get_current_user)) -> ChatResponse:
    state = build_state(request, user)
    
    try:
        result = await graph.ainvoke(state)
        
        messages = result.get("messages", [])
        response_content = ""
        for msg in reversed(messages):
            if hasattr(msg, "content"):
                response_content = msg.content
                break
        
        return ChatResponse(
            content=response_content,
            module=result.get("module", request.module),
            session_id=request.session_id
        )
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing request: {str(e)}"
        )


@router.post("/stream")
async def stream(request: ChatRequest, user: dict = Depends(get_current_user)):
    state = build_state(request, user)
    
    session = memory.get_session(request.session_id)
    if session is None:
        session = memory.create_session(
            user_id=user["id"],
            topic=request.message[:100],
            module=request.module
        )
    
    return StreamingResponse(
        event_generator(state, request, user["id"]),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )
