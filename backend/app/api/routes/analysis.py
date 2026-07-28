"""FastAPI controller routes for live repository analysis and polling."""

from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user_id
from app.api.schemas.analysis import AnalyzeRequest, AnalyzeResponse, AnalysisStatusResponse
from app.infrastructure.pipeline.orchestrator import AnalysisPipelineOrchestrator

router = APIRouter(prefix="/analysis", tags=["Repository Analysis"])


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(
    payload: AnalyzeRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Trigger real background repository analysis pipeline."""
    repo_url_str = str(payload.repo_url)
    analysis_id = AnalysisPipelineOrchestrator.queue_analysis(repo_url_str, payload.branch)

    return AnalyzeResponse(
        analysis_id=analysis_id,
        status="QUEUED",
        message=f"Repository analysis pipeline task successfully queued for {repo_url_str}."
    )


@router.get("/latest", response_model=dict[str, Any])
async def get_latest_analysis(current_user_id: str = Depends(get_current_user_id)):
    """Retrieve the most recent analysis run and calculated metrics."""
    latest = AnalysisPipelineOrchestrator.get_latest_analysis()
    if not latest:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No repository analysis records found. Trigger an analysis to view results."
        )
    return latest


@router.get("/history", response_model=list[dict[str, Any]])
async def get_analysis_history(current_user_id: str = Depends(get_current_user_id)):
    """Retrieve audit history of all analysis runs."""
    return AnalysisPipelineOrchestrator.get_all_analyses()


@router.get("/{analysis_id}", response_model=dict[str, Any])
async def get_analysis_status(
    analysis_id: str,
    current_user_id: str = Depends(get_current_user_id)
):
    """Poll endpoint for live analysis status, progress, timestamps, and structured scanner JSON."""
    record = AnalysisPipelineOrchestrator.get_analysis_by_id(analysis_id)
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Analysis with ID '{analysis_id}' not found."
        )
    return record
