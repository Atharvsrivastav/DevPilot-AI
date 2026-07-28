"""FastAPI dependencies for route protection and authenticated user injection."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

security_bearer = HTTPBearer(auto_error=True)


async def get_current_user_id(credentials: HTTPAuthorizationCredentials = Depends(security_bearer)) -> str:
    """Dependency to extract and validate current authenticated user ID from Bearer token."""
    token = credentials.credentials
    try:
        payload = decode_token(token)
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
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
            headers={"WWW-Authenticate": "Bearer"},
        ) from err
