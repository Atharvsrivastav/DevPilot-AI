"""Code Quality Scanner engine analyzing code quality, cyclomatic complexity, dead code, & code smells strictly from AST and file metrics."""

import ast
import re
import uuid
from typing import Any

from app.domain.models.quality_scanner import (
    QualityFinding,
    QualityIssueType,
    QualityScanResult,
)


class CodeQualityScannerService:
    LARGE_FILE_THRESHOLD_LINES = 400
    LONG_FUNCTION_THRESHOLD_LINES = 50
    HIGH_COMPLEXITY_THRESHOLD = 10
    MIN_DUPLICATE_BLOCK_LINES = 4

    @classmethod
    def scan_codebase(cls, repo_url: str, files_map: dict[str, str]) -> QualityScanResult:
        """Analyze files for dead code, duplicate blocks, unused imports, complexity, and naming issues."""
        findings: list[QualityFinding] = []

        if not files_map:
            return QualityScanResult(
                repository_url=repo_url,
                quality_score=None,
                formula_used="Insufficient evidence (No source files scanned)",
                raw_metrics={"scanned_files": 0},
                total_issues=0,
                dead_code_count=0,
                duplicate_code_count=0,
                unused_imports_count=0,
                unused_variables_count=0,
                large_files_count=0,
                long_functions_count=0,
                high_complexity_count=0,
                naming_issues_count=0,
                findings=[],
            )

        file_lines_map: dict[str, list[str]] = {}

        for file_path, content in files_map.items():
            lines = content.splitlines()
            file_lines_map[file_path] = lines

            # 1. Detect Large Files
            if len(lines) > cls.LARGE_FILE_THRESHOLD_LINES:
                findings.append(
                    QualityFinding(
                        id=f"QUAL-{uuid.uuid4().hex[:8]}",
                        issue_type=QualityIssueType.LARGE_FILE,
                        title=f"Large Source File ({len(lines)} lines)",
                        description=f"File exceeds recommended limit of {cls.LARGE_FILE_THRESHOLD_LINES} lines ({len(lines)} lines found).",
                        file_path=file_path,
                        line_number=1,
                        recommendation="Decompose large file into focused, single-responsibility modules.",
                    )
                )

            # 2. Python AST Analysis
            if file_path.endswith(".py"):
                cls._analyze_python_ast(file_path, content, findings)

            # 3. JS/TS Heuristic Analysis
            elif file_path.endswith((".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs")):
                cls._analyze_js_ts_heuristics(file_path, lines, content, findings)

        # 4. Detect Multi-Line Duplicate Code Blocks Across Files (min 4 consecutive lines)
        cls._detect_duplicate_blocks(file_lines_map, findings)

        # 5. Extract Raw Counts
        dead_code_count = sum(1 for f in findings if f.issue_type == QualityIssueType.DEAD_CODE)
        duplicate_code_count = sum(1 for f in findings if f.issue_type == QualityIssueType.DUPLICATE_CODE)
        unused_imports_count = sum(1 for f in findings if f.issue_type == QualityIssueType.UNUSED_IMPORT)
        unused_variables_count = sum(1 for f in findings if f.issue_type == QualityIssueType.UNUSED_VARIABLE)
        large_files_count = sum(1 for f in findings if f.issue_type == QualityIssueType.LARGE_FILE)
        long_functions_count = sum(1 for f in findings if f.issue_type == QualityIssueType.LONG_FUNCTION)
        high_complexity_count = sum(1 for f in findings if f.issue_type == QualityIssueType.HIGH_CYCLOMATIC_COMPLEXITY)
        naming_issues_count = sum(1 for f in findings if f.issue_type == QualityIssueType.NAMING_ISSUE)

        # Normalized Deductions with Category Caps to prevent 0/100 collapses
        deduction = (
            min(20.0, high_complexity_count * 4.0)
            + min(16.0, dead_code_count * 4.0)
            + min(12.0, unused_imports_count * 1.5)
            + min(15.0, large_files_count * 3.0)
            + min(15.0, duplicate_code_count * 3.0)
        )
        quality_score = max(0.0, round(100.0 - deduction, 1))

        raw_metrics = {
            "scanned_files": len(files_map),
            "total_issues": len(findings),
            "high_complexity_count": high_complexity_count,
            "dead_code_count": dead_code_count,
            "unused_imports_count": unused_imports_count,
            "large_files_count": large_files_count,
            "duplicate_code_count": duplicate_code_count,
            "long_functions_count": long_functions_count,
        }

        formula_used = "100 - min(20, HighComplexity*4) - min(16, DeadCode*4) - min(12, UnusedImports*1.5) - min(15, LargeFiles*3) - min(15, DuplicateBlocks*3)"

        return QualityScanResult(
            repository_url=repo_url,
            quality_score=quality_score,
            formula_used=formula_used,
            raw_metrics=raw_metrics,
            total_issues=len(findings),
            dead_code_count=dead_code_count,
            duplicate_code_count=duplicate_code_count,
            unused_imports_count=unused_imports_count,
            unused_variables_count=unused_variables_count,
            large_files_count=large_files_count,
            long_functions_count=long_functions_count,
            high_complexity_count=high_complexity_count,
            naming_issues_count=naming_issues_count,
            findings=findings,
        )

    @classmethod
    def _detect_duplicate_blocks(
        cls, file_lines_map: dict[str, list[str]], findings: list[QualityFinding]
    ) -> None:
        """Detect contiguous identical blocks of >= 4 non-trivial lines across distinct files."""
        block_hashes: dict[str, tuple[str, int, str]] = {}
        found_duplicates = 0
        max_duplicates_to_report = 10

        def is_significant_line(l_text: str) -> bool:
            c = l_text.strip()
            if len(c) < 16:
                return False
            if c.startswith(("//", "#", "/*", "*", "import ", "from ", "export type", "export interface")):
                return False
            if c in ("{", "}", ");", "});", "};", "],", "];", "]", ")", "pass", "return"):
                return False
            return True

        for file_path, lines in file_lines_map.items():
            if len(lines) < cls.MIN_DUPLICATE_BLOCK_LINES:
                continue

            for idx in range(len(lines) - cls.MIN_DUPLICATE_BLOCK_LINES + 1):
                window = [lines[idx + i] for i in range(cls.MIN_DUPLICATE_BLOCK_LINES)]
                if all(is_significant_line(w) for w in window):
                    normalized_block = "\n".join(w.strip() for w in window)
                    if normalized_block in block_hashes:
                        orig_file, orig_line, orig_snippet = block_hashes[normalized_block]
                        if orig_file != file_path:
                            findings.append(
                                QualityFinding(
                                    id=f"QUAL-{uuid.uuid4().hex[:8]}",
                                    issue_type=QualityIssueType.DUPLICATE_CODE,
                                    title="Duplicate Code Block (4+ lines)",
                                    description=f"Identical code sequence detected in {orig_file} (line {orig_line}).",
                                    file_path=file_path,
                                    line_number=idx + 1,
                                    snippet=window[0].strip()[:90],
                                    recommendation=f"Extract duplicate logic shared with {orig_file} into a shared module.",
                                )
                            )
                            found_duplicates += 1
                            if found_duplicates >= max_duplicates_to_report:
                                return
                    else:
                        block_hashes[normalized_block] = (file_path, idx + 1, window[0].strip()[:90])

    @classmethod
    def _analyze_python_ast(
        cls, file_path: str, content: str, findings: list[QualityFinding]
    ) -> None:
        try:
            tree = ast.parse(content)
        except Exception:
            return

        imported_symbols: dict[str, int] = {}
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_symbols[name] = getattr(alias, "lineno", node.lineno)
            elif isinstance(node, ast.ImportFrom):
                for alias in node.names:
                    name = alias.asname or alias.name
                    imported_symbols[name] = getattr(alias, "lineno", node.lineno)

        referenced_names: set[str] = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Name):
                referenced_names.add(node.id)
            elif isinstance(node, ast.Attribute) and isinstance(node.value, ast.Name):
                referenced_names.add(node.value.id)

        for sym, lineno in imported_symbols.items():
            if sym not in referenced_names and not sym.startswith("_") and sym != "*":
                findings.append(
                    QualityFinding(
                        id=f"QUAL-{uuid.uuid4().hex[:8]}",
                        issue_type=QualityIssueType.UNUSED_IMPORT,
                        title=f"Unused Python Import '{sym}'",
                        description=f"Symbol '{sym}' is imported at line {lineno} but never referenced.",
                        file_path=file_path,
                        line_number=lineno,
                        recommendation=f"Remove unused import '{sym}' to maintain clean module scope.",
                    )
                )

        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                fn_name = node.name
                func_lines = (node.end_lineno - node.lineno) if node.end_lineno else 0
                if func_lines > cls.LONG_FUNCTION_THRESHOLD_LINES:
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.LONG_FUNCTION,
                            title=f"Long Function '{fn_name}' ({func_lines} lines)",
                            description=f"Function '{fn_name}' spans {func_lines} lines, exceeding the {cls.LONG_FUNCTION_THRESHOLD_LINES} line threshold.",
                            file_path=file_path,
                            line_number=node.lineno,
                            recommendation="Refactor function into smaller, single-responsibility subroutines.",
                        )
                    )

                if not re.match(r"^[a-z_][a-z0-9_]*$", fn_name) and not fn_name.startswith("__"):
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.NAMING_ISSUE,
                            title=f"Non-PEP8 Function Name '{fn_name}'",
                            description="Python function names should adhere to snake_case naming style.",
                            file_path=file_path,
                            line_number=node.lineno,
                            recommendation="Rename to snake_case following standard PEP 8 guidelines.",
                        )
                    )

                complexity = 1
                for sub_node in ast.walk(node):
                    if isinstance(sub_node, (ast.If, ast.For, ast.While, ast.ExceptHandler, ast.With, ast.Assert)):
                        complexity += 1
                    elif isinstance(sub_node, ast.BoolOp):
                        complexity += len(sub_node.values) - 1
                if complexity > cls.HIGH_COMPLEXITY_THRESHOLD:
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.HIGH_CYCLOMATIC_COMPLEXITY,
                            title=f"High Cyclomatic Complexity ({complexity}) in '{fn_name}'",
                            description=f"Function '{fn_name}' has complexity score of {complexity} (threshold: {cls.HIGH_COMPLEXITY_THRESHOLD}).",
                            file_path=file_path,
                            line_number=node.lineno,
                            recommendation="Simplify conditional branches, eliminate nested loops, or extract sub-functions.",
                        )
                    )

    @classmethod
    def _analyze_js_ts_heuristics(
        cls, file_path: str, lines: list[str], content: str, findings: list[QualityFinding]
    ) -> None:
        """Parse JS/TS imports symbol by symbol to avoid false positives on comma-separated imports."""
        import_stmt_pattern = re.compile(
            r"import\s+(?:type\s+)?(?:([A-Za-z0-9_]+)|(?:\{([^}]+)\}))\s+from\s+['\"]"
        )
        for idx, line in enumerate(lines, start=1):
            line_str = line.strip()
            if not line_str.startswith("import"):
                continue

            match = import_stmt_pattern.search(line_str)
            if not match:
                continue

            default_sym = match.group(1)
            named_syms_raw = match.group(2)
            symbols_to_check: list[str] = []

            if default_sym:
                symbols_to_check.append(default_sym.strip())
            if named_syms_raw:
                for item in named_syms_raw.split(","):
                    clean_item = item.strip()
                    if clean_item:
                        real_name = clean_item.split(" as ")[-1].strip()
                        if real_name:
                            symbols_to_check.append(real_name)

            for sym in symbols_to_check:
                occurrences = len(re.findall(rf"\b{re.escape(sym)}\b", content))
                if occurrences == 1:
                    findings.append(
                        QualityFinding(
                            id=f"QUAL-{uuid.uuid4().hex[:8]}",
                            issue_type=QualityIssueType.UNUSED_IMPORT,
                            title=f"Unused JS/TS Import '{sym}'",
                            description=f"Imported identifier '{sym}' is never referenced elsewhere in the file.",
                            file_path=file_path,
                            line_number=idx,
                            snippet=line_str[:80],
                            recommendation=f"Remove unused import '{sym}'.",
                        )
                    )
