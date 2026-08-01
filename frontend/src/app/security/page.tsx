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

import { getApiBaseUrl } from "@/config/api";

export default function SecurityPage() {
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");
  const [vulnerabilities, setVulnerabilities] = useState<Array<any>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  React.useEffect(() => {
    const fetchSecurityData = async () => {
      try {
        setLoading(true);
        const baseUrl = getApiBaseUrl();
        const res = await fetch(`${baseUrl}/api/v1/analysis/latest`, {
          headers: { Authorization: "Bearer mock_jwt_token_demo" },
        });
        if (res.ok) {
          const data = await res.json();
          const findings = data.security?.findings || [];
          setVulnerabilities(findings);
        }
      } catch (err) {
        console.error("Error fetching security findings:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSecurityData();
  }, []);

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
        {loading ? (
          <div className="p-8 text-center text-xs font-mono text-slate-400 glass-panel rounded-3xl">
            Loading security scan results...
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center glass-panel rounded-3xl space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Security Vulnerabilities Detected</h3>
            <p className="text-xs text-slate-400">Static scanners verified the repository against security vulnerability rules.</p>
          </div>
        ) : (
          filtered.map((item) => (
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
                    {item.severity} (Confidence: {item.confidence || "HIGH"})
                  </span>
                  <h3 className="text-base font-bold text-white">{item.title || item.issue_type}</h3>
                </div>
                <div className="flex items-center gap-3 font-mono text-xs">
                  <span className="text-slate-400 text-[11px]">Tool: {item.scanner_source || item.toolSource || "Security Scanner"}</span>
                  <span className="text-slate-500">{item.rule_triggered || item.id}</span>
                </div>
              </div>

              <div className="text-xs font-mono text-cyan-400 flex items-center gap-1.5">
                <FileCode className="w-3.5 h-3.5 text-slate-400" />
                <span>{item.affected_file || item.file}:L{item.line_number || item.line || 1}</span>
              </div>

              <p className="text-xs text-slate-300">{item.description || item.explanation}</p>

              {/* Code Snippet / Evidence Box */}
              {(item.snippet || item.evidence) && (
                <div className="p-3.5 rounded-xl bg-slate-950 font-mono text-xs text-rose-300 border border-rose-500/20">
                  <code>{item.snippet || item.evidence}</code>
                </div>
              )}

              {/* Fix Guidance */}
              <div className="text-xs font-medium text-emerald-400 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
                <strong>Fix Recommendation:</strong> {item.recommendation || item.fix_recommendation || item.rec}
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  );
}
