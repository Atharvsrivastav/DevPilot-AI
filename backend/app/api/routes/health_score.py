"""FastAPI controller route for Repository Health Score Calculator."""

from typing import Optional
from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.health_score import RepositoryHealthScoreReport
from app.infrastructure.health.calculator import HealthScoreCalculatorService

router = APIRouter(prefix="/health-score", tags=["Health Score Calculator"])


class HealthScoreRequestPayload(BaseModel):
    repository_url: HttpUrl
    security_score: Optional[float] = None
    code_quality_score: Optional[float] = None
    architecture_score: Optional[float] = None
    performance_score: Optional[float] = None
    documentation_score: Optional[float] = None
    dependencies_score: Optional[float] = None
    testing_score: Optional[float] = None


@router.post("/calculate", response_model=RepositoryHealthScoreReport, status_code=status.HTTP_200_OK)
async def calculate_health_score(
    payload: HealthScoreRequestPayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Calculate overall repository health score strictly from executed scanner outputs."""
    return HealthScoreCalculatorService.calculate_health_score(
        repo_url=str(payload.repository_url),
        security_score=payload.security_score,
        code_quality_score=payload.code_quality_score,
        architecture_score=payload.architecture_score,
        performance_score=payload.performance_score,
        documentation_score=payload.documentation_score,
        dependencies_score=payload.dependencies_score,
        testing_score=payload.testing_score,
    )
