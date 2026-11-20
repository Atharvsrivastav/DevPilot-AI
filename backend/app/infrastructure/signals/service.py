"""Deterministic repository-signal metrics computed from real tree/file evidence.

Every metric returns score + reasons + evidence paths. No guessing:
a signal is only claimed when the file/manifest proving it was observed.
"""

import json
from datetime import UTC
from typing import Any


def _basenames(tree_paths: list[str]) -> set[str]:
    return {p.rsplit("/", 1)[-1].lower() for p in tree_paths}


def _has_dir(tree_paths: list[str], *names: str) -> str | None:
    lowered = [p.lower() for p in tree_paths]
    for name in names:
        for p in lowered:
            if p == name or p.startswith(name + "/"):
                return p
    return None


def _count_matching(tree_paths: list[str], predicate) -> list[str]:
    return [p for p in tree_paths if predicate(p.lower())]


def _parse_package_json_deps(files_map: dict[str, str]) -> tuple[int, list[str]]:
    for path, content in files_map.items():
        if path.lower().endswith("package.json"):
            try:
                data = json.loads(content)
                deps = data.get("dependencies", {}) or {}
                dev = data.get("devDependencies", {}) or {}
                names = sorted(set(deps) | set(dev))
                return len(names), [f"{path}: {n}" for n in names[:25]]
            except (ValueError, AttributeError):
                return 0, [path]
    return 0, []


def _parse_requirements_deps(files_map: dict[str, str]) -> tuple[int, list[str]]:
    total = 0
    evidence: list[str] = []
    for path, content in files_map.items():
        low = path.lower()
        if low.endswith("requirements.txt") or low.endswith("requirements-dev.txt"):
            lines = [
                ln.strip()
                for ln in content.splitlines()
                if ln.strip() and not ln.strip().startswith("#")
            ]
            total += len(lines)
            evidence.append(f"{path}: {len(lines)} pinned entries")
    return total, evidence


def score_dependencies(tree_paths: list[str], files_map: dict[str, str]) -> dict[str, Any]:
    """Dependency health from manifests actually present in the tree."""
    names = _basenames(tree_paths)
    reasons: list[str] = []
    evidence: list[str] = []

    manifests = {
        "package.json": "Node.js dependencies",
        "pyproject.toml": "Python project metadata",
        "requirements.txt": "Python pinned requirements",
        "setup.py": "Python packaging",
        "setup.cfg": "Python packaging metadata",
        "go.mod": "Go modules",
        "cargo.toml": "Rust crates",
        "pom.xml": "Maven dependencies",
        "build.gradle": "Gradle dependencies",
        "build.gradle.kts": "Gradle dependencies",
        "composer.json": "PHP dependencies",
        "gemfile": "Ruby gems",
    }
    found = [(m, label) for m, label in manifests.items() if m in names]
    lockfiles = {
        "package-lock.json",
        "pnpm-lock.yaml",
        "yarn.lock",
        "poetry.lock",
        "pdm.lock",
        "pipfile.lock",
        "cargo.lock",
        "go.sum",
        "composer.lock",
        "gemfile.lock",
    }
    locks = sorted(lockfiles & names)

    score = 0
    if found:
        score += 45
        for m, label in found:
            evidence.append(f"{m} ({label})")
        reasons.append(f"{len(found)} dependency manifest(s) detected.")
    else:
        reasons.append("No dependency manifest detected in the repository tree.")

    if locks:
        score += 25
        evidence.extend(locks)
        reasons.append(f"Lockfile(s) present ({', '.join(locks)}) — reproducible installs.")
    elif found:
        reasons.append("No lockfile detected — dependency versions are not pinned reproducibly.")

    dep_count = 0
    npm_count, npm_ev = _parse_package_json_deps(files_map)
    req_count, req_ev = _parse_requirements_deps(files_map)
    dep_count = npm_count + req_count
    evidence.extend(npm_ev)
    evidence.extend(req_ev)
    if dep_count:
        score += 20
        reasons.append(f"{dep_count} declared direct dependenc(ies) parsed from manifests.")
    elif found:
        score += 5
        reasons.append("Manifest contents could not be parsed; dependency count unknown.")

    if dep_count and dep_count <= 150:
        score += 10
        reasons.append("Dependency count is within a maintainable range.")
    elif dep_count > 150:
        score += 2
        reasons.append("Large dependency surface — review for unused or duplicated packages.")

    return {
        "score": min(100, score),
        "reasons": reasons,
        "evidence": evidence[:40],
        "metrics": {
            "manifests": [m for m, _ in found],
            "lockfiles": locks,
            "declared_dependencies": dep_count,
        },
    }


