"""FastAPI controller route for Architecture Analyzer."""

from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.architecture_analyzer import ArchitectureReport
from app.infrastructure.architecture.analyzer import ArchitectureAnalyzerService
from app.infrastructure.github.repository_service import GitHubRepositoryService

router = APIRouter(prefix="/architecture", tags=["Architecture Analyzer"])


class ArchitecturePayload(BaseModel):
    repository_url: HttpUrl


@router.post("/analyze", response_model=ArchitectureReport, status_code=status.HTTP_200_OK)
async def analyze_project_architecture(
    payload: ArchitecturePayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Analyze project directory structure and detect MVC, Layered, Clean, Hexagonal, or Microservices architecture."""
    github_service = GitHubRepositoryService()
    repo_details = await github_service.fetch_repository_details(str(payload.repository_url))
    return ArchitectureAnalyzerService.analyze_architecture(str(payload.repository_url), repo_details.folder_tree)
