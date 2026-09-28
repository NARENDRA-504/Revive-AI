from functools import lru_cache

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://reviveai:reviveai@localhost:5432/reviveai"
    jwt_secret: SecretStr = Field(min_length=32)
    access_token_minutes: int = Field(default=30, gt=0)
    frontend_origin: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
