"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  FileCode,
  CheckCircle2,
  Lock,
  Filter,
  Calculator,
} from "lucide-react";

export default function SecurityPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  const vulnerabilities = [
    {
      id: "SEC-003",
      severity: "CRITICAL",
      cvss: "9.5 / 10.0",
      title: "Hardcoded JWT Secret Key",
      type: "Exposed Secret",
      file: "backend/app/core/config.py",
      line: 26,
      snippet: 'JWT_SECRET_KEY: str = "super_secret_jwt_key_change_in_production_123456789"',
      rec: "Move secret key to environment variables (.env) or Azure Key Vault.",
      toolSource: "Gitleaks / Semgrep Secret Engine",
    },
    {
      id: "SEC-004",
      severity: "HIGH",
      cvss: "8.8 / 10.0",
      title: "Potential SQL Injection Vulnerability",
      type: "Code Injection",
      file: "backend/app/infrastructure/database/legacy_query.py",
      line: 42,
      snippet: 'query = "SELECT * FROM users WHERE email = \'" + user_input + "\'"',
      rec: "Use parameterized queries or ORM query builders (e.g. SQLAlchemy, Prisma).",
      toolSource: "Semgrep AST Security Rules",
    },
    {
      id: "SEC-005",
      severity: "MEDIUM",
      cvss: "6.5 / 10.0",
      title: "Unsanitized HTML Rendering (XSS Risk)",
      type: "Cross-Site Scripting",
      file: "frontend/src/components/UnsafeRender.tsx",
      line: 18,
      snippet: "<div dangerouslySetInnerHTML={{ __html: userInput }} />",
      rec: "Sanitize user input using DOMPurify before dangerouslySetInnerHTML injection.",
      toolSource: "Semgrep Rules Engine",
    },
    {
      id: "SEC-006",
      severity: "LOW",
      cvss: "3.2 / 10.0",
      title: "Missing Strict-Transport-Security Header",
      type: "HTTP Header",
      file: "backend/app/main.py",
      line: 18,
      snippet: 'app.add_middleware(CORSMiddleware, allow_origins=["*"])',
      rec: "Enforce HSTS and restrict CORS wildcard origins for production deployments.",
      toolSource: "Trivy / OWASP Header Rules",
    },
  ];

  const filtered = filterSeverity === "ALL"
    ? vulnerabilities
    : vulnerabilities.filter((v) => v.severity === filterSeverity);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-8 max-w-7xl mx-auto py-8 px-4 sm:px-6"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-rose-400">
            <ShieldAlert className="w-4 h-4" />
            <span>Multi-Engine Security Scanner (Gitleaks + Semgrep + Trivy)</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight linear-gradient-text">
            Security Vulnerabilities & CVE Audit
          </h1>
          <p className="text-xs text-slate-400">
            Scans for hardcoded secrets, SQL injection, XSS, CSRF, and unsafe dependencies.
          </p>
        </div>
      </div>

      {/* Transparent Formula Callout */}
      <div className="glass-panel p-4 rounded-2xl border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2 text-rose-400 font-bold">
          <Calculator className="w-4 h-4" />
          <span>Security Score Formula:</span>
          <span className="text-white font-normal">100 - (Critical*25 + High*15 + Medium*8 + Low*3)</span>
        </div>
        <div className="text-slate-400 text-[11px]">
          Sources: Semgrep, Gitleaks, Trivy, npm audit
        </div>
      </div>

      {/* Severity Filter Bar */}
      <div className="flex flex-wrap items-center gap-2">
        {["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"].map((sev) => (
          <button
            key={sev}
            onClick={() => setFilterSeverity(sev)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              filterSeverity === sev
                ? "bg-rose-500 text-white shadow-lg shadow-rose-500/20"
                : "bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5"
            }`}
          >
            {sev}
          </button>
        ))}
      </div>

      {/* Vulnerability Cards List */}
      <div className="space-y-4">
        {filtered.map((item) => (
          <div key={item.id} className="glass-panel p-6 rounded-3xl space-y-3 border border-white/10 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-md ${
                    item.severity === "CRITICAL"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      : item.severity === "HIGH"
                      ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                      : item.severity === "MEDIUM"
                      ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                      : "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  }`}
                >
                  {item.severity} (CVSS {item.cvss})
                </span>
                <h3 className="text-base font-bold text-white">{item.title}</h3>
              </div>
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-slate-400 text-[11px]">Tool: {item.toolSource}</span>
                <span className="text-slate-500">{item.id}</span>
              </div>
            </div>

            <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-slate-400" />
              <span>{item.file}:L{item.line}</span>
            </div>

            {/* Code Snippet Box */}
            <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-rose-300 border border-rose-500/20">
              <code>{item.snippet}</code>
            </div>

            {/* Fix Guidance */}
            <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
              <strong>Remediation Recommendation:</strong> {item.rec}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
