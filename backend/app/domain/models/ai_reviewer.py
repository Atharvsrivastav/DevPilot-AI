"""Pydantic model schema for AI Code Reviewer output."""

from pydantic import BaseModel, Field


class RefactoringItem(BaseModel):
    file_path: str
    target_symbol: str | None = None
    reason: str
    suggested_code: str


class AICodeReviewReport(BaseModel):
    repository_url: str
    repository_summary: str = Field(..., description="High-level overview of purpose, stack, and domain")
    architecture_explanation: str = Field(..., description="Explanation of structural organization and patterns")
    improvement_suggestions: list[str] = Field(default_factory=list, description="Actionable technical recommendations")
    readme_improvements: str = Field(..., description="Suggested README enhancements or markdown diffs")
    pr_review_comments: list[str] = Field(default_factory=list, description="Automated PR code review feedback")
    refactoring_suggestions: list[RefactoringItem] = Field(default_factory=list, description="Concrete refactoring proposals")
