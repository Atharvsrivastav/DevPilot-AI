"""Use case for triggering repository intelligence analysis."""

from app.domain.interfaces.analysis_repository import IAnalysisRepository
from app.domain.models.analysis import AnalysisReport, Repository


class AnalyzeRepositoryUseCase:
    def __init__(self, repo_repository: IAnalysisRepository):
        self._repo_repository = repo_repository

    async def execute(self, repo_url: str, owner: str, name: str) -> AnalysisReport:
        repository = Repository(
            id=f"{owner}/{name}",
            url=repo_url,
            owner=owner,
            name=name
        )
        return await self._repo_repository.create_analysis(repository)
