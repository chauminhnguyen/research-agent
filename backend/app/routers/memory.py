from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth.router import get_current_user
from app.routers.memory_schemas import RecallResponse
from app.memory.agent_memory import AgentMemory

router = APIRouter(prefix="/v1/memory", tags=["memory"])
memory = AgentMemory()


@router.get("/recall", response_model=RecallResponse)
async def recall(
    q: str = Query(..., min_length=1, max_length=500, description="Search query"),
    session_id: str | None = Query(None, description="Optional session ID to scope the search"),
    limit: int = Query(5, ge=1, le=20, description="Maximum number of results"),
    user: dict = Depends(get_current_user)
) -> RecallResponse:
    # Validate session ownership if session_id is provided
    if session_id:
        session = memory.get_session(session_id)
        if session is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        if session["user_id"] != user["id"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session's memory"
            )
    
    hits = memory.recall(q, session_id, limit, user["id"])
    return RecallResponse(hits=hits, query=q)


@router.get("/history/{session_id}")
async def get_memory_history(
    session_id: str,
    user: dict = Depends(get_current_user)
) -> dict:
    session = memory.get_session(session_id)
    
    if session is None:
        return {"error": "Session not found", "events": []}
    
    if session["user_id"] != user["id"]:
        return {"error": "Not authorized", "events": []}
    
    events = memory.get_session_history(session_id)
    return {
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
