"""Abstract repository interface for repository analysis data persistence."""

from abc import ABC, abstractmethod
from typing import Sequence
from app.domain.models.analysis import AnalysisReport, Repository


class IAnalysisRepository(ABC):
    @abstractmethod
    async def create_analysis(self, repository: Repository) -> AnalysisReport:
        """Create a new repository analysis task."""
        pass

    @abstractmethod
    async def get_analysis_by_id(self, analysis_id: str) -> AnalysisReport | None:
        """Retrieve an analysis report by ID."""
        pass

    @abstractmethod
    async def list_analyses(self, limit: int = 50, offset: int = 0) -> Sequence[AnalysisReport]:
        """List repository analyses."""
        pass
