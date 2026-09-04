"""Deterministic repository-signal metrics computed from real tree/file evidence.

Every metric returns score + reasons + evidence paths. No guessing:
a signal is only claimed when the file/manifest proving it was observed.
"""

import json
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


def score_dependencies(
    tree_paths: list[str], files_map: dict[str, str]
) -> dict[str, Any]:
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
        "package-lock.json", "pnpm-lock.yaml", "yarn.lock",
        "poetry.lock", "pdm.lock", "pipfile.lock",
        "cargo.lock", "go.sum", "composer.lock", "gemfile.lock",
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

    test_files = _count_matching(
        tree_paths,
        lambda p: (
            "/test/" in p or "/tests/" in p or p.startswith("test/") or p.startswith("tests/")
            or "/__tests__/" in p or p.endswith("_test.py") or p.endswith("_test.go")
            or p.endswith(".spec.ts") or p.endswith(".spec.js")
            or p.endswith(".test.ts") or p.endswith(".test.js")
            or p.endswith("test_*.py") or p.startswith("test_")
        ),
    )
    test_files = [p for p in test_files if "__pycache__" not in p][:40]

    score = 0
    if test_files:
        score += 45
        evidence.extend(test_files[:20])
        reasons.append(f"{len(test_files)} test file(s) detected in the tree.")
    else:
        reasons.append("No test files or test directories detected.")

    names = _basenames(tree_paths)
    test_configs = {
        "jest.config.js", "jest.config.ts", "jest.config.cjs",
        "vitest.config.ts", "vitest.config.js", "pytest.ini",
        "tox.ini", "phpunit.xml", "phpunit.xml.dist", "karma.conf.js",
    }
    found_configs = sorted(test_configs & names)
    has_pytest_cfg = any(
        p.lower().endswith("pyproject.toml") and "[tool.pytest" in (files_map.get(p, ""))
        for p in files_map
    )
    if found_configs or has_pytest_cfg:
        score += 20
        evidence.extend(found_configs)
        if has_pytest_cfg:
            evidence.append("pyproject.toml ([tool.pytest.ini_options])")
        reasons.append("Test runner configuration detected.")
    else:
        reasons.append("No test runner configuration detected.")

    ci_dir = _has_dir(tree_paths, ".github/workflows")
    ci_runs_tests = False
    if ci_dir:
        for p in tree_paths:
            low = p.lower()
            if low.startswith(".github/workflows/") and low.endswith((".yml", ".yaml")):
                content = files_map.get(p, "")
                evidence.append(p)
                if any(k in content.lower() for k in ("pytest", "jest", "vitest", "go test", "cargo test", "npm test", "phpunit")):
                    ci_runs_tests = True
    if ci_runs_tests:
        score += 25
        reasons.append("CI workflow executes a test suite.")
    elif ci_dir:
        score += 10
        reasons.append("CI workflows exist but no test execution step was detected in fetched files.")
    else:
        reasons.append("No CI workflow directory (.github/workflows) detected.")

    if test_files and (found_configs or has_pytest_cfg or ci_runs_tests):
        score += 10

    return {
        "score": min(100, score),
        "reasons": reasons,
        "evidence": evidence[:40],
        "metrics": {
            "test_files": len(test_files),
            "test_configs": found_configs,
            "ci_runs_tests": ci_runs_tests,
        },
    }


def score_performance_signals(
    tree_paths: list[str], files_map: dict[str, str]
) -> dict[str, Any]:
    """Static performance *signals* — never a runtime claim.

    Based only on measurable facts: oversized files, perf-related configs.
    """
    reasons: list[str] = [
        "Static signals only — no runtime benchmarking was performed."
    ]
    evidence: list[str] = []

    large = [
        p for p in tree_paths
        if any(
            len((files_map.get(p) or "").encode("utf-8", errors="ignore")) > 200_000
            for _ in [0]
        )
    ]
    # files_map only holds fetched key files; large blobs outside it are unknown.
    score = 70
    if large:
        score -= min(30, 5 * len(large))
        evidence.extend(large[:10])
        reasons.append(f"{len(large)} fetched file(s) exceed 200 KB — bundle/parse cost signal.")
    else:
        reasons.append("No fetched source file exceeds 200 KB.")

    names = _basenames(tree_paths)
    perf_configs = {
        "next.config.js", "next.config.mjs", "next.config.ts",
        "vite.config.ts", "vite.config.js", "webpack.config.js",
        "nuxt.config.ts", ".browserslistrc",
    }
    found = sorted(perf_configs & names)
    if found:
        score += 15
        evidence.extend(found)
        reasons.append("Build/bundler configuration present (code-splitting and optimization possible).")
    else:
        reasons.append("No bundler/build performance configuration detected.")

    if any(p.lower().endswith((".png", ".jpg", ".jpeg", ".gif", ".mp4", ".mov")) for p in tree_paths[:5000]):
        score -= 5
        reasons.append("Binary media assets present in the tree — serve optimized formats where possible.")

    return {
        "score": max(0, min(100, score)),
        "reasons": reasons,
        "evidence": evidence[:40],
        "metrics": {"oversized_files": len(large), "perf_configs": found},
    }
