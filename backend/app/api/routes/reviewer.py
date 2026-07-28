"""FastAPI controller route for AI Code Reviewer."""

from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.ai_reviewer import AICodeReviewReport
from app.infrastructure.ai.reviewer import AICodeReviewerService
from app.infrastructure.github.repository_service import GitHubRepositoryService

router = APIRouter(prefix="/reviewer", tags=["AI Code Reviewer"])


class ReviewRequestPayload(BaseModel):
    repository_url: HttpUrl


@router.post("/review", response_model=AICodeReviewReport, status_code=status.HTTP_200_OK)
async def generate_ai_code_review(
    payload: ReviewRequestPayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Generate comprehensive AI Code Review including repo summary, architecture explanation, PR review, README improvements, & refactoring."""
    github_service = GitHubRepositoryService()
    repo_details = await github_service.fetch_repository_details(str(payload.repository_url))
    
    return await AICodeReviewerService.review_repository(
        repo_url=str(payload.repository_url),
        repo_summary=f"Repository {repo_details.full_name} using {repo_details.detected_framework or 'Unknown'} framework.",
        file_tree=repo_details.folder_tree,
        readme_content=repo_details.readme_content,
    )
