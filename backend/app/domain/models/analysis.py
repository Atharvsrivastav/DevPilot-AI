"""Domain Entity for Repository Analysis under Clean Architecture."""

from datetime import datetime
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field


class AnalysisStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class Repository(BaseModel):
    id: str
    url: str
    owner: str
    name: str
    default_branch: str = "main"
    is_private: bool = False


class AnalysisReport(BaseModel):
    id: str
    repository_id: str
    status: AnalysisStatus = AnalysisStatus.PENDING
    code_quality_score: float | None = None
    security_score: float | None = None
    architecture_score: float | None = None
    performance_score: float | None = None
    documentation_score: float | None = None
    maintainability_score: float | None = None
    findings: list[dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: datetime | None = None
