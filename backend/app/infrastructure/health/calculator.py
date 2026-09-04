"""Health Score Engine calculating overall and pillar-specific repository scores strictly from real analyzer evidence."""

from typing import Any, Optional
from app.domain.models.health_score import (
    IndividualPillarScores,
    RepositoryHealthScoreReport,
)


class HealthScoreCalculatorService:
    # Visible, explainable 7-pillar weights strictly summing to 1.00 (100%)
    BASE_WEIGHTS = {
        "security": 0.20,
        "code_quality": 0.20,
        "architecture": 0.15,
        "testing": 0.15,
        "dependencies": 0.10,
        "documentation": 0.10,
        "activity": 0.10,
    }

    @classmethod
    def calculate_health_score(
        cls,
        repo_url: str,
        security_score: Optional[float] = None,
        code_quality_score: Optional[float] = None,
        architecture_score: Optional[float] = None,
        documentation_score: Optional[float] = None,
        dependencies_score: Optional[float] = None,
        testing_score: Optional[float] = None,
        activity_score: Optional[float] = None,
        performance_signals_score: Optional[float] = None,
        raw_metrics: Optional[dict[str, Any]] = None,
        formulas_used: Optional[dict[str, str]] = None,
    ) -> RepositoryHealthScoreReport:
        """Calculates weighted overall health score, confidence rating, grade, and actionable suggestions strictly from real analyzer data."""
        
        scores_map = {
            "security": security_score,
            "code_quality": code_quality_score,
            "architecture": architecture_score,
            "testing": testing_score,
            "dependencies": dependencies_score,
            "documentation": documentation_score,
            "activity": activity_score,
        }

        # Filter active analyzed pillars (non-None scores)
        active_pillars = {k: v for k, v in scores_map.items() if v is not None}
        skipped_modules = [k for k, v in scores_map.items() if v is None]

        raw = raw_metrics or {}
        scanned_files_count = raw.get("scanned_files", 0)
        tree_paths_count = raw.get("tree_paths_count", 0)

        # Confidence Rating Calculation
        if scanned_files_count == 0 and len(active_pillars) <= 1:
            confidence = "Insufficient evidence"
            confidence_reason = "No source files were scanned or parseable. Overall health cannot be determined reliably."
        elif scanned_files_count >= 15 and tree_paths_count >= 20 and activity_score is not None:
            confidence = "High"
            confidence_reason = f"Verified across {scanned_files_count} scanned source files, full repository tree ({tree_paths_count} items), and Git activity."
        elif scanned_files_count >= 5 or (tree_paths_count >= 10 and len(active_pillars) >= 5):
            confidence = "Medium"
            confidence_reason = f"Measured from sample of {scanned_files_count} key files and {len(active_pillars)} active analyzer pillars."
        else:
            confidence = "Low"
            confidence_reason = f"Measured from partial data ({scanned_files_count} files scanned); some pillars could not be verified."

        if not active_pillars:
            return RepositoryHealthScoreReport(
                repository_url=repo_url,
                overall_health_score=None,
                health_grade="Not Analyzed",
                confidence_rating="Insufficient evidence",
                confidence_reason="No analyzer outputs provided. Run scanners to generate score.",
                weights_used={},
                individual_scores=IndividualPillarScores(
                    performance_signals_score=performance_signals_score,
                    performance_score=performance_signals_score,
                ),
                raw_metrics=raw,
                formulas_used=formulas_used or {},
                actionable_suggestions=["No analyzer outputs provided. Run scanners to generate score."],
                skipped_modules=skipped_modules,
            )

        # Scale weights of active analyzed pillars to sum to 1.0
        total_active_weight = sum(cls.BASE_WEIGHTS[k] for k in active_pillars)
        weights_applied = {
            k: round(cls.BASE_WEIGHTS[k] / total_active_weight, 3)
            for k in active_pillars
        }
        weighted_sum = sum(active_pillars[k] * weights_applied[k] for k in active_pillars)
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
            suggestions.append("Code Quality: Reduce function cyclomatic complexity and remove duplicate blocks.")
        if testing_score is not None and testing_score < 75.0:
            suggestions.append("Testing: Add automated test suites and verify CI execution in GitHub workflows.")
        if documentation_score is not None and documentation_score < 75.0:
            suggestions.append("Documentation: Expand README installation guide and API docstrings.")
        if dependencies_score is not None and dependencies_score < 75.0:
            suggestions.append("Dependencies: Commit a reproducible lockfile (e.g. package-lock.json, poetry.lock, Cargo.lock).")
        if activity_score is not None and activity_score < 60.0:
            suggestions.append("Activity: Project exhibits low recent commit cadence or inactive maintainer response.")

        if not suggestions:
            suggestions.append("Repository health is optimal based on executed scanners.")

        # Document overall health formula
        active_formula_parts = [
            f"{k} ({int(round(cls.BASE_WEIGHTS[k] * 100))}%)" for k in active_pillars
        ]
        merged_formulas = formulas_used or {}
        merged_formulas["overall_health_score"] = f"Weighted Sum: {' + '.join(active_formula_parts)}"

        return RepositoryHealthScoreReport(
            repository_url=repo_url,
            overall_health_score=overall,
            health_grade=grade,
            confidence_rating=confidence,
            confidence_reason=confidence_reason,
            weights_used=weights_applied,
            individual_scores=IndividualPillarScores(
                security_score=security_score,
                code_quality_score=code_quality_score,
                architecture_score=architecture_score,
                performance_score=performance_signals_score,
                performance_signals_score=performance_signals_score,
                documentation_score=documentation_score,
                dependencies_score=dependencies_score,
                testing_score=testing_score,
                activity_score=activity_score,
            ),
            raw_metrics=raw,
            formulas_used=merged_formulas,
            actionable_suggestions=suggestions,
            skipped_modules=skipped_modules,
        )
