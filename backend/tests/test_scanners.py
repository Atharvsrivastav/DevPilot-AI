"""Tests for security, code quality, architecture, documentation and health score services."""

from app.infrastructure.architecture.analyzer import ArchitectureAnalyzerService
from app.infrastructure.documentation.scanner import DocumentationScannerService
from app.infrastructure.health.calculator import HealthScoreCalculatorService
from app.infrastructure.quality.scanner import CodeQualityScannerService
from app.infrastructure.security.scanner import SecurityScannerService


def test_security_scanner_detects_secrets():
    files_map = {
        "config.py": "AWS_SECRET_KEY = 'AKIA1234567890123456'\nDB_PASSWORD = 'password123'\n",
        "safe.py": "x = 10\ny = 20\n",
    }
    result = SecurityScannerService.scan_files("https://github.com/test/repo", files_map)
    assert len(result.findings) >= 1
    assert result.security_score is not None
    assert result.security_score < 100.0


def test_quality_scanner_detects_issues():
    files_map = {
        "complex.py": "def foo():\n" + "    if True:\n" * 15 + "        pass\n",
        "clean.py": "def add(a: int, b: int) -> int:\n    return a + b\n",
    }
    result = CodeQualityScannerService.scan_codebase("https://github.com/test/repo", files_map)
    assert result.quality_score is not None


def test_architecture_analyzer():
    tree_paths = [
        "src/controllers/user_controller.ts",
        "src/models/user_model.ts",
        "src/views/user_view.ts",
    ]
    report = ArchitectureAnalyzerService.analyze_architecture(
        "https://github.com/test/repo", tree_paths
    )
    assert report.detected_pattern is not None
    assert report.architecture_score > 0
    assert report.mermaid_diagram is not None


def test_documentation_scanner():
    files_map = {
        "README.md": "# Project Title\n" + "Detailed description of the project. " * 30,
        "LICENSE": "MIT License",
    }
    score, metrics, formula = DocumentationScannerService.scan_documentation(files_map)
    assert score is not None
    assert score >= 50.0
    assert metrics["has_readme"] is True
    assert metrics["has_license"] is True


def test_health_score_calculator():
    report = HealthScoreCalculatorService.calculate_health_score(
        repo_url="https://github.com/test/repo",
        security_score=85.0,
        code_quality_score=90.0,
        architecture_score=80.0,
        documentation_score=75.0,
        dependencies_score=70.0,
        testing_score=80.0,
        activity_score=60.0,
        performance_signals_score=75.0,
    )
    assert report.overall_health_score > 0
    assert report.health_grade in ["A", "B", "C", "D", "F"]
    assert report.confidence_rating in ["High", "Medium", "Low"]
