"""Authentication router handling GitHub OAuth, token generation, and refresh tokens.

OAuth flow:
  1. GET /auth/github/login   -> sets a short-lived state cookie and redirects to GitHub
  2. GitHub redirects to GET /auth/github/callback with code + state
  3. The callback validates state, exchanges the code, and redirects to the frontend
     with a single-use, short-lived login code (tokens never travel in a URL)
  4. POST /auth/exchange      -> trades the login code for access + refresh tokens
"""

import secrets
import time
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import HTTPAuthorizationCredentials

from app.api.deps import security_bearer
from app.api.schemas.auth import (
    LoginCodeRequest,
    LogoutRequest,
    RefreshTokenRequest,
    TokenResponse,
)
from app.core.config import settings
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    revoke_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

OAUTH_STATE_COOKIE = "devpilot_oauth_state"
OAUTH_STATE_PATH = "/api/v1/auth"
GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_SCOPE = "read:user user:email"

# Single-use login codes: code -> (github_user_id, expires_at)
_LOGIN_CODES: dict[str, tuple[str, float]] = {}


def _prune_login_codes() -> None:
    now = time.time()
    for code, (_user_id, expires_at) in list(_LOGIN_CODES.items()):
        if expires_at <= now:
            _LOGIN_CODES.pop(code, None)


def _issue_login_code(github_user_id: str) -> str:
    _prune_login_codes()
    code = secrets.token_urlsafe(32)
    _LOGIN_CODES[code] = (github_user_id, time.time() + settings.LOGIN_CODE_TTL_SECONDS)
    return code


def _consume_login_code(code: str) -> str | None:
    _prune_login_codes()
    entry = _LOGIN_CODES.pop(code, None)
    if not entry:
        return None
    user_id, expires_at = entry
    if expires_at <= time.time():
        return None
    return user_id


@router.get("/github/login")
async def github_login() -> RedirectResponse:
    """Start the GitHub OAuth flow with a random, single-use state value."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID is not configured in settings.",
        )

    state = secrets.token_urlsafe(32)
    query = urlencode(
        {
            "client_id": settings.GITHUB_CLIENT_ID,
            "redirect_uri": settings.GITHUB_REDIRECT_URI,
            "scope": GITHUB_SCOPE,
            "state": state,
        }
    )
    response = RedirectResponse(url=f"{GITHUB_AUTHORIZE_URL}?{query}")
    response.set_cookie(
        key=OAUTH_STATE_COOKIE,
        value=state,
        max_age=settings.OAUTH_STATE_TTL_SECONDS,
        path=OAUTH_STATE_PATH,
        httponly=True,
        secure=settings.is_production,
        samesite="lax",
    )
    return response


@router.get("/github/callback")
async def github_callback(
    request: Request,
    code: str = Query(..., min_length=1, max_length=512),
    state: str = Query(..., min_length=1, max_length=512),
) -> RedirectResponse:
    """Validate the OAuth state, exchange the code, and hand the SPA a one-time code."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth client credentials are missing.",
        )

    expected_state = request.cookies.get(OAUTH_STATE_COOKIE)
    if not expected_state or not secrets.compare_digest(expected_state, state):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired OAuth state. Start the sign-in flow again.",
        )

    async with httpx.AsyncClient(timeout=10.0, follow_redirects=False) as client:
        token_res = await client.post(
            GITHUB_TOKEN_URL,
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
        )
        if token_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to exchange GitHub authorization code.",
            )
        token_data = token_res.json()
        github_access_token = token_data.get("access_token")
        if not github_access_token:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="GitHub did not return an access token.",
            )

        user_res = await client.get(
            GITHUB_USER_URL,
            headers={
                "Authorization": f"Bearer {github_access_token}",
                "Accept": "application/vnd.github+json",
            },
        )
        if user_res.status_code != 200:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to load the GitHub profile.",
            )
        user_data = user_res.json()
        github_user_id = user_data.get("id")
        if github_user_id is None:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="GitHub profile did not include a user id.",
            )

    login_code = _issue_login_code(str(github_user_id))
    response = RedirectResponse(
        url=f"{settings.FRONTEND_URL.rstrip('/')}/auth/callback?{urlencode({'code': login_code})}"
    )
    response.delete_cookie(OAUTH_STATE_COOKIE, path=OAUTH_STATE_PATH)
    return response


@router.post("/exchange", response_model=TokenResponse)
async def exchange_login_code(payload: LoginCodeRequest) -> TokenResponse:
    """Exchange a single-use OAuth login code for DevPilot JWTs."""
    user_id = _consume_login_code(payload.code)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired login code.",
        )
    return TokenResponse(
        access_token=create_access_token(subject=user_id),
        refresh_token=create_refresh_token(subject=user_id),
        token_type="bearer",
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(payload: RefreshTokenRequest) -> TokenResponse:
    """Rotate a valid refresh token and return a fresh token pair."""
    try:
        token_payload = decode_token(payload.refresh_token)
        if token_payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Provided token is not a valid refresh token.",
            )
        user_id = token_payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token subject.",
            )
        # Refresh tokens are single-use: revoke the presented token before
        # issuing a replacement pair.
        revoke_token(token_payload)
        return TokenResponse(
            access_token=create_access_token(subject=user_id),
            refresh_token=create_refresh_token(subject=user_id),
            token_type="bearer",
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err),
        ) from err


@router.post("/logout")
async def logout(
    credentials: HTTPAuthorizationCredentials | None = Depends(security_bearer),
    payload: LogoutRequest | None = None,
) -> dict[str, str]:
    """Revoke the supplied access and refresh tokens.

    Logout is best-effort: a caller may present an expired access token and a
    valid refresh token, or vice versa. Revoking a token requires possession of
    that token, so no additional authentication is needed.
    """
    if credentials:
        try:
            access_payload = decode_token(credentials.credentials)
            if access_payload.get("type") == "access":
                revoke_token(access_payload)
        except ValueError:
            pass

    if payload and payload.refresh_token:
        try:
            refresh_payload = decode_token(payload.refresh_token)
            if refresh_payload.get("type") == "refresh":
                revoke_token(refresh_payload)
        except ValueError:
            pass

    return {"status": "logged_out"}
