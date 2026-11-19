"""FastAPI dependencies for route protection and authenticated user injection."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings
from app.core.security import decode_token

security_bearer = HTTPBearer(auto_error=False)

DEMO_USER_ID = "user_demo_01"


def _demo_fallback_allowed() -> bool:
    """Demo access requires an explicit opt-in and is refused in production."""
    return settings.ALLOW_DEMO_AUTH and not settings.is_production


async def get_current_user_id(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
) -> str:
    """Extract and validate the current user ID from a Bearer token."""
    if not credentials:
        if _demo_fallback_allowed():
            return DEMO_USER_ID
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials

    try:
        payload = decode_token(token)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type, access token required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id: str | None = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token payload",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id
