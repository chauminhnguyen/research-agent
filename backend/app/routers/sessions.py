"""Session management endpoints."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.supabase import (
    insert_session,
    insert_folders_for_session,
    list_sessions,
    get_session,
    is_supabase_available,
)
from app.auth.clerk_auth import get_current_user

router = APIRouter(prefix="/sessions", tags=["sessions"])


class SessionCreate(BaseModel):
    title: str


class FolderInfo(BaseModel):
    id: str
    type: str
    created_at: str


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str
    stage: str
    created_at: str
    folders: list[FolderInfo]


@router.post("", response_model=SessionResponse)
async def create_session(req: SessionCreate, user: dict = None):
    """Create a new session with all three folders."""
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    user_id = user.get("id") if user else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    session = insert_session(user_id=user_id, title=req.title)
    folders = insert_folders_for_session(session_id=session["id"])
    
    return SessionResponse(
        id=session["id"],
        user_id=session["user_id"],
        title=session["title"],
        stage=session.get("stage", "ideation"),
        created_at=session["created_at"],
        folders=[FolderInfo(id=f["id"], type=f["type"], created_at=f["created_at"]) for f in folders]
    )


@router.get("", response_model=list[SessionResponse])
async def list_user_sessions(user: dict = None):
    """List all sessions for the current user."""
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    user_id = user.get("id") if user else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    sessions = list_sessions(user_id)
    
    result = []
    for s in sessions:
        folders = s.get("folders", [])
        result.append(SessionResponse(
            id=s["id"],
            user_id=s["user_id"],
            title=s["title"],
            stage=s.get("stage", "ideation"),
            created_at=s["created_at"],
            folders=[FolderInfo(id=f["id"], type=f["type"], created_at=f["created_at"]) for f in folders]
        ))
    
    return result


@router.get("/{session_id}", response_model=SessionResponse)
async def get_session_by_id(session_id: str, user: dict = None):
    """Get a single session by ID."""
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    user_id = user.get("id") if user else None
    if not user_id:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    session = get_session(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    folders = session.get("folders", [])
    return SessionResponse(
        id=session["id"],
        user_id=session["user_id"],
        title=session["title"],
        stage=session.get("stage", "ideation"),
        created_at=session["created_at"],
        folders=[FolderInfo(id=f["id"], type=f["type"], created_at=f["created_at"]) for f in folders]
    )