def score_testing(tree_paths: list[str], files_map: dict[str, str]) -> dict[str, Any]:
    """Testing posture from test files, configs, and CI actually observed."""
    reasons: list[str] = []
    evidence: list[str] = []

    # Detect test directories and test files across JS, TS, Python, Go, Java, Rust, C#, PHP, Ruby
    def _is_test_path(p: str) -> bool:
        low = p.lower()
        if "__pycache__" in low or "node_modules" in low:
            return False
        # Directories
        if any(d in low for d in ("/test/", "/tests/", "/__tests__/", "/spec/", "/specs/")):
            return True
        if low.startswith(("test/", "tests/", "__tests__/", "spec/", "specs/")):
            return True
        # Filename conventions
        base = low.rsplit("/", 1)[-1]
        if (
            base.endswith(
                (
                    ".test.ts",
                    ".test.js",
                    ".test.tsx",
                    ".test.jsx",
                    ".spec.ts",
                    ".spec.js",
                    ".spec.tsx",
                    ".spec.jsx",
                )
            )
            or base.endswith(("_test.py", "_test.go", "_spec.rb"))
            or base.startswith(("test_", "spec_"))
            or base.endswith(
                (
                    "test.java",
                    "tests.java",
                    "testcase.java",
                    "test.kt",
                    "tests.kt",
                    "tests.cs",
                    "test.php",
                )
            )
        ):
            return True
        return False

    test_files = [p for p in tree_paths if _is_test_path(p)][:60]

    names = _basenames(tree_paths)
    test_configs = {
        "jest.config.js",
        "jest.config.ts",
        "jest.config.mjs",
        "jest.config.cjs",
        "jest.config.json",
        "vitest.config.ts",
        "vitest.config.js",
        "vitest.config.mjs",
        "playwright.config.ts",
        "playwright.config.js",
        "cypress.config.ts",
        "cypress.config.js",
        "cypress.json",
        "pytest.ini",
        ".pytest.ini",
        "tox.ini",
        ".mocharc.json",
        ".mocharc.js",
        ".mocharc.yml",
        "phpunit.xml",
        "phpunit.xml.dist",
        "karma.conf.js",
    }
    found_configs = sorted(test_configs & names)
    has_pytest_cfg = any(
        p.lower().endswith("pyproject.toml")
        and ("[tool.pytest" in (files_map.get(p, "")) or "pytest" in (files_map.get(p, "")))
        for p in files_map
    )
    if has_pytest_cfg:
        found_configs.append("pyproject.toml (pytest configured)")

    # Check for test scripts in package.json
    for p, content in files_map.items():
        if p.lower().endswith("package.json"):
            try:
                pkg_data = json.loads(content)
                scripts = pkg_data.get("scripts", {})
                if "test" in scripts and "no test specified" not in scripts["test"].lower():
                    found_configs.append(f"package.json (test script: {scripts['test'][:40]})")
            except Exception:
                pass

    # Inspect GitHub Actions CI test steps
    ci_dir = _has_dir(tree_paths, ".github/workflows")
    ci_runs_tests = False
    ci_test_workflows: list[str] = []
    if ci_dir:
        for p in tree_paths:
            low = p.lower()
            if low.startswith(".github/workflows/") and low.endswith((".yml", ".yaml")):
                content = files_map.get(p, "")
                if any(
                    k in content.lower()
                    for k in (
                        "pytest",
                        "jest",
                        "vitest",
                        "go test",
                        "cargo test",
                        "npm test",
                        "npm run test",
                        "yarn test",
                        "pnpm test",
                        "phpunit",
                        "mvn test",
                        "gradle test",
                    )
                ):
                    ci_runs_tests = True
                    ci_test_workflows.append(p)

    score = 0
    if not test_files and not found_configs:
        posture = "NO_TESTS"
        score = 0
        reasons.append("No test files, test directories, or test runner configuration detected.")
    elif test_files and (found_configs or ci_runs_tests):
        if ci_runs_tests:
            posture = "TESTS_AND_CI_VERIFIED"
            score = min(100, 50 + min(25, len(test_files) * 2) + 15 + (10 if found_configs else 0))
            reasons.append(
                f"Tests detected ({len(test_files)} file(s)) and automated CI test execution verified in {', '.join(ci_test_workflows[:2])}."
            )
            evidence.extend(ci_test_workflows)
        else:
            posture = "TESTS_DETECTED_WEAK_CI"
            score = min(75, 40 + min(20, len(test_files) * 2) + (15 if found_configs else 0))
            reasons.append(
                f"Tests detected ({len(test_files)} file(s)), but weak automated CI execution evidence in repository workflows."
            )
    elif found_configs:
        posture = "TEST_CONFIG_ONLY"
        score = 45
        reasons.append(
            f"Test configuration detected ({', '.join(found_configs[:2])}), but few/no explicit test files matched in the scanned tree."
        )
    else:
        posture = "TEST_FILES_UNCONFIGURED"
        score = 40
        reasons.append(
            f"{len(test_files)} test file(s) detected, but no runner configuration or CI test step verified."
        )

    if test_files:
        evidence.extend(test_files[:15])
    if found_configs:
        evidence.extend(found_configs[:5])

    return {
        "score": min(100, score),
        "posture": posture,
        "reasons": reasons,
        "evidence": evidence[:35],
        "metrics": {
            "test_files_count": len(test_files),
            "test_configs": found_configs,
            "ci_runs_tests": ci_runs_tests,
            "ci_test_workflows": ci_test_workflows,
            "posture": posture,
        },
    }


