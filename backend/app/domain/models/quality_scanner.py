"""Pydantic model schema for Code Quality Scanner output."""

from enum import Enum
from pydantic import BaseModel, Field


class QualityIssueType(str, Enum):
    DEAD_CODE = "DEAD_CODE"
    DUPLICATE_CODE = "DUPLICATE_CODE"
    UNUSED_IMPORT = "UNUSED_IMPORT"
    UNUSED_VARIABLE = "UNUSED_VARIABLE"
    LARGE_FILE = "LARGE_FILE"
    LONG_FUNCTION = "LONG_FUNCTION"
    HIGH_CYCLOMATIC_COMPLEXITY = "HIGH_CYCLOMATIC_COMPLEXITY"
    NAMING_ISSUE = "NAMING_ISSUE"


class QualityFinding(BaseModel):
    id: str
    issue_type: QualityIssueType
    title: str
    description: str
    file_path: str
    line_number: int | None = None
    snippet: str | None = None
    recommendation: str


class QualityScanResult(BaseModel):
    repository_url: str
    quality_score: float = Field(..., description="Overall calculated code quality score (0.0 to 100.0)")
    total_issues: int
    dead_code_count: int
    duplicate_code_count: int
    unused_imports_count: int
    unused_variables_count: int
    large_files_count: int
    long_functions_count: int
    high_complexity_count: int
    naming_issues_count: int
    findings: list[QualityFinding] = Field(default_factory=list)
