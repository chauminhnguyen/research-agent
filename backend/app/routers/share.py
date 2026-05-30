"""Share endpoint for creating shared contexts."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.db.supabase import (
    insert_shared_context,
    is_supabase_available,
)

router = APIRouter(prefix="/share", tags=["share"])


class ShareRequest(BaseModel):
    message_id: str
    session_id: str
    target_folder: str  # "code" or "paper"
    summary: str


class ShareResponse(BaseModel):
    ok: bool
    id: str | None = None


@router.post("", response_model=ShareResponse)
async def create_share(req: ShareRequest):
    """Create a shared context from a shareable idea."""
    if not is_supabase_available():
        raise HTTPException(status_code=503, detail="Database not configured")
    
    # Validate target folder
    if req.target_folder not in ("code", "paper"):
        raise HTTPException(
            status_code=400,
            detail="target_folder must be 'code' or 'paper'"
        )
    
    try:
        context = insert_shared_context(
            message_id=req.message_id,
            session_id=req.session_id,
            target_folder=req.target_folder,
            summary=req.summary
        )
        
        return ShareResponse(ok=True, id=context.get("id"))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
