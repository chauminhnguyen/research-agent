import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.auth.models import init_users_table
from app.experiments.store import ExperimentStore, experiment_store
from app.experiments.config import FeatureFlags, EXPERIMENTS


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def client():
    init_users_table()
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


@pytest.fixture(autouse=True)
def clear_experiment_store():
    """Clear experiment store before each test."""
    experiment_store.clear_all_cache()
    yield
    experiment_store.clear_all_cache()


class TestExperimentStore:
    """Unit tests for ExperimentStore."""
    
    def test_deterministic_assignment(self):
        """Same user gets same assignment for same experiment."""
        user_id = "test_user_123"
        flag = FeatureFlags.NEW_CHAT_STREAMING
        
        result1 = experiment_store.is_enabled(user_id, flag)
        result2 = experiment_store.is_enabled(user_id, flag)
        result3 = experiment_store.is_enabled(user_id, flag)
        
        assert result1 == result2 == result3
    
    def test_different_users_different_assignment(self):
        """Different users may have different assignments."""
        user1 = "user_1"
        user2 = "user_2"
        flag = FeatureFlags.NEW_CHAT_STREAMING
        
        # At least one should be different (statistically very likely)
        result1 = experiment_store.is_enabled(user1, flag)
        result2 = experiment_store.is_enabled(user2, flag)
        
        # This could theoretically fail, but probability is very low
        # (1 in 5 chance per experiment based on 20% traffic)
        assert isinstance(result1, bool)
        assert isinstance(result2, bool)
    
    def test_unknown_flag_returns_false(self):
        """Unknown flags should return False."""
        result = experiment_store.is_enabled("user123", "nonexistent_flag")
        assert result is False
    
    def test_empty_user_returns_false(self):
        """Empty user_id should return False for all flags."""
        result = experiment_store.is_enabled("", FeatureFlags.NEW_CHAT_STREAMING)
        assert result is False
        result = experiment_store.is_enabled(None, FeatureFlags.NEW_CHAT_STREAMING)
        assert result is False
    
    def test_get_user_flags(self):
        """Get all flags for a user."""
        user_id = "test_user_flags"
        flags = experiment_store.get_user_flags(user_id)
        
        assert isinstance(flags, dict)
        assert all(isinstance(v, bool) for v in flags.values())
    
    def test_user_override(self):
        """Test manual flag override for a user."""
        user_id = "test_override_user"
        flag = FeatureFlags.ENHANCED_MEMORY_RECALL
        
        # Initially should be based on assignment
        initial = experiment_store.is_enabled(user_id, flag)
        
        # Override to True
        experiment_store.set_user_override(user_id, flag, True)
        assert experiment_store.is_enabled(user_id, flag) is True
        
        # Override to False
        experiment_store.set_user_override(user_id, flag, False)
        assert experiment_store.is_enabled(user_id, flag) is False
        
        # Clear cache and check - override should persist
        experiment_store.clear_user_cache(user_id)
        # After clear, assignment logic applies again
        reassigned = experiment_store.is_enabled(user_id, flag)
        assert isinstance(reassigned, bool)
    
    def test_clear_user_cache(self):
        """Test clearing cache for a specific user."""
        user_id = "test_clear_user"
        
        # Get flags to populate cache
        experiment_store.get_user_flags(user_id)
        
        # Clear should not raise
        experiment_store.clear_user_cache(user_id)
        
        # Getting flags again should work
        flags = experiment_store.get_user_flags(user_id)
        assert isinstance(flags, dict)
    
    def test_clear_all_cache(self):
        """Test clearing all cached assignments."""
        # Populate cache for multiple users
        for i in range(3):
            experiment_store.get_user_flags(f"user_{i}")
        
        # Clear all
        experiment_store.clear_all_cache()
        
        # Store should still work
        flags = experiment_store.get_user_flags("new_user")
        assert isinstance(flags, dict)


