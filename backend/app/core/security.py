"""Security module handling JWT access/refresh token generation and verification."""

import time
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.core.config import settings

# In-memory revocation list keyed by JWT id (jti). Entries are automatically
# dropped once the token's own expiry has passed. For multi-worker deployments
# this should be replaced with a shared store (Redis/Postgres).
_REVOKED_JTIS: dict[str, float] = {}


def _prune_revoked() -> None:
    now = time.time()
    for jti, expires_at in list(_REVOKED_JTIS.items()):
        if expires_at <= now:
            _REVOKED_JTIS.pop(jti, None)


def revoke_token(payload: dict[str, Any]) -> None:
    """Revoke a decoded token by recording its jti until it expires."""
    jti = payload.get("jti")
    expires_at = payload.get("exp")
    if not jti or not isinstance(expires_at, (int, float)):
        return
    _prune_revoked()
    _REVOKED_JTIS[str(jti)] = float(expires_at)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """Generate a JWT Access Token."""
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    now = datetime.now(UTC)
    to_encode = {
        "exp": expire,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "sub": str(subject),
        "type": "access",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_refresh_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    """Generate a JWT Refresh Token."""
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    now = datetime.now(UTC)
    to_encode = {
        "exp": expire,
        "iat": now,
        "jti": uuid.uuid4().hex,
        "sub": str(subject),
        "type": "refresh",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT Token, rejecting revoked token ids."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub"]},
        )
    except jwt.PyJWTError as e:
        raise ValueError("Invalid or expired authentication token") from e

    jti = payload.get("jti")
    if jti and str(jti) in _REVOKED_JTIS:
        raise ValueError("Authentication token has been revoked")
    return payload
