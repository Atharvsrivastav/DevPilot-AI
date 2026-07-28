"""Health Score Engine calculating overall and pillar-specific repository scores."""

from app.domain.models.health_score import (
    IndividualPillarScores,
    RepositoryHealthScoreReport,
)


class HealthScoreCalculatorService:
    # Pillar weights adding up to 1.0 (100%)
    WEIGHTS = {
        "security": 0.25,
        "code_quality": 0.20,
        "architecture": 0.15,
        "performance": 0.15,
        "dependencies": 0.10,
        "testing": 0.10,
        "documentation": 0.05,
    }

    @classmethod
    def calculate_health_score(
        cls,
        repo_url: str,
        security_score: float = 85.0,
        code_quality_score: float = 80.0,
        architecture_score: float = 88.0,
        performance_score: float = 75.0,
        documentation_score: float = 70.0,
        dependencies_score: float = 90.0,
        testing_score: float = 65.0,
    ) -> RepositoryHealthScoreReport:
        """Calculates weighted overall health score, grade, and actionable improvement suggestions."""
        
        # Ensure values are bounded between 0 and 100
        sec = max(0.0, min(100.0, security_score))
        qual = max(0.0, min(100.0, code_quality_score))
        arch = max(0.0, min(100.0, architecture_score))
        perf = max(0.0, min(100.0, performance_score))
        doc = max(0.0, min(100.0, documentation_score))
        dep = max(0.0, min(100.0, dependencies_score))
        test = max(0.0, min(100.0, testing_score))

        # Weighted calculation
        overall = round(
            (sec * cls.WEIGHTS["security"])
            + (qual * cls.WEIGHTS["code_quality"])
            + (arch * cls.WEIGHTS["architecture"])
            + (perf * cls.WEIGHTS["performance"])
            + (dep * cls.WEIGHTS["dependencies"])
            + (test * cls.WEIGHTS["testing"])
            + (doc * cls.WEIGHTS["documentation"]),
            1,
        )

        # Grade Mapping
        if overall >= 93.0:
            grade = "A+"
        elif overall >= 85.0:
            grade = "A"
        elif overall >= 75.0:
            grade = "B"
        elif overall >= 65.0:
            grade = "C"
        elif overall >= 50.0:
            grade = "D"
        else:
            grade = "F"

        # Actionable Suggestions Generator
        suggestions: list[str] = []
        if sec < 80.0:
            suggestions.append("Security: Resolve critical vulnerabilities and remove hardcoded secrets.")
        if qual < 80.0:
            suggestions.append("Code Quality: Reduce function cyclomatic complexity and remove dead code.")
        if test < 75.0:
            suggestions.append("Testing: Increase unit and integration test suite coverage above 80%.")
        if doc < 75.0:
            suggestions.append("Documentation: Expand README installation guide and API docstrings.")
        if perf < 80.0:
            suggestions.append("Performance: Optimize database queries and eliminate synchronous blocking IO.")

        if not suggestions:
            suggestions.append("Repository health is optimal. Maintain continuous integration checks.")

        return RepositoryHealthScoreReport(
            repository_url=repo_url,
            overall_health_score=overall,
            health_grade=grade,
            individual_scores=IndividualPillarScores(
                security_score=sec,
                code_quality_score=qual,
                architecture_score=arch,
                performance_score=perf,
                documentation_score=doc,
                dependencies_score=dep,
                testing_score=test,
            ),
            actionable_suggestions=suggestions,
        )
