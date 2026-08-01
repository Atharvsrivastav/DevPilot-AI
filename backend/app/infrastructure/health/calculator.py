"""Health Score Engine calculating overall and pillar-specific repository scores strictly from real analyzer evidence."""

from typing import Any, Optional
from app.domain.models.health_score import (
    IndividualPillarScores,
    RepositoryHealthScoreReport,
)


class HealthScoreCalculatorService:
    # Exact required weights for health score pillars
    BASE_WEIGHTS = {
        "security": 0.30,
        "code_quality": 0.20,
        "architecture": 0.15,
        "performance": 0.10,
        "dependencies": 0.10,
        "documentation": 0.10,
        "testing": 0.05,
    }

    @classmethod
    def calculate_health_score(
        cls,
        repo_url: str,
        security_score: Optional[float] = None,
        code_quality_score: Optional[float] = None,
        architecture_score: Optional[float] = None,
        performance_score: Optional[float] = None,
        documentation_score: Optional[float] = None,
        dependencies_score: Optional[float] = None,
        testing_score: Optional[float] = None,
        raw_metrics: Optional[dict[str, Any]] = None,
        formulas_used: Optional[dict[str, str]] = None,
    ) -> RepositoryHealthScoreReport:
        """Calculates weighted overall health score, grade, and actionable suggestions strictly from real analyzer data."""
        
        scores_map = {
            "security": security_score,
            "code_quality": code_quality_score,
            "architecture": architecture_score,
            "performance": performance_score,
            "documentation": documentation_score,
            "dependencies": dependencies_score,
            "testing": testing_score,
        }

        # Filter active analyzed pillars (non-None scores)
        active_pillars = {k: v for k, v in scores_map.items() if v is not None}
        skipped_modules = [k for k, v in scores_map.items() if v is None]

        if not active_pillars:
            return RepositoryHealthScoreReport(
                repository_url=repo_url,
                overall_health_score=None,
                health_grade="Not Analyzed",
                individual_scores=IndividualPillarScores(),
                raw_metrics=raw_metrics or {},
                formulas_used=formulas_used or {},
                actionable_suggestions=["No analyzer outputs provided. Run scanners to generate score."],
                skipped_modules=skipped_modules,
            )

        # Scale weights of active analyzed pillars to sum to 1.0
        total_active_weight = sum(cls.BASE_WEIGHTS[k] for k in active_pillars)
        weighted_sum = sum(active_pillars[k] * (cls.BASE_WEIGHTS[k] / total_active_weight) for k in active_pillars)
        overall = round(weighted_sum, 1)

        # Grade Mapping based on real calculated score
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

        # Actionable Suggestions based on real findings
        suggestions: list[str] = []
        if security_score is not None and security_score < 80.0:
            suggestions.append("Security: Resolve critical vulnerabilities and remove hardcoded secrets.")
        if code_quality_score is not None and code_quality_score < 80.0:
            suggestions.append("Code Quality: Reduce function cyclomatic complexity and remove dead code.")
        if testing_score is not None and testing_score < 75.0:
            suggestions.append("Testing: Increase unit and integration test suite coverage above 80%.")
        if documentation_score is not None and documentation_score < 75.0:
            suggestions.append("Documentation: Expand README installation guide and API docstrings.")
        if performance_score is not None and performance_score < 80.0:
            suggestions.append("Performance: Eliminate large source file bottlenecks and blocking operations.")

        if not suggestions:
            suggestions.append("Repository health is optimal based on executed scanners.")

        # Document overall health formula
        active_formula_parts = [f"({k}: {round(cls.BASE_WEIGHTS[k]/total_active_weight, 2)})" for k in active_pillars]
        merged_formulas = formulas_used or {}
        merged_formulas["overall_health_score"] = f"Weighted Sum of Analyzed Pillars: {' + '.join(active_formula_parts)}"

        return RepositoryHealthScoreReport(
            repository_url=repo_url,
            overall_health_score=overall,
            health_grade=grade,
            individual_scores=IndividualPillarScores(
                security_score=security_score,
                code_quality_score=code_quality_score,
                architecture_score=architecture_score,
                performance_score=performance_score,
                documentation_score=documentation_score,
                dependencies_score=dependencies_score,
                testing_score=testing_score,
            ),
            raw_metrics=raw_metrics or {},
            formulas_used=merged_formulas,
            actionable_suggestions=suggestions,
            skipped_modules=skipped_modules,
        )
