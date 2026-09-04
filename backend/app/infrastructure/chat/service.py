"""Repository Chat grounded exclusively in stored analysis records.

No fabricated snippets. Context is built from the real findings of the
user's own analysis for the requested repository. The LLM (if configured)
only interprets that evidence; without an API key the service returns a
deterministic extractive summary instead.
"""

import logging
from typing import Any

import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.domain.models.repo_chat import (
    ChatMessageResponse,
    ContextSourceSnippet,
)
from app.infrastructure.pipeline.orchestrator import AnalysisPipelineOrchestrator

logger = logging.getLogger("devpilot.chat")

NVIDIA_MODEL = "deepseek-ai/deepseek-v4-pro"
MAX_CONTEXT_FINDINGS = 12


def _finding_snippets(record: dict[str, Any], question: str) -> list[ContextSourceSnippet]:
    """Naive retrieval: rank real findings by keyword overlap with the question."""
    question_terms = {t.strip(".,:;!?()[]{}\"'").lower() for t in question.split()}
    question_terms = {t for t in question_terms if len(t) > 2}

    candidates: list[tuple[float, str, str]] = []
    for pillar in ("security", "quality"):
        section = record.get(pillar) or {}
        for f in section.get("findings", [])[:50]:
            haystack = " ".join(
                str(f.get(k, "")) for k in ("title", "issue_type", "affected_file", "file_path", "description")
            ).lower()
            overlap = sum(1 for t in question_terms if t in haystack)
            path = f.get("affected_file") or f.get("file_path") or "unknown"
            text = f"{f.get('title', f.get('issue_type', 'Finding'))}: {f.get('description', '')} Recommendation: {f.get('recommendation', f.get('fix_recommendation', ''))}"
            candidates.append((overlap + 0.1, path, text))

    tree = ((record.get("architecture") or {}).get("folder_graph") or [])[:15]
    if tree:
        candidates.append(
            (0.05, "repository tree", "Top-level paths: " + ", ".join(tree))
        )

    candidates.sort(key=lambda c: c[0], reverse=True)
    seen: set[tuple[str, str]] = set()
    deduped: list[tuple[float, str, str]] = []
    for score, path, text in candidates:
        if (path, text) in seen:
            continue
        seen.add((path, text))
        deduped.append((score, path, text))
    snippets = [
        ContextSourceSnippet(file_path=path, content=text[:800], relevance_score=round(score, 2))
        for score, path, text in deduped[:MAX_CONTEXT_FINDINGS]
    ]
    return snippets


def _deterministic_summary(record: dict[str, Any], question: str) -> str:
    repo = record.get("repository", {})
    health = record.get("health") or {}
    lines = [
        f"Analysis of {repo.get('owner')}/{repo.get('name')} "
        f"(overall health {health.get('overall_health_score', 'n/a')}, "
        f"grade {health.get('health_grade', 'n/a')})."
    ]
    for pillar, label in (("security", "Security"), ("quality", "Code quality")):
        section = record.get(pillar) or {}
        findings = section.get("findings", []) if section.get("status") == "completed" else []
        if findings:
            lines.append(f"{label}: {len(findings)} finding(s). Top: {findings[0].get('title', findings[0].get('issue_type', 'see findings'))}.")
        else:
            lines.append(f"{label}: no issues detected by current checks.")
    lines.append(
        "AI interpretation is unavailable (no LLM key configured) — "
        "this summary is extracted directly from the analysis record."
    )
    return " ".join(lines)


class RepositoryChatService:
    @classmethod
    async def answer_question(
        cls,
        repository_id: str,
        question: str,
        user_id: str,
        analysis_id: str | None = None,
    ) -> ChatMessageResponse:
        """Answer from the user's real analysis. 404 when nothing analyzed."""
        record = None
        if analysis_id:
            record = AnalysisPipelineOrchestrator.get_analysis_by_id(analysis_id)
            if not record or record.get("user_id") != user_id:
                record = None
        if record is None:
            parts = (repository_id or "").strip().split("/")
            if len(parts) == 2:
                record = AnalysisPipelineOrchestrator.get_latest_for_repo(
                    user_id, parts[0].strip(), parts[1].strip()
                )
        if record is None or record.get("status") != "COMPLETED":
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No completed analysis for '{repository_id}'. Analyze the repository first.",
            )

        snippets = _finding_snippets(record, question)
        if not snippets:
            return ChatMessageResponse(
                question=question,
                answer=(
                    "The completed analysis contains no text findings to quote for "
                    "this question. Try the Security or Code Quality tabs for the "
                    "full evidence lists."
                ),
                ai_generated=False,
                sources=[],
            )

        if not settings.NVIDIA_API_KEY:
            return ChatMessageResponse(
                question=question,
                answer=_deterministic_summary(record, question),
                ai_generated=False,
                sources=snippets,
            )

        context_str = "\n\n".join(
            f"--- Source: {s.file_path} ---\n{s.content}" for s in snippets
        )
        repo = record.get("repository", {})
        prompt = (
            f"You are a code assistant. Answer ONLY from the evidence below about "
            f"{repo.get('owner')}/{repo.get('name')}. If the evidence does not "
            f"contain the answer, say so explicitly. Do not invent files, "
            f"vulnerabilities, or statistics.\n\nEvidence:\n{context_str}\n\n"
            f"Question: {question}"
        )
        try:
            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(
                    f"{settings.NVIDIA_BASE_URL}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.NVIDIA_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": NVIDIA_MODEL,
                        "messages": [
                            {"role": "system", "content": "Answer strictly from provided evidence. Never invent repository facts."},
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 0.2,
                        "max_tokens": 2000,
                    },
                )
            if resp.status_code == 200:
                text = resp.json()["choices"][0]["message"]["content"]
                return ChatMessageResponse(
                    question=question, answer=text, ai_generated=True, sources=snippets
                )
            logger.warning(f"NVIDIA chat failed: HTTP {resp.status_code}")
        except Exception as e:
            logger.warning(f"NVIDIA chat error: {e}")

        return ChatMessageResponse(
            question=question,
            answer=_deterministic_summary(record, question),
            ai_generated=False,
            sources=snippets,
        )
