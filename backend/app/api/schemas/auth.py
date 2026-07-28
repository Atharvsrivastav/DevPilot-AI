"""Pydantic schemas for authentication and tokens."""

from pydantic import BaseModel, EmailStr


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserAuthResponse(BaseModel):
    id: str
    email: str
    username: str
    full_name: str | None = None
    avatar_url: str | None = None
    github_user_id: str | None = None


class GitHubOAuthCallbackRequest(BaseModel):
    code: str
