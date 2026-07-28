"""Pydantic model schema for Repository Health Score calculation output."""

from typing import Any, Optional
from pydantic import BaseModel, Field


class IndividualPillarScores(BaseModel):
    security_score: Optional[float] = Field(None, description="Security health score (0.0 to 100.0 or None if Not Analyzed)")
    code_quality_score: Optional[float] = Field(None, description="Code quality health score (0.0 to 100.0 or None if Not Analyzed)")
    architecture_score: Optional[float] = Field(None, description="Architecture health score (0.0 to 100.0 or None if Not Analyzed)")
    performance_score: Optional[float] = Field(None, description="Performance health score (0.0 to 100.0 or None if Not Analyzed)")
    documentation_score: Optional[float] = Field(None, description="Documentation health score (0.0 to 100.0 or None if Not Analyzed)")
    dependencies_score: Optional[float] = Field(None, description="Dependency health score (0.0 to 100.0 or None if Not Analyzed)")
    testing_score: Optional[float] = Field(None, description="Testing coverage health score (0.0 to 100.0 or None if Not Analyzed)")


class RepositoryHealthScoreReport(BaseModel):
    repository_url: str
    overall_health_score: Optional[float] = Field(None, description="Weighted composite overall score (0.0 to 100.0 or None if Not Analyzed)")
    health_grade: str = Field(..., description="Grade classification: A+, A, B, C, D, F, or 'Not Analyzed'")
    individual_scores: IndividualPillarScores
    raw_metrics: dict[str, Any] = Field(default_factory=dict, description="Raw evidence metrics used for calculations")
    formulas_used: dict[str, str] = Field(default_factory=dict, description="Transparent formulas used for score derivations")
    actionable_suggestions: list[str] = Field(default_factory=list, description="Prioritized recommendations to improve health score")
    skipped_modules: list[str] = Field(default_factory=list, description="Modules or pillars that could not be analyzed")
