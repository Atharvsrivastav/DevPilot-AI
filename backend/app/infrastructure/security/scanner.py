"""Security Scanner engine detecting hardcoded secrets, code vulnerabilities (SQLi, XSS, CSRF, eval), and dependency flaws."""

import re
import uuid
from typing import Any

from app.domain.models.security_scanner import (
    SecurityFinding,
    SecurityScanResult,
    SeverityLevel,
)


class SecurityScannerService:
    # Regex rule patterns for secrets & vulnerabilities
    RULES: list[dict[str, Any]] = [
        # Secrets & Keys
        {
            "id": "SEC-001",
            "type": "Hardcoded API Key",
            "pattern": r"(?i)(api[_-]?key|secret[_-]?key|access[_-]?token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{16,}['\"]",
            "severity": SeverityLevel.CRITICAL,
            "risk_score": 9.5,
            "title": "Exposed API Key",
            "description": "Hardcoded API key detected in source code.",
            "recommendation": "Move secret key to environment variables (.env) or a secret manager."
        },
        {
            "id": "SEC-002",
            "type": "Hardcoded Password",
            "pattern": r"(?i)(password|passwd|pwd)\s*[:=]\s*['\"][^'\"]{6,}['\"]",
            "severity": SeverityLevel.HIGH,
            "risk_score": 8.5,
            "title": "Hardcoded Password Credentials",
            "description": "Plaintext password string embedded directly in code.",
            "recommendation": "Use hashed secrets and inject credentials securely via environment variables."
        },
        {
            "id": "SEC-003",
            "type": "Hardcoded JWT Secret",
            "pattern": r"(?i)(jwt[_-]?secret|jwt[_-]?key|token[_-]?secret)\s*[:=]\s*['\"][^'\"]+['\"]",
            "severity": SeverityLevel.CRITICAL,
            "risk_score": 9.0,
            "title": "Exposed JWT Signing Secret",
            "description": "Exposed JWT secret key could allow unauthorized token forgery.",
            "recommendation": "Store JWT secrets in secure environment variables and rotate compromised keys."
        },

        # Code Vulnerabilities
        {
            "id": "SEC-004",
            "type": "SQL Injection",
            "pattern": r"(?i)(SELECT|INSERT|UPDATE|DELETE)\s+.*?\+.*?\$?\w+|f['\"].*(SELECT|INSERT|UPDATE|DELETE).*\{",
            "severity": SeverityLevel.CRITICAL,
            "risk_score": 9.8,
            "title": "SQL Injection Vulnerability",
            "description": "Raw string concatenation detected in SQL query execution.",
            "recommendation": "Use parameterized queries or ORM query builders (e.g. SQLAlchemy, Prisma)."
        },
        {
            "id": "SEC-005",
            "type": "Cross-Site Scripting (XSS)",
            "pattern": r"(dangerouslySetInnerHTML|innerHTML\s*=|\$\.html\(|document\.write\()",
            "severity": SeverityLevel.HIGH,
            "risk_score": 8.0,
            "title": "Potential Cross-Site Scripting (XSS)",
            "description": "Unsanitized HTML rendering method detected.",
            "recommendation": "Sanitize user input using DOMPurify or avoid raw innerHTML rendering."
        },
        {
            "id": "SEC-006",
            "type": "CSRF Vulnerability",
            "pattern": r"(?i)(@app\.post|app\.post|router\.post).*?(?!.*csrf)",
            "severity": SeverityLevel.MEDIUM,
            "risk_score": 6.0,
            "title": "Missing CSRF Protection",
            "description": "State-changing POST route missing explicit CSRF validation token.",
            "recommendation": "Enforce Anti-CSRF token validation or samesite cookie policies."
        },
        {
            "id": "SEC-007",
            "type": "Unsafe eval() Execution",
            "pattern": r"\b(eval\(|exec\(|Function\()",
            "severity": SeverityLevel.CRITICAL,
            "risk_score": 10.0,
            "title": "Unsafe Dynamic Code Execution (eval)",
            "description": "Use of eval() dynamic code execution can lead to Remote Code Execution (RCE).",
            "recommendation": "Remove eval() and use strict typed parsing routines."
        },
    ]

    # Vulnerable dependency catalog rules
    KNOWN_VULNERABLE_PACKAGES: list[dict[str, Any]] = [
        {"name": "express", "version_prefix": "4.16.", "cve": "CVE-2019-10760", "severity": SeverityLevel.HIGH, "risk": 7.5, "rec": "Upgrade express to version 4.17.1 or higher."},
        {"name": "lodash", "version_prefix": "4.17.11", "cve": "CVE-2019-10744", "severity": SeverityLevel.CRITICAL, "risk": 9.1, "rec": "Upgrade lodash to version 4.17.21 or higher."},
        {"name": "requests", "version_prefix": "2.20.", "cve": "CVE-2018-18074", "severity": SeverityLevel.MEDIUM, "risk": 5.5, "rec": "Upgrade requests to version 2.22.0 or higher."},
    ]

    @classmethod
    def scan_files(cls, repo_url: str, file_contents_map: dict[str, str]) -> SecurityScanResult:
        """Scans codebase files for security issues and returns structured results."""
        findings: list[SecurityFinding] = []

        # 1. Scan Source Files for Secrets & Vulnerabilities
        for file_path, content in file_contents_map.items():
            lines = content.splitlines()
            for line_idx, line in enumerate(lines, start=1):
                for rule in cls.RULES:
                    if re.search(rule["pattern"], line):
                        findings.append(
                            SecurityFinding(
                                id=f"SEC-{uuid.uuid4().hex[:8]}",
                                issue_type=rule["type"],
                                severity=rule["severity"],
                                title=rule["title"],
                                description=rule["description"],
                                affected_file=file_path,
                                line_number=line_idx,
                                snippet=line.strip()[:100],
                                recommendation=rule["recommendation"],
                                risk_score=rule["risk_score"],
                            )
                        )

            # 2. Dependency Vulnerability Analysis (e.g., package.json / requirements.txt)
            if file_path.endswith("package.json") or file_path.endswith("requirements.txt"):
                for vuln in cls.KNOWN_VULNERABLE_PACKAGES:
                    if vuln["name"] in content and vuln["version_prefix"] in content:
                        findings.append(
                            SecurityFinding(
                                id=f"SEC-{uuid.uuid4().hex[:8]}",
                                issue_type="Vulnerable Dependency",
                                severity=vuln["severity"],
                                title=f"Vulnerable Dependency: {vuln['name']} ({vuln['cve']})",
                                description=f"Package {vuln['name']} matching version {vuln['version_prefix']} has known security vulnerabilities.",
                                affected_file=file_path,
                                line_number=None,
                                snippet=f"Vulnerable package: {vuln['name']}",
                                recommendation=vuln["rec"],
                                risk_score=vuln["risk"],
                            )
                        )

        # 3. Calculate Overall Risk Score
        critical_count = sum(1 for f in findings if f.severity == SeverityLevel.CRITICAL)
        high_count = sum(1 for f in findings if f.severity == SeverityLevel.HIGH)
        medium_count = sum(1 for f in findings if f.severity == SeverityLevel.MEDIUM)
        low_count = sum(1 for f in findings if f.severity == SeverityLevel.LOW)

        overall_risk = 0.0
        if findings:
            max_risk = max(f.risk_score for f in findings)
            overall_risk = round(min(10.0, max_risk * 0.7 + (len(findings) * 0.3)), 1)

        return SecurityScanResult(
            repository_url=repo_url,
            total_findings=len(findings),
            overall_risk_score=overall_risk,
            critical_count=critical_count,
            high_count=high_count,
            medium_count=medium_count,
            low_count=low_count,
            findings=findings,
        )
