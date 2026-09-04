"""Core settings module reading environment configurations."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    SECRET_KEY: str = "change_me_in_production_min_32_chars"

    # CORS — comma-separated extra origins via env CORS_EXTRA_ORIGINS
    CORS_EXTRA_ORIGINS: str = ""

    # Database
    POSTGRES_USER: str = "devpilot"
    POSTGRES_PASSWORD: str = "devpilot_password"
    POSTGRES_DB: str = "devpilot_db"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = (
        "postgresql+asyncpg://devpilot:devpilot_password@postgres:5432/devpilot_db"
    )

    # AI Providers — no hardcoded keys; set via environment.
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    NVIDIA_API_KEY: str | None = None
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "deepseek-ai/deepseek-v4-pro"

    # JWT Configuration — override in production via environment.
    JWT_SECRET_KEY: str = "change_me_in_production_min_32_chars"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # GitHub OAuth Integration
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"
    GITHUB_PERSONAL_ACCESS_TOKEN: str | None = None

    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    @property
    def cors_origins(self) -> list[str]:
        origins = [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ]
        if self.CORS_EXTRA_ORIGINS.strip():
            origins += [
                o.strip()
                for o in self.CORS_EXTRA_ORIGINS.split(",")
                if o.strip()
            ]
        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"


settings = Settings()
