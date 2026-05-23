import pytest
from app.memory.session_store import SessionStore, init_memory_tables
from app.memory.vector_memory import VectorMemory
from app.memory.agent_memory import AgentMemory


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
def session_store():
    init_memory_tables()
    return SessionStore()


@pytest.fixture
def agent_memory():
    init_memory_tables()
    return AgentMemory()


def test_create_session(session_store):
    session = session_store.create_session("user123", "Test Topic", "ideas")
    assert session["user_id"] == "user123"
    assert session["topic"] == "Test Topic"
    assert session["module"] == "ideas"
    assert "id" in session


def test_list_sessions(session_store):
    session_store.create_session("user123", "Topic 1", "ideas")
    session_store.create_session("user123", "Topic 2", "coding")
    
    sessions = session_store.list_sessions("user123")
    assert len(sessions) == 2


def test_log_event(session_store):
    session = session_store.create_session("user123", "Test Topic", "ideas")
    event = session_store.log_event(session["id"], "chat_turn", {"role": "user", "message": "Hello"})
    
    assert event.session_id == session["id"]
    assert event.event_type == "chat_turn"
    assert event.content["role"] == "user"


def test_get_events(session_store):
    session = session_store.create_session("user123", "Test Topic", "ideas")
    session_store.log_event(session["id"], "chat_turn", {"role": "user", "message": "Hello"})
    session_store.log_event(session["id"], "chat_turn", {"role": "assistant", "message": "Hi there"})
    
    events = session_store.get_events(session["id"])
    assert len(events) == 2


def test_agent_memory_save_paper(agent_memory):
    session = agent_memory.create_session("user123", "Test Topic", "ideas")
    event = agent_memory.save_paper(
        session_id=session["id"],
        title="Test Paper",
        summary="A test paper summary"
    )
    
    assert event.event_type == "paper_read"
    assert event.content["title"] == "Test Paper"


def test_agent_memory_save_hypothesis(agent_memory):
    session = agent_memory.create_session("user123", "Test Topic", "ideas")
    event = agent_memory.save_hypothesis(
        session_id=session["id"],
        hypothesis="This is a test hypothesis"
    )
    
    assert event.event_type == "hypothesis"


def test_agent_memory_save_code(agent_memory):
    session = agent_memory.create_session("user123", "Test Topic", "ideas")
    event = agent_memory.save_code(
        session_id=session["id"],
        description="A test function",
        code="def test(): return True"
    )
    
    assert event.event_type == "code_saved"


def test_agent_memory_recall(agent_memory):
    session = agent_memory.create_session("user123", "Test Topic", "ideas")
    agent_memory.save_paper(session_id=session["id"], title="Test Paper", summary="A test paper")
    
    hits = agent_memory.recall("test paper", session_id=session["id"])
    assert isinstance(hits, list)


def test_agent_memory_get_session_history(agent_memory):
    session = agent_memory.create_session("user123", "Test Topic", "ideas")
    agent_memory.save_paper(session_id=session["id"], title="Test Paper", summary="A test paper")
    agent_memory.save_hypothesis(session_id=session["id"], hypothesis="A hypothesis")
    
    events = agent_memory.get_session_history(session["id"])
    assert len(events) >= 2
