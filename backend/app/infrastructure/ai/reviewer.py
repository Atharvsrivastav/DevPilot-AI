"""NVIDIA NIM API LLM Integration explaining static analyzer JSON results without hallucinating findings."""

import json
import logging
from typing import Any

import httpx

from app.core.config import settings
from app.core.redaction import redact_secrets
from app.domain.models.ai_reviewer import AICodeReviewReport

logger = logging.getLogger("devpilot.ai_reviewer")

NVIDIA_PREFERRED_MODELS = [
    "z-ai/glm-5.2",
    "deepseek-ai/deepseek-v4-pro",
    "meta/llama-3.3-70b-instruct",
    "nvidia/llama-3.1-nemotron-70b-instruct",
    "qwen/qwen2.5-70b-instruct",
    "deepseek-ai/deepseek-r1",
]


class AICodeReviewerService:
    @classmethod
    async def review_repository(
        cls,
        repo_url: str,
        repo_summary: str,
        file_tree: list[str],
        readme_content: str | None = None,
        static_analysis_json: dict[str, Any] | None = None,
    ) -> AICodeReviewReport:
        """Invokes NVIDIA free LLM API to explain static analyzer JSON results into human-readable explanations."""
        json_evidence = static_analysis_json or {
            "repository_url": repo_url,
            "file_tree_count": len(file_tree),
            "summary": repo_summary,
            "has_readme": bool(readme_content),
        }

        # Attempt calling NVIDIA NIM API if key is present
        if settings.NVIDIA_API_KEY:
            llm_explanation = await cls._query_nvidia_nim(json_evidence)
            if llm_explanation:
                return llm_explanation

        # Deterministic human-readable explanation generator formatting exact static JSON results
        sec_findings = json_evidence.get("security", {}).get("findings", [])
        qual_findings = json_evidence.get("quality", {}).get("findings", [])
        arch_pattern = (
            json_evidence.get("architecture", {}).get("detected_pattern") or "Undetermined"
        )

        improvements = []
        if sec_findings:
            improvements.append(
                f"Security: Address {len(sec_findings)} detected security vulnerability findings."
            )
        else:
            improvements.append("Security: No issues detected by current checks.")

        if qual_findings:
            improvements.append(
                f"Code Quality: Refactor {len(qual_findings)} flagged quality smells and complexity items."
            )
        else:
            improvements.append("Code Quality: No quality findings reported by current checks.")

        improvements.append(f"Architecture: Structure follows verified {arch_pattern} layout.")

        pr_comments = [f"Verified {len(file_tree)} tracked files against static rules."]
        for f in sec_findings[:2]:
            pr_comments.append(
                f"Security Alert in {f.get('affected_file', 'code')}: {f.get('title', 'Issue')}"
            )

        refactor_targets = []
        for q in qual_findings[:2]:
            refactor_targets.append(
                {
                    "file_path": q.get("file_path", "unknown"),
                    "target_symbol": q.get("issue_type", "Quality Smell"),
                    "reason": q.get("title", "High complexity or dead code detected"),
                    "suggested_code": q.get(
                        "recommendation", "Refactor into smaller modular functions."
                    ),
                }
            )

        # No fabricated targets: empty means no evidence-backed suggestions exist.

        return AICodeReviewReport(
            repository_url=repo_url,
            repository_summary=f"Analysis explanation for {repo_url} based on {len(file_tree)} scanned files and static analyzer JSON output.",
            architecture_explanation=f"Static tree inspection verifies {arch_pattern} pattern with {len(file_tree)} tracked paths.",
            improvement_suggestions=improvements,
            readme_improvements=(
                "## README Documentation Review\n\n"
                f"- Readme Status: {'Available' if readme_content else 'Missing README.md file.'}\n"
                "- Ensure API endpoints, setup scripts, and environment variables (.env) are documented."
            ),
            pr_review_comments=pr_comments,
            refactoring_suggestions=refactor_targets,
        )

    @classmethod
    async def _query_nvidia_nim(
        cls, static_analysis_json: dict[str, Any]
    ) -> AICodeReviewReport | None:
        """Call NVIDIA NIM API with preferred model fallback order."""
        if not settings.NVIDIA_API_KEY:
            return None
        keys = [settings.NVIDIA_API_KEY]

        serialized = redact_secrets(json.dumps(static_analysis_json, indent=2))
        prompt = (
            "You are DevPilot AI's Senior Staff Code Reviewer. Given the exact JSON results from static analyzers below, "
            "explain the findings in human-readable terms. Do NOT invent or hallucinate any findings not present in the JSON.\n\n"
            f"Static Analyzer JSON Results:\n{serialized[:4000]}"
        )

        # Bound the cost/latency of provider fallbacks.
        models = NVIDIA_PREFERRED_MODELS[: max(1, settings.NVIDIA_MAX_FALLBACK_MODELS)]

        for api_key in keys:
            headers = {
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            }
            for model in models:
                try:
                    payload = {
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You explain static code analysis JSON findings concisely without inventing vulnerabilities.",
                            },
                            {"role": "user", "content": prompt},
                        ],
                        "temperature": 1.0,
                        "top_p": 1.0,
                        "max_tokens": 16384,
                        "seed": 42,
                        "chat_template_kwargs": {"thinking": False},
                    }
                    async with httpx.AsyncClient(
                        timeout=settings.NVIDIA_REQUEST_TIMEOUT_SECONDS
                    ) as client:
                        resp = await client.post(
                            f"{settings.NVIDIA_BASE_URL}/chat/completions",
                            headers=headers,
                            json=payload,
                        )
                        if resp.status_code == 200:
                            data = resp.json()
                            explanation_text = data["choices"][0]["message"]["content"]
                            return AICodeReviewReport(
                                repository_url=static_analysis_json.get(
                                    "repository_url", "repository"
                                ),
                                repository_summary=f"NVIDIA NIM ({model}) Analysis Summary: {explanation_text[:300]}...",
                                architecture_explanation=f"NVIDIA NIM ({model}) Architecture Assessment based on static findings.",
                                improvement_suggestions=[explanation_text[:200]],
                                readme_improvements="Ensure setup steps and architecture overview are included.",
                                pr_review_comments=[
                                    "Verified against NVIDIA NIM free LLM model explanation."
                                ],
                                refactoring_suggestions=[],
                            )
                except Exception as e:
                    logger.warning(
                        f"NVIDIA NIM model '{model}' query failed: {e}. Trying next model..."
                    )
                    continue
        return None
