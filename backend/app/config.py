from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from typing import Optional


class Settings(BaseSettings):
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    openai_api_key: str
    database_url: str = "sqlite:///data/research_agent.db"
    chroma_persist_dir: str = "data/chroma"
    environment: str = "development"
    allowed_origins: list[str] = ["http://localhost:3000"]
    rate_limit_per_minute: int = 60
    auth_rate_limit_per_minute: int = 10
    token_blacklist_ttl_minutes: int = 1440
    # Clerk Authentication
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""
    # Supabase
    supabase_url: str = ""
    supabase_service_key: str = ""
    # LangSmith Tracing
    langsmith_api_key: Optional[str] = None
    langsmith_project: str = "research-agent"
    langsmith_endpoint: str = "https://api.smith.langchain.com"
    langsmith_callback_enabled: bool = False
    langsmith_tracing: bool = False  # Legacy env var support
    # Tavily Search
    tavily_api_key: Optional[str] = None

    model_config = SettingsConfigDict(env_file=".env")

    @property
    def langsmith_configured(self) -> bool:
        """Check if LangSmith is properly configured."""
        return bool(self.langsmith_api_key)


@lru_cache
def get_settings() -> Settings:
    return Settings()
