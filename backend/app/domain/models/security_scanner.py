"""Pydantic schemas for Security Scanner output."""

from enum import Enum
from pydantic import BaseModel, Field


class SeverityLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class SecurityFinding(BaseModel):
    id: str
    issue_type: str
    severity: SeverityLevel
    title: str
    description: str
    affected_file: str
    line_number: int | None = None
    snippet: str | None = None
    recommendation: str
    risk_score: float = Field(..., description="Risk score between 0.0 and 10.0")


class SecurityScanResult(BaseModel):
    repository_url: str
    total_findings: int
    overall_risk_score: float = Field(..., description="Overall calculated repository risk score (0.0 to 10.0)")
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    findings: list[SecurityFinding] = Field(default_factory=list)
