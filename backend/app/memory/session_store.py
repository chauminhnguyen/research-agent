import sqlite3
import uuid
from datetime import datetime
from typing import Optional
from dataclasses import dataclass

from app.config import get_settings


@dataclass
class MemoryEvent:
    event_id: str
    session_id: str
    event_type: str
    content: dict
    created_at: str


def get_db_connection() -> sqlite3.Connection:
    settings = get_settings()
    db_path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_memory_tables() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            topic TEXT NOT NULL,
            module TEXT DEFAULT 'ideas',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS events (
            id TEXT PRIMARY KEY,
            session_id TEXT NOT NULL,
            event_type TEXT NOT NULL,
            content TEXT NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY (session_id) REFERENCES sessions(id)
        )
    """)
    
    cursor.execute("""
        CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id)
    """)
    
    conn.commit()
    conn.close()


class SessionStore:
    def __init__(self):
        init_memory_tables()

    def create_session(self, user_id: str, topic: str, module: str = "ideas") -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        session_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT INTO sessions (id, user_id, topic, module, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
            (session_id, user_id, topic, module, now, now)
        )
        conn.commit()
        conn.close()
        return {"id": session_id, "user_id": user_id, "topic": topic, "module": module, "created_at": now, "updated_at": now}

    def get_session(self, session_id: str) -> Optional[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM sessions WHERE id = ?", (session_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None

    def list_sessions(self, user_id: str) -> list[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, user_id, topic, module, created_at, updated_at FROM sessions WHERE user_id = ? ORDER BY updated_at DESC",
            (user_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    def update_session(self, session_id: str, **kwargs) -> None:
        conn = get_db_connection()
        cursor = conn.cursor()
        now = datetime.utcnow().isoformat()
        set_clauses = ["updated_at = ?"]
        values = [now]
        for key, value in kwargs.items():
            if key in ("topic", "module"):
                set_clauses.append(f"{key} = ?")
                values.append(value)
        values.append(session_id)
        cursor.execute(
            f"UPDATE sessions SET {', '.join(set_clauses)} WHERE id = ?",
            values
        )
        conn.commit()
        conn.close()

    def log_event(self, session_id: str, event_type: str, content: dict) -> MemoryEvent:
        conn = get_db_connection()
        cursor = conn.cursor()
        event_id = str(uuid.uuid4())
        now = datetime.utcnow().isoformat()
        cursor.execute(
            "INSERT INTO events (id, session_id, event_type, content, created_at) VALUES (?, ?, ?, ?, ?)",
            (event_id, session_id, event_type, now, str(content))
        )
        conn.commit()
        conn.close()
        return MemoryEvent(event_id=event_id, session_id=session_id, event_type=event_type, content=content, created_at=now)

    def get_events(self, session_id: str) -> list[MemoryEvent]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(
            "SELECT id, session_id, event_type, content, created_at FROM events WHERE session_id = ? ORDER BY created_at ASC",
            (session_id,)
        )
        rows = cursor.fetchall()
        conn.close()
        events = []
        for row in rows:
            row_dict = dict(row)
            try:
                import json
                content = json.loads(row_dict["content"])
            except (json.JSONDecodeError, TypeError):
                content = row_dict["content"]
            events.append(MemoryEvent(
                event_id=row_dict["id"],
                session_id=row_dict["session_id"],
                event_type=row_dict["event_type"],
                content=content,
                created_at=row_dict["created_at"]
            ))
        return events

    def delete_session(self, session_id: str) -> bool:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM events WHERE session_id = ?", (session_id,))
        cursor.execute("DELETE FROM sessions WHERE id = ?", (session_id,))
        changes = conn.total_changes
        conn.commit()
        conn.close()
        return changes > 0
