"""FastAPI controller routes for repository-scoped analysis and polling."""

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.api.deps import get_current_user_id
from app.api.schemas.analysis import AnalyzeRequest, AnalyzeResponse
from app.infrastructure.github.repository_service import GitHubError
from app.infrastructure.pipeline.orchestrator import AnalysisPipelineOrchestrator

router = APIRouter(prefix="/analysis", tags=["Repository Analysis"])


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(
    payload: AnalyzeRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """Queue analysis for the repository in the request body."""
    repo_url_str = str(payload.repo_url)
    try:
        analysis_id = AnalysisPipelineOrchestrator.queue_analysis(
            repo_url_str, payload.branch, current_user_id
        )
    except GitHubError as e:
        raise HTTPException(status_code=e.http_status, detail=e.message) from e
    return AnalyzeResponse(
        analysis_id=analysis_id,
        status="QUEUED",
        message=f"Analysis queued for {repo_url_str}.",
    )


@router.get("/by-repo", response_model=dict[str, Any])
async def get_analysis_for_repo(
    owner: str = Query(..., min_length=1, max_length=100),
    repo: str = Query(..., min_length=1, max_length=100),
    current_user_id: str = Depends(get_current_user_id),
):
    """Latest analysis for THIS user + repository. 404 when never analyzed."""
    latest = AnalysisPipelineOrchestrator.get_latest_for_repo(
        current_user_id, owner.strip(), repo.strip()
    )
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"'{owner}/{repo}' hasn't been analyzed yet. Run an analysis to view results.",
        )
    return latest


@router.get("/history", response_model=list[dict[str, Any]])
async def get_analysis_history(
    owner: str | None = Query(default=None, max_length=100),
    repo: str | None = Query(default=None, max_length=100),
    current_user_id: str = Depends(get_current_user_id),
):
    """Audit history for the current user, optionally filtered to one repository."""
    return AnalysisPipelineOrchestrator.get_history_for_user(
        current_user_id, owner, repo
    )


@router.get("/{analysis_id}", response_model=dict[str, Any])
async def get_analysis_status(
    analysis_id: str,
    current_user_id: str = Depends(get_current_user_id),
):
    """Poll one analysis run by ID (ownership enforced)."""
    record = AnalysisPipelineOrchestrator.get_analysis_by_id(analysis_id)
    if not record or record.get("user_id") != current_user_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID '{analysis_id}' not found.",
        )
    return record
