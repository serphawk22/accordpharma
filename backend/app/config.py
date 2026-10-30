from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    allow_demo_seed: bool = False
    database_url: str = ""
    openai_api_key: str = ""
    openai_model: str = ""
    jwt_secret_key: str = ""
    access_token_minutes: int = Field(default=1440, ge=1, le=10080)
    refresh_token_days: int = Field(default=14, ge=1, le=90)
    password_reset_minutes: int = Field(default=30, ge=5, le=120)
    frontend_url: str = "http://localhost:4200"
    backend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:4200"
    smtp_host: str = ""
    smtp_port: int = Field(default=587, ge=1, le=65535)
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = ""
    smtp_use_tls: bool = True
    log_level: str = "INFO"
    db_pool_size: int = Field(default=3, ge=1, le=20)
    db_max_overflow: int = Field(default=2, ge=0, le=20)
    db_pool_timeout: int = Field(default=10, ge=1, le=120)
    db_pool_recycle: int = Field(default=300, ge=30, le=3600)
    db_connect_timeout: int = Field(default=10, ge=1, le=120)

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
