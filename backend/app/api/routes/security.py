"""FastAPI controller router for Security Scanner."""

from pydantic import BaseModel, HttpUrl
from fastapi import APIRouter, Depends, status

from app.api.deps import get_current_user_id
from app.domain.models.security_scanner import SecurityScanResult
from app.infrastructure.security.scanner import SecurityScannerService

router = APIRouter(prefix="/security", tags=["Security Scanner"])


class SecurityScanPayload(BaseModel):
    repository_url: HttpUrl
    files: dict[str, str]  # file_path -> file content map


@router.post("/scan", response_model=SecurityScanResult, status_code=status.HTTP_200_OK)
async def scan_repository_security(
    payload: SecurityScanPayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Perform security scan detecting API keys, passwords, secrets, JWT keys, SQLi, XSS, CSRF, eval(), & vulnerable dependencies."""
    return SecurityScannerService.scan_files(str(payload.repository_url), payload.files)
