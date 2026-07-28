"""Authentication router handling GitHub OAuth, token generation, and refresh tokens."""

import httpx
from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse

from app.api.schemas.auth import (
    GitHubOAuthCallbackRequest,
    RefreshTokenRequest,
    TokenResponse,
    UserAuthResponse,
)
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, decode_token

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.get("/github/login")
async def github_login():
    """Initiates GitHub OAuth login flow by redirecting to GitHub authorization page."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GITHUB_CLIENT_ID is not configured in settings."
        )
    github_auth_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={settings.GITHUB_CLIENT_ID}"
        f"&redirect_uri={settings.GITHUB_REDIRECT_URI}"
        f"&scope=user:email,repo"
    )
    return RedirectResponse(url=github_auth_url)


@router.post("/github/callback", response_model=TokenResponse)
async def github_callback(payload: GitHubOAuthCallbackRequest):
    """Exchanges GitHub OAuth code for GitHub Access Token & returns JWT access + refresh tokens."""
    if not settings.GITHUB_CLIENT_ID or not settings.GITHUB_CLIENT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub OAuth client credentials are missing."
        )

    async with httpx.AsyncClient() as client:
        # Step 1: Exchange code for GitHub access token
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": payload.code,
                "redirect_uri": settings.GITHUB_REDIRECT_URI,
            },
        )
        token_data = token_res.json()
        if "access_token" not in token_data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=token_data.get("error_description", "Failed to exchange GitHub authorization code")
            )

        github_access_token = token_data["access_token"]

        # Step 2: Fetch user profile from GitHub API
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {github_access_token}",
                "Accept": "application/json",
            },
        )
        user_data = user_res.json()
        github_user_id = str(user_data.get("id"))

    # Step 3: Issue DevPilot AI JWT Access & Refresh Tokens
    access_token = create_access_token(subject=github_user_id)
    refresh_token = create_refresh_token(subject=github_user_id)

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
    )


@router.post("/refresh", response_model=TokenResponse)
async def refresh_access_token(payload: RefreshTokenRequest):
    """Refreshes expired access tokens using a valid refresh token."""
    try:
        token_payload = decode_token(payload.refresh_token)
        if token_payload.get("type") != "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Provided token is not a valid refresh token."
            )
        user_id = token_payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token subject.")

        new_access_token = create_access_token(subject=user_id)
        new_refresh_token = create_refresh_token(subject=user_id)

        return TokenResponse(
            access_token=new_access_token,
            refresh_token=new_refresh_token,
            token_type="bearer",
        )
    except ValueError as err:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(err)
        ) from err
