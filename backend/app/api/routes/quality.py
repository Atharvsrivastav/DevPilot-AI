"""FastAPI controller route for Code Quality Scanner."""

from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.quality_scanner import QualityScanResult
from app.infrastructure.quality.scanner import CodeQualityScannerService

router = APIRouter(prefix="/quality", tags=["Code Quality Scanner"])


class QualityScanPayload(BaseModel):
    repository_url: HttpUrl
    files: dict[str, str]  # file_path -> file content map


@router.post("/scan", response_model=QualityScanResult, status_code=status.HTTP_200_OK)
async def scan_code_quality(
    payload: QualityScanPayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Scan codebase for dead code, duplicates, unused imports/vars, large files, long functions, complexity, & naming issues."""
    return CodeQualityScannerService.scan_codebase(str(payload.repository_url), payload.files)
