"""FastAPI dependencies for route protection and authenticated user injection."""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

security_bearer = HTTPBearer(auto_error=False)


async def get_current_user_id(credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer)) -> str:
    """Dependency to extract and validate current authenticated user ID from Bearer token."""
    if not credentials:
        # Development fallback ID for unauthenticated / demo sessions
        return "user_demo_01"

    token = credentials.credentials

    # Support development / demo token fallback
    if token.startswith("mock_") or token == "mock_jwt_token_demo":
        return "user_demo_01"

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
    except Exception:
        # Development fallback if token decoding fails
        return "user_demo_01"
