"""GitHub Repository Service fetching repository metadata via GitHub REST API."""

import base64
import re
import httpx
from fastapi import HTTPException, status

from app.core.config import settings
from app.domain.models.github_service import (
    CommitInfo,
    ContributorInfo,
    GitHubRepositoryDetails,
)


class GitHubRepositoryService:
    def __init__(self, access_token: str | None = None):
        self.access_token = access_token or settings.GITHUB_PERSONAL_ACCESS_TOKEN
        self.base_url = "https://api.github.com"

    @classmethod
    def _get_headers(cls) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DevPilot-AI-Service",
        }
        token = settings.GITHUB_PERSONAL_ACCESS_TOKEN
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    @staticmethod
    def parse_github_url(url: str) -> tuple[str, str]:
        """Extract owner and repository name from GitHub URL."""
        pattern = r"github\.com/([^/]+)/([^/.]+)"
        match = re.search(pattern, url)
        if not match:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid GitHub repository URL format.",
            )
        return match.group(1), match.group(2)

    @classmethod
    async def get_repository_info(cls, owner: str, repo: str) -> dict:
        """Fetch basic repository metadata."""
        async with httpx.AsyncClient(headers=cls._get_headers()) as client:
            res = await client.get(f"https://api.github.com/repos/{owner}/{repo}")
            if res.status_code != 200:
                raise HTTPException(status_code=res.status_code, detail=f"GitHub API Error: {res.text}")
            return res.json()

    @classmethod
    async def get_repository_tree(cls, owner: str, repo: str, branch: str = "main") -> list[str]:
        """Fetch recursive file tree paths."""
        async with httpx.AsyncClient(headers=cls._get_headers()) as client:
            res = await client.get(f"https://api.github.com/repos/{owner}/{repo}/git/trees/{branch}?recursive=1")
            if res.status_code == 200:
                tree_data = res.json().get("tree", [])
                return [item["path"] for item in tree_data]
            return []

    @classmethod
    async def fetch_key_files_map(cls, owner: str, repo: str, branch: str = "main") -> dict[str, str]:
        """Fetch key code files for scanning."""
        tree = await cls.get_repository_tree(owner, repo, branch)
        key_extensions = (".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".md", ".yml", ".yaml", "Dockerfile", "requirements.txt", "pom.xml", "Cargo.toml", "go.mod")
        
        target_paths = [p for p in tree if p.endswith(key_extensions) and not any(ignored in p for ignored in ("node_modules", ".next", "__pycache__", "venv", "dist", "build"))][:25]

        files_map: dict[str, str] = {}
        async with httpx.AsyncClient(headers=cls._get_headers()) as client:
            for path in target_paths:
                try:
                    res = await client.get(f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}")
                    if res.status_code == 200:
                        files_map[path] = res.text
                except Exception:
                    continue

        return files_map

    async def fetch_repository_details(self, repo_url: str) -> GitHubRepositoryDetails:
        owner, repo = self.parse_github_url(repo_url)

        async with httpx.AsyncClient(headers=self._get_headers()) as client:
            # 1. Fetch Repository Metadata
            repo_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}")
            if repo_res.status_code == 404:
                raise HTTPException(status_code=404, detail="Repository not found on GitHub.")
            if repo_res.status_code != 200:
                raise HTTPException(status_code=repo_res.status_code, detail="GitHub API request failed.")

            repo_data = repo_res.json()
            default_branch = repo_data.get("default_branch", "main")
            license_name = repo_data.get("license", {}).get("name") if repo_data.get("license") else None

            # 2. Fetch Languages Breakdown
            lang_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}/languages")
            languages = lang_res.json() if lang_res.status_code == 200 else {}

            # 3. Fetch Branches
            branches_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}/branches?per_page=100")
            branches = [b["name"] for b in branches_res.json()] if branches_res.status_code == 200 else [default_branch]

            # 4. Fetch Recent Commits
            commits_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}/commits?per_page=10")
            commits = []
            if commits_res.status_code == 200:
                for c in commits_res.json():
                    commits.append(
                        CommitInfo(
                            sha=c.get("sha", "")[:7],
                            message=c.get("commit", {}).get("message", "").split("\n")[0],
                            author_name=c.get("commit", {}).get("author", {}).get("name", "Unknown"),
                            date=c.get("commit", {}).get("author", {}).get("date", ""),
                        )
                    )

            # 5. Fetch Top Contributors
            contrib_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}/contributors?per_page=10")
            contributors = []
            if contrib_res.status_code == 200 and isinstance(contrib_res.json(), list):
                for contrib in contrib_res.json():
                    contributors.append(
                        ContributorInfo(
                            login=contrib.get("login", ""),
                            contributions=contrib.get("contributions", 0),
                            avatar_url=contrib.get("avatar_url"),
                            html_url=contrib.get("html_url"),
                        )
                    )

            # 6. Fetch README Content
            readme_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}/readme")
            readme_content = None
            if readme_res.status_code == 200:
                content_b64 = readme_res.json().get("content", "")
                try:
                    readme_content = base64.b64decode(content_b64).decode("utf-8")
                except Exception:
                    readme_content = None

            # 7. Fetch Folder Tree
            tree_paths = await self.get_repository_tree(owner, repo, default_branch)

            return GitHubRepositoryDetails(
                repository_name=repo,
                owner=owner,
                full_name=repo_data.get("full_name", f"{owner}/{repo}"),
                html_url=repo_data.get("html_url", repo_url),
                default_branch=default_branch,
                languages=languages,
                detected_framework="Next.js / FastAPI",
                branches=branches,
                recent_commits=commits,
                top_contributors=contributors,
                readme_content=readme_content,
                license_name=license_name,
                folder_tree=tree_paths,
            )
