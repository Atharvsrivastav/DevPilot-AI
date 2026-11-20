"""API schema contracts for repository analysis endpoints."""

from typing import Any

from pydantic import BaseModel, HttpUrl


class AnalyzeRequest(BaseModel):
    repo_url: HttpUrl
    branch: str = "main"


class AnalyzeResponse(BaseModel):
    analysis_id: str
    status: str
    message: str


class AnalysisStatusResponse(BaseModel):
    analysis_id: str
    status: str
    progress: int
    current_step: str
    created_at: str
    completed_at: str | None = None
    duration_seconds: float | None = None
    repository: dict[str, Any]
    security: dict[str, Any] | None = None
    quality: dict[str, Any] | None = None
    architecture: dict[str, Any] | None = None
    documentation: dict[str, Any] | None = None
    health: dict[str, Any] | None = None
    skipped_modules: list[str] = []
    error_message: str | None = None
