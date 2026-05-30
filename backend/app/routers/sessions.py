from fastapi import APIRouter, Depends, HTTPException, status, Query

from app.auth.clerk_auth import get_current_user
from app.routers.sessions_schemas import SessionCreate, SessionUpdate, SessionResponse, SessionListResponse
from app.memory.agent_memory import AgentMemory

router = APIRouter(prefix="/v1/sessions", tags=["sessions"])
memory = AgentMemory()


@router.get("", response_model=SessionListResponse)
async def list_sessions(
    limit: int = Query(20, ge=1, le=100, description="Maximum number of sessions to return"),
    offset: int = Query(0, ge=0, description="Number of sessions to skip"),
    user: dict = Depends(get_current_user)
) -> SessionListResponse:
    sessions, total = memory.list_sessions_paginated(user["id"], limit, offset)
    return SessionListResponse(
        sessions=[SessionResponse(**s) for s in sessions],
        total=total,
        limit=limit,
        offset=offset
    )


@router.post("", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(request: SessionCreate, user: dict = Depends(get_current_user)) -> SessionResponse:
    session = memory.create_session(
        user_id=user["id"],
        topic=request.topic,
        module=request.module
    )
    return SessionResponse(**session)


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session(session_id: str, user: dict = Depends(get_current_user)) -> SessionResponse:
    session = memory.get_session(session_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session["user_id"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    return SessionResponse(**session)


@router.get("/{session_id}/history")
async def get_session_history(
    session_id: str,
    limit: int = Query(50, ge=1, le=200, description="Maximum number of events to return"),
    offset: int = Query(0, ge=0, description="Number of events to skip"),
    user: dict = Depends(get_current_user)
) -> dict:
    session = memory.get_session(session_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session["user_id"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to access this session"
        )
    
    events, total = memory.get_session_history(session_id, limit, offset)
    return {
        "session": SessionResponse(**session),
        "events": [
            {
                "id": e.event_id,
                "event_type": e.event_type,
                "content": e.content,
                "created_at": e.created_at
            }
            for e in events
        ],
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.patch("/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: str,
    request: SessionUpdate,
    user: dict = Depends(get_current_user)
) -> SessionResponse:
    session = memory.get_session(session_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session["user_id"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this session"
        )
    
    update_data = {}
    if request.topic is not None:
        update_data["topic"] = request.topic
    if request.module is not None:
        update_data["module"] = request.module
    
    if update_data:
        memory.store.update_session(session_id, **update_data)
    
    updated_session = memory.get_session(session_id)
    return SessionResponse(**updated_session)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, user: dict = Depends(get_current_user)) -> None:
    session = memory.get_session(session_id)
    
    if session is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    if session["user_id"] != user["id"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to delete this session"
        )
    
    memory.delete_session(session_id)
    return None
