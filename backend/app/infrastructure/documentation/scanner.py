"""Documentation Scanner engine calculating documentation coverage strictly from repository files."""

from typing import Any, Optional


class DocumentationScannerService:
    @classmethod
    def scan_documentation(cls, files_map: dict[str, str]) -> tuple[Optional[float], dict[str, Any], str]:
        """Calculates documentation score and returns (score, raw_metrics, formula_used)."""
        if not files_map:
            return None, {"scanned_files": 0}, "Not Analyzed (No source files scanned)"

        has_readme = any("readme" in f.lower() for f in files_map)
        readme_content = ""
        for f, content in files_map.items():
            if "readme" in f.lower():
                readme_content = content
                break

        readme_len = len(readme_content)
        has_license = any("license" in f.lower() for f in files_map)
        has_contributing = any("contributing" in f.lower() for f in files_map)

        docstring_count = sum(content.count('"""') + content.count("/**") for content in files_map.values())
        has_api_docs = docstring_count >= 5

        score = 0.0
        if has_readme:
            score += 30.0
            if readme_len > 500:
                score += 20.0
            elif readme_len > 100:
                score += 10.0
        if has_license:
            score += 20.0
        if has_contributing:
            score += 15.0
        if has_api_docs:
            score += 15.0

        documentation_score = min(100.0, score)

        raw_metrics = {
            "has_readme": has_readme,
            "readme_characters": readme_len,
            "has_license": has_license,
            "has_contributing": has_contributing,
            "has_api_docs": has_api_docs,
            "docstrings_found": docstring_count,
        }

        formula_used = "+30 README +20 README Length (>500) +20 LICENSE +15 CONTRIBUTING +15 API Docs"

        return documentation_score, raw_metrics, formula_used
