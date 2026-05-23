import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth.models import init_users_table
from app.memory.session_store import init_memory_tables


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    init_users_table()
    init_memory_tables()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
async def auth_client(client):
    response = await client.post("/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword123"
    })
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.mark.anyio
async def test_list_sessions_empty(auth_client):
    response = await auth_client.get("/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "sessions" in data
    assert isinstance(data["sessions"], list)


@pytest.mark.anyio
async def test_create_session(auth_client):
    response = await auth_client.post("/sessions", json={
        "topic": "Test Topic",
        "module": "ideas"
    })
    assert response.status_code == 201
    data = response.json()
    assert data["topic"] == "Test Topic"
    assert data["module"] == "ideas"
    assert "id" in data


@pytest.mark.anyio
async def test_get_session(auth_client):
    create_response = await auth_client.post("/sessions", json={
        "topic": "Test Topic",
        "module": "ideas"
    })
    session_id = create_response.json()["id"]
    
    response = await auth_client.get(f"/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session_id


@pytest.mark.anyio
async def test_get_session_history(auth_client):
    create_response = await auth_client.post("/sessions", json={
        "topic": "Test Topic",
        "module": "ideas"
    })
    session_id = create_response.json()["id"]
    
    response = await auth_client.get(f"/sessions/{session_id}/history")
    assert response.status_code == 200
    data = response.json()
    assert "session" in data
    assert "events" in data


@pytest.mark.anyio
async def test_unauthorized_access():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/sessions")
        assert response.status_code == 401
