"""Focused regression tests for the security hardening changes."""

import re

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.routes.security import SecurityScanPayload
from app.core.config import DEFAULT_JWT_SECRET, Settings
from app.core.redaction import redact_secrets
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    revoke_token,
)
from app.domain.models.repo_chat import ChatMessageRequest
from app.infrastructure.github.repository_service import (
    GitHubError,
    GitHubRepositoryService,
    _validate_repo_path,
    parse_github_url,
)
from app.infrastructure.pipeline.orchestrator import _matches_repo
from app.main import _DEV_ORIGIN_REGEX, app


def _production_settings(**overrides) -> Settings:
    values = {
        "_env_file": None,
        "ENVIRONMENT": "production",
        "JWT_SECRET_KEY": "a" * 48,
        "SECRET_KEY": "b" * 48,
        "ALLOW_DEMO_AUTH": False,
        "FRONTEND_URL": "https://app.example.com",
        "GITHUB_REDIRECT_URI": "https://api.example.com/api/v1/auth/github/callback",
        "CORS_EXTRA_ORIGINS": "",
    }
    values.update(overrides)
    return Settings(**values)


def test_production_rejects_default_jwt_secret():
    with pytest.raises(ValidationError):
        _production_settings(JWT_SECRET_KEY=DEFAULT_JWT_SECRET)


def test_production_rejects_demo_auth():
    with pytest.raises(ValidationError):
        _production_settings(ALLOW_DEMO_AUTH=True)


def test_production_accepts_explicit_secrets():
    settings = _production_settings()
    assert settings.is_production is True
    assert settings.ALLOW_DEMO_AUTH is False


def test_production_rejects_plaintext_frontend_url():
    with pytest.raises(ValidationError):
        _production_settings(FRONTEND_URL="http://app.example.com")


def test_production_rejects_plaintext_oauth_redirect():
    with pytest.raises(ValidationError):
        _production_settings(
            GITHUB_REDIRECT_URI="http://api.example.com/api/v1/auth/github/callback"
        )


def test_production_rejects_plaintext_cors_origin():
    with pytest.raises(ValidationError):
        _production_settings(
            CORS_EXTRA_ORIGINS="https://app.example.com,http://evil.example.com"
        )


def test_production_rejects_wildcard_cors_origin():
    with pytest.raises(ValidationError):
        _production_settings(CORS_EXTRA_ORIGINS="*")


def test_production_rejects_cors_origin_with_path():
    with pytest.raises(ValidationError):
        _production_settings(CORS_EXTRA_ORIGINS="https://app.example.com/admin")


def test_production_accepts_https_origins_without_dev_defaults():
    settings = _production_settings(
        CORS_EXTRA_ORIGINS="https://app.example.com, https://admin.example.com/"
    )
    assert settings.cors_origins == ["https://app.example.com", "https://admin.example.com"]


def test_jwt_algorithm_is_pinned_to_hs256():
    with pytest.raises(ValidationError):
        Settings(JWT_ALGORITHM="none")
    with pytest.raises(ValidationError):
        Settings(JWT_ALGORITHM="RS256")


def test_demo_auth_is_opt_in():
    settings = Settings(
        _env_file=None,
        ENVIRONMENT="development",
        JWT_SECRET_KEY="a" * 48,
        SECRET_KEY="b" * 48,
    )
    assert settings.ALLOW_DEMO_AUTH is False


def test_access_token_contains_standard_claims_and_can_be_revoked():
    token = create_access_token("user_123")
    payload = decode_token(token)
    assert payload["sub"] == "user_123"
    assert payload["type"] == "access"
    assert payload["iat"]
    assert payload["jti"]

    revoke_token(payload)
    with pytest.raises(ValueError):
        decode_token(token)


def test_repo_path_validation_rejects_traversal():
    assert _validate_repo_path("src/app/main.py", "file_path") == "src/app/main.py"
    for value in ("../secrets.txt", "src/../../etc/passwd", "/etc/passwd", ""):
        with pytest.raises(GitHubError):
            _validate_repo_path(value, "file_path")


@pytest.mark.asyncio
async def test_raw_file_fetch_rejects_traversal_before_network():
    service = GitHubRepositoryService()
    with pytest.raises(GitHubError):
        await service.get_raw_file_content("owner", "repo", "main", "../../etc/passwd")


