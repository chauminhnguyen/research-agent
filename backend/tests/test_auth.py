import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth.utils import hash_password, create_access_token
from app.auth.models import init_users_table
from app.auth.blacklist import token_blacklist


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    init_users_table()
    token_blacklist.clear()  # Clear blacklist before each test
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def test_user():
    return {
        "email": "test@example.com",
        "password": "testpassword123"
    }


@pytest.mark.anyio
async def test_register_success(client, test_user):
    response = await client.post("/v1/auth/register", json=test_user)
    assert response.status_code == 201
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


@pytest.mark.anyio
async def test_register_duplicate_email(client, test_user):
    await client.post("/v1/auth/register", json=test_user)
    response = await client.post("/v1/auth/register", json=test_user)
    assert response.status_code == 400


@pytest.mark.anyio
async def test_login_success(client, test_user):
    await client.post("/v1/auth/register", json=test_user)
    response = await client.post("/v1/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data


@pytest.mark.anyio
async def test_login_invalid_password(client, test_user):
    await client.post("/v1/auth/register", json=test_user)
    response = await client.post("/v1/auth/login", json={"email": test_user["email"], "password": "wrongpassword"})
    assert response.status_code == 401


@pytest.mark.anyio
async def test_login_nonexistent_user(client):
    response = await client.post("/v1/auth/login", json={"email": "nonexistent@example.com", "password": "test123"})
    assert response.status_code == 401


@pytest.mark.anyio
async def test_get_me_authenticated(client, test_user):
    await client.post("/v1/auth/register", json=test_user)
    login_response = await client.post("/v1/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    token = login_response.json()["access_token"]
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    data = response.json()
    assert data["email"] == test_user["email"]


@pytest.mark.anyio
async def test_get_me_unauthenticated(client):
    response = await client.get("/v1/auth/me")
    assert response.status_code == 401


@pytest.mark.anyio
async def test_logout(client, test_user):
    """Test that logout invalidates the token."""
    await client.post("/v1/auth/register", json=test_user)
    login_response = await client.post("/v1/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    token = login_response.json()["access_token"]
    
    # Token should work before logout
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    
    # Logout
    logout_response = await client.post("/v1/auth/logout", headers={"Authorization": f"Bearer {token}"})
    assert logout_response.status_code == 200
    
    # Token should not work after logout
    response = await client.get("/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401
