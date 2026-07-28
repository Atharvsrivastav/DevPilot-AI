"""Pydantic model schema for Code Quality Scanner output."""

from enum import Enum
from typing import Any, Optional
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
    line_number: Optional[int] = None
    snippet: Optional[str] = None
    recommendation: str


class QualityScanResult(BaseModel):
    repository_url: str
    quality_score: Optional[float] = Field(None, description="Overall calculated code quality score (0.0 to 100.0 or None if Not Analyzed)")
    formula_used: str = Field(default="100 - (HighComplexity*5 + DeadCode*4 + UnusedImports*2 + LargeFiles*3 + DuplicateBlocks*4)", description="Transparent formula")
    raw_metrics: dict[str, Any] = Field(default_factory=dict, description="Raw counts evidence")
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
