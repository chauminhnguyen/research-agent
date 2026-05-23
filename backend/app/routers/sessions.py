from fastapi import APIRouter, Depends, HTTPException, status

from app.auth.router import get_current_user
from app.routers.sessions_schemas import SessionCreate, SessionResponse, SessionListResponse
from app.memory.agent_memory import AgentMemory

router = APIRouter(prefix="/sessions", tags=["sessions"])
memory = AgentMemory()


@router.get("", response_model=SessionListResponse)
async def list_sessions(user: dict = Depends(get_current_user)) -> SessionListResponse:
    sessions = memory.list_sessions(user["id"])
    return SessionListResponse(sessions=sessions)


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
async def get_session_history(session_id: str, user: dict = Depends(get_current_user)) -> dict:
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
    
    events = memory.get_session_history(session_id)
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
        ]
    }
