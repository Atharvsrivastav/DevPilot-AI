"""Pydantic model schemas for GitHub Repository Service metadata output."""

from pydantic import BaseModel, Field


class ContributorInfo(BaseModel):
    login: str
    contributions: int
    avatar_url: str | None = None
    html_url: str | None = None


class CommitInfo(BaseModel):
    sha: str
    message: str
    author_name: str
    date: str


class GitHubRepositoryDetails(BaseModel):
    repository_name: str
    owner: str
    full_name: str
    html_url: str
    default_branch: str
    languages: dict[str, int] = Field(default_factory=dict, description="Language byte breakdown")
    detected_framework: str | None = Field(default=None, description="Primary detected framework")
    branches: list[str] = Field(default_factory=list)
    recent_commits: list[CommitInfo] = Field(default_factory=list)
    top_contributors: list[ContributorInfo] = Field(default_factory=list)
    readme_content: str | None = None
    license_name: str | None = None
    folder_tree: list[str] = Field(default_factory=list, description="File and directory path listing")
