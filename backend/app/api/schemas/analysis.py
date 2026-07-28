"""API schema contracts for repository analysis endpoints."""

from typing import Any, Optional
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
    completed_at: Optional[str] = None
    duration_seconds: Optional[float] = None
    repository: dict[str, Any]
    security: Optional[dict[str, Any]] = None
    quality: Optional[dict[str, Any]] = None
    architecture: Optional[dict[str, Any]] = None
    documentation: Optional[dict[str, Any]] = None
    health: Optional[dict[str, Any]] = None
    skipped_modules: list[str] = []
    error_message: Optional[str] = None
