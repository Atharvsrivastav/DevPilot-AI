"""GitHub Repository Service fetching repository metadata via GitHub REST API.

All failures raise GitHubError with a machine-readable code and a
user-facing message — never silent empty results.
"""

import asyncio
import base64
import re
import time
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException

from app.core.config import settings
from app.domain.models.github_service import (
    CommitInfo,
    ContributorInfo,
    GitHubRepositoryDetails,
)

REQUEST_TIMEOUT = 15.0
MAX_FILE_BYTES = 200_000
MAX_SCAN_FILES = 30
FETCH_CONCURRENCY = 8
METADATA_CACHE_TTL_SECONDS = 120

_KEY_EXTENSIONS = (
    ".py", ".js", ".ts", ".tsx", ".jsx", ".json", ".md",
    ".yml", ".yaml", "Dockerfile", "requirements.txt",
    "pom.xml", "Cargo.toml", "go.mod",
)
_IGNORED_PATH_PARTS = (
    "node_modules", ".next", "__pycache__", "venv", ".venv",
    "dist", "build", ".git/",
)

# Short-lived metadata cache: github:{owner}/{repo} -> (expires_at, payload)
_METADATA_CACHE: dict[str, tuple[float, dict]] = {}


class GitHubError(Exception):
    """Typed GitHub fetch failure.

    Codes: INVALID_URL | REPO_NOT_FOUND | RATE_LIMITED | AUTH_REQUIRED
           | PRIVATE_OR_FORBIDDEN | FETCH_FAILED
    """

    def __init__(self, code: str, message: str, http_status: int = 502):
        super().__init__(message)
        self.code = code
        self.message = message
        self.http_status = http_status


def parse_github_url(url: str) -> tuple[str, str]:
    """Extract (owner, repo) from a GitHub URL. Only github.com is allowed."""
    cleaned = (url or "").strip()
    if not cleaned:
        raise GitHubError("INVALID_URL", "Enter a GitHub repository URL.", 400)
    if "://" not in cleaned:
        cleaned = "https://" + cleaned
    try:
        parsed = urlparse(cleaned)
    except Exception:
        raise GitHubError(
            "INVALID_URL",
            f"'{url}' is not a valid GitHub repository URL (expected github.com/owner/repo).",
            400,
        ) from None
    if parsed.netloc.lower() not in ("github.com", "www.github.com"):
        raise GitHubError(
            "INVALID_URL",
            "Only github.com repository URLs are supported.",
            400,
        )
    parts = [p for p in parsed.path.strip("/").split("/") if p]
    if len(parts) < 2:
        raise GitHubError(
            "INVALID_URL",
            f"'{url}' is not a valid GitHub repository URL (expected github.com/owner/repo).",
            400,
        )
    owner = parts[0]
    repo = parts[1]
    if repo.endswith(".git"):
        repo = repo[:-4]
    if not re.fullmatch(r"[A-Za-z0-9_.-]+", owner) or not re.fullmatch(
        r"[A-Za-z0-9_.-]+", repo
    ):
        raise GitHubError(
            "INVALID_URL",
            f"'{url}' is not a valid GitHub repository URL (expected github.com/owner/repo).",
            400,
        )
    return owner, repo


