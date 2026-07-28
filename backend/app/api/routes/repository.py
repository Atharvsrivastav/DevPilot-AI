"""GitHub repository metadata retrieval endpoint."""

from fastapi import APIRouter, Depends, Query
from app.api.deps import get_current_user_id
from app.domain.models.github_service import GitHubRepositoryDetails
from app.infrastructure.github.repository_service import GitHubRepositoryService

router = APIRouter(prefix="/repository", tags=["GitHub Repository Service"])


@router.get("/details", response_model=GitHubRepositoryDetails)
async def get_repository_details(
    repo_url: str = Query(..., description="Full GitHub repository URL"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch complete GitHub repository metadata without AI processing."""
    service = GitHubRepositoryService()
    return await service.fetch_repository_details(repo_url)
