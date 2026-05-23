from typing import Optional
import json

from app.memory.session_store import SessionStore, MemoryEvent
from app.memory.vector_memory import VectorMemory


class AgentMemory:
    def __init__(self):
        self.store = SessionStore()
        self.vectors = VectorMemory()

    def _content_to_text(self, content: dict, event_type: str) -> str:
        if event_type == "paper_read":
            return f"Paper read: {content.get('title', 'Untitled')} - {content.get('summary', '')}"
        elif event_type == "hypothesis":
            return f"Hypothesis: {content.get('hypothesis', '')}"
        elif event_type == "code_saved":
            return f"Code saved: {content.get('description', '')}\n```\n{content.get('code', '')}\n```"
        elif event_type == "decision":
            return f"Decision: {content.get('decision', '')}\nReason: {content.get('reason', '')}"
        elif event_type == "chat_turn":
            role = content.get('role', 'unknown')
            message = content.get('message', '')
            return f"Chat {role}: {message}"
        return json.dumps(content)

    def create_session(self, user_id: str, topic: str, module: str = "ideas") -> dict:
        return self.store.create_session(user_id, topic, module)

    def get_session(self, session_id: str) -> Optional[dict]:
        return self.store.get_session(session_id)

    def list_sessions(self, user_id: str) -> list[dict]:
        return self.store.list_sessions(user_id)

    def save_paper(self, session_id: str, title: str, summary: str, url: Optional[str] = None, citations: Optional[list] = None) -> MemoryEvent:
        content = {
            "title": title,
            "summary": summary,
            "url": url,
            "citations": citations or []
        }
        event = self.store.log_event(session_id, "paper_read", content)
        text = self._content_to_text(content, "paper_read")
        self.vectors.save(session_id, event.event_id, text, {"event_type": "paper_read", "title": title})
        return event

    def save_hypothesis(self, session_id: str, hypothesis: str, supporting_evidence: Optional[list] = None) -> MemoryEvent:
        content = {
            "hypothesis": hypothesis,
            "supporting_evidence": supporting_evidence or []
        }
        event = self.store.log_event(session_id, "hypothesis", content)
        text = self._content_to_text(content, "hypothesis")
        self.vectors.save(session_id, event.event_id, text, {"event_type": "hypothesis"})
        return event

    def save_code(self, session_id: str, description: str, code: str, language: str = "python") -> MemoryEvent:
        content = {
            "description": description,
            "code": code,
            "language": language
        }
        event = self.store.log_event(session_id, "code_saved", content)
        text = self._content_to_text(content, "code_saved")
        self.vectors.save(session_id, event.event_id, text, {"event_type": "code_saved", "language": language})
        return event

    def save_decision(self, session_id: str, decision: str, reason: str, alternatives: Optional[list] = None) -> MemoryEvent:
        content = {
            "decision": decision,
            "reason": reason,
            "alternatives": alternatives or []
        }
        event = self.store.log_event(session_id, "decision", content)
        text = self._content_to_text(content, "decision")
        self.vectors.save(session_id, event.event_id, text, {"event_type": "decision"})
        return event

    def save_chat_turn(self, session_id: str, role: str, message: str) -> MemoryEvent:
        content = {
            "role": role,
            "message": message
        }
        event = self.store.log_event(session_id, "chat_turn", content)
        text = self._content_to_text(content, "chat_turn")
        self.vectors.save(session_id, event.event_id, text, {"event_type": "chat_turn", "role": role})
        return event

    def recall(self, query: str, session_id: Optional[str] = None, limit: int = 5) -> list[dict]:
        return self.vectors.recall(query, session_id, limit)

    def get_session_history(self, session_id: str) -> list[MemoryEvent]:
        return self.store.get_events(session_id)

    def delete_session(self, session_id: str) -> bool:
        self.vectors.delete_by_session(session_id)
        return self.store.delete_session(session_id)
