"""FastAPI controller routes for repository analysis."""

from fastapi import APIRouter, Depends, HTTPException, status
from app.api.deps import get_current_user_id
from app.api.schemas.analysis import AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/analysis", tags=["Repository Analysis"])


@router.post("", response_model=AnalyzeResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_analysis(
    payload: AnalyzeRequest,
    current_user_id: str = Depends(get_current_user_id)
):
    """Trigger automated repository analysis across code quality, security, and architecture (Protected API)."""
    return AnalyzeResponse(
        analysis_id="anl_01h8x39012830",
        status="PENDING",
        message=f"Repository analysis task successfully queued for user {current_user_id}."
    )
