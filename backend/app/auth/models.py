import sqlite3
import uuid
from datetime import datetime
from typing import Optional

from app.config import get_settings


def get_db_connection() -> sqlite3.Connection:
    settings = get_settings()
    db_path = settings.database_url.replace("sqlite:///", "")
    conn = sqlite3.connect(db_path, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_users_table() -> None:
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


class UserModel:
    def __init__(self):
        init_users_table()

    def create(self, email: str, password_hash: str) -> dict:
        conn = get_db_connection()
        cursor = conn.cursor()
        user_id = str(uuid.uuid4())
        created_at = datetime.utcnow().isoformat()
        try:
            cursor.execute(
                "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
                (user_id, email, password_hash, created_at)
            )
            conn.commit()
        except sqlite3.IntegrityError:
            conn.close()
            raise ValueError("Email already registered")
        conn.close()
        return {"id": user_id, "email": email, "created_at": created_at}

    def get_by_email(self, email: str) -> Optional[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, password_hash, created_at FROM users WHERE email = ?", (email,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None

    def get_by_id(self, user_id: str) -> Optional[dict]:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, email, created_at FROM users WHERE id = ?", (user_id,))
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
        return None
