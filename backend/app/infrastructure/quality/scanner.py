"""Code Quality Scanner engine analyzing code quality, cyclomatic complexity, dead code, & code smells."""

import ast
import re
import uuid
from app.domain.models.quality_scanner import (
    QualityFinding,
    QualityIssueType,
    QualityScanResult,
)


class CodeQualityScannerService:
    LARGE_FILE_THRESHOLD_LINES = 400
    LONG_FUNCTION_THRESHOLD_LINES = 50
    HIGH_COMPLEXITY_THRESHOLD = 10

    @classmethod
    def scan_codebase(cls, repo_url: str, files_map: dict[str, str]) -> QualityScanResult:
        """Analyze files for dead code, duplicates, unused imports/vars, complexity, and naming issues."""
        findings: list[QualityFinding] = []
        seen_lines_hash: dict[str, str] = {}

        for file_path, content in files_map.items():
            lines = content.splitlines()

            # 1. Detect Large Files
            if len(lines) > cls.LARGE_FILE_THRESHOLD_LINES:
                findings.append(
                    QualityFinding(
                        id=f"QUAL-{uuid.uuid4().hex[:8]}",
                        issue_type=QualityIssueType.LARGE_FILE,
                        title="Large Source File Detected",
                        description=f"File has {len(lines)} lines, exceeding threshold of {cls.LARGE_FILE_THRESHOLD_LINES} lines.",
                        file_path=file_path,
                        line_number=1,
                        recommendation="Break down large source files into smaller modular components.",
                    )
                )

            # 2. Detect Duplicate Code Blocks Across Files
            for line_idx, line in enumerate(lines, start=1):
                clean_line = line.strip()
                if len(clean_line) > 30 and not clean_line.startswith(("//", "#", "/*", "*")):
                    if clean_line in seen_lines_hash and seen_lines_hash[clean_line] != file_path:
                        findings.append(
                            QualityFinding(
                                id=f"QUAL-{uuid.uuid4().hex[:8]}",
                                issue_type=QualityIssueType.DUPLICATE_CODE,
                                title="Duplicate Code Line",
                                description=f"Line duplicates content found in {seen_lines_hash[clean_line]}.",
                                file_path=file_path,
                                line_number=line_idx,
                                snippet=clean_line[:80],
                                recommendation="Extract shared logic into a reusable utility function.",
                            )
                        )
                    else:
                        seen_lines_hash[clean_line] = file_path

            # 3. Python AST Analysis (Unused imports, unused vars, long functions, complexity, naming)
            if file_path.endswith(".py"):
                cls._analyze_python_ast(file_path, content, findings)
            
            # 4. JS/TS Heuristic Analysis
            elif file_path.endswith((".js", ".jsx", ".ts", ".tsx")):
                cls._analyze_js_ts_heuristics(file_path, lines, content, findings)

        # 5. Calculate Score (0 to 100)
        total_issues = len(findings)
        quality_score = max(0.0, round(100.0 - (total_issues * 3.5), 1))

        return QualityScanResult(
            repository_url=repo_url,
            quality_score=quality_score,
            total_issues=total_issues,
            dead_code_count=sum(1 for f in findings if f.issue_type == QualityIssueType.DEAD_CODE),
            duplicate_code_count=sum(1 for f in findings if f.issue_type == QualityIssueType.DUPLICATE_CODE),
            unused_imports_count=sum(1 for f in findings if f.issue_type == QualityIssueType.UNUSED_IMPORT),
            unused_variables_count=sum(1 for f in findings if f.issue_type == QualityIssueType.UNUSED_VARIABLE),
            large_files_count=sum(1 for f in findings if f.issue_type == QualityIssueType.LARGE_FILE),
            long_functions_count=sum(1 for f in findings if f.issue_type == QualityIssueType.LONG_FUNCTION),
            high_complexity_count=sum(1 for f in findings if f.issue_type == QualityIssueType.HIGH_CYCLOMATIC_COMPLEXITY),
            naming_issues_count=sum(1 for f in findings if f.issue_type == QualityIssueType.NAMING_ISSUE),
            findings=findings,
        )

    @classmethod
    def _analyze_python_ast(cls, file_path: str, content: str, findings: list[QualityFinding]):
        try:
            tree = ast.parse(content)
        except Exception:
            return

        imports: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.asname or alias.name)
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    imports.add(alias.asname or alias.name)

            # Check Unused Imports
            for imp in imports:
                if imp not in content[content.find(imp) + len(imp):]:
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.UNUSED_IMPORT,
                            title=f"Unused Import '{imp}'",
                            description=f"Import '{imp}' is defined but never referenced.",
                            file_path=file_path,
                            recommendation="Remove unused import statements to reduce memory overhead.",
                        )
                    )
            imports.clear()

            # Long Functions & Cyclomatic Complexity
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_name = node.name
                func_lines = node.end_lineno - node.lineno if node.end_lineno else 0
                if func_lines > cls.LONG_FUNCTION_THRESHOLD_LINES:
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.LONG_FUNCTION,
                            title=f"Long Function '{fn_name}'",
                            description=f"Function '{fn_name}' spans {func_lines} lines.",
                            file_path=file_path,
                            line_number=node.lineno,
                            recommendation="Refactor function into smaller single-responsibility sub-functions.",
                        )
                    )

                # Naming Convention check (snake_case for functions)
                if not re.match(r"^[a-z_][a-z0-9_]*$", fn_name) and not fn_name.startswith("__"):
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.NAMING_ISSUE,
                            title=f"Non-Standard Function Name '{fn_name}'",
                            description="Python function names should follow snake_case naming conventions.",
                            file_path=file_path,
                            line_number=node.lineno,
                            recommendation="Rename function to follow standard PEP8 snake_case style.",
                        )
                    )

                # Cyclomatic Complexity estimation
                complexity = 1
                for sub_node in ast.walk(node):
                    if isinstance(sub_node, (ast.If, ast.For, ast.While, ast.ExceptHandler, ast.With)):
                        complexity += 1
                if complexity > cls.HIGH_COMPLEXITY_THRESHOLD:
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.HIGH_CYCLOMATIC_COMPLEXITY,
                            title=f"High Cyclomatic Complexity in '{fn_name}'",
                            description=f"Cyclomatic complexity of function is {complexity} (threshold: {cls.HIGH_COMPLEXITY_THRESHOLD}).",
                            file_path=file_path,
                            line_number=node.lineno,
                            recommendation="Simplify decision branches or extract nested conditionals.",
                        )
                    )

    @classmethod
    def _analyze_js_ts_heuristics(cls, file_path: str, lines: list[str], content: str, findings: list[QualityFinding]):
        # Unused variable / import regex heuristics
        for idx, line in enumerate(lines, start=1):
            if "import " in line and "from" in line:
                match = re.search(r"import\s+\{?([A-Za-z0-9_,\s]+)\}?\s+from", line)
                if match:
                    imported_item = match.group(1).strip()
                    if imported_item and content.count(imported_item) == 1:
                        findings.append(
                            QualityFinding(
                                id=f"QUAL-{uuid.uuid4().hex[:8]}",
                                issue_type=QualityIssueType.UNUSED_IMPORT,
                                title=f"Potentially Unused JS/TS Import '{imported_item}'",
                                description=f"Import '{imported_item}' appears only once in file.",
                                file_path=file_path,
                                line_number=idx,
                                snippet=line.strip(),
                                recommendation="Remove unused import statement.",
                            )
                        )
