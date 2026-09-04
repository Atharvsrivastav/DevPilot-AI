"""GitHub repository metadata retrieval and grounded file explanation endpoints."""

import re
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
import httpx

from app.api.deps import get_current_user_id
from app.core.config import settings
from app.domain.models.github_service import GitHubRepositoryDetails
from app.infrastructure.github.repository_service import GitHubRepositoryService, parse_github_url
from app.infrastructure.pipeline.orchestrator import AnalysisPipelineOrchestrator

router = APIRouter(prefix="/repository", tags=["GitHub Repository Service"])


@router.get("/details", response_model=GitHubRepositoryDetails)
async def get_repository_details(
    repo_url: str = Query(..., description="Full GitHub repository URL"),
    current_user_id: str = Depends(get_current_user_id)
):
    """Fetch complete GitHub repository metadata without AI processing."""
    service = GitHubRepositoryService()
    return await service.fetch_repository_details(repo_url)


class ExplainFileRequest(BaseModel):
    repo_url: str
    file_path: str
    branch: str | None = None
    analysis_id: str | None = None


class ExplainFileResponse(BaseModel):
    file_path: str
    purpose: str
    responsibilities: list[str]
    functions: list[str]
    dependencies: list[str]
    potential_concerns: list[str]
    source_attribution: str
    is_ai_generated: bool


@router.post("/explain-file", response_model=ExplainFileResponse)
async def explain_file(
    payload: ExplainFileRequest,
    current_user_id: str = Depends(get_current_user_id),
):
    """Explain a repository file grounded in its real code and findings."""
    owner, repo = parse_github_url(payload.repo_url)
    service = GitHubRepositoryService()
    branch = payload.branch or "main"
    content = await service.get_raw_file_content(owner, repo, branch, payload.file_path)
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File '{payload.file_path}' not found on branch '{branch}'.",
        )

    # Gather known findings for this file if an analysis is available
    concerns: list[str] = []
    if payload.analysis_id:
        rec = AnalysisPipelineOrchestrator.get_analysis_by_id(payload.analysis_id)
        if rec:
            for f in (rec.get("security") or {}).get("findings", []):
                if (f.get("affected_file") or f.get("file_path")) == payload.file_path:
                    concerns.append(f"Security: {f.get('title') or f.get('issue_type')} at line {f.get('line_number', 1)} ({f.get('recommendation', '')})")
            for f in (rec.get("quality") or {}).get("findings", []):
                if (f.get("affected_file") or f.get("file_path")) == payload.file_path:
                    concerns.append(f"Quality: {f.get('title') or f.get('issue_type')} at line {f.get('line_number', 1)} ({f.get('recommendation', '')})")

    # Extract symbols deterministically
    lines = content.splitlines()
    fn_matches = re.findall(r"^(?:async\s+)?def\s+([A-Za-z0-9_]+)\s*\(", content, re.MULTILINE)
    fn_matches += re.findall(r"(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_]+)\s*\(", content, re.MULTILINE)
    fn_matches += re.findall(r"(?:export\s+)?class\s+([A-Za-z0-9_]+)", content, re.MULTILINE)
    fn_matches += re.findall(r"(?:export\s+)?const\s+([A-Za-z0-9_]+)\s*=\s*(?:async\s*)?\(", content, re.MULTILINE)

    dep_matches = re.findall(r"^(?:import|from)\s+([A-Za-z0-9_\./@-]+)", content, re.MULTILINE)
    dep_matches += re.findall(r"require\(['\"]([A-Za-z0-9_\./@-]+)['\"]\)", content)
    unique_deps = sorted(list(set(dep_matches)))[:10]
    unique_fns = sorted(list(set(fn_matches)))[:15]

    # Try LLM if configured
    if settings.NVIDIA_API_KEY:
        try:
            prompt = (
                f"You are a code analyzer. Explain this file from repository {owner}/{repo}.\n"
                f"File: {payload.file_path}\n"
                f"Known issues: {', '.join(concerns) if concerns else 'None detected'}\n"
                f"Code snippet (first 100 lines):\n"
                + "\n".join(lines[:100])
                + "\n\nProvide JSON format with: 'purpose' (1 sentence), 'responsibilities' (list of strings), 'functions' (list of identified function names), 'dependencies' (list of imported libraries), 'potential_concerns' (list of concerns)."
            )
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.post(
                    f"{settings.NVIDIA_BASE_URL}/chat/completions",
                    headers={"Authorization": f"Bearer {settings.NVIDIA_API_KEY}"},
                    json={
                        "model": "deepseek-ai/deepseek-v4-pro",
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.2,
                    }
                )
                if res.status_code == 200:
                    import json
                    text = res.json()["choices"][0]["message"]["content"].strip()
                    # extract JSON block
                    m = re.search(r"\{.*\}", text, re.DOTALL)
                    if m:
                        parsed = json.loads(m.group(0))
                        return ExplainFileResponse(
                            file_path=payload.file_path,
                            purpose=parsed.get("purpose", f"Module for {payload.file_path}"),
                            responsibilities=parsed.get("responsibilities", []),
                            functions=parsed.get("functions", unique_fns),
                            dependencies=parsed.get("dependencies", unique_deps),
                            potential_concerns=parsed.get("potential_concerns", concerns),
                            source_attribution=f"Based on analyzed file: {payload.file_path}",
                            is_ai_generated=True,
                        )
        except Exception:
            pass

    # Deterministic fallback
    base_name = payload.file_path.split("/")[-1]
    purpose = f"Implements core functionality and exports for {base_name} ({len(lines)} lines)."
    responsibilities = [
        f"Defines component/module behavior for {base_name}",
        f"Integrates with dependencies: {', '.join(unique_deps[:4]) or 'internal modules'}",
    ]
    if unique_fns:
        responsibilities.append(f"Declares {len(unique_fns)} primary symbols: {', '.join(unique_fns[:3])}")

    return ExplainFileResponse(
        file_path=payload.file_path,
        purpose=purpose,
        responsibilities=responsibilities,
        functions=unique_fns,
        dependencies=unique_deps,
        potential_concerns=concerns if concerns else ["No critical static issues flagged on this file."],
        source_attribution=f"Based on analyzed file: {payload.file_path}",
        is_ai_generated=False,
    )

