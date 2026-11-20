"""Core settings module reading environment configurations."""

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEFAULT_JWT_SECRET = "change_me_in_production_min_32_chars"


class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    LOG_LEVEL: str = "INFO"

    # Backend
    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000
    SECRET_KEY: str = DEFAULT_JWT_SECRET

    # CORS — comma-separated extra origins via env CORS_EXTRA_ORIGINS
    CORS_EXTRA_ORIGINS: str = ""

    # Demo mode is opt-in and is refused in production. It makes unauthenticated
    # requests resolve to a single demo user for local development only.
    ALLOW_DEMO_AUTH: bool = False

    # Until per-user GitHub tokens are implemented, the server-wide PAT must
    # only be used for public repositories. Enabling this is only appropriate
    # for a controlled single-tenant deployment; raw file fetches intentionally
    # do not receive the shared PAT.
    ALLOW_PRIVATE_REPOS: bool = False

    # Frontend origin used for OAuth redirects (no trailing slash).
    FRONTEND_URL: str = "http://localhost:3000"

    # Analysis queue / API abuse limits.
    MAX_CONCURRENT_ANALYSES: int = 2
    MAX_QUEUED_ANALYSES: int = 20

    # Rate limiting (per client IP, sliding window).
    RATE_LIMIT_REQUESTS: int = 120
    RATE_LIMIT_WINDOW_SECONDS: int = 60
    RATE_LIMIT_EXPENSIVE_REQUESTS: int = 10
    RATE_LIMIT_EXPENSIVE_WINDOW_SECONDS: int = 60

    # Database
    POSTGRES_USER: str = "devpilot"
    POSTGRES_PASSWORD: str = "devpilot_password"
    POSTGRES_DB: str = "devpilot_db"
    POSTGRES_HOST: str = "postgres"
    POSTGRES_PORT: int = 5432
    DATABASE_URL: str = "postgresql+asyncpg://devpilot:devpilot_password@postgres:5432/devpilot_db"

    # AI Providers — no hardcoded keys; set via environment.
    OPENAI_API_KEY: str | None = None
    ANTHROPIC_API_KEY: str | None = None
    NVIDIA_API_KEY: str | None = None
    NVIDIA_BASE_URL: str = "https://integrate.api.nvidia.com/v1"
    NVIDIA_MODEL: str = "deepseek-ai/deepseek-v4-pro"
    NVIDIA_MAX_FALLBACK_MODELS: int = 2
    NVIDIA_REQUEST_TIMEOUT_SECONDS: float = 30.0

    # JWT Configuration — must be overridden in production.
    JWT_SECRET_KEY: str = DEFAULT_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # GitHub OAuth Integration
    GITHUB_CLIENT_ID: str | None = None
    GITHUB_CLIENT_SECRET: str | None = None
    GITHUB_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/github/callback"
    GITHUB_PERSONAL_ACCESS_TOKEN: str | None = None
    OAUTH_STATE_TTL_SECONDS: int = 600
    LOGIN_CODE_TTL_SECONDS: int = 60

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        origins: list[str] = []
        if not self.is_production:
            origins += [
                "http://localhost:3000",
                "http://127.0.0.1:3000",
                "http://localhost:3001",
                "http://127.0.0.1:3001",
                "http://localhost:3002",
                "http://127.0.0.1:3002",
            ]
        if self.CORS_EXTRA_ORIGINS.strip():
            origins += [
                o.strip().rstrip("/") for o in self.CORS_EXTRA_ORIGINS.split(",") if o.strip()
            ]
        return origins

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.strip().lower() == "production"

    @model_validator(mode="after")
    def _validate_production_security(self) -> "Settings":
        """Refuse insecure defaults when the app is deployed in production."""
        if not self.is_production:
            return self
        if self.ALLOW_DEMO_AUTH:
            raise ValueError("ALLOW_DEMO_AUTH must be false in production")
        if (
            self.JWT_SECRET_KEY == DEFAULT_JWT_SECRET
            or self.JWT_SECRET_KEY.startswith("change_me")
            or len(self.JWT_SECRET_KEY) < 32
        ):
            raise ValueError(
                "JWT_SECRET_KEY must be a random value of at least 32 characters in production"
            )
        return self


settings = Settings()
