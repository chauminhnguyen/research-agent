from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


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
    auth_rate_limit_per_minute: int = 10  # Stricter limit for auth endpoints
    token_blacklist_ttl_minutes: int = 1440  # 24 hours for token blacklist retention
    # Clerk Authentication
    clerk_secret_key: str = ""
    clerk_publishable_key: str = ""
    clerk_jwks_url: str = ""

    model_config = SettingsConfigDict(env_file=".env")


@lru_cache
def get_settings() -> Settings:
    return Settings()