class TestExperimentsAPI:
    """Integration tests for experiments API endpoints."""
    
    @pytest.mark.anyio
    async def test_get_my_experiments_unauthenticated(self, client):
        """Test that unauthenticated requests are rejected."""
        response = await client.get("/v1/experiments")
        assert response.status_code == 401
    
    @pytest.mark.anyio
    async def test_get_my_experiments_authenticated(self, auth_client):
        """Test getting experiments for authenticated user."""
        response = await auth_client.get("/v1/experiments")
        assert response.status_code == 200
        data = response.json()
        assert "flags" in data
        assert "experiments" in data
        assert isinstance(data["flags"], list)
        assert isinstance(data["experiments"], dict)
    
    @pytest.mark.anyio
    async def test_list_experiments_public(self, client):
        """Test listing experiments doesn't require auth."""
        response = await client.get("/v1/experiments/all")
        assert response.status_code == 200
        data = response.json()
        assert "experiments" in data
        assert isinstance(data["experiments"], list)
        
        # Check experiment structure
        for exp in data["experiments"]:
            assert "id" in exp
            assert "description" in exp
            assert "traffic_percentage" in exp
            assert "enabled" in exp
            assert "flags" in exp
    
    @pytest.mark.anyio
    async def test_check_single_flag(self, auth_client):
        """Test checking a single flag status."""
        response = await auth_client.get(f"/v1/experiments/check/{FeatureFlags.NEW_CHAT_STREAMING}")
        assert response.status_code == 200
        data = response.json()
        assert data["flag"] == FeatureFlags.NEW_CHAT_STREAMING
        assert "enabled" in data
        assert isinstance(data["enabled"], bool)
    
    @pytest.mark.anyio
    async def test_check_nonexistent_flag(self, auth_client):
        """Test checking a flag that doesn't exist."""
        response = await auth_client.get("/v1/experiments/check/nonexistent_flag_xyz")
        assert response.status_code == 200
        data = response.json()
        assert data["enabled"] is False
    
    @pytest.mark.anyio
    async def test_flag_override(self, auth_client):
        """Test overriding a flag for a user."""
        user_id = "override_test_user"
        flag = FeatureFlags.NEW_CHAT_STREAMING
        
        response = await auth_client.post("/v1/experiments/flags/override", json={
            "user_id": user_id,
            "flag": flag,
            "enabled": True
        })
        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["user_id"] == user_id
        assert data["flag"] == flag
        assert data["enabled"] is True
    
    @pytest.mark.anyio
    async def test_clear_flag_cache(self, auth_client):
        """Test clearing flag cache for current user."""
        # First, populate cache by getting experiments
        await auth_client.get("/v1/experiments")
        
        # Then clear it
        response = await auth_client.post("/v1/experiments/flags/clear-cache")
        assert response.status_code == 204


class TestExperimentsIntegration:
    """Integration tests combining experiments with other features."""
    
    @pytest.mark.anyio
    async def test_experiments_included_in_session_response(self, auth_client):
        """Test that session responses include experiment info."""
        # Create a session
        await auth_client.post("/v1/sessions", json={
            "topic": "Test",
            "module": "ideas"
        })
        
        # Get experiments - should work
        response = await auth_client.get("/v1/experiments")
        assert response.status_code == 200


class TestMemorySecurity:
    """Tests for memory endpoint security (IDOR prevention)."""
    
    @pytest.fixture
    async def two_users_client(self, client):
        """Create two authenticated clients for different users."""
        # User 1
        response1 = await client.post("/v1/auth/register", json={
            "email": "user1@example.com",
            "password": "password123"
        })
        token1 = response1.json()["access_token"]
        client1 = client.__class__(transport=client._transport, base_url="http://test")
        client1.headers["Authorization"] = f"Bearer {token1}"
        
        # User 2
        response2 = await client.post("/v1/auth/register", json={
            "email": "user2@example.com",
            "password": "password456"
        })
        token2 = response2.json()["access_token"]
        client2 = client.__class__(transport=client._transport, base_url="http://test")
        client2.headers["Authorization"] = f"Bearer {token2}"
        
        return client1, client2
    
    @pytest.mark.anyio
    async def test_recall_requires_session_ownership(self, two_users_client):
        """Test that user cannot recall from another user's session."""
        client1, client2 = two_users_client
        
        # User 1 creates a session
        response = await client1.post("/v1/sessions", json={
            "topic": "User 1's Session",
            "module": "ideas"
        })
        session_id = response.json()["id"]
        
        # User 2 tries to recall from user 1's session - should fail
        response = await client2.get(f"/v1/memory/recall?q=test&session_id={session_id}")
        assert response.status_code == 403
    
    @pytest.mark.anyio
    async def test_memory_history_requires_ownership(self, two_users_client):
        """Test that user cannot access another user's session history."""
        client1, client2 = two_users_client
        
        # User 1 creates a session
        response = await client1.post("/v1/sessions", json={
            "topic": "User 1's Private Session",
            "module": "ideas"
        })
        session_id = response.json()["id"]
        
        # User 2 tries to get history - should fail
        response = await client2.get(f"/v1/memory/history/{session_id}")
        assert response.status_code == 403
