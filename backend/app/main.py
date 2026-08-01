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

app = FastAPI(
    title="DevPilot AI Backend API",
    description="Enterprise-grade AI-powered platform for GitHub repository analysis",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS Middleware Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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


@app.get("/", tags=["Health Check"])
@app.get("/health", tags=["Health Check"])
async def health_check():
    """Health check endpoint for Docker, Render, & Kubernetes liveness probes."""
    return {
        "status": "healthy",
        "message": "DevPilot AI Backend API is Live",
        "environment": settings.ENVIRONMENT,
        "version": "0.1.0"
    }
