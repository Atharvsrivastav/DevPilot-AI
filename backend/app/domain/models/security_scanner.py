"""Pydantic schemas for Security Scanner output."""

from enum import Enum
from typing import Any, Optional
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
    line_number: Optional[int] = None
    snippet: Optional[str] = None
    recommendation: str
    risk_score: float = Field(..., description="Risk score between 0.0 and 10.0")
    scanner_source: str = Field(default="DevPilot Security Rules Engine", description="Tool/Scanner source evidence")


class SecurityScanResult(BaseModel):
    repository_url: str
    total_findings: int
    overall_risk_score: float = Field(..., description="Overall calculated repository risk score (0.0 to 10.0)")
    security_score: Optional[float] = Field(None, description="Security pillar health score (0.0 to 100.0)")
    formula_used: str = Field(default="100 - (Critical*25 + High*15 + Medium*8 + Low*3)", description="Transparent formula")
    raw_metrics: dict[str, Any] = Field(default_factory=dict, description="Raw counts evidence")
    critical_count: int
    high_count: int
    medium_count: int
    low_count: int
    findings: list[SecurityFinding] = Field(default_factory=list)
