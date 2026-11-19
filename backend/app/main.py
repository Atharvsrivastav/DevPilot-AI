"""Main FastAPI Application Entry Point for DevPilot AI Backend."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import (
    analysis,
    analyzer,
    architecture,
    auth,
    chat,
    health_score,
    quality,
    repository,
    reviewer,
    security,
)
from app.core.config import settings
from app.core.middleware import RateLimitMiddleware, SecurityHeadersMiddleware

# Interactive docs are useful in development but expose the full API surface
# in production, so they are disabled there.
app = FastAPI(
    title="DevPilot AI Backend API",
    description="Enterprise-grade AI-powered platform for GitHub repository analysis",
    version="0.1.0",
    docs_url=None if settings.is_production else "/docs",
    redoc_url=None if settings.is_production else "/redoc",
    openapi_url=None if settings.is_production else "/openapi.json",
)

# Middleware order: the last added middleware runs first. CORS is outermost so
# rate-limit and error responses still receive the appropriate CORS headers.
app.add_middleware(RateLimitMiddleware)
app.add_middleware(SecurityHeadersMiddleware)

# CORS: explicit origins. Bearer tokens are used instead of cookies, so
# credentialed requests are not required.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

# Include Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(analysis.router, prefix="/api/v1")
app.include_router(repository.router, prefix="/api/v1")
app.include_router(analyzer.router, prefix="/api/v1")
app.include_router(security.router, prefix="/api/v1")
app.include_router(quality.router, prefix="/api/v1")
app.include_router(architecture.router, prefix="/api/v1")
app.include_router(reviewer.router, prefix="/api/v1")
app.include_router(health_score.router, prefix="/api/v1")
app.include_router(chat.router, prefix="/api/v1")


def _health_payload() -> dict:
    """Shared liveness payload for Docker, Render & Kubernetes probes."""
    # Keep the public probe minimal: environment/version details are not needed
    # by clients or load balancers and only aid fingerprinting.
    return {
        "status": "healthy",
        "message": "DevPilot AI Backend API is Live",
    }


@app.get("/", tags=["Health Check"])
async def root() -> dict:
    """Root endpoint — also serves as a liveness probe."""
    return _health_payload()


@app.get("/health", tags=["Health Check"])
async def health_check() -> dict:
    """Dedicated liveness probe endpoint."""
    return _health_payload()
