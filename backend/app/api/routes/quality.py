"""FastAPI controller route for Code Quality Scanner."""

from fastapi import APIRouter, Depends, status
from pydantic import BaseModel, Field, HttpUrl, field_validator
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_user_id
from app.domain.models.quality_scanner import QualityScanResult
from app.infrastructure.quality.scanner import CodeQualityScannerService

router = APIRouter(prefix="/quality", tags=["Code Quality Scanner"])

MAX_SCAN_FILES = 30
MAX_FILE_CHARS = 200_000
MAX_TOTAL_CHARS = 2_000_000


class QualityScanPayload(BaseModel):
    repository_url: HttpUrl
    files: dict[str, str] = Field(
        min_length=1,
        max_length=MAX_SCAN_FILES,
        description="file_path -> file content map",
    )

    @field_validator("files")
    @classmethod
    def _validate_files(cls, files: dict[str, str]) -> dict[str, str]:
        total = 0
        for path, content in files.items():
            if not path or len(path) > 512:
                raise ValueError("File paths must be between 1 and 512 characters.")
            if len(content) > MAX_FILE_CHARS:
                raise ValueError(
                    f"Each file must be at most {MAX_FILE_CHARS} characters."
                )
            total += len(content)
        if total > MAX_TOTAL_CHARS:
            raise ValueError(
                f"Total payload must be at most {MAX_TOTAL_CHARS} characters."
            )
        return files


@router.post("/scan", response_model=QualityScanResult, status_code=status.HTTP_200_OK)
async def scan_code_quality(
    payload: QualityScanPayload,
    current_user_id: str = Depends(get_current_user_id)
):
    """Scan for dead code, duplicates, unused imports/vars, large files,
    long functions, complexity, and naming issues.
    """
    # Scanners are synchronous and CPU-bound; keep them off the event loop.
    return await run_in_threadpool(
        CodeQualityScannerService.scan_codebase,
        str(payload.repository_url),
        payload.files,
    )
