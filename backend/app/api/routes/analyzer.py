"""FastAPI controller route for Repository Structure Analyzer."""

from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user_id
from app.domain.models.repo_analyzer import RepositoryStructureAnalysis
from app.infrastructure.github.repo_analyzer import RepositoryAnalyzerService
from app.infrastructure.github.repository_service import GitHubRepositoryService

router = APIRouter(prefix="/analyzer", tags=["Repository Structural Analyzer"])


@router.get("/structure", response_model=RepositoryStructureAnalysis)
async def analyze_repository_structure(
    repo_url: str = Query(..., description="GitHub Repository URL to analyze"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Analyze GitHub repository structure, languages, framework, package manager, tree, and dependencies."""
    github_service = GitHubRepositoryService()
    repo_details = await github_service.fetch_repository_details(repo_url)
    return RepositoryAnalyzerService.analyze_repository(repo_details)