class GitHubRepositoryService:
    def __init__(self, access_token: str | None = None):
        self.access_token = access_token or settings.GITHUB_PERSONAL_ACCESS_TOKEN
        self.base_url = "https://api.github.com"

    def _headers(self) -> dict[str, str]:
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "DevPilot-AI-Service",
        }
        token = (self.access_token or "").strip()
        if token and not token.startswith("your_") and token.lower() != "none":
            headers["Authorization"] = f"Bearer {token}"
        return headers

    @staticmethod
    def parse_github_url(url: str) -> tuple[str, str]:
        return parse_github_url(url)

    def _classify_error(self, res: httpx.Response, owner: str, repo: str) -> GitHubError:
        remaining = res.headers.get("X-RateLimit-Remaining")
        if res.status_code == 404:
            return GitHubError(
                "REPO_NOT_FOUND",
                f"Repository '{owner}/{repo}' was not found on GitHub. Check the URL or whether it is private.",
                404,
            )
        if res.status_code == 401:
            return GitHubError(
                "AUTH_REQUIRED",
                "GitHub rejected the request (bad credentials). Set a valid GITHUB_PERSONAL_ACCESS_TOKEN server-side.",
                502,
            )
        if res.status_code == 429 or (
            res.status_code == 403 and remaining == "0"
        ):
            reset = res.headers.get("X-RateLimit-Reset")
            when = ""
            if reset and reset.isdigit():
                wait = max(0, int(reset) - int(time.time()))
                when = f" Try again in about {wait // 60 + 1} minute(s)."
            return GitHubError(
                "RATE_LIMITED",
                f"GitHub API rate limit reached.{when}",
                429,
            )
        if res.status_code == 403:
            return GitHubError(
                "PRIVATE_OR_FORBIDDEN",
                f"Access to '{owner}/{repo}' is forbidden. The repository may be private — configure a GITHUB_PERSONAL_ACCESS_TOKEN with access to it.",
                403,
            )
        return GitHubError(
            "FETCH_FAILED",
            f"GitHub API request failed (HTTP {res.status_code}).",
            502,
        )

    async def get_repository_info(self, owner: str, repo: str) -> dict:
        """Fetch repository metadata (required — raises GitHubError on failure)."""
        cache_key = f"github:{owner}/{repo}"
        cached = _METADATA_CACHE.get(cache_key)
        if cached and cached[0] > time.time():
            return cached[1]
        try:
            async with httpx.AsyncClient(
                headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
            ) as client:
                res = await client.get(f"{self.base_url}/repos/{owner}/{repo}")
        except httpx.HTTPError as e:
            raise GitHubError(
                "FETCH_FAILED", f"Could not reach GitHub API: {e.__class__.__name__}."
            ) from e
        if res.status_code != 200:
            raise self._classify_error(res, owner, repo)
        data = res.json()
        _METADATA_CACHE[cache_key] = (time.time() + METADATA_CACHE_TTL_SECONDS, data)
        return data

    async def get_head_sha(
        self, owner: str, repo: str, branch: str
    ) -> str | None:
        """Newest commit SHA on a branch (best-effort — returns None if unavailable)."""
        try:
            async with httpx.AsyncClient(
                headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
            ) as client:
                res = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/commits",
                    params={"sha": branch, "per_page": 1},
                )
            if res.status_code == 200 and isinstance(res.json(), list) and res.json():
                return res.json()[0].get("sha")
        except httpx.HTTPError:
            pass
        return None

    async def get_recent_commits(
        self, owner: str, repo: str, branch: str = "main", count: int = 10
    ) -> list[dict[str, Any]]:
        """Fetch list of recent commits on a branch (best-effort)."""
        try:
            async with httpx.AsyncClient(
                headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
            ) as client:
                res = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/commits",
                    params={"sha": branch, "per_page": count},
                )
            if res.status_code == 200 and isinstance(res.json(), list):
                result = []
                for c in res.json():
                    commit_obj = c.get("commit", {})
                    author_obj = commit_obj.get("author", {})
                    result.append({
                        "sha": (c.get("sha") or "")[:7],
                        "message": (commit_obj.get("message") or "").split("\n")[0],
                        "author_name": author_obj.get("name", "Unknown"),
                        "date": author_obj.get("date", ""),
                    })
                return result
        except httpx.HTTPError:
            pass
        return []

    async def get_top_contributors(
        self, owner: str, repo: str, count: int = 10
    ) -> list[dict[str, Any]]:
        """Fetch list of top contributors (best-effort)."""
        try:
            async with httpx.AsyncClient(
                headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
            ) as client:
                res = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/contributors",
                    params={"per_page": count},
                )
            if res.status_code == 200 and isinstance(res.json(), list):
                result = []
                for contrib in res.json():
                    result.append({
                        "login": contrib.get("login", ""),
                        "contributions": contrib.get("contributions", 0),
                        "avatar_url": contrib.get("avatar_url"),
                        "html_url": contrib.get("html_url"),
                    })
                return result
        except httpx.HTTPError:
            pass
        return []

    async def get_repository_tree(
        self, owner: str, repo: str, branch: str = "main"
    ) -> list[str]:
        """Fetch recursive file tree paths (required — raises GitHubError on failure)."""
        try:
            async with httpx.AsyncClient(
                headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
            ) as client:
                res = await client.get(
                    f"{self.base_url}/repos/{owner}/{repo}/git/trees/{branch}",
                    params={"recursive": "1"},
                )
        except httpx.HTTPError as e:
            raise GitHubError(
                "FETCH_FAILED",
                f"Could not fetch the repository file tree: {e.__class__.__name__}.",
            ) from e
        if res.status_code != 200:
            raise self._classify_error(res, owner, repo)
        payload = res.json()
        if payload.get("truncated"):
            # Tree is partial; still usable, flagged downstream via count.
            pass
        return [
            item["path"]
            for item in payload.get("tree", [])
            if item.get("type") == "blob" and "path" in item
        ]

    async def fetch_key_files_map(
        self, owner: str, repo: str, branch: str = "main"
    ) -> dict[str, str]:
        """Fetch source text of key files for scanners (concurrent, size-capped)."""
        tree = await self.get_repository_tree(owner, repo, branch)
        targets = [
            p
            for p in tree
            if p.endswith(_KEY_EXTENSIONS)
            and not any(ignored in p for ignored in _IGNORED_PATH_PARTS)
        ][:MAX_SCAN_FILES]

        files_map: dict[str, str] = {}
        semaphore = asyncio.Semaphore(FETCH_CONCURRENCY)

        async def _fetch(client: httpx.AsyncClient, path: str) -> None:
            async with semaphore:
                try:
                    res = await client.get(
                        f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{path}"
                    )
                    if res.status_code != 200:
                        return
                    text = res.text
                    if len(text.encode("utf-8", errors="ignore")) > MAX_FILE_BYTES:
                        return
                    files_map[path] = text
                except httpx.HTTPError:
                    return

        async with httpx.AsyncClient(
            headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
        ) as client:
            await asyncio.gather(*(_fetch(client, p) for p in targets))
        return files_map

    @staticmethod
    def detect_frameworks(tree_paths: list[str], languages: dict) -> str:
        """Best-effort framework labels from real tree/manifest signals."""
        basenames = {p.rsplit("/", 1)[-1].lower() for p in tree_paths}
        lower_paths = [p.lower() for p in tree_paths]
        found: list[str] = []
        if any(b.startswith("next.config.") for b in basenames):
            found.append("Next.js")
        elif "package.json" in basenames and any(
            "app/router" in p or p.endswith(".tsx") for p in lower_paths
        ):
            found.append("React")
        elif "package.json" in basenames:
            found.append("Node.js")
        if "manage.py" in basenames:
            found.append("Django")
        if "artisan" in basenames:
            found.append("Laravel")
        if "go.mod" in basenames:
            found.append("Go")
        if "cargo.toml" in basenames:
            found.append("Rust")
        if "pom.xml" in basenames or any(
            b == "build.gradle" or b == "build.gradle.kts" for b in basenames
        ):
            found.append("Java")
        if "gemfile" in basenames:
            found.append("Ruby")
        top_lang = (
            max(languages.items(), key=lambda kv: kv[1])[0] if languages else None
        )
        if top_lang and all(top_lang.lower() not in f.lower() for f in found):
            return f"{top_lang}" + (f" · {' / '.join(found)}" if found else "")
        return " / ".join(found) if found else (top_lang or "Undetermined")

    async def fetch_repository_details(
        self, repo_url: str
    ) -> GitHubRepositoryDetails:
        owner, repo = parse_github_url(repo_url)

        async with httpx.AsyncClient(
            headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
        ) as client:
            try:
                repo_res = await client.get(f"{self.base_url}/repos/{owner}/{repo}")
            except httpx.HTTPError as e:
                raise GitHubError(
                    "FETCH_FAILED",
                    f"Could not reach GitHub API: {e.__class__.__name__}.",
                ) from e
            if repo_res.status_code != 200:
                err = self._classify_error(repo_res, owner, repo)
                raise HTTPException(status_code=err.http_status, detail=err.message)

            repo_data = repo_res.json()
            default_branch = repo_data.get("default_branch", "main")
            license_info = repo_data.get("license") or {}
            license_name = license_info.get("name")

            async def _get_json(path: str, params: dict | None = None):
                try:
                    r = await client.get(
                        f"{self.base_url}{path}", params=params or {}
                    )
                    if r.status_code == 200:
                        return r.json()
                except httpx.HTTPError:
                    pass
                return None

            languages = await _get_json(f"/repos/{owner}/{repo}/languages") or {}
            branches_data = await _get_json(
                f"/repos/{owner}/{repo}/branches", {"per_page": 100}
            )
            branches = (
                [b["name"] for b in branches_data]
                if isinstance(branches_data, list)
                else [default_branch]
            )

            commits_data = await _get_json(
                f"/repos/{owner}/{repo}/commits", {"per_page": 10}
            )
            commits = []
            if isinstance(commits_data, list):
                for c in commits_data:
                    commits.append(
                        CommitInfo(
                            sha=(c.get("sha") or "")[:7],
                            message=(c.get("commit", {}).get("message", "").split("\n")[0]),
                            author_name=c.get("commit", {}).get("author", {}).get("name", "Unknown"),
                            date=c.get("commit", {}).get("author", {}).get("date", ""),
                        )
                    )

            contrib_data = await _get_json(
                f"/repos/{owner}/{repo}/contributors", {"per_page": 10}
            )
            contributors = []
            if isinstance(contrib_data, list):
                for contrib in contrib_data:
                    contributors.append(
                        ContributorInfo(
                            login=contrib.get("login", ""),
                            contributions=contrib.get("contributions", 0),
                            avatar_url=contrib.get("avatar_url"),
                            html_url=contrib.get("html_url"),
                        )
                    )

            readme_content = None
            readme_data = await _get_json(f"/repos/{owner}/{repo}/readme")
            if isinstance(readme_data, dict) and readme_data.get("content"):
                try:
                    readme_content = base64.b64decode(
                        readme_data["content"]
                    ).decode("utf-8")
                except Exception:
                    readme_content = None

            tree_paths = await self.get_repository_tree(owner, repo, default_branch)

            return GitHubRepositoryDetails(
                repository_name=repo,
                owner=owner,
                full_name=repo_data.get("full_name", f"{owner}/{repo}"),
                html_url=repo_data.get("html_url", repo_url),
                default_branch=default_branch,
                languages=languages,
                detected_framework=self.detect_frameworks(tree_paths, languages),
                branches=branches,
                recent_commits=commits,
                top_contributors=contributors,
                readme_content=readme_content,
                license_name=license_name,
                folder_tree=tree_paths,
            )

    async def get_raw_file_content(
        self, owner: str, repo: str, branch: str, file_path: str
    ) -> str | None:
        """Fetch raw text for a specific file on a branch."""
        try:
            async with httpx.AsyncClient(
                headers=self._headers(), timeout=REQUEST_TIMEOUT, follow_redirects=True
            ) as client:
                res = await client.get(
                    f"https://raw.githubusercontent.com/{owner}/{repo}/{branch}/{file_path}"
                )
                if res.status_code == 200:
                    return res.text
        except httpx.HTTPError:
            pass
        return None

