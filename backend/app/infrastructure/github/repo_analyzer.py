"""Repository Structural Analyzer for extracting language, framework, package manager, tree, and dependencies."""

import json
from typing import Any
from app.domain.models.github_service import GitHubRepositoryDetails
from app.domain.models.repo_analyzer import (
    DependencyItem,
    ProjectSizeMetrics,
    RepositoryStructureAnalysis,
)


class RepositoryAnalyzerService:
    @staticmethod
    def analyze_repository(repo_details: GitHubRepositoryDetails, raw_files_map: dict[str, str] | None = None) -> RepositoryStructureAnalysis:
        """Analyzes repository metadata and tree structure returning a structured JSON model."""
        raw_files = raw_files_map or {}
        tree = repo_details.folder_tree

        # 1. Languages
        languages_dict = repo_details.languages or {}
        detected_languages = list(languages_dict.keys())
        primary_language = detected_languages[0] if detected_languages else "Unknown"

        # 2. Package Manager & Framework & Dependencies
        package_manager = "Unknown"
        dependencies: list[DependencyItem] = []
        tree_set = set(tree)

        # JavaScript / TypeScript Ecosystem
        if "package.json" in tree_set:
            if "pnpm-lock.yaml" in tree_set:
                package_manager = "pnpm"
            elif "yarn.lock" in tree_set:
                package_manager = "yarn"
            elif "bun.lockb" in tree_set or "bun.lock" in tree_set:
                package_manager = "bun"
            else:
                package_manager = "npm"

            if "package.json" in raw_files:
                try:
                    pkg_data = json.loads(raw_files["package.json"])
                    for dep, ver in pkg_data.get("dependencies", {}).items():
                        dependencies.append(DependencyItem(name=dep, version=str(ver), type="production"))
                    for dep, ver in pkg_data.get("devDependencies", {}).items():
                        dependencies.append(DependencyItem(name=dep, version=str(ver), type="dev"))
                except Exception:
                    pass

        # Python Ecosystem
        elif "pyproject.toml" in tree_set or "requirements.txt" in tree_set or "Pipfile" in tree_set:
            if "uv.lock" in tree_set:
                package_manager = "uv"
            elif "poetry.lock" in tree_set:
                package_manager = "poetry"
            elif "Pipfile.lock" in tree_set:
                package_manager = "pipenv"
            else:
                package_manager = "pip"

            if "requirements.txt" in raw_files:
                for line in raw_files["requirements.txt"].splitlines():
                    line = line.strip()
                    if line and not line.startswith("#"):
                        parts = line.split("==")
                        dep_name = parts[0].strip()
                        dep_ver = parts[1].strip() if len(parts) > 1 else None
                        dependencies.append(DependencyItem(name=dep_name, version=dep_ver, type="production"))

        # Rust Ecosystem
        elif "Cargo.toml" in tree_set:
            package_manager = "cargo"

        # Go Ecosystem
        elif "go.mod" in tree_set:
            package_manager = "go modules"

        # Framework Detection
        framework = repo_details.detected_framework or "Unknown"

        # 3. Project Size Metrics
        total_files = len(tree)
        total_directories = sum(1 for item in tree if "/" in item and not item.endswith((".ts", ".tsx", ".js", ".py", ".md", ".json", ".html", ".css")))
        
        project_size = ProjectSizeMetrics(
            total_files=total_files,
            total_directories=total_directories,
            estimated_lines_of_code=None,
        )

        return RepositoryStructureAnalysis(
            primary_language=primary_language,
            detected_languages=detected_languages,
            framework=framework,
            package_manager=package_manager,
            directory_structure=tree[:100],  # Top 100 directory entries
            dependencies=dependencies,
            project_size=project_size,
        )
