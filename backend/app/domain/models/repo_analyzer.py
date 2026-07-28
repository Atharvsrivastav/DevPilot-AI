"""Pydantic model schema for structured repository analysis output."""

from pydantic import BaseModel, Field


class DependencyItem(BaseModel):
    name: str
    version: str | None = None
    type: str = "production"  # production, dev, peer


class ProjectSizeMetrics(BaseModel):
    total_files: int
    total_directories: int
    estimated_lines_of_code: int | None = None


class RepositoryStructureAnalysis(BaseModel):
    primary_language: str
    detected_languages: list[str] = Field(default_factory=list)
    framework: str | None = None
    package_manager: str | None = None
    directory_structure: list[str] = Field(default_factory=list)
    dependencies: list[DependencyItem] = Field(default_factory=list)
    project_size: ProjectSizeMetrics
