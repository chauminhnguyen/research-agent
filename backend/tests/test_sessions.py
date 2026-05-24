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
    response = await client.post("/v1/auth/register", json={
        "email": "test@example.com",
        "password": "testpassword123"
    })
    token = response.json()["access_token"]
    client.headers["Authorization"] = f"Bearer {token}"
    return client


@pytest.mark.anyio
async def test_list_sessions_empty(auth_client):
    response = await auth_client.get("/v1/sessions")
    assert response.status_code == 200
    data = response.json()
    assert "sessions" in data
    assert "total" in data
    assert "limit" in data
    assert "offset" in data
    assert isinstance(data["sessions"], list)


@pytest.mark.anyio
async def test_create_session(auth_client):
    response = await auth_client.post("/v1/sessions", json={
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
    create_response = await auth_client.post("/v1/sessions", json={
        "topic": "Test Topic",
        "module": "ideas"
    })
    session_id = create_response.json()["id"]
    
    response = await auth_client.get(f"/v1/sessions/{session_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == session_id


@pytest.mark.anyio
async def test_get_session_history(auth_client):
    create_response = await auth_client.post("/v1/sessions", json={
        "topic": "Test Topic",
        "module": "ideas"
    })
    session_id = create_response.json()["id"]
    
    response = await auth_client.get(f"/v1/sessions/{session_id}/history")
    assert response.status_code == 200
    data = response.json()
    assert "session" in data
    assert "events" in data


@pytest.mark.anyio
async def test_update_session(auth_client):
    create_response = await auth_client.post("/v1/sessions", json={
        "topic": "Original Topic",
        "module": "ideas"
    })
    session_id = create_response.json()["id"]
    
    response = await auth_client.patch(f"/v1/sessions/{session_id}", json={
        "topic": "Updated Topic"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["topic"] == "Updated Topic"


@pytest.mark.anyio
async def test_delete_session(auth_client):
    create_response = await auth_client.post("/v1/sessions", json={
        "topic": "To Delete",
        "module": "ideas"
    })
    session_id = create_response.json()["id"]
    
    # Delete
    response = await auth_client.delete(f"/v1/sessions/{session_id}")
    assert response.status_code == 204
    
    # Verify deleted
    get_response = await auth_client.get(f"/v1/sessions/{session_id}")
    assert get_response.status_code == 404


@pytest.mark.anyio
async def test_pagination(auth_client):
    # Create multiple sessions
    for i in range(5):
        await auth_client.post("/v1/sessions", json={
            "topic": f"Topic {i}",
            "module": "ideas"
        })
    
    # Test with limit
    response = await auth_client.get("/v1/sessions?limit=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["sessions"]) == 2
    assert data["limit"] == 2
    
    # Test with offset
    response = await auth_client.get("/v1/sessions?limit=2&offset=2")
    assert response.status_code == 200
    data = response.json()
    assert len(data["sessions"]) == 2
    assert data["offset"] == 2


@pytest.mark.anyio
async def test_unauthorized_access():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/v1/sessions")
        assert response.status_code == 401