def test_parse_github_url_rejects_dot_segments():
    assert parse_github_url("https://github.com/owner/repo") == ("owner", "repo")
    assert parse_github_url("https://github.com/owner/.github") == (
        "owner",
        ".github",
    )
    for value in (
        "https://github.com/../repo",
        "https://github.com/owner/..",
        "https://github.com/.hidden/repo",
    ):
        with pytest.raises(GitHubError):
            parse_github_url(value)


def test_redact_secrets_masks_common_credentials():
    text = (
        "nvapi-abcdefghijklmnopqrstuvwxyz\n"
        "github_pat_abcdefghijklmnopqrstuvwxyz\n"
        "ghp_abcdefghijklmnopqrstuvwxyz\n"
        "sk-abcdefghijklmnopqrstuvwxyz\n"
        "AKIAABCDEFGHIJKLMNOP\n"
        "API_KEY='super-secret-value'\n"
        "-----BEGIN RSA PRIVATE KEY-----\n"
        "private material\n"
        "-----END RSA PRIVATE KEY-----"
    )
    redacted = redact_secrets(text)
    for secret in (
        "abcdefghijklmnopqrstuvwxyz",
        "AKIAABCDEFGHIJKLMNOP",
        "super-secret-value",
        "private material",
    ):
        assert secret not in redacted
    assert "[REDACTED" in redacted


def test_scan_payload_rejects_too_many_files():
    with pytest.raises(ValidationError):
        SecurityScanPayload(
            repository_url="https://github.com/owner/repo",
            files={f"file_{i}.py": "x" for i in range(31)},
        )


def test_logout_revokes_supplied_refresh_token():
    client = TestClient(app)
    token = create_refresh_token("user_123")
    response = client.post("/api/v1/auth/logout", json={"refresh_token": token})
    assert response.status_code == 200
    with pytest.raises(ValueError):
        decode_token(token)


def test_repository_matching_is_strictly_user_scoped():
    record = {
        "user_id": "user_1",
        "repository": {"owner": "Owner", "name": "Repo"},
    }
    assert _matches_repo(record, "user_1", "owner", "repo") is True
    assert _matches_repo(record, "user_2", "owner", "repo") is False

    demo_record = {
        "user_id": "user_demo_01",
        "repository": {"owner": "Owner", "name": "Repo"},
    }
    assert _matches_repo(demo_record, "user_1", "owner", "repo") is False


def test_chat_request_rejects_oversized_fields():
    with pytest.raises(ValidationError):
        ChatMessageRequest(repository_id="owner/repo", question="x" * 8001)
    with pytest.raises(ValidationError):
        ChatMessageRequest(repository_id="a" * 256 + "/b", question="hello")
    with pytest.raises(ValidationError):
        ChatMessageRequest(
            repository_id="owner/repo",
            question="hello",
            analysis_id="x" * 129,
        )


def test_chat_request_accepts_normal_payload():
    payload = ChatMessageRequest(repository_id="owner/repo", question="What changed?")
    assert payload.repository_id == "owner/repo"


def test_dev_cors_regex_allows_loopback_and_private_lan_only():
    allowed = [
        "http://localhost:3000",
        "https://127.0.0.1:8000",
        "http://[::1]:3000",
        "http://10.0.0.5",
        "http://192.168.1.20:3000",
        "http://172.16.4.2:3000",
    ]
    blocked = [
        "https://example.com",
        "http://evil.local:3000",
        "http://172.32.0.1",
        "http://192.169.1.1",
    ]
    for origin in allowed:
        assert re.fullmatch(_DEV_ORIGIN_REGEX, origin), origin
    for origin in blocked:
        assert not re.fullmatch(_DEV_ORIGIN_REGEX, origin), origin


def test_auth_responses_disable_caching():
    client = TestClient(app)
    response = client.post("/api/v1/auth/exchange", json={"code": "x" * 20})
    assert response.status_code == 401
    assert response.headers["cache-control"] == "no-store"


def test_is_local_client_recognizes_private_and_loopback():
    from app.core.middleware import _is_local_client

    assert _is_local_client("127.0.0.1") is True
    assert _is_local_client("::1") is True
    assert _is_local_client("localhost") is True
    assert _is_local_client("10.21.54.186") is True
    assert _is_local_client("192.168.1.100") is True
    assert _is_local_client("172.16.0.5") is True
    assert _is_local_client("8.8.8.8") is False
    assert _is_local_client("1.1.1.1") is False


def test_dev_environment_exempts_local_clients_from_rate_limit():
    client = TestClient(app)
    # Repeated calls from testclient should not trigger 429 in dev
    for _ in range(40):
        response = client.get("/health")
        assert response.status_code == 200
