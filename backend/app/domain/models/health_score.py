"""Pydantic model schema for Repository Health Score calculation output."""

from pydantic import BaseModel, Field


class IndividualPillarScores(BaseModel):
    security_score: float = Field(..., description="Security health score (0.0 to 100.0)")
    code_quality_score: float = Field(..., description="Code quality health score (0.0 to 100.0)")
    architecture_score: float = Field(..., description="Architecture health score (0.0 to 100.0)")
    performance_score: float = Field(..., description="Performance health score (0.0 to 100.0)")
    documentation_score: float = Field(..., description="Documentation health score (0.0 to 100.0)")
    dependencies_score: float = Field(..., description="Dependency health score (0.0 to 100.0)")
    testing_score: float = Field(..., description="Testing coverage health score (0.0 to 100.0)")


class RepositoryHealthScoreReport(BaseModel):
    repository_url: str
    overall_health_score: float = Field(..., description="Weighted composite overall score (0.0 to 100.0)")
    health_grade: str = Field(..., description="Grade classification: A+, A, B, C, D, or F")
    individual_scores: IndividualPillarScores
    actionable_suggestions: list[str] = Field(default_factory=list, description="Prioritized recommendations to improve health score")
