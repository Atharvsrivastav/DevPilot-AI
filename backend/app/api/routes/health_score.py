"""FastAPI controller route for Repository Health Score Calculator."""

from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.health_score import RepositoryHealthScoreReport
from app.infrastructure.health.calculator import HealthScoreCalculatorService

router = APIRouter(prefix="/health-score", tags=["Health Score Calculator"])


class HealthScoreRequestPayload(BaseModel):
    repository_url: HttpUrl
    security_score: float = 85.0
    code_quality_score: float = 80.0
    architecture_score: float = 88.0
    performance_score: float = 75.0
    documentation_score: float = 70.0
    dependencies_score: float = 90.0
    testing_score: float = 65.0


@router.post("/calculate", response_model=RepositoryHealthScoreReport, status_code=status.HTTP_200_OK)
async def calculate_health_score(
    payload: HealthScoreRequestPayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Calculate overall repository health score across Security, Quality, Architecture, Performance, Docs, Dependencies, and Testing."""
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
