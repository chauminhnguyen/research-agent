"""Supabase client for database operations."""

import os
from typing import Optional

try:
    from supabase import create_client, Client
    SUPABASE_AVAILABLE = True
except ImportError:
    SUPABASE_AVAILABLE = False
    Client = None

from app.config import get_settings


settings = get_settings()

# Create Supabase client if credentials are available
_url = os.environ.get("SUPABASE_URL") or getattr(settings, 'supabase_url', '')
_key = os.environ.get("SUPABASE_SERVICE_KEY") or getattr(settings, 'supabase_service_key', '')

sb: Optional[Client] = None
if SUPABASE_AVAILABLE and _url and _key:
    sb = create_client(_url, _key)


def is_supabase_available() -> bool:
    """Check if Supabase client is configured."""
    return sb is not None


def insert_session(user_id: str, title: str) -> dict:
    """Create a new session with all three folders."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    # Create session
    session = sb.table("sessions").insert({
        "user_id": user_id,
        "title": title,
        "stage": "ideation"
    }).execute()
    
    if not session.data:
        raise RuntimeError("Failed to create session")
    
    return session.data[0]


def insert_folders_for_session(session_id: str) -> list[dict]:
    """Create the three folders (ideas, code, paper) for a session."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    folders = sb.table("folders").insert([
        {"session_id": session_id, "type": "ideas"},
        {"session_id": session_id, "type": "code"},
        {"session_id": session_id, "type": "paper"},
    ]).execute()
    
    return folders.data


def list_sessions(user_id: str) -> list[dict]:
    """List all sessions for a user."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    result = sb.table("sessions").select(
        "*, folders(id, type, created_at)"
    ).eq("user_id", user_id).order("created_at", desc=True).execute()
    
    return result.data or []


def get_session(session_id: str, user_id: str) -> Optional[dict]:
    """Get a single session with its folders."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    result = sb.table("sessions").select(
        "*, folders(id, type, created_at)"
    ).eq("id", session_id).eq("user_id", user_id).execute()
    
    return result.data[0] if result.data else None


def list_folders(session_id: str) -> list[dict]:
    """List all folders for a session."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    result = sb.table("folders").select("*").eq("session_id", session_id).execute()
    return result.data or []


def get_folder_by_type(session_id: str, folder_type: str) -> Optional[dict]:
    """Get a specific folder by type for a session."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    result = sb.table("folders").select("*").eq("session_id", session_id).eq("type", folder_type).execute()
    return result.data[0] if result.data else None


def list_messages(folder_id: str) -> list[dict]:
    """List all messages for a folder."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    result = sb.table("messages").select("*").eq("folder_id", folder_id).order("created_at").execute()
    return result.data or []


def insert_message(folder_id: str, role: str, content: str, is_shareable: bool = False) -> dict:
    """Insert a message into a folder."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    message = sb.table("messages").insert({
        "folder_id": folder_id,
        "role": role,
        "content": content,
        "is_shareable": is_shareable
    }).execute()
    
    return message.data[0] if message.data else {}


def get_shared_contexts(session_id: str, target_folder: str) -> list[str]:
    """Get pinned idea summaries for a target folder."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    result = sb.table("shared_contexts").select("summary").eq("session_id", session_id).eq("target_folder", target_folder).order("pinned_order").execute()
    
    return [r["summary"] for r in (result.data or [])]


def insert_shared_context(message_id: str, session_id: str, target_folder: str, summary: str) -> dict:
    """Create a shared context entry."""
    if not sb:
        raise RuntimeError("Supabase client not configured")
    
    # Get current count for pinned_order
    count_result = sb.table("shared_contexts").select(
        "id", count="exact"
    ).eq("session_id", session_id).eq("target_folder", target_folder).execute()
    
    pinned_order = (count_result.count or 0) + 1
    
    context = sb.table("shared_contexts").insert({
        "message_id": message_id,
        "session_id": session_id,
        "target_folder": target_folder,
        "summary": summary,
        "pinned_order": pinned_order
    }).execute()
    
    return context.data[0] if context.data else {}