def score_activity(
    repo_data: dict[str, Any],
    recent_commits: list[dict[str, Any]],
    contributors: list[dict[str, Any]],
) -> dict[str, Any]:
    """Calculate development activity score based strictly on real commits, contributors, and push dates."""
    reasons: list[str] = []
    evidence: list[str] = []
    score = 20  # Base score for an existing repository

    # 1. Commit Freshness (from commits list or pushed_at timestamp)
    commits_count = len(recent_commits) if recent_commits else 0
    if commits_count > 0:
        evidence.append(f"{commits_count} recent commit(s) inspected")
        score += min(25, commits_count * 3)

        # Check latest commit date if available
        first_commit = recent_commits[0]
        c_date_str = (
            first_commit.get("date")
            if isinstance(first_commit, dict)
            else getattr(first_commit, "date", None)
        )
        if c_date_str:
            evidence.append(
                f"Latest commit: {c_date_str[:10]} ('{(first_commit.get('message') or '')[:40]}')"
            )
            # Parse freshness
            try:
                from datetime import datetime

                c_dt = datetime.fromisoformat(c_date_str.replace("Z", "+00:00"))
                days_ago = (datetime.now(UTC) - c_dt).days
                if days_ago <= 7:
                    score += 35
                    reasons.append(
                        f"High development activity — newest commit is {days_ago} day(s) old."
                    )
                elif days_ago <= 30:
                    score += 25
                    reasons.append(f"Active maintenance — newest commit is {days_ago} days old.")
                elif days_ago <= 90:
                    score += 15
                    reasons.append(f"Moderate activity — newest commit was {days_ago} days ago.")
                else:
                    score += 5
                    reasons.append(f"Low recent activity — newest commit was {days_ago} days ago.")
            except Exception:
                score += 15
                reasons.append("Recent commits observed on active branch.")
    else:
        reasons.append("No recent commits returned in the inspected sample.")

    # 2. Contributor Diversity
    contrib_count = len(contributors) if contributors else 0
    if contrib_count >= 5:
        score += 20
        reasons.append(f"Collaborative project with {contrib_count}+ identified contributors.")
        evidence.append(f"{contrib_count} top contributors recorded")
    elif contrib_count >= 2:
        score += 15
        reasons.append(f"Active collaboration with {contrib_count} contributors.")
        evidence.append(f"{contrib_count} contributors recorded")
    elif contrib_count == 1:
        score += 10
        reasons.append("Single active maintainer observed in contributor sample.")
        evidence.append("1 contributor recorded")
    else:
        reasons.append("Contributor data was not available or empty.")

    final_score = max(10, min(100, score))

    return {
        "score": final_score,
        "reasons": reasons,
        "evidence": evidence[:25],
        "metrics": {
            "recent_commits_inspected": commits_count,
            "contributors_count": contrib_count,
            "stars": repo_data.get("stars"),
            "open_issues": repo_data.get("open_issues"),
        },
    }


def score_performance_signals(tree_paths: list[str], files_map: dict[str, str]) -> dict[str, Any]:
    """Static performance *signals* — never a runtime claim.

    Based only on measurable facts: oversized files, perf-related configs.
    """
    reasons: list[str] = ["Static signals only — no runtime benchmarking was performed."]
    evidence: list[str] = []

    large = [
        p
        for p in tree_paths
        if any(
            len((files_map.get(p) or "").encode("utf-8", errors="ignore")) > 200_000 for _ in [0]
        )
    ]
    score = 70
    if large:
        score -= min(30, 5 * len(large))
        evidence.extend(large[:10])
        reasons.append(f"{len(large)} fetched file(s) exceed 200 KB — bundle/parse cost signal.")
    else:
        reasons.append("No fetched source file exceeds 200 KB.")

    names = _basenames(tree_paths)
    perf_configs = {
        "next.config.js",
        "next.config.mjs",
        "next.config.ts",
        "vite.config.ts",
        "vite.config.js",
        "webpack.config.js",
        "nuxt.config.ts",
        ".browserslistrc",
    }
    found = sorted(perf_configs & names)
    if found:
        score += 15
        evidence.extend(found)
        reasons.append(
            "Build/bundler configuration present (code-splitting and optimization possible)."
        )
    else:
        reasons.append("No bundler/build performance configuration detected.")

    if any(
        p.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".mp4", ".mov"))
        for p in tree_paths[:5000]
    ):
        score -= 5
        reasons.append(
            "Binary media assets present in the tree — serve optimized formats where possible."
        )

    return {
        "score": max(0, min(100, score)),
        "reasons": reasons,
        "evidence": evidence[:40],
        "metrics": {"oversized_files": len(large), "perf_configs": found},
    }
