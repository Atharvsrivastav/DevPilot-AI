"""Cross-cutting HTTP hardening: rate limits and security headers."""

import time
from collections import defaultdict, deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import JSONResponse, Response

from app.core.config import settings

_EXPENSIVE_PREFIXES = (
    "/api/v1/analysis",
    "/api/v1/analyzer",
    "/api/v1/architecture",
    "/api/v1/chat/query",
    "/api/v1/quality",
    "/api/v1/repository",
    "/api/v1/reviewer",
    "/api/v1/security",
)
_EXEMPT_PATHS = ("/", "/health", "/docs", "/redoc", "/openapi.json")


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Small in-process sliding-window limiter.

    Per-IP limits are intentionally modest and are a backstop, not a substitute
    for edge/proxy rate limiting. Behind a reverse proxy, configure limits at
    the proxy as well; `request.client.host` is used to avoid trusting spoofable
    forwarding headers.
    """

    MAX_TRACKED_CLIENTS = 10_000

    def __init__(self, app):
        super().__init__(app)
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    def _prune_clients(self, now: float) -> None:
        """Bound memory if many distinct client addresses are seen."""
        if len(self._hits) <= self.MAX_TRACKED_CLIENTS:
            return
        stale_before = now - max(
            settings.RATE_LIMIT_WINDOW_SECONDS,
            settings.RATE_LIMIT_EXPENSIVE_WINDOW_SECONDS,
        )
        for key, bucket in list(self._hits.items()):
            if not bucket or bucket[-1] <= stale_before:
                self._hits.pop(key, None)

    def _hit(self, key: str, limit: int, window: int) -> tuple[bool, int]:
        now = time.monotonic()
        self._prune_clients(now)
        bucket = self._hits[key]
        while bucket and bucket[0] <= now - window:
            bucket.popleft()
        if len(bucket) >= limit:
            retry_after = max(1, int(window - (now - bucket[0])))
            return False, retry_after
        bucket.append(now)
        return True, 0

    async def dispatch(self, request: Request, call_next):
        path = request.url.path
        if path in _EXEMPT_PATHS:
            return await call_next(request)

        client = request.client.host if request.client else "unknown"
        expensive = path.startswith(_EXPENSIVE_PREFIXES)
        if expensive:
            allowed, retry_after = self._hit(
                f"{client}:expensive",
                settings.RATE_LIMIT_EXPENSIVE_REQUESTS,
                settings.RATE_LIMIT_EXPENSIVE_WINDOW_SECONDS,
            )
        else:
            allowed, retry_after = self._hit(
                f"{client}:general",
                settings.RATE_LIMIT_REQUESTS,
                settings.RATE_LIMIT_WINDOW_SECONDS,
            )

        if not allowed:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please retry later."},
                headers={"Retry-After": str(retry_after)},
            )
        return await call_next(request)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Baseline headers for API responses."""

    async def dispatch(self, request: Request, call_next) -> Response:
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault(
            "Permissions-Policy", "camera=(), microphone=(), geolocation=()"
        )
        response.headers.setdefault("Cross-Origin-Opener-Policy", "same-origin")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        # Authentication responses can contain bearer/refresh tokens or login
        # codes. Never let a browser or intermediary cache them.
        if request.url.path.startswith("/api/v1/auth"):
            response.headers.setdefault("Cache-Control", "no-store")
            response.headers.setdefault("Pragma", "no-cache")
        if settings.is_production:
            response.headers.setdefault(
                "Strict-Transport-Security", "max-age=63072000; includeSubDomains"
            )
        return response
