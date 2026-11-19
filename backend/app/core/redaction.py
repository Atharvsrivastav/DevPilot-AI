"""Best-effort secret redaction for data sent to external AI providers.

This is defense in depth: it reduces accidental disclosure of credentials that
appear in repository files or static-analysis findings. It is not a substitute
for not sending sensitive code to third parties.
"""

import re

_REDACTIONS: tuple[tuple[re.Pattern[str], str], ...] = (
    (re.compile(r"nvapi-[A-Za-z0-9_-]{16,}"), "nvapi-[REDACTED]"),
    (re.compile(r"github_pat_[A-Za-z0-9_]{16,}"), "github_pat_[REDACTED]"),
    (re.compile(r"gh[pousr]_[A-Za-z0-9]{20,}"), "gh_[REDACTED]"),
    (re.compile(r"sk-[A-Za-z0-9_-]{20,}"), "sk-[REDACTED]"),
    (re.compile(r"AKIA[0-9A-Z]{16}"), "AKIA[REDACTED]"),
    (
        re.compile(
            r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?"
            r"-----END [A-Z ]*PRIVATE KEY-----",
            re.DOTALL,
        ),
        "[REDACTED PRIVATE KEY]",
    ),
    (
        re.compile(
            r"(?i)((?:api[_-]?key|secret|password|token)\s*[:=]\s*['\"])"
            r"([^'\"]{8,})(['\"])"
        ),
        r"\1[REDACTED]\3",
    ),
)


def redact_secrets(text: str) -> str:
    """Mask common credential formats while preserving the surrounding text."""
    if not text:
        return text
    redacted = text
    for pattern, replacement in _REDACTIONS:
        redacted = pattern.sub(replacement, redacted)
    return redacted
