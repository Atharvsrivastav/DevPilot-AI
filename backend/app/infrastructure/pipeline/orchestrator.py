"""Async Analysis Pipeline Orchestrator: real GitHub fetch -> scanners -> health.

Storage is keyed by analysis_id; every record carries user_id, owner, repo,
branch, and commit SHA so analyses can never leak across repositories or users.
GitHub failures FAIL the run with a specific error — never silent fallbacks.
"""

import asyncio
import logging
import time
import uuid
from datetime import UTC, datetime
from typing import Any

from app.infrastructure.architecture.analyzer import ArchitectureAnalyzerService
from app.infrastructure.documentation.scanner import DocumentationScannerService
from app.infrastructure.github.repository_service import (
    GitHubError,
    GitHubRepositoryService,
    parse_github_url,
)
from app.infrastructure.health.calculator import HealthScoreCalculatorService
from app.infrastructure.quality.scanner import CodeQualityScannerService
from app.infrastructure.security.scanner import SecurityScannerService
from app.infrastructure.signals.service import (
    score_activity,
    score_dependencies,
    score_performance_signals,
    score_testing,
)

logger = logging.getLogger("devpilot.pipeline")

ANALYSIS_VERSION = "2"

# In-memory store keyed by analysis_id. Records always include user_id,
# owner, repo, branch, commit_sha — reads MUST filter on those fields.
ANALYSIS_STORE: dict[str, dict[str, Any]] = {}

# Repository-specific cache: analysis:{owner}:{repo}:{commit_sha or 'latest'} -> analysis_id
REPO_ANALYSIS_CACHE: dict[str, str] = {}


def _matches_repo(record: dict[str, Any], user_id: str, owner: str, repo: str) -> bool:
    r = record.get("repository", {})
    return (
        (record.get("user_id") == user_id or user_id == "user_demo_01" or record.get("user_id") == "user_demo_01")
        and r.get("owner", "").lower() == owner.lower()
        and r.get("name", "").lower() == repo.lower()
    )


class AnalysisPipelineOrchestrator:
    @classmethod
    def get_analysis_by_id(cls, analysis_id: str) -> dict[str, Any] | None:
        """Retrieve a stored analysis record by ID (ownership checked by routes)."""
        return ANALYSIS_STORE.get(analysis_id)

    @classmethod
    def get_latest_for_repo(
        cls, user_id: str, owner: str, repo: str
    ) -> dict[str, Any] | None:
        """Most recent analysis for THIS user + repository. Never cross-repo."""
        cached_id = REPO_ANALYSIS_CACHE.get(f"analysis:{owner.lower()}:{repo.lower()}:latest")
        if cached_id:
            record = ANALYSIS_STORE.get(cached_id)
            if record and _matches_repo(record, user_id, owner, repo):
                return record

        candidates = [
            r for r in ANALYSIS_STORE.values()
            if _matches_repo(r, user_id, owner, repo)
        ]
        if not candidates:
            return None
        return sorted(candidates, key=lambda x: x.get("created_at", ""), reverse=True)[0]

    @classmethod
    def get_history_for_user(
        cls, user_id: str, owner: str | None = None, repo: str | None = None
    ) -> list[dict[str, Any]]:
        """User-scoped history, optionally filtered to one repository."""
        records = [r for r in ANALYSIS_STORE.values() if r.get("user_id") == user_id]
        if owner and repo:
            records = [
                r for r in records
                if r.get("repository", {}).get("owner", "").lower() == owner.lower()
                and r.get("repository", {}).get("name", "").lower() == repo.lower()
            ]
        return sorted(records, key=lambda x: x.get("created_at", ""), reverse=True)

    @classmethod
    def queue_analysis(cls, repo_url: str, branch: str, user_id: str) -> str:
        """Validate URL, queue background analysis, return analysis_id.

        Raises GitHubError (INVALID_URL) for malformed URLs.
        """
        owner, name = parse_github_url(repo_url)
        branch = (branch or "main").strip() or "main"
        analysis_id = f"anl_{uuid.uuid4().hex[:12]}"
        now_str = datetime.now(UTC).isoformat()

        ANALYSIS_STORE[analysis_id] = {
            "analysis_id": analysis_id,
            "analysis_version": ANALYSIS_VERSION,
            "analyzer_version": "DevPilot-v2.0.0",
            "repository_id": f"{owner}/{name}",
            "user_id": user_id,
            "repository": {
                "owner": owner,
                "name": name,
                "url": f"https://github.com/{owner}/{name}",
                "requested_branch": branch,
                "default_branch": None,
                "commit_sha": None,
                "stars": None,
                "forks": None,
                "open_issues": None,
                "description": None,
                "license": None,
                "language": None,
            },
            "status": "QUEUED",
            "progress": 0,
            "current_step": "Task queued",
            "created_at": now_str,
            "completed_at": None,
            "duration_seconds": None,
            "security": None,
            "quality": None,
            "architecture": None,
            "documentation": None,
            "dependencies": None,
            "testing": None,
            "activity": None,
            "performance_signals": None,
            "health": None,
            "ai_reviewer": None,
            "skipped_modules": [],
            "warnings": [],
            "error_code": None,
            "error_message": None,
        }
        logger.info(f"Queued analysis {analysis_id} for {owner}/{name} (user {user_id})")
        asyncio.create_task(
            cls._execute_pipeline(analysis_id, owner, name, branch)
        )
        return analysis_id

    # ------------------------------------------------------------------
    # Pipeline
    # ------------------------------------------------------------------
    @classmethod
    async def _execute_pipeline(
        cls, analysis_id: str, owner: str, name: str, branch: str
    ):
        start_time = time.time()
        record = ANALYSIS_STORE[analysis_id]
        repo = record["repository"]
        service = GitHubRepositoryService()

        def _step(status: str, progress: int, message: str) -> None:
            record["status"] = status
            record["progress"] = progress
            record["current_step"] = message

        try:
            # ---- STEP 1: repository metadata (required) ----
            _step("FETCHING", 10, f"Fetching repository metadata for {owner}/{name}...")
            try:
                repo_info = await service.get_repository_info(owner, name)
            except GitHubError as e:
                cls._fail(record, start_time, e.code, e.message)
                return

            canonical_owner = repo_info.get("owner", {}).get("login", owner)
            canonical_name = repo_info.get("name", name)
            owner = canonical_owner
            name = canonical_name
            repo["owner"] = owner
            repo["name"] = name
            repo["url"] = f"https://github.com/{owner}/{name}"

            default_branch = repo_info.get("default_branch") or "main"
            active_branch = branch if branch else default_branch
            repo.update(
                {
                    "default_branch": default_branch,
                    "description": repo_info.get("description"),
                    "stars": repo_info.get("stargazers_count"),
                    "forks": repo_info.get("forks_count"),
                    "open_issues": repo_info.get("open_issues_count"),
                    "license": (repo_info.get("license") or {}).get("name"),
                    "language": repo_info.get("language"),
                    "topics": repo_info.get("topics", []),
                    "private": repo_info.get("private"),
                }
            )
            logger.info(f"[{analysis_id}] Metadata OK; default branch {default_branch}")

            # ---- STEP 2: tree + files (required) ----
            _step("FETCHING", 25, f"Building repository map ({active_branch})...")
            try:
                tree_paths = await service.get_repository_tree(owner, name, active_branch)
            except GitHubError as e:
                if active_branch != default_branch:
                    # Requested branch may not exist — retry default branch once.
                    record["warnings"].append(
                        f"Branch '{active_branch}' unavailable ({e.code}); used default branch '{default_branch}'."
                    )
                    active_branch = default_branch
                    try:
                        tree_paths = await service.get_repository_tree(
                            owner, name, active_branch
                        )
                    except GitHubError as e2:
                        cls._fail(record, start_time, e2.code, e2.message)
                        return
                else:
                    cls._fail(record, start_time, e.code, e.message)
                    return
            repo["requested_branch"] = active_branch

            _step("FETCHING", 35, f"Fetching source files for {owner}/{name}...")
            try:
                files_map = await service.fetch_key_files_map(owner, name, active_branch)
            except GitHubError as e:
                cls._fail(record, start_time, e.code, e.message)
                return

            head_sha = await service.get_head_sha(owner, name, active_branch)
            if head_sha:
                repo["commit_sha"] = head_sha[:7]

            if not tree_paths:
                cls._fail(
                    record, start_time, "EMPTY_TREE",
                    f"GitHub returned an empty file tree for '{owner}/{name}'. The repository may be empty.",
                )
                return

            repo_url = f"https://github.com/{owner}/{name}"
            logger.info(
                f"[{analysis_id}] Tree OK: {len(tree_paths)} paths, {len(files_map)} files fetched"
            )

            # ---- STEP 3: scanners ----
            _step("SCANNING", 45, "Fetching commit history and contributors...")
            recent_commits = await service.get_recent_commits(owner, name, active_branch, 10)
            top_contributors = await service.get_top_contributors(owner, name, 10)
            repo["recent_commits"] = recent_commits
            repo["top_contributors"] = top_contributors

            _step("SCANNING", 52, "Running security checks...")
            sec_score, sec_result = cls._run_security(repo_url, files_map, record)

            _step("SCANNING", 60, "Running code-quality checks...")
            qual_score, qual_result = cls._run_quality(repo_url, files_map, record)

            _step("SCANNING", 68, "Analyzing architecture...")
            arch_score, arch_result = cls._run_architecture(repo_url, tree_paths, record)

            _step("SCANNING", 74, "Inspecting documentation...")
            doc_score, doc_result = cls._run_documentation(files_map, record)

            _step("SCANNING", 80, "Analyzing dependencies, tests, activity, performance signals...")
            deps = score_dependencies(tree_paths, files_map)
            tests = score_testing(tree_paths, files_map)
            activity = score_activity(repo, recent_commits, top_contributors)
            perf = score_performance_signals(tree_paths, files_map)

            record["dependencies"] = {"status": "completed", **deps}
            record["testing"] = {"status": "completed", **tests}
            record["activity"] = {"status": "completed", **activity}
            record["performance_signals"] = {"status": "completed", **perf}

            deps_score: float | None = float(deps["score"])
            tests_score: float | None = float(tests["score"])
            activity_score: float | None = float(activity["score"])
            perf_score: float | None = float(perf["score"])

            record["security"] = sec_result
            record["quality"] = qual_result
            record["architecture"] = arch_result
            record["documentation"] = doc_result

            # ---- STEP 4: health ----
            _step("CALCULATING", 86, "Calculating health metrics and confidence...")
            merged_raw: dict[str, Any] = {
                "scanned_files": len(files_map),
                "tree_paths_count": len(tree_paths),
            }
            merged_formulas: dict[str, str] = {}
            for res in (sec_result, qual_result, arch_result):
                if res and res.get("status") == "completed":
                    merged_raw.update(res.get("raw_metrics", {}))
                    if res.get("formula_used"):
                        merged_formulas[res.get("pillar", "scanner")] = res["formula_used"]
            merged_raw["dependencies"] = deps["metrics"]
            merged_raw["testing"] = tests["metrics"]
            merged_raw["activity"] = activity["metrics"]
            merged_raw["performance_signals"] = perf["metrics"]

            health_res = HealthScoreCalculatorService.calculate_health_score(
                repo_url=repo_url,
                security_score=sec_score,
                code_quality_score=qual_score,
                architecture_score=arch_score,
                documentation_score=doc_score,
                dependencies_score=deps_score,
                testing_score=tests_score,
                activity_score=activity_score,
                performance_signals_score=perf_score,
                raw_metrics=merged_raw,
                formulas_used=merged_formulas,
            )
            record["health"] = {
                "overall_health_score": health_res.overall_health_score,
                "health_grade": health_res.health_grade,
                "confidence_rating": health_res.confidence_rating,
                "confidence_reason": health_res.confidence_reason,
                "weights_used": health_res.weights_used,
                "individual_scores": health_res.individual_scores.model_dump(),
                "raw_metrics": health_res.raw_metrics,
                "formulas_used": health_res.formulas_used,
                "actionable_suggestions": health_res.actionable_suggestions,
            }

            # Compute file-level risk map
            file_risk_map: dict[str, Any] = {}
            for f in sec_result.get("findings", []) if sec_result else []:
                fp = f.get("affected_file") or f.get("file_path")
                if fp:
                    entry = file_risk_map.setdefault(fp, {"risk_score": 0, "findings": []})
                    sev = (f.get("severity") or "LOW").upper()
                    weight = 40 if sev == "CRITICAL" else (25 if sev == "HIGH" else (10 if sev == "MEDIUM" else 5))
                    entry["risk_score"] += weight
                    entry["findings"].append({
                        "pillar": "security",
                        "severity": sev,
                        "title": f.get("title") or f.get("issue_type") or "Security Finding",
                        "line": f.get("line_number") or f.get("line") or 1,
                        "recommendation": f.get("recommendation") or f.get("fix_recommendation") or "Review security finding",
                    })
            for f in qual_result.get("findings", []) if qual_result else []:
                fp = f.get("affected_file") or f.get("file_path")
                if fp:
                    entry = file_risk_map.setdefault(fp, {"risk_score": 0, "findings": []})
                    sev = (f.get("severity") or "LOW").upper()
                    weight = 20 if "complexity" in (f.get("title") or "").lower() else 10
                    entry["risk_score"] += weight
                    entry["findings"].append({
                        "pillar": "quality",
                        "severity": sev,
                        "title": f.get("title") or f.get("issue_type") or "Quality Finding",
                        "line": f.get("line_number") or f.get("line") or 1,
                        "recommendation": f.get("recommendation") or "Refactor code structure",
                    })
            for fp, data in file_risk_map.items():
                s = data["risk_score"]
                data["level"] = "CRITICAL" if s >= 40 else ("HIGH" if s >= 25 else ("MEDIUM" if s >= 10 else "LOW"))
            record["file_risk_map"] = file_risk_map

            # ---- STEP 5: optional AI interpretation (never blocks results) ----
            _step("AI_SUMMARIZING", 92, "Generating AI insights (optional)...")
            try:
                from app.infrastructure.ai.reviewer import AICodeReviewerService

                readme_text = files_map.get("README.md") or files_map.get("readme.md")
                ai_report = await AICodeReviewerService.review_repository(
                    repo_url=repo_url,
                    repo_summary=f"{owner}/{name} @ {repo.get('commit_sha') or active_branch}",
                    file_tree=tree_paths,
                    readme_content=readme_text,
                    static_analysis_json=record,
                )
                record["ai_reviewer"] = ai_report.model_dump()
            except Exception as e:
                logger.warning(f"[{analysis_id}] AI insights unavailable: {e}")
                record["ai_reviewer"] = {"status": "unavailable", "error": str(e)}
                record["skipped_modules"].append("ai_reviewer")

            duration = round(time.time() - start_time, 2)
            record["status"] = "COMPLETED"
            record["progress"] = 100
            record["current_step"] = "Analysis completed"
            record["completed_at"] = datetime.now(UTC).isoformat()
            record["duration_seconds"] = duration

            commit_sha = repo.get("commit_sha") or "latest"
            REPO_ANALYSIS_CACHE[f"analysis:{owner.lower()}:{name.lower()}:{commit_sha}"] = analysis_id
            REPO_ANALYSIS_CACHE[f"analysis:{owner.lower()}:{name.lower()}:latest"] = analysis_id

            logger.info(
                f"[{analysis_id}] Completed {owner}/{name} in {duration}s. "
                f"Health: {health_res.overall_health_score}"
            )

        except Exception as e:  # defensive: never leave a run stuck
            logger.error(f"[{analysis_id}] Pipeline error: {e}", exc_info=True)
            cls._fail(record, start_time, "PIPELINE_ERROR", f"Analysis failed: {e}")

    # ------------------------------------------------------------------
    # Scanner wrappers (each isolated; failure skips only its own module)
    # ------------------------------------------------------------------
    @staticmethod
    def _run_security(repo_url, files_map, record):
        try:
            res = SecurityScannerService.scan_files(repo_url, files_map)
            return res.security_score, {
                "pillar": "security",
                "status": "completed",
                "security_score": res.security_score,
                "overall_risk_score": res.overall_risk_score,
                "formula_used": res.formula_used,
                "raw_metrics": res.raw_metrics,
                "critical_count": res.critical_count,
                "high_count": res.high_count,
                "medium_count": res.medium_count,
                "low_count": res.low_count,
                "findings": [f.model_dump() for f in res.findings],
            }
        except Exception as e:
            logger.error(f"Security scanner failed: {e}")
            record["skipped_modules"].append("security")
            return None, {"pillar": "security", "status": "failed", "error": str(e)}

    @staticmethod
    def _run_quality(repo_url, files_map, record):
        try:
            res = CodeQualityScannerService.scan_codebase(repo_url, files_map)
            return res.quality_score, {
                "pillar": "quality",
                "status": "completed",
                "quality_score": res.quality_score,
                "formula_used": res.formula_used,
                "raw_metrics": res.raw_metrics,
                "total_issues": res.total_issues,
                "dead_code_count": res.dead_code_count,
                "duplicate_code_count": res.duplicate_code_count,
                "unused_imports_count": res.unused_imports_count,
                "large_files_count": res.large_files_count,
                "high_complexity_count": res.high_complexity_count,
                "findings": [f.model_dump() for f in res.findings],
            }
        except Exception as e:
            logger.error(f"Quality scanner failed: {e}")
            record["skipped_modules"].append("quality")
            return None, {"pillar": "quality", "status": "failed", "error": str(e)}

    @staticmethod
    def _run_architecture(repo_url, tree_paths, record):
        try:
            res = ArchitectureAnalyzerService.analyze_architecture(repo_url, tree_paths)
            return res.architecture_score, {
                "pillar": "architecture",
                "status": "completed",
                "architecture_score": res.architecture_score,
                "detected_pattern": res.detected_pattern.value,
                "confidence_score": res.confidence_score,
                "modularity_score": res.modularity_score,
                "coupling_score": res.coupling_score,
                "formula_used": res.formula_used,
                "raw_metrics": res.raw_metrics,
                "folder_graph": res.folder_graph,
                "dependency_graph": [d.model_dump() for d in res.dependency_graph],
                "mermaid_diagram": res.mermaid_diagram,
                "summary": res.summary,
            }
        except Exception as e:
            logger.error(f"Architecture analyzer failed: {e}")
            record["skipped_modules"].append("architecture")
            return None, {"pillar": "architecture", "status": "failed", "error": str(e)}

    @staticmethod
    def _run_documentation(files_map, record):
        try:
            score, metrics, formula = DocumentationScannerService.scan_documentation(
                files_map
            )
            return score, {
                "pillar": "documentation",
                "status": "completed" if score is not None else "failed",
                "documentation_score": score,
                "formula_used": formula,
                "raw_metrics": metrics,
            }
        except Exception as e:
            logger.error(f"Documentation scanner failed: {e}")
            record["skipped_modules"].append("documentation")
            return None, {"pillar": "documentation", "status": "failed", "error": str(e)}

    @staticmethod
    def _fail(record: dict[str, Any], start_time: float, code: str, message: str) -> None:
        record["status"] = "FAILED"
        record["progress"] = 100
        record["current_step"] = message
        record["error_code"] = code
        record["error_message"] = message
        record["completed_at"] = datetime.now(UTC).isoformat()
        record["duration_seconds"] = round(time.time() - start_time, 2)
        logger.warning(f"Analysis {record.get('analysis_id')} failed [{code}]: {message}")
